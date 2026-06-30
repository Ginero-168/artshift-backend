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
    .setTitle('Slides Second Brain')
    .setSubtitle('Phase 1 · อ่านบริบทของ presentation');

  var intro = CardService.newTextParagraph()
    .setText(
      'กดปุ่มด้านล่างเพื่ออ่านบริบทของสไลด์ที่กำลังเปิดอยู่ ' +
      '(หัวข้อ, ข้อความ, โน้ตผู้บรรยาย, จำนวนรูป/ตาราง).'
    );

  var readAction = CardService.newAction().setFunctionName('handleReadContext');
  var readButton = CardService.newTextButton()
    .setText('อ่านบริบท')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(readAction);

  var section = CardService.newCardSection()
    .addWidget(intro)
    .addWidget(CardService.newButtonSet().addButton(readButton));

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .build();
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
