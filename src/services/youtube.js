const { spawn } = require("child_process");
const { buildYtDlpArgs } = require("./ytdlp");

let YoutubeTranscript = null;

try {
  ({ YoutubeTranscript } = require("@danielxceron/youtube-transcript"));
} catch (error) {
  YoutubeTranscript = null;
}

const WATCH_TIMEOUT_MS = 8000;
const CAPTION_TIMEOUT_MS = 9000;
const YTDLP_CAPTION_TIMEOUT_MS = 20000;
const TRANSIENT_PROCESS_ERROR_REGEX = /\b(eperm|eacces|ebusy|emfile|enfile)\b/i;
const COMMAND_RETRY_DELAYS_MS = [250, 800];
const MAX_CAPTION_LINE_LENGTH = 68;
const MAX_CAPTION_LINE_DURATION = 6.2;
const captionCueCache = new Map();

function createError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function extractVideoId(input) {
  const value = `${input || ""}`.trim();

  if (!value) {
    throw createError("Please provide a YouTube link.", 400);
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();
    url.searchParams.delete("si");

    if (hostname === "youtu.be") {
      const shortId = url.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(shortId)) {
        return shortId;
      }
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com"
    ) {
      const queryId = url.searchParams.get("v");
      if (/^[a-zA-Z0-9_-]{11}$/.test(queryId || "")) {
        return queryId;
      }

      const pathMatch = url.pathname.match(/\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})(?:[/?]|$)/);
      if (pathMatch) {
        return pathMatch[1];
      }
    }
  } catch (error) {
    throw createError("That does not look like a valid YouTube URL.", 400);
  }

  throw createError("Could not extract a YouTube video ID from that link.", 400);
}

async function fetchJsonWithTimeout(url, timeoutMs = WATCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextWithTimeout(url, timeoutMs = WATCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return "";
    }

    return response.text();
  } catch (error) {
    return "";
  } finally {
    clearTimeout(timer);
  }
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

async function retryAsync(factory, attempts = 2) {
  let lastResult = null;

  for (let index = 0; index < attempts; index += 1) {
    lastResult = await factory();

    if (lastResult) {
      return lastResult;
    }
  }

  return lastResult;
}

