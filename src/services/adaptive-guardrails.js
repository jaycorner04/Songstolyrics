const path = require("path");
const fsp = require("fs/promises");
const { cacheRoot } = require("../config/runtime");

const MEMORY_PATH = path.join(cacheRoot, "adaptive-guardrails.json");
const KNOWN_LABEL_PATTERNS = /\b(saregama|t-series|sony music|zee music|aditya music|lahari|tips|think music|sun music|mango music|mythri|music south)\b/i;

let memoryCache = null;
let memoryLoadPromise = null;
let memoryWritePromise = Promise.resolve();

function createEmptyMemory() {
  return {
    version: 1,
    updatedAt: "",
    channels: {}
  };
}

function normalizeSignature(value = "") {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function limitList(values = [], maxItems = 8) {
  return values.slice(-maxItems);
}

async function loadAdaptiveMemory() {
  if (memoryCache) {
    return memoryCache;
  }

  if (!memoryLoadPromise) {
    memoryLoadPromise = (async () => {
      try {
        const raw = await fsp.readFile(MEMORY_PATH, "utf8");
        const parsed = JSON.parse(raw);
        memoryCache = {
          ...createEmptyMemory(),
          ...parsed,
          channels: parsed?.channels && typeof parsed.channels === "object" ? parsed.channels : {}
        };
      } catch {
        memoryCache = createEmptyMemory();
      }

      return memoryCache;
    })();
  }

  return memoryLoadPromise;
}

async function persistAdaptiveMemory(memory) {
  memory.updatedAt = new Date().toISOString();

  await fsp.mkdir(path.dirname(MEMORY_PATH), { recursive: true });
  memoryWritePromise = memoryWritePromise
    .catch(() => {})
    .then(() => fsp.writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2), "utf8"))
    .catch(() => {});
  await memoryWritePromise;
}

function ensureChannelRecord(memory, channelTitle = "") {
  const key = normalizeSignature(channelTitle) || "__generic__";

  if (!memory.channels[key]) {
    memory.channels[key] = {
      channelTitle: normalizeWhitespace(channelTitle) || "Unknown Channel",
      signals: {},
      titles: [],
      lastMessages: {},
      successCount: 0,
      failureCount: 0,
      updatedAt: ""
    };
  }

  return {
    key,
    record: memory.channels[key]
  };
}

function classifyAdaptiveFailure(errorMessage = "", notes = []) {
  const message = `${errorMessage || ""} ${(Array.isArray(notes) ? notes : []).join(" ")}`.toLowerCase();
  const categories = [];

  if (!message) {
    return categories;
  }

  if (/credit|singer\s*:|lyricist\s*:|programmed by|recording engineers?|song credits?/i.test(message)) {
    categories.push("description_credit_lyrics");
  }

  if (/foreign speech|music and singing|music\]|perfect gift|carva|carvaan|mini/i.test(message)) {
    categories.push("foreign_caption_noise");
  }

  if (/noisy captions?|weak captions?|ignored .*captions?/i.test(message)) {
    categories.push("foreign_caption_noise");
  }

  if (/too sparse across the song|transcript covered too little|too few lyric lines matched|too sparse to trust|could not verify that the lyrics match/i.test(message)) {
    categories.push("sparse_transcript", "sync_rejected");
  }

  if (/timed out|timeout/i.test(message)) {
    categories.push("transcription_timeout");
  }

  if (/youtube_bot_block|blocked audio access|not a bot|cookie file on the server|temporarily blocked audio access/i.test(message)) {
    categories.push("youtube_bot_block");
  }

  if (/no lyrics|lyrics unavailable|no usable lyric|no verified lyric lines|no lyric lines were available/i.test(message)) {
    categories.push("lyrics_unavailable");
  }

  return [...new Set(categories)];
}

