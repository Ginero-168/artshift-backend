/**
 * Gemini.js
 * ---------
 * Phase 2: talk to the Gemini API.
 *
 * Responsibilities:
 *   - store / read the per-user API key + model (PropertiesService)
 *   - turn a presentation context object into a compact prompt
 *   - call generateContent via UrlFetchApp and return plain text
 *
 * The API key lives in UserProperties (per-user, never committed). UI lives
 * in Cards.js; this file is provider logic only.
 */

var GEMINI_API_BASE_ =
  'https://generativelanguage.googleapis.com/v1beta/models/';
var DEFAULT_GEMINI_MODEL_ = 'gemini-2.0-flash';
var PROP_API_KEY_ = 'GEMINI_API_KEY';
var PROP_MODEL_ = 'GEMINI_MODEL';

/**
 * @return {string} stored API key, or '' if not set.
 */
function getApiKey_() {
  return PropertiesService.getUserProperties().getProperty(PROP_API_KEY_) || '';
}

/**
 * @return {boolean}
 */
function hasApiKey_() {
  return getApiKey_().length > 0;
}

/**
 * @param {string} key
 */
function setApiKey_(key) {
  var props = PropertiesService.getUserProperties();
  var trimmed = (key || '').trim();
  if (trimmed) {
    props.setProperty(PROP_API_KEY_, trimmed);
  } else {
    props.deleteProperty(PROP_API_KEY_);
  }
}

/**
 * @return {string} configured model name.
 */
function getModel_() {
  return (
    PropertiesService.getUserProperties().getProperty(PROP_MODEL_) ||
    DEFAULT_GEMINI_MODEL_
  );
}

/**
 * @param {string} model
 */
function setModel_(model) {
  var props = PropertiesService.getUserProperties();
  var trimmed = (model || '').trim();
  if (trimmed) {
    props.setProperty(PROP_MODEL_, trimmed);
  } else {
    props.deleteProperty(PROP_MODEL_);
  }
}

/**
 * Low-level call to Gemini generateContent.
 * @param {string} prompt
 * @return {string} model text output.
 * @private
 */
function callGemini_(prompt) {
  var apiKey = getApiKey_();
  if (!apiKey) {
    throw new Error('ยังไม่ได้ตั้งค่า Gemini API key (ไปที่ Settings).');
  }

  var url =
    GEMINI_API_BASE_ + encodeURIComponent(getModel_()) + ':generateContent';

  var payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code !== 200) {
    throw new Error('Gemini API error (' + code + '): ' + extractApiError_(body));
  }

  return parseGeminiText_(body);
}

/**
 * @param {string} body raw JSON response.
 * @return {string}
 * @private
 */
function parseGeminiText_(body) {
  var json = JSON.parse(body);
  var candidates = json.candidates || [];
  if (!candidates.length) {
    throw new Error('Gemini ไม่ได้ส่งคำตอบกลับมา (อาจถูก safety filter บล็อก).');
  }
  var parts = (candidates[0].content && candidates[0].content.parts) || [];
  return parts
    .map(function (p) {
      return p.text || '';
    })
    .join('')
    .trim();
}

/**
 * @param {string} body
 * @return {string}
 * @private
 */
function extractApiError_(body) {
  try {
    var json = JSON.parse(body);
    return (json.error && json.error.message) || body;
  } catch (e) {
    return body;
  }
}

/**
 * Flatten a presentation context object into a text block for prompting.
 * @param {Object} ctx readPresentationContext() output.
 * @return {string}
 * @private
 */
function contextToText_(ctx) {
  var lines = ['Presentation: ' + ctx.title, 'Slides: ' + ctx.slideCount, ''];
  ctx.slides.forEach(function (s) {
    lines.push('--- Slide ' + s.index + ' ---');
    if (s.texts.length) lines.push(s.texts.join('\n'));
    if (s.notes) lines.push('[Notes] ' + s.notes);
    lines.push('');
  });
  return lines.join('\n');
}

/**
 * Summarize the active presentation.
 * @return {string}
 */
function summarizePresentation() {
  var ctx = readPresentationContext();
  var prompt =
    'คุณเป็นผู้ช่วยวิเคราะห์งานนำเสนอ จากเนื้อหาสไลด์ด้านล่าง ' +
    'ช่วยสรุปเป็นภาษาไทยให้กระชับ: (1) ใจความหลักของ deck, ' +
    '(2) bullet สรุปแต่ละช่วงสำคัญ, (3) ข้อเสนอแนะปรับปรุง 2-3 ข้อ.\n\n' +
    contextToText_(ctx);
  return callGemini_(prompt);
}

/**
 * Answer a free-form question about the active presentation.
 * @param {string} question
 * @return {string}
 */
function answerQuestion(question) {
  if (!question || !question.trim()) {
    throw new Error('กรุณาพิมพ์คำถามก่อน.');
  }
  var ctx = readPresentationContext();
  var prompt =
    'ใช้เฉพาะข้อมูลจากงานนำเสนอด้านล่างเพื่อตอบคำถาม ' +
    'ถ้าข้อมูลไม่พอให้บอกตรงๆ ตอบเป็นภาษาไทย.\n\n' +
    'คำถาม: ' +
    question.trim() +
    '\n\n=== เนื้อหางานนำเสนอ ===\n' +
    contextToText_(ctx);
  return callGemini_(prompt);
}
