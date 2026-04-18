const path = require("path");
const fsp = require("fs/promises");
const os = require("os");
const { spawn } = require("child_process");

const compression = require("compression");
const dotenv = require("dotenv");
const express = require("express");
const ffmpegPath = require("ffmpeg-static");
const helmet = require("helmet");
const multer = require("multer");

const {
  convertCacheRoot,
  ensureRuntimeDirectories,
  previewAudioCacheRoot,
  publicRoot,
  runtimeRoot,
  uploadsRoot
} = require("./config/runtime");
const {
  cacheRemoteAudioUrlToFile,
  findDownloadedAudioFile,
  isYouTubeBotBlockError,
  getAudioMimeType,
  resolveAudioInput,
  resolveAudioUrl,
  resolveAudioUrlDeep,
  resolveVideoUrl
} = require("./services/audio");
const { getAdaptiveProfile, recordAdaptiveSignal } = require("./services/adaptive-guardrails");
const { getRuntimeDiagnostics } = require("./services/deployment");
const { buildLyricsPayload, inferSongFromVideo } = require("./services/lyrics");
const {
  buildRequestDebugContext,
  clearLocalDebugEvents,
  deleteLocalDebugEvent,
  getLocalDebugEvents,
  isLocalDebugRequest,
  recordLocalDebugEvent,
  subscribeLocalDebugEvents
} = require("./services/local-debug");
const { containsTeluguScript, romanizeLyricLines } = require("./services/telugu");
const { transcribeYouTubeAudio } = require("./services/transcription");
const {
  getRenderJob,
  getRenderJobFile,
  initializeRenderJobs,
  startRenderJob
} = require("./services/render");
const {
  createError,
  extractVideoId,
  getCaptionCues,
  getVideoInfo,
  getVideoMetadata
} = require("./services/youtube");

dotenv.config();

const app = express();
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const trustProxy = process.env.TRUST_PROXY === "true";
const buildMarker =
  `${process.env.BUILD_MARKER || `dev-${Date.now()}`}`.trim() || `dev-${Date.now()}`;
const localDebugRemoteBaseUrl =
  `${process.env.LOCAL_DEBUG_REMOTE_BASE_URL || "https://d2nlogmzadt51n.cloudfront.net"}`.trim();
const publicIndexPath = path.join(publicRoot, "index.html");
let startupDiagnostics = {
  checkedAt: "",
  ready: false,
  renderReady: false,
  transcriptionReady: false,
  checks: {}
};
const previewWarmups = new Map();

const renderUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, uploadsRoot);
    },
    filename(req, file, callback) {
      const originalExtension = path.extname(file.originalname || "");
      const fallbackExtension =
        file.fieldname === "audioFile"
          ? file.mimetype.includes("wav")
            ? ".wav"
            : file.mimetype.includes("ogg")
              ? ".ogg"
              : file.mimetype.includes("aac")
                ? ".aac"
                : ".mp3"
          : file.mimetype.includes("webm")
            ? ".webm"
            : file.mimetype.includes("quicktime")
              ? ".mov"
              : ".mp4";
      const extension = originalExtension || fallbackExtension;
      callback(
        null,
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`
      );
    }
  }),
  limits: {
    fileSize: 250 * 1024 * 1024,
    fieldSize: 80 * 1024 * 1024
  },
  fileFilter(req, file, callback) {
    if (file.fieldname === "audioFile") {
      if (!/^audio\//i.test(file.mimetype || "")) {
        callback(createError("Only audio files can be uploaded as a sound fallback.", 400));
        return;
      }

      callback(null, true);
      return;
    }

    if (!/^video\//i.test(file.mimetype || "")) {
      callback(createError("Only video files can be uploaded as a background video.", 400));
      return;
    }

    callback(null, true);
  }
});

app.disable("x-powered-by");
app.set("trust proxy", trustProxy);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);
app.use(compression());
app.use(express.json({ limit: "35mb" }));
app.use(
  express.static(publicRoot, {
    index: false,
    setHeaders(res, filePath) {
      if (/\.(?:js|css|html)$/i.test(filePath || "")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  })
);

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function shouldSkipLocalDebugApiEvent(req, error, statusCode) {
  const requestPath = `${req?.originalUrl || req?.url || ""}`.trim();

  if (`${req?.headers?.["x-local-debug-silent"] || ""}`.trim() === "1") {
    return true;
  }

  if (
    statusCode === 404 &&
    /^\/api\/render\/not-a-real-job(?:\/(?:file|download))?$/i.test(requestPath)
  ) {
    return true;
  }

  if (
    /^\/api\/render$/i.test(requestPath) &&
    /request aborted/i.test(`${error?.message || ""}`)
  ) {
    return true;
  }

  return false;
}

function warmPreviewAudioCache(videoId, audioSource) {
  if (!videoId || !audioSource?.input) {
    return Promise.resolve();
  }

  const outputDirectory = path.join(previewAudioCacheRoot, videoId);

  return Promise.resolve()
    .then(async () => {
      if (audioSource.sourceType === "file") {
        return;
      }

      await cacheRemoteAudioUrlToFile(audioSource.input, outputDirectory, videoId);
    })
    .catch(() => {});
}

function queuePreviewWarmup(videoId) {
  if (!videoId) {
    return;
  }

  const existingWarmup = previewWarmups.get(videoId);

  if (existingWarmup) {
    return;
  }

  const warmupPromise = Promise.resolve()
    .then(async () => {
      const outputDirectory = path.join(previewAudioCacheRoot, videoId);
      const source = await resolveAudioInput(videoId, {
        outputDirectory,
        allowDownloadFallback: true
      });
      await warmPreviewAudioCache(videoId, source);
    })
    .catch(() => {})
    .finally(() => {
      previewWarmups.delete(videoId);
    });

  previewWarmups.set(videoId, warmupPromise);
}

async function proxyRemoteMedia(req, res, sourceUrl, defaultMimeType = "application/octet-stream") {
  const upstreamHeaders = new Headers();
  const requestedRange = `${req.headers.range || ""}`.trim();

  if (requestedRange) {
    upstreamHeaders.set("Range", requestedRange);
  }

  const upstreamResponse = await fetch(sourceUrl, {
    method: "GET",
    headers: upstreamHeaders,
    redirect: "follow"
  });

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    throw createError("The server could not stream that soundtrack right now.", 502);
  }

  const passthroughHeaders = [
    "accept-ranges",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified"
  ];

  res.setHeader("Cache-Control", "no-store");
  res.status(upstreamResponse.status);

  passthroughHeaders.forEach((headerName) => {
    const value = upstreamResponse.headers.get(headerName);

    if (value) {
      res.setHeader(headerName, value);
    }
  });

  if (!res.getHeader("content-type")) {
    res.type(defaultMimeType);
  }

  if (!upstreamResponse.body) {
    res.end();
    return;
  }

  const upstreamStream = upstreamResponse.body;
  const writable = res;

  await upstreamStream.pipeTo(
    new WritableStream({
      write(chunk) {
        return new Promise((resolve, reject) => {
          writable.write(Buffer.from(chunk), (error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });
      },
      close() {
        writable.end();
      },
      abort(error) {
        writable.destroy(error);
      }
    })
  );
}

async function sendCachedPreviewAudio(res, videoId, outputDirectory, fallbackMimeType = "audio/mpeg") {
  const cachedPreviewPath = await findDownloadedAudioFile(videoId, outputDirectory);

  if (!cachedPreviewPath) {
    return false;
  }

  res.setHeader("Cache-Control", "no-store");
  res.type(getAudioMimeType(cachedPreviewPath) || fallbackMimeType);
  res.sendFile(cachedPreviewPath);
  return true;
}

async function sendIndexHtml(req, res) {
  const html = await fsp.readFile(publicIndexPath, "utf8");
  const renderedHtml = html
    .replace(/__BUILD_MARKER__/g, buildMarker)
    .replace(/__LOCAL_DEBUG_BASE_URL__/g, localDebugRemoteBaseUrl);
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.type("html").send(renderedHtml);
}

function isAllowedLocalDebugCorsOrigin(origin = "") {
  try {
    const parsed = new URL(`${origin || ""}`.trim());
    const hostname = `${parsed.hostname || ""}`.trim().toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function applyLocalDebugCors(req, res) {
  const origin = `${req.headers?.origin || ""}`.trim();

  if (!isAllowedLocalDebugCorsOrigin(origin)) {
    return false;
  }

  res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type,Cache-Control,X-Local-Debug-Silent");
  res.set("Access-Control-Allow-Credentials", "false");
  return true;
}

app.get(
  ["/", "/index.html"],
  asyncHandler(async (req, res) => {
    await sendIndexHtml(req, res);
  })
);

function buildWarnings(result) {
  const warnings = [];

  if (result.syncMode === "estimated") {
    warnings.push("Lyric timing is estimated from track length because no timed captions were available.");
  }

  if (result.syncMode === "caption-aligned") {
    warnings.push("Lyric highlights are aligned against captions or transcript timing, so some lines may drift slightly.");
  }

  if (result.syncMode === "captions") {
    warnings.push("No full lyric sheet was found, so the app is using captions or transcript lines from the video instead.");
  }

  if (result.syncMode === "none") {
    warnings.push("No lyrics or transcript lines were found for this video.");
  }

  return warnings;
}

function buildApiErrorMessage(error, req = {}) {
  const requestPath = `${req.originalUrl || req.url || ""}`;

  if (/request aborted/i.test(`${error?.message || ""}`)) {
    return /^\/api\/render$/i.test(requestPath)
      ? "The upload was interrupted before the render could start. Please try again on a stable connection."
      : "The request was interrupted before the server could finish reading it.";
  }

  if (error?.code === "YOUTUBE_BOT_BLOCK" || isYouTubeBotBlockError(error)) {
    if (/^\/api\/audio\//i.test(requestPath)) {
      return "Live preview audio is not available from this server for this song right now. You can still render it, or add the song audio for guaranteed sound.";
    }

    if (/^\/api\/video-frames\//i.test(requestPath)) {
      return "The server could not sample live video frames for this song, so the app should fall back to artwork instead.";
    }

    return "This song opened in recovery mode because live YouTube audio is limited on this server right now. You can still continue, or add audio for guaranteed sound.";
  }

  const statusCode = Number(error?.statusCode || 500);
  return statusCode >= 500
    ? "The server could not process that YouTube video right now."
    : error?.message || "Request failed.";
}

function buildAudioAccessState({ audioPreviewBlocked = false, audioPreviewProbe = {} } = {}) {
  const checks = startupDiagnostics?.checks || {};
  const cookieConfigured = Boolean(checks.ytDlpCookies?.ok);
  const ytDlpProxyConfigured = Boolean(checks.ytDlpProxy?.ok);
  const ytdlCoreProxyConfigured = Boolean(checks.ytdlCoreProxy?.ok);
  const bgutilConfigured = Boolean(checks.ytDlpBgutilProvider?.ok);
  const proxyConfigured = ytDlpProxyConfigured || ytdlCoreProxyConfigured;
  const recoveryConfigured = cookieConfigured || proxyConfigured || bgutilConfigured;
  const probeReason = normalizeWhitespace(
    audioPreviewProbe?.reason || (audioPreviewProbe?.timedOut ? "probe-timeout" : "")
  );
  const hasDedicatedRecoveryProxy = Boolean(ytdlCoreProxyConfigured);
  const recoveryParts = [];

  if (cookieConfigured) {
    recoveryParts.push("signed-in cookies");
  }

  if (hasDedicatedRecoveryProxy) {
    recoveryParts.push("a dedicated recovery proxy");
  } else if (ytDlpProxyConfigured) {
    recoveryParts.push("a server proxy");
  }

  if (bgutilConfigured) {
    recoveryParts.push("bgutil recovery");
  }

  const recoveryLabel = recoveryParts.length ? recoveryParts.join(" + ") : "server recovery";

  if (!audioPreviewBlocked) {
    return {
      mode: "available",
      previewAvailable: true,
      cookieConfigured,
      proxyConfigured,
      recoveryConfigured,
      probeReason,
      badgeLabel: "Audio live",
      title: "Live soundtrack is reachable",
      summary:
        "YouTube preview audio is available for this link. The final render will still verify timing before export.",
      primaryActionLabel: "Create lyric video",
      recommendedAction: "render"
    };
  }

  if (recoveryConfigured) {
    return {
      mode: "recovery",
      previewAvailable: false,
      cookieConfigured,
      proxyConfigured,
      recoveryConfigured,
      probeReason,
      badgeLabel: "Recovery ready",
      title: "This link is ready in smart recovery mode",
      summary:
        probeReason === "probe-timeout"
          ? `The quick sound check stayed conservative, so the preview player is hidden for now. The final render will still try ${recoveryLabel} before asking for an uploaded audio file.`
          : `Live preview audio is not available on this server for this link, but the final render will still try ${recoveryLabel} before asking for an uploaded audio file.`,
      primaryActionLabel: "Create smart recovery render",
      recommendedAction: "render-or-upload"
    };
  }

  return {
    mode: "upload-recommended",
    previewAvailable: false,
    cookieConfigured,
    proxyConfigured,
    recoveryConfigured,
    probeReason,
    badgeLabel: "Add sound",
    title: "This link is ready, and a sound file will make it perfect",
    summary:
      "Lyrics and artwork are ready. Add the song audio file here if you want guaranteed sound in the final video.",
    primaryActionLabel: "Add audio",
    recommendedAction: "upload-audio"
  };
}

function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function slugifyProjectId(value = "") {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function dedupeSequentialLines(lines = []) {
  const deduped = [];

  for (const text of lines) {
    const normalized = normalizeWhitespace(text);

    if (!normalized) {
      continue;
    }

    if (normalizeWhitespace(deduped.at(-1) || "").toLowerCase() === normalized.toLowerCase()) {
      continue;
    }

    deduped.push(normalized);
  }

  return deduped;
}

function summarizeCaptionCues(captionCues = []) {
  const normalizedCues = (Array.isArray(captionCues) ? captionCues : [])
    .map((cue) => ({
      ...cue,
      text: normalizeWhitespace(cue?.text || "")
    }))
    .filter((cue) => cue.text);
  const readableCues = normalizedCues.filter((cue) => cue.readableText !== false);
  const readableRatio = normalizedCues.length > 0 ? readableCues.length / normalizedCues.length : 0;
  const minimumReadableCount = Math.max(4, Math.min(12, Math.round(normalizedCues.length * 0.35)));
  const hasWeakCaptions =
    normalizedCues.length >= 6 &&
    (readableCues.length < minimumReadableCount || readableRatio < 0.45);

  return {
    total: normalizedCues.length,
    readableCount: readableCues.length,
    readableRatio,
    hasWeakCaptions,
    readableCues
  };
}

function selectCaptionCuesForLyrics(captionCues = [], adaptiveProfile = {}) {
  const summary = summarizeCaptionCues(captionCues);

  if (!summary.total) {
    return {
      ...summary,
      usableCues: []
    };
  }

  if (adaptiveProfile.rejectWeakCaptions && summary.hasWeakCaptions) {
    return {
      ...summary,
      usableCues: []
    };
  }

  return {
    ...summary,
    usableCues: summary.readableCues
  };
}

function looksLikeNoisyLyricFallbackLine(text = "") {
  const value = normalizeWhitespace(text).toLowerCase();

  if (!value) {
    return true;
  }

  return /\b(perfect gift|carva(?:an)?(?: mini)?|subscribe|download now|available on|official trailer|foreign speech|music and singing)\b/i.test(
    value
  );
}

function assessAudioFallbackLyrics(lines = [], durationSeconds = 0) {
  const normalizedLines = (Array.isArray(lines) ? lines : [])
    .map((line) => ({
      ...line,
      text: normalizeWhitespace(line?.text || "")
    }))
    .filter((line) => line.text);
  const filteredLines = normalizedLines.filter((line) => !looksLikeNoisyLyricFallbackLine(line.text));
  const removedLineCount = normalizedLines.length - filteredLines.length;

  if (!filteredLines.length) {
    return {
      usable: false,
      lines: [],
      removedLineCount,
      reason: "the audio fallback looked like promo speech instead of lyrics"
    };
  }

  if (!hasUsablePreviewLyrics(filteredLines, durationSeconds)) {
    return {
      usable: false,
      lines: filteredLines,
      removedLineCount,
      reason:
        removedLineCount > 0
          ? "the audio fallback became too sparse after noisy lines were removed"
          : "the audio fallback was too sparse to trust for the preview"
    };
  }

  return {
    usable: true,
    lines: filteredLines,
    removedLineCount,
    reason: ""
  };
}

function shouldRomanizeTeluguLyrics(metadata = {}, lyricResult = {}) {
  const sampledLines = Array.isArray(lyricResult?.lines)
    ? lyricResult.lines
        .slice(0, 16)
        .map((line) => line?.text || "")
        .join(" ")
    : "";
  const songText = `${metadata?.title || ""} ${metadata?.channelTitle || ""} ${
    lyricResult?.song?.title || ""
  } ${lyricResult?.song?.artist || ""}`;

  return containsTeluguScript(sampledLines) || containsTeluguScript(songText) || /\btelugu\b/i.test(songText);
}

function romanizeLyricResultIfNeeded(lyricResult = {}) {
  const romanized = romanizeLyricLines(lyricResult?.lines || []);

  if (!romanized.changed) {
    return {
      changed: false,
      lyricResult
    };
  }

  return {
    changed: true,
    lyricResult: {
      ...lyricResult,
      lines: romanized.lines
    }
  };
}

function looksLikeDescriptionCreditLine(line = "") {
  const value = normalizeWhitespace(line.replace(/[|]+/g, " "));

  if (!value) {
    return false;
  }

  if (/^(charanam|pallavi|chorus|verse|bridge|hook)\s*:?\s*$/i.test(value)) {
    return false;
  }

  if (
    /^(name|song(?:\s+title)?|singer|singers|lyricist|lyrics|music credits|movie credits|programmed by|producer|produced by|co-producer|executive producer|banner|writer|director|written by|starring|music|music composed by|music composed and produced by|bass guitar|guitar|electric guitar|keys|synths|rhythm|flutes?|tabla|nadaswaram|strings|strings conducted by|vocal supervisor|male chorus|female chorus|recording engineers?|recording studio|sound engineer|mixed by|mastered by|dop|editor|action|art|dance choreographer|stills|costume|makeup|publicity|production controller|marketing|pro|label)\b/i.test(
      value
    )
  ) {
    return true;
  }

  if (/^[A-Za-z][A-Za-z0-9 &'()./-]{1,40}\s*:\s+.+$/.test(value)) {
    return true;
  }

  if (/:/.test(value) && /,/.test(value) && /\b(studio|records|productions?|strings|chorus|engineer|director|producer|label)\b/i.test(value)) {
    return true;
  }

  return false;
}

function looksLikeDescriptionLyricLine(line = "") {
  const value = normalizeWhitespace(line.replace(/[|]+/g, " "));

  if (!value) {
    return false;
  }

  if (looksLikeDescriptionCreditLine(value)) {
    return false;
  }

  if (/^(spotify|apple music|youtube|instagram|facebook|producer|prod by|mix mastered by|lyrics by|audio|video|director|editor|shot by|follow|stream|credits?)\b/i.test(value)) {
    return false;
  }

  if (/^(https?:\/\/|www\.|#|@)/i.test(value)) {
    return false;
  }

  if (/^[A-Z0-9 _.-]{2,30}:$/i.test(value)) {
    return false;
  }

  if (value.length < 4 || value.length > 120) {
    return false;
  }

  const wordCount = value.split(/\s+/).filter(Boolean).length;
  return wordCount >= 2;
}

function extractLyricsFromDescription(description = "") {
  const normalizedDescription = `${description || ""}`
    .replace(/\\r/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "");
  const sourceLines = normalizedDescription.split("\n");

  if (!sourceLines.length) {
    return [];
  }

  const headingMatches = [...normalizedDescription.matchAll(/(?:^|\n)\s*lyrics?\s*:\s*(?:\n|$)/gi)];

  if (headingMatches.length) {
    const lastHeading = headingMatches.at(-1);
    const contentAfterHeading = normalizedDescription.slice(
      Number(lastHeading.index || 0) + lastHeading[0].length
    );
    const collectedLines = [];
    let invalidStreak = 0;

    for (const rawLine of contentAfterHeading.split("\n")) {
      const trimmed = normalizeWhitespace(rawLine);

      if (!trimmed) {
        continue;
      }

      if (/^(https?:\/\/|www\.|#|@)/i.test(trimmed)) {
        if (collectedLines.length >= 6) {
          break;
        }

        continue;
      }

      if (looksLikeDescriptionLyricLine(trimmed)) {
        collectedLines.push(trimmed);
        invalidStreak = 0;
        continue;
      }

      invalidStreak += 1;

      if (invalidStreak >= 2 && collectedLines.length >= 6) {
        break;
      }
    }

    const dedupedCollectedLines = dedupeSequentialLines(collectedLines);

    if (dedupedCollectedLines.length >= 6) {
      return dedupedCollectedLines;
    }
  }

  let markerIndex = sourceLines.findIndex((line) => /\blyrics?\b\s*:?\s*$/i.test(line.trim()));
  let candidateLines = [];

  if (markerIndex >= 0) {
    for (let index = markerIndex + 1; index < sourceLines.length; index += 1) {
      const rawLine = sourceLines[index];
      const trimmed = normalizeWhitespace(rawLine);

      if (!trimmed) {
        if (candidateLines.length >= 6) {
          break;
        }

        continue;
      }

      if (/^(https?:\/\/|www\.|#|@)/i.test(trimmed)) {
        break;
      }

      if (!looksLikeDescriptionLyricLine(trimmed)) {
        if (candidateLines.length >= 6) {
          break;
        }

        continue;
      }

      candidateLines.push(trimmed);
    }
  }

  if (candidateLines.length >= 6) {
    return dedupeSequentialLines(candidateLines);
  }

  const fallbackBlock = [];

  for (const rawLine of sourceLines) {
    const trimmed = normalizeWhitespace(rawLine);

    if (looksLikeDescriptionLyricLine(trimmed)) {
      fallbackBlock.push(trimmed);
      continue;
    }

    if (fallbackBlock.length >= 8) {
      break;
    }

    fallbackBlock.length = 0;
  }

  return dedupeSequentialLines(fallbackBlock);
}

function inferSongFromDescriptionCredits(description = "", fallbackSong = null) {
  const normalizedDescription = `${description || ""}`
    .replace(/\\r/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "");
  const lines = normalizedDescription
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  const titleLine = lines.find((line) => /^name\s*:/i.test(line) || /^song(?:\s+title)?\s*:/i.test(line));
  const singerLine = lines.find((line) => /^singer(?:s)?\s*:/i.test(line));
  const parsedTitle = normalizeWhitespace((titleLine || "").replace(/^[^:]+:\s*/i, ""));
  const parsedArtist = normalizeWhitespace((singerLine || "").replace(/^[^:]+:\s*/i, ""));

  return {
    title: parsedTitle || fallbackSong?.title || "",
    artist: parsedArtist || fallbackSong?.artist || "",
    searchQuery: normalizeWhitespace(`${parsedArtist} ${parsedTitle}`),
    cleanedVideoTitle: parsedTitle || fallbackSong?.cleanedVideoTitle || ""
  };
}

function estimateLyricStartsFromDuration(lines = [], durationSeconds = 0) {
  const effectiveDuration = Math.max(Number(durationSeconds || 0), lines.length * 2.5, 20);
  const weights = lines.map((line) => Math.max(1, Math.min(line.length, 60)));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  let cumulative = 0;

  return lines.map((line, index) => {
    const start = (cumulative / totalWeight) * effectiveDuration;
    cumulative += weights[index];
    return start;
  });
}

function getTimingAlignmentWeight(text = "", duration = 0) {
  const wordCount = normalizeWhitespace(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, wordCount * 0.95 + Math.max(0.8, Number(duration || 0)) * 0.42);
}

function alignStartsToCaptions(lines = [], captionCues = [], durationSeconds = 0) {
  if (!Array.isArray(captionCues) || captionCues.length < 2) {
    return estimateLyricStartsFromDuration(lines, durationSeconds);
  }

  const timeline = captionCues
    .map((cue) => ({
      start: Number(cue?.start || 0),
      duration: Math.max(0.8, Number(cue?.duration || 0)),
      weight: getTimingAlignmentWeight(cue?.text || "", cue?.duration || 0)
    }))
    .filter((cue) => Number.isFinite(cue.start) && cue.start >= 0)
    .sort((left, right) => left.start - right.start);

  if (timeline.length < 2) {
    return estimateLyricStartsFromDuration(lines, durationSeconds);
  }

  const cueTotalWeight = timeline.reduce((sum, cue) => sum + cue.weight, 0) || timeline.length;
  let cueWeightCursor = 0;
  const cueMarkers = timeline.map((cue) => {
    const marker = {
      progress: cueWeightCursor / cueTotalWeight,
      start: cue.start
    };
    cueWeightCursor += cue.weight;
    return marker;
  });
  cueMarkers.push({
    progress: 1,
    start: timeline[timeline.length - 1].start
  });
  const lyricWeights = lines.map((line) => getTimingAlignmentWeight(line));
  const lyricTotalWeight = lyricWeights.reduce((sum, weight) => sum + weight, 0) || lines.length;
  let lyricWeightCursor = 0;

  return lines.map((line, index) => {
    const progress = lyricWeightCursor / lyricTotalWeight;
    lyricWeightCursor += lyricWeights[index];
    const upperIndex = cueMarkers.findIndex((marker) => marker.progress >= progress);

    if (upperIndex <= 0) {
      return cueMarkers[0].start;
    }

    if (upperIndex === -1) {
      return cueMarkers[cueMarkers.length - 1].start;
    }

    const lowerMarker = cueMarkers[upperIndex - 1];
    const upperMarker = cueMarkers[upperIndex];
    const span = Math.max(0.0001, upperMarker.progress - lowerMarker.progress);
    const fraction = Math.max(0, Math.min(1, (progress - lowerMarker.progress) / span));

    return lowerMarker.start + (upperMarker.start - lowerMarker.start) * fraction;
  });
}

function buildTimedLines(lines = [], starts = [], endBoundary = 0) {
  return lines.map((text, index) => {
    const start = Math.max(0, Number(starts[index] || 0));
    const nextStart =
      index < starts.length - 1 ? Number(starts[index + 1]) : Number(endBoundary || start + 4);

    return {
      text,
      start,
      duration: Math.max(1.2, nextStart - start)
    };
  });
}

function buildDescriptionLyricsPayload(metadata = {}, captionCues = [], fallbackSong = null) {
  const descriptionLines = extractLyricsFromDescription(metadata?.description || "");

  if (descriptionLines.length < 6) {
    return null;
  }

  const starts = captionCues.length
    ? alignStartsToCaptions(descriptionLines, captionCues, metadata?.durationSeconds)
    : estimateLyricStartsFromDuration(descriptionLines, metadata?.durationSeconds);
  const finalCue = Array.isArray(captionCues) ? captionCues.at(-1) : null;
  const endBoundary =
    Number(metadata?.durationSeconds || 0) ||
    (finalCue ? Number(finalCue.start || 0) + Number(finalCue.duration || 0) : 0) ||
    starts.at(-1) + 4;

  return {
    song: fallbackSong,
    source: "youtube-description",
    syncMode: captionCues.length ? "caption-aligned" : "estimated",
    lines: buildTimedLines(descriptionLines, starts, endBoundary)
  };
}

function buildCaptionFallbackPayload(captionCues = [], durationSeconds = 0, fallbackSong = null) {
  const readableCaptionCues = (Array.isArray(captionCues) ? captionCues : [])
    .map((cue) => ({
      text: normalizeWhitespace(cue?.text || ""),
      start: Number(cue?.start || 0),
      duration: Math.max(0.8, Number(cue?.duration || 0))
    }))
    .filter((cue) => cue.text);

  if (!readableCaptionCues.length) {
    return null;
  }

  const finalCue = readableCaptionCues.at(-1);
  const endBoundary =
    Number(durationSeconds || 0) || (finalCue ? finalCue.start + finalCue.duration : 0);

  return {
    song: fallbackSong,
    source: "youtube-captions",
    syncMode: "captions",
    lines: buildTimedLines(
      readableCaptionCues.map((cue) => cue.text),
      readableCaptionCues.map((cue) => cue.start),
      endBoundary
    )
  };
}

function getLyricPreviewMetrics(lines = [], durationSeconds = 0) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const meaningfulCount = safeLines.filter((line) => {
    const words = normalizeWhitespace(line?.text || "").split(/\s+/).filter(Boolean);
    return words.length >= 2;
  }).length;
  const coveredSeconds = safeLines.reduce(
    (sum, line) => sum + Math.max(0.8, Math.min(4.5, Number(line?.duration || 0))),
    0
  );
  const effectiveDuration = Math.max(12, Number(durationSeconds || 0));

  return {
    lineCount: safeLines.length,
    meaningfulCount,
    coverageRatio: effectiveDuration > 0 ? coveredSeconds / effectiveDuration : 0
  };
}

function hasUsablePreviewLyrics(lines = [], durationSeconds = 0) {
  const metrics = getLyricPreviewMetrics(lines, durationSeconds);

  if (!metrics.lineCount) {
    return false;
  }

  if (metrics.lineCount >= 8) {
    return true;
  }

  if (metrics.meaningfulCount >= 4 && metrics.coverageRatio >= 0.08) {
    return true;
  }

  return false;
}

function shouldUseAudioFallbackForPreview(metadata = {}, lyricResult = {}, options = {}) {
  if (options.hasFastDescriptionLyrics) {
    return false;
  }

  const metrics = getLyricPreviewMetrics(lyricResult?.lines, metadata?.durationSeconds);

  if (!metrics.lineCount) {
    return true;
  }

  if (lyricResult?.syncMode === "synced-lyrics") {
    return false;
  }

  if (lyricResult?.syncMode === "captions") {
    return metrics.meaningfulCount < Math.max(5, Math.round(Number(metadata?.durationSeconds || 0) / 45))
      || metrics.coverageRatio < 0.2;
  }

  if (lyricResult?.syncMode === "caption-aligned" || lyricResult?.syncMode === "estimated") {
    return metrics.meaningfulCount < 4 || metrics.coverageRatio < 0.16;
  }

  return false;
}

async function safeRemoveDirectory(targetPath) {
  if (!targetPath) {
    return;
  }

  try {
    await fsp.rm(targetPath, { recursive: true, force: true });
  } catch {}
}

async function recordAdaptiveSignalSafely(payload = {}) {
  try {
    await recordAdaptiveSignal(payload);
  } catch {}
}

async function buildPreviewLyrics(metadata, videoId, captionCues = []) {
  const fallbackSong = inferSongFromVideo(metadata.title, metadata.channelTitle);
  const descriptionSong = inferSongFromDescriptionCredits(metadata.description, fallbackSong);
  const adaptiveProfile = await getAdaptiveProfile({
    channelTitle: metadata.channelTitle,
    title: metadata.title
  });
  const captionSummary = selectCaptionCuesForLyrics(captionCues, adaptiveProfile);
  const safeCaptionCues = captionSummary.usableCues;
  let lyricResult = await withTimeout(
    buildLyricsPayload({
      rawTitle: metadata.title,
      channelTitle: metadata.channelTitle,
      durationSeconds: metadata.durationSeconds,
      captionCues: safeCaptionCues
    }),
    6000,
    {
      song: fallbackSong,
      source: "unavailable",
      syncMode: "none",
      lines: []
    }
  );

  if (!lyricResult?.lines?.length && descriptionSong?.title && descriptionSong.title !== fallbackSong.title) {
    lyricResult = await withTimeout(
      buildLyricsPayload({
        rawTitle: descriptionSong.artist
          ? `${descriptionSong.artist} - ${descriptionSong.title}`
          : descriptionSong.title,
        channelTitle: metadata.channelTitle,
        durationSeconds: metadata.durationSeconds,
        captionCues: safeCaptionCues
      }),
      6000,
      lyricResult
    );
  }

  if (!lyricResult?.lines?.length) {
    const recoveryCaptionCues =
      safeCaptionCues.length > 0 ? safeCaptionCues : captionSummary.readableCues;
    const lyricRecovery = await withTimeout(
      buildLyricsPayload({
        rawTitle: descriptionSong?.artist
          ? `${descriptionSong.artist} - ${descriptionSong.title || metadata.title}`
          : descriptionSong?.title || metadata.title,
        channelTitle: metadata.channelTitle,
        durationSeconds: metadata.durationSeconds,
        captionCues: recoveryCaptionCues
      }),
      12000,
      lyricResult
    );

    if (lyricRecovery?.lines?.length) {
      lyricResult = lyricRecovery;
    }
  }

  const warnings = [];

  if (adaptiveProfile.knownLyricsRisk) {
    warnings.push(
      "Adaptive safety mode is active for this channel, so the app is using stricter lyric checks before rendering."
    );
  }

  if (captionSummary.hasWeakCaptions) {
    await recordAdaptiveSignalSafely({
      channelTitle: metadata.channelTitle,
      title: metadata.title,
      category: "foreign_caption_noise",
      message: `Ignored noisy captions for preview (${captionSummary.readableCount}/${captionSummary.total} readable cues).`
    });
    warnings.push(
      "Noisy YouTube captions were ignored, so the app will rely on web lyrics or audio transcription instead."
    );
  }

  const romanizedInitialLyrics = romanizeLyricResultIfNeeded(lyricResult);
  lyricResult = romanizedInitialLyrics.lyricResult;

  if (romanizedInitialLyrics.changed) {
    warnings.push("Telugu lyrics were converted into English letters for the website preview.");
  }

  const descriptionLyrics = adaptiveProfile.avoidDescriptionLyrics
    ? null
    : buildDescriptionLyricsPayload(
        metadata,
        safeCaptionCues,
        lyricResult?.song || fallbackSong
      );

  if (descriptionLyrics) {
    const romanizedDescriptionLyrics = romanizeLyricResultIfNeeded(descriptionLyrics);
    lyricResult = romanizedDescriptionLyrics.lyricResult;
    warnings.push("Lyrics were pulled from the YouTube description for a faster website preview.");

    if (romanizedDescriptionLyrics.changed) {
      warnings.push("Telugu lyrics were converted into English letters for the website preview.");
    }

    return { lyricResult, warnings };
  }

  const shouldRomanize = shouldRomanizeTeluguLyrics(metadata, lyricResult);
  const shouldUseAudioFallback = shouldUseAudioFallbackForPreview(metadata, lyricResult, {
    hasFastDescriptionLyrics: Boolean(descriptionLyrics)
  });

  if (!shouldUseAudioFallback) {
    return { lyricResult, warnings };
  }

  const scratchDirectory = path.join(
    convertCacheRoot,
    `${videoId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  try {
    const previewTranscription = await transcribeYouTubeAudio(
      videoId,
      scratchDirectory,
      metadata.durationSeconds,
      {
        preview: !adaptiveProfile.preferStrongerPreviewTranscription,
        timeoutMs: adaptiveProfile.preferStrongerPreviewTranscription ? 120000 : 30000,
        downloadTimeoutMs: adaptiveProfile.preferStrongerPreviewTranscription ? 90000 : 45000,
        ...(adaptiveProfile.preferStrongerPreviewTranscription
          ? {
              modelName: process.env.WHISPER_ADAPTIVE_MODEL || process.env.WHISPER_MODEL || "base",
              beamSize: 6,
              conditionOnPreviousText: true
            }
          : {}),
        ...(shouldRomanize
          ? {
              task: "transcribe",
              language: "te"
            }
          : {})
      }
    );

    const previewLines = Array.isArray(previewTranscription?.lines) ? previewTranscription.lines : [];
    const previewAssessment = assessAudioFallbackLyrics(previewLines, metadata.durationSeconds);
    let effectiveLines = previewAssessment.lines;
    let effectiveSource = shouldRomanize ? "audio-romanized" : previewTranscription?.source;

    if (!previewAssessment.usable) {
      const strongerTranscription = await transcribeYouTubeAudio(
        videoId,
        scratchDirectory,
        metadata.durationSeconds,
        {
          timeoutMs: 120000,
          downloadTimeoutMs: 90000,
          modelName: process.env.WHISPER_MODEL || "base",
          ...(shouldRomanize
            ? {
                task: "transcribe",
                language: "te"
              }
            : {})
        }
      );

      const strongerLines = Array.isArray(strongerTranscription?.lines) ? strongerTranscription.lines : [];
      const strongerAssessment = assessAudioFallbackLyrics(strongerLines, metadata.durationSeconds);

      if (strongerAssessment.usable) {
        effectiveLines = strongerAssessment.lines;
        effectiveSource = shouldRomanize ? "audio-romanized" : strongerTranscription.source;
        warnings.push("The quick lyric pass was too weak, so the website regenerated lyrics from the audio with a deeper pass.");
      } else {
        effectiveLines = [];
        warnings.push(
          `Audio transcription fallback was rejected because ${strongerAssessment.reason}.`
        );
      }
    }

    if (Array.isArray(effectiveLines) && effectiveLines.length) {
      const romanizedTranscription = romanizeLyricLines(effectiveLines);
      lyricResult = {
        song: lyricResult?.song || fallbackSong,
        source: effectiveSource,
        syncMode: "transcribed",
        lines: romanizedTranscription.lines
      };
      warnings.push(
        shouldRomanize
          ? "Telugu song audio was transcribed and shown in English letters for the website preview."
          : "No reliable lyric sheet was found online, so the website generated timed lyrics from the audio."
      );
    } else if (!previewAssessment.usable) {
      await recordAdaptiveSignalSafely({
        channelTitle: metadata.channelTitle,
        title: metadata.title,
        category: "lyrics_unavailable",
        message: `Rejected audio fallback preview because ${previewAssessment.reason}.`
      });
    }
  } catch (error) {
    if (/timed out|timeout/i.test(`${error.message || ""}`)) {
      await recordAdaptiveSignalSafely({
        channelTitle: metadata.channelTitle,
        title: metadata.title,
        category: "transcription_timeout",
        message: error.message
      });
    }

    warnings.push(
      shouldRomanize
        ? `Telugu lyric romanization from audio was unavailable: ${error.message}`
        : `Audio transcription fallback was unavailable: ${error.message}`
    );
  } finally {
    await safeRemoveDirectory(scratchDirectory);
  }

  if (!lyricResult?.lines?.length) {
    const captionFallback = buildCaptionFallbackPayload(
      captionSummary.readableCues,
      metadata.durationSeconds,
      lyricResult?.song || descriptionSong || fallbackSong
    );

    if (captionFallback?.lines?.length) {
      lyricResult = captionFallback;
      warnings.push(
        captionSummary.hasWeakCaptions
          ? "Web lyrics were unavailable, so the website fell back to YouTube captions as a last-resort preview."
          : "The website fell back to YouTube captions because stronger lyric sources were unavailable."
      );
    }
  }

  if (!lyricResult?.lines?.length) {
    await recordAdaptiveSignalSafely({
      channelTitle: metadata.channelTitle,
      title: metadata.title,
      category: "lyrics_unavailable",
      message: "No usable preview lyrics were available after lyric search, caption filtering, and audio fallback."
    });
  }

  return { lyricResult, warnings };
}

async function buildUploadedAudioPreview(audioFileUpload, options = {}) {
  if (!audioFileUpload?.path) {
    throw createError("Upload an audio file to start an audio-only project.", 400);
  }

  const requestedTitle = normalizeWhitespace(options.title || "");
  const fallbackTitle = normalizeWhitespace(
    `${audioFileUpload.originalname || ""}`.replace(/\.[a-z0-9]{1,8}$/i, "")
  );
  const title = requestedTitle || fallbackTitle || "Uploaded audio";
  const projectId = slugifyProjectId(title) || `uploaded-audio-${Date.now()}`;
  const guessedSong = inferSongFromVideo(title, "Uploaded audio");
  const warnings = [
    "This project started from uploaded audio, so the website is building lyrics directly from your file instead of from a YouTube link."
  ];
  const scratchDirectory = path.join(
    convertCacheRoot,
    `upload-preview-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  let effectiveDurationSeconds = Math.max(0, Number(options.durationSeconds || 0));
  let lyricResult = {
    song: guessedSong,
    source: "uploaded-audio",
    syncMode: "transcribed",
    lines: []
  };

  try {
    const previewTranscription = await transcribeYouTubeAudio(
      `upload-${projectId}`,
      scratchDirectory,
      effectiveDurationSeconds,
      {
        preview: true,
        timeoutMs: 90000,
        audioInputPath: audioFileUpload.path
      }
    );

    effectiveDurationSeconds =
      Number(previewTranscription?.audioDurationSeconds || 0) || effectiveDurationSeconds;

    const previewLines = Array.isArray(previewTranscription?.lines) ? previewTranscription.lines : [];
    const previewAssessment = assessAudioFallbackLyrics(previewLines, effectiveDurationSeconds);
    let effectiveLines = previewAssessment.lines.length ? previewAssessment.lines : previewLines;
    let effectiveSource = previewTranscription?.source || "audio-transcription";

    if (!previewAssessment.usable) {
      const strongerTranscription = await transcribeYouTubeAudio(
        `upload-${projectId}`,
        scratchDirectory,
        effectiveDurationSeconds,
        {
          timeoutMs: 180000,
          modelName: process.env.WHISPER_MODEL || "base",
          audioInputPath: audioFileUpload.path
        }
      );
      const strongerLines = Array.isArray(strongerTranscription?.lines)
        ? strongerTranscription.lines
        : [];
      const strongerAssessment = assessAudioFallbackLyrics(strongerLines, effectiveDurationSeconds);

      if (strongerAssessment.lines.length) {
        effectiveLines = strongerAssessment.lines;
        effectiveSource = strongerTranscription?.source || effectiveSource;
      }

      if (strongerAssessment.usable) {
        warnings.push(
          "The first pass on the uploaded audio was light, so the website regenerated the lyrics with a deeper audio pass."
        );
      } else if (effectiveLines.length) {
        warnings.push(
          "The uploaded audio transcript is still a rough draft, so the website is showing the best lines it could recover before the final render does a stricter sync pass."
        );
      } else {
        warnings.push(
          "The uploaded audio is ready, but the preview transcript was too light to show yet. The final render will still try a deeper transcription from the same file."
        );
      }
    } else {
      warnings.push("Timed lyrics were generated directly from the uploaded audio.");
    }

    if (effectiveLines.length) {
      const romanized = romanizeLyricLines(effectiveLines);
      lyricResult = {
        song: guessedSong,
        source: "audio-transcription",
        syncMode: "transcribed",
        lines: romanized.lines
      };

      if (romanized.changed) {
        warnings.push("Telugu lyrics were converted into English letters for the website preview.");
      }
    }
  } catch (error) {
    warnings.push(
      "The uploaded audio is ready, but lyric preview generation needs a second pass. The final render will still build lyrics from this file."
    );
  } finally {
    await safeRemoveDirectory(scratchDirectory);
  }

  return {
    sourceType: "uploaded-audio",
    projectId,
    inputUrl: "",
    videoId: `upload-${projectId}`,
    title,
    channelTitle: "Uploaded audio",
    description: "This project was started from an uploaded audio file.",
    durationSeconds: effectiveDurationSeconds,
    thumbnails: [],
    poster: "",
    audioUrl: "",
    audioPreviewBlocked: false,
    audioAccess: {
      mode: "available",
      previewAvailable: false,
      badgeLabel: "Audio uploaded",
      title: "Uploaded audio is ready",
      summary:
        "This project can build lyrics and the final video directly from your uploaded audio file. A YouTube link is optional for this path.",
      primaryActionLabel: "Create lyric video",
      recommendedAction: "render"
    },
    audioMimeType: audioFileUpload.mimetype || "audio/mpeg",
    song: lyricResult.song || guessedSong,
    lyricsSource: lyricResult.source || "uploaded-audio",
    syncMode: lyricResult.syncMode || "transcribed",
    lines: Array.isArray(lyricResult.lines) ? lyricResult.lines : [],
    warnings
  };
}

function parseRenderRequestBody(req) {
  if (typeof req.body?.renderPayload !== "string") {
    return req.body || {};
  }

  try {
    return JSON.parse(req.body.renderPayload);
  } catch {
    throw createError("The render payload could not be read.", 400);
  }
}

async function runCommand(command, args, options = {}) {
  const { cwd, timeoutMs = 0 } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timer = null;

    function finishError(error) {
      if (settled) {
        return;
      }

      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      reject(error);
    }

    function finishSuccess() {
      if (settled) {
        return;
      }

      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      resolve({ stdout, stderr });
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill();
        finishError(new Error(`Command timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
    }

    child.on("error", finishError);
    child.on("close", (code) => {
      if (code === 0) {
        finishSuccess();
        return;
      }

      finishError(new Error(stderr || stdout || `Command failed with exit code ${code}.`));
    });
  });
}

