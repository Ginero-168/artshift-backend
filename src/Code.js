/**
 * Code.js
 * -------
 * Entry points wired to appsscript.json triggers and to CardService
 * button actions. This file stays thin: it delegates data work to
 * Context.js and rendering to Cards.js.
 */

/**
 * Homepage trigger (common + slides host). See appsscript.json.
 * @param {Object} e Event object provided by the add-on runtime.
 * @return {GoogleAppsScript.Card_Service.Card}
 */
function onHomepage(e) {
  return buildHomepageCard();
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
  var nav = CardService.newNavigation().updateCard(buildHomepageCard());
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
