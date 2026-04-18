const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { execFile } = require("child_process");

const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

const { runtimeRoot } = require("../config/runtime");
const { resolveCookieFilePath, resolveProxyUrl } = require("./ytdlp");

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 12000;
const TRANSIENT_PROCESS_ERROR_REGEX = /\b(eperm|eacces|ebusy|emfile|enfile)\b/i;
const CHECK_RETRY_DELAYS_MS = [250, 800];

async function runCheck(command, args = []) {
  let lastError = null;

  for (let attempt = 0; attempt <= CHECK_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, {
        timeout: COMMAND_TIMEOUT_MS,
        windowsHide: true
      });

      return {
        ok: true,
        detail: `${stdout || stderr || ""}`.trim().split(/\r?\n/)[0] || "available"
      };
    } catch (error) {
      lastError = error;
      const detail = `${error.stderr || error.stdout || error.message || "unavailable"}`
        .trim()
        .split(/\r?\n/)[0];

      if (
        !TRANSIENT_PROCESS_ERROR_REGEX.test(`${error?.message || ""}`) ||
        attempt === CHECK_RETRY_DELAYS_MS.length
      ) {
        return {
          ok: false,
          detail
        };
      }

      await new Promise((resolve) => setTimeout(resolve, CHECK_RETRY_DELAYS_MS[attempt]));
    }
  }

  return {
    ok: false,
    detail: `${lastError?.stderr || lastError?.stdout || lastError?.message || "unavailable"}`
      .trim()
      .split(/\r?\n/)[0]
  };
}

function buildCheck(ok, detail, required = true) {
  return {
    ok: Boolean(ok),
    detail: detail || "",
    required
  };
}

async function getRuntimeDiagnostics() {
  const nodeVersion = process.version;
  const ffmpeg = ffmpegPath
    ? await runCheck(ffmpegPath, ["-version"])
    : { ok: false, detail: "ffmpeg-static missing" };
  const ffprobe = ffprobePath
    ? await runCheck(ffprobePath, ["-version"])
    : { ok: false, detail: "ffprobe-static missing" };
  const python = await runCheck("python", ["--version"]);
  const ytDlp = await runCheck("python", ["-m", "yt_dlp", "--version"]);
  const fasterWhisper = await runCheck("python", ["-c", "import faster_whisper"]);
  const openAiWhisper = await runCheck("python", ["-c", "import whisper"]);
  const cookieFile = resolveCookieFilePath();
  const proxyUrl = resolveProxyUrl();
  const ytdlCoreProxyUrl = resolveProxyUrl("ytdlCore");
  const remoteComponents = `${process.env.YTDLP_REMOTE_COMPONENTS || ""}`.trim();
  const jsRuntimes = `${process.env.YTDLP_JS_RUNTIMES || ""}`.trim();
  const bgutilBaseUrl = `${process.env.YTDLP_BGUTIL_BASE_URL || ""}`.trim();
  const pluginDirs = `${process.env.YTDLP_PLUGIN_DIRS || ""}`.trim();
  const profileChain = `${process.env.YTDLP_PROFILE_CHAIN || process.env.YTDLP_AUDIO_PROFILE_CHAIN || ""}`.trim();

  const checks = {
    node: buildCheck(true, nodeVersion, true),
    ffmpeg: buildCheck(ffmpeg.ok, ffmpeg.detail, true),
    ffprobe: buildCheck(ffprobe.ok, ffprobe.detail, true),
    python: buildCheck(python.ok, python.detail, true),
    ytDlp: buildCheck(ytDlp.ok, ytDlp.detail, true),
    fasterWhisper: buildCheck(fasterWhisper.ok, fasterWhisper.detail, false),
    openAiWhisper: buildCheck(openAiWhisper.ok, openAiWhisper.detail, false),
    ytDlpCookies: buildCheck(
      Boolean(cookieFile),
      cookieFile || `not configured (add ${path.join(runtimeRoot, "youtube-cookies.txt")} or set YTDLP_COOKIE_FILE)`,
      false
    ),
    ytDlpProxy: buildCheck(
      Boolean(proxyUrl),
      proxyUrl || "not configured (set YTDLP_PROXY_URL for proxy-backed YouTube access)",
      false
    ),
    ytdlCoreProxy: buildCheck(
      Boolean(ytdlCoreProxyUrl),
      ytdlCoreProxyUrl ||
        "not configured (set YTDL_CORE_PROXY_URL if the cookie-backed ytdl-core fallback should use a different proxy)",
      false
    ),
    ytDlpRemoteComponents: buildCheck(
      Boolean(remoteComponents),
      remoteComponents || "not configured (set YTDLP_REMOTE_COMPONENTS for yt-dlp EJS or other remote components)",
      false
    ),
    ytDlpJsRuntimes: buildCheck(
      Boolean(jsRuntimes),
      jsRuntimes || "not configured (set YTDLP_JS_RUNTIMES when yt-dlp needs a JS runtime such as node)",
      false
    ),
    ytDlpBgutilProvider: buildCheck(
      Boolean(bgutilBaseUrl),
      bgutilBaseUrl || "not configured (set YTDLP_BGUTIL_BASE_URL if using a bgutil PO-token provider service)",
      false
    ),
    ytDlpPluginDirs: buildCheck(
      Boolean(pluginDirs),
      pluginDirs || "not configured (set YTDLP_PLUGIN_DIRS if yt-dlp plugins live outside the default environment)",
      false
    ),
    ytDlpProfileChain: buildCheck(
      Boolean(profileChain),
      profileChain || "not configured (set YTDLP_PROFILE_CHAIN to step through default/ejs/bgutil/aggressive recovery profiles)",
      false
    ),
    runtimeRoot: buildCheck(fs.existsSync(runtimeRoot), runtimeRoot, true)
  };

  const transcriptionReady = checks.fasterWhisper.ok || checks.openAiWhisper.ok;
  const requiredReady = Object.values(checks)
    .filter((check) => check.required)
    .every((check) => check.ok);

  return {
    checkedAt: new Date().toISOString(),
    ready: requiredReady,
    renderReady: requiredReady,
    transcriptionReady,
    checks
  };
}

module.exports = {
  getRuntimeDiagnostics
};
