# Mighty Slide Animator Backend

Node.js service that renders animated text (HTML/CSS) into a GIF and returns
it as a base64 data URL, so the Mighty Slide Google Slides add-on can insert
it as an image.

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

## Deploy on Hostinger

### If you have Hostinger VPS

1. SSH into the VPS and install Node.js 18+ and dependencies for Puppeteer:

   ```bash
   sudo apt update
   sudo apt install -y libgconf-2-4 libatk1.0-0 libatk-bridge2.0-0 libgdk-pixbuf2.0-0 libgtk-3-0 libgbm1 libnss3 libxss1 libasound2
   ```

2. Upload this `backend/` folder to the VPS.
3. Run `npm install` and `npm start` (or use PM2 for production).
4. Expose the server through your domain with a reverse proxy (Nginx) or use
   the VPS IP with port 3000 if you open the firewall.
5. Copy the public URL into the add-on's `AnimateText.js` config variable
   `BACKEND_URL`.

### If you only have Hostinger shared hosting

Shared hosting usually **cannot run Puppeteer/headless Chrome** because it
lacks the required libraries and sandbox permissions. You need at least a VPS
or a cloud function (e.g. Vercel Serverless Functions may also struggle with
Puppeteer). Alternatives:

- Upgrade to Hostinger VPS
- Use a different cloud provider that supports Docker (Render, Railway, Fly.io)
- Use a dedicated GIF-rendering API service

## Environment variables

- `PORT` — server port (default `3000`)
- `HOST` — bind host (default `0.0.0.0`)
