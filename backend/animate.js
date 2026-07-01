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

// GIF only supports one transparent color in the palette. Use this unlikely
// key color when transparent mode is requested; the encoder will mark it as
// transparent so it shows as see-through in Google Slides.
const TRANSPARENT_KEY = '#ff00ff';

// Animation registry. Each function receives (t, width, height, style) and returns
// transformation + render hints for the frame.
const ANIMATIONS = {
  'fade-in': (t) => ({ alpha: easeOutQuad(t), scale: 0.95 + 0.05 * easeOutQuad(t) }),
  'slide-up': (t, w, h) => ({ alpha: easeOutQuad(t), ty: h * 0.15 * (1 - easeOutQuad(t)) }),
  'slide-down': (t, w, h) => ({ alpha: easeOutQuad(t), ty: -h * 0.15 * (1 - easeOutQuad(t)) }),
  'slide-left': (t, w, h) => ({ alpha: easeOutQuad(t), tx: -w * 0.15 * (1 - easeOutQuad(t)) }),
  'slide-right': (t, w, h) => ({ alpha: easeOutQuad(t), tx: w * 0.15 * (1 - easeOutQuad(t)) }),
  'zoom-in': (t) => ({ alpha: easeOutQuad(t), scale: 0.2 + 0.8 * easeOutBack(t) }),
  'zoom-out': (t) => ({ alpha: easeOutQuad(t), scale: 1.3 - 0.3 * easeOutQuad(t) }),
  'bounce': (t, w, h) => ({ alpha: t > 0 ? 1 : 0, ty: -h * 0.5 * (1 - bounceEase(t)) }),
  'pulse': (t) => {
    const s = 1 + 0.12 * Math.sin(t * Math.PI * 2);
    return { alpha: easeOutQuad(Math.min(t * 2, 1)), scale: s };
  },
  'shake': (t) => ({ alpha: easeOutQuad(t), tx: 8 * Math.sin(t * Math.PI * 6) * (1 - t) }),
  'rotate-in': (t) => ({ alpha: easeOutQuad(t), rotation: -90 * (1 - easeOutQuad(t)) }),
  'flip-x': (t) => ({ alpha: easeOutQuad(t), scaleX: -1 + 2 * easeOutQuad(t), scaleY: 1 }),
  'flip-y': (t) => ({ alpha: easeOutQuad(t), scaleX: 1, scaleY: -1 + 2 * easeOutQuad(t) }),
  'elastic': (t) => ({ alpha: easeOutQuad(t), scale: easeOutElastic(t) }),
  'pop': (t) => ({ alpha: easeOutQuad(t), scale: easeOutBack(t) }),
  'wave': (t, w, h) => ({ alpha: easeOutQuad(t), perChar: true, wave: t }),
  'typewriter': (t, w, h) => ({ alpha: 1, typewriter: t }),
  'color-cycle': (t) => ({ alpha: easeOutQuad(t), color: hslToHex(t * 360) }),
  'blur-in': (t) => ({ alpha: easeOutQuad(t), scale: 1.05 - 0.05 * (1 - t), shadow: true, shadowBlur: 20 * (1 - t) }),
  'heartbeat': (t) => {
    const beat = t < 0.2 ? 1 + 0.25 * Math.sin(t * Math.PI * 10) : 1;
    return { alpha: easeOutQuad(Math.min(t * 3, 1)), scale: beat };
  }
};

const ANIMATION_LABELS = {
  'fade-in': 'Fade in',
  'slide-up': 'Slide up',
  'slide-down': 'Slide down',
  'slide-left': 'Slide left',
  'slide-right': 'Slide right',
  'zoom-in': 'Zoom in',
  'zoom-out': 'Zoom out',
  'bounce': 'Bounce',
  'pulse': 'Pulse',
  'shake': 'Shake',
  'rotate-in': 'Rotate in',
  'flip-x': 'Flip X',
  'flip-y': 'Flip Y',
  'elastic': 'Elastic',
  'pop': 'Pop',
  'wave': 'Wave',
  'typewriter': 'Typewriter',
  'color-cycle': 'Color cycle',
  'blur-in': 'Blur in',
  'heartbeat': 'Heartbeat'
};

