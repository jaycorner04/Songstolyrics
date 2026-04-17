# Song to Lyrics

Song to Lyrics is an Express app that turns a YouTube song link into:

- an interactive lyric page with synced line highlighting
- a downloadable lyric-video render
- a browser preview of the finished `.mp4`

The app is now organized for cleaner deployment:

- runtime files live under `runtime/`
- render jobs persist across restarts
- `/api/health` and `/api/readiness` expose startup state
- built-in doctor and smoke-test scripts help validate a server before deploy
- production middleware enables security headers, compression, and graceful shutdown

## What it does

1. Paste a YouTube URL into the homepage.
2. The app loads video metadata, artwork, audio, and lyric candidates.
3. Lyrics are pulled from LRCLib first, then `lyrics.ovh`, then captions, then audio transcription when available.
4. The page renders an interactive lyric preview and automatically starts the final video render.
5. Finished videos can be previewed in the browser and downloaded from the render job endpoint.

If lyrics are unavailable, the renderer falls back to title cards so the video still completes.

## Stack

- Node.js + Express
- `yt-dlp` for YouTube stream resolution and audio fallback
- `@danielxceron/youtube-transcript` for transcript/caption fallback
- FFmpeg and FFprobe for media rendering
- LRCLib and `lyrics.ovh` for lyric lookup
- Plain HTML, CSS, and client-side JavaScript for the frontend

## Required runtime dependencies

- Node.js `18.17+`
- Python `3.x`
- `yt-dlp` installed in Python
- bundled FFmpeg and FFprobe from `ffmpeg-static` and `ffprobe-static`

## Optional runtime dependencies

- `faster-whisper` or `openai-whisper`

Without Whisper, the app still runs, but audio-transcription fallback is unavailable for videos with no usable public lyrics or captions.

## Local setup

```bash
npm install
python -m pip install yt-dlp
npm run doctor
npm run dev
```

Then open `http://localhost:3000`.

## Environment variables

Create a `.env` file with:

```env
HOST=0.0.0.0
PORT=3000
TRUST_PROXY=false
RUNTIME_ROOT=
ALLOW_BROWSER_COOKIES=false
YTDLP_CONFIG_FILE=
YTDLP_COOKIE_FILE=
YTDLP_YOUTUBE_CLIENTS=
YTDLP_AUDIO_CLIENTS=
YTDLP_VIDEO_CLIENTS=
YTDLP_CAPTION_CLIENTS=
YTDLP_PLAYER_SKIP=
YTDLP_YOUTUBETAB_SKIP=
YTDLP_VISITOR_DATA=
YTDLP_PO_TOKEN=
YTDLP_PO_TOKEN_CLIENT=
YOUTUBE_API_KEY=
LYRICS_OVH_BASE_URL=https://api.lyrics.ovh
```

- `HOST` controls the bind address.
- `TRUST_PROXY=true` is recommended when the app sits behind Nginx, Caddy, a load balancer, or a platform proxy.
- `RUNTIME_ROOT` optionally moves uploads, caches, render jobs, and renders outside the project directory.
- `ALLOW_BROWSER_COOKIES=false` keeps audio resolution deploy-safe. Only turn it on for local machines where browser-cookie extraction is intentionally available.
- `YTDLP_CONFIG_FILE` lets you point the app at a pinned yt-dlp config file for both local and deployed runs.
- `YTDLP_COOKIE_FILE`, `YTDLP_*_CLIENTS`, `YTDLP_PLAYER_SKIP`, `YTDLP_VISITOR_DATA`, and `YTDLP_PO_TOKEN` let you adjust YouTube extraction behavior without changing application code when yt-dlp/YouTube behavior shifts.
- `YOUTUBE_API_KEY` is optional, but improves metadata quality.

If `RUNTIME_ROOT` is blank, runtime files are stored in `./runtime`.
Preview and downloaded audio caches also live under that same runtime root, so local and deployed storage now behave the same way.
The app ignores personal user/home yt-dlp config by default, so local runs match deployed runs unless you explicitly set `YTDLP_CONFIG_FILE`.

## Deploy checks

Run these before deploy:

```bash
npm run doctor
npm run smoke
npm run e2e
```

- `doctor` verifies runtime dependencies and reports whether the server is render-ready.
- `smoke` boots the server on a temporary port and checks `/api/health` and `/api/readiness`.
- `e2e` exercises multiple real YouTube links, checks the audio endpoint, completes a real render, and verifies the output still exists after a restart.

If you want one command instead of three, run:

```bash
npm run predeploy:check
```

That wrapper runs `doctor`, `smoke`, and `e2e` in order with `NODE_ENV=production` and deploy-safe audio settings, then stops immediately if any step fails.

## Docker

The project now includes a production Dockerfile. To build and run it:

```bash
docker build -t song-to-lyrics .
docker run --rm -p 3000:3000 -e PORT=3000 song-to-lyrics
```

If you want runtime data outside the container filesystem, mount a host directory and set `RUNTIME_ROOT`, for example:

```bash
docker run --rm -p 3000:3000 -e PORT=3000 -e RUNTIME_ROOT=/data -v %cd%/runtime:/data song-to-lyrics
```

For a repeatable local production-style deploy, use Docker Compose:

```bash
docker compose up -d --build
```

The repository also includes a `Procfile` for simple PaaS setups that expect a web start command.

## Runtime layout

Generated data is written under:

```text
runtime/
  cache/
  jobs/
  renders/
  uploads/
```

Render job metadata is persisted in `runtime/jobs`, so completed and failed jobs remain visible after a restart.

## Notes

- The app auto-starts a render after a successful YouTube paste.
- Some YouTube videos do not expose captions or matching public lyrics. Those cases fall back to title-card output.
- Source-video frame sampling is best effort. If it fails, the renderer switches to safer fallback artwork or generated scenes.
- Full-song renders can take a while, especially for longer tracks.
- Review YouTube terms and any music licensing requirements before distributing rendered videos publicly.
