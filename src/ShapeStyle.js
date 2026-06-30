/**
 * ShapeStyle.js
 * -----------
 * Read and write style properties of the currently selected shape/page element.
 *
 * Used by the Elementor-like properties panel: the user selects an object on
 * the slide, the sidebar reads its style, and applying changes mutates the
 * selected object in place. If nothing is selected, functions return null or
 * throw a clear "no selection" error.
 */

/**
 * Get the currently selected single shape, if it is a text shape.
 * @return {GoogleAppsScript.Slides.Shape|null}
 * @private
 */
function getSelectedShape_() {
  var presentation = SlidesApp.getActivePresentation();
  var selection = presentation.getSelection();
  if (!selection) return null;

  var range = selection.getPageElementRange();
  if (!range) return null;

  var elements = range.getPageElements();
  if (elements.length !== 1) return null;

  var el = elements[0];
  if (el.getPageElementType() !== SlidesApp.PageElementType.SHAPE) return null;

  return el.asShape();
}

/**
 * Read the style of the currently selected shape and return a plain object
 * the sidebar can use to populate its form.
 * @return {({
 *   selected: boolean,
 *   objectId: string,
 *   text: string,
 *   fontFamily: string,
 *   fontSize: number,
 *   bold: boolean,
 *   align: string,
 *   textColor: string,
 *   hasBackground: boolean,
 *   backgroundColor: string,
 *   hasBorder: boolean,
 *   borderColor: string,
 *   borderWeight: number,
 *   borderDash: string,
 *   width: number,
 *   height: number,
 *   left: number,
 *   top: number
 * }|null)}
 */
function readSelectedShapeStyle() {
  var shape = getSelectedShape_();
  if (!shape) return null;

  var textRange = shape.getText();
  var textStyle = textRange.getTextStyle();
  var paragraphStyle = textRange.getParagraphStyle();
  var fill = shape.getFill();
  var border = shape.getBorder();

  return {
    selected: true,
    objectId: shape.getObjectId(),
    text: textRange.asString().trim(),
    fontFamily: safe_(function () { return textStyle.getFontFamily(); }),
    fontSize: safe_(function () { return textStyle.getFontSize(); }),
    bold: safe_(function () { return textStyle.isBold(); }) || false,
    align: safe_(function () {
      var a = paragraphStyle.getParagraphAlignment();
      return a ? a.toString() : null;
    }),
    textColor: colorToHex_(safe_(function () { return textStyle.getForegroundColor(); })),
    hasBackground: fill.getFillType() === SlidesApp.FillType.SOLID,
    backgroundColor: colorToHex_(safe_(function () { return fill.getSolidFill(); })),
    hasBorder: border.getLineFill().getFillType() === SlidesApp.FillType.SOLID,
    borderColor: colorToHex_(safe_(function () { return border.getLineFill().getSolidFill(); })),
    borderWeight: safe_(function () { return border.getWeight(); }),
    borderDash: safe_(function () {
      var d = border.getDashStyle();
      return d ? d.toString() : null;
    }),
    width: shape.getWidth(),
    height: shape.getHeight(),
    left: shape.getLeft(),
    top: shape.getTop()
  };
}

/**
 * Apply style changes to the currently selected shape. If nothing is
 * selected, this function does nothing and returns { ok: false }.
 * @param {Object} opts
 * @return {{ ok: boolean, objectId: string|null }}
 */
function applyToSelectedShape(opts) {
  var shape = getSelectedShape_();
  if (!shape) {
    return { ok: false, objectId: null };
  }

  var textRange = shape.getText();
  var textStyle = textRange.getTextStyle();
  var paragraphStyle = textRange.getParagraphStyle();

  if (opts.text != null) {
    textRange.setText(String(opts.text));
  }
  if (opts.fontFamily) textStyle.setFontFamily(opts.fontFamily);
  if (opts.fontSize) textStyle.setFontSize(Number(opts.fontSize));
  if (opts.bold != null) textStyle.setBold(!!opts.bold);
  if (opts.textColor) textStyle.setForegroundColor(opts.textColor);

  if (opts.align) {
    var alignment = resolveAlignment_(opts.align);
    if (alignment) paragraphStyle.setParagraphAlignment(alignment);
  }

  var fill = shape.getFill();
  if (opts.hasBackground && opts.backgroundColor) {
    fill.setSolidFill(opts.backgroundColor);
  } else if (opts.hasBackground === false) {
    fill.setTransparent();
  }

  var border = shape.getBorder();
  if (opts.hasBorder) {
    if (opts.borderColor) border.getLineFill().setSolidFill(opts.borderColor);
    if (opts.borderWeight) border.setWeight(Number(opts.borderWeight));
    var dash = resolveDashStyle_(opts.borderDash);
    if (dash) border.setDashStyle(dash);
  } else if (opts.hasBorder === false) {
    border.setTransparent();
  }

  return { ok: true, objectId: shape.getObjectId() };
}

/**
 * Convert a Color object to a hex string (#rrggbb). Returns null if input is
 * falsy or the color is not representable as RGB.
 * @param {GoogleAppsScript.Slides.Color} color
 * @return {string|null}
 * @private
 */
function colorToHex_(color) {
  if (!color) return null;
  try {
    var rgb = color.asRgbColor();
    return rgb.asHexString();
  } catch (e) {
    return null;
  }
}

/**
 * Run a getter safely; return null instead of throwing on mixed-style errors.
 * @param {Function} fn
 * @return {any|null}
 * @private
 */
function safe_(fn) {
  try {
    return fn();
  } catch (e) {
    return null;
  }
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
 * Map a dash-style key string to the SlidesApp.DashStyle enum.
 * @param {string} key
 * @return {GoogleAppsScript.Slides.DashStyle|null}
 * @private
 */
function resolveDashStyle_(key) {
  if (!key) return null;
  var styles = SlidesApp.DashStyle;
  return styles[key] || null;
}
