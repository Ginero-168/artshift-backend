/**
 * Cards.js
 * --------
 * CardService UI for the add-on. Pure presentation layer: it asks
 * Context.js for data and renders cards. Keep business logic out of here.
 */

/**
 * The first card the user sees when opening the add-on.
 * @return {GoogleAppsScript.Card_Service.Card}
 */
function buildHomepageCard() {
  var header = CardService.newCardHeader()
    .setTitle('Mighty Slide')
    .setSubtitle('Phase 1 · อ่านบริบทของ presentation');

  var intro = CardService.newTextParagraph()
    .setText(
      'กดปุ่มด้านล่างเพื่ออ่านบริบทของสไลด์ที่กำลังเปิดอยู่ ' +
      '(หัวข้อ, ข้อความ, โน้ตผู้บรรยาย, จำนวนรูป/ตาราง).'
    );

  var readButton = CardService.newTextButton()
    .setText('อ่านบริบท')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(CardService.newAction().setFunctionName('handleReadContext'));

  var section = CardService.newCardSection()
    .addWidget(intro)
    .addWidget(CardService.newButtonSet().addButton(readButton));

  // AI section (phase 2) — only useful once an API key is configured.
  var aiSection = CardService.newCardSection().setHeader('AI (Gemini)');
  if (hasApiKey_()) {
    var summarizeButton = CardService.newTextButton()
      .setText('สรุป deck')
      .setOnClickAction(CardService.newAction().setFunctionName('handleSummarize'));
    var askButton = CardService.newTextButton()
      .setText('ถาม-ตอบ')
      .setOnClickAction(CardService.newAction().setFunctionName('handleShowAsk'));
    aiSection.addWidget(
      CardService.newButtonSet().addButton(summarizeButton).addButton(askButton)
    );
  } else {
    aiSection.addWidget(
      CardService.newTextParagraph().setText(
        '<font color="#888888">ตั้งค่า Gemini API key ก่อนเพื่อใช้ฟีเจอร์ AI</font>'
      )
    );
  }

  var settingsButton = CardService.newTextButton()
    .setText('ตั้งค่า')
    .setOnClickAction(CardService.newAction().setFunctionName('handleShowSettings'));
  var settingsSection = CardService.newCardSection().addWidget(
    CardService.newButtonSet().addButton(settingsButton)
  );

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .addSection(aiSection)
    .addSection(settingsSection)
    .build();
}

/**
 * Settings card: configure the Gemini API key and model.
 * @return {GoogleAppsScript.Card_Service.Card}
 */
function buildSettingsCard() {
  var header = CardService.newCardHeader()
    .setTitle('ตั้งค่า')
    .setSubtitle('Gemini API');

  var keyInput = CardService.newTextInput()
    .setFieldName('apiKey')
    .setTitle('Gemini API key')
    .setHint(hasApiKey_() ? 'ตั้งค่าไว้แล้ว — กรอกใหม่เพื่อแทนที่' : 'วาง API key ที่นี่');

  var modelInput = CardService.newTextInput()
    .setFieldName('model')
    .setTitle('Model')
    .setValue(getModel_());

  var saveButton = CardService.newTextButton()
    .setText('บันทึก')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(CardService.newAction().setFunctionName('handleSaveSettings'));
  var clearButton = CardService.newTextButton()
    .setText('ลบ key')
    .setOnClickAction(CardService.newAction().setFunctionName('handleClearKey'));
  var back = CardService.newTextButton()
    .setText('กลับ')
    .setOnClickAction(CardService.newAction().setFunctionName('handleGoHome'));

  var section = CardService.newCardSection()
    .addWidget(keyInput)
    .addWidget(modelInput)
    .addWidget(
      CardService.newButtonSet()
        .addButton(saveButton)
        .addButton(clearButton)
        .addButton(back)
    );

  return CardService.newCardBuilder().setHeader(header).addSection(section).build();
}

/**
 * Card with a question field for Q&A over the deck.
 * @return {GoogleAppsScript.Card_Service.Card}
 */