function parseIsoDuration(isoDuration = "") {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);

  if (!match) {
    return 0;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function normalizeThumbnails(videoId, primaryUrl = "") {
  const candidates = [
    primaryUrl,
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`
  ].filter(Boolean);

  const unique = [];
  const seen = new Set();

  for (const url of candidates) {
    if (seen.has(url)) {
      continue;
    }

    seen.add(url);
    unique.push({
      url,
      width: 0,
      height: 0
    });
  }

  return unique;
}

function parseHtmlValue(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : "";
}

function decodeHtmlEntities(text = "") {
  return text
    .replace(/\\u0026/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function normalizeTranscriptText(value = "") {
  return normalizeWhitespace(
    `${value || ""}`
      .replace(/^>>\s*/g, "")
      .replace(/^\[[^\]]+\]\s*/g, "")
      .replace(/[\u266A\u266B]+/g, "")
  );
}

function tokenizeCaptionText(value = "") {
  return normalizeTranscriptText(value)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function looksLikeNoisyCaptionTextLegacy(value = "") {
  const normalized = normalizeTranscriptText(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  if (
    /^(foreign speech|speech|music(?: and singing)?|singing|applause|cheering|laugh(?:s|ing)?|instrumental)$/i.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /\b(perfect gift|carva(?:an)?(?: mini)?|subscribe|download now|available on|official trailer)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  const words = tokenizeCaptionText(normalized);
  const meaningfulWords = words.filter((word) => /[\p{L}]{2,}/u.test(word));

  if (!meaningfulWords.length) {
    return true;
  }

  if (meaningfulWords.length >= 4) {
    const normalizedWords = meaningfulWords
      .map((word) => word.toLowerCase().replace(/[^\p{L}\p{N}'’-]+/gu, ""))
      .filter(Boolean);
    const uniqueCount = new Set(normalizedWords).size;

    if (uniqueCount <= Math.ceil(normalizedWords.length * 0.4)) {
      return true;
    }
  }

  const cleanedLength = normalized.replace(/[^\p{L}\p{N}\s'’-]+/gu, "").length;
  const contentRatio = cleanedLength / Math.max(normalized.length, 1);

  if (contentRatio < 0.55) {
    return true;
  }

  return false;
}

function looksLikeNoisyCaptionTextClean(value = "") {
  const normalized = normalizeTranscriptText(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  if (
    /^(foreign speech|speech|music(?: and singing)?|singing|applause|cheering|laugh(?:s|ing)?|instrumental)$/i.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /\b(perfect gift|carva(?:an)?(?: mini)?|subscribe|download now|available on|official trailer)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  const words = tokenizeCaptionText(normalized);
  const meaningfulWords = words.filter((word) => /[\p{L}]{2,}/u.test(word));

  if (!meaningfulWords.length) {
    return true;
  }

  if (meaningfulWords.length >= 4) {
    const normalizedWords = meaningfulWords
      .map((word) => word.toLowerCase().replace(/[^\p{L}\p{N}'\u2019-]+/gu, ""))
      .filter(Boolean);
    const uniqueCount = new Set(normalizedWords).size;

    if (uniqueCount <= Math.ceil(normalizedWords.length * 0.4)) {
      return true;
    }
  }

  const cleanedLength = normalized.replace(/[^\p{L}\p{N}\s'\u2019-]+/gu, "").length;
  const contentRatio = cleanedLength / Math.max(normalized.length, 1);

  if (contentRatio < 0.55) {
    return true;
  }

  return false;
}

function looksLikeNoisyCaptionText(value = "") {
  const normalized = normalizeTranscriptText(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  if (
    /^(foreign speech|speech|music(?: and singing)?|singing|applause|cheering|laugh(?:s|ing)?|instrumental)$/i.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /\b(perfect gift|carva(?:an)?(?: mini)?|subscribe|download now|available on|official trailer)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  const words = tokenizeCaptionText(normalized);
  const meaningfulWords = words.filter((word) => /[\p{L}]{2,}/u.test(word));

  if (!meaningfulWords.length) {
    return true;
  }

  if (meaningfulWords.length >= 4) {
    const normalizedWords = meaningfulWords
      .map((word) => word.toLowerCase().replace(/[^\p{L}\p{N}'’-]+/gu, ""))
      .filter(Boolean);
    const uniqueCount = new Set(normalizedWords).size;

    if (uniqueCount <= Math.ceil(normalizedWords.length * 0.4)) {
      return true;
    }
  }

  const cleanedLength = normalized.replace(/[^\p{L}\p{N}\s'’-]+/gu, "").length;
  const contentRatio = cleanedLength / Math.max(normalized.length, 1);

  if (contentRatio < 0.55) {
    return true;
  }

  return false;
}

function compactCaptionRows(rows = []) {
  const normalizedRows = rows
    .map((row) => {
      const rawStart = Number(row?.offset ?? row?.start ?? 0);
      const rawDuration = Number(row?.duration ?? 0);
      const start = Math.max(0, rawStart > 1000 ? rawStart / 1000 : rawStart);
      const duration = rawDuration > 1000 ? rawDuration / 1000 : rawDuration;

      return {
        text: normalizeTranscriptText(row?.text || ""),
        start,
        duration: Math.max(0.8, duration || 0)
      };
    })
    .filter((row) => row.text)
    .sort((left, right) => left.start - right.start);

  if (!normalizedRows.length) {
    return [];
  }

  const mergedRows = [];
  let currentRow = { ...normalizedRows[0] };

  for (let index = 1; index < normalizedRows.length; index += 1) {
    const nextRow = normalizedRows[index];
    const currentEnd = currentRow.start + currentRow.duration;
    const nextEnd = nextRow.start + nextRow.duration;
    const gap = nextRow.start - currentEnd;
    const combinedText = normalizeWhitespace(`${currentRow.text} ${nextRow.text}`);
    const combinedDuration = nextEnd - currentRow.start;
    const currentLooksFinished = /[.!?]$/.test(currentRow.text);

    if (
      gap <= 0.9 &&
      combinedText.length <= MAX_CAPTION_LINE_LENGTH &&
      combinedDuration <= MAX_CAPTION_LINE_DURATION &&
      !currentLooksFinished
    ) {
      currentRow.text = combinedText;
      currentRow.duration = Math.max(currentRow.duration, combinedDuration);
      continue;
    }

    mergedRows.push(currentRow);
    currentRow = { ...nextRow };
  }

  mergedRows.push(currentRow);
  return mergedRows;
}

function extractAvailableLanguages(message = "") {
  const match = `${message || ""}`.match(/Available languages:\s*(.+)$/i);

  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean);
}

function toVideoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

async function runCommand(command, args, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || COMMAND_RETRY_DELAYS_MS.length + 1));
  const shouldRetry = (error) => {
    const message = `${error?.message || error || ""}`;
    const code = `${error?.code || ""}`;
    return TRANSIENT_PROCESS_ERROR_REGEX.test(message) || TRANSIENT_PROCESS_ERROR_REGEX.test(code);
  };

  const runOnce = () =>
    new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        windowsHide: true,
        ...options
      });
      let stdout = "";
      let stderr = "";
      let finished = false;

      const timer = setTimeout(() => {
        if (!finished) {
          child.kill("SIGKILL");
          reject(new Error(`${command} timed out.`));
        }
      }, Number(options.timeout || YTDLP_CAPTION_TIMEOUT_MS));

      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timer);
        finished = true;
        reject(error);
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        finished = true;

        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(new Error(stderr || stdout || `${command} exited with code ${code}.`));
      });
    });

  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    try {
      return await runOnce();
    } catch (error) {
      lastError = error;
      attempt += 1;

      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = COMMAND_RETRY_DELAYS_MS[Math.min(attempt - 1, COMMAND_RETRY_DELAYS_MS.length - 1)] || 900;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error(`${command} failed.`);
}

function mergeCaptionIntervals(intervals = [], bridgeGapSeconds = 0.85) {
  const sorted = (Array.isArray(intervals) ? intervals : [])
    .map((interval) => ({
      start: Math.max(0, Number(interval?.start || 0)),
      end: Math.max(Number(interval?.start || 0) + 0.05, Number(interval?.end || 0))
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start);

  if (!sorted.length) {
    return [];
  }

  const merged = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = merged[merged.length - 1];

    if (current.start <= previous.end + bridgeGapSeconds) {
      previous.end = Math.max(previous.end, current.end);
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

function getCaptionCueMetrics(cues = [], durationSeconds = 0) {
  const normalized = compactCaptionRows(cues)
    .map((cue) => ({
      text: normalizeTranscriptText(cue?.text || ""),
      start: Math.max(0, Number(cue?.start || 0)),
      duration: Math.max(0.2, Number(cue?.duration || 0))
    }))
    .filter((cue) => cue.text);
  const intervals = mergeCaptionIntervals(
    normalized.map((cue) => ({
      start: cue.start,
      end: cue.start + cue.duration
    }))
  );
  const lastEnd = intervals.length ? intervals[intervals.length - 1].end : 0;
  const firstStart = intervals.length ? intervals[0].start : 0;
  const coveredSeconds = intervals.reduce(
    (sum, interval) => sum + Math.max(0, interval.end - interval.start),
    0
  );
  const effectiveDuration = Math.max(Number(durationSeconds || 0), lastEnd, 20);
  const maxGapSeconds = intervals.slice(1).reduce((largestGap, interval, index) => {
    const previous = intervals[index];
    return Math.max(largestGap, Math.max(0, interval.start - previous.end));
  }, 0);

  return {
    cues: normalized,
    cueCount: normalized.length,
    firstStart,
    lastEnd,
    coveredSeconds,
    coverageRatio: effectiveDuration > 0 ? coveredSeconds / effectiveDuration : 0,
    maxGapSeconds
  };
}

function hasUsableCaptionTiming(cues = [], durationSeconds = 0) {
  const metrics = getCaptionCueMetrics(cues, durationSeconds);
  const effectiveDuration = Math.max(Number(durationSeconds || 0), metrics.lastEnd, 20);
  const minimumCueCount = Math.max(6, Math.min(20, Math.round(effectiveDuration / 18)));

  if (metrics.cueCount < minimumCueCount) {
    return false;
  }

  if (metrics.lastEnd < Math.max(18, effectiveDuration * 0.45)) {
    return false;
  }

  if (metrics.coverageRatio < (effectiveDuration >= 150 ? 0.15 : 0.18)) {
    return false;
  }

  if (metrics.maxGapSeconds > Math.max(22, effectiveDuration * 0.2)) {
    return false;
  }

  return true;
}

function getCaptionTextReadability(cues = []) {
  const normalizedTexts = compactCaptionRows(cues)
    .map((cue) => normalizeTranscriptText(cue?.text || ""))
    .filter(Boolean);
  const meaningfulTexts = normalizedTexts.filter(
    (text) =>
      text.split(/\s+/).filter(Boolean).length >= 2 &&
      !looksLikeNoisyCaptionTextClean(text)
  );

  if (!normalizedTexts.length || !meaningfulTexts.length) {
    return false;
  }

  const frequencies = new Map();

  meaningfulTexts.forEach((text) => {
    const key = text.toLowerCase();
    frequencies.set(key, Number(frequencies.get(key) || 0) + 1);
  });

  const uniqueRatio = frequencies.size / meaningfulTexts.length;
  const mostRepeatedCount = Math.max(...frequencies.values());
  const repetitionRatio = mostRepeatedCount / meaningfulTexts.length;
  const noisyCount = normalizedTexts.filter((text) => looksLikeNoisyCaptionTextClean(text)).length;
  const noisyRatio = noisyCount / normalizedTexts.length;

  return (
    meaningfulTexts.length >= 6 &&
    uniqueRatio >= 0.4 &&
    repetitionRatio <= 0.3 &&
    noisyRatio <= 0.34
  );
}

function markCaptionCuesReadable(cues = []) {
  return cues.map((cue) => ({
    ...cue,
    readableText: !looksLikeNoisyCaptionTextClean(cue?.text || "")
  }));
}

function getCaptionCuePreferenceScore(cues = [], durationSeconds = 0) {
  const metrics = getCaptionCueMetrics(cues, durationSeconds);
  const readableCueCount = (Array.isArray(cues) ? cues : []).filter(
    (cue) => normalizeTranscriptText(cue?.text || "") && cue?.readableText !== false
  ).length;
  const readableRatio = metrics.cueCount > 0 ? readableCueCount / metrics.cueCount : 0;
  let score = metrics.cueCount * 0.03 + readableCueCount * 0.09 + readableRatio;

  if (hasUsableCaptionTiming(cues, durationSeconds)) {
    score += 4;
  }

  if (getCaptionTextReadability(cues)) {
    score += 3;
  }

  score += Math.min(metrics.coverageRatio, 1.2);
  score -= Math.max(0, metrics.maxGapSeconds - 18) * 0.015;

  return score;
}

function getLanguagePriority(language = "") {
  const normalizedLanguage = `${language || ""}`.toLowerCase();
  const priorityOrder = [
    "en",
    "en-us",
    "en-gb",
    "en-in",
    "te",
    "ta",
    "hi",
    "ml",
    "kn",
    "bn"
  ];
  const exactIndex = priorityOrder.indexOf(normalizedLanguage);

  if (exactIndex !== -1) {
    return exactIndex;
  }

  if (normalizedLanguage.startsWith("en")) {
    return 1;
  }

  if (normalizedLanguage.startsWith("te")) {
    return 4;
  }

  if (normalizedLanguage.startsWith("ta")) {
    return 5;
  }

  if (normalizedLanguage.startsWith("hi")) {
    return 6;
  }

  return priorityOrder.length + 5;
}

function buildCaptionTrackCandidates(payload = {}) {
  const buckets = [
    {
      tracks: payload?.subtitles || {},
      bucketScore: 0
    },
    {
      tracks: payload?.automatic_captions || {},
      bucketScore: 100
    }
  ];
  const candidates = [];

  buckets.forEach((bucket) => {
    Object.entries(bucket.tracks || {}).forEach(([language, formats]) => {
      const availableFormats = Array.isArray(formats) ? formats : [];
      const preferredFormat =
        availableFormats.find((entry) => entry?.ext === "json3" && entry?.url) ||
        availableFormats.find((entry) => entry?.ext === "vtt" && entry?.url);

      if (!preferredFormat?.url) {
        return;
      }

      candidates.push({
        language,
        ext: preferredFormat.ext,
        url: preferredFormat.url,
        score:
          bucket.bucketScore +
          getLanguagePriority(language) * 5 +
          (preferredFormat.ext === "json3" ? 0 : 1)
      });
    });
  });

  return candidates.sort((left, right) => left.score - right.score);
}

function parseJson3CaptionPayload(payload = {}) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const rows = events
    .map((event, index) => {
      const text = normalizeTranscriptText(
        (Array.isArray(event?.segs) ? event.segs : [])
          .map((segment) => segment?.utf8 || "")
          .join("")
          .replace(/\n+/g, " ")
      );
      const start = Math.max(0, Number(event?.tStartMs || 0) / 1000);
      const nextStart = Number(events[index + 1]?.tStartMs || 0) / 1000;
      const durationMs = Number(event?.dDurationMs || 0);
      const duration = durationMs > 0
        ? durationMs / 1000
        : nextStart > start
          ? nextStart - start
          : 2;

      return {
        text,
        start,
        duration: Math.max(0.2, duration)
      };
    })
    .filter((row) => row.text);

  return compactCaptionRows(rows);
}

function parseVttTimestamp(value = "") {
  const match = `${value || ""}`.trim().match(/(?:(\d+):)?(\d+):(\d+)(?:[.,](\d+))?/);

  if (!match) {
    return 0;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const fraction = Number((match[4] || "0").padEnd(3, "0").slice(0, 3));

  return hours * 3600 + minutes * 60 + seconds + fraction / 1000;
}

function parseVttCaptionPayload(payload = "") {
  const blocks = `${payload || ""}`
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const rows = [];

  blocks.forEach((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timingLine = lines.find((line) => line.includes("-->"));

    if (!timingLine) {
      return;
    }

    const [rawStart, rawEnd] = timingLine.split("-->");
    const start = parseVttTimestamp(rawStart);
    const end = parseVttTimestamp((rawEnd || "").split(/\s+/)[0]);
    const textLines = lines
      .slice(lines.indexOf(timingLine) + 1)
      .map((line) => normalizeTranscriptText(line.replace(/<[^>]+>/g, " ")))
      .filter(Boolean);

    if (!textLines.length || end <= start) {
      return;
    }

    rows.push({
      text: normalizeWhitespace(textLines.join(" ")),
      start,
      duration: Math.max(0.2, end - start)
    });
  });

  return compactCaptionRows(rows);
}

async function getYtDlpCaptionInfo(videoId) {
  const ytDlpArgs = buildYtDlpArgs({
    kind: "caption",
    fallbackClients: "web,mweb,android"
  });
  const { stdout } = await runCommand(
    "python",
    [
      "-m",
      "yt_dlp",
      ...ytDlpArgs,
      "--dump-single-json",
      "--skip-download",
      "--no-playlist",
      "--no-warnings",
      toVideoUrl(videoId)
    ],
    {
      timeout: YTDLP_CAPTION_TIMEOUT_MS
    }
  );

  return JSON.parse(stdout);
}

async function fetchCaptionTrackCues(track = {}) {
  if (!track?.url) {
    return [];
  }

  if (track.ext === "json3") {
    const payload = await fetchJsonWithTimeout(track.url, CAPTION_TIMEOUT_MS);
    return payload ? parseJson3CaptionPayload(payload) : [];
  }

  if (track.ext === "vtt") {
    const payload = await fetchTextWithTimeout(track.url, CAPTION_TIMEOUT_MS);
    return payload ? parseVttCaptionPayload(payload) : [];
  }

  return [];
}

async function getCaptionCuesFromYtDlp(videoId, durationSeconds = 0) {
  let payload = null;

  try {
    payload = await getYtDlpCaptionInfo(videoId);
  } catch {
    return [];
  }

  const candidates = buildCaptionTrackCandidates(payload);
  let bestFallback = [];
  let bestFallbackScore = -Infinity;

  for (const candidate of candidates) {
    try {
      const cues = await fetchCaptionTrackCues(candidate);

      if (!cues.length) {
        continue;
      }

      const normalizedCues = markCaptionCuesReadable(cues);
      const score = getCaptionCuePreferenceScore(normalizedCues, durationSeconds);

      if (hasUsableCaptionTiming(normalizedCues, durationSeconds)) {
        return normalizedCues;
      }

      if (score > bestFallbackScore) {
        bestFallback = normalizedCues;
        bestFallbackScore = score;
      }
    } catch {
      continue;
    }
  }

  return bestFallback;
}

async function getVideoInfo(videoId) {
  const watchUrl = toVideoUrl(videoId);
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  const [oembed, watchHtml] = await Promise.all([
    retryAsync(() => fetchJsonWithTimeout(oembedUrl), 2),
    retryAsync(() => fetchTextWithTimeout(watchUrl), 2)
  ]);
  const embedHtml = watchHtml ? "" : await retryAsync(() => fetchTextWithTimeout(embedUrl), 1);

  return {
    oembed,
    videoId,
    watchHtml: watchHtml || embedHtml || ""
  };
}

async function getVideoMetadata(videoId, info) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  let apiPayload = null;

  if (apiKey) {
    const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
    endpoint.searchParams.set("part", "snippet,contentDetails");
    endpoint.searchParams.set("id", videoId);
    endpoint.searchParams.set("key", apiKey);
    apiPayload = await fetchJsonWithTimeout(endpoint, WATCH_TIMEOUT_MS);
  }

  const apiItem = apiPayload?.items?.[0];
  const html = info?.watchHtml || "";
  const oembed = info?.oembed || {};
  const title =
    apiItem?.snippet?.title ||
    oembed.title ||
    decodeHtmlEntities(parseHtmlValue(html, /<title>([^<]+)<\/title>/i)).replace(/ - YouTube$/i, "") ||
    `YouTube Video ${videoId}`;
  const channelTitle =
    apiItem?.snippet?.channelTitle ||
    oembed.author_name ||
    decodeHtmlEntities(parseHtmlValue(html, /"ownerChannelName":"([^"]+)"/i)) ||
    "Unknown Channel";
  const description =
    apiItem?.snippet?.description ||
    decodeHtmlEntities(parseHtmlValue(html, /"shortDescription":"([^"]*)"/i)) ||
    "";
  const durationSeconds =
    parseIsoDuration(apiItem?.contentDetails?.duration || "") ||
    Number(parseHtmlValue(html, /"lengthSeconds":"(\d+)"/i) || 0);
  const thumbnails = normalizeThumbnails(
    videoId,
    apiItem?.snippet?.thumbnails?.high?.url || oembed.thumbnail_url || ""
  );

  return {
    title,
    channelTitle,
    description,
    durationSeconds,
    thumbnails,
    poster: thumbnails[0]?.url || ""
  };
}

function getBestAudioFormat() {
  return null;
}

async function getCaptionCues(info) {
  const videoId = typeof info === "string" ? extractVideoId(info) : info?.videoId;
  const durationSeconds =
    Number(info?.durationSeconds || 0) ||
    Number(parseHtmlValue(info?.watchHtml || "", /"lengthSeconds":"(\d+)"/i) || 0);

  if (!videoId) {
    return [];
  }

  if (captionCueCache.has(videoId)) {
    return captionCueCache.get(videoId);
  }

  let bestTranscriptCues = [];
  let bestTranscriptScore = -Infinity;

  if (YoutubeTranscript?.fetchTranscript) {
    const attemptQueue = ["en", "en-US", "en-GB", "en-IN", ""];
    const attemptedLanguages = new Set();

    while (attemptQueue.length) {
      const lang = attemptQueue.shift();
      const languageKey = lang || "__default__";

      if (attemptedLanguages.has(languageKey)) {
        continue;
      }

      attemptedLanguages.add(languageKey);

      try {
        const transcriptRows = await withTimeout(
          lang
            ? YoutubeTranscript.fetchTranscript(videoId, { lang })
            : YoutubeTranscript.fetchTranscript(videoId),
          CAPTION_TIMEOUT_MS,
          []
        );
        const cues = markCaptionCuesReadable(compactCaptionRows(transcriptRows));
        const score = getCaptionCuePreferenceScore(cues, durationSeconds);

        if (hasUsableCaptionTiming(cues, durationSeconds)) {
          captionCueCache.set(videoId, cues);
          return cues;
        }

        if (score > bestTranscriptScore) {
          bestTranscriptCues = cues;
          bestTranscriptScore = score;
        }
      } catch (error) {
        const availableLanguages = extractAvailableLanguages(error?.message || "");
        const fallbackLanguage =
          availableLanguages.find((value) => value.toLowerCase().startsWith("en")) ||
          availableLanguages[0];

        if (fallbackLanguage && !attemptedLanguages.has(fallbackLanguage)) {
          attemptQueue.unshift(fallbackLanguage);
        }
      }
    }
  }

  const ytdlpCues = await getCaptionCuesFromYtDlp(videoId, durationSeconds);
  const ytdlpScore = getCaptionCuePreferenceScore(ytdlpCues, durationSeconds);
  const transcriptScore = getCaptionCuePreferenceScore(bestTranscriptCues, durationSeconds);
  const finalCues =
    hasUsableCaptionTiming(ytdlpCues, durationSeconds) || ytdlpScore > transcriptScore
      ? ytdlpCues
      : bestTranscriptCues;

  captionCueCache.set(videoId, finalCues);
  return finalCues;
}

module.exports = {
  createError,
  extractVideoId,
  getBestAudioFormat,
  getCaptionCues,
  getVideoInfo,
  getVideoMetadata
};
