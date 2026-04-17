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
ALLOW_SILENT_AUDIO_FALLBACK=false
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
- `ALLOW_SILENT_AUDIO_FALLBACK=false` prevents the app from shipping a mute `.mp4` when YouTube blocks server-side audio. Leave this off for production unless you explicitly want silent fallback videos.
- `YTDLP_CONFIG_FILE` lets you point the app at a pinned yt-dlp config file for both local and deployed runs.
- `YTDLP_COOKIE_FILE`, `YTDLP_*_CLIENTS`, `YTDLP_PLAYER_SKIP`, `YTDLP_VISITOR_DATA`, and `YTDLP_PO_TOKEN` let you adjust YouTube extraction behavior without changing application code when yt-dlp/YouTube behavior shifts.
- If `YTDLP_COOKIE_FILE` is blank, the app automatically looks for `runtime/youtube-cookies.txt` and `runtime/yt-dlp-cookies.txt`.
- `YOUTUBE_API_KEY` is optional, but improves metadata quality.

If `RUNTIME_ROOT` is blank, runtime files are stored in `./runtime`.
Preview and downloaded audio caches also live under that same runtime root, so local and deployed storage now behave the same way.
The app ignores personal user/home yt-dlp config by default, so local runs match deployed runs unless you explicitly set `YTDLP_CONFIG_FILE`.

### Optional YouTube cookies

If YouTube starts blocking audio access for some videos, place an exported `cookies.txt` file at:

```text
runtime/youtube-cookies.txt
```

or set:

```env
YTDLP_COOKIE_FILE=/absolute/path/to/youtube-cookies.txt
```

The server will pick it up automatically on the next request. Treat this file like a secret and never commit it to Git.

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

## Auto deploy to EC2

The repository now includes a GitHub Actions workflow at `.github/workflows/deploy-ec2.yml`.
When enabled, every push to `main` can redeploy the EC2 server automatically.

One-time setup in GitHub repository secrets:

```text
EC2_HOST
EC2_USER
EC2_SSH_KEY
EC2_APP_DIR
EC2_APP_URL       # optional, example: http://127.0.0.1:3000
EC2_APP_PORT      # optional, default: 3000
```

- `EC2_HOST`: your server hostname or IP
- `EC2_USER`: SSH login user such as `ubuntu` or `ec2-user`
- `EC2_SSH_KEY`: private key content used to SSH into the server
- `EC2_APP_DIR`: absolute app path on the server, for example `/home/ubuntu/Songstolyrics`
- `EC2_APP_URL`: optional health URL base used during deploy verification
- `EC2_APP_PORT`: optional port if `EC2_APP_URL` is not provided

What the workflow does:

1. Connects to EC2 over SSH
2. Pulls the latest `main`
3. Runs `scripts/deploy-remote.sh`
4. Auto-detects the server mode:
   `docker compose`, `pm2`, `systemd`, or plain `node`
5. Waits for `/api/health` to return successfully before the job passes

If your EC2 machine is using Docker Compose, this is the expected happy path for the current project layout.

## Auto push

The repo now includes a local auto-push watcher:

```bash
npm run autopush:start
```

It watches the project, waits briefly for file activity to settle, then commits and pushes changes to the current branch automatically.
Temporary watcher state is stored under `.autopush/`, and `.codex-temp/` is ignored so local Codex scratch files do not get pushed.

## Live debug tunnel

If you want `http://localhost:3000` to mirror the live EC2 app and show production debug errors locally, start the live debug tunnel:

```bash
npm run live-debug:start
```

That script:

- forwards `localhost:3000` to the deployed EC2 app
- replaces this repo's local `node src/server.js` process on port `3000` if it is currently running
- keeps tunnel state and logs under `.live-debug/`

To stop the tunnel and free `localhost:3000` again:

```bash
npm run live-debug:stop
```

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
