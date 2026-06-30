# Mighty Slide Animator Backend

Node.js service that renders animated text into a GIF using `node-canvas` and
`gifencoder`, then returns it as a base64 data URL. The Mighty Slide Google
Slides add-on can insert the GIF as an image on a slide.

No headless browser is required, so this backend runs on any Node.js host that
supports native `canvas` dependencies (including Hostinger Node.js hosting).

## API

### `POST /api/animate`

Request body:

```json
{
  "text": "สวัสดี",
  "animation": "fade-in",
  "style": {
    "fontFamily": "Sarabun, sans-serif",
    "fontSize": 64,
    "color": "#ffffff",
    "background": "#1a73e8",
    "bold": false
  },
  "width": 640,
  "height": 160,
  "duration": 2
}
```

Response:

```json
{
  "ok": true,
  "mime": "image/gif",
  "data": "<base64>",
  "url": "data:image/gif;base64,<base64>"
}
```

## Available animations

- `fade-in`
- `slide-up`
- `slide-left`
- `zoom-in`
- `bounce`

## Run locally

```bash
cd backend
npm install
npm start
```

The server listens on `http://0.0.0.0:3000` by default.

> Note: `canvas` is a native Node.js module. On macOS/Linux you may need
> build tools and system libraries (e.g. `pkg-config`, `cairo`, `pango`,
> `libjpeg`, `giflib`). See the
> [`canvas` install guide](https://github.com/Automattic/node-canvas#compiling).

## Deploy on Hostinger

This backend has been deployed successfully on Hostinger Node.js application
hosting using the archive deployment method.

1. Zip the `backend/` folder (without `node_modules`):
   ```bash
   cd backend
   zip -r ../backend.zip . -x "node_modules/*"
   ```
2. In Hostinger hPanel, go to **Advanced** → **Node.js** / **JavaScript Apps**
   and upload the archive.
3. Hostinger will detect the Express app and run `npm install` + `npm start`.
4. Set the deployed URL in the add-on (`src/AnimateText.js`).

## Environment variables

- `PORT` — server port (default `3000`)
- `HOST` — bind host (default `0.0.0.0`)
