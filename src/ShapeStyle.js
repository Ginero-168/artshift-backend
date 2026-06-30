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
  var diag = diagnoseSelection_();
  return diag.shape || null;
}

/**
 * Inspect the current selection and return diagnostic info plus the first
 * usable shape if found.
 * @return {{shape: (GoogleAppsScript.Slides.Shape|null), reason: (string|null), detail: (string|null)}}
 * @private
 */
function diagnoseSelection_() {
  var presentation = SlidesApp.getActivePresentation();
  var selection = presentation.getSelection();
  if (!selection) {
    return { shape: null, reason: 'no_selection', detail: 'selection object is null' };
  }

  var selType = safe_(function () { return selection.getSelectionType().toString(); });
  var range = selection.getPageElementRange();
  var textRange = selection.getTextRange();

  if (range) {
    var elements = range.getPageElements();
    if (elements.length === 0) {
      return { shape: null, reason: 'no_selection', detail: 'selection type: ' + selType + ', 0 page elements' };
    }
    var types = elements.map(function (e) { return e.getPageElementType().toString(); });
    var first = elements[0];
    if (types[0] === 'GROUP') {
      return { shape: null, reason: 'group_selected', detail: 'group selected' };
    }
    if (types[0] === 'IMAGE') {
      return { shape: null, reason: 'image_selected', detail: 'image selected' };
    }
    if (types[0] !== 'SHAPE') {
      return { shape: null, reason: 'unsupported_type', detail: 'selected type: ' + types[0] };
    }
    return { shape: first.asShape(), reason: null, detail: null };
  }

  if (textRange) {
    // Cursor is inside a text box. We cannot get the parent shape directly
    // from a TextRange, so tell the user to select the border instead.
    return { shape: null, reason: 'text_cursor', detail: 'select the text box border, not the cursor inside text' };
  }

  return { shape: null, reason: 'no_selection', detail: 'selection type: ' + selType };
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
  var diag = diagnoseSelection_();
  if (diag.reason) {
    return { selected: false, reason: diag.reason, detail: diag.detail };
  }
  var shape = diag.shape;
  if (!shape) return { selected: false, reason: 'no_selection' };

  var textRange = shape.getText();
  var textStyle = textRange.getTextStyle();
  var paragraphStyle = textRange.getParagraphStyle();
  var fill = shape.getFill();
  var border = shape.getBorder();

  var result = {
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
    hasBackground: safe_(function () { return fill.getType(); }) === SlidesApp.FillType.SOLID,
    backgroundColor: colorToHex_(safe_(function () { return fill.getSolidFill() && fill.getSolidFill().getColor(); })),
    hasBorder: safe_(function () { return border.getLineFill().getType(); }) === SlidesApp.FillType.SOLID,
    borderColor: colorToHex_(safe_(function () { return border.getLineFill().getSolidFill() && border.getLineFill().getSolidFill().getColor(); })),
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

  // If the shape has no text at all, still allow styling but give a fallback text.
  if (!result.text) result.text = '';
  return result;
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
