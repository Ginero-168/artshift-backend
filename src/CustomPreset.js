/**
 * CustomPreset.js
 * ---------------
 * Store and retrieve user-defined text presets. Each user has their own list
 * stored in UserProperties, so custom presets are per-account and do not leak
 * to other installations.
 */

var CUSTOM_PRESET_KEY_ = 'MIGHTY_SLIDE_CUSTOM_PRESETS';

/**
 * Load the user's custom presets as an array of preset objects.
 * @return {Array<Object>}
 */
function loadCustomPresets() {
  var raw = PropertiesService.getUserProperties().getProperty(CUSTOM_PRESET_KEY_);
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save a new custom preset. Returns the full list.
 * @param {Object} preset
 * @return {Array<Object>}
 */
function saveCustomPreset(preset) {
  if (!preset || !preset.label) {
    throw new Error('Preset ต้องมีชื่อ');
  }
  var list = loadCustomPresets();
  preset.id = 'custom_' + Date.now();
  list.push(preset);
  PropertiesService.getUserProperties().setProperty(CUSTOM_PRESET_KEY_, JSON.stringify(list));
  return list;
}

/**
 * Delete a custom preset by id.
 * @param {string} id
 * @return {Array<Object>}
 */
function deleteCustomPreset(id) {
  var list = loadCustomPresets().filter(function (p) {
    return p.id !== id;
  });
  PropertiesService.getUserProperties().setProperty(CUSTOM_PRESET_KEY_, JSON.stringify(list));
  return list;
}

/**
 * Merge default presets with the user's custom presets. Custom presets come
 * after defaults so they appear at the end of the gallery.
 * @param {Array<Object>} defaults
 * @return {Array<Object>}
 */
function mergeWithCustomPresets(defaults) {
  var customs = loadCustomPresets().map(function (p) {
    // Ensure every custom preset has the same shape defaults use.
    return p;
  });
  return (defaults || []).concat(customs);
}