/**
 * Render animated text into a GIF using Node canvas (no Puppeteer/Chrome).
 * @param {Object} opts
 * @returns {Buffer} GIF bytes
 */
function textToGif({ text, style, animation, width, height, duration, transparent }) {
  const s = Object.assign({}, DEFAULT_STYLE, style);
  const isTransparent = !!transparent;
  const fps = 20;
  const totalFrames = Math.max(1, Math.round(Number(duration) * fps));
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(1000 / fps);
  encoder.setQuality(10);

  if (isTransparent) {
    const key = hexToRgb(TRANSPARENT_KEY);
    encoder.setTransparent(key.r, key.g, key.b);
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const fontWeight = FONT_WEIGHT[!!s.bold];
  const fontFamily = resolveFontFamily(text, s.fontFamily);
  const fontSize = Math.max(8, Number(s.fontSize) || 64);
  ctx.font = fontWeight + ' ' + fontSize + 'px "' + fontFamily + '", sans-serif';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < totalFrames; i++) {
    const t = i / (totalFrames - 1 || 1);
    drawFrame(ctx, text, width, height, s, animation, t, isTransparent);
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
  if (containsThai(text) && family.toLowerCase() !== 'sarabun') {
    return 'Sarabun';
  }
  return family;
}

function drawFrame(ctx, text, width, height, style, animation, t, isTransparent) {
  // Clear background. When transparent mode is on, paint with the key color
  // that the encoder will mark as transparent.
  ctx.fillStyle = isTransparent ? TRANSPARENT_KEY : (style.background || DEFAULT_STYLE.background);
  ctx.fillRect(0, 0, width, height);

  const animator = ANIMATIONS[animation] || ANIMATIONS['fade-in'];
  const hints = animator(t, width, height, style);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, hints.alpha == null ? 1 : hints.alpha));

  const cx = width / 2;
  const cy = height / 2;
  ctx.translate(cx + (hints.tx || 0), cy + (hints.ty || 0));
  if (hints.rotation) ctx.rotate((hints.rotation * Math.PI) / 180);
  const sx = hints.scaleX == null ? (hints.scale || 1) : hints.scaleX;
  const sy = hints.scaleY == null ? (hints.scale || 1) : hints.scaleY;
  ctx.scale(sx, sy);

  ctx.font = (style.bold ? 'bold ' : 'normal ') + style.fontSize + 'px "' + resolveFontFamily(text, style.fontFamily) + '", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textColor = hints.color || style.color || DEFAULT_STYLE.color;
  ctx.fillStyle = textColor;

  if (hints.shadow) {
    ctx.shadowColor = textColor;
    ctx.shadowBlur = hints.shadowBlur || 0;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  if (hints.typewriter) {
    const visible = Math.max(0, Math.ceil(text.length * hints.typewriter));
    const visibleText = text.slice(0, visible);
    ctx.fillText(visibleText, 0, 0);
  } else if (hints.wave != null) {
    drawWaveText(ctx, text, 0, 0, hints.wave);
  } else {
    ctx.fillText(text, 0, 0);
  }

  ctx.restore();
}

function drawWaveText(ctx, text, cx, cy, t) {
  const metrics = ctx.measureText(text);
  const totalWidth = metrics.width;
  const chars = Array.from(text);
  const charWidths = chars.map((ch) => ctx.measureText(ch).width);
  let x = -totalWidth / 2;
  for (let i = 0; i < chars.length; i++) {
    const progress = chars.length > 1 ? i / (chars.length - 1) : 0;
    const yOffset = 12 * Math.sin((progress + t) * Math.PI * 2) * t;
    ctx.fillText(chars[i], x + charWidths[i] / 2, yOffset);
    x += charWidths[i];
  }
}

// Easing functions.
function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutElastic(t) {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function bounceEase(t) {
  if (t < 0.4) {
    return 1 - Math.pow(1 - t / 0.4, 2);
  }
  const remaining = (t - 0.4) / 0.6;
  return 1 - 0.12 * Math.sin(remaining * Math.PI * 2) * (1 - remaining);
}

function hslToHex(h) {
  const s = 0.85;
  const l = 0.55;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const v = String(hex).replace('#', '');
  const bigint = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

module.exports = { textToGif, ANIMATIONS, ANIMATION_LABELS };
