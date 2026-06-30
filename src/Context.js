/**
 * Context.js
 * -----------
 * Phase 1: read the "context" of the active presentation.
 *
 * Everything here is pure data extraction so later phases (Gemini
 * summarization, second-brain storage, vibe search) can consume a clean,
 * structured object without touching the Slides API directly.
 */

/**
 * Build a structured context object for the active presentation.
 *
 * @return {{
 *   title: string,
 *   presentationId: string,
 *   slideCount: number,
 *   wordCount: number,
 *   slides: Array<{
 *     index: number,
 *     objectId: string,
 *     layout: (string|null),
 *     texts: string[],
 *     notes: string,
 *     imageCount: number,
 *     tableCount: number
 *   }>
 * }}
 */
function readPresentationContext() {
  var presentation = SlidesApp.getActivePresentation();
  if (!presentation) {
    throw new Error('ไม่พบ presentation ที่กำลังเปิดอยู่ (no active presentation).');
  }

  var slides = presentation.getSlides();
  var totalWords = 0;

  var slideData = slides.map(function (slide, index) {
    var texts = extractSlideText_(slide);
    var notes = extractSpeakerNotes_(slide);

    texts.forEach(function (t) {
      totalWords += countWords_(t);
    });

    return {
      index: index + 1,
      objectId: slide.getObjectId(),
      layout: getLayoutName_(slide),
      texts: texts,
      notes: notes,
      imageCount: countElements_(slide, SlidesApp.PageElementType.IMAGE),
      tableCount: countElements_(slide, SlidesApp.PageElementType.TABLE)
    };
  });

  return {
    title: presentation.getName(),
    presentationId: presentation.getId(),
    slideCount: slides.length,
    wordCount: totalWords,
    slides: slideData
  };
}

/**
 * Collect every non-empty text string on a slide (shapes + tables).
 * @param {GoogleAppsScript.Slides.Slide} slide
 * @return {string[]}
 * @private
 */
function extractSlideText_(slide) {
  var out = [];
  var elements = slide.getPageElements();

  elements.forEach(function (el) {
    var type = el.getPageElementType();

    if (type === SlidesApp.PageElementType.SHAPE) {
      pushText_(out, el.asShape().getText());
    } else if (type === SlidesApp.PageElementType.TABLE) {
      var table = el.asTable();
      for (var r = 0; r < table.getNumRows(); r++) {
        for (var c = 0; c < table.getNumColumns(); c++) {
          pushText_(out, table.getCell(r, c).getText());
        }
      }
    } else if (type === SlidesApp.PageElementType.GROUP) {
      // Groups can contain shapes; flatten one level for common cases.
      el.asGroup().getChildren().forEach(function (child) {
        if (child.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
          pushText_(out, child.asShape().getText());
        }
      });
    }
  });

  return out;
}

/**
 * @param {string[]} out
 * @param {GoogleAppsScript.Slides.TextRange} textRange
 * @private
 */
function pushText_(out, textRange) {
  if (!textRange) return;
  var s = textRange.asString().trim();
  if (s) out.push(s);
}

/**
 * @param {GoogleAppsScript.Slides.Slide} slide
 * @return {string}
 * @private
 */
function extractSpeakerNotes_(slide) {
  var notesPage = slide.getNotesPage();
  if (!notesPage) return '';
  var shape = notesPage.getSpeakerNotesShape();
  if (!shape) return '';
  return shape.getText().asString().trim();
}

/**
 * @param {GoogleAppsScript.Slides.Slide} slide
 * @param {GoogleAppsScript.Slides.PageElementType} type
 * @return {number}
 * @private
 */
function countElements_(slide, type) {
  return slide.getPageElements().filter(function (el) {
    return el.getPageElementType() === type;
  }).length;
}

/**
 * @param {GoogleAppsScript.Slides.Slide} slide
 * @return {string|null}
 * @private
 */
function getLayoutName_(slide) {
  try {
    var layout = slide.getLayout();
    return layout ? layout.getLayoutName() : null;
  } catch (e) {
    return null;
  }
}

/**
 * @param {string} text
 * @return {number}
 * @private
 */
function countWords_(text) {
  if (!text) return 0;
  var trimmed = text.trim();
  if (!trimmed) return 0;

  // Try locale-aware word segmentation (Thai, CJK, etc.) when available.
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      var segmenter = new Intl.Segmenter('th', { granularity: 'word' });
      var count = 0;
      var iter = segmenter.segment(trimmed);
      for (var segment of iter) {
        if (segment.isWordLike) count++;
      }
      return count || trimmed.split(/\s+/).length;
    } catch (e) {
      // fall through to space-based approximation
    }
  }

  return trimmed.split(/\s+/).length;
}

/**
 * Serialize the context to a pretty-printed JSON string.
 * Useful for export / debugging and as the payload for future AI phases.
 * @return {string}
 */
function getContextAsJson() {
  return JSON.stringify(readPresentationContext(), null, 2);
}
