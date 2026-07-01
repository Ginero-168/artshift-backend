const express = require('express');
const cors = require('cors');
const { textToGif, ANIMATION_LABELS } = require('./animate');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/animations
 * Returns the list of available animation ids and labels.
 */
app.get('/api/animations', (req, res) => {
  const list = Object.keys(ANIMATION_LABELS).map((id) => ({ id, label: ANIMATION_LABELS[id] }));
  res.json({ ok: true, animations: list });
});

/**
 * GET /api/preview/:id
 * Returns a small example GIF for the requested animation id.
 */
app.get('/api/preview/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const buffer = await textToGif({
      text: 'Mighty',
      style: {
        fontFamily: 'Sarabun, sans-serif',
        fontSize: 24,
        color: '#ffffff',
        background: '#1a73e8',
        bold: true
      },
      animation: id,
      width: 160,
      height: 60,
      duration: 1.5,
      transparent: req.query.transparent === '1' || req.query.transparent === 'true'
    });
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * POST /api/animate
 * Body: { text, style, animation, width?, height?, duration?, transparent? }
 * Response: { ok: true, url: string, mime: 'image/gif' }
 */
app.post('/api/animate', async (req, res) => {
  try {
    const payload = req.body || {};
    const { text, style, animation } = payload;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: 'text is required' });
    }

    console.log('animate request:', {
      text: text,
      animation: animation,
      background: style && style.background,
      transparent: payload.transparent
    });

    const buffer = await textToGif({
      text,
      style: style || {},
      animation: animation || 'fade-in',
      width: payload.width || 640,
      height: payload.height || 160,
      duration: payload.duration || 2,
      transparent: !!payload.transparent
    });

    const b64 = buffer.toString('base64');
    res.json({
      ok: true,
      mime: 'image/gif',
      data: b64,
      url: 'data:image/gif;base64,' + b64,
      debug: {
        receivedTransparent: !!payload.transparent,
        receivedBackground: style && style.background
      }
    });
  } catch (err) {
    console.error('Animate error:', err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Mighty Slide animator running on http://${HOST}:${PORT}`);
});
