/**
 * Code.js
 * -------
 * Entry points wired to appsscript.json triggers and to CardService
 * button actions. This file stays thin: it delegates data work to
 * Context.js and rendering to Cards.js.
 */

/**
 * Runs once when the add-on is installed; build the menu immediately so the
 * user does not have to reload the document first.
 * @param {Object} e
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Simple trigger: build the Extensions menu when the presentation opens.
 * This is what lets the user open the floating overlay window.
 * @param {Object} e
 */
function onOpen(e) {
  SlidesApp.getUi()
    .createAddonMenu()
    .addItem('เปิดแผง Second Brain', 'showPanel')
    .addToUi();
}

/**
 * Show the context in a docked sidebar. A sidebar lives in the right rail
 * and never covers the slide canvas, so it does not block editing.
 */
function showPanel() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle(
    'Slides Second Brain'
  );
  SlidesApp.getUi().showSidebar(html);
}

/**
 * Action: read the active presentation and show the summary card.
 * @param {Object} e
 * @return {GoogleAppsScript.Card_Service.ActionResponse}
 */
function handleReadContext(e) {
  try {
    var ctx = readPresentationContext();
    var nav = CardService.newNavigation().updateCard(buildContextCard(ctx));
    return CardService.newActionResponseBuilder().setNavigation(nav).build();
  } catch (err) {
    return notify_('อ่านบริบทไม่สำเร็จ: ' + err.message);
  }
}

/**
 * Action: go back to the homepage card.
 * @param {Object} e
 * @return {GoogleAppsScript.Card_Service.ActionResponse}
 */
function handleGoHome(e) {
  return navTo_(buildHomepageCard());
}

/* ----------------------------- AI (phase 2) ----------------------------- */

/** Show the settings card. */
function handleShowSettings(e) {
  return navTo_(buildSettingsCard());
}

/** Persist API key + model from the settings form. */
function handleSaveSettings(e) {
  var inputs = (e && e.commonEventObject && e.commonEventObject.formInputs) || {};
  setApiKey_(readInput_(inputs, 'apiKey'));
  setModel_(readInput_(inputs, 'model'));
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('บันทึกการตั้งค่าแล้ว'))
    .setNavigation(CardService.newNavigation().updateCard(buildHomepageCard()))
    .build();
}

/** Remove the stored API key. */
function handleClearKey(e) {
  setApiKey_('');
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('ลบ API key แล้ว'))
    .setNavigation(CardService.newNavigation().updateCard(buildSettingsCard()))
    .build();
}

/** Summarize the active presentation with Gemini. */
function handleSummarize(e) {
  try {
    return navTo_(buildAiResultCard('สรุป deck', summarizePresentation()));
  } catch (err) {
    return notify_('สรุปไม่สำเร็จ: ' + err.message);
  }
}

/** Show the Q&A input card. */
function handleShowAsk(e) {
  return navTo_(buildAskCard());
}

/** Answer a question about the deck. */
function handleAsk(e) {
  try {
    var inputs = (e && e.commonEventObject && e.commonEventObject.formInputs) || {};
    var question = readInput_(inputs, 'question');
    return navTo_(buildAiResultCard('คำตอบ', answerQuestion(question)));
  } catch (err) {
    return notify_('ถามไม่สำเร็จ: ' + err.message);
  }
}

/**
 * Read a single text value from a CardService form inputs map.
 * @param {Object} formInputs
 * @param {string} field
 * @return {string}
 * @private
 */
function readInput_(formInputs, field) {
  var entry = formInputs[field];
  if (!entry || !entry.stringInputs || !entry.stringInputs.value) return '';
  return entry.stringInputs.value[0] || '';
}

/**
 * Build an ActionResponse that navigates (updates) to a card.
 * @param {GoogleAppsScript.Card_Service.Card} card
 * @return {GoogleAppsScript.Card_Service.ActionResponse}
 * @private
 */
function navTo_(card) {
  var nav = CardService.newNavigation().updateCard(card);
  return CardService.newActionResponseBuilder().setNavigation(nav).build();
}

/**
 * Build a simple notification ActionResponse.
 * @param {string} text
 * @return {GoogleAppsScript.Card_Service.ActionResponse}
 * @private
 */
function notify_(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(text))
    .build();
}
