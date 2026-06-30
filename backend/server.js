const express = require('express');
const cors = require('cors');
const { textToGif } = require('./animate');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

/**
 * POST /api/animate
 * Body: { text, style, animation, width?, height?, duration? }
 * Response: { ok: true, url: string, mime: 'image/gif' }
 */
app.post('/api/animate', async (req, res) => {
  try {
    const payload = req.body || {};
    const { text, style, animation } = payload;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: 'text is required' });
    }

    const buffer = await textToGif({
      text,
      style: style || {},
      animation: animation || 'fade-in',
      width: payload.width || 640,
      height: payload.height || 160,
      duration: payload.duration || 2
    });

    const b64 = buffer.toString('base64');
    res.json({
      ok: true,
      mime: 'image/gif',
      data: b64,
      url: 'data:image/gif;base64,' + b64
    });
  } catch (err) {
    console.error('Animate error:', err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Mighty Slide animator running on http://${HOST}:${PORT}`);
});