async function sampleVideoFrames(videoId, durationSeconds = 0) {
  async function buildArtworkFallbackFrames() {
    try {
      const info = await getVideoInfo(videoId);
      const metadata = await getVideoMetadata(videoId, info);
      const candidates = [
        ...(Array.isArray(metadata?.thumbnails) ? metadata.thumbnails.map((thumbnail) => thumbnail?.url) : []),
        metadata?.poster || ""
      ]
        .map((entry) => normalizeWhitespace(entry || ""))
        .filter(Boolean);

      return candidates.filter((entry, index, list) => list.indexOf(entry) === index).slice(0, 4);
    } catch {
      return [];
    }
  }

  const requestedDuration = Math.max(0, Number(durationSeconds || 0));

  if (requestedDuration <= 0) {
    return buildArtworkFallbackFrames();
  }

  let videoUrl = "";

  try {
    videoUrl = await resolveVideoUrl(videoId);
  } catch {
    return buildArtworkFallbackFrames();
  }

  const tempDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), `song-to-lyrics-${videoId}-`));
  const samplingDuration = Math.max(12, requestedDuration);
  const frameCount = 4;
  const startPadding = Math.min(6, Math.max(1.2, samplingDuration * 0.08));
  const endPadding = Math.min(8, Math.max(1.8, samplingDuration * 0.12));
  const usableDuration = Math.max(1, samplingDuration - startPadding - endPadding);
  const frames = [];

  try {
    for (let index = 0; index < frameCount; index += 1) {
      const timestamp =
        frameCount === 1
          ? startPadding
          : startPadding + (usableDuration * index) / Math.max(1, frameCount - 1);
      const outputPath = path.join(tempDirectory, `frame-${index + 1}.jpg`);

      await runCommand(
        ffmpegPath,
        [
          "-y",
          "-ss",
          timestamp.toFixed(2),
          "-i",
          videoUrl,
          "-frames:v",
          "1",
          "-vf",
          "scale=480:-2",
          "-q:v",
          "6",
          outputPath
        ],
        {
          timeoutMs: 25000
        }
      );

      const buffer = await fsp.readFile(outputPath);
      frames.push(`data:image/jpeg;base64,${buffer.toString("base64")}`);
    }
  } catch {
    return buildArtworkFallbackFrames();
  } finally {
    await fsp.rm(tempDirectory, { recursive: true, force: true }).catch(() => {});
  }

  return frames;
}