function buildAskCard() {
  var header = CardService.newCardHeader().setTitle('ถาม-ตอบเกี่ยวกับ deck');
  var input = CardService.newTextInput()
    .setFieldName('question')
    .setTitle('คำถาม')
    .setMultiline(true)
    .setHint('เช่น: deck นี้กลุ่มเป้าหมายคือใคร?');

  var askButton = CardService.newTextButton()
    .setText('ถาม')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(CardService.newAction().setFunctionName('handleAsk'));
  var back = CardService.newTextButton()
    .setText('กลับ')
    .setOnClickAction(CardService.newAction().setFunctionName('handleGoHome'));

  var section = CardService.newCardSection()
    .addWidget(input)
    .addWidget(CardService.newButtonSet().addButton(askButton).addButton(back));

  return CardService.newCardBuilder().setHeader(header).addSection(section).build();
}

/**
 * Render an AI text result.
 * @param {string} title
 * @param {string} text
 * @return {GoogleAppsScript.Card_Service.Card}
 */
function buildAiResultCard(title, text) {
  var header = CardService.newCardHeader().setTitle(title);
  var body = CardService.newTextParagraph().setText(
    escapeHtml_(text).replace(/\n/g, '<br>')
  );
  var back = CardService.newTextButton()
    .setText('กลับ')
    .setOnClickAction(CardService.newAction().setFunctionName('handleGoHome'));

  var section = CardService.newCardSection()
    .addWidget(body)
    .addWidget(CardService.newButtonSet().addButton(back));

  return CardService.newCardBuilder().setHeader(header).addSection(section).build();
}

/**
 * Render the extracted context as a readable summary card.
 * @param {Object} ctx Output of readPresentationContext().
 * @return {GoogleAppsScript.Card_Service.Card}
 */
function buildContextCard(ctx) {
  var header = CardService.newCardHeader()
    .setTitle(ctx.title || '(ไม่มีชื่อ)')
    .setSubtitle(ctx.slideCount + ' สไลด์ · ' + ctx.wordCount + ' คำ');

  var builder = CardService.newCardBuilder().setHeader(header);

  ctx.slides.forEach(function (slide) {
    var lines = [];
    if (slide.texts.length) {
      lines.push('<b>ข้อความ:</b> ' + escapeHtml_(slide.texts.join(' · ')));
    }
    if (slide.notes) {
      lines.push('<b>โน้ต:</b> ' + escapeHtml_(truncate_(slide.notes, 200)));
    }
    var meta = [];
    if (slide.layout) meta.push(slide.layout);
    if (slide.imageCount) meta.push(slide.imageCount + ' รูป');
    if (slide.tableCount) meta.push(slide.tableCount + ' ตาราง');
    if (meta.length) lines.push('<font color="#888888">' + meta.join(' · ') + '</font>');
    if (!lines.length) lines.push('<font color="#888888">(สไลด์ว่าง)</font>');

    var section = CardService.newCardSection()
      .setHeader('สไลด์ ' + slide.index)
      .addWidget(CardService.newTextParagraph().setText(lines.join('<br>')));
    builder.addSection(section);
  });

  // Footer: refresh + back actions.
  var refresh = CardService.newTextButton()
    .setText('อ่านใหม่')
    .setOnClickAction(CardService.newAction().setFunctionName('handleReadContext'));
  var back = CardService.newTextButton()
    .setText('กลับ')
    .setOnClickAction(CardService.newAction().setFunctionName('handleGoHome'));

  builder.addSection(
    CardService.newCardSection().addWidget(
      CardService.newButtonSet().addButton(refresh).addButton(back)
    )
  );

  return builder.build();
}

/**
 * @param {string} s
 * @param {number} max
 * @return {string}
 * @private
 */
function truncate_(s, max) {
  if (!s) return '';
  return s.length > max ? s.substring(0, max) + '…' : s;
}

/**
 * Minimal HTML escaping for CardService text widgets.
 * @param {string} s
 * @return {string}
 * @private
 */
function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
