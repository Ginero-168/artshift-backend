/**
 * AnimateText.js
 * -------------
 * Calls an external backend that renders animated text as a GIF, then inserts
 * the GIF as an image on the current slide.
 *
 * Backend contract: POST /api/animate with { text, style, animation, width,
 * height, duration } and receive { ok: true, data: base64, mime: 'image/gif' }.
 */

// Default backend for the Mighty Slide animator. Override via the UI if needed.
var ANIMATE_BACKEND_URL_ = 'https://artshift-backend.kirita.me/api/animate';

/**
 * Render animated text via the backend and insert the resulting GIF into the
 * current slide.
 *
 * @param {Object} opts
 * @return {{ ok: boolean, objectId: string|null }}
 */
function animateTextToSlide(opts) {
  opts = opts || {};
  var text = opts.text ? String(opts.text) : '';
  if (!text.trim()) {
    throw new Error('กรุณาใส่ข้อความก่อน');
  }

  var backendUrl = opts.backendUrl || ANIMATE_BACKEND_URL_;
  if (!backendUrl) {
    throw new Error('กรุณาระบุ Backend URL');
  }

  var payload = {
    text: text,
    animation: opts.animation || 'fade-in',
    style: {
      fontFamily: opts.fontFamily || 'Sarabun, sans-serif',
      fontSize: Number(opts.fontSize) || 64,
      color: opts.textColor || '#ffffff',
      background: opts.backgroundColor || '#1a73e8',
      bold: !!opts.bold
    },
    width: Number(opts.width) || 640,
    height: Number(opts.height) || 160,
    duration: Number(opts.duration) || 2
  };

  var response = UrlFetchApp.fetch(backendUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var body = response.getContentText();
  if (code !== 200) {
    throw new Error('Backend error (' + code + '): ' + body);
  }

  var json = JSON.parse(body);
  if (!json.ok || !json.data) {
    throw new Error('Backend returned: ' + (json.error || 'no data'));
  }

  return insertImageFromBase64_(json.data, payload.width, payload.height);
}

/**
 * Decode a base64 GIF string and insert it as an image on the current slide.
 * @param {string} base64
 * @param {number} width
 * @param {number} height
 * @return {{ ok: boolean, objectId: string }}
 * @private
 */
function insertImageFromBase64_(base64, width, height) {
  var presentation = SlidesApp.getActivePresentation();
  var slide = getCurrentSlideForAnimate_(presentation);
  if (!slide) {
    throw new Error('ไม่พบสไลด์ปัจจุบัน');
  }

  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, 'image/gif', 'animated-text.gif');
  var left = (presentation.getPageWidth() - width) / 2;
  var top = (presentation.getPageHeight() - height) / 2;

  // Center the image on the slide.
  var image = slide.insertImage(blob, left, top, width, height);
  return { ok: true, objectId: image.getObjectId() };
}

/**
 * Get the current slide, falling back to the first slide.
 * @param {GoogleAppsScript.Slides.Presentation} presentation
 * @return {GoogleAppsScript.Slides.Slide|null}
 * @private
 */
function getCurrentSlideForAnimate_(presentation) {
  var selection = presentation.getSelection();
  if (selection) {
    var page = selection.getCurrentPage();
    if (page) {
      try {
        return page.asSlide();
      } catch (e) {
        // not a slide
      }
    }
  }
  var slides = presentation.getSlides();
  return slides.length ? slides[0] : null;
}

/**
 * Set the backend URL. Called from the UI or on startup if you want to make
 * it configurable.
 * @param {string} url
 */
function setAnimateBackendUrl(url) {
  ANIMATE_BACKEND_URL_ = url;
}