async function withTimeout(promise, timeoutMs, fallbackValue) {
  let timer;

  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

app.get("/api/health", (req, res) => {
  applyLocalDebugCors(req, res);
  res.json({
    ok: true,
    ready: Boolean(startupDiagnostics.ready),
    transcriptionReady: Boolean(startupDiagnostics.transcriptionReady),
    runtimeRoot,
    now: new Date().toISOString()
  });
});

app.options(
  ["/api/health", "/api/local-debug/errors", "/api/local-debug/stream", "/api/local-debug/errors/:id"],
  (req, res) => {
    applyLocalDebugCors(req, res);
    res.status(204).end();
  }
);

app.get("/api/readiness", (req, res) => {
  const payload = {
    ok: Boolean(startupDiagnostics.ready),
    checkedAt: startupDiagnostics.checkedAt,
    renderReady: Boolean(startupDiagnostics.renderReady),
    transcriptionReady: Boolean(startupDiagnostics.transcriptionReady),
    checks: startupDiagnostics.checks
  };

  res.status(payload.ok ? 200 : 503).json(payload);
});

app.get("/api/local-debug/errors", (req, res) => {
  if (!isLocalDebugRequest(req)) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  applyLocalDebugCors(req, res);
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json({
    enabled: true,
    entries: getLocalDebugEvents()
  });
});

app.get("/api/local-debug/stream", (req, res) => {
  if (!isLocalDebugRequest(req)) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  applyLocalDebugCors(req, res);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const send = (eventName, payload = {}) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send("ready", {
    ok: true,
    entryCount: getLocalDebugEvents().length,
    updatedAt: new Date().toISOString()
  });

  const unsubscribe = subscribeLocalDebugEvents((payload) => {
    send("update", payload);
  });
  const heartbeat = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

app.post(
  "/api/local-debug/errors",
  asyncHandler(async (req, res) => {
    if (!isLocalDebugRequest(req)) {
      throw createError("Not found.", 404);
    }

    applyLocalDebugCors(req, res);
    const payload = req.body || {};
    const entry = recordLocalDebugEvent({
      source: normalizeWhitespace(payload.source || "client"),
      title: normalizeWhitespace(payload.title || "Client error"),
      userMessage: normalizeWhitespace(payload.userMessage || ""),
      errorMessage: normalizeWhitespace(payload.errorMessage || ""),
      cause: normalizeWhitespace(payload.cause || ""),
      stack: `${payload.stack || ""}`.trim(),
      details: {
        ...buildRequestDebugContext(req),
        client: payload.details || {}
      }
    });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.status(201).json({
      ok: true,
      entry
    });
  })
);

app.delete("/api/local-debug/errors", (req, res) => {
  if (!isLocalDebugRequest(req)) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  applyLocalDebugCors(req, res);
  clearLocalDebugEvents();
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.json({ ok: true });
});

app.delete("/api/local-debug/errors/:id", (req, res) => {
  if (!isLocalDebugRequest(req)) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  applyLocalDebugCors(req, res);
  const deleted = deleteLocalDebugEvent(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: "That debug error could not be found." });
    return;
  }

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.json({ ok: true });
});

app.get(
  "/api/video-frames/:videoId",
  asyncHandler(async (req, res) => {
    const videoId = extractVideoId(req.params.videoId || "");

    if (!videoId) {
      throw createError("A valid video id is required.", 400);
    }

    const frames = await sampleVideoFrames(videoId, Number(req.query.duration || 0));
    res.json({ frames });
  })
);

app.post(
  "/api/convert-audio",
  renderUpload.fields([{ name: "audioFile", maxCount: 1 }]),
  asyncHandler(async (req, res) => {
    const audioFileUpload = Array.isArray(req.files?.audioFile) ? req.files.audioFile[0] : null;

    if (!audioFileUpload) {
      throw createError("Upload an audio file to start an audio-only project.", 400);
    }

    const payload = await buildUploadedAudioPreview(audioFileUpload, {
      title: `${req.body?.title || ""}`.trim(),
      durationSeconds: Number(req.body?.durationSeconds || 0)
    });

    res.json(payload);
  })
);

app.post(
  "/api/convert",
  asyncHandler(async (req, res) => {
    const videoUrl = `${req.body?.url || req.body?.inputUrl || ""}`.trim();

    if (!videoUrl) {
      throw createError("Enter a YouTube video link to begin.", 400);
    }

    const videoId = extractVideoId(videoUrl);
    const info = await getVideoInfo(videoId);
    const metadata = await getVideoMetadata(videoId, info);
    const captionCues = await getCaptionCues(info);
    const { lyricResult, warnings: previewWarnings } = await buildPreviewLyrics(
      metadata,
      videoId,
      captionCues
    );
    const audioPreviewProbe = await withTimeout(
      resolveAudioInput(videoId, {
        outputDirectory: path.join(previewAudioCacheRoot, `${videoId}-probe`),
        allowDownloadFallback: false
      })
        .then((source) => ({ blocked: false, timedOut: false, source }))
        .catch((error) => ({
          blocked: true,
          timedOut: false,
          reason:
            error?.code === "YOUTUBE_BOT_BLOCK" || isYouTubeBotBlockError(error)
              ? "youtube-blocked"
              : "preview-unavailable"
        })),
      5000,
      { blocked: true, timedOut: true, reason: "probe-timeout" }
    );
    const audioPreviewBlocked = Boolean(audioPreviewProbe?.blocked);
    const audioAccess = buildAudioAccessState({
      audioPreviewBlocked,
      audioPreviewProbe
    });

    if (!audioPreviewBlocked && audioPreviewProbe?.source) {
      warmPreviewAudioCache(videoId, audioPreviewProbe.source);
    }

    queuePreviewWarmup(videoId);

    res.json({
      inputUrl: videoUrl,
      videoId,
      title: metadata.title,
      channelTitle: metadata.channelTitle,
      description: metadata.description,
      durationSeconds: metadata.durationSeconds,
      thumbnails: metadata.thumbnails,
      poster: metadata.poster,
      audioUrl: audioPreviewBlocked ? "" : `/api/audio/${videoId}`,
      audioPreviewBlocked,
      audioAccess,
      audioMimeType: "audio/mp4",
      song: lyricResult.song,
      lyricsSource: lyricResult.source,
      syncMode: lyricResult.syncMode,
      lines: lyricResult.lines,
      warnings: [
        ...buildWarnings(lyricResult),
        ...previewWarnings,
        ...(audioAccess.mode === "recovery"
          ? [audioAccess.summary]
          : audioAccess.mode === "upload-recommended"
            ? [audioAccess.summary]
            : []),
        ...(audioPreviewProbe?.timedOut
          ? [
              "Audio preview safety check timed out, so the website is staying conservative and not auto-loading the player for this link."
            ]
          : []),
        "The final render will verify lyric timing against the audio before export and will stop if the sync is not trustworthy.",
        ...(shouldRomanizeTeluguLyrics(metadata, lyricResult)
          ? ["Telugu lyrics were detected. The render step will keep Telugu audio and show the lyrics in English letters when needed."]
          : [])
      ]
    });
  })
);

app.post(
  "/api/render",
  renderUpload.fields([
    { name: "backgroundVideo", maxCount: 1 },
    { name: "audioFile", maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const body = parseRenderRequestBody(req);
    const inputUrl = `${body?.inputUrl || ""}`.trim();
    const backgroundVideoUpload = Array.isArray(req.files?.backgroundVideo) ? req.files.backgroundVideo[0] : null;
    const audioFileUpload = Array.isArray(req.files?.audioFile) ? req.files.audioFile[0] : null;
    const hasUploadedAudio = Boolean(audioFileUpload);
    const uploadedAudioTitle = `${audioFileUpload?.originalname || ""}`.replace(/\.[a-z0-9]{1,8}$/i, "").trim();

    if (!inputUrl && !hasUploadedAudio) {
      throw createError("A YouTube link or uploaded audio file is required before rendering.", 400);
    }

    let renderSong = body?.song || null;
    let renderLines = Array.isArray(body?.lines) ? body.lines : [];
    const renderTitle = `${body?.title || ""}`.trim() || uploadedAudioTitle || "Uploaded audio";
    const renderChannelTitle = `${body?.channelTitle || ""}`.trim() || (hasUploadedAudio ? "Uploaded audio" : "");
    const renderVideoId = `${body?.videoId || ""}`.trim() || (hasUploadedAudio ? `upload-${Date.now()}` : "");
    const renderDurationSeconds = Number(
      body?.durationSeconds || body?.customAudioUpload?.duration || 0
    );

    if (!renderSong && hasUploadedAudio) {
      renderSong = {
        title: renderTitle,
        artist: "Uploaded audio"
      };
    }

    if (!renderLines.length && renderTitle) {
      const lyricRetry = await withTimeout(
        buildLyricsPayload({
          rawTitle: renderTitle,
          channelTitle: renderChannelTitle,
          durationSeconds: renderDurationSeconds,
          captionCues: []
        }),
        12000,
        null
      );

      if (lyricRetry?.lines?.length) {
        renderLines = lyricRetry.lines;
        renderSong = lyricRetry.song;
      }
    }

    const renderJob = await startRenderJob({
      inputUrl,
      videoId: renderVideoId,
      title: renderTitle,
      channelTitle: renderChannelTitle,
      durationSeconds: renderDurationSeconds,
      lines: renderLines,
      song: renderSong,
      syncMode: body?.syncMode || (hasUploadedAudio ? "transcribed" : "none"),
      poster: body?.poster || "",
      thumbnails: Array.isArray(body?.thumbnails) ? body.thumbnails : [],
      customBackgrounds: Array.isArray(body?.customBackgrounds) ? body.customBackgrounds : [],
      customBackgroundVideo: backgroundVideoUpload
        ? {
            tempPath: backgroundVideoUpload.path,
            originalName: backgroundVideoUpload.originalname,
            mimeType: backgroundVideoUpload.mimetype,
            size: backgroundVideoUpload.size,
            width: Number(body?.customBackgroundVideo?.width || 0),
            height: Number(body?.customBackgroundVideo?.height || 0),
            duration: Number(body?.customBackgroundVideo?.duration || 0)
          }
        : null,
      customAudioUpload: audioFileUpload
        ? {
            tempPath: audioFileUpload.path,
            originalName: audioFileUpload.originalname,
            mimeType: audioFileUpload.mimetype,
            size: audioFileUpload.size,
            duration: Number(body?.customAudioUpload?.duration || 0)
          }
        : null,
      outputFormat: body?.outputFormat || "auto",
      renderMode: body?.renderMode === "fast" ? "fast" : "standard",
      lyricStyle: `${body?.lyricStyle || "auto"}`,
      lyricFont: `${body?.lyricFont || "arial"}`,
      clientViewport:
        body?.clientViewport &&
        typeof body.clientViewport === "object" &&
        !Array.isArray(body.clientViewport)
          ? {
              width: Number(body.clientViewport.width || 0),
              height: Number(body.clientViewport.height || 0),
              devicePixelRatio: Number(body.clientViewport.devicePixelRatio || 1)
            }
          : null,
      clientIsMobile: Boolean(body?.clientIsMobile),
      useStyleColor: Boolean(body?.useStyleColor),
      styleColor: `${body?.styleColor || "#7fe8ff"}`,
      neonGlow: Number(body?.neonGlow || 70),
      requireVerifiedSync: true
    });

    res.status(202).json(renderJob);
  })
);

app.get(
  "/api/render/:jobId",
  asyncHandler(async (req, res) => {
    const job = getRenderJob(req.params.jobId);

    if (!job) {
      throw createError("That render job could not be found.", 404);
    }

    res.json(job);
  })
);

app.get(
  "/api/render/:jobId/file",
  asyncHandler(async (req, res) => {
    const job = getRenderJobFile(req.params.jobId);

    if (!job) {
      throw createError("That render job could not be found.", 404);
    }

    if (job.status !== "completed" || !job.outputVideoPath) {
      throw createError("That lyric video is not ready yet.", 409);
    }

    res.sendFile(job.outputVideoPath);
  })
);

app.get(
  "/api/render/:jobId/download",
  asyncHandler(async (req, res) => {
    const job = getRenderJobFile(req.params.jobId);

    if (!job) {
      throw createError("That render job could not be found.", 404);
    }

    if (job.status !== "completed" || !job.outputVideoPath) {
      throw createError("That lyric video is not ready yet.", 409);
    }

    const downloadName = `${job.id}.mp4`;
    res.download(job.outputVideoPath, downloadName);
  })
);

app.get(
  "/api/audio/:videoId",
  asyncHandler(async (req, res) => {
    const videoId = extractVideoId(req.params.videoId);
    const outputDirectory = path.join(previewAudioCacheRoot, videoId);

    if (await sendCachedPreviewAudio(res, videoId, outputDirectory)) {
      return;
    }

    const activeWarmup = previewWarmups.get(videoId);

    if (activeWarmup) {
      await Promise.race([
        activeWarmup.catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 20000))
      ]);

      if (await sendCachedPreviewAudio(res, videoId, outputDirectory)) {
        return;
      }
    }

    let audioSource;

    try {
      audioSource = await resolveAudioInput(videoId, {
        outputDirectory,
        allowDownloadFallback: true,
        preferLocal: true
      });
    } catch (localPreviewError) {
      try {
        const recoveredAudioUrl = await resolveAudioUrlDeep(videoId);
        audioSource = {
          input: recoveredAudioUrl,
          sourceType: "remote",
          mimeType: "audio/mp4",
          recovered: true
        };
      } catch {
        audioSource = await resolveAudioInput(videoId, {
          outputDirectory,
          allowDownloadFallback: false
        });
      }
    }
    res.setHeader("Cache-Control", "no-store");

    if (audioSource.sourceType === "file") {
      res.type(audioSource.mimeType || "audio/mpeg");
      res.sendFile(audioSource.input);
      return;
    }

    try {
      const cachedPreviewPath = await cacheRemoteAudioUrlToFile(
        audioSource.input,
        outputDirectory,
        videoId
      );

        if (cachedPreviewPath) {
          res.type(getAudioMimeType(cachedPreviewPath) || audioSource.mimeType || "audio/mpeg");
          res.sendFile(cachedPreviewPath);
          return;
        }
      } catch {}

      if (await sendCachedPreviewAudio(res, videoId, outputDirectory, audioSource.mimeType || "audio/mpeg")) {
        return;
      }

      await proxyRemoteMedia(req, res, audioSource.input, audioSource.mimeType || "audio/mpeg");
    })
  );

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    recordLocalDebugEvent({
      source: "api",
      title: "Upload validation failed",
      userMessage:
        error.code === "LIMIT_FILE_SIZE"
          ? "The uploaded media is too large. Try a smaller file."
          : "The uploaded background media could not be processed.",
      errorMessage: error.message || error.code || "Multer error",
      cause: error.code || "",
      stack: error.stack || "",
      details: buildRequestDebugContext(req)
    });
    res.status(400).json({
      error:
        error.code === "LIMIT_FILE_SIZE"
          ? "The uploaded media is too large. Try a smaller file."
          : "The uploaded background media could not be processed."
    });
    return;
  }

  const requestWasAborted = /request aborted/i.test(`${error?.message || ""}`);
  const statusCode = Number(error.statusCode || (requestWasAborted ? 499 : 500));
  const message = buildApiErrorMessage(error, req);

  if (!shouldSkipLocalDebugApiEvent(req, error, statusCode)) {
    recordLocalDebugEvent({
      source: "api",
      title: `${req.method || "REQUEST"} ${req.originalUrl || req.url || ""}`,
      userMessage: message,
      errorMessage: error?.message || "",
      cause:
        normalizeWhitespace(`${error?.cause?.message || error?.code || error?.statusCode || ""}`) ||
        normalizeWhitespace(`${error?.cause || ""}`),
      stack: error?.stack || "",
      details: buildRequestDebugContext(req)
    });
  }

  if (res.headersSent) {
    next(error);
    return;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: message
  });
});

async function startServer() {
  await ensureRuntimeDirectories();
  await initializeRenderJobs();
  startupDiagnostics = await getRuntimeDiagnostics();

  if (!startupDiagnostics.ready) {
    console.warn("Startup readiness checks found missing required dependencies.");
  }

  const server = app.listen(port, host, () => {
    console.log(`Song to Lyrics is running on http://${host}:${port}`);
  });

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the other server or change PORT.`);
      process.exit(1);
    }

    console.error(error);
    process.exit(1);
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`Received ${signal}. Shutting down Song to Lyrics...`);

    await new Promise((resolve) => {
      server.close(() => resolve());
      setTimeout(resolve, 10000);
    });

    process.exit(0);
  }

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      console.error(error);
      process.exit(1);
    });
  });

  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      console.error(error);
      process.exit(1);
    });
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
