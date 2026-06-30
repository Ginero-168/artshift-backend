const puppeteer = require('puppeteer');
const GIFEncoder = require('gifencoder');
const { createCanvas } = require('canvas');

const DEFAULT_STYLE = {
  fontFamily: 'Sarabun, sans-serif',
  fontSize: 64,
  color: '#ffffff',
  background: '#1a73e8',
  bold: false
};

const ANIMATIONS = {
  'fade-in': `
    @keyframes mighty-anim {
      0% { opacity: 0; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1); }
    }
  `,
  'slide-up': `
    @keyframes mighty-anim {
      0% { opacity: 0; transform: translateY(40px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `,
  'slide-left': `
    @keyframes mighty-anim {
      0% { opacity: 0; transform: translateX(-80px); }
      100% { opacity: 1; transform: translateX(0); }
    }
  `,
  'zoom-in': `
    @keyframes mighty-anim {
      0% { opacity: 0; transform: scale(0.2); }
      80% { transform: scale(1.05); }
      100% { opacity: 1; transform: scale(1); }
    }
  `,
  'bounce': `
    @keyframes mighty-anim {
      0% { opacity: 0; transform: translateY(-100%); animation-timing-function: ease-in; }
      50% { transform: translateY(15%); animation-timing-function: ease-out; }
      70% { transform: translateY(-10%); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `
};

function buildHtml({ text, style, animation, width, height }) {
  const s = Object.assign({}, DEFAULT_STYLE, style);
  const keyframes = ANIMATIONS[animation] || ANIMATIONS['fade-in'];
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&family=Montserrat:wght@400;700&family=Roboto:wght@400;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: ${width}px;
        height: ${height}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${s.background};
        font-family: ${s.fontFamily};
        overflow: hidden;
      }
      .text {
        font-size: ${s.fontSize}px;
        color: ${s.color};
        font-weight: ${s.bold ? '700' : '400'};
        text-align: center;
        line-height: 1.2;
        padding: 20px;
        animation: mighty-anim 1s both;
      }
      ${keyframes}
    </style>
  </head>
  <body>
    <div class="text">${escapeHtml(text)}</div>
  </body>
</html>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function textToGif({ text, style, animation, width, height, duration }) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    const html = buildHtml({ text, style, animation, width, height });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const fps = 20;
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const encoder = new GIFEncoder(width, height);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(1000 / fps);
    encoder.setQuality(10);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < totalFrames; i++) {
      const t = i / (totalFrames - 1 || 1);
      // Freeze at end of CSS animation (1s) so the last frames hold the final state.
      const seekTime = Math.min(t * 1000, 1000);
      await page.evaluate((time) => {
        const el = document.querySelector('.text');
        if (el && el.getAnimations) {
          el.getAnimations().forEach((anim) => {
            anim.currentTime = time;
          });
        }
      }, seekTime);

      const screenshot = await page.screenshot({ encoding: 'binary' });
      const img = await loadImageToCanvas(screenshot, canvas);
      ctx.drawImage(img, 0, 0, width, height);
      encoder.addFrame(ctx);
    }

    encoder.finish();
    return encoder.out.getData();
  } finally {
    await browser.close();
  }
}

function loadImageToCanvas(buffer, canvas) {
  return new Promise((resolve, reject) => {
    const img = new (require('canvas').Image)();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = buffer;
  });
}

module.exports = { textToGif, ANIMATIONS };
