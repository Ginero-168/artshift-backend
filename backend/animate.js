const { createCanvas, registerFont } = require('canvas');
const GIFEncoder = require('gifencoder');
const path = require('path');

// Register bundled Thai fonts so node-canvas can render Thai text on servers
// that do not have system Thai fonts installed.
const FONTS_DIR = path.join(__dirname, 'fonts');
registerFont(path.join(FONTS_DIR, 'Sarabun-Regular.ttf'), { family: 'Sarabun', weight: 'normal' });
registerFont(path.join(FONTS_DIR, 'Sarabun-Bold.ttf'), { family: 'Sarabun', weight: 'bold' });

const DEFAULT_STYLE = {
  fontFamily: 'Sarabun, sans-serif',
  fontSize: 64,
  color: '#ffffff',
  background: '#1a73e8',
  bold: false
};

const FONT_WEIGHT = { false: 'normal', true: 'bold' };

/**
 * Render animated text into a GIF using Node canvas (no Puppeteer/Chrome).
 * Supported animations: fade-in, slide-up, slide-left, zoom-in, bounce.
 *
 * @param {Object} opts
 * @returns {Buffer} GIF bytes
 */
function textToGif({ text, style, animation, width, height, duration }) {
  const s = Object.assign({}, DEFAULT_STYLE, style);
  const fps = 20;
  const totalFrames = Math.max(1, Math.round(Number(duration) * fps));
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(1000 / fps);
  encoder.setQuality(10);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const fontWeight = FONT_WEIGHT[!!s.bold];
  const fontFamily = resolveFontFamily(text, s.fontFamily);
  const fontSize = Math.max(8, Number(s.fontSize) || 64);
  ctx.font = fontWeight + ' ' + fontSize + 'px "' + fontFamily + '", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  for (let i = 0; i < totalFrames; i++) {
    const t = i / (totalFrames - 1 || 1);
    drawFrame(ctx, text, width, height, s, animation, t);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}

function cleanFontFamily(name) {
  const n = String(name || 'Sarabun').split(',')[0].trim();
  return n.replace(/['"]/g, '');
}

function containsThai(text) {
  return /\p{Script=Thai}/u.test(String(text));
}

function resolveFontFamily(text, requestedFamily) {
  const family = cleanFontFamily(requestedFamily);
  // If the text contains Thai characters, force Sarabun because it is the only
  // Thai font we bundle on the server.
  if (containsThai(text) && family.toLowerCase() !== 'sarabun') {
    return 'Sarabun';
  }
  return family;
}

function drawFrame(ctx, text, width, height, style, animation, t) {
  // Clear background.
  ctx.fillStyle = style.background || DEFAULT_STYLE.background;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.font = (style.bold ? 'bold ' : 'normal ') + style.fontSize + 'px "' + resolveFontFamily(text, style.fontFamily) + '", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = style.color || DEFAULT_STYLE.color;

  const cx = width / 2;
  const cy = height / 2;

  let alpha = 1;
  let tx = 0;
  let ty = 0;
  let scale = 1;

  switch (animation) {
    case 'fade-in':
      alpha = easeOutQuad(t);
      scale = 0.95 + 0.05 * easeOutQuad(t);
      break;
    case 'slide-up':
      alpha = easeOutQuad(t);
      ty = 40 * (1 - easeOutQuad(t));
      break;
    case 'slide-left':
      alpha = easeOutQuad(t);
      tx = -80 * (1 - easeOutQuad(t));
      break;
    case 'zoom-in':
      alpha = easeOutQuad(t);
      scale = 0.2 + 0.8 * easeOutBack(t);
      break;
    case 'bounce':
      alpha = t > 0 ? 1 : 0;
      ty = -height * 0.6 * (1 - bounceEase(t));
      break;
    default:
      alpha = easeOutQuad(t);
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(cx + tx, cy + ty);
  ctx.scale(scale, scale);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function bounceEase(t) {
  // Approximate a single bounce: up then settle.
  if (t < 0.4) {
    // move up quickly
    return 1 - Math.pow(1 - t / 0.4, 2);
  }
  // settle with a small bounce
  const remaining = (t - 0.4) / 0.6;
  return 1 - 0.12 * Math.sin(remaining * Math.PI * 2) * (1 - remaining);
}

module.exports = { textToGif };
