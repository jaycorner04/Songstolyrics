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
  isYouTubeBotBlockError,
  resolveAudioInput,
  resolveAudioUrl,
  resolveVideoUrl
} = require("./services/audio");
const { getAdaptiveProfile, recordAdaptiveSignal } = require("./services/adaptive-guardrails");
const { getRuntimeDiagnostics } = require("./services/deployment");
const {
  buildLyricsPayload,
  inferSongFromFilename,
  inferSongFromVideo
} = require("./services/lyrics");
const {
  buildRequestDebugContext,
  clearLocalDebugEvents,
  deleteLocalDebugEvent,
  getLocalDebugEvents,
  isLocalDebugRequest,
  recordLocalDebugEvent
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
const publicIndexPath = path.join(publicRoot, "index.html");
let startupDiagnostics = {
  checkedAt: "",
  ready: false,
  renderReady: false,
  transcriptionReady: false,
  checks: {}
};

const renderUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, uploadsRoot);
    },
    filename(req, file, callback) {
      const originalExtension = path.extname(file.originalname || "");
      const fallbackExtension = file.mimetype.includes("webm")
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
    const fieldName = `${file.fieldname || ""}`;
    const mimeType = `${file.mimetype || ""}`;

    if (fieldName === "backgroundVideo") {
      if (!/^video\//i.test(mimeType)) {
        callback(createError("Only video files can be uploaded as a background video.", 400));
        return;
      }

      callback(null, true);
      return;
    }

    if (fieldName === "audioFile" || fieldName === "audioFallback") {
      if (!/^(audio|video)\//i.test(mimeType)) {
        callback(createError("Only audio files can be uploaded as soundtrack audio.", 400));
        return;
      }

      callback(null, true);
      return;
    }

    callback(createError("That upload field is not supported.", 400));
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

async function sendIndexHtml(req, res) {
  const html = await fsp.readFile(publicIndexPath, "utf8");
  const localDebugBaseUrl = `${process.env.LOCAL_DEBUG_BASE_URL || ""}`.trim().replace(/\/+$/g, "");
  const renderedHtml = html
    .replace(/__BUILD_MARKER__/g, buildMarker)
    .replace(/__LOCAL_DEBUG_BASE_URL__/g, localDebugBaseUrl);
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.type("html").send(renderedHtml);
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

  if (error?.code === "YOUTUBE_BOT_BLOCK" || isYouTubeBotBlockError(error)) {
    if (/^\/api\/audio\//i.test(requestPath)) {
      return "Audio preview is blocked for this video on the server right now. Rendering may still work later if server-side YouTube access is available.";
    }

    return "YouTube blocked audio access for this video on the server. Try another link or add a server cookie file.";
  }

  const statusCode = Number(error?.statusCode || 500);
  return statusCode >= 500
    ? "The server could not process that YouTube video right now."
    : error?.message || "Request failed.";
}

function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
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
  const videoUrl = await resolveVideoUrl(videoId);
  const tempDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), `song-to-lyrics-${videoId}-`));
  const requestedDuration = Math.max(12, Number(durationSeconds || 0));
  const frameCount = 4;
  const startPadding = Math.min(6, Math.max(1.2, requestedDuration * 0.08));
  const endPadding = Math.min(8, Math.max(1.8, requestedDuration * 0.12));
  const usableDuration = Math.max(1, requestedDuration - startPadding - endPadding);
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
  res.json({
    ok: true,
    ready: Boolean(startupDiagnostics.ready),
    transcriptionReady: Boolean(startupDiagnostics.transcriptionReady),
    runtimeRoot,
    now: new Date().toISOString()
  });
});

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

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json({
    enabled: true,
    entries: getLocalDebugEvents()
  });
});