async function recordAdaptiveSignal({
  channelTitle = "",
  title = "",
  category = "",
  message = ""
} = {}) {
  const normalizedCategory = normalizeSignature(category).replace(/-/g, "_");

  if (!normalizedCategory) {
    return;
  }

  const memory = await loadAdaptiveMemory();
  const { record } = ensureChannelRecord(memory, channelTitle);

  record.signals[normalizedCategory] = Number(record.signals[normalizedCategory] || 0) + 1;
  record.updatedAt = new Date().toISOString();
  record.titles = limitList([
    ...record.titles.filter((item) => item !== normalizeWhitespace(title)),
    normalizeWhitespace(title)
  ].filter(Boolean));

  if (message) {
    record.lastMessages[normalizedCategory] = normalizeWhitespace(message).slice(0, 240);
  }

  await persistAdaptiveMemory(memory);
}

async function recordRenderOutcome({
  channelTitle = "",
  title = "",
  status = "",
  error = "",
  notes = []
} = {}) {
  const memory = await loadAdaptiveMemory();
  const { record } = ensureChannelRecord(memory, channelTitle);
  const normalizedTitle = normalizeWhitespace(title);

  if (normalizedTitle) {
    record.titles = limitList([
      ...record.titles.filter((item) => item !== normalizedTitle),
      normalizedTitle
    ]);
  }

  if (`${status || ""}`.toLowerCase() === "completed") {
    record.successCount = Number(record.successCount || 0) + 1;
    record.updatedAt = new Date().toISOString();
    await persistAdaptiveMemory(memory);
    return;
  }

  record.failureCount = Number(record.failureCount || 0) + 1;
  record.updatedAt = new Date().toISOString();

  const categories = classifyAdaptiveFailure(error, notes);

  categories.forEach((category) => {
    record.signals[category] = Number(record.signals[category] || 0) + 1;
    if (error) {
      record.lastMessages[category] = normalizeWhitespace(error).slice(0, 240);
    }
  });

  await persistAdaptiveMemory(memory);
}

function getAdaptiveFlags(record = {}, channelTitle = "") {
  const signals = record?.signals || {};
  const isKnownLabelChannel = KNOWN_LABEL_PATTERNS.test(channelTitle || "");

  return {
    channelKnown: Boolean(record && Object.keys(record).length),
    isKnownLabelChannel,
    avoidDescriptionLyrics:
      isKnownLabelChannel ||
      Number(signals.description_credit_lyrics || 0) >= 1,
    rejectWeakCaptions:
      Number(signals.foreign_caption_noise || 0) >= 1 ||
      isKnownLabelChannel,
    preferStrongerPreviewTranscription:
      Number(signals.transcription_timeout || 0) >= 1 ||
      Number(signals.sparse_transcript || 0) >= 1 ||
      Number(signals.sync_rejected || 0) >= 2,
    preferStrongerFinalTranscription:
      Number(signals.transcription_timeout || 0) >= 1 ||
      Number(signals.sparse_transcript || 0) >= 1 ||
      Number(signals.sync_rejected || 0) >= 1,
    preferKnownAudioBlockRecovery:
      Number(signals.youtube_bot_block || 0) >= 1,
    knownLyricsRisk:
      Number(signals.lyrics_unavailable || 0) >= 1 ||
      Number(signals.sync_rejected || 0) >= 1
  };
}

async function getAdaptiveProfile({ channelTitle = "", title = "" } = {}) {
  const memory = await loadAdaptiveMemory();
  const key = normalizeSignature(channelTitle) || "__generic__";
  const record = memory.channels[key] || {};

  return {
    channelKey: key,
    channelTitle: normalizeWhitespace(channelTitle),
    title: normalizeWhitespace(title),
    signals: record?.signals || {},
    lastMessages: record?.lastMessages || {},
    successCount: Number(record?.successCount || 0),
    failureCount: Number(record?.failureCount || 0),
    ...getAdaptiveFlags(record, channelTitle)
  };
}

module.exports = {
  getAdaptiveProfile,
  recordAdaptiveSignal,
  recordRenderOutcome
};
