/**
 * TextTool.js
 * -----------
 * Feature: insert a styled text box into the current slide.
 *
 * Called from Sidebar.html via google.script.run.addTextBox(opts). Keeps all
 * Slides write logic here so the UI stays dumb.
 */

/**
 * Insert a text box on the current slide with the given style options.
 *
 * @param {{
 *   text?: string,
 *   fontFamily?: string,
 *   fontSize?: number,
 *   bold?: boolean,
 *   textColor?: string,        // hex, e.g. "#202124"
 *   hasBackground?: boolean,
 *   backgroundColor?: string,  // hex
 *   hasBorder?: boolean,
 *   borderColor?: string,      // hex
 *   borderWeight?: number,     // points
 *   borderDash?: string        // SlidesApp.DashStyle key: SOLID|DASH|DOT|...
 * }} opts
 * @return {{ ok: boolean, objectId: string }}
 */
function addTextBox(opts) {
  opts = opts || {};
  var presentation = SlidesApp.getActivePresentation();
  var slide = getCurrentSlide_(presentation);
  if (!slide) {
    throw new Error('ไม่พบสไลด์ปัจจุบัน — เปิดสไลด์สักหน้าก่อน');
  }

  var text =
    opts.text != null && String(opts.text).length ? String(opts.text) : 'ข้อความใหม่';

  var width = Number(opts.width) || 320;
  var height = Number(opts.height) || 60;
  var position = opts.position || 'upper-left';
  var coords = resolvePosition_(slide, position, width, height);
  var shape = slide.insertTextBox(text, coords.x, coords.y, width, height);

  var paragraphStyle = shape.getText().getParagraphStyle();
  if (opts.align) {
    var alignment = resolveAlignment_(opts.align);
    if (alignment) paragraphStyle.setParagraphAlignment(alignment);
  }

  var style = shape.getText().getTextStyle();
  if (opts.fontFamily) style.setFontFamily(opts.fontFamily);
  if (opts.fontSize) style.setFontSize(Number(opts.fontSize));
  if (opts.bold) style.setBold(true);
  if (opts.textColor) style.setForegroundColor(opts.textColor);

  if (opts.hasBackground && opts.backgroundColor) {
    shape.getFill().setSolidFill(opts.backgroundColor);
  } else {
    shape.getFill().setTransparent();
  }

  var border = shape.getBorder();
  if (opts.hasBorder) {
    if (opts.borderColor) border.getLineFill().setSolidFill(opts.borderColor);
    if (opts.borderWeight) border.setWeight(Number(opts.borderWeight));
    var dash = resolveDashStyle_(opts.borderDash);
    if (dash) border.setDashStyle(dash);
  } else {
    border.setTransparent();
  }

  return { ok: true, objectId: shape.getObjectId() };
}

/**
 * Map a dash-style key string to the SlidesApp.DashStyle enum, safely.
 * @param {string} key
 * @return {GoogleAppsScript.Slides.DashStyle|null}
 * @private
 */
function resolveDashStyle_(key) {
  if (!key) return null;
  var styles = SlidesApp.DashStyle;
  return styles[key] || null;
}

/**
 * Map a horizontal alignment key to the SlidesApp.ParagraphAlignment enum.
 * @param {string} key
 * @return {GoogleAppsScript.Slides.ParagraphAlignment|null}
 * @private
 */
function resolveAlignment_(key) {
  if (!key) return null;
  var alignments = SlidesApp.ParagraphAlignment;
  return alignments[key] || null;
}

/**
 * Compute insertion coordinates for a shape on the slide based on the chosen
 * position preset and the slide page size.
 * @param {GoogleAppsScript.Slides.Slide} slide
 * @param {string} position upper-left | center | upper-center | lower-left
 * @param {number} width
 * @param {number} height
 * @return {{x: number, y: number}}
 * @private
 */
function resolvePosition_(slide, position, width, height) {
  var presentation = SlidesApp.getActivePresentation();
  var pageSize = presentation.getPageSize();
  var cw = pageSize.getWidth();
  var ch = pageSize.getHeight();
  var margin = 50;
  switch (position) {
    case 'center':
      return { x: (cw - width) / 2, y: (ch - height) / 2 };
    case 'upper-center':
      return { x: (cw - width) / 2, y: margin };
    case 'lower-left':
      return { x: margin, y: ch - height - margin };
    case 'upper-left':
    default:
      return { x: margin, y: margin };
  }
}

/**
 * Resolve the slide the user is currently looking at, falling back to the
 * first slide if there is no usable selection.
 * @param {GoogleAppsScript.Slides.Presentation} presentation
 * @return {GoogleAppsScript.Slides.Slide|null}
 * @private
 */
function getCurrentSlide_(presentation) {
  var selection = presentation.getSelection();
  if (selection) {
    var page = selection.getCurrentPage();
    if (page) {
      try {
        return page.asSlide();
      } catch (e) {
        // current page is not a slide (e.g. master/layout) — fall through
      }
    }
  }
  var slides = presentation.getSlides();
  return slides.length ? slides[0] : null;
}