app.post(
  "/api/local-debug/errors",
  asyncHandler(async (req, res) => {
    if (!isLocalDebugRequest(req)) {
      throw createError("Not found.", 404);
    }

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

  clearLocalDebugEvents();
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.json({ ok: true });
});

app.delete("/api/local-debug/errors/:id", (req, res) => {
  if (!isLocalDebugRequest(req)) {
    res.status(404).json({ error: "Not found." });
    return;
  }

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
  "/api/convert",
  asyncHandler(async (req, res) => {
    const videoUrl = `${req.body?.url || req.body?.inputUrl || ""}`.trim();
    const shortUrlDetected = /\/shorts\//i.test(videoUrl);

    if (!videoUrl) {
      throw createError("Enter a YouTube video link to begin.", 400);
    }

    const videoId = extractVideoId(videoUrl);
    const info = await getVideoInfo(videoId);
    const metadata = await getVideoMetadata(videoId, info);
    const captionCues = await getCaptionCues(info);
    const { lyricResult, warnings: previewWarnings } = await withTimeout(
      buildPreviewLyrics(
        metadata,
        videoId,
        captionCues
      ),
      shortUrlDetected ? 45000 : 35000,
      {
        lyricResult: {
          song: inferSongFromVideo(metadata.title, metadata.channelTitle),
          source: "unavailable",
          syncMode: "none",
          lines: []
        },
        warnings: ["Preview assembly took too long, so the app returned a faster fallback response."]
      }
    );
    const audioPreviewProbe = await withTimeout(
      resolveAudioUrl(videoId)
        .then(() => ({ blocked: false }))
        .catch((error) => ({
          blocked: Boolean(error?.code === "YOUTUBE_BOT_BLOCK" || isYouTubeBotBlockError(error))
        })),
      2500,
      { blocked: false, timedOut: true }
    );
    const audioPreviewBlocked = Boolean(audioPreviewProbe?.blocked);

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
      audioMimeType: "audio/mp4",
      song: lyricResult.song,
      lyricsSource: lyricResult.source,
      syncMode: lyricResult.syncMode,
      lines: lyricResult.lines,
      warnings: [
        ...buildWarnings(lyricResult),
        ...previewWarnings,
        ...(audioPreviewBlocked
          ? [
              "Audio preview is blocked for this video on the server right now, so the website will avoid auto-loading the player."
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
  "/api/convert-audio",
  renderUpload.single("audioFile"),
  asyncHandler(async (req, res) => {
    const audioFile = req.file;

    if (!audioFile) {
      throw createError("Upload an audio file to begin.", 400);
    }

    const requestedTitle = normalizeWhitespace(req.body?.title || "");
    const originalName = `${audioFile.originalname || requestedTitle || "uploaded-audio"}`;
    const uploadedTitle =
      requestedTitle ||
      normalizeWhitespace(path.parse(originalName).name.replace(/[_-]+/g, " ")) ||
      "Uploaded audio";
    const uploadedSongGuess = inferSongFromFilename(originalName || uploadedTitle);
    const durationFromBody = Math.max(0, Number(req.body?.durationSeconds || 0));
    const fallbackSong = {
      artist: normalizeWhitespace(uploadedSongGuess.artist || "Uploaded audio"),
      title: normalizeWhitespace(uploadedSongGuess.title || uploadedTitle) || uploadedTitle
    };
    const rawLookupTitle = normalizeWhitespace(
      uploadedSongGuess.artist
        ? `${uploadedSongGuess.artist} - ${uploadedSongGuess.title || uploadedTitle}`
        : uploadedSongGuess.title || uploadedTitle
    );
    const videoId = `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const scratchDirectory = path.join(
      convertCacheRoot,
      `${videoId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    const warnings = [];
    let lyricResult = await withTimeout(
      buildLyricsPayload({
        rawTitle: rawLookupTitle,
        channelTitle: "Uploaded audio",
        durationSeconds: durationFromBody,
        captionCues: []
      }),
      12000,
      {
        song: fallbackSong,
        source: "unavailable",
        syncMode: "none",
        lines: []
      }
    );
    let effectiveDurationSeconds = durationFromBody;
    let teluguRomanized = false;

    try {
      if (startupDiagnostics.transcriptionReady) {
        try {
          const transcription = await transcribeYouTubeAudio(
            videoId,
            scratchDirectory,
            durationFromBody,
            {
              audioInputPath: audioFile.path,
              preview: true,
              timeoutMs: 90000,
              downloadTimeoutMs: 15000
            }
          );
          const assessedTranscription = assessAudioFallbackLyrics(
            transcription?.lines,
            transcription?.audioDurationSeconds || durationFromBody
          );

          effectiveDurationSeconds = Number(
            transcription?.audioDurationSeconds || effectiveDurationSeconds || 0
          );

          if (assessedTranscription.usable || assessedTranscription.lines.length >= 2) {
            lyricResult = {
              song: lyricResult?.song || fallbackSong,
              source: "audio-transcription",
              syncMode: "transcribed",
              lines: assessedTranscription.usable
                ? assessedTranscription.lines
                : assessedTranscription.lines
            };

            if (lyricResult?.song?.title && lyricResult.song.title !== fallbackSong.title) {
              warnings.push(
                "A lyric match was found from the uploaded filename, and the preview timing was rebuilt from the uploaded audio."
              );
            }
          } else if (!lyricResult?.lines?.length) {
            warnings.push(
              "The uploaded audio transcript was too sparse for the preview, so the render step may rebuild safer timing directly from the file."
            );
          }
        } catch (error) {
          if (lyricResult?.lines?.length) {
            warnings.push(
              "The filename matched lyrics, but live transcription was unavailable for the preview. The render step can still retry timing from the uploaded audio."
            );
          } else {
            warnings.push(
              "The uploaded audio could not be transcribed for the preview. The render step will retry directly from the file."
            );
          }
        }
      } else if (!lyricResult?.lines?.length) {
        warnings.push(
          "Audio transcription is not ready on the server right now, so the uploaded file could not be fully analyzed for the preview."
        );
      }

      lyricResult = {
        ...lyricResult,
        song: {
          artist: normalizeWhitespace(
            lyricResult?.song?.artist || fallbackSong.artist || "Uploaded audio"
          ),
          title:
            normalizeWhitespace(lyricResult?.song?.title || fallbackSong.title || uploadedTitle) ||
            uploadedTitle
        },
        lines: Array.isArray(lyricResult?.lines) ? lyricResult.lines : []
      };

      if (
        shouldRomanizeTeluguLyrics(
          {
            title: uploadedTitle,
            channelTitle: "Uploaded audio"
          },
          lyricResult
        )
      ) {
        const romanizedResult = romanizeLyricResultIfNeeded(lyricResult);
        lyricResult = romanizedResult.lyricResult;
        teluguRomanized = romanizedResult.changed;
      }

      res.json({
        sourceType: "uploaded-audio",
        inputUrl: "",
        videoId,
        title: uploadedTitle,
        channelTitle: "Uploaded audio",
        description: "This project was started from an uploaded audio file.",
        durationSeconds: Number(effectiveDurationSeconds || durationFromBody || 0),
        thumbnails: [],
        poster: "",
        audioUrl: "",
        audioPreviewBlocked: false,
        audioMimeType: audioFile.mimetype || "audio/mpeg",
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
        song: lyricResult.song,
        lyricsSource: lyricResult.source,
        syncMode: lyricResult.syncMode,
        lines: lyricResult.lines,
        warnings: [
          ...buildWarnings(lyricResult),
          ...warnings,
          ...(teluguRomanized
            ? [
                "Telugu lyrics were detected in the uploaded audio and shown in English letters for easier preview."
              ]
            : []),
          "The final render will use the uploaded audio file directly and can refine lyric timing again before export."
        ]
      });
    } finally {
      try {
        if (audioFile?.path) {
          await fsp.unlink(audioFile.path);
        }
      } catch {}

      try {
        await fsp.rm(scratchDirectory, { recursive: true, force: true });
      } catch {}
    }
  })
);

app.post(
  "/api/render",
  renderUpload.fields([
    { name: "backgroundVideo", maxCount: 1 },
    { name: "audioFile", maxCount: 1 },
    { name: "audioFallback", maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const body = parseRenderRequestBody(req);
    const backgroundVideoFile = Array.isArray(req.files?.backgroundVideo)
      ? req.files.backgroundVideo[0]
      : null;
    const audioFileUpload = Array.isArray(req.files?.audioFile)
      ? req.files.audioFile[0]
      : Array.isArray(req.files?.audioFallback)
        ? req.files.audioFallback[0]
        : null;
    const inputUrl = `${body?.inputUrl || ""}`.trim();

    if (!inputUrl && !audioFileUpload) {
      throw createError("A YouTube link or uploaded audio file is required before rendering.", 400);
    }

    let renderSong = body?.song || null;
    let renderLines = Array.isArray(body?.lines) ? body.lines : [];
    const customAudioUploadMeta =
      body?.customAudioUpload && typeof body.customAudioUpload === "object" && !Array.isArray(body.customAudioUpload)
        ? body.customAudioUpload
        : null;

    if (!renderLines.length && body?.title) {
      const lyricRetry = await withTimeout(
        buildLyricsPayload({
          rawTitle: body.title,
          channelTitle: body?.channelTitle,
          durationSeconds: body?.durationSeconds,
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
      videoId: body?.videoId,
      title: body?.title,
      channelTitle: body?.channelTitle,
      durationSeconds: body?.durationSeconds,
      lines: renderLines,
      song: renderSong,
      syncMode: body?.syncMode || "none",
      poster: body?.poster || "",
      thumbnails: Array.isArray(body?.thumbnails) ? body.thumbnails : [],
      customBackgrounds: Array.isArray(body?.customBackgrounds) ? body.customBackgrounds : [],
      customBackgroundVideo: backgroundVideoFile
        ? {
            tempPath: backgroundVideoFile.path,
            originalName: backgroundVideoFile.originalname,
            mimeType: backgroundVideoFile.mimetype,
            size: backgroundVideoFile.size,
            width: Number(body?.customBackgroundVideo?.width || 0),
            height: Number(body?.customBackgroundVideo?.height || 0),
            duration: Number(body?.customBackgroundVideo?.duration || 0)
          }
        : null,
      customAudioUpload: audioFileUpload
        ? {
            tempPath: audioFileUpload.path,
            originalName: audioFileUpload.originalname,
            name: `${customAudioUploadMeta?.name || audioFileUpload.originalname || "uploaded-audio"}`,
            mimeType: audioFileUpload.mimetype,
            size: audioFileUpload.size,
            duration: Number(customAudioUploadMeta?.duration || 0)
          }
        : customAudioUploadMeta,
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
    const audioSource = await resolveAudioInput(videoId, {
      outputDirectory: path.join(previewAudioCacheRoot, videoId),
      allowDownloadFallback: true
    });
    res.setHeader("Cache-Control", "no-store");

    if (audioSource.sourceType === "file") {
      res.type(audioSource.mimeType || "audio/mpeg");
      res.sendFile(audioSource.input);
      return;
    }

    res.redirect(302, audioSource.input);
  })
);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    recordLocalDebugEvent({
      source: "api",
      title: "Upload validation failed",
      userMessage:
        error.code === "LIMIT_FILE_SIZE"
          ? "The background video is too large. Try a smaller file."
          : "The uploaded background media could not be processed.",
      errorMessage: error.message || error.code || "Multer error",
      cause: error.code || "",
      stack: error.stack || "",
      details: buildRequestDebugContext(req)
    });
    res.status(400).json({
      error:
        error.code === "LIMIT_FILE_SIZE"
          ? "The background video is too large. Try a smaller file."
          : "The uploaded background media could not be processed."
    });
    return;
  }

  const statusCode = Number(error.statusCode || 500);
  const message = buildApiErrorMessage(error, req);

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
