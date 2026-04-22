const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const fsp = require("fs/promises");

const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

const { publicRoot, rendersRoot } = require("../config/runtime");
const { getAdaptiveProfile, recordAdaptiveSignal, recordRenderOutcome } = require("./adaptive-guardrails");
const { resolveAudioInput, resolveVideoUrl } = require("./audio");
const { recordLocalDebugEvent } = require("./local-debug");
const { loadPersistedRenderJobs, persistRenderJob } = require("./render-job-store");
const {
  containsIndicPhoneticScript,
  containsRomanizedTeluguHint,
  containsTeluguScript,
  romanizeLyricLines
} = require("./telugu");
const { transcribeYouTubeAudio } = require("./transcription");
const { extractVideoId } = require("./youtube");

const PUBLIC_FONTS_ROOT = path.join(publicRoot, "fonts");
const VIDEO_SIZE = {
  width: 1280,
  height: 720
};
const MOBILE_VIDEO_SIZE = {
  width: 720,
  height: 1280
};
const BACKGROUND_CANVAS = {
  width: 960,
  height: 540
};
const OUTPUT_FPS = 24;
const MAX_RENDER_ATTEMPTS = 2;
const MIN_RENDER_DURATION_SECONDS = 12;
const MAX_UPLOADED_BACKGROUNDS = 5;
const MIN_LYRIC_DURATION_SECONDS = 1.2;
const MAX_LYRIC_HOLD_SECONDS = 8;
const MAX_SMART_LYRIC_DISPLAY_SECONDS = 8;
const MAX_TRANSCRIBED_GAP_SECONDS = 5.2;
const GAP_FILL_HOLD_SECONDS = 3.6;
const LYRIC_TRANSITION_GAP_SECONDS = 0.04;
const LYRIC_AUDIO_OFFSET_SECONDS = -0.02;
const LYRIC_FADE_MS = 180;
const LYRIC_REVEAL_MS = 220;
const LYRIC_ACCENT_COLORS = ["#d7d7d7", "#8fc8ff", "#f2f2f2", "#c6d0ff"];
const LYRIC_FONT_OPTIONS = {
  arial: {
    key: "arial",
    label: "Arial",
    fontName: "Arial",
    sizeScale: 1,
    spacing: 0.28,
    scaleX: 100,
    scaleY: 100
  },
  "arial-black": {
    key: "arial-black",
    label: "Arial Black",
    fontName: "Arial Black",
    sizeScale: 1.08,
    spacing: 0.12,
    scaleX: 103,
    scaleY: 103
  },
  impact: {
    key: "impact",
    label: "Impact",
    fontName: "Impact",
    sizeScale: 1.1,
    spacing: 0.08,
    scaleX: 89,
    scaleY: 108
  },
  trebuchet: {
    key: "trebuchet",
    label: "Trebuchet MS",
    fontName: "Trebuchet MS",
    sizeScale: 0.99,
    spacing: 0.42,
    scaleX: 101,
    scaleY: 100
  },
  verdana: {
    key: "verdana",
    label: "Verdana",
    fontName: "Verdana",
    sizeScale: 0.96,
    spacing: 0.76,
    scaleX: 98,
    scaleY: 100
  },
  tahoma: {
    key: "tahoma",
    label: "Tahoma",
    fontName: "Tahoma",
    sizeScale: 0.97,
    spacing: 0.32,
    scaleX: 99,
    scaleY: 100
  },
  georgia: {
    key: "georgia",
    label: "Georgia",
    fontName: "Georgia",
    sizeScale: 1.01,
    spacing: 0.58,
    scaleX: 100,
    scaleY: 102
  },
  palatino: {
    key: "palatino",
    label: "Palatino Linotype",
    fontName: "Palatino Linotype",
    sizeScale: 1.03,
    spacing: 0.9,
    scaleX: 102,
    scaleY: 103
  },
  "century-gothic": {
    key: "century-gothic",
    label: "Century Gothic",
    fontName: "Century Gothic",
    sizeScale: 0.98,
    spacing: 1.08,
    scaleX: 96,
    scaleY: 100
  },
  "comic-sans": {
    key: "comic-sans",
    label: "Comic Sans MS",
    fontName: "Comic Sans MS",
    sizeScale: 1.02,
    spacing: 0.64,
    scaleX: 101,
    scaleY: 100
  },
  anton: {
    key: "anton",
    label: "Anton",
    fontName: "Anton",
    sizeScale: 1.12,
    spacing: 0.06,
    scaleX: 88,
    scaleY: 108,
    assetFile: "Anton-Regular.ttf"
  },
  "bebas-neue": {
    key: "bebas-neue",
    label: "Bebas Neue",
    fontName: "Bebas Neue",
    sizeScale: 1.12,
    spacing: 0.12,
    scaleX: 90,
    scaleY: 108,
    assetFile: "BebasNeue-Regular.ttf"
  },
  bangers: {
    key: "bangers",
    label: "Bangers",
    fontName: "Bangers",
    sizeScale: 1.08,
    spacing: 0.2,
    scaleX: 100,
    scaleY: 102,
    assetFile: "Bangers-Regular.ttf"
  },
  "archivo-black": {
    key: "archivo-black",
    label: "Archivo Black",
    fontName: "Archivo Black",
    sizeScale: 1.05,
    spacing: 0.08,
    scaleX: 98,
    scaleY: 104,
    assetFile: "ArchivoBlack-Regular.ttf"
  },
  monoton: {
    key: "monoton",
    label: "Monoton",
    fontName: "Monoton",
    sizeScale: 1.02,
    spacing: 0.86,
    scaleX: 100,
    scaleY: 100,
    assetFile: "Monoton-Regular.ttf"
  },
  "fjalla-one": {
    key: "fjalla-one",
    label: "Fjalla One",
    fontName: "Fjalla One",
    sizeScale: 1.05,
    spacing: 0.1,
    scaleX: 95,
    scaleY: 104,
    assetFile: "FjallaOne-Regular.ttf"
  },
  righteous: {
    key: "righteous",
    label: "Righteous",
    fontName: "Righteous",
    sizeScale: 1.03,
    spacing: 0.28,
    scaleX: 100,
    scaleY: 101,
    assetFile: "Righteous-Regular.ttf"
  },
  oswald: {
    key: "oswald",
    label: "Oswald",
    fontName: "Oswald",
    sizeScale: 1.08,
    spacing: 0.08,
    scaleX: 92,
    scaleY: 105,
    assetFile: "Oswald-wght.ttf"
  },
  sora: {
    key: "sora",
    label: "Sora",
    fontName: "Sora",
    sizeScale: 1,
    spacing: 0.42,
    scaleX: 100,
    scaleY: 100,
    assetFile: "Sora-wght.ttf"
  },
  montserrat: {
    key: "montserrat",
    label: "Montserrat",
    fontName: "Montserrat",
    sizeScale: 1,
    spacing: 0.32,
    scaleX: 98,
    scaleY: 100,
    assetFile: "Montserrat-wght.ttf"
  },
  "rubik-mono-one": {
    key: "rubik-mono-one",
    label: "Rubik Mono One",
    fontName: "Rubik Mono One",
    sizeScale: 0.9,
    spacing: 0.52,
    scaleX: 100,
    scaleY: 100,
    assetFile: "RubikMonoOne-Regular.ttf"
  },
  kanit: {
    key: "kanit",
    label: "Kanit",
    fontName: "Kanit",
    sizeScale: 1,
    spacing: 0.24,
    scaleX: 98,
    scaleY: 100,
    assetFile: "Kanit-Regular.ttf"
  },
  "titillium-web": {
    key: "titillium-web",
    label: "Titillium Web",
    fontName: "Titillium Web",
    sizeScale: 1,
    spacing: 0.3,
    scaleX: 99,
    scaleY: 100,
    assetFile: "TitilliumWeb-Regular.ttf"
  }
};
const LYRIC_STYLE_PRESETS = {
  auto: {
    key: "auto",
    label: "Auto mix",
    fontScale: 1,
    yFactorPortrait: 0.39,
    yFactorLandscape: 0.45,
    wrapPortrait: 15,
    wrapLandscape: 22,
    positionMode: "center",
    forcedAnimation: ""
  },
  comic: {
    key: "comic",
    label: "Comic style",
    fontScale: 1.04,
    yFactorPortrait: 0.4,
    yFactorLandscape: 0.46,
    wrapPortrait: 14,
    wrapLandscape: 20,
    positionMode: "center",
    forcedAnimation: "bounce"
  },
  aa: {
    key: "aa",
    label: "AA",
    fontScale: 1.12,
    yFactorPortrait: 0.59,
    yFactorLandscape: 0.63,
    wrapPortrait: 9,
    wrapLandscape: 12,
    positionMode: "poster-side",
    forcedAnimation: "aa"
  },
  "line-by-line": {
    key: "line-by-line",
    label: "Line by line",
    fontScale: 1,
    yFactorPortrait: 0.39,
    yFactorLandscape: 0.45,
    wrapPortrait: 16,
    wrapLandscape: 24,
    positionMode: "center",
    forcedAnimation: "line-by-line"
  },
  cinematic: {
    key: "cinematic",
    label: "Cinematic",
    fontScale: 1.02,
    yFactorPortrait: 0.37,
    yFactorLandscape: 0.43,
    wrapPortrait: 14,
    wrapLandscape: 22,
    positionMode: "center",
    forcedAnimation: "cinematic"
  },
  bounce: {
    key: "bounce",
    label: "Bounce",
    fontScale: 1.02,
    yFactorPortrait: 0.4,
    yFactorLandscape: 0.46,
    wrapPortrait: 14,
    wrapLandscape: 21,
    positionMode: "center",
    forcedAnimation: "bounce"
  },
  "side-by-side": {
    key: "side-by-side",
    label: "Side by side",
    fontScale: 0.98,
    yFactorPortrait: 0.38,
    yFactorLandscape: 0.44,
    wrapPortrait: 13,
    wrapLandscape: 18,
    positionMode: "side",
    forcedAnimation: "cinematic"
  },
  typewriter: {
    key: "typewriter",
    label: "Typewriter",
    fontScale: 0.98,
    yFactorPortrait: 0.39,
    yFactorLandscape: 0.45,
    wrapPortrait: 15,
    wrapLandscape: 22,
    positionMode: "center",
    forcedAnimation: "word-by-word"
  },
  spotlight: {
    key: "spotlight",
    label: "Spotlight",
    fontScale: 1.06,
    yFactorPortrait: 0.36,
    yFactorLandscape: 0.42,
    wrapPortrait: 14,
    wrapLandscape: 20,
    positionMode: "center",
    forcedAnimation: "cinematic"
  },
  magic: {
    key: "magic",
    label: "Magic",
    fontScale: 0.98,
    yFactorPortrait: 0.5,
    yFactorLandscape: 0.54,
    wrapPortrait: 14,
    wrapLandscape: 20,
    positionMode: "center",
    forcedAnimation: "magic"
  },
  neon: {
    key: "neon",
    label: "Neon glow",
    fontScale: 1.04,
    yFactorPortrait: 0.38,
    yFactorLandscape: 0.44,
    wrapPortrait: 14,
    wrapLandscape: 21,
    positionMode: "center",
    forcedAnimation: "neon"
  },
  glitch: {
    key: "glitch",
    label: "Glitch hit",
    fontScale: 1.03,
    yFactorPortrait: 0.39,
    yFactorLandscape: 0.45,
    wrapPortrait: 14,
    wrapLandscape: 21,
    positionMode: "center",
    forcedAnimation: "glitch"
  },
  karaoke: {
    key: "karaoke",
    label: "Karaoke box",
    fontScale: 1,
    yFactorPortrait: 0.58,
    yFactorLandscape: 0.66,
    wrapPortrait: 16,
    wrapLandscape: 24,
    positionMode: "center",
    forcedAnimation: "karaoke"
  },
  whisper: {
    key: "whisper",
    label: "Whisper",
    fontScale: 0.9,
    yFactorPortrait: 0.42,
    yFactorLandscape: 0.47,
    wrapPortrait: 17,
    wrapLandscape: 24,
    positionMode: "center",
    forcedAnimation: "whisper"
  },
  stacked: {
    key: "stacked",
    label: "Stacked",
    fontScale: 0.96,
    yFactorPortrait: 0.37,
    yFactorLandscape: 0.43,
    wrapPortrait: 14,
    wrapLandscape: 20,
    positionMode: "stacked",
    forcedAnimation: "line-by-line"
  },
  minimal: {
    key: "minimal",
    label: "Minimal",
    fontScale: 0.94,
    yFactorPortrait: 0.39,
    yFactorLandscape: 0.45,
    wrapPortrait: 17,
    wrapLandscape: 26,
    positionMode: "center",
    forcedAnimation: "minimal"
  },
  fulllength: {
    key: "fulllength",
    label: "Fulllength style",
    fontScale: 1.22,
    yFactorPortrait: 0.54,
    yFactorLandscape: 0.53,
    wrapPortrait: 8,
    wrapLandscape: 10,
    positionMode: "poster-side",
    forcedAnimation: "fulllength"
  }
};
const LYRIC_EMOJI_RULES = [
  { pattern: /^(heart|hearts)$/i, emoji: "❤️" },
  { pattern: /^(love|loves|loved|loving)$/i, emoji: "❤️" },
  { pattern: /^(hug|hugs|cuddle|cuddles|cuddels)$/i, emoji: "🤗" },
  { pattern: /^(breakup|breakups|heartbreak|heartbroken)$/i, emoji: "💔" },
  { pattern: /^(lonely|loneliness|alone)$/i, emoji: "😔" },
  { pattern: /^(miss|missing|missin)$/i, emoji: "🤔" },
  { pattern: /^(past|shadow|shadows)$/i, emoji: "👤" },
  { pattern: /^(kiss|kisses|kissed|kissing)$/i, emoji: "💋" },
  { pattern: /^(life|lives|alive)$/i, emoji: "✨" },
  { pattern: /^(dance|dances|danced|dancing|dancer|dancers)$/i, emoji: "💃" },
  { pattern: /^(smile|smiles|smiled|smiling)$/i, emoji: "😊" },
  { pattern: /^(cry|cries|cried|crying|tear|tears)$/i, emoji: "😢" },
  { pattern: /^(dream|dreams|dreaming)$/i, emoji: "💭" },
  { pattern: /^(night|nights|tonight|moonlight)$/i, emoji: "🌙" },
  { pattern: /^(party|parties)$/i, emoji: "🎉" },
  { pattern: /^(music|melody|melodies|song|songs)$/i, emoji: "🎵" },
  { pattern: /^(fire|flame|flames|burn|burns|burning)$/i, emoji: "🔥" },
  { pattern: /^(home|house)$/i, emoji: "🏠" }
];
const COLOR_EMOJI_BASE_URL = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72";
const LYRIC_POSITION_PRESETS = [
  { x: 960, y: 676, driftX: 0 },
  { x: 910, y: 646, driftX: -28 },
  { x: 1010, y: 650, driftX: 24 },
  { x: 960, y: 620, driftX: 0 }
];
const ATMOSPHERE_ORB_SPECS = [
  { key: "pink", color: "#ff5ea8", size: 720, radiusX: 0.34, radiusY: 0.27, blur: 58 },
  { key: "purple", color: "#8b65ff", size: 680, radiusX: 0.31, radiusY: 0.25, blur: 56 },
  { key: "blue", color: "#38d7ff", size: 620, radiusX: 0.3, radiusY: 0.24, blur: 52 },
  { key: "orange", color: "#ffad4f", size: 560, radiusX: 0.28, radiusY: 0.22, blur: 48 }
];
const PANEL_CHANGE_SECONDS = 9;
const COMIC_BG_URLS = [
  "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1588497859490-85d1c17db96d?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1608889335941-32ac5f2041b9?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1543373014-cfe4f4bc1cdf?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1280&h=720&fit=crop"
];
const PANEL_ASSET_SPECS = [
  {
    key: "large",
    sourceIndex: 0,
    width: 840,
    height: 500,
    rotation: "-0.018"
  },
  {
    key: "medium",
    sourceIndex: 3,
    width: 400,
    height: 260,
    rotation: "0.016"
  },
  {
    key: "small",
    sourceIndex: 6,
    width: 290,
    height: 190,
    rotation: "-0.012"
  }
];
const MIN_BACKGROUND_SCENE_COUNT = 5;
const MAX_BACKGROUND_SCENE_COUNT = 10;
const MIN_BACKGROUND_SCENE_SECONDS = 9;
const BACKGROUND_FADE_SECONDS = 0.45;
const BACKGROUND_SCENE_CONCURRENCY = 2;
const PANEL_CAPTURE_COUNT = 8;
const PANEL_CAPTURE_CONCURRENCY = 2;
const PANEL_PROCESS_CONCURRENCY = 4;
const PANEL_CAPTURE_TIMEOUT_MS = 25000;
const PANEL_PROCESS_TIMEOUT_MS = 15000;
const WEB_ART_SCENE_CONCURRENCY = 2;
const WEB_ART_SEARCH_TIMEOUT_MS = 4500;
const WEB_ART_DOWNLOAD_TIMEOUT_MS = 8000;
const TRANSIENT_PROCESS_ERROR_REGEX = /\b(eperm|eacces|ebusy|emfile|enfile)\b/i;
const COMMAND_RETRY_DELAYS_MS = [250, 800];
const LYRIC_PLACEMENT_TIE_THRESHOLD = 6;
const WEB_ART_RESULTS_PER_QUERY = 10;
const WEB_ART_STYLE_TERMS = ["illustration", "comic art", "cartoon art"];
const PANEL_LAYOUTS = [
  { width: 500, height: 320, x: 28, y: 34, rotation: -2.8, phase: 0.15 },
  { width: 380, height: 240, x: 822, y: 34, rotation: 2.2, phase: 0.62 },
  { width: 280, height: 180, x: 504, y: 58, rotation: -1.4, phase: 1.08 },
  { width: 500, height: 320, x: 286, y: 228, rotation: -1.0, phase: 1.55 },
  { width: 380, height: 240, x: 854, y: 202, rotation: -2.1, phase: 2.01 },
  { width: 280, height: 180, x: 130, y: 238, rotation: 1.9, phase: 2.48 },
  { width: 380, height: 240, x: 36, y: 430, rotation: -1.8, phase: 2.94 },
  { width: 280, height: 180, x: 612, y: 118, rotation: 1.6, phase: 3.4 },
  { width: 500, height: 320, x: 692, y: 350, rotation: 2.6, phase: 3.86 },
  { width: 280, height: 180, x: 984, y: 462, rotation: -1.1, phase: 4.32 },
  { width: 380, height: 240, x: 404, y: 474, rotation: -2.4, phase: 4.78 },
  { width: 280, height: 180, x: 204, y: 104, rotation: 1.3, phase: 5.24 }
];
const LYRIC_ANCHORS = [
  { x: 260, y: 180, rotation: -1.8 },
  { x: 900, y: 200, rotation: 1.6 },
  { x: 580, y: 420, rotation: -1.4 },
  { x: 980, y: 500, rotation: 1.8 },
  { x: 200, y: 460, rotation: -1.1 },
  { x: 720, y: 350, rotation: 1.2 }
];
const BACKGROUND_SCENE_TEMPLATES = [
  {
    hero: { x: 176, y: 106, width: 864, height: 486, offset: 0, opacity: 1 },
    supports: [
      { x: 28, y: 40, width: 340, height: 206, offset: -2, opacity: 0.92 },
      { x: 886, y: 48, width: 334, height: 202, offset: -1, opacity: 0.95 },
      { x: 870, y: 420, width: 334, height: 202, offset: 1, opacity: 0.9 },
      { x: 34, y: 444, width: 356, height: 214, offset: 2, opacity: 0.9 }
    ]
  },
  {
    hero: { x: 252, y: 96, width: 856, height: 482, offset: 0, opacity: 1 },
    supports: [
      { x: 44, y: 74, width: 330, height: 198, offset: -2, opacity: 0.92 },
      { x: 58, y: 360, width: 344, height: 208, offset: -1, opacity: 0.9 },
      { x: 876, y: 454, width: 318, height: 192, offset: 1, opacity: 0.88 },
      { x: 440, y: 502, width: 314, height: 184, offset: 2, opacity: 0.84 }
    ]
  },
  {
    hero: { x: 190, y: 138, width: 900, height: 504, offset: 0, opacity: 1 },
    supports: [
      { x: 28, y: 36, width: 326, height: 196, offset: -2, opacity: 0.9 },
      { x: 918, y: 34, width: 320, height: 194, offset: -1, opacity: 0.92 },
      { x: 54, y: 488, width: 336, height: 198, offset: 1, opacity: 0.86 },
      { x: 902, y: 488, width: 322, height: 196, offset: 2, opacity: 0.86 }
    ]
  },
  {
    hero: { x: 292, y: 72, width: 724, height: 412, offset: 0, opacity: 1 },
    supports: [
      { x: 42, y: 56, width: 304, height: 184, offset: -2, opacity: 0.9 },
      { x: 934, y: 62, width: 300, height: 184, offset: -1, opacity: 0.9 },
      { x: 42, y: 316, width: 390, height: 236, offset: 1, opacity: 0.9 },
      { x: 840, y: 306, width: 390, height: 236, offset: 2, opacity: 0.9 }
    ]
  }
];
const SAFE_BACKGROUND_PALETTE = [
  { base: "#0f1726", accent: "#223b63", glow: "#5aa3ff" },
  { base: "#1b1430", accent: "#46306f", glow: "#fd7ef3" },
  { base: "#171b24", accent: "#39465f", glow: "#ffb35c" },
  { base: "#10202a", accent: "#214755", glow: "#6de7ff" },
  { base: "#241321", accent: "#59385f", glow: "#ff8cab" },
  { base: "#15181c", accent: "#384047", glow: "#d2e4ff" }
];
const VIDEO_ENCODER_CANDIDATES = [
  {
    name: "h264_qsv",
    label: "Intel Quick Sync",
    outputArgs: ["-c:v", "h264_qsv", "-global_quality", "24"]
  },
  {
    name: "h264_nvenc",
    label: "NVIDIA NVENC",
    outputArgs: ["-c:v", "h264_nvenc", "-cq", "24", "-preset", "p1"]
  },
  {
    name: "h264_amf",
    label: "AMD AMF",
    outputArgs: ["-c:v", "h264_amf", "-quality", "speed", "-qp_i", "24", "-qp_p", "26"]
  }
];

function getRenderMode(payload = {}) {
  return payload?.renderMode === "fast" ? "fast" : "standard";
}

function isShortFormRenderSource(payload = {}, durationSeconds = 0) {
  const duration = Number(durationSeconds || payload?.durationSeconds || 0);
  return /\/shorts\//i.test(`${payload?.inputUrl || payload?.url || ""}`) ||
    (duration > 0 && duration <= 75);
}

function buildRenderProfile(payload = {}, durationSeconds = 0) {
  const mode = getRenderMode(payload);
  const shortFastMode = isShortFormRenderSource(payload, durationSeconds);
  const fastMode = mode === "fast" || shortFastMode;

  return {
    mode,
    fastMode,
    shortFastMode,
    panelCaptureCount: shortFastMode ? 2 : fastMode ? 4 : 6,
    panelCaptureScale: shortFastMode ? 720 : fastMode ? 960 : 1120,
    panelCaptureQuality: shortFastMode ? 8 : fastMode ? 7 : 6,
    targetSceneDivisor: shortFastMode ? 34 : fastMode ? 24 : 20,
    minSceneCount: fastMode ? 4 : 4,
    maxSceneCount: shortFastMode ? 4 : fastMode ? 6 : 7,
    minSceneSeconds: shortFastMode ? 16 : fastMode ? 12 : 11,
    outputFps: shortFastMode ? 18 : fastMode ? 20 : OUTPUT_FPS,
    encoderCrf: shortFastMode ? "30" : fastMode ? "27" : "22",
    audioBitrate: shortFastMode ? "128k" : "160k"
  };
}
const WEB_ART_STOPWORDS = new Set([
  "a",
  "about",
  "after",
  "again",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "around",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "but",
  "by",
  "can",
  "come",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "don",
  "down",
  "even",
  "ever",
  "every",
  "for",
  "from",
  "get",
  "go",
  "goin",
  "going",
  "gonna",
  "got",
  "had",
  "has",
  "have",
  "he",
  "her",
  "here",
  "hers",
  "him",
  "his",
  "how",
  "i",
  "if",
  "im",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "know",
  "la",
  "like",
  "ll",
  "me",
  "more",
  "my",
  "na",
  "need",
  "never",
  "no",
  "not",
  "now",
  "of",
  "off",
  "oh",
  "on",
  "only",
  "or",
  "our",
  "out",
  "re",
  "right",
  "s",
  "say",
  "she",
  "so",
  "some",
  "still",
  "t",
  "take",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "up",
  "ve",
  "very",
  "wanna",
  "was",
  "watch",
  "way",
  "we",
  "well",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "why",
  "with",
  "won",
  "would",
  "yeah",
  "you",
  "your"
]);

const renderJobs = new Map();
let videoEncoderPromise = null;

async function initializeRenderJobs() {
  const persistedJobs = await loadPersistedRenderJobs();

  persistedJobs.forEach((job) => {
    renderJobs.set(job.id, job);
  });
}

function createRenderError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function slugify(value = "") {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function getRenderSize(payload = {}) {
  if (payload.outputFormat === "mobile") {
    return MOBILE_VIDEO_SIZE;
  }

  if (payload.outputFormat === "desktop") {
    return VIDEO_SIZE;
  }

  const uploadedBackgroundVideo = payload.customBackgroundVideo;

  if (
    uploadedBackgroundVideo &&
    Number(uploadedBackgroundVideo.width || 0) > 0 &&
    Number(uploadedBackgroundVideo.height || 0) > 0 &&
    Number(uploadedBackgroundVideo.height || 0) > Number(uploadedBackgroundVideo.width || 0)
  ) {
    return MOBILE_VIDEO_SIZE;
  }

  const firstBackground = Array.isArray(payload.customBackgrounds)
    ? payload.customBackgrounds.find((item) => item?.width && item?.height)
    : null;

  if (firstBackground && Number(firstBackground.height) > Number(firstBackground.width)) {
    return MOBILE_VIDEO_SIZE;
  }

  const clientViewport = payload.clientViewport;

  if (
    clientViewport &&
    Number(clientViewport.width || 0) > 0 &&
    Number(clientViewport.height || 0) > 0 &&
    Number(clientViewport.height || 0) > Number(clientViewport.width || 0)
  ) {
    return MOBILE_VIDEO_SIZE;
  }

  if (payload.clientIsMobile) {
    return MOBILE_VIDEO_SIZE;
  }

  return VIDEO_SIZE;
}

function scalePoint(point, videoSize) {
  const scaleX = videoSize.width / VIDEO_SIZE.width;
  const scaleY = videoSize.height / VIDEO_SIZE.height;

  return {
    x: Math.round(point.x * scaleX),
    y: Math.round(point.y * scaleY),
    rotation: point.rotation
  };
}

function formatAssTime(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const wholeSeconds = Math.floor(value % 60);
  const centiseconds = Math.floor((value - Math.floor(value)) * 100);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(
    2,
    "0"
  )}.${String(centiseconds).padStart(2, "0")}`;
}

function escapeAssText(value = "") {
  return `${value || ""}`
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\n/g, "\\N");
}

function wrapText(value, maxLength = 22) {
  const words = normalizeWhitespace(value).split(" ").filter(Boolean);

  if (!words.length) {
    return "";
  }

  const lines = [];
  let currentLine = words.shift();

  for (const word of words) {
    const candidate = `${currentLine} ${word}`;

    if (candidate.length <= maxLength) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  lines.push(currentLine);
  return lines.join("\\N");
}

function hexToAssColor(hex = "#ffffff") {
  const cleaned = `${hex || ""}`.replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return "&H00FFFFFF";
  }

  const red = cleaned.slice(0, 2).toUpperCase();
  const green = cleaned.slice(2, 4).toUpperCase();
  const blue = cleaned.slice(4, 6).toUpperCase();
  return `&H00${blue}${green}${red}`;
}

function normalizeHexColor(value = "#7fe8ff", fallback = "#7fe8ff") {
  const raw = `${value || ""}`.trim();
  const candidate = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : fallback.toLowerCase();
}

function resolveNeonGlowValue(value = 70) {
  return clamp(Number(value || 70), 10, 100);
}

function tokenizeLyricWords(text = "") {
  return normalizeWhitespace(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

const AA_SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "but",
  "by",
  "for",
  "from",
  "him",
  "her",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "she",
  "that",
  "the",
  "their",
  "them",
  "they",
  "to",
  "us",
  "was",
  "we",
  "with",
  "you",
  "your"
]);

function buildAaWordLines(text = "", isPortrait = false) {
  const words = tokenizeLyricWords(text).map((word) => word.toUpperCase());
  const lines = [];
  let index = 0;

  while (index < words.length) {
    const current = words[index];
    const currentLower = current.toLowerCase();
    let take = 1;

    if (AA_SMALL_WORDS.has(currentLower) && index < words.length - 1) {
      take = isPortrait ? 2 : 3;
    } else if ((current.length <= 4 || /^[0-9]+$/.test(current)) && index < words.length - 1) {
      take = 2;
    }

    const chunk = words.slice(index, Math.min(words.length, index + take));
    lines.push(chunk.join(" "));
    index += take;
  }

  return lines;
}

function getAaLineVariant(lineText = "", lineIndex = 0) {
  const lowerWords = tokenizeLyricWords(lineText.toLowerCase());
  const onlySmallWords = lowerWords.length && lowerWords.every((word) => AA_SMALL_WORDS.has(word));
  const compactLine = normalizeWhitespace(lineText).length <= 6;

  if (onlySmallWords) {
    return "minor";
  }

  if (lineIndex === 1 || (compactLine && lineIndex % 2 === 0)) {
    return "major";
  }

  return lineIndex % 3 === 0 ? "support" : "minor";
}

function getLyricEmojiForWord(word = "") {
  const token = sanitizeKeywordToken(word).replace(/'/g, "");

  if (!token) {
    return "";
  }

  const rule = LYRIC_EMOJI_RULES.find(({ pattern }) => pattern.test(token));
  return rule?.emoji || "";
}

function decorateLyricWord(word = "") {
  const emoji = getLyricEmojiForWord(word);

  if (!emoji || `${word}`.includes(emoji)) {
    return word;
  }

  return `${word} ${emoji}`;
}

function getLyricEmojisFromText(text = "") {
  return tokenizeLyricWords(text)
    .map((word) => getLyricEmojiForWord(word))
    .filter(Boolean);
}

function decorateLyricText(text = "") {
  return tokenizeLyricWords(text).map(decorateLyricWord).join(" ");
}

function pickHighlightWordIndex(words = []) {
  let bestIndex = -1;
  let bestScore = -1;

  words.forEach((word, index) => {
    const token = sanitizeKeywordToken(word);

    if (!token || WEB_ART_STOPWORDS.has(token)) {
      return;
    }

    const score = token.length + (/[A-Z]/.test(word[0] || "") ? 0.5 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function wrapLyricWords(words = [], maxLength = 24) {
  const lines = [];
  let currentLine = [];
  let currentLength = 0;

  words.forEach((word, index) => {
    const projectedLength = currentLine.length ? currentLength + 1 + word.length : word.length;

    if (currentLine.length && projectedLength > maxLength) {
      lines.push(currentLine);
      currentLine = [];
      currentLength = 0;
    }

    currentLine.push({
      index,
      word
    });
    currentLength = currentLine.length
      ? currentLine.reduce((sum, item) => sum + item.word.length, 0) + (currentLine.length - 1)
      : 0;
  });

  if (currentLine.length) {
    lines.push(currentLine);
  }

  return lines;
}

function buildStyledLyricText(
  text = "",
  accentHex = LYRIC_ACCENT_COLORS[0],
  maxLength = 24,
  options = {}
) {
  const sourceText = typeof options.transformText === "function" ? options.transformText(text) : text;
  const words = tokenizeLyricWords(sourceText);

  if (!words.length) {
    return "";
  }

  const displayWords = [...words];
  const accentColor = hexToAssColor(accentHex);
  const baseColor = hexToAssColor(options.baseTextHex || "#ffffff");
  const highlightIndex = options.disableHighlight ? -1 : pickHighlightWordIndex(words);
  const wrappedLines = wrapLyricWords(displayWords, maxLength);

  return wrappedLines
    .map((line) =>
      line
        .map(({ word, index }) => {
          const escapedWord = escapeAssText(word);

          if (index !== highlightIndex) {
            return escapedWord;
          }

          return `{\\c${accentColor}}${escapedWord}{\\c${baseColor}}`;
        })
        .join(" ")
    )
    .join("\\N");
}

function buildWordByWordLyricText(text = "", durationSeconds = 0, maxLength = 24, options = {}) {
  const sourceText = typeof options.transformText === "function" ? options.transformText(text) : text;
  const words = tokenizeLyricWords(sourceText);

  if (!words.length) {
    return "";
  }

  const displayWords = [...words];
  const wrappedLines = wrapLyricWords(displayWords, maxLength);
  const allocations = buildAdaptiveWordTimingAllocations(words, durationSeconds);
  const baseColor = hexToAssColor(options.baseTextHex || "#ffffff");

  return wrappedLines
    .map((line) =>
      line
        .map(({ word, index }) => `{\\kf${allocations[index]}\\c${baseColor}}${escapeAssText(word)}`)
        .join(" ")
    )
    .join("\\N");
}

function buildAdaptiveWordTimingAllocations(words = [], durationSeconds = 0) {
  const normalizedWords = Array.isArray(words) ? words.filter(Boolean) : [];

  if (!normalizedWords.length) {
    return [];
  }

  const totalCentiseconds = Math.max(
    normalizedWords.length * 10,
    Math.round(Math.max(0.65, Number(durationSeconds || 0)) * 100)
  );
  const weights = normalizedWords.map((word) => {
    const plain = sanitizeKeywordToken(word).replace(/'/g, "");
    const vowelBursts = (plain.match(/[aeiouy]+/gi) || []).length;
    const punctuationBoost = /[,.!?]$/.test(`${word || ""}`) ? 0.35 : 0;
    const syllableWeight = Math.max(0, vowelBursts - 1) * 0.35;

    return Math.max(0.8, plain.length * 0.42 + vowelBursts * 0.55 + syllableWeight + punctuationBoost);
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || normalizedWords.length;
  const baseAllocations = weights.map((weight) =>
    Math.max(7, Math.floor((totalCentiseconds * weight) / totalWeight))
  );
  let assignedCentiseconds = baseAllocations.reduce((sum, value) => sum + value, 0);

  if (assignedCentiseconds < totalCentiseconds) {
    baseAllocations[baseAllocations.length - 1] += totalCentiseconds - assignedCentiseconds;
    assignedCentiseconds = totalCentiseconds;
  }

  while (assignedCentiseconds > totalCentiseconds) {
    let adjusted = false;

    for (let index = 0; index < baseAllocations.length && assignedCentiseconds > totalCentiseconds; index += 1) {
      if (baseAllocations[index] <= 7) {
        continue;
      }

      baseAllocations[index] -= 1;
      assignedCentiseconds -= 1;
      adjusted = true;
    }

    if (!adjusted) {
      break;
    }
  }

  return baseAllocations;
}

function buildAdaptiveLyricMotionProfile(line = {}, selectedVariant = "", textLines = []) {
  const lineDurationSeconds = Math.max(0.18, Number(line?.duration || 0));
  const words = tokenizeLyricWords(line?.text || "");
  const wordCount = Math.max(1, words.length);
  const characterCount = normalizeWhitespace(line?.text || "").length || wordCount;
  const wordsPerSecond = wordCount / Math.max(0.25, lineDurationSeconds);
  const charsPerSecond = characterCount / Math.max(0.25, lineDurationSeconds);
  const isFastPace = wordsPerSecond >= 3.2 || charsPerSecond >= 17;
  const isSlowPace = wordsPerSecond <= 1.45 && charsPerSecond <= 9;
  const revealMs = clamp(
    Math.round(420 - wordsPerSecond * 58 + Math.min(lineDurationSeconds, 4) * 42),
    120,
    620
  );
  const fadeInMs = clamp(Math.round(revealMs * (isFastPace ? 0.48 : isSlowPace ? 0.72 : 0.6)), 70, 280);
  const fadeOutMs = clamp(
    Math.round(Math.min(260, Math.max(90, lineDurationSeconds * (isSlowPace ? 120 : isFastPace ? 78 : 96)))),
    80,
    280
  );
  const movementMultiplier = isSlowPace ? 1.18 : isFastPace ? 0.76 : 1;
  const wordBuildDuration = clamp(
    lineDurationSeconds * (isFastPace ? 0.96 : 0.92),
    0.45,
    MAX_LYRIC_HOLD_SECONDS
  );
  const multiLineDelay = textLines.length > 1
    ? clamp(
        lineDurationSeconds /
          (textLines.length + (isFastPace ? 1.8 : isSlowPace ? 0.7 : 1.15)),
        0.06,
        isSlowPace ? 0.46 : 0.28
      )
    : 0;

  return {
    lineDurationSeconds,
    wordsPerSecond,
    charsPerSecond,
    pace: isFastPace ? "fast" : isSlowPace ? "slow" : "steady",
    revealMs,
    fadeInMs,
    fadeOutMs,
    movementMultiplier,
    wordBuildDuration,
    multiLineDelay,
    karaokeActive: selectedVariant === "karaoke" || (selectedVariant === "word-by-word" && isFastPace)
  };
}

function resolveLyricVisualLeadInSeconds(line = {}, motionProfile = {}, selectedVariant = "") {
  const baseDuration = Math.max(0.18, Number(line?.duration || 0));
  const fadeLeadInSeconds = Math.max(0.06, Number(motionProfile?.fadeInMs || LYRIC_FADE_MS) / 1000 * 0.72);
  const revealLeadInSeconds = Math.max(0.05, Number(motionProfile?.revealMs || LYRIC_REVEAL_MS) / 1000 * 0.34);
  const slowerPaceBonus = motionProfile?.pace === "slow" ? 0.04 : 0;
  const buildHeavyVariant =
    selectedVariant === "typewriter" ||
    selectedVariant === "word-by-word" ||
    selectedVariant === "karaoke" ||
    selectedVariant === "line-by-line";
  const baseLeadIn = Math.max(
    fadeLeadInSeconds,
    buildHeavyVariant ? revealLeadInSeconds : revealLeadInSeconds * 0.78
  );

  return clamp(
    baseLeadIn + slowerPaceBonus,
    0.08,
    Math.min(0.34, Math.max(0.12, baseDuration * 0.24))
  );
}

function pickLyricAnimationVariant(line = {}, index = 0) {
  const wordCount = tokenizeLyricWords(line.text).length;
  const duration = Number(line.duration || 0);
  const wordsPerSecond = wordCount / Math.max(0.25, duration || 0.25);
  const autoMixVariants = [
    "bounce",
    "magic",
    "cinematic-left",
    "line-by-line",
    "side-by-side",
    "neon",
    "whisper",
    "stacked",
    "minimal",
    "cinematic-right",
    "word-by-word",
    "glitch"
  ];
  let selectedVariant = autoMixVariants[index % autoMixVariants.length];

  if (wordsPerSecond >= 3.25 && wordCount >= 4) {
    selectedVariant = index % 2 === 0 ? "word-by-word" : "karaoke";
  } else if (wordsPerSecond <= 1.4 && duration >= 2.6) {
    selectedVariant = index % 2 === 0 ? "cinematic-left" : "whisper";
  } else if (duration >= 2.8 && wordCount >= 6) {
    selectedVariant = index % 3 === 0 ? "word-by-word" : "line-by-line";
  } else if (wordCount <= 3 || duration <= 1.2) {
    selectedVariant = index % 2 === 0 ? "bounce" : "magic";
  } else if (wordCount >= 9) {
    selectedVariant = index % 2 === 0 ? "stacked" : "cinematic-right";
  }

  if (selectedVariant === "side-by-side" && wordCount >= 8) {
    return "line-by-line";
  }

  if ((selectedVariant === "aa" || selectedVariant === "fulllength") && wordCount <= 2) {
    return "magic";
  }

  return selectedVariant;
}

function resolveLyricStylePreset(styleKey = "auto") {
  return LYRIC_STYLE_PRESETS[styleKey] || LYRIC_STYLE_PRESETS.auto;
}

function resolveLyricFontPreset(fontKey = "arial") {
  return LYRIC_FONT_OPTIONS[fontKey] || LYRIC_FONT_OPTIONS.arial;
}

function resolveLyricFontName(fontKey = "arial") {
  return resolveLyricFontPreset(fontKey).fontName;
}

async function prepareLyricFontAssets(renderDirectory, fontPresets = []) {
  const presets = (Array.isArray(fontPresets) ? fontPresets : [fontPresets]).filter(Boolean);
  const assetFiles = [...new Set(
    presets
      .map((preset) => `${preset?.assetFile || ""}`.trim())
      .filter(Boolean)
  )];

  if (!assetFiles.length) {
    return "";
  }

  const fontsDirectory = path.join(renderDirectory, "fonts");
  await ensureDirectory(fontsDirectory);
  let copiedAny = false;

  for (const assetFile of assetFiles) {
    const sourcePath = path.join(PUBLIC_FONTS_ROOT, assetFile);

    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    const targetPath = path.join(fontsDirectory, assetFile);

    if (!fs.existsSync(targetPath)) {
      await fsp.copyFile(sourcePath, targetPath);
    }

    copiedAny = true;
  }

  return copiedAny ? "fonts" : "";
}

function roundEven(value) {
  const rounded = Math.max(2, Math.round(Number(value || 0)));
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundTimeValue(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function getMedianNumber(values = []) {
  const normalizedValues = (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (!normalizedValues.length) {
    return 0;
  }

  const middleIndex = Math.floor(normalizedValues.length / 2);

  return normalizedValues.length % 2 === 0
    ? (normalizedValues[middleIndex - 1] + normalizedValues[middleIndex]) / 2
    : normalizedValues[middleIndex];
}

function stripHtml(value = "") {
  return `${value || ""}`
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeKeywordToken(value = "") {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, "")
    .replace(/^'+|'+$/g, "");
}

function selectTopKeywords(texts = [], maxKeywords = 3) {
  const counts = new Map();

  texts.forEach((text) => {
    `${text || ""}`
      .split(/\s+/)
      .map(sanitizeKeywordToken)
      .filter((token) => token.length >= 3 && !WEB_ART_STOPWORDS.has(token))
      .forEach((token) => {
        counts.set(token, (counts.get(token) || 0) + 1);
      });
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .map(([token]) => token)
    .slice(0, maxKeywords);
}

function buildSceneArtworkQueries(scene, lines = [], payload = {}) {
  const sceneLines = lines
    .filter((line) => line.start >= Math.max(0, scene.start - 1.2) && line.start < scene.end + 0.8)
    .slice(0, 6);
  const lyricKeywords = selectTopKeywords(sceneLines.map((line) => line.text), 3);
  const titleKeywords = selectTopKeywords([payload.song?.title || payload.title || ""], 3);
  const artistKeywords = selectTopKeywords([payload.song?.artist || payload.channelTitle || ""], 2);
  const basePhrases = [];

  if (lyricKeywords.length) {
    basePhrases.push(lyricKeywords.join(" "));
  }

  if (titleKeywords.length && lyricKeywords.length) {
    basePhrases.push(`${titleKeywords.slice(0, 2).join(" ")} ${lyricKeywords.slice(0, 2).join(" ")}`);
  }

  if (titleKeywords.length) {
    basePhrases.push(titleKeywords.join(" "));
  }

  if (artistKeywords.length && titleKeywords.length) {
    basePhrases.push(`${artistKeywords[0]} ${titleKeywords.slice(0, 2).join(" ")}`);
  }

  if (!basePhrases.length) {
    basePhrases.push("music emotion");
  }

  const queries = [];

  basePhrases.forEach((phrase) => {
    WEB_ART_STYLE_TERMS.forEach((styleTerm) => {
      queries.push(`${phrase} ${styleTerm}`);
    });
  });

  queries.push("music illustration");
  queries.push("dramatic comic illustration");

  return [...new Set(queries.map(normalizeWhitespace).filter(Boolean))];
}

function createFetchTimeout(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel() {
      clearTimeout(timer);
    }
  };
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const timeout = createFetchTimeout(timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      signal: timeout.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${url}`);
    }

    return response.json();
  } finally {
    timeout.cancel();
  }
}

async function fetchBufferWithTimeout(url, timeoutMs) {
  const timeout = createFetchTimeout(timeoutMs);

  try {
    const response = await fetch(url, {
      signal: timeout.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${url}`);
    }

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || ""
    };
  } finally {
    timeout.cancel();
  }
}

function scoreIllustrationCandidate(candidate, query) {
  const title = stripHtml(candidate.title || "").toLowerCase();
  const tags = Array.isArray(candidate.tags) ? candidate.tags.map((tag) => tag?.name || "").join(" ") : "";
  const haystack = `${title} ${tags} ${candidate.category || ""}`.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;

  if (/\billustration\b|\bcomic\b|\bcartoon\b|\bdrawing\b|\bposter\b|\bart\b/.test(haystack)) {
    score += 5;
  }

  if (candidate.license === "cc0" || candidate.license === "pdm") {
    score += 3;
  }

  if (candidate.width >= 1200 || candidate.height >= 900) {
    score += 2;
  }

  if ((candidate.category || "").toLowerCase() === "illustration") {
    score += 2;
  }

  if ((candidate.category || "").toLowerCase() === "photograph") {
    score -= 2;
  }

  queryTerms.forEach((term) => {
    if (term.length >= 3 && haystack.includes(term)) {
      score += 1;
    }
  });

  return score;
}

async function searchIllustrationCandidates(query) {
  const params = new URLSearchParams({
    q: query,
    page_size: String(WEB_ART_RESULTS_PER_QUERY),
    license_type: "commercial",
    mature: "false"
  });
  const payload = await fetchJsonWithTimeout(
    `https://api.openverse.org/v1/images?${params.toString()}`,
    WEB_ART_SEARCH_TIMEOUT_MS
  );

  return (payload.results || [])
    .filter((item) => !item.mature && (item.url || item.thumbnail))
    .sort((left, right) => scoreIllustrationCandidate(right, query) - scoreIllustrationCandidate(left, query));
}

async function downloadIllustrationCandidate(candidate, renderDirectory, sceneIndex) {
  const basePath = path.join(renderDirectory, `web-scene-${String(sceneIndex + 1).padStart(2, "0")}`);
  const downloadUrls = [candidate.url, candidate.thumbnail].filter(Boolean);
  let lastError = null;

  for (const downloadUrl of downloadUrls) {
    try {
      const { buffer, contentType } = await fetchBufferWithTimeout(downloadUrl, WEB_ART_DOWNLOAD_TIMEOUT_MS);
      const extension = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";
      const filePath = `${basePath}.${extension}`;

      await fsp.writeFile(filePath, buffer);
      return {
        filePath,
        sourceUrl: downloadUrl
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("The illustration image could not be downloaded.");
}

function getRenderDurationSeconds(value) {
  return Math.max(Number(value || 0), MIN_RENDER_DURATION_SECONDS);
}

async function sampleImageAverageColor(imagePath) {
  const { stderr } = await runCommand(
    ffmpegPath,
    [
      "-hide_banner",
      "-v",
      "info",
      "-i",
      imagePath,
      "-frames:v",
      "1",
      "-vf",
      "signalstats,metadata=print",
      "-f",
      "null",
      "-"
    ],
    {
      timeoutMs: 15000
    }
  );
  const yAvgMatch = `${stderr || ""}`.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/);
  const uAvgMatch = `${stderr || ""}`.match(/lavfi\.signalstats\.UAVG=([0-9.]+)/);
  const vAvgMatch = `${stderr || ""}`.match(/lavfi\.signalstats\.VAVG=([0-9.]+)/);
  const brightness = yAvgMatch ? Number(yAvgMatch[1]) : 128;
  const u = uAvgMatch ? Number(uAvgMatch[1]) : 128;
  const v = vAvgMatch ? Number(vAvgMatch[1]) : 128;

  const c = brightness - 16;
  const d = u - 128;
  const e = v - 128;
  const r = clamp(Math.round((298 * c + 409 * e + 128) / 256), 0, 255);
  const g = clamp(Math.round((298 * c - 100 * d - 208 * e + 128) / 256), 0, 255);
  const b = clamp(Math.round((298 * c + 516 * d + 128) / 256), 0, 255);

  return {
    r,
    g,
    b,
    u,
    v,
    brightness
  };
}

function rgbToHex(red = 255, green = 255, blue = 255) {
  return `#${[red, green, blue]
    .map((value) => clamp(Math.round(Number(value || 0)), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function buildAccentHexFromSample(sample = {}) {
  const brightness = Number(sample.brightness || 128);
  const baseMix = brightness >= 160 ? 0.34 : brightness >= 120 ? 0.28 : 0.22;
  const targetLift = brightness >= 160 ? 26 : brightness >= 120 ? 42 : 58;
  const rawRed = Number(sample.r || brightness);
  const rawGreen = Number(sample.g || brightness);
  const rawBlue = Number(sample.b || brightness);
  const maxChannel = Math.max(rawRed, rawGreen, rawBlue, 1);
  const minChannel = Math.min(rawRed, rawGreen, rawBlue, 0);
  const saturationSpread = maxChannel - minChannel;

  let red = rawRed;
  let green = rawGreen;
  let blue = rawBlue;

  if (saturationSpread < 26) {
    red = clamp(rawRed + 64, 0, 255);
    green = clamp(rawGreen + 34, 0, 255);
    blue = clamp(rawBlue + 82, 0, 255);
  }

  const mixedRed = clamp(Math.round(red * (1 - baseMix) + 255 * baseMix + targetLift), 0, 255);
  const mixedGreen = clamp(Math.round(green * (1 - baseMix) + 255 * baseMix + targetLift), 0, 255);
  const mixedBlue = clamp(Math.round(blue * (1 - baseMix) + 255 * baseMix + targetLift), 0, 255);

  return rgbToHex(mixedRed, mixedGreen, mixedBlue);
}

function getContrastStyleForBrightness(brightness = 128, sample = {}) {
  return {
    textHex: brightness >= 150 ? "#fefefe" : "#ffffff",
    outlineHex: brightness >= 150 ? "#0f1014" : brightness >= 110 ? "#111111" : "#151515",
    accentHex: buildAccentHexFromSample(sample)
  };
}

async function buildLyricContrastMap(lines = [], backgroundPaths = [], backgroundPlan = []) {
  if (!backgroundPaths.length) {
    return lines.map(() => getContrastStyleForBrightness(128, {}));
  }

  const sceneStyleCache = new Map();
  const sceneStyles = await Promise.all(
    backgroundPaths.map(async (backgroundPath) => {
      const cacheKey = `${backgroundPath || ""}`;

      if (sceneStyleCache.has(cacheKey)) {
        return sceneStyleCache.get(cacheKey);
      }

      let resolvedStyle;

      try {
        const sample = await sampleImageAverageColor(backgroundPath);
        resolvedStyle = getContrastStyleForBrightness(sample.brightness, sample);
      } catch {
        resolvedStyle = getContrastStyleForBrightness(128, {});
      }

      sceneStyleCache.set(cacheKey, resolvedStyle);
      return resolvedStyle;
    })
  );

  return lines.map((line) => {
    const sceneIndex = backgroundPlan.findIndex(
      (scene) => Number(line?.start || 0) >= Number(scene?.start || 0)
        && Number(line?.start || 0) < Number(scene?.end || Number.MAX_SAFE_INTEGER)
    );
    return sceneStyles[Math.max(0, sceneIndex)] || getContrastStyleForBrightness(128, {});
  });
}

async function sampleImageRegionStats(imagePath, cropExpression) {
  const { stderr } = await runCommand(
    ffmpegPath,
    [
      "-hide_banner",
      "-v",
      "info",
      "-i",
      imagePath,
      "-frames:v",
      "1",
      "-vf",
      `${cropExpression},signalstats,metadata=print`,
      "-f",
      "null",
      "-"
    ],
    {
      timeoutMs: 15000
    }
  );
  const log = `${stderr || ""}`;
  const yAvg = Number((log.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/) || [0, 128])[1]);
  const yLow = Number((log.match(/lavfi\.signalstats\.YLOW=([0-9.]+)/) || [0, yAvg])[1]);
  const yHigh = Number((log.match(/lavfi\.signalstats\.YHIGH=([0-9.]+)/) || [0, yAvg])[1]);
  const satAvg = Number((log.match(/lavfi\.signalstats\.SATAVG=([0-9.]+)/) || [0, 0])[1]);

  return {
    brightness: yAvg,
    contrastRange: Math.max(0, yHigh - yLow),
    saturation: satAvg
  };
}

function getPlacementCalmScore(stats = {}) {
  return Number(stats.contrastRange || 0) * 1.1 + Number(stats.saturation || 0) * 0.75;
}

async function buildLyricPlacementMap(lines = [], backgroundPaths = [], backgroundPlan = []) {
  if (!backgroundPaths.length) {
    return lines.map((_, index) => ({
      side: index % 2 === 0 ? "left" : "right",
      leftScore: 0,
      rightScore: 0
    }));
  }

  const placementCache = new Map();
  const scenePlacements = await Promise.all(
    backgroundPaths.map(async (backgroundPath, sceneIndex) => {
      const cacheKey = `${backgroundPath || ""}`;

      if (placementCache.has(cacheKey)) {
        const cachedPlacement = placementCache.get(cacheKey);
        if (Math.abs(cachedPlacement.leftScore - cachedPlacement.rightScore) <= LYRIC_PLACEMENT_TIE_THRESHOLD) {
          return {
            side: sceneIndex % 2 === 0 ? "left" : "right",
            leftScore: cachedPlacement.leftScore,
            rightScore: cachedPlacement.rightScore
          };
        }
        return cachedPlacement;
      }

      let resolvedPlacement;

      try {
        const [leftStats, rightStats] = await Promise.all([
          sampleImageRegionStats(backgroundPath, "crop=iw*0.32:ih:0:0"),
          sampleImageRegionStats(backgroundPath, "crop=iw*0.32:ih:iw-iw*0.32:0")
        ]);
        const leftScore = getPlacementCalmScore(leftStats);
        const rightScore = getPlacementCalmScore(rightStats);
        const preferredSide =
          Math.abs(leftScore - rightScore) <= LYRIC_PLACEMENT_TIE_THRESHOLD
            ? sceneIndex % 2 === 0
              ? "left"
              : "right"
            : leftScore < rightScore
              ? "left"
              : "right";

        resolvedPlacement = {
          side: preferredSide,
          leftScore,
          rightScore
        };
      } catch {
        resolvedPlacement = {
          side: sceneIndex % 2 === 0 ? "left" : "right",
          leftScore: 0,
          rightScore: 0
        };
      }

      placementCache.set(cacheKey, resolvedPlacement);
      return resolvedPlacement;
    })
  );

  return lines.map((line) => {
    const sceneIndex = backgroundPlan.findIndex(
      (scene) => Number(line?.start || 0) >= Number(scene?.start || 0)
        && Number(line?.start || 0) < Number(scene?.end || Number.MAX_SAFE_INTEGER)
    );

    return scenePlacements[Math.max(0, sceneIndex)] || { side: "left", leftScore: 0, rightScore: 0 };
  });
}

function emojiToCodePointSequence(emoji = "") {
  return Array.from(`${emoji || ""}`)
    .map((character) => character.codePointAt(0).toString(16))
    .join("-");
}

function getColorEmojiAssetUrl(emoji = "") {
  const codePointSequence = emojiToCodePointSequence(emoji);
  return codePointSequence ? `${COLOR_EMOJI_BASE_URL}/${codePointSequence}.png` : "";
}

async function prepareColorEmojiAssets(renderDirectory, lines = []) {
  const uniqueEmojis = [...new Set(lines.flatMap((line) => getLyricEmojisFromText(line?.text || "")))];
  const assetMap = {};

  await Promise.all(
    uniqueEmojis.map(async (emoji) => {
      const assetUrl = getColorEmojiAssetUrl(emoji);

      if (!assetUrl) {
        return;
      }

      try {
        const response = await fetch(assetUrl, {
          signal: AbortSignal.timeout(6000)
        });

        if (!response.ok) {
          return;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (!buffer.length) {
          return;
        }

        const filePath = path.join(renderDirectory, `emoji-${emojiToCodePointSequence(emoji)}.png`);
        await fsp.writeFile(filePath, buffer);
        assetMap[emoji] = filePath;
      } catch {}
    })
  );

  return assetMap;
}

function limitLyricLines(lines = [], durationSeconds) {
  const maxStart = Math.max(0, Number(durationSeconds || 0) - 0.25);

  return lines
    .filter((line) => Number(line?.start || 0) <= maxStart)
    .map((line) => ({
      ...line,
      duration: Math.max(
        MIN_LYRIC_DURATION_SECONDS,
        Math.min(Number(line.duration || 0), durationSeconds - line.start)
      )
    }))
    .filter((line) => line.duration > 0);
}

function applyFinalLyricTimingMode(lines = [], durationSeconds = 0) {
  const isShortVideo = Number(durationSeconds || 0) < 90;
  const minimumDisplaySeconds = isShortVideo ? 1.5 : 2.5;
  const maximumDisplaySeconds = isShortVideo ? 4.0 : 6.0;
  const preRollSeconds = isShortVideo ? 0 : 0.1;

  return limitLyricLines(
    lines.map((line, index) => {
      const originalStart = Math.max(0, Number(line?.start || 0));
      const nextStart = Number(lines[index + 1]?.start ?? (originalStart + (isShortVideo ? 4 : 6)));
      const naturalDuration = Math.max(0.18, nextStart - originalStart);
      const start = Math.max(0, Number(line?.start || 0) - preRollSeconds);
      const duration = Math.max(
        minimumDisplaySeconds,
        Math.min(naturalDuration, maximumDisplaySeconds)
      );

      return {
        ...line,
        start: roundTimeValue(start),
        duration: roundTimeValue(duration)
      };
    }),
    durationSeconds
  );
}

function estimateLyricBox(wrappedText) {
  const segments = `${wrappedText || ""}`.split("\\N").filter(Boolean);
  const maxChars = segments.reduce((longest, segment) => Math.max(longest, segment.length), 0);

  return {
    width: roundEven(Math.max(240, Math.min(540, 64 + maxChars * 16))),
    height: roundEven(Math.max(96, 36 + segments.length * 54))
  };
}

function createJobPublicPayload(job) {
  const now = Date.now();
  const stageTimings = Array.isArray(job.stageTimings)
    ? job.stageTimings.map((entry = {}) => {
        const startedAtMs = Number(new Date(entry.startedAt || 0));
        const endedAtMs = Number(new Date(entry.endedAt || 0));
        const active = Boolean(entry.startedAt) && !entry.endedAt;
        const durationMs =
          Math.max(
            0,
            Number(
              entry.durationMs ||
                (active
                  ? now - startedAtMs
                  : endedAtMs > 0 && startedAtMs > 0
                    ? endedAtMs - startedAtMs
                    : 0)
            )
          ) || 0;

        return {
          label: normalizeWhitespace(entry.label || ""),
          startedAt: entry.startedAt || "",
          endedAt: entry.endedAt || "",
          durationMs,
          active
        };
      })
    : [];
  const renderStartedAtMs = Number(new Date(job.renderStartedAt || job.createdAt || 0));
  const completedAtMs = Number(new Date(job.completedAt || 0));
  const renderDurationMs =
    renderStartedAtMs > 0
      ? Math.max(0, (completedAtMs > 0 ? completedAtMs : now) - renderStartedAtMs)
      : 0;

  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    notes: job.notes,
    attempt: Number(job.attempt || 1),
    maxAttempts: Number(job.maxAttempts || MAX_RENDER_ATTEMPTS),
    retrying: Boolean(job.retrying),
    userMessage: buildUserRenderMessage(job),
    error: job.error || null,
    renderStartedAt: job.renderStartedAt || "",
    completedAt: job.completedAt || "",
    renderDurationMs,
    stageTimings: stageTimings.slice(-10),
    videoUrl: job.status === "completed" ? `/api/render/${job.id}/file` : null,
    downloadUrl: job.status === "completed" ? `/api/render/${job.id}/download` : null
  };
}

function isTerminalJobStatus(status = "") {
  return /^(completed|failed)$/i.test(`${status || ""}`);
}

function ensureJobStageTimings(job, nowIso = new Date().toISOString()) {
  if (!Array.isArray(job.stageTimings)) {
    job.stageTimings = [];
  }

  if (!job.stageTimings.length && normalizeWhitespace(job.stage || "")) {
    job.stageTimings.push({
      label: normalizeWhitespace(job.stage),
      startedAt: job.createdAt || nowIso,
      endedAt: isTerminalJobStatus(job.status) ? job.updatedAt || nowIso : "",
      durationMs: 0
    });
  }

  return job.stageTimings;
}

function getActiveStageTiming(job) {
  const stageTimings = ensureJobStageTimings(job);

  for (let index = stageTimings.length - 1; index >= 0; index -= 1) {
    if (stageTimings[index] && !stageTimings[index].endedAt) {
      return stageTimings[index];
    }
  }

  return null;
}

function closeActiveStageTiming(job, nowIso = new Date().toISOString()) {
  const activeEntry = getActiveStageTiming(job);

  if (!activeEntry) {
    return;
  }

  activeEntry.endedAt = nowIso;
  activeEntry.durationMs = Math.max(
    0,
    Number(new Date(activeEntry.endedAt || 0)) - Number(new Date(activeEntry.startedAt || 0))
  );
}

function openStageTiming(job, label = "", nowIso = new Date().toISOString()) {
  const safeLabel = normalizeWhitespace(label);

  if (!safeLabel) {
    return null;
  }

  const activeEntry = getActiveStageTiming(job);

  if (activeEntry && activeEntry.label === safeLabel) {
    return activeEntry;
  }

  const entry = {
    label: safeLabel,
    startedAt: nowIso,
    endedAt: "",
    durationMs: 0
  };
  ensureJobStageTimings(job).push(entry);
  return entry;
}

function updateJob(job, patch) {
  const nowIso = new Date().toISOString();
  const previousStage = normalizeWhitespace(job.stage || "");
  const previousStatus = `${job.status || "queued"}`;
  const nextStage = normalizeWhitespace(patch?.stage ?? job.stage ?? "");
  const nextStatus = `${patch?.status || job.status || "queued"}`;
  const stageChanged = nextStage && nextStage !== previousStage;

  ensureJobStageTimings(job, nowIso);

  if (stageChanged || (previousStatus !== nextStatus && isTerminalJobStatus(nextStatus))) {
    closeActiveStageTiming(job, nowIso);
  }

  Object.assign(job, patch, {
    updatedAt: nowIso
  });

  if (nextStatus === "running" && !job.renderStartedAt) {
    job.renderStartedAt = nowIso;
  }

  if (stageChanged && nextStage) {
    openStageTiming(job, nextStage, nowIso);
  } else if (!getActiveStageTiming(job) && nextStage && !isTerminalJobStatus(nextStatus)) {
    openStageTiming(job, nextStage, nowIso);
  }

  if (isTerminalJobStatus(nextStatus)) {
    if (nextStage && stageChanged) {
      closeActiveStageTiming(job, nowIso);
    }
    job.completedAt = nowIso;
  } else {
    job.completedAt = "";
  }

  persistRenderJob(job).catch(() => {});
}

async function ensureDirectory(directoryPath) {
  await fsp.mkdir(directoryPath, { recursive: true });
}

function buildUserRenderMessage(job = {}) {
  if (job.status === "completed") {
    return "Your lyric video is ready to preview and download.";
  }

  if (job.retrying) {
    return "A small render issue showed up. The app is fixing it automatically and trying again.";
  }

  if (job.status === "failed") {
    if (/YOUTUBE_BOT_BLOCK|not a bot|cookies-from-browser|temporarily blocked audio access/i.test(`${job.error || ""}`)) {
      return "YouTube blocked the video audio for this link. Add a YouTube cookie file on the server or try another link.";
    }

    if (/verify|verified|match(?:ed)? .*detected vocals|sync check|sync quality|lyric timing|strongly enough|audio-built lyric fallback|too sparse across the song|trust as the final lyric sheet/i.test(`${job.error || ""}`)) {
      return "The app stopped before rendering because it could not verify that the lyrics match the audio closely enough.";
    }

    if (/lyrics|caption|transcrib/i.test(`${job.error || ""}`)) {
      return "The app could not lock the lyric timing for this video. Please try again or use another link.";
    }

    if (/audio|stream|youtube/i.test(`${job.error || ""}`)) {
      return "The app could not reach the video audio right now. Please try again in a moment.";
    }

    return "The video could not finish rendering this time. Please try again.";
  }

  if (/Checking sync quality/i.test(job.stage || "")) {
    return "Checking lyric sync before export.";
  }

  if (/Validating final lyric sync/i.test(job.stage || "")) {
    return "Verifying that the lyrics truly match the audio before rendering.";
  }

  if (/Retrying/i.test(job.stage || "")) {
    return "Trying a safer recovery path for this video.";
  }

  if (/Rendering backup lyric video/i.test(job.stage || "")) {
    return "Switching to a safer backup render to finish your video.";
  }

  if (/Preparing backup render backgrounds/i.test(job.stage || "")) {
    return "Rebuilding the background scenes to keep the export moving.";
  }

  if (/Preparing render workspace/i.test(job.stage || "")) {
    return "Setting up the lyric video workspace.";
  }

  return "Building your lyric video.";
}

function appendUniqueJobNote(job, note) {
  const trimmedNote = normalizeWhitespace(note || "");

  if (!trimmedNote) {
    return;
  }

  const existingNotes = Array.isArray(job.notes) ? job.notes : [];

  if (existingNotes.includes(trimmedNote)) {
    return;
  }

  job.notes = [...existingNotes, trimmedNote].slice(-12);
}

function buildAdaptiveTranscriptionOptions(baseOptions = {}, adaptiveProfile = {}) {
  const options = {
    ...baseOptions
  };

  if (adaptiveProfile?.preferKnownAudioBlockRecovery) {
    options.preferKnownAudioBlockRecovery = true;
  }

  if (!adaptiveProfile?.preferStrongerFinalTranscription || options.preview) {
    return options;
  }

  return {
    ...options,
    timeoutMs: Math.max(Number(options.timeoutMs || 0), 10 * 60 * 1000),
    downloadTimeoutMs: Math.max(Number(options.downloadTimeoutMs || 0), 6 * 60 * 1000),
    modelName: options.modelName || process.env.WHISPER_ADAPTIVE_MODEL || "small",
    beamSize: Math.max(Number(options.beamSize || 0), 6),
    conditionOnPreviousText: options.conditionOnPreviousText !== false
  };
}

function buildDeeperSyncRetryOptions(baseOptions = {}, adaptiveProfile = {}) {
  const adaptiveOptions = buildAdaptiveTranscriptionOptions(
    {
      ...baseOptions,
      preview: false
    },
    adaptiveProfile
  );

  return {
    ...adaptiveOptions,
    preview: false,
    modelName:
      adaptiveOptions.modelName ||
      process.env.WHISPER_ADAPTIVE_MODEL ||
      process.env.WHISPER_MODEL ||
      "base",
    beamSize: Math.max(Number(adaptiveOptions.beamSize || 0), 5),
    vadFilter:
      typeof adaptiveOptions.vadFilter === "boolean" ? adaptiveOptions.vadFilter : false,
    conditionOnPreviousText: adaptiveOptions.conditionOnPreviousText !== false,
    timeoutMs: Math.max(Number(adaptiveOptions.timeoutMs || 0), 120 * 1000),
    downloadTimeoutMs: Math.max(Number(adaptiveOptions.downloadTimeoutMs || 0), 120 * 1000)
  };
}

async function recordAdaptiveSignalSafely(payload = {}) {
  try {
    await recordAdaptiveSignal(payload);
  } catch {}
}

async function recordRenderOutcomeSafely(payload = {}) {
  try {
    await recordRenderOutcome(payload);
  } catch {}
}

function isRecoverableRenderError(error) {
  if (Number(error?.statusCode || 0) === 422) {
    return false;
  }

  const message = `${error?.message || error || ""}`.toLowerCase();

  if (!message) {
    return false;
  }

  if (/verify|verified|sync check failed|match the detected vocals|not trustworthy/.test(message)) {
    return false;
  }

  return /timed out|timeout|ffmpeg|encoder|spawn|stream|youtube|audio|network|econn|enotfound|eai_again|reset|background|panel|artwork|sample|fetch|concat|subtitle|render/.test(
    message
  );
}

function isAudioTransportError(error) {
  const message = `${error?.message || error || ""}`.toLowerCase();

  if (!message) {
    return false;
  }

  return /audio|stream|youtube|http|https|tls|ssl|403|401|404|expired|connection|network|protocol|reset|server returned|end of file|input\/output|i\/o|invalid data found/.test(
    message
  );
}

function canProceedWithStrongSourceAfterValidationFailure({
  lines = [],
  syncMode = "none",
  transcriptDerived = false,
  durationSeconds = 0,
  error = null
} = {}) {
  const message = `${error?.message || error || ""}`.toLowerCase();

  if (!message) {
    return false;
  }

  if (transcriptDerived) {
    return false;
  }

  if (!["synced-lyrics", "caption-aligned", "captions"].includes(syncMode)) {
    return false;
  }

  if (!/timed out|timeout|python|download|audio|stream|youtube|network|econn|reset/.test(message)) {
    return false;
  }

  const sourceMetrics = getSourceTimingMetrics(lines, durationSeconds);
  const minimumMeaningfulCount = Math.max(6, Math.min(16, Math.round(Math.max(durationSeconds, 30) / 24)));

  return (
    sourceMetrics.reliableForSourcePacing &&
    sourceMetrics.meaningfulCount >= minimumMeaningfulCount &&
    sourceMetrics.coverageRatio >= 0.22
  );
}

function canKeepStrongSourceAfterSparseValidationReport({
  report = {},
  syncMode = "none",
  transcriptDerived = false
} = {}) {
  if (transcriptDerived) {
    return false;
  }

  if (!["synced-lyrics", "caption-aligned", "captions"].includes(syncMode)) {
    return false;
  }

  if (!report || report.approved) {
    return false;
  }

  const reason = normalizeWhitespace(report.reason || "").toLowerCase();

  if (!reason) {
    return false;
  }

  if (/drifted too far|too far away|matched the detected vocals too weakly/.test(reason)) {
    return false;
  }

  return /too few|did not match enough|stable enough timing|covered too little|too sparse/.test(reason);
}

function buildIntroPreservedTranscriptCandidate({
  sourceLines = [],
  transcriptLines = [],
  transcriptMetrics = {},
  syncMode = "none",
  transcriptDerived = false,
  durationSeconds = 0
} = {}) {
  if (transcriptDerived) {
    return {
      applied: false,
      lines: sanitizeLyricLines(transcriptLines, durationSeconds),
      preservedIntroCount: 0,
      introBoundary: 0
    };
  }

  if (!["synced-lyrics", "caption-aligned", "captions"].includes(syncMode)) {
    return {
      applied: false,
      lines: sanitizeLyricLines(transcriptLines, durationSeconds),
      preservedIntroCount: 0,
      introBoundary: 0
    };
  }

  const sanitizedSource = sanitizeLyricLines(sourceLines, durationSeconds);
  const sanitizedTranscript = sanitizeLyricLines(transcriptLines, durationSeconds);
  const firstTranscriptStart = Number(
    transcriptMetrics?.firstStart || sanitizedTranscript[0]?.start || 0
  );

  if (!sanitizedSource.length || !sanitizedTranscript.length || firstTranscriptStart < 12) {
    return {
      applied: false,
      lines: sanitizedTranscript,
      preservedIntroCount: 0,
      introBoundary: 0
    };
  }

  const introBoundary = Math.max(0, roundTimeValue(firstTranscriptStart - 0.45));
  const sourceIntroLines = sanitizedSource.filter(
    (line) => Number(line.start || 0) < introBoundary
  );
  const meaningfulIntroLines = sourceIntroLines.filter(
    (line) => getAlignmentWords(line.text).length >= 2
  );
  const introCoveredSeconds = meaningfulIntroLines.reduce(
    (sum, line) =>
      sum +
      Math.min(
        MAX_LYRIC_HOLD_SECONDS,
        Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line.duration || 0))
      ),
    0
  );

  if (meaningfulIntroLines.length < 2 || introCoveredSeconds < 6) {
    return {
      applied: false,
      lines: sanitizedTranscript,
      preservedIntroCount: 0,
      introBoundary
    };
  }

  const transcriptBodyLines = sanitizedTranscript.filter(
    (line) => Number(line.start || 0) >= introBoundary - 0.15
  );

  if (!transcriptBodyLines.length) {
    return {
      applied: false,
      lines: sanitizedTranscript,
      preservedIntroCount: 0,
      introBoundary
    };
  }

  return {
    applied: true,
    lines: sanitizeLyricLines(
      [...sourceIntroLines, ...transcriptBodyLines],
      durationSeconds
    ),
    preservedIntroCount: sourceIntroLines.length,
    introBoundary
  };
}

function looksLikeGarbageTranscriptIntroLine(text = "") {
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return true;
  }

  const letters = normalized.match(/\p{L}/gu) || [];
  const digits = normalized.match(/\p{N}/gu) || [];
  const compactLength = normalized.replace(/\s+/g, "").length;
  const letterDensity = letters.length / Math.max(1, compactLength);

  if (!letters.length && digits.length) {
    return true;
  }

  if (/^(?:[\p{N}]+[^\p{L}]*)+$/u.test(normalized)) {
    return true;
  }

  return digits.length >= 1 && (letters.length <= 2 || letterDensity < 0.42);
}

function mergeUploadedAudioIntroTranscript({
  transcriptLines = [],
  lyricLines = [],
  anchors = [],
  durationSeconds = 0
} = {}) {
  const sanitizedTranscript = sanitizeLyricLines(transcriptLines, durationSeconds).filter(
    (line) =>
      !looksLikeGarbageTranscriptIntroLine(line.text) &&
      getAlignmentWords(line.text).length >= 2
  );
  const sanitizedLyricLines = sanitizeLyricLines(lyricLines, durationSeconds);

  if (!sanitizedLyricLines.length) {
    return {
      applied: false,
      lines: sanitizedTranscript,
      preservedIntroCount: 0,
      introBoundary: 0
    };
  }

  const firstLyricStart = Number(sanitizedLyricLines[0]?.start || 0);
  const firstAnchorStart = Number(anchors[0]?.transcriptStart || firstLyricStart);
  const introBoundary = Math.max(0, roundTimeValue(Math.min(firstLyricStart, firstAnchorStart) - 0.35));

  if (!sanitizedTranscript.length || introBoundary < 1.2) {
    return {
      applied: false,
      lines: sanitizedLyricLines,
      preservedIntroCount: 0,
      introBoundary
    };
  }

  const introLines = sanitizedTranscript.filter(
    (line) => Number(line.start || 0) < introBoundary
  );

  if (!introLines.length) {
    return {
      applied: false,
      lines: sanitizedLyricLines,
      preservedIntroCount: 0,
      introBoundary
    };
  }

  return {
    applied: true,
    lines: sanitizeLyricLines([...introLines, ...sanitizedLyricLines], durationSeconds),
    preservedIntroCount: introLines.length,
    introBoundary
  };
}

function buildTranscriptionCacheKey(options = {}) {
  const task = options.task === "translate" ? "translate" : "transcribe";
  const language = normalizeWhitespace(options.language || "") || "auto";
  const modelName = normalizeWhitespace(options.modelName || "") || "default";
  const beamSize = Number(options.beamSize || 0) || "default";
  const previewMode = options.preview ? "preview" : "full";
  const vadMode =
    typeof options.vadFilter === "boolean"
      ? options.vadFilter
        ? "vad-on"
        : "vad-off"
      : "vad-default";
  const previousTextMode =
    typeof options.conditionOnPreviousText === "boolean"
      ? options.conditionOnPreviousText
        ? "prev-on"
        : "prev-off"
      : "prev-default";

  return [
    task,
    language,
    modelName,
    `beam-${beamSize}`,
    previewMode,
    vadMode,
    previousTextMode
  ].join(":");
}

function shouldDeepenValidationTranscription(transcription = null, durationSeconds = 0) {
  if (!transcription) {
    return false;
  }

  const normalizedTranscriptLines = limitLyricLines(
    sanitizeLyricLines(
      smoothTranscribedLyricGaps(
        romanizeLyricLines(transcription.lines).lines,
        durationSeconds
      ),
      durationSeconds
    ),
    durationSeconds
  );
  const transcriptMetrics = getTranscriptTimingMetrics(
    normalizedTranscriptLines,
    transcription.words,
    durationSeconds
  );
  const effectiveDuration = Math.max(Number(durationSeconds || 0), MIN_RENDER_DURATION_SECONDS);
  const minimumCoverageRatio =
    effectiveDuration >= 180 ? 0.12 : effectiveDuration >= 90 ? 0.1 : 0.08;
  const minimumLastEnd = effectiveDuration >= 90 ? effectiveDuration * 0.52 : effectiveDuration * 0.45;
  const maximumGapSeconds = Math.max(26, effectiveDuration * 0.24);

  return (
    (
      !transcriptMetrics.reliableForWindowFit &&
      transcriptMetrics.coverageRatio < minimumCoverageRatio
    ) ||
    transcriptMetrics.coverageRatio < minimumCoverageRatio ||
    transcriptMetrics.lastEnd < Math.max(transcriptMetrics.firstStart + 18, minimumLastEnd) ||
    transcriptMetrics.maxGapSeconds > maximumGapSeconds
  );
}

async function cleanupRetryArtifacts(renderDirectory) {
  const cleanupTargets = [
    "final.mp4",
    "backgrounds.concat",
    "backgrounds-safe.concat",
    "lyrics.ass"
  ];

  await Promise.all(
    cleanupTargets.map(async (fileName) => {
      try {
        await fsp.unlink(path.join(renderDirectory, fileName));
      } catch {}
    })
  );
}

function sanitizeLyricLines(lines = [], fallbackDuration = 0) {
  const sanitized = lines
    .map((line) => {
      const explicitDuration = Number(line?.duration || 0);
      return {
        text: normalizeWhitespace(line?.text || ""),
        start: Math.max(0, Number(line?.start || 0)),
        duration: explicitDuration > 0 ? Math.max(MIN_LYRIC_DURATION_SECONDS, explicitDuration) : 0,
        hasExplicitDuration: explicitDuration > 0
      };
    })
    .filter((line) => line.text && !/^\[[^\]]+\]$/.test(line.text))
    .sort((left, right) => left.start - right.start);

  for (let index = 0; index < sanitized.length; index += 1) {
    const currentLine = sanitized[index];
    const nextLine = sanitized[index + 1];

    const boundaryDuration = nextLine
      ? Number(nextLine.start || 0) - currentLine.start
      : fallbackDuration
        ? Number(fallbackDuration || 0) - currentLine.start
        : 0;

    if (boundaryDuration > 0) {
      if (currentLine.hasExplicitDuration) {
        const safeBoundary = Math.max(0.12, boundaryDuration - LYRIC_TRANSITION_GAP_SECONDS);
        const minimumDuration = Math.min(MIN_LYRIC_DURATION_SECONDS, safeBoundary);
        currentLine.duration = clamp(currentLine.duration, minimumDuration, safeBoundary);
      } else {
        currentLine.duration = Math.max(MIN_LYRIC_DURATION_SECONDS, boundaryDuration);
      }
    } else if (!currentLine.hasExplicitDuration) {
      currentLine.duration = MIN_LYRIC_DURATION_SECONDS;
    }

    delete currentLine.hasExplicitDuration;
  }

  return sanitized;
}

function isIntroAdlibLine(text = "") {
  const words = getAlignmentWords(text);

  if (!words.length) {
    return false;
  }

  const adlibWords = new Set([
    "oh",
    "ooh",
    "oooh",
    "ah",
    "aah",
    "uh",
    "uhh",
    "yeah",
    "hey",
    "la",
    "na",
    "woo",
    "whoa",
    "woah",
    "mmm",
    "mm"
  ]);
  const adlibCount = words.filter((word) => adlibWords.has(word)).length;

  if (/^\([^)]*\)$/.test(normalizeWhitespace(text)) && words.length <= 5) {
    return true;
  }

  if (words.length <= 4 && adlibCount === words.length) {
    return true;
  }

  return words.length <= 3 && adlibCount >= Math.max(1, words.length - 1);
}

function shiftLyricLines(lines = [], shiftSeconds = 0, durationSeconds = 0) {
  const shift = Number(shiftSeconds || 0);

  if (!shift || !lines.length) {
    return sanitizeLyricLines(lines, durationSeconds);
  }

  return sanitizeLyricLines(
    lines.map((line) => ({
      ...line,
      start: roundTimeValue(Math.max(0, Number(line.start || 0) + shift))
    })),
    durationSeconds
  );
}

function fitLateUploadedAudioLyricsToAudioWindow(lines = [], durationSeconds = 0) {
  const sanitized = sanitizeLyricLines(lines, durationSeconds);
  const duration = Number(durationSeconds || 0);

  if (!sanitized.length || duration < 8) {
    return {
      changed: false,
      lines: sanitized,
      firstStart: sanitized[0]?.start || 0
    };
  }

  const firstStart = Number(sanitized[0]?.start || 0);
  const lastEnd = Math.max(
    ...sanitized.map((line) => Number(line.start || 0) + Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line.duration || 0)))
  );
  const lateStartThreshold = Math.max(4, duration * 0.32);

  if (firstStart <= lateStartThreshold) {
    return {
      changed: false,
      lines: sanitized,
      firstStart
    };
  }

  const targetStart = roundTimeValue(Math.min(1.2, Math.max(0.55, duration * 0.06)));
  const targetEnd = roundTimeValue(Math.max(targetStart + MIN_LYRIC_DURATION_SECONDS, duration - 0.28));
  const sourceSpan = Math.max(MIN_LYRIC_DURATION_SECONDS, lastEnd - firstStart);
  const targetSpan = Math.max(MIN_LYRIC_DURATION_SECONDS, targetEnd - targetStart);
  const scale = targetSpan / sourceSpan;

  const fittedLines = sanitized.map((line, index) => {
    const mappedStart = roundTimeValue(
      targetStart + (Number(line.start || 0) - firstStart) * scale
    );
    const nextLine = sanitized[index + 1];
    const mappedNextStart = nextLine
      ? roundTimeValue(targetStart + (Number(nextLine.start || 0) - firstStart) * scale)
      : targetEnd;
    const mappedEnd = roundTimeValue(
      clamp(
        mappedNextStart - LYRIC_TRANSITION_GAP_SECONDS,
        mappedStart + MIN_LYRIC_DURATION_SECONDS,
        targetEnd
      )
    );

    return {
      ...line,
      start: mappedStart,
      duration: roundTimeValue(Math.max(MIN_LYRIC_DURATION_SECONDS, mappedEnd - mappedStart))
    };
  });

  return {
    changed: true,
    lines: sanitizeLyricLines(fittedLines, duration),
    firstStart
  };
}

function tightenIntroLyricTiming(candidateLines = [], transcriptLines = [], durationSeconds = 0) {
  const sanitizedCandidate = sanitizeLyricLines(candidateLines, durationSeconds);
  const sanitizedTranscript = sanitizeLyricLines(transcriptLines, durationSeconds);

  if (!sanitizedCandidate.length || !sanitizedTranscript.length) {
    return {
      lines: sanitizedCandidate,
      trimmedIntroCount: 0,
      appliedShift: 0,
      openingAnchorCount: 0,
      correctionMode: "none",
      changed: false
    };
  }

  let adjustedLines = [...sanitizedCandidate];
  let trimmedIntroCount = 0;
  const firstTranscriptStart = Number(sanitizedTranscript[0]?.start || 0);

  while (
    adjustedLines.length > 1 &&
    isIntroAdlibLine(adjustedLines[0].text) &&
    Number(adjustedLines[0].start || 0) < firstTranscriptStart - 1.2
  ) {
    adjustedLines = adjustedLines.slice(1);
    trimmedIntroCount += 1;
  }

  let appliedShift = 0;
  let openingAnchorCount = 0;
  let correctionMode = "none";
  const openingAnchors = findLyricAlignmentAnchors(
    adjustedLines.slice(0, Math.min(8, adjustedLines.length)),
    sanitizedTranscript.slice(0, Math.min(8, sanitizedTranscript.length))
  ).filter(
    (anchor) =>
      anchor.sourceIndex <= 4 &&
      anchor.transcriptIndex <= 4 &&
      Number(anchor.score || 0) >= 0.4
  );
  openingAnchorCount = openingAnchors.length;
  const openingDrifts = openingAnchors.map(
    (anchor) => Number(anchor.transcriptStart || 0) - Number(anchor.sourceStart || 0)
  );
  const firstOpeningDrift = Number(openingDrifts[0] || 0);
  const remainingOpeningDrifts = openingDrifts.slice(1);
  const remainingMedianDrift = roundTimeValue(getMedianNumber(remainingOpeningDrifts));
  const isolatedOpeningLeadDrift =
    openingAnchors.length >= 3 &&
    firstOpeningDrift > 1.2 &&
    remainingOpeningDrifts.length >= 2 &&
    Math.abs(remainingMedianDrift) <= 1 &&
    Math.abs(firstOpeningDrift - remainingMedianDrift) >= 1.4;

  if (isolatedOpeningLeadDrift) {
    const firstOpeningAnchor = openingAnchors[0];

    adjustedLines = sanitizeLyricLines(
      adjustedLines.map((line, index) =>
        index === firstOpeningAnchor.sourceIndex
          ? {
              ...line,
              start: roundTimeValue(Math.max(0, Number(firstOpeningAnchor.transcriptStart || 0)))
            }
          : line
      ),
      durationSeconds
    );
    appliedShift = roundTimeValue(firstOpeningDrift);
    correctionMode = "isolated-opening-snap";
  } else

  if (openingAnchors.length >= 2) {
    const lastOpeningAnchor = openingAnchors[openingAnchors.length - 1];
    const openingSourceLines = adjustedLines.slice(0, lastOpeningAnchor.sourceIndex + 1);
    const openingTranscriptLines = sanitizedTranscript.slice(0, lastOpeningAnchor.transcriptIndex + 1);
    const alignedOpening = alignLyricLinesToTranscription(
      openingSourceLines,
      openingTranscriptLines,
      durationSeconds
    ).lines;
    const trailingDrifts = openingDrifts.slice(Math.max(0, openingDrifts.length - 2));
    const trailingShift = roundTimeValue(getMedianNumber(trailingDrifts));
    const remainingLines = adjustedLines.slice(lastOpeningAnchor.sourceIndex + 1);
    const retimedRemainder =
      remainingLines.length && Math.abs(trailingShift) >= 0.18
        ? shiftLyricLines(remainingLines, trailingShift, durationSeconds)
        : sanitizeLyricLines(remainingLines, durationSeconds);

    adjustedLines = sanitizeLyricLines(
      [...alignedOpening, ...retimedRemainder],
      durationSeconds
    );
    appliedShift = trailingShift;
    correctionMode = "opening-anchor-fit";
  } else if (openingAnchors.length === 1) {
    const [singleAnchor] = openingAnchors;
    const singleAnchorShift = Number(singleAnchor.transcriptStart || 0) - Number(singleAnchor.sourceStart || 0);

    if (Math.abs(singleAnchorShift) > 1.1 && Math.abs(singleAnchorShift) < 14) {
      adjustedLines = sanitizeLyricLines(
        adjustedLines.map((line, index) =>
          index === singleAnchor.sourceIndex
            ? {
                ...line,
                start: roundTimeValue(Math.max(0, Number(singleAnchor.transcriptStart || 0)))
              }
            : line
        ),
        durationSeconds
      );
      appliedShift = roundTimeValue(singleAnchorShift);
      correctionMode = "single-anchor-snap";
    }
  }

  return {
    lines: adjustedLines,
    trimmedIntroCount,
    appliedShift,
    openingAnchorCount,
    correctionMode,
    changed:
      trimmedIntroCount > 0 ||
      Math.abs(appliedShift) >= 0.05 ||
      correctionMode !== "none"
  };
}

function calibrateLyricTimingAgainstTranscript(
  candidateLines = [],
  transcriptLines = [],
  durationSeconds = 0,
  options = {}
) {
  const sanitizedCandidate = sanitizeLyricLines(candidateLines, durationSeconds);
  const sanitizedTranscript = sanitizeLyricLines(transcriptLines, durationSeconds);
  const minimumAnchorScore = Number(options.minimumAnchorScore || 0.42);

  if (!sanitizedCandidate.length || !sanitizedTranscript.length) {
    return {
      lines: sanitizedCandidate,
      changed: false,
      appliedShift: 0,
      anchorCount: 0,
      inlierAnchorCount: 0
    };
  }

  const anchors = findLyricAlignmentAnchors(sanitizedCandidate, sanitizedTranscript).filter(
    (anchor) => Number(anchor.score || 0) >= minimumAnchorScore
  );

  if (anchors.length < 3) {
    return {
      lines: sanitizedCandidate,
      changed: false,
      appliedShift: 0,
      anchorCount: anchors.length,
      inlierAnchorCount: 0
    };
  }

  const signedDrifts = anchors.map(
    (anchor) => Number(anchor.transcriptStart || 0) - Number(anchor.sourceStart || 0)
  );
  const baselineMedianShift = roundTimeValue(getMedianNumber(signedDrifts));
  const inlierAnchors = anchors.filter(
    (anchor) =>
      Math.abs(
        (Number(anchor.transcriptStart || 0) - Number(anchor.sourceStart || 0)) - baselineMedianShift
      ) <= 0.75
  );

  if (inlierAnchors.length < 2) {
    return {
      lines: sanitizedCandidate,
      changed: false,
      appliedShift: 0,
      anchorCount: anchors.length,
      inlierAnchorCount: inlierAnchors.length
    };
  }

  const inlierDrifts = inlierAnchors.map(
    (anchor) => Number(anchor.transcriptStart || 0) - Number(anchor.sourceStart || 0)
  );
  const finalMedianShift = roundTimeValue(getMedianNumber(inlierDrifts));
  const minInlierDrift = inlierDrifts.reduce((smallest, value) => Math.min(smallest, value), inlierDrifts[0]);
  const maxInlierDrift = inlierDrifts.reduce((largest, value) => Math.max(largest, value), inlierDrifts[0]);
  const inlierSpread = Math.abs(maxInlierDrift - minInlierDrift);

  if (Math.abs(finalMedianShift) < 0.12 || Math.abs(finalMedianShift) > 2.6 || inlierSpread > 0.85) {
    return {
      lines: sanitizedCandidate,
      changed: false,
      appliedShift: 0,
      anchorCount: anchors.length,
      inlierAnchorCount: inlierAnchors.length
    };
  }

  return {
    lines: shiftLyricLines(sanitizedCandidate, finalMedianShift, durationSeconds),
    changed: true,
    appliedShift: finalMedianShift,
    anchorCount: anchors.length,
    inlierAnchorCount: inlierAnchors.length
  };
}

function buildFallbackLines(payload, durationSeconds) {
  const title = payload.song?.title || payload.title || "Untitled Track";
  const artist = payload.song?.artist || payload.channelTitle || "Unknown Artist";
  const duration = Math.max(Number(durationSeconds || 0), 18);

  return [
    {
      text: title,
      start: 1.5,
      duration: 4.8
    },
    {
      text: artist,
      start: 7.4,
      duration: 4.4
    },
    {
      text: "Lyrics unavailable for this video",
      start: Math.min(14, Math.max(11.5, duration * 0.12)),
      duration: 5.4
    }
  ];
}

function getLyricTimelineDuration(lines = []) {
  return lines.reduce((maxDuration, line) => {
    const start = Math.max(0, Number(line?.start || 0));
    const duration = Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line?.duration || 0));
    return Math.max(maxDuration, start + duration);
  }, 0);
}

function smoothTranscribedLyricGaps(lines = [], durationSeconds = 0) {
  if (!lines.length) {
    return lines;
  }

  const duration = Number(durationSeconds || 0);
  const smoothed = [];

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = { ...lines[index] };
    const nextLine = lines[index + 1];
    smoothed.push(currentLine);

    if (!nextLine) {
      continue;
    }

    const currentEnd =
      currentLine.start +
      Math.min(
        MAX_LYRIC_HOLD_SECONDS,
        Math.max(MIN_LYRIC_DURATION_SECONDS, currentLine.duration || 0)
      );
    const gap = nextLine.start - currentEnd;

    if (gap <= MAX_TRANSCRIBED_GAP_SECONDS) {
      continue;
    }

    let fillerStart = currentEnd + Math.min(1.2, gap * 0.25);

    while (fillerStart < nextLine.start - MIN_LYRIC_DURATION_SECONDS) {
      const fillerEnd = Math.min(nextLine.start - 0.35, fillerStart + GAP_FILL_HOLD_SECONDS);

      if (fillerEnd - fillerStart >= MIN_LYRIC_DURATION_SECONDS) {
        smoothed.push({
          text: currentLine.text,
          start: fillerStart,
          duration: fillerEnd - fillerStart
        });
      }

      fillerStart += GAP_FILL_HOLD_SECONDS + 1.1;
    }
  }

  return smoothed.filter((line) => !duration || line.start < duration - 0.1);
}

function normalizeAlignmentText(text = "") {
  return `${text || ""}`
    .toLowerCase()
    .replace(/\[[^\]]*]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAlignmentWords(text = "") {
  return normalizeAlignmentText(text)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
}

function countSharedAlignmentWords(leftWords = [], rightWords = []) {
  const rightCounts = new Map();

  rightWords.forEach((word) => {
    rightCounts.set(word, (rightCounts.get(word) || 0) + 1);
  });

  let sharedCount = 0;

  leftWords.forEach((word) => {
    const remaining = rightCounts.get(word) || 0;

    if (remaining <= 0) {
      return;
    }

    sharedCount += 1;
    rightCounts.set(word, remaining - 1);
  });

  return sharedCount;
}

function scoreLyricAlignment(leftText = "", rightText = "") {
  const leftNormalized = normalizeAlignmentText(leftText);
  const rightNormalized = normalizeAlignmentText(rightText);

  if (!leftNormalized || !rightNormalized) {
    return 0;
  }

  if (leftNormalized === rightNormalized) {
    return 1;
  }

  const leftWords = getAlignmentWords(leftNormalized);
  const rightWords = getAlignmentWords(rightNormalized);

  if (!leftWords.length || !rightWords.length) {
    return 0;
  }

  const sharedCount = countSharedAlignmentWords(leftWords, rightWords);
  const overlapScore = sharedCount / Math.max(leftWords.length, rightWords.length, 1);
  const leftJoined = leftWords.join(" ");
  const rightJoined = rightWords.join(" ");
  const containsScore =
    leftJoined.includes(rightJoined) || rightJoined.includes(leftJoined) ? 0.22 : 0;
  const prefixScore =
    leftWords[0] === rightWords[0] ? 0.12 : leftWords.slice(0, 2).join(" ") === rightWords.slice(0, 2).join(" ") ? 0.18 : 0;
  const sizePenalty =
    Math.abs(leftWords.length - rightWords.length) /
    Math.max(leftWords.length, rightWords.length, 1);

  return clamp(overlapScore + containsScore + prefixScore - sizePenalty * 0.18, 0, 1);
}

function findLyricAlignmentAnchors(sourceLines = [], transcriptLines = []) {
  const anchors = [];
  let transcriptCursor = 0;

  for (let sourceIndex = 0; sourceIndex < sourceLines.length; sourceIndex += 1) {
    const sourceLine = sourceLines[sourceIndex];
    const sourceWords = getAlignmentWords(sourceLine.text);

    if (!sourceWords.length) {
      continue;
    }

    const searchStart = Math.max(0, transcriptCursor - 1);
    const searchEnd = Math.min(transcriptLines.length - 1, transcriptCursor + 10);
    let bestMatch = null;

    for (let transcriptIndex = searchStart; transcriptIndex <= searchEnd; transcriptIndex += 1) {
      const transcriptLine = transcriptLines[transcriptIndex];
      const score = scoreLyricAlignment(sourceLine.text, transcriptLine.text);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          sourceIndex,
          transcriptIndex,
          sourceStart: sourceLine.start,
          transcriptStart: transcriptLine.start,
          score
        };
      }
    }

    const minimumScore = sourceWords.length <= 3 ? 0.34 : sourceWords.length <= 5 ? 0.4 : 0.46;

    if (bestMatch && bestMatch.score >= minimumScore) {
      anchors.push(bestMatch);
      transcriptCursor = bestMatch.transcriptIndex + 1;
    }
  }

  return anchors;
}

function alignLyricLinesToTranscription(sourceLines = [], transcriptLines = [], durationSeconds = 0) {
  const sanitizedSource = sanitizeLyricLines(sourceLines, durationSeconds);
  const sanitizedTranscript = sanitizeLyricLines(transcriptLines, durationSeconds);

  if (!sanitizedSource.length || !sanitizedTranscript.length) {
    return {
      lines: sanitizedSource,
      anchorCount: 0,
      anchors: []
    };
  }

  const anchors = findLyricAlignmentAnchors(sanitizedSource, sanitizedTranscript);

  if (!anchors.length) {
    return {
      lines: sanitizedSource,
      anchorCount: 0,
      anchors: []
    };
  }

  const alignedStarts = sanitizedSource.map((line, index) => {
    const exactAnchor = anchors.find((anchor) => anchor.sourceIndex === index);

    if (exactAnchor) {
      return exactAnchor.transcriptStart;
    }

    const previousAnchor = [...anchors].reverse().find((anchor) => anchor.sourceIndex < index);
    const nextAnchor = anchors.find((anchor) => anchor.sourceIndex > index);

    if (previousAnchor && nextAnchor) {
      const sourceSpan = nextAnchor.sourceIndex - previousAnchor.sourceIndex;
      const progress = sourceSpan > 0 ? (index - previousAnchor.sourceIndex) / sourceSpan : 0;
      return previousAnchor.transcriptStart + (nextAnchor.transcriptStart - previousAnchor.transcriptStart) * progress;
    }

    if (previousAnchor) {
      return sanitizedSource[index].start + (previousAnchor.transcriptStart - previousAnchor.sourceStart);
    }

    if (nextAnchor) {
      return sanitizedSource[index].start + (nextAnchor.transcriptStart - nextAnchor.sourceStart);
    }

    return sanitizedSource[index].start;
  });

  const alignedLines = sanitizedSource.map((line, index) => {
    const nextStart = alignedStarts[index + 1];
    const fallbackEnd = line.start + Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line.duration || 0));
    const unclampedStart = Math.max(0, alignedStarts[index]);
    const minimumStart = index > 0 ? alignedStarts[index - 1] + 0.12 : 0;
    const start = roundTimeValue(Math.max(unclampedStart, minimumStart));
    const endBoundary = Number(durationSeconds || 0) > 0 ? Number(durationSeconds) : fallbackEnd;
    const naturalEnd = nextStart
      ? Math.max(start + MIN_LYRIC_DURATION_SECONDS, nextStart - LYRIC_TRANSITION_GAP_SECONDS)
      : Math.max(start + MIN_LYRIC_DURATION_SECONDS, fallbackEnd);
    const duration = roundTimeValue(
      clamp(naturalEnd - start, MIN_LYRIC_DURATION_SECONDS, Math.max(MIN_LYRIC_DURATION_SECONDS, endBoundary - start))
    );

    return {
      text: line.text,
      start,
      duration
    };
  });

  return {
    lines: alignedLines.filter((line) => !durationSeconds || line.start < durationSeconds - 0.1),
    anchorCount: anchors.length,
    anchors
  };
}

function getLyricCoverageMetrics(lines = [], durationSeconds = 0) {
  const sanitizedLines = sanitizeLyricLines(lines, durationSeconds);
  const effectiveDuration = Math.max(
    Number(durationSeconds || 0),
    getLyricTimelineDuration(sanitizedLines),
    MIN_RENDER_DURATION_SECONDS
  );
  const meaningfulLines = sanitizedLines.filter(
    (line) => getAlignmentWords(line.text).length >= 2
  );
  const coveredSeconds = meaningfulLines.reduce(
    (sum, line) => sum + Math.min(MAX_LYRIC_HOLD_SECONDS, Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line.duration || 0))),
    0
  );

  return {
    lineCount: sanitizedLines.length,
    meaningfulCount: meaningfulLines.length,
    coverageRatio: effectiveDuration > 0 ? coveredSeconds / effectiveDuration : 0
  };
}

function shouldRomanizeTeluguLyrics(lines = [], payload = {}) {
  const sampledText = sanitizeLyricLines(lines, 0)
    .slice(0, 16)
    .map((line) => line.text)
    .join(" ");
  const titleText = normalizeWhitespace(
    `${payload?.title || ""} ${payload?.channelTitle || ""} ${payload?.song?.title || ""} ${payload?.song?.artist || ""}`
  );

  if (containsTeluguScript(sampledText) || containsTeluguScript(titleText)) {
    return true;
  }

  if (containsRomanizedTeluguHint(titleText) || containsRomanizedTeluguHint(sampledText)) {
    return true;
  }

  if (
    (String(payload?.syncMode || "").toLowerCase() === "transcribed" ||
      String(payload?.videoId || "").startsWith("upload-")) &&
    (containsIndicPhoneticScript(sampledText) || containsRomanizedTeluguHint(sampledText))
  ) {
    return true;
  }

  return !sampledText && /\btelugu\b/i.test(titleText);
}

function shouldPreferAudioTranscription(lines = [], durationSeconds = 0, syncMode = "none") {
  const metrics = getLyricCoverageMetrics(lines, durationSeconds);
  const duration = Math.max(Number(durationSeconds || 0), MIN_RENDER_DURATION_SECONDS);

  if (!metrics.lineCount) {
    return true;
  }

  if (duration >= 30 && metrics.meaningfulCount < 3) {
    return true;
  }

  if (duration >= 60 && metrics.meaningfulCount < Math.max(4, Math.round(duration / 45))) {
    return true;
  }

  if (duration >= 24 && metrics.coverageRatio < 0.14) {
    return true;
  }

  if (
    syncMode === "captions" &&
    (metrics.meaningfulCount < Math.max(4, Math.round(duration / 50)) || metrics.coverageRatio < 0.22)
  ) {
    return true;
  }

  return false;
}

function getSourceTimingMetrics(lines = [], durationSeconds = 0) {
  const sanitizedLines = sanitizeLyricLines(lines, durationSeconds);
  const coverageMetrics = getLyricCoverageMetrics(sanitizedLines, durationSeconds);
  const effectiveDuration = Math.max(
    Number(durationSeconds || 0),
    getLyricTimelineDuration(sanitizedLines),
    MIN_RENDER_DURATION_SECONDS
  );
  const intervals = mergeTimingIntervals(
    sanitizedLines.map((line) => ({
      start: line.start,
      end: line.start + Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line.duration || 0))
    })),
    0.35
  );
  const firstStart = intervals[0]?.start ?? Number(sanitizedLines[0]?.start || 0);
  const lastEnd = intervals.at(-1)?.end ?? getLyricTimelineDuration(sanitizedLines);
  const maxGapSeconds = intervals.slice(1).reduce((largestGap, interval, index) => {
    const previous = intervals[index];
    return Math.max(largestGap, Math.max(0, interval.start - previous.end));
  }, 0);
  const averageDuration = sanitizedLines.length
    ? sanitizedLines.reduce(
        (sum, line) => sum + Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line.duration || 0)),
        0
      ) / sanitizedLines.length
    : 0;
  const minimumMeaningfulCount = Math.max(5, Math.min(12, Math.round(effectiveDuration / 24)));
  const reliableForSourcePacing =
    coverageMetrics.lineCount >= minimumMeaningfulCount &&
    coverageMetrics.meaningfulCount >= Math.max(4, Math.round(minimumMeaningfulCount * 0.7)) &&
    coverageMetrics.coverageRatio >= (effectiveDuration >= 120 ? 0.32 : 0.26) &&
    maxGapSeconds <= Math.max(12, effectiveDuration * 0.12);

  return {
    ...coverageMetrics,
    firstStart,
    lastEnd,
    maxGapSeconds,
    averageDuration,
    reliableForSourcePacing
  };
}

function fitLyricLinesToTranscriptWindow(lines = [], transcriptLines = [], durationSeconds = 0) {
  const sanitizedSource = sanitizeLyricLines(lines, durationSeconds);
  const sanitizedTranscript = sanitizeLyricLines(transcriptLines, durationSeconds);

  if (!sanitizedSource.length || !sanitizedTranscript.length) {
    return {
      lines: sanitizedSource,
      appliedShift: 0,
      appliedScale: 1
    };
  }

  const sourceStart = Number(sanitizedSource[0].start || 0);
  const sourceEnd = Math.max(
    sourceStart + MIN_LYRIC_DURATION_SECONDS,
    getLyricTimelineDuration(sanitizedSource)
  );
  const transcriptStart = Number(sanitizedTranscript[0].start || 0);
  const transcriptEnd = Math.max(
    transcriptStart + MIN_LYRIC_DURATION_SECONDS,
    getLyricTimelineDuration(sanitizedTranscript)
  );
  const sourceSpan = Math.max(MIN_LYRIC_DURATION_SECONDS, sourceEnd - sourceStart);
  const transcriptSpan = Math.max(MIN_LYRIC_DURATION_SECONDS, transcriptEnd - transcriptStart);
  const appliedShift = roundTimeValue(Math.max(0, transcriptStart - sourceStart));
  const appliedScale = roundTimeValue(transcriptSpan / sourceSpan);

  if (appliedShift < 0.22 && Math.abs(appliedScale - 1) < 0.04) {
    return {
      lines: sanitizedSource,
      appliedShift: 0,
      appliedScale: 1
    };
  }

  const mappedStarts = sanitizedSource.map((line) => {
    const progress = clamp((Number(line.start || 0) - sourceStart) / sourceSpan, 0, 1);
    return roundTimeValue(transcriptStart + progress * transcriptSpan);
  });

  return {
    lines: sanitizeLyricLines(
      sanitizedSource.map((line, index) => {
        const start = mappedStarts[index];
        const nextStart = mappedStarts[index + 1];
        const scaledDuration = Math.max(
          MIN_LYRIC_DURATION_SECONDS,
          roundTimeValue(Number(line.duration || MIN_LYRIC_DURATION_SECONDS) * appliedScale)
        );
        const endBoundary =
          index === sanitizedSource.length - 1 ? transcriptEnd : Math.max(start + MIN_LYRIC_DURATION_SECONDS, nextStart - LYRIC_TRANSITION_GAP_SECONDS);
        const duration = roundTimeValue(
          clamp(
            Math.min(scaledDuration, endBoundary - start),
            MIN_LYRIC_DURATION_SECONDS,
            Math.max(MIN_LYRIC_DURATION_SECONDS, transcriptEnd - start)
          )
        );

        return {
          ...line,
          start,
          duration
        };
      }),
      durationSeconds
    ),
    appliedShift,
    appliedScale
  };
}

function mergeTimingIntervals(intervals = [], maxBridgeGapSeconds = 0.85) {
  const sortedIntervals = (Array.isArray(intervals) ? intervals : [])
    .map((interval) => ({
      start: Math.max(0, Number(interval?.start || 0)),
      end: Math.max(Number(interval?.start || 0) + 0.05, Number(interval?.end || 0))
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start);

  if (!sortedIntervals.length) {
    return [];
  }

  const merged = [sortedIntervals[0]];

  for (let index = 1; index < sortedIntervals.length; index += 1) {
    const current = sortedIntervals[index];
    const previous = merged[merged.length - 1];

    if (current.start <= previous.end + maxBridgeGapSeconds) {
      previous.end = Math.max(previous.end, current.end);
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

function getTranscriptTimingMetrics(transcriptLines = [], transcriptWords = [], durationSeconds = 0) {
  const sanitizedLines = sanitizeLyricLines(transcriptLines, durationSeconds);
  const sanitizedWords = sanitizeTranscriptWords(transcriptWords, durationSeconds);
  const intervals = sanitizedWords.length >= 4
    ? mergeTimingIntervals(
        sanitizedWords.map((word) => ({
          start: word.start,
          end: word.end
        })),
        0.9
      )
    : mergeTimingIntervals(
        sanitizedLines.map((line) => ({
          start: line.start,
          end: line.start + Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line.duration || 0))
        })),
        1.1
      );
  const effectiveDuration = Math.max(
    Number(durationSeconds || 0),
    getLyricTimelineDuration(sanitizedLines),
    MIN_RENDER_DURATION_SECONDS
  );
  const firstStart = intervals[0]?.start ?? Number(sanitizedLines[0]?.start || 0);
  const lastEnd = intervals.at(-1)?.end ?? getLyricTimelineDuration(sanitizedLines);
  const coveredSeconds = intervals.reduce(
    (sum, interval) => sum + Math.max(0, interval.end - interval.start),
    0
  );
  const maxGapSeconds = intervals.slice(1).reduce((largestGap, interval, index) => {
    const previous = intervals[index];
    return Math.max(largestGap, Math.max(0, interval.start - previous.end));
  }, 0);
  const coverageRatio = effectiveDuration > 0 ? coveredSeconds / effectiveDuration : 0;
  const minimumLineCount = Math.max(5, Math.min(10, Math.round(effectiveDuration / 34)));
  const minimumWordCount = Math.max(14, Math.min(42, Math.round(effectiveDuration / 8)));
  const reliableForWindowFit =
    intervals.length > 0 &&
    firstStart < effectiveDuration - 1 &&
    lastEnd > firstStart + MIN_LYRIC_DURATION_SECONDS;
  const reliableForFullAlignment =
    reliableForWindowFit &&
    (sanitizedLines.length >= minimumLineCount || sanitizedWords.length >= minimumWordCount) &&
    coverageRatio >= (effectiveDuration >= 150 ? 0.18 : 0.2) &&
    maxGapSeconds <= Math.max(18, effectiveDuration * 0.16);

  return {
    lineCount: sanitizedLines.length,
    wordCount: sanitizedWords.length,
    firstStart,
    lastEnd,
    coveredSeconds,
    coverageRatio,
    maxGapSeconds,
    reliableForWindowFit,
    reliableForFullAlignment
  };
}

function buildSyncQualityCheck({
  sourceLines = [],
  transcriptLines = [],
  transcriptWords = [],
  durationSeconds = 0,
  syncMode = "none"
} = {}) {
  const sourceMetrics = getSourceTimingMetrics(sourceLines, durationSeconds);
  const transcriptMetrics = getTranscriptTimingMetrics(
    transcriptLines,
    transcriptWords,
    durationSeconds
  );
  const sourceIsStructured =
    syncMode === "estimated" ||
    syncMode === "caption-aligned" ||
    syncMode === "synced-lyrics";
  const rejectUnsafeTranscriptAlignment =
    sourceIsStructured &&
    sourceMetrics.reliableForSourcePacing &&
    !transcriptMetrics.reliableForFullAlignment;
  const preferSafeAudioWindowFit =
    rejectUnsafeTranscriptAlignment && transcriptMetrics.reliableForWindowFit;
  let reason = "";

  if (rejectUnsafeTranscriptAlignment) {
    if (transcriptMetrics.coverageRatio < 0.18) {
      reason = "the transcript covered too little of the song";
    } else if (transcriptMetrics.maxGapSeconds > Math.max(18, Number(durationSeconds || 0) * 0.16)) {
      reason = "the transcript had large timing gaps";
    } else {
      reason = "the transcript timing was not reliable enough";
    }
  }

  return {
    sourceMetrics,
    transcriptMetrics,
    rejectUnsafeTranscriptAlignment,
    preferSafeAudioWindowFit,
    reason
  };
}

function getAnchorDriftMetrics(anchors = []) {
  if (!Array.isArray(anchors) || !anchors.length) {
    return {
      averageDriftSeconds: Infinity,
      maxDriftSeconds: Infinity,
      driftSpreadSeconds: Infinity,
      minSignedDriftSeconds: Infinity,
      maxSignedDriftSeconds: Infinity
    };
  }

  const signedDrifts = anchors.map(
    (anchor) => Number(anchor?.transcriptStart || 0) - Number(anchor?.sourceStart || 0)
  );
  const drifts = signedDrifts.map((value) => Math.abs(value));
  const averageDriftSeconds = drifts.reduce((sum, value) => sum + value, 0) / drifts.length;
  const maxDriftSeconds = drifts.reduce((largest, value) => Math.max(largest, value), 0);
  const minSignedDriftSeconds = signedDrifts.reduce(
    (smallest, value) => Math.min(smallest, value),
    signedDrifts[0]
  );
  const maxSignedDriftSeconds = signedDrifts.reduce(
    (largest, value) => Math.max(largest, value),
    signedDrifts[0]
  );
  const driftSpreadSeconds = Math.abs(maxSignedDriftSeconds - minSignedDriftSeconds);

  return {
    averageDriftSeconds,
    maxDriftSeconds,
    driftSpreadSeconds,
    minSignedDriftSeconds,
    maxSignedDriftSeconds
  };
}

function buildStrictSyncValidationReport({
  candidateLines = [],
  transcriptLines = [],
  transcriptWords = [],
  durationSeconds = 0,
  syncMode = "none",
  transcriptDerived = false,
  referenceLines = []
} = {}) {
  const safeCandidateLines = sanitizeLyricLines(candidateLines, durationSeconds);
  const safeTranscriptLines = sanitizeLyricLines(transcriptLines, durationSeconds);
  const safeReferenceLines = sanitizeLyricLines(referenceLines, durationSeconds);
  const candidateMetrics = getSourceTimingMetrics(safeCandidateLines, durationSeconds);
  const transcriptMetrics = getTranscriptTimingMetrics(
    safeTranscriptLines,
    transcriptWords,
    durationSeconds
  );
  const referenceMetrics = getSourceTimingMetrics(
    safeReferenceLines.length ? safeReferenceLines : safeCandidateLines,
    durationSeconds
  );
  const anchors = findLyricAlignmentAnchors(safeCandidateLines, safeTranscriptLines);
  const anchorCount = anchors.length;
  const anchorCoverageRatio =
    candidateMetrics.meaningfulCount > 0 ? anchorCount / candidateMetrics.meaningfulCount : 0;
  const averageAnchorScore =
    anchorCount > 0
      ? anchors.reduce((sum, anchor) => sum + Number(anchor?.score || 0), 0) / anchorCount
      : 0;
  const driftMetrics = getAnchorDriftMetrics(anchors);
  const effectiveDuration = Math.max(
    Number(durationSeconds || 0),
    getLyricTimelineDuration(safeCandidateLines),
    MIN_RENDER_DURATION_SECONDS
  );
  const minimumMeaningfulCount = Math.max(4, Math.min(12, Math.round(effectiveDuration / 32)));
  const minimumAnchorCount = transcriptDerived
    ? Math.max(2, Math.min(10, Math.round(candidateMetrics.meaningfulCount * 0.18)))
    : Math.max(3, Math.min(12, Math.round(candidateMetrics.meaningfulCount * 0.24)));
  const minimumAnchorCoverage = transcriptDerived
    ? 0.22
    : syncMode === "synced-lyrics"
      ? 0.34
      : syncMode === "caption-aligned" || syncMode === "captions"
        ? 0.3
        : 0.28;
  const minimumAverageAnchorScore = transcriptDerived ? 0.4 : 0.46;
  const maximumAverageDriftSeconds = transcriptDerived ? 0.95 : 1.35;
  const maximumDriftSeconds = transcriptDerived ? 2.6 : 4.6;
  const minimumCoverageRatio = transcriptDerived ? 0.14 : 0.12;
  const minimumTranscriptDerivedLineCount = Math.max(8, Math.min(18, Math.round(effectiveDuration / 18)));
  const minimumTranscriptDerivedWordCount = Math.max(24, Math.min(96, Math.round(effectiveDuration / 6)));
  const minimumTranscriptDerivedReferenceRatio =
    safeReferenceLines.length > 0 ? 0.52 : 0;
  const structuredSourceFallbackHasSafeAnchors =
    anchorCount === 0 ||
    (
      averageAnchorScore >= Math.max(0.4, minimumAverageAnchorScore - 0.06) &&
      driftMetrics.averageDriftSeconds <= Math.min(maximumAverageDriftSeconds, 1.2) &&
      driftMetrics.maxDriftSeconds <= Math.min(maximumDriftSeconds, 2.8) &&
      driftMetrics.driftSpreadSeconds <= 2.1
    );
  const structuredSourceFallbackApproved =
    !transcriptDerived &&
    (syncMode === "estimated" || syncMode === "caption-aligned" || syncMode === "synced-lyrics") &&
    candidateMetrics.reliableForSourcePacing &&
    candidateMetrics.meaningfulCount >= Math.max(7, minimumMeaningfulCount) &&
    candidateMetrics.coverageRatio >= 0.22 &&
    transcriptMetrics.reliableForWindowFit &&
    !transcriptMetrics.reliableForFullAlignment &&
    structuredSourceFallbackHasSafeAnchors &&
    (
      transcriptMetrics.coverageRatio < 0.18 ||
      transcriptMetrics.maxGapSeconds > Math.max(18, effectiveDuration * 0.16) ||
      transcriptMetrics.wordCount < Math.max(22, Math.round(effectiveDuration / 7)) ||
      candidateMetrics.lineCount >= Math.max(10, transcriptMetrics.lineCount * 1.6)
    );
  let approved = true;
  let reason =
    "The app could not verify that the lyrics match the detected vocals closely enough.";
  let approvalMode = transcriptDerived ? "transcript-derived" : "aligned-anchors";

  if (!safeCandidateLines.length) {
    approved = false;
    reason = "No usable lyric lines were available after the audio sync pass.";
  } else if (structuredSourceFallbackApproved) {
    approved = false;
    reason =
      "The audio transcription was too sparse to confirm that the lyric sheet stays locked to the vocals.";
  } else if (!transcriptMetrics.reliableForWindowFit) {
    approved = false;
    reason = "The audio transcription did not provide stable enough timing to verify the lyrics safely.";
  } else if (transcriptDerived && !transcriptMetrics.reliableForFullAlignment) {
    approved = false;
    reason = "The audio-built lyric fallback was too sparse across the song to trust as the final lyric sheet.";
  } else if (candidateMetrics.meaningfulCount < minimumMeaningfulCount) {
    approved = false;
    reason = "The lyric result did not contain enough meaningful lines to prove the timing was correct.";
  } else if (candidateMetrics.coverageRatio < minimumCoverageRatio) {
    approved = false;
    reason = "The lyric result covered too little of the song to verify the sync confidently.";
  } else if (transcriptDerived && candidateMetrics.lineCount < minimumTranscriptDerivedLineCount) {
    approved = false;
    reason = "The audio-built lyric fallback produced too few timed lines for a full-song render.";
  } else if (transcriptDerived && transcriptMetrics.wordCount < minimumTranscriptDerivedWordCount) {
    approved = false;
    reason = "The audio transcription did not detect enough words to safely rebuild the full lyric sheet.";
  } else if (
    transcriptDerived &&
    safeReferenceLines.length &&
    candidateMetrics.lineCount < Math.max(8, Math.round(referenceMetrics.lineCount * minimumTranscriptDerivedReferenceRatio))
  ) {
    approved = false;
    reason = "The audio-built lyric fallback was much sparser than the full lyric sheet, so it was rejected.";
  } else if (transcriptDerived && anchorCount < minimumAnchorCount) {
    approved = false;
    reason = "Too few audio-built lyric lines matched the validation transcript strongly enough.";
  } else if (transcriptDerived && anchorCoverageRatio < Math.max(0.22, minimumAnchorCoverage - 0.04)) {
    approved = false;
    reason = "The audio-built lyric lines did not match enough of the validation transcript across the song.";
  } else if (transcriptDerived && averageAnchorScore < minimumAverageAnchorScore) {
    approved = false;
    reason = "The audio-built lyric text matched the validation transcript too weakly to trust the timing.";
  } else if (transcriptDerived && driftMetrics.averageDriftSeconds > maximumAverageDriftSeconds) {
    approved = false;
    reason = "The audio-built lyric timing still drifted too far from the validation transcript.";
  } else if (transcriptDerived && driftMetrics.maxDriftSeconds > maximumDriftSeconds) {
    approved = false;
    reason = "Some audio-built lyric lines were still too far away from the validation transcript.";
  } else if (!transcriptDerived && anchorCount < minimumAnchorCount) {
    approved = false;
    reason = "Too few lyric lines matched the detected vocals strongly enough.";
  } else if (!transcriptDerived && anchorCoverageRatio < minimumAnchorCoverage) {
    approved = false;
    reason = "The lyric sheet did not match enough of the detected vocals across the song.";
  } else if (!transcriptDerived && averageAnchorScore < minimumAverageAnchorScore) {
    approved = false;
    reason = "The lyric text matched the detected vocals too weakly to trust the timing.";
  } else if (!transcriptDerived && driftMetrics.averageDriftSeconds > maximumAverageDriftSeconds) {
    approved = false;
    reason = "The lyric timing still drifted too far from the detected vocals.";
  } else if (!transcriptDerived && driftMetrics.maxDriftSeconds > maximumDriftSeconds) {
    approved = false;
    reason = "Some lyric lines were still too far away from the detected vocals.";
  }

  return {
    approved,
    reason,
    approvalMode,
    anchorCount,
    anchorCoverageRatio,
    averageAnchorScore,
    averageDriftSeconds: driftMetrics.averageDriftSeconds,
    maxDriftSeconds: driftMetrics.maxDriftSeconds,
    candidateMetrics,
    transcriptMetrics,
    transcriptDerived,
    referenceMetrics
  };
}

function formatStrictSyncApprovalSummary(report = {}) {
  if (report.approvalMode === "structured-source-fallback") {
    return `Strict sync verification kept the full lyric sheet because the detected audio transcript was too sparse to safely replace it.`;
  }

  if (report.approvalMode === "validation-transcript-intro-preserved") {
    return `Strict sync verification approved the render by keeping the trusted intro lyrics and matching the rest to the audio transcript.`;
  }

  return report.transcriptDerived
    ? `Strict sync verification approved the render using audio-built lyrics (${report.anchorCount} lyric anchors, average drift ${roundTimeValue(report.averageDriftSeconds)}s).`
    : `Strict sync verification approved the render (${report.anchorCount} lyric/audio anchors, average drift ${roundTimeValue(report.averageDriftSeconds)}s).`;
}

function createStrictSyncValidationError(report = {}) {
  const reason = normalizeWhitespace(
    report.reason || "The app could not verify that the lyrics match the audio closely enough."
  );

  return createRenderError(
    `${reason} The app stopped before rendering so users do not get an out-of-sync lyric video.`,
    422
  );
}

function fitLyricLinesToAudioWindow(lines = [], durationSeconds = 0, leadInSeconds = 0) {
  const sanitizedSource = sanitizeLyricLines(lines, durationSeconds);

  if (!sanitizedSource.length || !durationSeconds) {
    return {
      lines: sanitizedSource,
      appliedShift: 0,
      appliedScale: 1
    };
  }

  const sourceStart = Number(sanitizedSource[0].start || 0);
  const sourceEnd = Math.max(
    sourceStart + MIN_LYRIC_DURATION_SECONDS,
    getLyricTimelineDuration(sanitizedSource)
  );
  const sourceSpan = Math.max(MIN_LYRIC_DURATION_SECONDS, sourceEnd - sourceStart);
  const targetStart = clamp(Number(leadInSeconds || 0), 0, Math.max(0, durationSeconds - 2));
  const targetEnd = Math.max(
    targetStart + MIN_LYRIC_DURATION_SECONDS,
    Math.max(targetStart + MIN_LYRIC_DURATION_SECONDS, Number(durationSeconds) - 1.2)
  );
  const targetSpan = Math.max(MIN_LYRIC_DURATION_SECONDS, targetEnd - targetStart);
  const appliedShift = roundTimeValue(targetStart - sourceStart);
  const appliedScale = roundTimeValue(targetSpan / sourceSpan);

  if (Math.abs(appliedShift) < 0.22 && Math.abs(appliedScale - 1) < 0.03) {
    return {
      lines: sanitizedSource,
      appliedShift: 0,
      appliedScale: 1
    };
  }

  const mappedStarts = sanitizedSource.map((line) => {
    const progress = clamp((Number(line.start || 0) - sourceStart) / sourceSpan, 0, 1);
    return roundTimeValue(targetStart + progress * targetSpan);
  });

  return {
    lines: sanitizeLyricLines(
      sanitizedSource.map((line, index) => {
        const start = mappedStarts[index];
        const nextStart = mappedStarts[index + 1];
        const scaledDuration = Math.max(
          MIN_LYRIC_DURATION_SECONDS,
          roundTimeValue(Number(line.duration || MIN_LYRIC_DURATION_SECONDS) * appliedScale)
        );
        const endBoundary =
          index === sanitizedSource.length - 1
            ? targetEnd
            : Math.max(start + MIN_LYRIC_DURATION_SECONDS, nextStart - LYRIC_TRANSITION_GAP_SECONDS);
        const duration = roundTimeValue(
          clamp(
            Math.min(scaledDuration, endBoundary - start),
            MIN_LYRIC_DURATION_SECONDS,
            Math.max(MIN_LYRIC_DURATION_SECONDS, targetEnd - start)
          )
        );

        return {
          ...line,
          start,
          duration
        };
      }),
      durationSeconds
    ),
    appliedShift,
    appliedScale
  };
}

function sanitizeTranscriptWords(words = [], durationSeconds = 0) {
  const duration = Number(durationSeconds || 0);

  return (Array.isArray(words) ? words : [])
    .map((word) => {
      const start = Math.max(0, Number(word?.start || 0));
      const end = Math.max(start + 0.05, Number(word?.end || start + 0.2));

      return {
        text: normalizeWhitespace(word?.text || word?.word || ""),
        start,
        end: duration ? Math.min(end, duration) : end
      };
    })
    .filter((word) => word.text && word.end > word.start && (!duration || word.start < duration - 0.05))
    .sort((left, right) => left.start - right.start);
}

function buildTranscriptWordTimeline(transcriptLines = [], transcriptWords = [], durationSeconds = 0) {
  const sanitizedWords = sanitizeTranscriptWords(transcriptWords, durationSeconds);

  if (sanitizedWords.length >= 4) {
    return sanitizedWords;
  }

  const approximatedWords = [];

  sanitizeLyricLines(transcriptLines, durationSeconds).forEach((line) => {
    const tokens = tokenizeLyricWords(line.text);
    const lineStart = Number(line.start || 0);
    const lineDuration = Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line.duration || 0));

    if (!tokens.length) {
      return;
    }

    const step = lineDuration / Math.max(tokens.length, 1);

    tokens.forEach((token, index) => {
      const start = roundTimeValue(lineStart + step * index);
      const end = roundTimeValue(index === tokens.length - 1 ? lineStart + lineDuration : start + step);

      approximatedWords.push({
        text: token,
        start,
        end
      });
    });
  });

  return sanitizeTranscriptWords(approximatedWords, durationSeconds);
}

function getLyricTimingWeight(line = {}) {
  const wordCount = Math.max(1, tokenizeLyricWords(line.text).length);
  const durationHint = clamp(
    Number(line.duration || 0),
    MIN_LYRIC_DURATION_SECONDS,
    MAX_LYRIC_HOLD_SECONDS
  );

  return wordCount * 0.92 + durationHint * 0.38;
}

function getTranscriptTimeAtProgress(words = [], progress = 0, useEnd = false) {
  if (!words.length) {
    return 0;
  }

  if (words.length === 1) {
    return roundTimeValue(useEnd ? Number(words[0].end || 0) : Number(words[0].start || 0));
  }

  const clampedProgress = clamp(progress, 0, 1);
  const scaledIndex = clampedProgress * (words.length - 1);
  const lowerIndex = Math.floor(scaledIndex);
  const upperIndex = Math.min(words.length - 1, lowerIndex + 1);
  const blend = scaledIndex - lowerIndex;
  const lowerTime = Number(useEnd ? words[lowerIndex].end : words[lowerIndex].start);
  const upperTime = Number(useEnd ? words[upperIndex].end : words[upperIndex].start);

  return roundTimeValue(lowerTime + (upperTime - lowerTime) * blend);
}

function alignLyricLinesToWordTimeline(
  sourceLines = [],
  transcriptLines = [],
  transcriptWords = [],
  durationSeconds = 0
) {
  const sanitizedSource = sanitizeLyricLines(sourceLines, durationSeconds);
  const timelineWords = buildTranscriptWordTimeline(
    transcriptLines,
    transcriptWords,
    durationSeconds
  );
  const minimumWordCount = Math.max(8, Math.min(40, sanitizedSource.length * 2));

  if (!sanitizedSource.length || timelineWords.length < minimumWordCount) {
    return {
      lines: sanitizedSource,
      applied: false,
      wordCount: timelineWords.length,
      appliedShift: 0,
      appliedScale: 1
    };
  }

  const sourceWeights = sanitizedSource.map((line) => getLyricTimingWeight(line));
  const totalWeight = sourceWeights.reduce((sum, value) => sum + value, 0) || sanitizedSource.length;
  const progressMarkers = [0];
  let runningWeight = 0;

  sourceWeights.forEach((weight) => {
    runningWeight += weight;
    progressMarkers.push(clamp(runningWeight / totalWeight, 0, 1));
  });

  const transcriptStart = Number(timelineWords[0]?.start || 0);
  const transcriptEnd = Math.max(
    transcriptStart + MIN_LYRIC_DURATION_SECONDS,
    Number(timelineWords.at(-1)?.end || transcriptStart + MIN_LYRIC_DURATION_SECONDS)
  );
  const sourceStart = Number(sanitizedSource[0]?.start || 0);
  const sourceEnd = Math.max(
    sourceStart + MIN_LYRIC_DURATION_SECONDS,
    getLyricTimelineDuration(sanitizedSource)
  );
  const mappedLines = [];

  for (let index = 0; index < sanitizedSource.length; index += 1) {
    const line = sanitizedSource[index];
    const rawStart = getTranscriptTimeAtProgress(timelineWords, progressMarkers[index], false);
    const rawEnd = getTranscriptTimeAtProgress(timelineWords, progressMarkers[index + 1], true);
    const nextRawStart =
      index < sanitizedSource.length - 1
        ? getTranscriptTimeAtProgress(timelineWords, progressMarkers[index + 1], false)
        : transcriptEnd;
    const previousLine = mappedLines[index - 1];
    const minimumStart = previousLine
      ? Number(previousLine.start || 0) + MIN_LYRIC_DURATION_SECONDS * 0.22
      : 0;
    const start = roundTimeValue(Math.max(rawStart, minimumStart));
    const endBoundary =
      index === sanitizedSource.length - 1
        ? (durationSeconds ? Math.min(Number(durationSeconds), transcriptEnd + 0.4) : transcriptEnd)
        : Math.max(start + MIN_LYRIC_DURATION_SECONDS, nextRawStart - LYRIC_TRANSITION_GAP_SECONDS);
    const duration = roundTimeValue(
      clamp(
        Math.min(Math.max(start + MIN_LYRIC_DURATION_SECONDS, rawEnd), endBoundary) - start,
        MIN_LYRIC_DURATION_SECONDS,
        Math.max(MIN_LYRIC_DURATION_SECONDS, (durationSeconds || transcriptEnd) - start)
      )
    );

    mappedLines.push({
      text: line.text,
      start,
      duration
    });
  }

  const appliedShift = roundTimeValue(transcriptStart - sourceStart);
  const appliedScale = roundTimeValue(
    (transcriptEnd - transcriptStart) /
      Math.max(MIN_LYRIC_DURATION_SECONDS, sourceEnd - sourceStart)
  );

  return {
    lines: sanitizeLyricLines(mappedLines, durationSeconds),
    applied: true,
    wordCount: timelineWords.length,
    appliedShift,
    appliedScale
  };
}

function applyLyricOffset(lines = [], offsetSeconds = 0, durationSeconds = 0) {
  const offset = Number(offsetSeconds || 0);

  if (!offset || !lines.length) {
    return lines;
  }

  const shiftedLines = lines.map((line) => ({
    ...line,
    start: roundTimeValue(Math.max(0, Number(line.start || 0) + offset))
  }));

  return sanitizeLyricLines(shiftedLines, durationSeconds);
}

function getLyricOffsetSeconds(syncMode = "none", options = {}) {
  const teluguRomanized = Boolean(options?.teluguRomanized);

  if (syncMode === "synced-lyrics") {
    return 0.05;
  }

  if (syncMode === "caption-aligned" || syncMode === "captions") {
    return 0.04;
  }

  if (syncMode === "transcribed") {
    return teluguRomanized ? -0.34 : -0.14;
  }

  return LYRIC_AUDIO_OFFSET_SECONDS;
}

function resolveLyricFontZoomValue(value = 100) {
  return clamp(Number(value || 100), 60, 200) / 100;
}

function transformLyricTextForPreset(text = "", lyricStylePreset = LYRIC_STYLE_PRESETS.auto) {
  const normalizedText = normalizeWhitespace(text);

  if (!normalizedText) {
    return "";
  }

  if (["comic", "aa", "bounce", "spotlight", "neon", "glitch", "karaoke"].includes(lyricStylePreset?.key)) {
    return normalizedText.toUpperCase();
  }

  if (lyricStylePreset?.key === "fulllength") {
    return normalizedText.toUpperCase();
  }

  return normalizedText;
}

function getSelectedStyleVariant(lyricStylePreset, line = {}, index = 0) {
  if (!lyricStylePreset || lyricStylePreset.key === "auto") {
    return pickLyricAnimationVariant(line, index);
  }

  return lyricStylePreset.key;
}

function resolveLyricDisplayEnd(line, nextLine, durationSeconds = 0) {
  const start = Math.max(0, Number(line?.start || 0));
  const rawLineDuration = Math.max(0, Number(line?.duration || 0));
  const cappedDuration = Math.min(
    Math.max(MIN_LYRIC_DURATION_SECONDS, rawLineDuration),
    MAX_SMART_LYRIC_DISPLAY_SECONDS
  );
  const timelineLimit = durationSeconds
    ? Math.max(start + 0.12, Number(durationSeconds))
    : Number.POSITIVE_INFINITY;
  const naturalEnd = Math.min(start + cappedDuration, timelineLimit);

  if (!nextLine) {
    const smartFinalDuration = resolveSmartLyricDisplayDuration(line, cappedDuration);
    return Math.min(
      timelineLimit,
      start + Math.min(Math.max(cappedDuration, smartFinalDuration), MAX_LYRIC_HOLD_SECONDS)
    );
  }

  const nextStart = Math.max(start + 0.12, Number(nextLine?.start || start + MIN_LYRIC_DURATION_SECONDS));
  const safeUpperBound = Math.max(start + 0.12, nextStart - LYRIC_TRANSITION_GAP_SECONDS);
  const smartDisplayDuration = resolveSmartLyricDisplayDuration(line, safeUpperBound - start);
  const preferredEnd = Math.min(
    Math.max(
      naturalEnd,
      start + Math.min(smartDisplayDuration, MAX_LYRIC_HOLD_SECONDS)
    ),
    safeUpperBound
  );
  const denseMinimumSeconds = clamp((safeUpperBound - start) * 0.97, 0.18, 0.94);
  const minimumEnd = start + Math.min(denseMinimumSeconds, Math.max(0.18, safeUpperBound - start));

  return clamp(preferredEnd, minimumEnd, safeUpperBound);
}

function normalizeRenderLyricPlacement(placement = null) {
  if (!placement || typeof placement !== "object") {
    return null;
  }

  const parsedX = Number(placement.x);
  const parsedY = Number(placement.y);

  if (!Number.isFinite(parsedX) || !Number.isFinite(parsedY)) {
    return null;
  }

  const anchor = ["left", "center", "right"].includes(`${placement.anchor || ""}`.toLowerCase())
    ? `${placement.anchor}`.toLowerCase()
    : "center";

  return {
    x: clamp(parsedX, 0.04, 0.96),
    y: clamp(parsedY, 0.12, 0.9),
    anchor
  };
}

function getRenderLyricAlignmentTag(anchor = "center") {
  if (anchor === "left") {
    return "\\an4";
  }

  if (anchor === "right") {
    return "\\an6";
  }

  return "\\an5";
}

function resolveSmartLyricDisplayDuration(line = {}, availableSeconds = 0) {
  const baseDuration = Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line?.duration || 0));
  const safeAvailableSeconds = Math.max(MIN_LYRIC_DURATION_SECONDS, Number(availableSeconds || 0));
  const text = normalizeWhitespace(line?.text || "");
  const words = tokenizeLyricWords(text);
  const wordCount = words.length;
  const characterCount = text.replace(/\s+/g, "").length;
  const punctuationPause = /[,.!?]$/.test(text) ? 0.28 : /[,;:]$/.test(text) ? 0.18 : 0;

  if (!wordCount) {
    return Math.min(baseDuration, safeAvailableSeconds);
  }

  const pacingTargetSeconds = clamp(
    wordCount <= 2
      ? wordCount * 1.08 + punctuationPause
      : wordCount * 0.74 + Math.min(1.35, characterCount / 20) + punctuationPause,
    1.45,
    MAX_SMART_LYRIC_DISPLAY_SECONDS
  );

  return Math.min(
    safeAvailableSeconds,
    Math.max(baseDuration, pacingTargetSeconds)
  );
}

function createAssSubtitleContent(
  lines,
  payload,
  durationSeconds,
  videoSize = VIDEO_SIZE,
  options = {}
) {
  const isPortrait = videoSize.height > videoSize.width;
  const emojiAssetMap = options.emojiAssetMap || {};
  const contrastMap = Array.isArray(options.contrastMap) ? options.contrastMap : [];
  const placementMap = Array.isArray(options.placementMap) ? options.placementMap : [];
  const lyricStylePreset = resolveLyricStylePreset(payload?.lyricStyle || "auto");
  const lyricFontPreset = resolveLyricFontPreset(payload?.lyricFont || "arial");
  const renderFontPreset = lyricFontPreset;
  const lyricFontName = renderFontPreset.fontName;
  const useStyleColor = Boolean(payload?.useStyleColor);
  const customStyleColorHex = useStyleColor
    ? normalizeHexColor(payload?.styleColor || "#7fe8ff")
    : "";
  const defaultPrimaryTextHex = customStyleColorHex || "#ffffff";
  const neonColorHex = customStyleColorHex || "#7fe8ff";
  const neonGlowValue = resolveNeonGlowValue(payload?.neonGlow || 70);
  const neonGlowStrength = neonGlowValue / 100;
  const lyricFontZoom = resolveLyricFontZoomValue(payload?.lyricFontZoom || 100);
  const fontZoomBoost = Math.max(0.84, lyricFontZoom);
  const baseFontSize = clamp(
    Math.round(
        Math.min(videoSize.width, videoSize.height) *
        (isPortrait ? 0.074 : 0.082) *
        lyricStylePreset.fontScale *
        renderFontPreset.sizeScale *
        lyricFontZoom
    ),
    Math.round((isPortrait ? 40 : 48) * Math.min(1, fontZoomBoost)),
    Math.round((isPortrait ? 58 : 84) * Math.max(1, fontZoomBoost))
  );
  const fontScaleX = Math.round(renderFontPreset.scaleX || 100);
  const fontScaleY = Math.round(renderFontPreset.scaleY || 100);
  const fontBaseSpacing = Number(renderFontPreset.spacing || 0);
  const wrapLength = isPortrait ? lyricStylePreset.wrapPortrait : lyricStylePreset.wrapLandscape;
  const safeMargin = isPortrait ? 28 : 48;
  const customLyricPlacement = normalizeRenderLyricPlacement(payload?.lyricPlacement);
  const centerAnchor = {
    x: Math.round(videoSize.width * (customLyricPlacement?.x ?? 0.5)),
    y: Math.round(
      videoSize.height *
        (customLyricPlacement?.y ??
          (isPortrait ? lyricStylePreset.yFactorPortrait : lyricStylePreset.yFactorLandscape))
    )
  };
  const cinematicTravelX = isPortrait ? 92 : 138;
  const cinematicTravelY = isPortrait ? 24 : 18;
  const bounceTravelY = isPortrait ? 52 : 40;
  const lineYOffsetPattern = [0, isPortrait ? -12 : -10, isPortrait ? 16 : 10, isPortrait ? -6 : -6];
  const emojiOverlays = [];
  const lyricEvents = lines.flatMap((line, index) => {
    const nextLine = lines[index + 1];
    const rawEndSeconds = resolveLyricDisplayEnd(line, nextLine, durationSeconds);
    const contrastStyle = contrastMap[index] || getContrastStyleForBrightness(128);
    const selectedVariant = getSelectedStyleVariant(lyricStylePreset, line, index);
    const accentHex = customStyleColorHex || contrastStyle.accentHex || LYRIC_ACCENT_COLORS[index % LYRIC_ACCENT_COLORS.length];
    const primaryTextHex = customStyleColorHex || contrastStyle.textHex;
    const displayText = transformLyricTextForPreset(line.text, lyricStylePreset);
    const effectiveWrapLength =
      selectedVariant === "fulllength"
        ? (isPortrait ? Math.min(wrapLength, 8) : Math.min(wrapLength, 10))
        : wrapLength;
    const plainWrappedText = wrapText(displayText, effectiveWrapLength);
    const textLines = `${plainWrappedText}`.split("\\N").filter(Boolean);
    const lineCount = textLines.length || 1;
    const longestLineLength = textLines.reduce((maxLength, item) => Math.max(maxLength, item.length), 0);
    const plainWords = tokenizeLyricWords(displayText);
    const wrappedWordLines = wrapLyricWords(plainWords, effectiveWrapLength);
    const boxWidth = Math.round(
      clamp(longestLineLength * (baseFontSize * 0.5) + (isPortrait ? 80 : 120), 260, videoSize.width - safeMargin * 2)
    );
    const boxHeight = Math.round(
      clamp(baseFontSize * 0.92 * lineCount + (isPortrait ? 22 : 28), 90, videoSize.height * 0.28)
    );
    let targetCenterX = centerAnchor.x;
    let targetCenterY = centerAnchor.y + lineYOffsetPattern[index % lineYOffsetPattern.length];
    let alignmentTag = getRenderLyricAlignmentTag(customLyricPlacement?.anchor || "center");

    switch (selectedVariant) {
      case "comic":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.43 : 0.48));
        break;
      case "aa":
        {
          const preferredSide = placementMap[index]?.side || "left";
          const isLeftSide = preferredSide !== "right";
          targetCenterX = Math.round(videoSize.width * (isLeftSide ? (isPortrait ? 0.15 : 0.18) : (isPortrait ? 0.85 : 0.82)));
          targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.62 : 0.58));
          alignmentTag = isLeftSide ? "\\an7" : "\\an9";
        }
        break;
      case "line-by-line":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.45 : 0.49));
        break;
      case "cinematic":
      case "cinematic-left":
      case "cinematic-right":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.35 : 0.4));
        break;
      case "bounce":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.44 : 0.5));
        break;
      case "side-by-side":
        targetCenterX = Math.round(videoSize.width * (index % 2 === 0 ? 0.24 : 0.76));
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.45 : 0.48));
        alignmentTag = index % 2 === 0 ? "\\an4" : "\\an6";
        break;
      case "typewriter":
        targetCenterX = Math.round(videoSize.width * (isPortrait ? 0.12 : 0.15));
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.44 : 0.5));
        alignmentTag = "\\an4";
        break;
      case "spotlight":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.31 : 0.36));
        break;
      case "magic":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.52 : 0.56));
        break;
      case "neon":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.4 : 0.46));
        break;
      case "glitch":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.42 : 0.48));
        break;
      case "karaoke":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.66 : 0.73));
        break;
      case "whisper":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.36 : 0.42));
        break;
      case "stacked":
        targetCenterX = Math.round(videoSize.width * (isPortrait ? 0.14 : 0.18));
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.39 : 0.44));
        alignmentTag = "\\an4";
        break;
      case "minimal":
        targetCenterY = Math.round(videoSize.height * (isPortrait ? 0.58 : 0.64));
        break;
      case "fulllength":
        {
          const preferredSide = placementMap[index]?.side || (index % 2 === 0 ? "left" : "right");
          const isLeftSide = preferredSide === "left";
          targetCenterX = Math.round(videoSize.width * (isLeftSide ? (isPortrait ? 0.2 : 0.18) : (isPortrait ? 0.8 : 0.82)));
          targetCenterY = Math.round(
            videoSize.height *
              (isLeftSide
                ? (isPortrait ? 0.49 : 0.47)
                : (isPortrait ? 0.5 : 0.48))
          );
          alignmentTag = preferredSide === "left" ? "\\an4" : "\\an6";
        }
        break;
      default:
        if (lyricStylePreset.positionMode === "side") {
          targetCenterX = Math.round(videoSize.width * (index % 2 === 0 ? 0.33 : 0.67));
        }

        if (lyricStylePreset.positionMode === "stacked") {
          targetCenterY += (index % 4) * Math.round(baseFontSize * 0.32) - Math.round(baseFontSize * 0.44);
        }
        break;
    }

    if (customLyricPlacement) {
      targetCenterX = centerAnchor.x;
      targetCenterY = centerAnchor.y + lineYOffsetPattern[index % lineYOffsetPattern.length];
      alignmentTag = getRenderLyricAlignmentTag(customLyricPlacement.anchor);

      if (selectedVariant === "side-by-side") {
        const sideSpread = Math.round(videoSize.width * (isPortrait ? 0.14 : 0.12));
        targetCenterX += index % 2 === 0 ? -sideSpread : sideSpread;
        alignmentTag = index % 2 === 0 ? "\\an4" : "\\an6";
      }
    }

    const centerX = Math.round(
      clamp(targetCenterX, safeMargin + boxWidth / 2, videoSize.width - safeMargin - boxWidth / 2)
    );
    const centerY = Math.round(
      clamp(targetCenterY, safeMargin + boxHeight / 2, videoSize.height - safeMargin - boxHeight / 2)
    );
    let motionProfile = buildAdaptiveLyricMotionProfile(
      line,
      selectedVariant,
      textLines
    );
    const dialogueStartSeconds = roundTimeValue(
      Math.max(0, Number(line.start || 0) - resolveLyricVisualLeadInSeconds(line, motionProfile, selectedVariant))
    );
    const minimumReadableEndSeconds = dialogueStartSeconds + Math.min(
      MAX_LYRIC_HOLD_SECONDS,
      Math.max(MIN_LYRIC_DURATION_SECONDS, Number(line.duration || 0), 0.9)
    );
    const endSeconds = roundTimeValue(
      Math.min(
        durationSeconds ? Math.max(durationSeconds, minimumReadableEndSeconds) : minimumReadableEndSeconds,
        Math.max(rawEndSeconds, minimumReadableEndSeconds)
      )
    );
    const lineDurationSeconds = Math.max(0.18, endSeconds - line.start);
    motionProfile = buildAdaptiveLyricMotionProfile(
      {
        ...line,
        duration: lineDurationSeconds
      },
      selectedVariant,
      textLines
    );
    const start = formatAssTime(dialogueStartSeconds);
    const end = formatAssTime(endSeconds);
    const revealMs = motionProfile.revealMs;
    const fadeInMs = motionProfile.fadeInMs;
    const fadeOutMs = motionProfile.fadeOutMs;
    const travelX = Math.round(cinematicTravelX * motionProfile.movementMultiplier);
    const travelY = Math.round(cinematicTravelY * motionProfile.movementMultiplier);
    const bounceY = Math.round(bounceTravelY * motionProfile.movementMultiplier);
    const lineEmojiAnchors = [...new Set(
      plainWords
        .map((word) => getLyricEmojiForWord(word))
        .filter((emoji) => emoji && emojiAssetMap[emoji])
    )].map((emoji, emojiIndex) => ({
      emoji,
      emojiIndex
    }));

    if (lineEmojiAnchors.length && selectedVariant !== "aa") {
      const emojiSize = clamp(Math.round(baseFontSize * (isPortrait ? 0.72 : 0.66)), 26, 46);
      const estimatedCharWidth = baseFontSize * 0.56;
      const blockTopY = centerY - ((wrappedWordLines.length - 1) * baseFontSize * 0.92) / 2;
      const finalWordLine = wrappedWordLines[wrappedWordLines.length - 1] || [];
      const finalLineLength = finalWordLine.reduce(
        (sum, item, itemIndex) => sum + item.word.length + (itemIndex > 0 ? 1 : 0),
        0
      );
      const finalLineStartX = centerX - (finalLineLength * estimatedCharWidth) / 2;
      const finalLineEndX = finalLineStartX + finalLineLength * estimatedCharWidth;
      const emojiBaselineY = Math.round(
        clamp(
          blockTopY + Math.max(0, wrappedWordLines.length - 1) * baseFontSize * 0.92 - baseFontSize * 0.04,
          safeMargin + emojiSize / 2,
          videoSize.height - safeMargin - emojiSize / 2
        )
      );

      lineEmojiAnchors.forEach(({ emoji, emojiIndex }) => {
        const trailingEmojiOffset = emojiSize * (isPortrait ? 1.28 : 1.12);
        const emojiCenterX = Math.round(
          clamp(
            finalLineEndX + trailingEmojiOffset + emojiSize * (emojiIndex * 1.06),
            safeMargin + emojiSize / 2,
            videoSize.width - safeMargin - emojiSize / 2
          )
        );

        emojiOverlays.push({
          emoji,
          start: line.start,
          end: Math.max(line.start + 0.84, endSeconds),
          size: emojiSize,
          x: emojiCenterX,
          y: emojiBaselineY
        });
      });
    }

    if (selectedVariant === "typewriter" || selectedVariant === "word-by-word") {
      const styledText = buildWordByWordLyricText(
        displayText,
        motionProfile.wordBuildDuration,
        effectiveWrapLength,
        {
          emojiAssetMap,
          baseTextHex: primaryTextHex
        }
      );
      const startX = alignmentTag === "\\an4"
        ? Math.max(safeMargin, centerX - Math.round(travelX * 0.5))
        : centerX + (index % 2 === 0 ? -Math.round(travelX * 0.55) : Math.round(travelX * 0.55));
      const startY = centerY + Math.round(travelY * 1.2);
      const textTag = `{${alignmentTag}\\move(${startX},${startY},${centerX},${centerY},0,${Math.round(
        revealMs * 1.1
      )})\\fad(${fadeInMs},${fadeOutMs})\\bord2.8\\shad0\\blur0.45\\fscx100\\fscy100\\fsp1.2\\b1\\c${hexToAssColor(
        primaryTextHex
      )}\\3c${hexToAssColor(contrastStyle.outlineHex)}}`;

      return [
        `Dialogue: 0,${start},${end},WordBuildText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "comic") {
      const styledText = buildStyledLyricText(displayText, accentHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: customStyleColorHex || "#111111"
      });
      const comicRotation = index % 2 === 0 ? -1.4 : 1.2;
      const textTag = `{\\an5\\move(${centerX},${centerY + Math.round(bounceY * 1.05)},${centerX},${centerY},0,${Math.round(
        revealMs * 1.05
      )})\\fad(${fadeInMs},${fadeOutMs})\\fscx84\\fscy84\\bord1.2\\shad0\\blur0.05\\frz${comicRotation}\\fsp0.8\\t(0,130,\\fscx112\\fscy112)\\t(130,260,\\fscx100\\fscy100\\frz0)\\c${hexToAssColor(
        customStyleColorHex || "#111111"
      )}\\3c${hexToAssColor(customStyleColorHex || "#111111")}}`;

      return [
        `Dialogue: 0,${start},${end},ComicText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "aa") {
      const aaLines = buildAaWordLines(displayText, isPortrait).slice(0, isPortrait ? 5 : 4);
      const preferredSide = customLyricPlacement?.anchor === "right"
        ? "right"
        : customLyricPlacement?.anchor === "center"
          ? "left"
          : (placementMap[index]?.side || "left");
      const isLeftSide = preferredSide !== "right";
      const anchorX = Math.round(
        clamp(
          customLyricPlacement
            ? centerAnchor.x
            : videoSize.width * (isLeftSide ? (isPortrait ? 0.16 : 0.18) : (isPortrait ? 0.84 : 0.82)),
          safeMargin + 24,
          videoSize.width - safeMargin - 24
        )
      );
      const anchorY = Math.round(
        clamp(
          customLyricPlacement
            ? centerAnchor.y
            : videoSize.height * (isPortrait ? 0.61 : 0.57),
          safeMargin + baseFontSize,
          videoSize.height - safeMargin - baseFontSize
        )
      );
      const aaMajorHex = customStyleColorHex || "#ef8c43";
      const aaSupportHex = customStyleColorHex || "#d97d46";
      const aaMinorHex = "#253056";
      const aaAlignmentTag = isLeftSide ? "\\an7" : "\\an9";
      const aaDirection = isLeftSide ? -1 : 1;
      const aaLayouts = (aaLines.length ? aaLines : [displayText]).map((aaLine, aaIndex) => {
        const variant = getAaLineVariant(aaLine, aaIndex);
        const fontScale = variant === "major" ? 1.28 : variant === "support" ? 0.94 : 0.76;
        const colorHex = variant === "major" ? aaMajorHex : variant === "support" ? aaSupportHex : aaMinorHex;
        const verticalStep = Math.round(baseFontSize * (variant === "major" ? 0.82 : 0.72));

        return {
          text: aaLine,
          variant,
          fontScale,
          colorHex,
          verticalStep
        };
      });
      const totalHeight = aaLayouts.reduce((sum, item) => sum + item.verticalStep, 0);
      const baseLineY = Math.round(anchorY - totalHeight / 2);
      let cursorY = baseLineY;

      return aaLayouts.map((item, aaIndex) => {
        const lineY = cursorY;
        const fontSize = Math.round(baseFontSize * item.fontScale);
        const lineSpacing = item.variant === "major" ? -0.36 : -0.12;
        const lineOutline = item.variant === "minor" ? aaMinorHex : "#161b33";
        const startX = anchorX + aaDirection * Math.round(videoSize.width * 0.025);
        cursorY += item.verticalStep;

        const textTag = `{${aaAlignmentTag}\\move(${startX},${lineY + 10},${anchorX},${lineY},0,${Math.round(
          revealMs * 0.9
        )})\\fad(${Math.round(fadeInMs * 0.78)},${Math.round(fadeOutMs * 0.78)})\\fs${fontSize}\\fscx88\\fscy108\\bord0.9\\shad0\\blur0.05\\fsp${lineSpacing.toFixed(
          2
        )}\\b1\\c${hexToAssColor(
          item.colorHex
        )}\\3c${hexToAssColor(lineOutline)}}${item.text}`;

        return `Dialogue: ${aaIndex},${start},${end},AAText,,0,0,0,,${textTag}`;
      });
    }

    if (selectedVariant === "bounce") {
      const styledText = buildStyledLyricText(displayText, accentHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: primaryTextHex
      });
      const textTag = `{\\an5\\move(${centerX},${centerY + bounceY},${centerX},${centerY},0,${Math.round(
        revealMs * 1.15
      )})\\fad(${fadeInMs},${fadeOutMs})\\fscx74\\fscy74\\bord3.4\\shad0\\blur0.25\\frz0\\t(0,120,\\fscx122\\fscy122)\\t(120,260,\\fscx100\\fscy100)\\b1\\c${hexToAssColor(
        primaryTextHex
      )}\\3c${hexToAssColor(contrastStyle.outlineHex)}}`;

      return [
        `Dialogue: 0,${start},${end},BounceText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "line-by-line") {
      const perLineDelay = motionProfile.multiLineDelay;

      return textLines.map((textLine, textLineIndex) => {
        const eventStartSeconds = Math.max(
          dialogueStartSeconds,
          Math.min(endSeconds - 0.16, line.start + perLineDelay * textLineIndex)
        );
        const eventEndSeconds = endSeconds;
        const eventY = Math.round(
          centerY + (textLineIndex - (lineCount - 1) / 2) * Math.round(baseFontSize * 0.9)
        );
        const eventText = buildStyledLyricText(textLine, accentHex, Math.max(64, wrapLength * 2), {
          emojiAssetMap,
          baseTextHex: primaryTextHex,
          disableHighlight: textLineIndex !== lineCount - 1
        });
        const textTag = `{\\an5\\move(${centerX},${eventY + 26},${centerX},${eventY},0,${Math.round(
          revealMs * 0.9
        )})\\fad(${fadeInMs},${fadeOutMs})\\fscx100\\fscy100\\bord2.8\\shad0\\blur0.2\\b1\\c${hexToAssColor(
          primaryTextHex
        )}\\3c${hexToAssColor(contrastStyle.outlineHex)}}`;

        return `Dialogue: 0,${formatAssTime(eventStartSeconds)},${formatAssTime(eventEndSeconds)},LineRevealText,,0,0,0,,${textTag}${eventText}`;
      });
    }

    if (selectedVariant === "stacked") {
      return textLines.map((textLine, textLineIndex) => {
        const laneX = Math.round(centerX + (textLineIndex % 2 === 0 ? 0 : Math.round(baseFontSize * 0.45)));
        const laneY = Math.round(
          centerY + textLineIndex * Math.round(baseFontSize * 0.92)
        );
        const lineText = buildStyledLyricText(textLine, accentHex, Math.max(64, wrapLength * 2), {
          emojiAssetMap,
          baseTextHex: primaryTextHex,
          disableHighlight: false
        });
        const textTag = `{\\an4\\move(${laneX - 42},${laneY + 16},${laneX},${laneY},0,${Math.round(
          revealMs
        )})\\fad(${fadeInMs},${fadeOutMs})\\bord3.1\\shad0\\blur0.32\\fscx100\\fscy100\\fsp0.8\\b1\\c${hexToAssColor(
          primaryTextHex
        )}\\3c${hexToAssColor(contrastStyle.outlineHex)}}`;

        return `Dialogue: 0,${start},${end},StackText,,0,0,0,,${textTag}${lineText}`;
      });
    }

    if (selectedVariant === "spotlight") {
      const styledText = buildStyledLyricText(displayText, accentHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: customStyleColorHex || "#ffffff",
        disableHighlight: true
      });
      const glowTag = `{\\an5\\move(${centerX},${centerY + Math.round(cinematicTravelY * 1.2)},${centerX},${centerY},0,${Math.round(
        revealMs * 1.15
      )})\\fad(${fadeInMs},${fadeOutMs})\\fscx112\\fscy112\\bord0\\shad0\\blur10\\fsp1.1\\b1\\1a&H58&\\c${hexToAssColor(
        customStyleColorHex || "#fff7d6"
      )}}`;
      const textTag = `{\\an5\\move(${centerX},${centerY + Math.round(cinematicTravelY * 1.2)},${centerX},${centerY},0,${Math.round(
        revealMs * 1.15
      )})\\fad(${fadeInMs},${fadeOutMs})\\fscx104\\fscy104\\bord2.2\\shad0\\blur0.6\\fsp1.1\\b1\\c${hexToAssColor(
        customStyleColorHex || "#ffffff"
      )}\\3c${hexToAssColor("#11203a")}}`;

      return [
        `Dialogue: 0,${start},${end},SpotlightGlowText,,0,0,0,,${glowTag}${styledText}`,
        `Dialogue: 1,${start},${end},SpotlightText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "magic") {
      const magicAccentHex = customStyleColorHex || "#f4d34f";
      const styledText = buildStyledLyricText(displayText, magicAccentHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: "#ffffff",
        disableHighlight: false
      });
      const magicTravelY = Math.round((isPortrait ? baseFontSize * 0.65 : baseFontSize * 0.45) * motionProfile.movementMultiplier);
      const textTag = `{\\an5\\move(${centerX},${centerY + magicTravelY},${centerX},${centerY},0,${Math.round(
        revealMs * 1.05
      )})\\fad(${Math.round(fadeInMs * 0.9)},${Math.round(fadeOutMs * 0.78)})\\fscx96\\fscy96\\bord1.6\\shad0\\blur0.7\\fsp0.3\\i1\\c${hexToAssColor(
        "#ffffff"
      )}\\3c${hexToAssColor("#171717")}\\t(0,150,\\fscx104\\fscy104)\\t(150,260,\\fscx100\\fscy100)}`;

      return [
        `Dialogue: 0,${start},${end},MagicText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "neon") {
      const neonHex = neonColorHex || accentHex || "#7fe8ff";
      const styledText = buildStyledLyricText(displayText, neonHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: neonHex,
        disableHighlight: true
      });
      const textTag = `{\\an5\\move(${centerX},${centerY + Math.round(travelY * 0.95)},${centerX},${centerY},0,${Math.round(
        revealMs * 1.05
      )})\\fad(${fadeInMs},${fadeOutMs})\\fscx102\\fscy102\\bord1.1\\shad0\\blur${(0.45 + neonGlowStrength * 2.4).toFixed(2)}\\fsp${(
        0.8 + neonGlowStrength * 1.2
      ).toFixed(2)}\\b1\\c${hexToAssColor(
        neonHex
      )}\\3c${hexToAssColor(neonHex)}}`;

      return [
        `Dialogue: 0,${start},${end},NeonText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "glitch") {
      const glitchPrimaryHex = customStyleColorHex || contrastStyle.textHex || "#ffffff";
      const glitchPinkHex = "#ff5ea8";
      const glitchCyanHex = "#38d7ff";
      const styledText = buildStyledLyricText(displayText, glitchPrimaryHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: glitchPrimaryHex,
        disableHighlight: true
      });
      const baseTag = `{\\an5\\move(${centerX + 8},${centerY + 12},${centerX},${centerY},0,${Math.round(
        revealMs
      )})\\fad(${fadeInMs},${fadeOutMs})\\fscx100\\fscy100\\bord2.6\\shad0\\blur0.25\\fsp0.9\\b1\\c${hexToAssColor(
        glitchPrimaryHex
      )}\\3c${hexToAssColor("#0f1015")}}`;
      const pinkTag = `{\\an5\\pos(${centerX - 3},${centerY + 1})\\fad(${fadeInMs},${fadeOutMs})\\1a&H3F&\\bord0\\shad0\\blur0.1\\fsp0.9\\b1\\c${hexToAssColor(
        glitchPinkHex
      )}}`;
      const cyanTag = `{\\an5\\pos(${centerX + 3},${centerY - 1})\\fad(${fadeInMs},${fadeOutMs})\\1a&H46&\\bord0\\shad0\\blur0.1\\fsp0.9\\b1\\c${hexToAssColor(
        glitchCyanHex
      )}}`;

      return [
        `Dialogue: 0,${start},${end},GlitchGhostText,,0,0,0,,${pinkTag}${styledText}`,
        `Dialogue: 1,${start},${end},GlitchGhostText,,0,0,0,,${cyanTag}${styledText}`,
        `Dialogue: 2,${start},${end},GlitchBaseText,,0,0,0,,${baseTag}${styledText}`
      ];
    }

    if (selectedVariant === "karaoke") {
      const karaokeHex = customStyleColorHex || accentHex || "#ffe17c";
      const styledText = buildStyledLyricText(displayText, karaokeHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: "#111111",
        disableHighlight: true
      });
      const textTag = `{\\an5\\move(${centerX},${centerY + 18},${centerX},${centerY},0,${Math.round(
        revealMs * 0.9
      )})\\fad(${Math.round(fadeInMs * 0.82)},${Math.round(fadeOutMs * 0.86)})\\fscx100\\fscy100\\bord0\\shad0\\blur0\\fsp0.6\\b1\\c${hexToAssColor(
        "#111111"
      )}\\3c${hexToAssColor("#111111")}}`;

      return [
        `Dialogue: 0,${start},${end},KaraokeText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "whisper") {
      const whisperHex = customStyleColorHex || contrastStyle.textHex || "#ffffff";
      const styledText = buildStyledLyricText(displayText, accentHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: whisperHex,
        disableHighlight: true
      });
      const textTag = `{\\an5\\move(${centerX},${centerY + 14},${centerX},${centerY},0,${Math.round(
        revealMs * 1.05
      )})\\fad(${Math.round(fadeInMs * 0.9)},${Math.round(fadeOutMs * 1.05)})\\1a&H18&\\fscx100\\fscy100\\bord1.2\\shad0\\blur0.7\\fsp2.1\\c${hexToAssColor(
        whisperHex
      )}\\3c${hexToAssColor(contrastStyle.outlineHex)}}`;

      return [
        `Dialogue: 0,${start},${end},WhisperText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "fulllength") {
      const posterTextHex = customStyleColorHex || contrastStyle.accentHex || accentHex;
      const posterOutlineHex = contrastStyle.outlineHex || "#1a1a1a";
      const slideDirection = index % 2 === 0 ? -1 : 1;
      const arrivalX = centerX;
      const startPosterX = centerX + slideDirection * Math.round(videoSize.width * 0.05);
      const styledText = buildStyledLyricText(displayText, posterTextHex, effectiveWrapLength, {
        emojiAssetMap,
        baseTextHex: posterTextHex,
        disableHighlight: true
      });
      const textTag = `{${alignmentTag}\\move(${startPosterX},${centerY},${arrivalX},${centerY},0,${Math.round(
        revealMs * 0.95
      )})\\fad(${Math.round(fadeInMs * 0.8)},${Math.round(fadeOutMs * 0.82)})\\fscx98\\fscy98\\bord1.4\\shad0.4\\blur0.05\\fsp-0.25\\b1\\c${hexToAssColor(
        posterTextHex
      )}\\3c${hexToAssColor(posterOutlineHex)}}`;

      return [
        `Dialogue: 0,${start},${end},FullLengthText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "minimal") {
      const styledText = buildStyledLyricText(displayText, accentHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: primaryTextHex,
        disableHighlight: true
      });
      const textTag = `{\\an5\\pos(${centerX},${centerY})\\fad(${Math.round(fadeInMs * 0.85)},${Math.round(
        fadeOutMs * 0.9
      )})\\fscx100\\fscy100\\bord2\\shad0\\blur0.15\\b1\\c${hexToAssColor(
        primaryTextHex
      )}\\3c${hexToAssColor(contrastStyle.outlineHex)}}`;

      return [
        `Dialogue: 0,${start},${end},MinimalText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    if (selectedVariant === "side-by-side") {
      const styledText = buildStyledLyricText(displayText, accentHex, wrapLength, {
        emojiAssetMap,
        baseTextHex: primaryTextHex
      });
      const slideDirection = index % 2 === 0 ? -1 : 1;
      const slideStartX = centerX + slideDirection * Math.round(travelX * 0.95);
      const textTag = `{${alignmentTag}\\move(${slideStartX},${centerY},${centerX},${centerY},0,${Math.round(
        revealMs * 1.1
      )})\\fad(${fadeInMs},${fadeOutMs})\\bord3.2\\shad0\\blur0.38\\fsp0.55\\b1\\c${hexToAssColor(
        primaryTextHex
      )}\\3c${hexToAssColor(contrastStyle.outlineHex)}}`;

      return [
        `Dialogue: 0,${start},${end},SideText,,0,0,0,,${textTag}${styledText}`
      ];
    }

    const cinematicDirection =
      selectedVariant === "cinematic-right"
        ? 1
        : selectedVariant === "cinematic"
          ? (index % 2 === 0 ? -1 : 1)
          : -1;
    const startX = centerX + cinematicDirection * travelX;
    const startY = centerY + travelY;
    const styledText = buildStyledLyricText(displayText, accentHex, wrapLength, {
      emojiAssetMap,
      baseTextHex: primaryTextHex
    });
    const textTag = `{${alignmentTag}\\move(${startX},${startY},${centerX},${centerY},0,${Math.round(
      revealMs * 1.4
    )})\\fad(${fadeInMs},${fadeOutMs})\\fscx106\\fscy106\\bord3\\shad0\\blur1.05\\fsp1.3\\frz${
      cinematicDirection * -1.2
    }\\t(0,${Math.round(revealMs * 1.4)},\\fscx100\\fscy100\\blur0.36\\frz0)\\b1\\c${hexToAssColor(
      primaryTextHex
    )}\\3c${hexToAssColor(contrastStyle.outlineHex)}}`;

    return [
      `Dialogue: 0,${start},${end},CinematicText,,0,0,0,,${textTag}${styledText}`
    ];
  });

  return {
    content: [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${videoSize.width}`,
    `PlayResY: ${videoSize.height}`,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: CinematicText,${lyricFontName},${baseFontSize},${hexToAssColor(defaultPrimaryTextHex)},${hexToAssColor(defaultPrimaryTextHex)},&H00121212,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.42).toFixed(2)},0,1,3.0,0,5,0,0,0,1`,
    `Style: BounceText,${lyricFontName},${Math.round(baseFontSize * 1.02)},${hexToAssColor(defaultPrimaryTextHex)},${hexToAssColor(defaultPrimaryTextHex)},&H00101010,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.12).toFixed(2)},0,1,3.2,0,5,0,0,0,1`,
    `Style: WordBuildText,${lyricFontName},${Math.round(baseFontSize * 0.98)},&H00FFFFFF,&H008A8A8A,&H00111111,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.58).toFixed(2)},0,1,3.0,0,5,0,0,0,1`,
    `Style: ComicText,${lyricFontName},${Math.round(baseFontSize * 1.02)},${hexToAssColor(customStyleColorHex || "#111111")},${hexToAssColor(customStyleColorHex || "#111111")},${hexToAssColor(customStyleColorHex || "#111111")},&H00F4F4F4,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.48).toFixed(2)},0,3,10,0,5,36,36,40,1`,
    `Style: AAText,${lyricFontName},${Math.round(baseFontSize * 1.04)},${hexToAssColor(customStyleColorHex || "#ef8c43")},${hexToAssColor(customStyleColorHex || "#ef8c43")},&H00161B33,&H00000000,-1,0,0,0,88,108,-0.24,0,1,1.0,0,7,34,34,34,1`,
    `Style: SpotlightGlowText,${lyricFontName},${Math.round(baseFontSize * 1.08)},${hexToAssColor(customStyleColorHex || "#fff7d6")},${hexToAssColor(customStyleColorHex || "#fff7d6")},&H00000000,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 1.02).toFixed(2)},0,1,0,0,5,46,46,38,1`,
    `Style: SpotlightText,${lyricFontName},${Math.round(baseFontSize * 1.05)},${hexToAssColor(customStyleColorHex || "#ffffff")},${hexToAssColor(customStyleColorHex || "#ffffff")},&H003A2011,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.72).toFixed(2)},0,1,2.6,0,5,46,46,38,1`,
    `Style: MagicText,${lyricFontName},${Math.round(baseFontSize * 0.98)},&H00FFFFFF,&H00FFFFFF,&H00151515,&H00000000,-1,-1,0,0,${Math.round(fontScaleX * 0.98)},${Math.round(fontScaleY * 1.04)},${(fontBaseSpacing + 0.18).toFixed(2)},0,1,2.2,0,5,0,0,0,1`,
    `Style: NeonText,${lyricFontName},${Math.round(baseFontSize * 1.04)},${hexToAssColor(neonColorHex)},${hexToAssColor(neonColorHex)},${hexToAssColor(neonColorHex)},&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.3 + neonGlowStrength * 1.2).toFixed(2)},0,1,${(0.7 + neonGlowStrength * 1.7).toFixed(2)},0,5,0,0,0,1`,
    `Style: GlitchBaseText,${lyricFontName},${Math.round(baseFontSize * 1.02)},&H00FFFFFF,&H00FFFFFF,&H00111111,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.6).toFixed(2)},0,1,2.4,0,5,0,0,0,1`,
    `Style: GlitchGhostText,${lyricFontName},${Math.round(baseFontSize * 1.02)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.6).toFixed(2)},0,1,0,0,5,0,0,0,1`,
    `Style: KaraokeText,${lyricFontName},${Math.round(baseFontSize * 0.94)},&H00111111,&H00111111,&H00111111,${hexToAssColor(customStyleColorHex || "#ffe17c")},-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.18).toFixed(2)},0,3,8,0,5,34,34,34,1`,
    `Style: WhisperText,${lyricFontName},${Math.round(baseFontSize * 0.84)},${hexToAssColor(customStyleColorHex || "#ffffff")},${hexToAssColor(customStyleColorHex || "#ffffff")},&H00121212,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 1.7).toFixed(2)},0,1,1.4,0,5,0,0,0,1`,
    `Style: MinimalText,${lyricFontName},${Math.round(baseFontSize * 0.88)},${hexToAssColor(defaultPrimaryTextHex)},${hexToAssColor(defaultPrimaryTextHex)},&H00121212,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.04).toFixed(2)},0,1,2.2,0,5,0,0,0,1`,
    `Style: SideText,${lyricFontName},${Math.round(baseFontSize * 0.96)},${hexToAssColor(defaultPrimaryTextHex)},${hexToAssColor(defaultPrimaryTextHex)},&H00111111,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.36).toFixed(2)},0,1,3.0,0,4,0,0,0,1`,
    `Style: StackText,${lyricFontName},${Math.round(baseFontSize * 0.95)},${hexToAssColor(defaultPrimaryTextHex)},${hexToAssColor(defaultPrimaryTextHex)},&H00111111,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.5).toFixed(2)},0,1,3.0,0,4,0,0,0,1`,
    `Style: LineRevealText,${lyricFontName},${Math.round(baseFontSize * 0.97)},${hexToAssColor(defaultPrimaryTextHex)},${hexToAssColor(defaultPrimaryTextHex)},&H00121212,&H00000000,-1,0,0,0,${fontScaleX},${fontScaleY},${(fontBaseSpacing + 0.28).toFixed(2)},0,1,2.8,0,5,0,0,0,1`,
    `Style: FullLengthText,${lyricFontName},${Math.round(baseFontSize * 1.16)},${hexToAssColor(customStyleColorHex || "#d98c64")},${hexToAssColor(customStyleColorHex || "#d98c64")},&H00181E3B,&H00000000,-1,0,0,0,88,108,-0.18,0,1,1.25,0.35,4,42,42,34,1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...lyricEvents
    ].join("\n"),
    emojiOverlays
  };
}

function buildAtmosphereOrbAssetFilter(spec) {
  return [
    "format=rgba",
    `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*exp(-pow((X-W/2)/(W*${spec.radiusX}),2)-pow((Y-H/2)/(H*${spec.radiusY}),2))'`,
    `gblur=sigma=${spec.blur}:steps=2`,
    "pad=iw+220:ih+220:110:110:color=black@0"
  ].join(",");
}

function buildAnimatedBackgroundFilter(videoSize = VIDEO_SIZE, options = {}) {
  const scaleMultiplier = Math.max(0.1, Number(options.scaleMultiplier || 0.14));
  const outputFps = clamp(Math.round(Number(options.outputFps || OUTPUT_FPS)), 12, OUTPUT_FPS);
  const scaledWidth = roundEven(
    videoSize.width + Math.max(120, Math.round(videoSize.width * scaleMultiplier))
  );
  const scaledHeight = roundEven(
    videoSize.height + Math.max(90, Math.round(videoSize.height * scaleMultiplier))
  );
  const cropX = Math.max(0, Math.round((scaledWidth - videoSize.width) / 2));
  const cropY = Math.max(0, Math.round((scaledHeight - videoSize.height) / 2));
  const driftX = Math.max(14, Math.round(videoSize.width * 0.012));
  const driftY = Math.max(10, Math.round(videoSize.height * 0.012));
  const shakeX = Math.max(6, Math.round(videoSize.width * 0.0045));
  const shakeY = Math.max(4, Math.round(videoSize.height * 0.0038));
  const microShakeX = Math.max(2, Math.round(videoSize.width * 0.0018));
  const microShakeY = Math.max(2, Math.round(videoSize.height * 0.0016));
  const noiseStrength = Number(options.noiseStrength ?? 4);
  const brightness = Number(options.brightness ?? 0.01);
  const saturation = Number(options.saturation ?? 0.98);

  return [
    `fps=${outputFps}`,
    "format=rgba",
    `scale=${scaledWidth}:${scaledHeight}:flags=lanczos`,
    `crop=${videoSize.width}:${videoSize.height}:x='${cropX}+${driftX}*sin(t*0.2)+${shakeX}*sin(t*1.75)+${microShakeX}*sin(t*7.2)':y='${cropY}+${driftY}*cos(t*0.17)+${shakeY}*cos(t*1.5)+${microShakeY}*sin(t*6.4)'`,
    `noise=alls=${noiseStrength}:allf=u`,
    `eq=brightness=${brightness}:saturation=${saturation}`,
    "setsar=1"
  ].join(",");
}

function createFilterScript(videoSize = VIDEO_SIZE, emojiOverlays = [], emojiAssetEntries = [], fontsDirRelative = "", renderProfile = {}) {
  const filters = [];
  filters.push(`[0:v]${buildAnimatedBackgroundFilter(videoSize, {
    scaleMultiplier: 0.14,
    noiseStrength: 4,
    brightness: 0.01,
    saturation: 0.98,
    outputFps: renderProfile.outputFps
  })}[bg]`);
  filters.push(
    fontsDirRelative
      ? `[bg]subtitles=lyrics.ass:fontsdir=${fontsDirRelative}[subbed]`
      : "[bg]subtitles=lyrics.ass[subbed]"
  );
  appendEmojiOverlayFilters(filters, "subbed", emojiOverlays, emojiAssetEntries);
  return filters.join(";");
}

function appendEmojiOverlayFilters(
  filters = [],
  baseLabel = "subbed",
  emojiOverlays = [],
  emojiAssetEntries = []
) {
  if (!emojiOverlays.length || !emojiAssetEntries.length) {
    filters.push(`[${baseLabel}]copy[vout]`);
    return;
  }

  const labelByEmoji = new Map();
  const usesByEmoji = new Map();

  emojiAssetEntries.forEach((entry, index) => {
    const uses = emojiOverlays.filter((overlay) => overlay.emoji === entry.emoji).length;

    if (!uses) {
      return;
    }

    const scaledLabel = `emojiasset${index}`;
    if (uses === 1) {
      filters.push(
        `[${index + 1}:v]scale=${entry.size}:${entry.size}:flags=lanczos,format=rgba[${scaledLabel}]`
      );
      labelByEmoji.set(entry.emoji, [scaledLabel]);
      return;
    }

    const splitLabels = Array.from({ length: uses }, (_, splitIndex) => `${scaledLabel}_${splitIndex}`);
    filters.push(
      `[${index + 1}:v]scale=${entry.size}:${entry.size}:flags=lanczos,format=rgba,split=${uses}[${splitLabels.join(
        "]["
      )}]`
    );
    labelByEmoji.set(entry.emoji, splitLabels);
  });

  let currentLabel = baseLabel;
  emojiOverlays.forEach((overlay, index) => {
    const labels = labelByEmoji.get(overlay.emoji) || [];
    const useIndex = usesByEmoji.get(overlay.emoji) || 0;
    const emojiLabel = labels[useIndex];

    if (!emojiLabel) {
      return;
    }

    usesByEmoji.set(overlay.emoji, useIndex + 1);
    const nextLabel = index === emojiOverlays.length - 1 ? "vout" : `emojiout${index}`;
    const x = Math.max(0, Math.round(overlay.x - overlay.size / 2));
    const y = Math.max(0, Math.round(overlay.y - overlay.size / 2));
    filters.push(
      `[${currentLabel}][${emojiLabel}]overlay=${x}:${y}:enable='between(t,${roundTimeValue(
        overlay.start
      )},${roundTimeValue(overlay.end)})':format=auto[${nextLabel}]`
    );
    currentLabel = nextLabel;
  });

  if (currentLabel !== "vout") {
    filters.push(`[${currentLabel}]copy[vout]`);
  }
}

function parseProgressTime(line) {
  const match = `${line || ""}`.match(/time=(\d+:\d+:\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  const [hours, minutes, seconds] = match[1].split(":");
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function summarizeErrorMessage(error) {
  const rawMessage = normalizeWhitespace(error?.message || `${error || ""}`);

  if (!rawMessage) {
    return "Unknown error";
  }

  return rawMessage.length > 220 ? `${rawMessage.slice(0, 217)}...` : rawMessage;
}

async function runCommand(command, args, options = {}) {
  const { cwd, onStdout, onStderr, timeoutMs = 0, maxAttempts = COMMAND_RETRY_DELAYS_MS.length + 1 } = options;

  const shouldRetry = (error) => {
    const message = `${error?.message || error || ""}`;
    const code = `${error?.code || ""}`;
    return TRANSIENT_PROCESS_ERROR_REGEX.test(message) || TRANSIENT_PROCESS_ERROR_REGEX.test(code);
  };

  const runOnce = () =>
    new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });

      let stdout = "";
      let stderr = "";
      let settled = false;
      let timer = null;

      function finishWithError(error) {
        if (settled) {
          return;
        }

        settled = true;
        if (timer) {
          clearTimeout(timer);
        }
        reject(error);
      }

      function finishWithSuccess(payload) {
        if (settled) {
          return;
        }

        settled = true;
        if (timer) {
          clearTimeout(timer);
        }
        resolve(payload);
      }

      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        if (onStdout) {
          onStdout(text);
        }
      });

      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        if (onStderr) {
          onStderr(text);
        }
      });

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          child.kill();
          finishWithError(
            new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(" ")}`)
          );
        }, timeoutMs);
      }

      child.on("error", finishWithError);
      child.on("close", (code) => {
        if (settled) {
          return;
        }

        if (code === 0) {
          finishWithSuccess({ stdout, stderr });
          return;
        }

        finishWithError(
          new Error(
            `Command failed with exit code ${code}: ${stderr || stdout || `${command} ${args.join(" ")}`}`
          )
        );
      });
    });

  let attempt = 0;
  let lastError = null;

  while (attempt < Math.max(1, Number(maxAttempts || 1))) {
    try {
      return await runOnce();
    } catch (error) {
      lastError = error;
      attempt += 1;

      if (attempt >= Math.max(1, Number(maxAttempts || 1)) || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = COMMAND_RETRY_DELAYS_MS[Math.min(attempt - 1, COMMAND_RETRY_DELAYS_MS.length - 1)] || 900;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error(`Command failed: ${command}`);
}

async function canUseVideoEncoder(candidate) {
  try {
    await runCommand(
      ffmpegPath,
      [
        "-hide_banner",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=320x180:d=1",
        "-frames:v",
        "1",
        ...candidate.outputArgs,
        "-f",
        "null",
        "-"
      ],
      {
        timeoutMs: 15000
      }
    );
    return true;
  } catch {
    return false;
  }
}

async function resolveVideoEncoder() {
  if (!videoEncoderPromise) {
    videoEncoderPromise = (async () => {
      for (const candidate of VIDEO_ENCODER_CANDIDATES) {
        if (await canUseVideoEncoder(candidate)) {
          return candidate;
        }
      }

      return getSoftwareVideoEncoder();
    })();
  }

  return videoEncoderPromise;
}

function getSoftwareVideoEncoder(profile = {}) {
  return {
    name: "libx264",
    label: "x264 software",
    outputArgs: [
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      profile.encoderCrf || (profile.fastMode ? "26" : "22")
    ]
  };
}

async function runWithConcurrency(items, concurrency, worker) {
  const limit = Math.max(1, Number(concurrency || 1));
  const pendingItems = [...items];
  const workers = Array.from({ length: Math.min(limit, pendingItems.length) }, async () => {
    while (pendingItems.length) {
      const nextItem = pendingItems.shift();
      await worker(nextItem);
    }
  });

  await Promise.all(workers);
}

function buildBackgroundTimeline(lines = [], durationSeconds, profile = {}) {
  const duration = Math.max(Number(durationSeconds || 0), MIN_RENDER_DURATION_SECONDS);
  const targetSceneCount = clamp(
    Math.round(duration / Math.max(1, Number(profile.targetSceneDivisor || 16))) + 1,
    Math.max(1, Number(profile.minSceneCount || MIN_BACKGROUND_SCENE_COUNT)),
    Math.max(1, Number(profile.maxSceneCount || MAX_BACKGROUND_SCENE_COUNT))
  );
  const targetTransitionCount = Math.max(1, targetSceneCount - 1);
  const lyricTimes = [...new Set(
    lines
      .map((line) => roundTimeValue(line?.start || 0))
      .filter((time) => time >= 2.4 && time < duration - 0.9)
  )].sort((left, right) => left - right);
  const transitionTargets = Array.from({ length: targetTransitionCount }, (_, index) =>
    roundTimeValue((duration * (index + 1)) / targetSceneCount)
  );
  const selectedTimes = [];
  let lastTime = 0;

  for (const target of transitionTargets) {
    const candidateTimes = lyricTimes.filter(
      (time) =>
        time >= lastTime + Math.max(1, Number(profile.minSceneSeconds || MIN_BACKGROUND_SCENE_SECONDS))
        && time < duration - 0.75
    );

    let chosenTime = null;

    if (candidateTimes.length) {
      chosenTime = candidateTimes.reduce((bestMatch, time) => {
        if (bestMatch === null) {
          return time;
        }

        return Math.abs(time - target) < Math.abs(bestMatch - target) ? time : bestMatch;
      }, null);
    }

    if (chosenTime === null) {
      chosenTime = roundTimeValue(
        Math.min(
          duration - 0.75,
          Math.max(lastTime + Math.max(1, Number(profile.minSceneSeconds || MIN_BACKGROUND_SCENE_SECONDS)), target)
        )
      );
    }

    if (chosenTime <= lastTime || chosenTime >= duration - 0.75) {
      continue;
    }

    selectedTimes.push(chosenTime);
    lastTime = chosenTime;
  }

  const sceneStarts = [0, ...selectedTimes];
  const sceneEnds = [...selectedTimes, duration];

  return sceneStarts.map((start, index) => ({
    start,
    end: sceneEnds[index],
    heroTime: roundTimeValue(start + (sceneEnds[index] - start) * 0.55),
    templateIndex: index % BACKGROUND_SCENE_TEMPLATES.length
  }));
}

function getPanelIndexForTime(time, durationSeconds, panelCount) {
  return clamp(
    Math.round((Math.max(0, Number(time || 0)) / Math.max(Number(durationSeconds || 1), 1)) * (panelCount - 1)),
    0,
    Math.max(0, panelCount - 1)
  );
}

function findNearestUnusedPanelIndex(preferredIndex, panelCount, usedIndexes) {
  const safePreferredIndex = clamp(preferredIndex, 0, Math.max(0, panelCount - 1));

  if (!usedIndexes.has(safePreferredIndex)) {
    return safePreferredIndex;
  }

  for (let distance = 1; distance < panelCount; distance += 1) {
    const lowerIndex = safePreferredIndex - distance;

    if (lowerIndex >= 0 && !usedIndexes.has(lowerIndex)) {
      return lowerIndex;
    }

    const upperIndex = safePreferredIndex + distance;

    if (upperIndex < panelCount && !usedIndexes.has(upperIndex)) {
      return upperIndex;
    }
  }

  return safePreferredIndex;
}

function resolveScenePanelIndices(heroIndex, panelCount, template) {
  const slots = [template.hero, ...template.supports];
  const usedIndexes = new Set();

  return slots.map((slot) => {
    const chosenIndex = findNearestUnusedPanelIndex(
      heroIndex + Number(slot.offset || 0),
      panelCount,
      usedIndexes
    );
    usedIndexes.add(chosenIndex);
    return chosenIndex;
  });
}

function buildSceneSlotFilter(slot) {
  const filters = [
    "crop=iw-44:ih-44:22:22",
    `scale=${slot.width}:${slot.height}:force_original_aspect_ratio=decrease`,
    `pad=${slot.width}:${slot.height}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`,
    "format=rgba"
  ];

  if (slot.opacity && slot.opacity < 0.999) {
    filters.push(`colorchannelmixer=aa=${slot.opacity.toFixed(2)}`);
  }

  return filters.join(",");
}

function buildBackgroundArtworkFilter() {
  return [
    `scale=${VIDEO_SIZE.width + 180}:${VIDEO_SIZE.height + 120}:force_original_aspect_ratio=increase`,
    `crop=${VIDEO_SIZE.width}:${VIDEO_SIZE.height}`,
    "eq=contrast=0.86:saturation=0.55:brightness=0.14",
    "boxblur=7:2",
    "format=rgba",
    "colorchannelmixer=aa=0.34"
  ].join(",");
}

function buildPanelAssetFilter(layout) {
  const innerWidth = roundEven(layout.width - 16);
  const innerHeight = roundEven(layout.height - 16);
  const cropScale = layout.width >= 500 ? 1.95 : layout.width >= 380 ? 2.1 : 2.25;
  const cropWidth = roundEven(innerWidth * cropScale);
  const cropHeight = roundEven(innerHeight * cropScale);
  const rotationRadians = (layout.rotation * Math.PI) / 180;

  return [
    `scale=${cropWidth}:${cropHeight}:force_original_aspect_ratio=increase`,
    `crop=${cropWidth}:${cropHeight}`,
    `scale=${innerWidth}:${innerHeight}:force_original_aspect_ratio=increase`,
    `crop=${innerWidth}:${innerHeight}`,
    "format=gray",
    "eq=contrast=1.4:brightness=0.05",
    "format=rgb24",
    "colorchannelmixer=rr=0.85:gg=0.82:bb=1.15",
    "unsharp=5:5:1.2:3:3:0.0",
    `pad=${layout.width}:${layout.height}:8:8:black`,
    "drawbox=x=0:y=0:w=iw:h=ih:color=black:t=8",
    "format=rgba",
    "pad=iw+44:ih+44:22:22:color=0x00000000",
    `rotate=${rotationRadians.toFixed(6)}:c=0x00000000:ow='rotw(iw)':oh='roth(ih)'`
  ].join(",");
}

async function stylizePanels(job, sourcePaths, renderDirectory) {
  updateJob(job, {
    stage: "Styling comic panels",
    progress: 0.16
  });

  const outputPaths = new Array(PANEL_LAYOUTS.length);
  let completedCount = 0;

  await runWithConcurrency(
    PANEL_LAYOUTS.map((layout, index) => ({
      index,
      layout,
      sourcePath: sourcePaths[index]
    })),
    PANEL_PROCESS_CONCURRENCY,
    async ({ index, layout, sourcePath }) => {
      const outputPath = path.join(renderDirectory, `panel-${index + 1}.png`);

      await runCommand(
        ffmpegPath,
        [
          "-y",
          "-i",
          sourcePath,
          "-frames:v",
          "1",
          "-vf",
          buildPanelAssetFilter(layout),
          outputPath
        ],
        {
          timeoutMs: PANEL_PROCESS_TIMEOUT_MS
        }
      );

      outputPaths[index] = outputPath;
      completedCount += 1;
      updateJob(job, {
        stage: "Styling comic panels",
        progress: 0.16 + (completedCount / PANEL_LAYOUTS.length) * 0.16
      });
    }
  );

  return outputPaths;
}

async function prepareSceneIllustrations(
  job,
  payload,
  renderLines,
  renderDirectory,
  backgroundPlan,
  renderNotes
) {
  updateJob(job, {
    stage: "Searching web illustration scenes",
    progress: 0.25
  });

  const sceneArtworkPaths = new Array(backgroundPlan.length).fill(null);
  const sourceRecords = [];
  let completedCount = 0;

  await runWithConcurrency(
    backgroundPlan.map((scene, index) => ({ scene, index })),
    WEB_ART_SCENE_CONCURRENCY,
    async ({ scene, index }) => {
      const queries = buildSceneArtworkQueries(scene, renderLines, payload);

      for (const query of queries) {
        try {
          const candidates = await searchIllustrationCandidates(query);
          const candidate = candidates[0];

          if (!candidate) {
            continue;
          }

          const download = await downloadIllustrationCandidate(candidate, renderDirectory, index);
          sceneArtworkPaths[index] = download.filePath;
          sourceRecords.push({
            sceneIndex: index + 1,
            query,
            title: stripHtml(candidate.title || ""),
            creator: candidate.creator || "",
            license: candidate.license || "",
            provider: candidate.provider || candidate.source || "",
            detailUrl: candidate.detail_url || candidate.foreign_landing_url || "",
            sourceUrl: download.sourceUrl
          });
          break;
        } catch {
          continue;
        }
      }

      completedCount += 1;
      updateJob(job, {
        stage: "Searching web illustration scenes",
        progress: 0.25 + (completedCount / Math.max(1, backgroundPlan.length)) * 0.07
      });
    }
  );

  if (sourceRecords.length) {
    await fsp.writeFile(
      path.join(renderDirectory, "background-sources.json"),
      JSON.stringify(sourceRecords, null, 2),
      "utf8"
    );
    renderNotes.push(
      `${sourceRecords.length} lyric-timed illustration backgrounds were fetched from the web and mixed into the slideshow.`
    );
  } else {
    renderNotes.push("Web illustration lookup had no reliable matches, so the slideshow stayed on sampled video imagery.");
  }

  return sceneArtworkPaths;
}

async function createBackgroundPlates(job, panelPaths, sceneArtworkPaths, renderDirectory, backgroundPlan) {
  updateJob(job, {
    stage: "Assembling lyric-synced comic scenes",
    progress: 0.34
  });

  const outputPaths = new Array(backgroundPlan.length);
  let completedCount = 0;

  await runWithConcurrency(
    backgroundPlan.map((scene, index) => ({ scene, index })),
    BACKGROUND_SCENE_CONCURRENCY,
    async ({ scene, index }) => {
      const template = BACKGROUND_SCENE_TEMPLATES[scene.templateIndex];
      const panelIndexes = resolveScenePanelIndices(scene.heroIndex, panelPaths.length, template);
      const slots = [template.hero, ...template.supports];
      const backdropPanelIndex = (scene.heroIndex + 3) % panelPaths.length;
      const backgroundArtworkPath = sceneArtworkPaths[index] || panelPaths[backdropPanelIndex];
      const outputPath = path.join(
        renderDirectory,
        `background-${String(index + 1).padStart(2, "0")}.png`
      );
      const args = [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=#f3f1ec:s=${VIDEO_SIZE.width}x${VIDEO_SIZE.height}:d=1`,
        "-i",
        backgroundArtworkPath
      ];

      panelIndexes.forEach((panelIndex) => {
        args.push("-i", panelPaths[panelIndex]);
      });

      const graph = [
        "[0:v]format=rgba[paper0]",
        `[1:v]${buildBackgroundArtworkFilter()}[art0]`,
        "[paper0][art0]overlay=0:0:format=auto[canvas0]"
      ];

      slots.forEach((slot, slotIndex) => {
        const layerName = `scene${index}_layer${slotIndex}`;
        const inputName = slotIndex === 0 ? "canvas0" : `canvas${slotIndex}`;
        const outputName = `canvas${slotIndex + 1}`;
        graph.push(`[${slotIndex + 2}:v]${buildSceneSlotFilter(slot)}[${layerName}]`);
        graph.push(
          `[${inputName}][${layerName}]overlay=${slot.x}:${slot.y}:format=auto[${outputName}]`
        );
      });

      graph.push(
        `[canvas${slots.length}]noise=alls=4:allf=u,eq=brightness=0.02:saturation=0.9,format=rgba[vout]`
      );

      args.push(
        "-filter_complex",
        graph.join(";"),
        "-map",
        "[vout]",
        "-frames:v",
        "1",
        outputPath
      );

      await runCommand(ffmpegPath, args, {
        cwd: renderDirectory,
        timeoutMs: PANEL_PROCESS_TIMEOUT_MS
      });

      outputPaths[index] = outputPath;
      completedCount += 1;
      updateJob(job, {
        stage: "Assembling lyric-synced comic scenes",
        progress: 0.34 + (completedCount / backgroundPlan.length) * 0.08
      });
    }
  );

  return outputPaths;
}

function decodeUploadedImage(upload, index, renderDirectory) {
  const rawData = `${upload?.dataUrl || ""}`;
  const match = rawData.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);

  if (!match) {
    return null;
  }

  const mimeType = match[1].toLowerCase();
  if (!/^image\/(?:png|jpe?g|webp)$/.test(mimeType)) {
    return null;
  }

  const extension = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");

  if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
    return null;
  }

  return {
    filePath: path.join(renderDirectory, `uploaded-bg-${index + 1}.${extension}`),
    buffer
  };
}

function resolveUploadedVideoExtension(upload = {}) {
  const originalExtension = path.extname(upload.originalName || "").toLowerCase();

  if (originalExtension) {
    return originalExtension;
  }

  if ((upload.mimeType || "").includes("webm")) {
    return ".webm";
  }

  if ((upload.mimeType || "").includes("quicktime")) {
    return ".mov";
  }

  return ".mp4";
}

function resolveUploadedAudioExtension(upload = {}) {
  const originalExtension = path.extname(upload.originalName || upload.name || "").toLowerCase();

  if (originalExtension) {
    return originalExtension;
  }

  const mimeType = `${upload.mimeType || ""}`.toLowerCase();

  if (mimeType.includes("wav")) {
    return ".wav";
  }

  if (mimeType.includes("ogg")) {
    return ".ogg";
  }

  if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
    return ".m4a";
  }

  if (mimeType.includes("aac")) {
    return ".aac";
  }

  if (mimeType.includes("flac")) {
    return ".flac";
  }

  return ".mp3";
}

function isGeneratedUploadFilename(value = "") {
  return /^upload-[a-z0-9]+-[a-z0-9]+-\d+-/i.test(path.parse(`${value || ""}`).name);
}

async function saveUploadedBackgrounds(payload, renderDirectory) {
  const uploads = Array.isArray(payload.customBackgrounds)
    ? payload.customBackgrounds.slice(0, MAX_UPLOADED_BACKGROUNDS)
    : [];
  const savedPaths = [];

  for (let index = 0; index < uploads.length; index += 1) {
    const decoded = decodeUploadedImage(uploads[index], index, renderDirectory);

    if (!decoded) {
      continue;
    }

    await fsp.writeFile(decoded.filePath, decoded.buffer);
    savedPaths.push(decoded.filePath);
  }

  return savedPaths;
}

async function saveUploadedBackgroundVideo(payload, renderDirectory) {
  const uploadedVideo = payload.customBackgroundVideo;

  if (!uploadedVideo?.tempPath || !fs.existsSync(uploadedVideo.tempPath)) {
    return null;
  }

  const targetPath = path.join(
    renderDirectory,
    `uploaded-background-video${resolveUploadedVideoExtension(uploadedVideo)}`
  );

  await fsp.copyFile(uploadedVideo.tempPath, targetPath);

  try {
    await fsp.unlink(uploadedVideo.tempPath);
  } catch {}

  return {
    filePath: targetPath,
    width: Number(uploadedVideo.width || 0),
    height: Number(uploadedVideo.height || 0),
    duration: Number(uploadedVideo.duration || 0)
  };
}

async function saveUploadedAudioFile(payload, renderDirectory) {
  const uploadedAudio = payload.customAudioUpload;

  if (!uploadedAudio?.tempPath || !fs.existsSync(uploadedAudio.tempPath)) {
    return null;
  }

  const targetPath = path.join(
    renderDirectory,
    `uploaded-audio${resolveUploadedAudioExtension(uploadedAudio)}`
  );

  await fsp.copyFile(uploadedAudio.tempPath, targetPath);

  try {
    await fsp.unlink(uploadedAudio.tempPath);
  } catch {}

  return {
    filePath: targetPath,
    originalName:
      uploadedAudio.originalName || uploadedAudio.name || path.basename(targetPath),
    mimeType: `${uploadedAudio.mimeType || ""}`,
    size: Number(uploadedAudio.size || 0),
    duration: Number(uploadedAudio.duration || 0)
  };
}

async function createUploadedBackgroundPlates(job, uploadedPaths, renderDirectory, backgroundPlan, videoSize) {
  updateJob(job, {
    stage: "Preparing uploaded image backgrounds",
    progress: 0.34
  });

  const uniqueUploadedPaths = [...new Set(uploadedPaths.filter(Boolean))];
  const processedBySource = new Map();
  let completedCount = 0;

  await runWithConcurrency(
    uniqueUploadedPaths.map((sourcePath, index) => ({ sourcePath, index })),
    Math.min(BACKGROUND_SCENE_CONCURRENCY, Math.max(1, uniqueUploadedPaths.length)),
    async ({ sourcePath, index }) => {
      const outputPath = path.join(
        renderDirectory,
        `uploaded-processed-${String(index + 1).padStart(2, "0")}.png`
      );

      await runCommand(
        ffmpegPath,
        [
          "-y",
          "-i",
          sourcePath,
          "-frames:v",
          "1",
          "-vf",
          [
            `scale=${videoSize.width}:${videoSize.height}:force_original_aspect_ratio=increase`,
            `crop=${videoSize.width}:${videoSize.height}`,
            "setsar=1",
            "format=rgba"
          ].join(","),
          outputPath
        ],
        {
          cwd: renderDirectory,
          timeoutMs: PANEL_PROCESS_TIMEOUT_MS
        }
      );

      processedBySource.set(sourcePath, outputPath);
      completedCount += 1;
      updateJob(job, {
        stage: "Preparing uploaded image backgrounds",
        progress: 0.34 + (completedCount / Math.max(1, uniqueUploadedPaths.length)) * 0.08
      });
    }
  );

  return backgroundPlan.map((_, index) => {
    const sourcePath = uploadedPaths[index % uploadedPaths.length];
    return processedBySource.get(sourcePath) || processedBySource.values().next().value;
  });
}

async function createUploadedVideoBackgroundPlates(
  job,
  uploadedVideo,
  renderDirectory,
  backgroundPlan,
  videoSize
) {
  updateJob(job, {
    stage: "Sampling scenes from uploaded background video",
    progress: 0.34
  });

  const outputPaths = new Array(backgroundPlan.length);
  const sourceDuration = Math.max(0, Number(uploadedVideo.duration || 0));
  const loopDuration = sourceDuration > 0.4 ? Math.max(0.4, sourceDuration - 0.25) : 0;
  let completedCount = 0;

  await runWithConcurrency(
    backgroundPlan.map((scene, index) => ({ scene, index })),
    BACKGROUND_SCENE_CONCURRENCY,
    async ({ scene, index }) => {
      const outputPath = path.join(
        renderDirectory,
        `background-${String(index + 1).padStart(2, "0")}.png`
      );
      const sourceTime = loopDuration
        ? roundTimeValue(scene.heroTime % loopDuration)
        : roundTimeValue(Math.max(0, scene.heroTime || scene.start || 0));

      await runCommand(
        ffmpegPath,
        [
          "-y",
          "-ss",
          sourceTime.toFixed(2),
          "-i",
          uploadedVideo.filePath,
          "-frames:v",
          "1",
          "-vf",
          [
            `scale=${videoSize.width}:${videoSize.height}:force_original_aspect_ratio=increase`,
            `crop=${videoSize.width}:${videoSize.height}`,
            "eq=contrast=1.04:saturation=0.96:brightness=-0.03",
            "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.16:t=fill",
            "format=rgba"
          ].join(","),
          outputPath
        ],
        {
          cwd: renderDirectory,
          timeoutMs: PANEL_PROCESS_TIMEOUT_MS
        }
      );

      outputPaths[index] = outputPath;
      completedCount += 1;
      updateJob(job, {
        stage: "Sampling scenes from uploaded background video",
        progress: 0.34 + (completedCount / backgroundPlan.length) * 0.08
      });
    }
  );

  return outputPaths;
}

async function createEmergencyBackgroundPlates(
  job,
  renderDirectory,
  backgroundPlan,
  videoSize,
  stageLabel = "Building safe fallback backgrounds",
  progressStart = 0.34
) {
  updateJob(job, {
    stage: stageLabel,
    progress: progressStart
  });

  const outputPaths = new Array(backgroundPlan.length);
  let completedCount = 0;

  await runWithConcurrency(
    backgroundPlan.map((scene, index) => ({ scene, index })),
    BACKGROUND_SCENE_CONCURRENCY,
    async ({ index }) => {
      const palette = SAFE_BACKGROUND_PALETTE[index % SAFE_BACKGROUND_PALETTE.length];
      const outputPath = path.join(
        renderDirectory,
        `safe-background-${String(index + 1).padStart(2, "0")}.png`
      );

      await runCommand(
        ffmpegPath,
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `color=c=${palette.base}:s=${videoSize.width}x${videoSize.height}:d=1`,
          "-frames:v",
          "1",
          "-vf",
          [
            "format=rgba",
            `drawbox=x=0:y=0:w=iw:h=ih:color=${palette.accent}@0.16:t=fill`,
            `drawbox=x=0:y=ih*0.58:w=iw:h=ih*0.42:color=${palette.glow}@0.14:t=fill`,
            "noise=alls=5:allf=u",
            "eq=contrast=1.03:saturation=0.98:brightness=0.02",
            "format=rgba"
          ].join(","),
          outputPath
        ],
        {
          cwd: renderDirectory,
          timeoutMs: PANEL_PROCESS_TIMEOUT_MS
        }
      );

      outputPaths[index] = outputPath;
      completedCount += 1;
      updateJob(job, {
        stage: stageLabel,
        progress: progressStart + (completedCount / Math.max(1, backgroundPlan.length)) * 0.08
      });
    }
  );

  return outputPaths;
}

async function createUploadedVideoBackgroundManifest(
  job,
  uploadedVideo,
  renderDirectory,
  durationSeconds,
  videoSize,
  renderProfile = {}
) {
  updateJob(job, {
    stage: "Preparing moving uploaded background video",
    progress: 0.42
  });

  const outputPath = path.join(renderDirectory, "uploaded-background-loop.mp4");
  const manifestPath = path.join(renderDirectory, "backgrounds-uploaded-video.concat");
  const outputFps = Math.max(12, Number(renderProfile.outputFps || OUTPUT_FPS) || OUTPUT_FPS);

  await runCommand(
    ffmpegPath,
    [
      "-y",
      "-stream_loop",
      "-1",
      "-i",
      uploadedVideo.filePath,
      "-t",
      String(getRenderDurationSeconds(durationSeconds)),
      "-an",
      "-vf",
      [
        `scale=${videoSize.width}:${videoSize.height}:force_original_aspect_ratio=increase`,
        `crop=${videoSize.width}:${videoSize.height}`,
        "setsar=1",
        `fps=${outputFps}`,
        "eq=contrast=1.04:saturation=0.96:brightness=-0.03",
        "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.16:t=fill",
        "format=yuv420p"
      ].join(","),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-movflags",
      "+faststart",
      outputPath
    ],
    {
      cwd: renderDirectory,
      timeoutMs: RENDER_TIMEOUT_MS
    }
  );

  await fsp.writeFile(
    manifestPath,
    createConcatManifest(
      [outputPath],
      [{ start: 0, end: Math.max(0.2, getRenderDurationSeconds(durationSeconds)) }]
    ),
    "utf8"
  );

  return {
    manifestPath,
    filePath: outputPath
  };
}

async function createSolidColorBackgroundManifest(
  job,
  renderDirectory,
  backgroundPlan,
  videoSize,
  durationSeconds,
  stageLabel = "Preparing solid fallback background",
  progressStart = 0.46
) {
  updateJob(job, {
    stage: stageLabel,
    progress: progressStart
  });

  const palette = SAFE_BACKGROUND_PALETTE[0];
  const outputPath = path.join(renderDirectory, "solid-fallback-background.png");

  await runCommand(
    ffmpegPath,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${palette.base}:s=${videoSize.width}x${videoSize.height}:d=1`,
      "-frames:v",
      "1",
      "-vf",
      [
        "format=rgba",
        `drawbox=x=0:y=0:w=iw:h=ih:color=${palette.accent}@0.12:t=fill`,
        `drawbox=x=0:y=ih*0.62:w=iw:h=ih*0.38:color=${palette.glow}@0.1:t=fill`,
        "eq=contrast=1.01:saturation=0.96:brightness=0.01",
        "format=rgba"
      ].join(","),
      outputPath
    ],
    {
      cwd: renderDirectory,
      timeoutMs: PANEL_PROCESS_TIMEOUT_MS
    }
  );

  const manifestScenes = Array.isArray(backgroundPlan) && backgroundPlan.length
    ? backgroundPlan
    : [{ start: 0, end: Math.max(1, roundTimeValue(durationSeconds || 1)) }];
  const manifestBackgroundPaths = manifestScenes.map(() => outputPath);
  const manifestPath = path.join(renderDirectory, "backgrounds-solid.concat");

  await fsp.writeFile(
    manifestPath,
    createConcatManifest(manifestBackgroundPaths, manifestScenes),
    "utf8"
  );

  return manifestPath;
}

function createConcatManifest(backgroundPaths, backgroundPlan) {
  const lines = [];

  backgroundPaths.forEach((backgroundPath, index) => {
    const normalizedPath = path.resolve(backgroundPath).replace(/\\/g, "/").replace(/'/g, "'\\''");
    lines.push(`file '${normalizedPath}'`);

    const scene = backgroundPlan[index];
    if (scene) {
      lines.push(`duration ${Math.max(0.2, roundTimeValue(scene.end - scene.start))}`);
    }
  });

  if (backgroundPaths.length) {
    const lastPath = path.resolve(backgroundPaths[backgroundPaths.length - 1])
      .replace(/\\/g, "/")
      .replace(/'/g, "'\\''");
    lines.push(`file '${lastPath}'`);
  }

  return lines.join("\n");
}

function buildFrameTimes(durationSeconds, count = PANEL_CAPTURE_COUNT) {
  const duration = Math.max(Number(durationSeconds || 0), 18);
  const startPadding = Math.min(4, Math.max(1.6, duration * 0.07));
  const endPadding = Math.min(6, Math.max(2.4, duration * 0.1));
  const usableDuration = Math.max(1, duration - startPadding - endPadding);

  return Array.from({ length: count }, (_, index) => {
    if (count === 1) {
      return startPadding;
    }

    return startPadding + (usableDuration * index) / (count - 1);
  });
}

async function captureVideoPanels(job, videoUrl, renderDirectory, durationSeconds, profile = {}) {
  updateJob(job, {
    stage: "Sampling frames from the source video",
    progress: 0.08
  });

  const panelCaptureCount = Math.max(1, Number(profile.panelCaptureCount || PANEL_CAPTURE_COUNT));
  const frameTimes = buildFrameTimes(durationSeconds, panelCaptureCount);
  const framePaths = new Array(panelCaptureCount);
  let completedCount = 0;

  await runWithConcurrency(
    frameTimes.map((time, index) => ({ time, index })),
    PANEL_CAPTURE_CONCURRENCY,
    async ({ time, index }) => {
      const outputPath = path.join(renderDirectory, `scene-${index + 1}.jpg`);

      await runCommand(
        ffmpegPath,
        [
          "-y",
          "-ss",
          time.toFixed(2),
          "-i",
          videoUrl,
          "-frames:v",
          "1",
          "-vf",
          `scale=${Math.max(640, Number(profile.panelCaptureScale || 1280))}:-2`,
          "-q:v",
          String(Math.max(2, Number(profile.panelCaptureQuality || 5))),
          outputPath
        ],
        {
          timeoutMs: PANEL_CAPTURE_TIMEOUT_MS
        }
      );

      if (fs.existsSync(outputPath)) {
        framePaths[index] = outputPath;
      }

      completedCount += 1;
      updateJob(job, {
        stage: "Sampling frames from the source video",
        progress: 0.08 + (completedCount / frameTimes.length) * 0.08
      });
    }
  );

  const availableFrames = framePaths.filter(Boolean);

  if (!availableFrames.length) {
    throw createRenderError("The source video could not be sampled for background panels.", 502);
  }

  while (availableFrames.length < PANEL_LAYOUTS.length) {
    availableFrames.push(availableFrames[availableFrames.length - 1]);
  }

  return availableFrames.slice(0, PANEL_LAYOUTS.length);
}

async function downloadComicBackgrounds(renderDirectory) {
  const results = await Promise.all(
    COMIC_BG_URLS.map(async (url, index) => {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
          return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const filePath = path.join(
          renderDirectory,
          `bg-${String(index + 1).padStart(2, "0")}.jpg`
        );

        await fsp.writeFile(filePath, buffer);
        return filePath;
      } catch {
        return null;
      }
    })
  );
  const available = results.filter(Boolean);

  if (!available.length) {
    throw new Error("No background images could be downloaded.");
  }

  return available;
}

function buildBackgroundSlideshowPlan(bgPaths, durationSeconds, profile = {}) {
  const safePaths = bgPaths.filter(Boolean);
  const duration = Math.max(Number(durationSeconds || 0), MIN_RENDER_DURATION_SECONDS);
  const targetSceneCount = profile.fastMode
    ? profile.shortFastMode
      ? clamp(Math.ceil(duration / 28) + 1, 3, 5)
      : clamp(
        Math.ceil(duration / 22) + 1,
        Math.max(6, Math.min(safePaths.length, 8)),
        Math.max(10, Math.min(safePaths.length + 2, 12))
      )
    : Math.max(safePaths.length, Math.ceil(duration / PANEL_CHANGE_SECONDS));
  const sceneDuration = duration / Math.max(1, targetSceneCount);

  return Array.from({ length: targetSceneCount }, (_, index) => {
    const start = roundTimeValue(index * sceneDuration);
    const end =
      index === targetSceneCount - 1
        ? duration
        : roundTimeValue(Math.min(duration, (index + 1) * sceneDuration));

    return {
      path: safePaths[index % safePaths.length],
      start,
      end
    };
  });
}

async function writeBackgroundManifest(renderDirectory, bgPaths, durationSeconds, profile = {}) {
  const slideshowPlan = buildBackgroundSlideshowPlan(bgPaths, durationSeconds, profile);
  const manifestPath = path.join(renderDirectory, "backgrounds.concat");
  const manifestContent = createConcatManifest(
    slideshowPlan.map((scene) => scene.path),
    slideshowPlan
  );

  await fsp.writeFile(manifestPath, manifestContent, "utf8");
  return {
    manifestPath,
    slideshowPlan
  };
}

async function preparePanelAssets(job, bgPaths, renderDirectory) {
  updateJob(job, {
    stage: "Preparing comic panels",
    progress: 0.18
  });

  const panelAssets = {};
  let completedCount = 0;

  await runWithConcurrency(
    PANEL_ASSET_SPECS,
    Math.min(PANEL_PROCESS_CONCURRENCY, PANEL_ASSET_SPECS.length),
    async (spec) => {
      const sourcePath = bgPaths[spec.sourceIndex % bgPaths.length];
      const outputPath = path.join(renderDirectory, `panel-${spec.key}.png`);

      await runCommand(
        ffmpegPath,
        [
          "-y",
          "-i",
          sourcePath,
          "-frames:v",
          "1",
          "-vf",
          buildComicPanelFilter(spec.width, spec.height, spec.rotation),
          outputPath
        ],
        {
          cwd: renderDirectory,
          timeoutMs: PANEL_PROCESS_TIMEOUT_MS
        }
      );

      panelAssets[spec.key] = outputPath;
      completedCount += 1;
      updateJob(job, {
        stage: "Preparing comic panels",
        progress: 0.18 + (completedCount / PANEL_ASSET_SPECS.length) * 0.1
      });
    }
  );

  return panelAssets;
}

async function composePanelPage(job, panelAssets, renderDirectory) {
  updateJob(job, {
    stage: "Composing panel layout",
    progress: 0.29
  });

  const outputPath = path.join(renderDirectory, "panel-page.png");

  await runCommand(
    ffmpegPath,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=black@0.0:s=${VIDEO_SIZE.width}x${VIDEO_SIZE.height}:d=1`,
      "-i",
      panelAssets.large,
      "-i",
      panelAssets.medium,
      "-i",
      panelAssets.small,
      "-frames:v",
      "1",
      "-filter_complex",
      [
        "[0:v]format=rgba,colorchannelmixer=aa=0[base]",
        "[1:v]format=rgba[large]",
        "[2:v]format=rgba[medium]",
        "[3:v]format=rgba[small]",
        "[base][large]overlay=48:58:format=auto[canvas1]",
        "[canvas1][medium]overlay=726:122:format=auto[canvas2]",
        "[canvas2][small]overlay=966:238:format=auto[vout]"
      ].join(";"),
      "-map",
      "[vout]",
      "-pix_fmt",
      "rgba",
      outputPath
    ],
    {
      cwd: renderDirectory,
      timeoutMs: PANEL_PROCESS_TIMEOUT_MS
    }
  );

  return outputPath;
}

async function downloadArtworkSet(job, payload, renderDirectory) {
  updateJob(job, {
    stage: "Preparing fallback artwork panels",
    progress: 0.08
  });

  const candidateUrls = [
    payload.poster,
    ...(Array.isArray(payload.thumbnails) ? payload.thumbnails.map((item) => item.url) : [])
  ]
    .filter(Boolean)
    .filter((url, index, list) => list.indexOf(url) === index)
    .slice(0, PANEL_LAYOUTS.length);

  if (!candidateUrls.length) {
    throw createRenderError("No artwork thumbnails were available for this video.", 500);
  }

  const artworkPaths = [];

  for (let index = 0; index < candidateUrls.length; index += 1) {
    const url = candidateUrls[index];
    const response = await fetch(url);

    if (!response.ok) {
      continue;
    }

    const contentType = response.headers.get("content-type") || "";
    const extension = contentType.includes("webp")
      ? "webp"
      : contentType.includes("png")
        ? "png"
        : "jpg";
    const filePath = path.join(renderDirectory, `scene-${index + 1}.${extension}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    await fsp.writeFile(filePath, buffer);
    artworkPaths.push(filePath);
  }

  if (!artworkPaths.length) {
    throw createRenderError("The artwork for this video could not be downloaded.", 500);
  }

  while (artworkPaths.length < PANEL_LAYOUTS.length) {
    artworkPaths.push(artworkPaths[artworkPaths.length - 1]);
  }

  return artworkPaths.slice(0, PANEL_LAYOUTS.length);
}

async function prepareArtworkPanels(job, payload, renderDirectory, durationSeconds, renderNotes, profile = {}) {
  try {
    const videoUrl = await resolveVideoUrl(payload.videoId);
    const rawPaths = await captureVideoPanels(
      job,
      videoUrl,
      renderDirectory,
      durationSeconds,
      profile
    );
    const panelPaths = await stylizePanels(job, rawPaths, renderDirectory);
    renderNotes.push("Panels are sampled from the original YouTube video and gently animated.");
    return panelPaths;
  } catch (error) {
    renderNotes.push("Video frame sampling was unavailable, so the render used YouTube artwork panels.");
    const fallbackPaths = await downloadArtworkSet(job, payload, renderDirectory);
    return stylizePanels(job, fallbackPaths, renderDirectory);
  }
}

async function prepareAtmosphereAssets(job, renderDirectory) {
  updateJob(job, {
    stage: "Preparing animated atmosphere",
    progress: 0.18
  });

  const assetPaths = {};
  let completedCount = 0;

  await runWithConcurrency(
    ATMOSPHERE_ORB_SPECS,
    Math.min(ATMOSPHERE_ORB_SPECS.length, PANEL_PROCESS_CONCURRENCY),
    async (spec) => {
      const outputPath = path.join(renderDirectory, `atmosphere-${spec.key}.png`);

      await runCommand(
        ffmpegPath,
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `color=c=${spec.color}:s=${spec.size}x${spec.size}:d=1`,
          "-frames:v",
          "1",
          "-vf",
          buildAtmosphereOrbAssetFilter(spec),
          "-pix_fmt",
          "rgba",
          outputPath
        ],
        {
          cwd: renderDirectory,
          timeoutMs: PANEL_PROCESS_TIMEOUT_MS
        }
      );

      assetPaths[spec.key] = outputPath;
      completedCount += 1;
      updateJob(job, {
        stage: "Preparing animated atmosphere",
        progress: 0.18 + (completedCount / ATMOSPHERE_ORB_SPECS.length) * 0.08
      });
    }
  );

  return assetPaths;
}

function createSafeFilterScript(videoSize = VIDEO_SIZE, emojiOverlays = [], emojiAssetEntries = [], fontsDirRelative = "", renderProfile = {}) {
  const filters = [
    `[0:v]${buildAnimatedBackgroundFilter(videoSize, {
      scaleMultiplier: 0.12,
      noiseStrength: 2,
      brightness: 0.02,
      saturation: 1,
      outputFps: renderProfile.outputFps
    })}[bg]`,
    fontsDirRelative
      ? `[bg]subtitles=lyrics.ass:fontsdir=${fontsDirRelative}[subbed]`
      : "[bg]subtitles=lyrics.ass[subbed]"
  ];
  appendEmojiOverlayFilters(filters, "subbed", emojiOverlays, emojiAssetEntries);
  return filters.join(";");
}

async function renderVideo(
  job,
  backgroundManifestPath,
  audioUrl,
  renderDirectory,
  durationSeconds,
  videoSize,
  options = {}
) {
  updateJob(job, {
    stage: options.stageLabel || "Rendering lyric video",
    progress: Number(options.progressStart ?? 0.42)
  });

  const outputVideoPath = options.outputVideoPath || path.join(renderDirectory, "final.mp4");
  const emojiAssetEntries = Array.isArray(options.emojiAssetEntries) ? options.emojiAssetEntries : [];
  const fontsDirRelative = `${options.fontsDirRelative || ""}`;
  const renderProfile = options.renderProfile || buildRenderProfile();
  const filterGraph = options.filterGraph
    || createFilterScript(videoSize, options.emojiOverlays || [], emojiAssetEntries, fontsDirRelative, renderProfile);
  const videoEncoder = options.videoEncoder
    || (options.forceSoftwareEncoder
      ? getSoftwareVideoEncoder(renderProfile)
      : await resolveVideoEncoder());
  const audioInputIndex = emojiAssetEntries.length + 1;

  try {
    await fsp.unlink(outputVideoPath);
  } catch {}

  const backgroundVideoInputPath = `${options.backgroundVideoInputPath || ""}`;
  const inputArgs = backgroundVideoInputPath
    ? [
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        backgroundVideoInputPath
      ]
    : [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        backgroundManifestPath
      ];

  emojiAssetEntries.forEach((entry) => {
    inputArgs.push("-i", entry.filePath);
  });

  inputArgs.push("-i", audioUrl);

  const args = [
    ...inputArgs,
    "-filter_complex",
    filterGraph,
    "-map",
    "[vout]",
    "-map",
    `${audioInputIndex}:a`,
    ...videoEncoder.outputArgs,
    "-r",
    String(renderProfile.outputFps || OUTPUT_FPS),
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    renderProfile.audioBitrate || "192k",
    "-movflags",
    "+faststart",
    "-t",
    String(durationSeconds),
    "-shortest",
    outputVideoPath
  ];

  await runCommand(ffmpegPath, args, {
    cwd: renderDirectory,
    onStderr(text) {
      const seconds = parseProgressTime(text);

      if (seconds === null || !durationSeconds) {
        return;
      }

      updateJob(job, {
        stage: options.stageLabel || "Rendering lyric video",
        progress: Math.min(
          0.98,
          Number(options.progressStart ?? 0.42) + (seconds / durationSeconds) * Number(options.progressSpan ?? 0.52)
        )
      });
    }
  });

  if (!fs.existsSync(outputVideoPath)) {
    throw createRenderError("The lyric video render did not finish correctly.", 500);
  }

  return outputVideoPath;
}

async function probeAudioDurationSeconds(audioUrl) {
  try {
    const { stdout } = await runCommand(
      ffprobePath,
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=duration",
        "-of",
        "default=nw=1:nk=1",
        audioUrl
      ],
      {
        timeoutMs: 45000
      }
    );
    const duration = Number(`${stdout || ""}`.trim());
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  } catch {
    return 0;
  }
}

async function createSilentAudioFallback(outputPath, durationSeconds) {
  await ensureDirectory(path.dirname(outputPath));

  await runCommand(
    ffmpegPath,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-t",
      String(getRenderDurationSeconds(durationSeconds)),
      "-c:a",
      "pcm_s16le",
      outputPath
    ],
    {
      timeoutMs: 45000
    }
  );

  return outputPath;
}

async function runRenderWorkflow(job, payload, attemptNumber = 1) {
  const renderDirectory = path.join(rendersRoot, job.id);
  await ensureDirectory(renderDirectory);
  const adaptiveProfile = await getAdaptiveProfile({
    channelTitle: payload.channelTitle,
    title: payload.title || payload.song?.title || ""
  });

  try {
    updateJob(job, {
      status: "running",
      stage: "Preparing render workspace",
      progress: 0.03
      ,
      attempt: attemptNumber,
      maxAttempts: MAX_RENDER_ATTEMPTS,
      retrying: false,
      error: null
    });

    const videoSize = getRenderSize(payload);
    const allowSilentAudioFallback = process.env.ALLOW_SILENT_AUDIO_FALLBACK === "true";
    const metadataDurationSeconds = Number(payload.durationSeconds || 0);
    let durationSeconds = getRenderDurationSeconds(
      metadataDurationSeconds > 0
        ? metadataDurationSeconds
        : Math.max(getLyricTimelineDuration(payload.lines), MIN_RENDER_DURATION_SECONDS)
    );
    const renderProfile = buildRenderProfile(payload, durationSeconds);
    const renderNotes = [
      "Rendered in a dynamic kinetic lyric-video style inspired by the Envato text preset reference."
    ];
    renderNotes.push(
      `Lyrics style: ${resolveLyricStylePreset(payload.lyricStyle || "auto").label}; font: ${resolveLyricFontPreset(
        payload.lyricFont || "arial"
      ).label}.`
    );

    renderNotes.push(
      renderProfile.shortFastMode
        ? "Short video fast path is active, so the app is using fewer background scenes, lower render FPS, and a quicker export profile."
        : renderProfile.fastMode
        ? "Fast Render mode is active, so the app is using a lighter background pipeline and a quicker export profile."
        : "Standard render mode is active for the full visual pipeline."
    );

    if (adaptiveProfile.knownLyricsRisk) {
      renderNotes.push(
        "Adaptive safety mode is active for this channel, so the render is using stricter lyric verification and stronger audio recovery."
      );
    }
    const uploadedBackgroundPaths = await saveUploadedBackgrounds(payload, renderDirectory);
    const uploadedBackgroundVideo = await saveUploadedBackgroundVideo(payload, renderDirectory);
    const uploadedAudioFile = await saveUploadedAudioFile(payload, renderDirectory);

    if (uploadedBackgroundPaths.length) {
      renderNotes.push(
        `${uploadedBackgroundPaths.length} uploaded background image${uploadedBackgroundPaths.length === 1 ? "" : "s"} will be used for this render.`
      );
      renderNotes.push(`Output resolution is ${videoSize.width}x${videoSize.height}.`);
    }

    if (uploadedBackgroundVideo) {
      renderNotes.push("An uploaded background video will be sampled to build the lyric scenes.");
      renderNotes.push(`Output resolution is ${videoSize.width}x${videoSize.height}.`);
    }

    if (uploadedAudioFile) {
      renderNotes.push(
        `Uploaded audio ${uploadedAudioFile.originalName} will be used as the soundtrack for this render.`
      );
    }

    const audioInputDirectory = path.join(renderDirectory, "audio-input");
    const audioUrlPromise = uploadedAudioFile
      ? Promise.resolve({
          audioSource: {
            input: uploadedAudioFile.filePath,
            sourceType: "file",
            recovered: false,
            mimeType: uploadedAudioFile.mimeType || "audio/mpeg"
          },
          error: null
        })
      : resolveAudioInput(payload.videoId, {
          outputDirectory: audioInputDirectory,
          allowDownloadFallback: true,
          preferLocal: true,
          preferKnownBlockRecovery: adaptiveProfile.preferKnownAudioBlockRecovery
        }).then(
          (audioSource) => ({
            audioSource,
            error: null
          }),
          (error) => ({
            audioSource: null,
            error
          })
        );
    updateJob(job, {
      stage: "Resolving video audio",
      progress: 0.12
    });

    const audioResolution = await audioUrlPromise;
    let audioUrl = "";
    let usingSilentAudioFallback = false;

    if (audioResolution.error) {
      if (audioResolution.error?.code === "YOUTUBE_BOT_BLOCK") {
        await recordAdaptiveSignalSafely({
          channelTitle: payload.channelTitle,
          title: payload.title || payload.song?.title || "",
          category: "youtube_bot_block",
          message: audioResolution.error.message || ""
        });

        if (!allowSilentAudioFallback) {
          const blockedAudioError = createRenderError(
            "YouTube blocked audio access for this video. Add a YouTube cookie file on the server or try another link.",
            503
          );
          blockedAudioError.code = "YOUTUBE_BOT_BLOCK";
          blockedAudioError.cause = audioResolution.error;
          throw blockedAudioError;
        }
        updateJob(job, {
          stage: "Preparing fallback audio",
          progress: 0.13
        });
        audioUrl = await createSilentAudioFallback(
          path.join(audioInputDirectory, "silent-fallback.wav"),
          durationSeconds
        );
        usingSilentAudioFallback = true;
        renderNotes.push(
          "YouTube blocked direct audio access for this video, so the render continued with a silent fallback track instead of stopping."
        );
        renderNotes.push(
          "Final timing stays based on the video metadata and the lyric source that was already available."
        );
      } else {
        throw audioResolution.error;
      }
    } else {
      audioUrl = audioResolution.audioSource.input;
    }

    if (audioResolution.audioSource?.recovered) {
      renderNotes.push(
        "The live YouTube audio stream was unstable, so the app downloaded a local audio fallback automatically before rendering."
      );
    }

    const canUseAudioTranscription = !usingSilentAudioFallback;
    const audioDurationSeconds = usingSilentAudioFallback ? 0 : await probeAudioDurationSeconds(audioUrl);

    if (audioDurationSeconds > 0 && audioDurationSeconds < durationSeconds - 1) {
      durationSeconds = getRenderDurationSeconds(audioDurationSeconds);
      renderNotes.push(
        `Render duration was matched to the actual audio stream (${Math.round(audioDurationSeconds)}s).`
      );
    }

    let renderLines = limitLyricLines(sanitizeLyricLines(payload.lines, durationSeconds), durationSeconds);
    const transcriptTimingLines = limitLyricLines(
      sanitizeLyricLines(
        Array.isArray(payload?.transcriptLines) && payload.transcriptLines.length
          ? payload.transcriptLines
          : [],
        durationSeconds
      ),
      durationSeconds
    );
    const romanizedInitialLines = romanizeLyricLines(renderLines);
    renderLines = romanizedInitialLines.lines;
    const referenceLyricSourceLines = Array.isArray(payload.referenceLyricsLines) && payload.referenceLyricsLines.length
      ? payload.referenceLyricsLines
      : payload.lines;
    const sourceLyricReferenceLines = limitLyricLines(
      romanizeLyricLines(sanitizeLyricLines(referenceLyricSourceLines, durationSeconds)).lines,
      durationSeconds
    );

    if (romanizedInitialLines.changed) {
      renderNotes.push("Telugu lyric lines were converted into English letters for the final render.");
    }

    const cachedTranscriptions = new Map();

    async function getTranscription(stageLabel, progressValue, options = {}) {
      if (!canUseAudioTranscription) {
        throw new Error(
          "Audio transcription was skipped because YouTube blocked server-side audio for this video."
        );
      }

      const cacheKey = buildTranscriptionCacheKey(options);

      if (cachedTranscriptions.has(cacheKey)) {
        return cachedTranscriptions.get(cacheKey);
      }

      updateJob(job, {
        stage: stageLabel,
        progress: progressValue
      });

      const effectiveOptions = buildAdaptiveTranscriptionOptions(options, adaptiveProfile);
      const shouldForceTeluguUploadedAudio =
        Boolean(payload?.customAudioUpload) &&
        (isGeneratedUploadFilename(payload?.title) ||
          isGeneratedUploadFilename(payload?.customAudioUpload?.name) ||
          isGeneratedUploadFilename(payload?.customAudioUpload?.originalName));
      const localAudioInputPath =
        typeof audioUrl === "string" &&
        audioUrl &&
        !/^https?:\/\//i.test(audioUrl) &&
        fs.existsSync(audioUrl)
          ? audioUrl
          : "";
      const transcription = await transcribeYouTubeAudio(
        payload.videoId,
        renderDirectory,
        durationSeconds,
        {
          ...effectiveOptions,
          ...(shouldForceTeluguUploadedAudio
            ? {
                task: "transcribe",
                language: "te"
              }
            : {}),
          audioInputPath: localAudioInputPath
        }
      );

      if (
        transcription.audioDurationSeconds > 0 &&
        transcription.audioDurationSeconds < durationSeconds - 1
      ) {
        durationSeconds = getRenderDurationSeconds(transcription.audioDurationSeconds);
        renderNotes.push(
          `Render duration was matched to the transcribed audio (${Math.round(
            transcription.audioDurationSeconds
          )}s).`
        );
      }

      if (transcription.audioPath) {
        audioUrl = transcription.audioPath;
      }

      cachedTranscriptions.set(cacheKey, transcription);
      return transcription;
    }

    const shouldUseRomanizedTeluguLyrics = shouldRomanizeTeluguLyrics(renderLines, payload);
    const prefersTranscribedLyrics = shouldPreferAudioTranscription(
      renderLines,
      durationSeconds,
      payload.syncMode
    );
    const transcribedLyricOffsetSeconds = getLyricOffsetSeconds("transcribed", {
      teluguRomanized: shouldUseRomanizedTeluguLyrics
    });
    const lyricOffsetSeconds = getLyricOffsetSeconds(
      shouldUseRomanizedTeluguLyrics ? "transcribed" : payload.syncMode,
      {
        teluguRomanized: shouldUseRomanizedTeluguLyrics
      }
    );
    let renderLineSyncSource = shouldUseRomanizedTeluguLyrics ? "transcribed" : payload.syncMode;
    let renderLinesAreTranscriptDerived = false;

    if (renderLines.length) {
      if (shouldUseRomanizedTeluguLyrics && containsTeluguScript(renderLines.map((line) => line.text).join(" "))) {
        try {
          const transcription = await getTranscription(
            "Transcribing Telugu lyrics in English letters",
            0.16,
            {
              task: "transcribe",
              language: "te"
            }
          );
          const romanizedTranscription = romanizeLyricLines(
            sanitizeLyricLines(
              smoothTranscribedLyricGaps(transcription.lines, durationSeconds),
              durationSeconds
            )
          );
          const transliteratedRenderLines = limitLyricLines(
            romanizedTranscription.lines,
            durationSeconds
          );

          if (transliteratedRenderLines.length) {
            renderLines = limitLyricLines(
              applyLyricOffset(transliteratedRenderLines, lyricOffsetSeconds, durationSeconds),
              durationSeconds
            );
            renderLineSyncSource = "transcribed";
            renderLinesAreTranscriptDerived = true;
            renderNotes.push("Telugu lyrics were transcribed and shown in English letters for this render.");
          } else {
            renderLines = limitLyricLines(
              applyLyricOffset(renderLines, getLyricOffsetSeconds(payload.syncMode), durationSeconds),
              durationSeconds
            );
            renderLineSyncSource = payload.syncMode;
            renderLinesAreTranscriptDerived = false;
            renderNotes.push("Telugu lyric romanization returned no usable lines, so the original lyric source was kept.");
          }
        } catch (error) {
          renderLines = limitLyricLines(
              applyLyricOffset(renderLines, getLyricOffsetSeconds(payload.syncMode), durationSeconds),
              durationSeconds
            );
          renderLineSyncSource = payload.syncMode;
          renderLinesAreTranscriptDerived = false;
          renderNotes.push(`Telugu lyric romanization was unavailable: ${error.message}`);
        }
      } else if (payload.syncMode === "caption-aligned" || payload.syncMode === "captions") {
        renderLines = limitLyricLines(
          applyLyricOffset(renderLines, lyricOffsetSeconds, durationSeconds),
          durationSeconds
        );
        renderLineSyncSource = payload.syncMode;
        renderLinesAreTranscriptDerived = false;
        renderNotes.push("Using caption-aligned lyric timing as the base source before final audio validation.");
      } else if (payload.syncMode === "synced-lyrics") {
        renderLines = limitLyricLines(
          applyLyricOffset(renderLines, lyricOffsetSeconds, durationSeconds),
          durationSeconds
        );
        renderLineSyncSource = "synced-lyrics";
        renderLinesAreTranscriptDerived = false;
        renderNotes.push("Using synced web lyrics as the primary timing source.");
      } else if (payload.syncMode === "transcribed" && canUseAudioTranscription) {
        const isUploadedAudioSource =
          String(payload?.videoId || "").startsWith("upload-") || Boolean(payload?.customAudioUpload);

        if (isUploadedAudioSource) {
          const uploadedAudioTranscriptSourceLines = transcriptTimingLines.length
            ? transcriptTimingLines
            : renderLines;
          const stabilizedUploadedTranscriptLines = limitLyricLines(
            sanitizeLyricLines(
              smoothTranscribedLyricGaps(uploadedAudioTranscriptSourceLines, durationSeconds),
              durationSeconds
            ),
            durationSeconds
          );
          let uploadedAudioRenderLines = stabilizedUploadedTranscriptLines;
          let preservedUploadedIntroCount = 0;

          if (sourceLyricReferenceLines.length) {
            const wordTimedReferenceLyrics = alignLyricLinesToWordTimeline(
              sourceLyricReferenceLines,
              stabilizedUploadedTranscriptLines,
              [],
              durationSeconds
            );
            const minimumReferenceWordTimedLines = Math.max(
              4,
              Math.round(sourceLyricReferenceLines.length * 0.55)
            );

            if (
              wordTimedReferenceLyrics.applied &&
              wordTimedReferenceLyrics.lines.length >= minimumReferenceWordTimedLines
            ) {
              const introMergedReferenceLyrics = mergeUploadedAudioIntroTranscript({
                transcriptLines: stabilizedUploadedTranscriptLines,
                lyricLines: wordTimedReferenceLyrics.lines,
                durationSeconds
              });

              uploadedAudioRenderLines = introMergedReferenceLyrics.lines;
              preservedUploadedIntroCount = introMergedReferenceLyrics.preservedIntroCount;
              renderNotes.push(
                `Uploaded-audio lyrics were placed against the transcript word timeline (${wordTimedReferenceLyrics.wordCount} detected word slots) so the final lines stay closer to the vocal pacing.`
              );
              if (introMergedReferenceLyrics.applied) {
                renderNotes.push(
                  `Readable spoken intro lines were kept for the first ${introMergedReferenceLyrics.preservedIntroCount} subtitle card${introMergedReferenceLyrics.preservedIntroCount === 1 ? "" : "s"} before the matched song lyrics take over.`
                );
              }
              renderLinesAreTranscriptDerived = false;
            } else {
              const alignedReferenceLyrics = alignLyricLinesToTranscription(
                sourceLyricReferenceLines,
                stabilizedUploadedTranscriptLines,
                durationSeconds
              );
              const minimumReferenceAnchors = Math.max(
                2,
                Math.min(8, Math.round(sourceLyricReferenceLines.length * 0.18))
              );

              if (
                alignedReferenceLyrics.anchorCount >= minimumReferenceAnchors &&
                alignedReferenceLyrics.lines.length >= Math.max(4, Math.round(sourceLyricReferenceLines.length * 0.45))
              ) {
                const introMergedReferenceLyrics = mergeUploadedAudioIntroTranscript({
                  transcriptLines: stabilizedUploadedTranscriptLines,
                  lyricLines: alignedReferenceLyrics.lines,
                  anchors: alignedReferenceLyrics.anchors,
                  durationSeconds
                });

                uploadedAudioRenderLines = introMergedReferenceLyrics.lines;
                preservedUploadedIntroCount = introMergedReferenceLyrics.preservedIntroCount;
                renderNotes.push(
                  `Uploaded-audio lyrics were rebuilt from the song match and aligned to ${alignedReferenceLyrics.anchorCount} transcript anchors so the final words stay closer to the real lyrics.`
                );
                if (introMergedReferenceLyrics.applied) {
                  renderNotes.push(
                    `Readable spoken intro lines were kept for the first ${introMergedReferenceLyrics.preservedIntroCount} subtitle card${introMergedReferenceLyrics.preservedIntroCount === 1 ? "" : "s"} before the matched song lyrics take over.`
                  );
                }
                renderLinesAreTranscriptDerived = false;
              } else {
                const fittedReferenceLyrics = fitLyricLinesToTranscriptWindow(
                  sourceLyricReferenceLines,
                  stabilizedUploadedTranscriptLines,
                  durationSeconds
                );
                const introMergedReferenceLyrics = mergeUploadedAudioIntroTranscript({
                  transcriptLines: stabilizedUploadedTranscriptLines,
                  lyricLines: fittedReferenceLyrics.lines,
                  durationSeconds
                });

                uploadedAudioRenderLines = introMergedReferenceLyrics.lines;
                preservedUploadedIntroCount = introMergedReferenceLyrics.preservedIntroCount;
                renderNotes.push(
                  "The uploaded-audio lyric match could not be anchored confidently enough for line-by-line snapping, so the render kept the matched song words and fit them to the transcript timing window."
                );
                if (introMergedReferenceLyrics.applied) {
                  renderNotes.push(
                    `Readable spoken intro lines were kept for the first ${introMergedReferenceLyrics.preservedIntroCount} subtitle card${introMergedReferenceLyrics.preservedIntroCount === 1 ? "" : "s"} before the matched song lyrics begin.`
                  );
                }
                renderLinesAreTranscriptDerived = false;
              }
            }
          }

          if (sourceLyricReferenceLines.length) {
            const firstTranscriptMeaningfulLine = stabilizedUploadedTranscriptLines.find(
              (line) => getAlignmentWords(line.text).length >= 2
            );
            const firstMatchedLyricLine =
              uploadedAudioRenderLines
                .slice(Math.min(preservedUploadedIntroCount, uploadedAudioRenderLines.length))
                .find((line) => getAlignmentWords(line.text).length >= 2) || null;

            if (
              firstTranscriptMeaningfulLine &&
              firstMatchedLyricLine &&
              preservedUploadedIntroCount === 0
            ) {
              const openingLeadSeconds = roundTimeValue(
                Number(firstTranscriptMeaningfulLine.start || 0) - Number(firstMatchedLyricLine.start || 0)
              );

              if (openingLeadSeconds > 0.18 && openingLeadSeconds < 8) {
                uploadedAudioRenderLines = shiftLyricLines(
                  uploadedAudioRenderLines,
                  openingLeadSeconds,
                  durationSeconds
                );
                renderNotes.push(
                  `Uploaded-audio opening lyrics were delayed by ${openingLeadSeconds}s so the first sung line lands closer to the detected vocal entry.`
                );
              }
            }
          }

          if (sourceLyricReferenceLines.length) {
            const tightenedUploadedLyrics = tightenIntroLyricTiming(
              uploadedAudioRenderLines,
              stabilizedUploadedTranscriptLines,
              durationSeconds
            );

            if (tightenedUploadedLyrics.changed) {
              uploadedAudioRenderLines = tightenedUploadedLyrics.lines;
              renderNotes.push(
                tightenedUploadedLyrics.correctionMode === "opening-anchor-fit" ||
                tightenedUploadedLyrics.correctionMode === "isolated-opening-snap" ||
                tightenedUploadedLyrics.correctionMode === "single-anchor-snap"
                  ? `Uploaded-audio lyric timing was tightened around the opening vocal entry using ${tightenedUploadedLyrics.openingAnchorCount} intro anchor${tightenedUploadedLyrics.openingAnchorCount === 1 ? "" : "s"}.`
                  : "Uploaded-audio lyric timing was tightened around the opening vocal entry before export."
              );
            }

            const calibratedUploadedLyrics = calibrateLyricTimingAgainstTranscript(
              uploadedAudioRenderLines,
              stabilizedUploadedTranscriptLines,
              durationSeconds,
              {
                minimumAnchorScore: 0.34
              }
            );

            if (calibratedUploadedLyrics.changed) {
              uploadedAudioRenderLines = calibratedUploadedLyrics.lines;
              renderNotes.push(
                `Uploaded-audio lyric timing was calibrated against the transcript using ${calibratedUploadedLyrics.inlierAnchorCount} stable anchor${calibratedUploadedLyrics.inlierAnchorCount === 1 ? "" : "s"} so the final lines stay closer to the sung words.`
              );
            }
          }

          const uploadedAudioLyricOffsetSeconds =
            sourceLyricReferenceLines.length && !renderLinesAreTranscriptDerived ? 0 : lyricOffsetSeconds;

          renderLines = limitLyricLines(
            applyLyricOffset(uploadedAudioRenderLines, uploadedAudioLyricOffsetSeconds, durationSeconds),
            durationSeconds
          );
          renderLineSyncSource = "transcribed";
          renderLinesAreTranscriptDerived =
            !sourceLyricReferenceLines.length || uploadedAudioRenderLines === stabilizedUploadedTranscriptLines;
          renderNotes.push(
            "The render kept the uploaded-audio transcript timing from the preview step instead of re-transcribing the same file again."
          );
        } else {
          try {
            const transcription = await getTranscription(
              "Re-transcribing audio to lock final lyric timing",
              0.16,
              {
                task: "transcribe"
              }
            );
            const refinedTranscriptLines = limitLyricLines(
              sanitizeLyricLines(
                smoothTranscribedLyricGaps(romanizeLyricLines(transcription.lines).lines, durationSeconds),
                durationSeconds
              ),
              durationSeconds
            );
            updateJob(job, {
              stage: "Checking sync quality",
              progress: 0.22
            });
            const transcriptTimingMetrics = getTranscriptTimingMetrics(
              refinedTranscriptLines,
              transcription.words,
              durationSeconds
            );
            const wordTimedTranscription = transcriptTimingMetrics.reliableForFullAlignment
              ? alignLyricLinesToWordTimeline(
                  refinedTranscriptLines,
                  refinedTranscriptLines,
                  transcription.words,
                  durationSeconds
                )
              : {
                  lines: refinedTranscriptLines,
                  applied: false,
                  wordCount: transcriptTimingMetrics.wordCount,
                  appliedShift: 0,
                  appliedScale: 1
                };
            const finalTranscribedLines = wordTimedTranscription.applied
              ? wordTimedTranscription.lines
              : refinedTranscriptLines;

            if (finalTranscribedLines.length) {
              renderLines = limitLyricLines(
                applyLyricOffset(finalTranscribedLines, lyricOffsetSeconds, durationSeconds),
                durationSeconds
              );
              renderLineSyncSource = "transcribed";
              renderLinesAreTranscriptDerived = true;
              renderNotes.push(
                wordTimedTranscription.applied
                  ? `The render re-transcribed the audio and repaced the lyric lines across ${wordTimedTranscription.wordCount} detected sung words.`
                  : transcriptTimingMetrics.reliableForWindowFit
                    ? "The render re-transcribed the audio and kept the direct lyric timings because the transcript was too sparse to safely repace the whole song."
                    : "The render re-transcribed the audio with full timing so the final video stays closer to the vocals than the quick website preview."
              );
            } else {
              renderLines = limitLyricLines(
                applyLyricOffset(renderLines, lyricOffsetSeconds, durationSeconds),
                durationSeconds
              );
              renderLineSyncSource = payload.syncMode;
              renderLinesAreTranscriptDerived = false;
              renderNotes.push("The final render could not refine the preview timing, so it kept the website lyric timings.");
            }
          } catch (error) {
            renderLines = limitLyricLines(
              applyLyricOffset(renderLines, lyricOffsetSeconds, durationSeconds),
              durationSeconds
            );
            renderLineSyncSource = payload.syncMode;
            renderLinesAreTranscriptDerived = false;
            renderNotes.push(`Final audio timing refinement was unavailable: ${error.message}`);
          }
        }
      } else if (canUseAudioTranscription) {
        try {
          const transcription = await getTranscription("Transcribing audio to align lyrics", 0.16);
          const romanizedTranscriptLines = romanizeLyricLines(transcription.lines).lines;
          const transcribedRenderLines = limitLyricLines(
            sanitizeLyricLines(
              smoothTranscribedLyricGaps(romanizedTranscriptLines, durationSeconds),
              durationSeconds
            ),
            durationSeconds
          );
          updateJob(job, {
            stage: "Checking sync quality",
            progress: 0.22
          });
          const syncQualityCheck = buildSyncQualityCheck({
            sourceLines: renderLines,
            transcriptLines: romanizedTranscriptLines,
            transcriptWords: transcription.words,
            durationSeconds,
            syncMode: payload.syncMode
          });
          const sourceTimingMetrics = syncQualityCheck.sourceMetrics;
          const transcriptTimingMetrics = syncQualityCheck.transcriptMetrics;
          const sourceLeadDriftSeconds = Math.abs(
            Number(sourceTimingMetrics.firstStart || 0) - Number(transcriptTimingMetrics.firstStart || 0)
          );
          const sourceTailDriftSeconds = Math.abs(
            Number(sourceTimingMetrics.lastEnd || 0) - Number(transcriptTimingMetrics.lastEnd || 0)
          );
          const shouldReplaceEarlyDriftingSource =
            (
              payload.syncMode === "caption-aligned" ||
              payload.syncMode === "captions" ||
              payload.syncMode === "estimated"
            ) &&
            transcriptTimingMetrics.reliableForFullAlignment &&
            (
              sourceLeadDriftSeconds > 1.6 ||
              sourceTailDriftSeconds > 4.8
            );
          const wordTimedTranscribedLines = transcriptTimingMetrics.reliableForFullAlignment
            ? alignLyricLinesToWordTimeline(
                transcribedRenderLines,
                romanizedTranscriptLines,
                transcription.words,
                durationSeconds
              )
            : {
                lines: transcribedRenderLines,
                applied: false,
                wordCount: transcriptTimingMetrics.wordCount,
                appliedShift: 0,
                appliedScale: 1
              };
          const finalTranscribedRenderLines = wordTimedTranscribedLines.applied
            ? wordTimedTranscribedLines.lines
            : transcribedRenderLines;
          let alignedLyrics = {
            lines: [],
            anchorCount: 0
          };

          if (payload.syncMode !== "transcribed") {
            alignedLyrics = alignLyricLinesToTranscription(
              renderLines,
              romanizedTranscriptLines,
              durationSeconds
            );
          }

          const minimumAnchorCount = Math.max(2, Math.round(renderLines.length * 0.08));

          if (
            (prefersTranscribedLyrics || shouldReplaceEarlyDriftingSource) &&
            finalTranscribedRenderLines.length &&
            transcriptTimingMetrics.reliableForFullAlignment
          ) {
            renderLines = applyLyricOffset(
              finalTranscribedRenderLines,
              transcribedLyricOffsetSeconds,
              durationSeconds
            );
            renderLineSyncSource = "transcribed";
            renderLinesAreTranscriptDerived = true;
            renderNotes.push(
              shouldReplaceEarlyDriftingSource
                ? wordTimedTranscribedLines.applied
                  ? `The original lyric timing started drifting away from the detected vocals, so the render switched to audio-transcribed lyric lines paced across ${wordTimedTranscribedLines.wordCount} sung words.`
                  : "The original lyric timing started drifting away from the detected vocals, so the render switched to audio-transcribed lyric lines."
                : wordTimedTranscribedLines.applied
                  ? `The original lyric source was too sparse for a full render, so the video switched to audio-transcribed lyric lines paced across ${wordTimedTranscribedLines.wordCount} sung words.`
                  : "The original lyric source was too sparse for a full render, so the video switched to audio-transcribed lyric lines."
            );
          } else if (syncQualityCheck.rejectUnsafeTranscriptAlignment) {
            await recordAdaptiveSignalSafely({
              channelTitle: payload.channelTitle,
              title: payload.title || payload.song?.title || "",
              category: "sparse_transcript",
              message: syncQualityCheck.reason
            });
            const safeWindowLyrics = syncQualityCheck.preferSafeAudioWindowFit
              ? fitLyricLinesToAudioWindow(
                  renderLines,
                  durationSeconds,
                  transcriptTimingMetrics.firstStart
                )
              : {
                  lines: renderLines,
                  appliedShift: 0,
                  appliedScale: 1
                };
            const safeLines =
              safeWindowLyrics.appliedShift > 0 || Math.abs(safeWindowLyrics.appliedScale - 1) >= 0.06
                ? safeWindowLyrics.lines
                : renderLines;

            renderLines = limitLyricLines(
              applyLyricOffset(safeLines, lyricOffsetSeconds, durationSeconds),
              durationSeconds
            );
            renderLineSyncSource = payload.syncMode;
            renderLinesAreTranscriptDerived = false;
            renderNotes.push(
              syncQualityCheck.preferSafeAudioWindowFit
                ? `Automatic sync quality check rejected unsafe transcript timing because ${syncQualityCheck.reason}, so the render used the safer audio-span fit instead.`
                : `Automatic sync quality check rejected unsafe transcript timing because ${syncQualityCheck.reason}, so the render kept the original lyric pacing.`
            );
          } else if (
            transcriptTimingMetrics.reliableForFullAlignment &&
            alignedLyrics.anchorCount >= minimumAnchorCount &&
            alignedLyrics.lines.length
          ) {
            const wordTimedAlignedLyrics = alignLyricLinesToWordTimeline(
              alignedLyrics.lines,
              romanizedTranscriptLines,
              transcription.words,
              durationSeconds
            );
            const finalAlignedLyrics = wordTimedAlignedLyrics.applied
              ? wordTimedAlignedLyrics.lines
              : alignedLyrics.lines;

            renderLines = limitLyricLines(
              applyLyricOffset(finalAlignedLyrics, lyricOffsetSeconds, durationSeconds),
              durationSeconds
            );
            renderLineSyncSource = payload.syncMode;
            renderLinesAreTranscriptDerived = false;
            renderNotes.push(
              wordTimedAlignedLyrics.applied
                ? `Lyric timing was realigned against the song audio using ${alignedLyrics.anchorCount} transcription anchors and ${wordTimedAlignedLyrics.wordCount} detected sung words.`
                : `Lyric timing was realigned against the song audio using ${alignedLyrics.anchorCount} transcription anchors.`
            );
          } else {
            const leadInAdjustedLyrics = fitLyricLinesToTranscriptWindow(
              renderLines,
              transcribedRenderLines,
              durationSeconds
            );
            const audioWindowLyrics =
              transcriptTimingMetrics.reliableForWindowFit &&
              (payload.syncMode === "estimated" || payload.syncMode === "caption-aligned")
                ? fitLyricLinesToAudioWindow(
                    renderLines,
                    durationSeconds,
                    transcriptTimingMetrics.firstStart
                  )
                : {
                    lines: renderLines,
                    appliedShift: 0,
                    appliedScale: 1
                  };
            const fallbackLines = audioWindowLyrics.appliedShift > 0 || Math.abs(audioWindowLyrics.appliedScale - 1) >= 0.06
                ? audioWindowLyrics.lines
                : leadInAdjustedLyrics.lines;

            renderLines = limitLyricLines(
              applyLyricOffset(fallbackLines, lyricOffsetSeconds, durationSeconds),
              durationSeconds
            );
            renderLineSyncSource = payload.syncMode;
            renderLinesAreTranscriptDerived = false;
            renderNotes.push(
              audioWindowLyrics.appliedShift > 0 || Math.abs(audioWindowLyrics.appliedScale - 1) >= 0.06
                ? `The transcript was too sparse for full-line alignment, so the render kept the original lyric pacing and only fit it to the audio span (shift ${audioWindowLyrics.appliedShift}s, scale ${audioWindowLyrics.appliedScale}x).`
                : leadInAdjustedLyrics.appliedShift > 0 || Math.abs(leadInAdjustedLyrics.appliedScale - 1) >= 0.08
                  ? `Audio anchor matching was low, so the render retimed the lyric sheet to the sung section (shift ${leadInAdjustedLyrics.appliedShift}s, scale ${leadInAdjustedLyrics.appliedScale}x).`
                  : "Audio alignment confidence was low, so the render kept the original lyric timing with only a minimal safety offset."
            );
          }
        } catch (error) {
          renderLines = limitLyricLines(
            applyLyricOffset(renderLines, lyricOffsetSeconds, durationSeconds),
            durationSeconds
          );
          renderLineSyncSource = payload.syncMode;
          renderLinesAreTranscriptDerived = false;
          renderNotes.push(`Audio sync alignment was unavailable: ${error.message}`);
        }
      } else {
        renderLines = limitLyricLines(
          applyLyricOffset(renderLines, lyricOffsetSeconds, durationSeconds),
          durationSeconds
        );
        renderLineSyncSource = payload.syncMode;
        renderLinesAreTranscriptDerived = false;
        renderNotes.push(
          "The render kept the existing lyric timing because YouTube blocked the audio needed for deeper sync alignment."
        );
      }
    }

    if (!renderLines.length && canUseAudioTranscription) {
      try {
        const transcription = await getTranscription(
          shouldUseRomanizedTeluguLyrics
            ? "Transcribing Telugu song audio in English letters"
            : "Transcribing audio for missing lyrics",
          0.16,
          shouldUseRomanizedTeluguLyrics
            ? {
                task: "transcribe",
                language: "te"
              }
            : {}
        );
        const romanizedTranscription = shouldUseRomanizedTeluguLyrics
          ? romanizeLyricLines(
              sanitizeLyricLines(
                smoothTranscribedLyricGaps(transcription.lines, durationSeconds),
                durationSeconds
              )
            ).lines
          : sanitizeLyricLines(
              smoothTranscribedLyricGaps(transcription.lines, durationSeconds),
              durationSeconds
            );
        const wordTimedTranscription = alignLyricLinesToWordTimeline(
          romanizedTranscription,
          romanizedTranscription,
          transcription.words,
          durationSeconds
        );
        const finalFallbackTranscription = wordTimedTranscription.applied
          ? wordTimedTranscription.lines
          : romanizedTranscription;

        renderLines = limitLyricLines(
          applyLyricOffset(
            finalFallbackTranscription,
            shouldUseRomanizedTeluguLyrics ? transcribedLyricOffsetSeconds : lyricOffsetSeconds,
            durationSeconds
          ),
          durationSeconds
        );
        renderLineSyncSource = "transcribed";
        renderLinesAreTranscriptDerived = true;

        if (renderLines.length) {
          renderNotes.push(
            shouldUseRomanizedTeluguLyrics
              ? wordTimedTranscription.applied
                ? `No usable lyric sheet was found, so timed Telugu lyric lines were rebuilt from ${wordTimedTranscription.wordCount} detected sung words and shown in English letters.`
                : "No usable lyric sheet was found, so timed Telugu lyric lines were shown in English letters from the audio."
              : wordTimedTranscription.applied
                ? `No web lyrics were found, so timed lyric lines were rebuilt from ${wordTimedTranscription.wordCount} detected sung words.`
                : "No web lyrics were found, so timed lyric lines were created from the audio."
          );
        }
      } catch (error) {
        renderNotes.push(error.message);
      }
    }

    const isUploadedAudioSource =
      String(payload?.videoId || "").startsWith("upload-") || Boolean(payload?.customAudioUpload);
    const isShortFormSource =
      /\/shorts\//i.test(`${payload?.inputUrl || payload?.url || ""}`) ||
      (!isUploadedAudioSource && Number(durationSeconds || 0) > 0 && Number(durationSeconds || 0) <= 75);
    const hasLoadedRenderableLyrics = getSourceTimingMetrics(renderLines, durationSeconds).meaningfulCount >= 2;
    const shortFormTrustedSyncModes = new Set([
      "transcribed",
      "caption-aligned",
      "captions",
      "estimated"
    ]);
    const shouldSkipTrustedSyncedLyricVerification =
      payload?.syncMode === "synced-lyrics" ||
      (
        hasLoadedRenderableLyrics &&
        (
          (isUploadedAudioSource && renderLineSyncSource === "transcribed") ||
          (isShortFormSource && shortFormTrustedSyncModes.has(renderLineSyncSource))
        )
      );

    if (shouldSkipTrustedSyncedLyricVerification) {
      renderNotes.push(
        payload?.syncMode === "synced-lyrics"
          ? "Final sync verification was skipped because synced web lyrics are already trusted as the timing source."
          : isUploadedAudioSource && renderLineSyncSource === "transcribed"
            ? "Final sync verification was skipped because this uploaded-audio render is already using lyrics created from the uploaded soundtrack."
            : isShortFormSource
              ? "Final sync verification was skipped because this short-form render already has usable loaded lyric timing."
              : "Final sync verification was skipped."
      );
    } else if (payload.requireVerifiedSync !== false && canUseAudioTranscription) {
      updateJob(job, {
        stage: "Checking lyric/audio sync",
        progress: 0.3
      });

      const canUseStrongSourceValidationFallback =
        !renderLinesAreTranscriptDerived &&
        ["synced-lyrics", "caption-aligned", "captions"].includes(renderLineSyncSource);
      const validationOptions = shouldUseRomanizedTeluguLyrics
        ? {
            task: "transcribe",
            language: "te"
          }
        : {
            task: "transcribe"
          };

      if (canUseStrongSourceValidationFallback) {
        validationOptions.preview = true;
        validationOptions.modelName = process.env.WHISPER_PREVIEW_MODEL || "tiny";
        validationOptions.beamSize = 1;
        validationOptions.vadFilter = false;
        validationOptions.conditionOnPreviousText = false;
        validationOptions.timeoutMs = 75 * 1000;
        validationOptions.downloadTimeoutMs = 75 * 1000;
      }

      async function evaluateStrictSyncValidationPass(validationTranscription) {
        const normalizedValidationTranscript = limitLyricLines(
          sanitizeLyricLines(
            smoothTranscribedLyricGaps(
              romanizeLyricLines(validationTranscription.lines).lines,
              durationSeconds
            ),
            durationSeconds
          ),
          durationSeconds
        );
        const introTightening = tightenIntroLyricTiming(
          renderLines,
          normalizedValidationTranscript,
          durationSeconds
        );

        if (introTightening.changed) {
          renderLines = limitLyricLines(introTightening.lines, durationSeconds);
          renderNotes.push(
            introTightening.correctionMode === "opening-anchor-fit"
              ? introTightening.trimmedIntroCount > 0
                ? `Intro timing was tightened before render by trimming ${introTightening.trimmedIntroCount} unsupported opening ad-lib line${introTightening.trimmedIntroCount === 1 ? "" : "s"} and refitting the opening lyrics against ${introTightening.openingAnchorCount} early transcript anchors.`
                : `Intro timing was tightened before render by refitting the opening lyrics against ${introTightening.openingAnchorCount} early transcript anchors.`
              : introTightening.trimmedIntroCount > 0 && Math.abs(introTightening.appliedShift) >= 0.05
                ? `Intro timing was tightened before render by trimming ${introTightening.trimmedIntroCount} unsupported opening ad-lib line${introTightening.trimmedIntroCount === 1 ? "" : "s"} and snapping the opening lyrics by ${roundTimeValue(introTightening.appliedShift)}s to match the detected vocals.`
                : introTightening.trimmedIntroCount > 0
                  ? `Intro timing was tightened before render by trimming ${introTightening.trimmedIntroCount} unsupported opening ad-lib line${introTightening.trimmedIntroCount === 1 ? "" : "s"}.`
                  : `Intro timing was tightened before render by snapping the opening lyrics by ${roundTimeValue(introTightening.appliedShift)}s to match the detected vocals.`
          );
        }

        const transcriptCalibration = calibrateLyricTimingAgainstTranscript(
          renderLines,
          normalizedValidationTranscript,
          durationSeconds
        );

        if (transcriptCalibration.changed) {
          renderLines = limitLyricLines(transcriptCalibration.lines, durationSeconds);
          renderNotes.push(
            `Final lyric timing was calibrated against ${transcriptCalibration.inlierAnchorCount} stable lyric/audio anchors, shifting the whole lyric sheet by ${roundTimeValue(transcriptCalibration.appliedShift)}s.`
          );
        } else if (
          (renderLineSyncSource === "synced-lyrics" ||
            renderLineSyncSource === "caption-aligned" ||
            renderLineSyncSource === "captions" ||
            renderLineSyncSource === "estimated") &&
          normalizedValidationTranscript.length
        ) {
          const sparseTranscriptCalibration = calibrateLyricTimingAgainstTranscript(
            renderLines,
            normalizedValidationTranscript,
            durationSeconds,
            {
              minimumAnchorScore: 0.34
            }
          );

          if (sparseTranscriptCalibration.changed) {
            renderLines = limitLyricLines(sparseTranscriptCalibration.lines, durationSeconds);
            renderNotes.push(
              `Final lyric timing used a sparse-transcript correction pass and shifted the lyric sheet by ${roundTimeValue(sparseTranscriptCalibration.appliedShift)}s from ${sparseTranscriptCalibration.inlierAnchorCount} stable anchors.`
            );
          }
        }

        let strictSyncReport = buildStrictSyncValidationReport({
          candidateLines: renderLines,
          transcriptLines: normalizedValidationTranscript,
          transcriptWords: validationTranscription.words,
          durationSeconds,
          syncMode: renderLineSyncSource,
          transcriptDerived: renderLinesAreTranscriptDerived,
          referenceLines: sourceLyricReferenceLines
        });

        if (!strictSyncReport.approved && normalizedValidationTranscript.length) {
          const validationTranscriptMetrics = getTranscriptTimingMetrics(
            normalizedValidationTranscript,
            validationTranscription.words,
            durationSeconds
          );
          const directTranscriptCandidateLines = limitLyricLines(
            applyLyricOffset(
              normalizedValidationTranscript,
              transcribedLyricOffsetSeconds,
              durationSeconds
            ),
            durationSeconds
          );
          const directTranscriptMinimumCount =
            !sourceLyricReferenceLines.length
              ? 8
              : Math.max(8, Math.round(sourceLyricReferenceLines.length * 0.55));
          const directTranscriptCandidateReport =
            validationTranscriptMetrics.reliableForFullAlignment &&
            directTranscriptCandidateLines.length >= directTranscriptMinimumCount
              ? {
                  approved: true,
                  reason: "",
                  approvalMode: "validation-transcript-direct",
                  anchorCount: directTranscriptCandidateLines.length,
                  anchorCoverageRatio: 1,
                  averageAnchorScore: 1,
                  averageDriftSeconds: 0,
                  maxDriftSeconds: 0,
                  transcriptDerived: true,
                  candidateMetrics: getSourceTimingMetrics(
                    directTranscriptCandidateLines,
                    durationSeconds
                  ),
                  transcriptMetrics: validationTranscriptMetrics,
                  referenceMetrics: getSourceTimingMetrics(
                    sourceLyricReferenceLines.length
                      ? sourceLyricReferenceLines
                      : directTranscriptCandidateLines,
                    durationSeconds
                  )
                }
              : buildStrictSyncValidationReport({
                  candidateLines: directTranscriptCandidateLines,
                  transcriptLines: normalizedValidationTranscript,
                  transcriptWords: validationTranscription.words,
                  durationSeconds,
                  syncMode: "transcribed",
                  transcriptDerived: true,
                  referenceLines: sourceLyricReferenceLines
                });
          const introPreservedTranscriptCandidate = buildIntroPreservedTranscriptCandidate({
            sourceLines: renderLines,
            transcriptLines: directTranscriptCandidateLines,
            transcriptMetrics: validationTranscriptMetrics,
            syncMode: renderLineSyncSource,
            transcriptDerived: renderLinesAreTranscriptDerived,
            durationSeconds
          });
          const transcriptWordAlignedCandidate = alignLyricLinesToWordTimeline(
            normalizedValidationTranscript,
            normalizedValidationTranscript,
            validationTranscription.words,
            durationSeconds
          );
          const wordTimedTranscriptCandidateLines = limitLyricLines(
            applyLyricOffset(
              transcriptWordAlignedCandidate.applied
                ? transcriptWordAlignedCandidate.lines
                : normalizedValidationTranscript,
              transcribedLyricOffsetSeconds,
              durationSeconds
            ),
            durationSeconds
          );
          const wordTimedTranscriptCandidateReport = buildStrictSyncValidationReport({
            candidateLines: wordTimedTranscriptCandidateLines,
            transcriptLines: normalizedValidationTranscript,
            transcriptWords: validationTranscription.words,
            durationSeconds,
            syncMode: "transcribed",
            transcriptDerived: true,
            referenceLines: sourceLyricReferenceLines
          });
          const transcriptCandidateLines =
            directTranscriptCandidateReport.approved && introPreservedTranscriptCandidate.applied
              ? introPreservedTranscriptCandidate.lines
              : directTranscriptCandidateReport.approved
                ? directTranscriptCandidateLines
                : wordTimedTranscriptCandidateLines;
          const transcriptCandidateReport =
            directTranscriptCandidateReport.approved && introPreservedTranscriptCandidate.applied
              ? {
                  ...directTranscriptCandidateReport,
                  approvalMode: "validation-transcript-intro-preserved",
                  candidateMetrics: getSourceTimingMetrics(
                    introPreservedTranscriptCandidate.lines,
                    durationSeconds
                  )
                }
              : directTranscriptCandidateReport.approved
                ? directTranscriptCandidateReport
                : wordTimedTranscriptCandidateReport;

          if (
            transcriptCandidateReport.approved &&
            (
              !sourceLyricReferenceLines.length ||
              transcriptCandidateLines.length >= Math.max(8, Math.round(sourceLyricReferenceLines.length * 0.55))
            )
          ) {
            renderLines = transcriptCandidateLines;
            renderLineSyncSource = "transcribed";
            renderLinesAreTranscriptDerived = true;
            strictSyncReport = transcriptCandidateReport;
            renderNotes.push(
              introPreservedTranscriptCandidate.applied && directTranscriptCandidateReport.approved
                ? `Strict sync verification preserved ${introPreservedTranscriptCandidate.preservedIntroCount} trusted intro lyric line${introPreservedTranscriptCandidate.preservedIntroCount === 1 ? "" : "s"} and rebuilt the rest from the audio before rendering.`
                : "Strict sync verification replaced the original lyric sheet with audio-built lyrics before rendering."
            );
          }
        }

        return {
          strictSyncReport
        };
      }

      async function runDeeperSyncRetry(baseOptions, reasonMessage = "") {
        updateJob(job, {
          stage: "Retrying deeper sync pass",
          progress: 0.32
        });

        renderNotes.push(
          reasonMessage ||
            "Checking lyric/audio sync stayed weak, so the render is retrying a deeper sync pass before export."
        );

        return getTranscription(
          "Retrying deeper sync pass",
          0.32,
          buildDeeperSyncRetryOptions(baseOptions, adaptiveProfile)
        );
      }

      let validationTranscription = null;
      let strictSyncReport = null;
      let usedDeeperSyncRetry = false;

      try {
        validationTranscription = await getTranscription(
          "Checking lyric/audio sync",
          0.3,
          validationOptions
        );
      } catch (error) {
        validationTranscription = await runDeeperSyncRetry(
          validationOptions,
          `Initial lyric/audio sync check failed (${summarizeErrorMessage(error)}), so the render is retrying a deeper sync pass before export.`
        );
        usedDeeperSyncRetry = true;
      }

      if (
        validationOptions.preview &&
        canUseStrongSourceValidationFallback &&
        shouldDeepenValidationTranscription(validationTranscription, durationSeconds)
      ) {
        validationTranscription = await runDeeperSyncRetry(
          validationOptions,
          "Quick sync validation was too sparse across the song, so the render reran a deeper audio check before export."
        );
        usedDeeperSyncRetry = true;
      }

      ({ strictSyncReport } = await evaluateStrictSyncValidationPass(validationTranscription));

      if (!strictSyncReport.approved && !usedDeeperSyncRetry) {
        validationTranscription = await runDeeperSyncRetry(
          validationOptions,
          `The first lyric/audio sync pass stayed too weak because ${normalizeWhitespace(strictSyncReport.reason || "the timing could not be verified")}, so the render is retrying a deeper sync pass before export.`
        );
        usedDeeperSyncRetry = true;
        ({ strictSyncReport } = await evaluateStrictSyncValidationPass(validationTranscription));
      }

      if (!strictSyncReport.approved) {
        renderNotes.push(
          "Render stopped because lyrics did not match the audio closely enough after the deeper sync pass."
        );
        throw createStrictSyncValidationError(strictSyncReport);
      }

      renderNotes.push(formatStrictSyncApprovalSummary(strictSyncReport));
    }

    if (!shouldSkipTrustedSyncedLyricVerification && payload.requireVerifiedSync !== false && !canUseAudioTranscription) {
      renderNotes.push(
        "Final sync verification was skipped because YouTube blocked the server-side audio needed for that safety pass."
      );
    }

    if (renderLines.length && isUploadedAudioSource) {
      const lateUploadedAudioTiming = fitLateUploadedAudioLyricsToAudioWindow(renderLines, durationSeconds);

      if (lateUploadedAudioTiming.changed) {
        renderLines = limitLyricLines(lateUploadedAudioTiming.lines, durationSeconds);
        renderNotes.push(
          `Uploaded-audio lyric timing was recovered because the first subtitle was delayed until ${roundTimeValue(lateUploadedAudioTiming.firstStart)}s, so the final lyric sheet was fit across the audible song window before export.`
        );
      }
    }

    if (!renderLines.length) {
      await recordAdaptiveSignalSafely({
        channelTitle: payload.channelTitle,
        title: payload.title || payload.song?.title || "",
        category: "lyrics_unavailable",
        message: "No verified lyric lines were available after all render-time recovery steps."
      });

      if (!shouldSkipTrustedSyncedLyricVerification && payload.requireVerifiedSync !== false && canUseAudioTranscription) {
        throw createRenderError(
          "No verified lyric lines were available for this video, so the app stopped before rendering.",
          422
        );
      }

      renderLines = buildFallbackLines(payload, durationSeconds);
      renderNotes.push("Lyrics were not found or transcribed, so the video uses artist and title cards instead.");
    } else {
      renderNotes.push("Lyrics animate in bold kinetic title cards with fast entry and exit motion.");
    }

    const uploadedImageTimelineProfile = uploadedBackgroundPaths.length && !uploadedBackgroundVideo
      ? {
          ...renderProfile,
          minSceneCount: Math.max(1, Math.min(renderProfile.minSceneCount, uploadedBackgroundPaths.length)),
          maxSceneCount: Math.max(
            2,
            Math.min(renderProfile.maxSceneCount, Math.max(uploadedBackgroundPaths.length, uploadedBackgroundPaths.length * 2))
          ),
          minSceneSeconds: Math.max(renderProfile.minSceneSeconds, 14)
        }
      : renderProfile;
    const backgroundPlan = buildBackgroundTimeline(renderLines, durationSeconds, uploadedImageTimelineProfile).map((scene) => ({
      ...scene,
      heroIndex: 0
    }));
    const emojiAssetMap = await prepareColorEmojiAssets(renderDirectory, renderLines);
    const isAudioOnlyProject =
      (String(payload?.videoId || "").startsWith("upload-") || Boolean(payload?.customAudioUpload)) &&
      !uploadedBackgroundVideo &&
      !uploadedBackgroundPaths.length;
    let backgroundPaths;
    let manifestPath = path.join(renderDirectory, "backgrounds.concat");
    let movingBackgroundInputPath = "";
    let backgroundManifestPrepared = false;
    let backgroundMode = isAudioOnlyProject
      ? "safe-fallback"
      : uploadedBackgroundVideo
      ? "uploaded-video"
      : uploadedBackgroundPaths.length
        ? "uploaded-images"
        : "sampled-panels";

    try {
      if (isAudioOnlyProject) {
        renderNotes.push(
          "This project started from uploaded audio only, so the render is using generated backgrounds instead of trying to sample artwork from a source video."
        );
        backgroundPaths = await createEmergencyBackgroundPlates(
          job,
          renderDirectory,
          backgroundPlan,
          videoSize,
          "Preparing generated backgrounds for uploaded audio",
          0.18
        );
      } else if (renderProfile.fastMode && !uploadedBackgroundVideo && !uploadedBackgroundPaths.length) {
        updateJob(job, {
          stage: "Preparing fast comic backgrounds",
          progress: 0.18
        });
        const comicBackgrounds = await downloadComicBackgrounds(renderDirectory);
        const fastManifest = await writeBackgroundManifest(
          renderDirectory,
          comicBackgrounds,
          durationSeconds,
          renderProfile
        );
        manifestPath = fastManifest.manifestPath;
        backgroundPaths = fastManifest.slideshowPlan.map((scene) => scene.path);
        backgroundMode = "fast-comic";
      } else if (uploadedBackgroundVideo) {
        backgroundPaths = await createUploadedVideoBackgroundPlates(
          job,
          uploadedBackgroundVideo,
          renderDirectory,
          backgroundPlan,
          videoSize
        );
        const movingBackgroundManifest = await createUploadedVideoBackgroundManifest(
          job,
          uploadedBackgroundVideo,
          renderDirectory,
          durationSeconds,
          videoSize,
          renderProfile
        );
        manifestPath = movingBackgroundManifest.manifestPath;
        movingBackgroundInputPath = movingBackgroundManifest.filePath;
        backgroundManifestPrepared = true;
      } else if (uploadedBackgroundPaths.length) {
        backgroundPaths = await createUploadedBackgroundPlates(
          job,
          uploadedBackgroundPaths,
          renderDirectory,
          backgroundPlan,
          videoSize
        );
      } else {
        const panelPaths = await prepareArtworkPanels(
          job,
          payload,
          renderDirectory,
          durationSeconds,
          renderNotes,
          renderProfile
        );
        backgroundPlan.forEach((scene) => {
          scene.heroIndex = getPanelIndexForTime(scene.heroTime, durationSeconds, panelPaths.length);
        });
        backgroundPaths = await createBackgroundPlates(
          job,
          panelPaths,
          new Array(backgroundPlan.length).fill(null),
          renderDirectory,
          backgroundPlan
        );
      }
    } catch (error) {
      renderNotes.push(
        `Background preparation hit an error (${summarizeErrorMessage(error)}), so the render switched to safe generated backgrounds.`
      );
      backgroundMode = "safe-fallback";
      movingBackgroundInputPath = "";
      backgroundManifestPrepared = false;
      backgroundPaths = await createEmergencyBackgroundPlates(
        job,
        renderDirectory,
        backgroundPlan,
        videoSize
      );
    }

    if (backgroundMode !== "fast-comic" && !backgroundManifestPrepared) {
      await fsp.writeFile(manifestPath, createConcatManifest(backgroundPaths, backgroundPlan), "utf8");
    }
    renderNotes.push(
      backgroundMode === "uploaded-video"
        ? `Your uploaded background video will play behind the lyrics; ${backgroundPaths.length} sampled frames are only used for lyric readability analysis.`
        : backgroundMode === "uploaded-images"
          ? `${backgroundPaths.length} background scenes were built from your uploaded images.`
          : backgroundMode === "fast-comic"
            ? `${backgroundPaths.length} lightweight comic backgrounds were downloaded for the fast render path.`
          : backgroundMode === "safe-fallback"
            ? `${backgroundPaths.length} safe fallback background scenes were generated automatically to keep the render from failing.`
            : `${backgroundPaths.length} comic background scenes were built from sampled video frames.`
    );

    const selectedLyricStylePreset = resolveLyricStylePreset(payload?.lyricStyle || "auto");
    const requiresPlacementAnalysis =
      selectedLyricStylePreset.key === "fulllength" ||
      selectedLyricStylePreset.key === "aa" ||
      selectedLyricStylePreset.key === "auto";
    renderLines = applyFinalLyricTimingMode(renderLines, durationSeconds);
    renderNotes.push(
      Number(durationSeconds || 0) < 90
        ? "Shorts lyric timing mode is active: lines use tight vocal starts with 1.5s minimum display time."
        : "Long-video lyric timing mode is active: lines use synced lyric starts with 0.1s pre-roll and 2.5s minimum display time."
    );
    const contrastMap = await buildLyricContrastMap(renderLines, backgroundPaths, backgroundPlan);
    const placementMap = requiresPlacementAnalysis
      ? await buildLyricPlacementMap(renderLines, backgroundPaths, backgroundPlan)
      : [];

    const subtitleBuild = createAssSubtitleContent(
      renderLines,
      {
        ...payload,
        renderNotes
      },
      durationSeconds,
      videoSize,
      {
        emojiAssetMap,
        contrastMap,
        placementMap
      }
    );
    const emojiAssetEntries = [...new Set(subtitleBuild.emojiOverlays.map((overlay) => overlay.emoji))]
      .filter((emoji) => emojiAssetMap[emoji])
      .map((emoji) => {
        const emojiSize = subtitleBuild.emojiOverlays.find((overlay) => overlay.emoji === emoji)?.size || 48;
        return {
          emoji,
          filePath: emojiAssetMap[emoji],
          size: emojiSize
        };
      });
    const selectedFontPreset = resolveLyricFontPreset(payload?.lyricFont || "arial");
    const fontsDirRelative = await prepareLyricFontAssets(renderDirectory, [selectedFontPreset]);

    if (emojiAssetEntries.length) {
      renderNotes.push("Color emoji are composited as image overlays in the final video.");
    }

    updateJob(job, {
      stage: "Building lyric animation",
      progress: 0.38
    });
    await fsp.writeFile(path.join(renderDirectory, "lyrics.ass"), subtitleBuild.content, "utf8");
    let outputVideoPath;

    try {
      outputVideoPath = await renderVideo(
        job,
        manifestPath,
        audioUrl,
        renderDirectory,
        durationSeconds,
        videoSize,
        {
          emojiOverlays: subtitleBuild.emojiOverlays,
          emojiAssetEntries,
          fontsDirRelative,
          renderProfile,
          backgroundVideoInputPath: movingBackgroundInputPath
        }
      );
    } catch (error) {
      if (/^https?:\/\//i.test(String(audioUrl || "")) && isAudioTransportError(error)) {
        try {
          const recoveredAudioSource = await resolveAudioInput(payload.videoId, {
            outputDirectory: audioInputDirectory,
            allowDownloadFallback: true,
            preferLocal: true,
            preferKnownBlockRecovery: true
          });

          if (
            recoveredAudioSource.sourceType === "file" &&
            recoveredAudioSource.input &&
            recoveredAudioSource.input !== audioUrl
          ) {
            audioUrl = recoveredAudioSource.input;
            renderNotes.push(
              "The live audio stream dropped during export, so the app switched to a downloaded local audio file automatically."
            );

            outputVideoPath = await renderVideo(
              job,
              manifestPath,
              audioUrl,
              renderDirectory,
              durationSeconds,
              videoSize,
              {
                stageLabel: "Rendering lyric video with recovered audio",
                progressStart: 0.44,
                progressSpan: 0.5,
                emojiOverlays: subtitleBuild.emojiOverlays,
                emojiAssetEntries,
                fontsDirRelative,
                renderProfile
              }
            );
          }
        } catch (audioRecoveryError) {
          renderNotes.push(
            `Audio recovery could not replace the live stream (${summarizeErrorMessage(audioRecoveryError)}), so the render is falling back to the safer backup path.`
          );
        }
      }

      if (outputVideoPath) {
        renderNotes.push("Primary render recovery completed successfully after replacing the audio source.");
      } else {
        renderNotes.push(
          `Primary render path failed (${summarizeErrorMessage(error)}), so the app is retrying with a safer backup render while keeping the prepared background scenes.`
        );

        try {
          outputVideoPath = await renderVideo(
            job,
            manifestPath,
            audioUrl,
            renderDirectory,
            durationSeconds,
            videoSize,
            {
              stageLabel: "Rendering backup lyric video",
              progressStart: 0.48,
              progressSpan: 0.48,
              filterGraph: createSafeFilterScript(videoSize, subtitleBuild.emojiOverlays, emojiAssetEntries, fontsDirRelative, renderProfile),
              forceSoftwareEncoder: true,
              emojiOverlays: subtitleBuild.emojiOverlays,
              emojiAssetEntries,
              fontsDirRelative,
              renderProfile,
              backgroundVideoInputPath: movingBackgroundInputPath
            }
          );
          renderNotes.push("Backup render recovery completed successfully while preserving the prepared background scenes.");
        } catch (backupRenderError) {
          renderNotes.push(
            `Backup render with the original background scenes also failed (${summarizeErrorMessage(backupRenderError)}), so the app is generating emergency fallback backgrounds.`
          );

          try {
            const safeBackgroundPaths = await createEmergencyBackgroundPlates(
              job,
              renderDirectory,
              backgroundPlan,
              videoSize,
              "Preparing backup render backgrounds",
              0.4
            );
            const safeManifestPath = path.join(renderDirectory, "backgrounds-safe.concat");
            await fsp.writeFile(
              safeManifestPath,
              createConcatManifest(safeBackgroundPaths, backgroundPlan),
              "utf8"
            );

            outputVideoPath = await renderVideo(
              job,
              safeManifestPath,
              audioUrl,
              renderDirectory,
              durationSeconds,
              videoSize,
              {
                stageLabel: "Rendering emergency fallback lyric video",
                progressStart: 0.52,
                progressSpan: 0.44,
                filterGraph: createSafeFilterScript(videoSize, subtitleBuild.emojiOverlays, emojiAssetEntries, fontsDirRelative, renderProfile),
                forceSoftwareEncoder: true,
                emojiOverlays: subtitleBuild.emojiOverlays,
                emojiAssetEntries,
                fontsDirRelative,
                renderProfile
              }
            );
            renderNotes.push("Emergency fallback render completed successfully.");
          } catch (safeBackgroundError) {
            renderNotes.push(
              `Emergency fallback backgrounds still failed (${summarizeErrorMessage(safeBackgroundError)}), so the app is switching to a solid-color background to keep the render alive.`
            );

            const solidBackgroundManifestPath = await createSolidColorBackgroundManifest(
              job,
              renderDirectory,
              backgroundPlan,
              videoSize,
              durationSeconds,
              "Preparing solid fallback background",
              0.5
            );

            outputVideoPath = await renderVideo(
              job,
              solidBackgroundManifestPath,
              audioUrl,
              renderDirectory,
              durationSeconds,
              videoSize,
              {
                stageLabel: "Rendering solid fallback lyric video",
                progressStart: 0.56,
                progressSpan: 0.4,
                filterGraph: createSafeFilterScript(videoSize, subtitleBuild.emojiOverlays, emojiAssetEntries, fontsDirRelative, renderProfile),
                forceSoftwareEncoder: true,
                emojiOverlays: subtitleBuild.emojiOverlays,
                emojiAssetEntries,
                fontsDirRelative,
                renderProfile
              }
            );
            renderNotes.push("Solid fallback render completed successfully after the background concat path failed.");
          }
        }
      }
    }

    updateJob(job, {
      status: "completed",
      stage: "Render complete",
      progress: 1,
      notes: Array.from(new Set([...(Array.isArray(job.notes) ? job.notes : []), ...renderNotes])),
      retrying: false,
      outputVideoPath
    });

    await recordRenderOutcomeSafely({
      channelTitle: payload.channelTitle,
      title: payload.title || payload.song?.title || "",
      status: "completed",
      notes: job.notes
    });
  } catch (error) {
    const shortError = summarizeErrorMessage(error);

    if (attemptNumber < MAX_RENDER_ATTEMPTS && isRecoverableRenderError(error)) {
      appendUniqueJobNote(
        job,
        `Automatic recovery is retrying after: ${shortError}`
      );
      updateJob(job, {
        status: "running",
        stage: `Retrying automatically (${attemptNumber + 1}/${MAX_RENDER_ATTEMPTS})`,
        progress: 0.05,
        retrying: true,
        error: null,
        attempt: attemptNumber + 1,
        maxAttempts: MAX_RENDER_ATTEMPTS
      });
      await cleanupRetryArtifacts(renderDirectory);
      await runRenderWorkflow(job, payload, attemptNumber + 1);
      return;
    }

    appendUniqueJobNote(job, shortError);
    updateJob(job, {
      status: "failed",
      stage: Number(error?.statusCode || 0) === 422 ? "Sync check failed" : "Render failed",
      error: error.message,
      progress: 1,
      retrying: false,
      attempt: attemptNumber,
      maxAttempts: MAX_RENDER_ATTEMPTS
    });

    recordLocalDebugEvent({
      source: "render",
      title: "Render job failed",
      userMessage: buildUserRenderMessage(job),
      errorMessage: error?.message || shortError,
      cause: shortError,
      stack: error?.stack || "",
      details: {
        jobId: job.id,
        videoId: payload.videoId,
        stage: job.stage,
        attempt: attemptNumber,
        lyricStyle: payload.lyricStyle,
        lyricFont: payload.lyricFont,
        renderMode: payload.renderMode,
        syncMode: payload.syncMode,
        notes: job.notes
      }
    });

    await recordRenderOutcomeSafely({
      channelTitle: payload.channelTitle,
      title: payload.title || payload.song?.title || "",
      status: "failed",
      error: error.message,
      notes: job.notes
    });
  }
}

async function startRenderJob(payload) {
  const rawVideoId = `${payload.videoId || ""}`.trim();
  const hasUploadedAudio = Boolean(payload?.customAudioUpload?.tempPath);
  const videoId = rawVideoId.startsWith("upload-")
    ? rawVideoId
    : payload.inputUrl
      ? extractVideoId(payload.inputUrl)
      : rawVideoId
        ? rawVideoId
        : hasUploadedAudio
          ? `upload-${Date.now().toString(36)}`
          : extractVideoId(payload.videoId || payload.inputUrl);
  const titleSlug = slugify(payload.song?.title || payload.title || videoId) || videoId;
  const createdAt = new Date().toISOString();

  await ensureDirectory(rendersRoot);

  const job = {
    id: `${videoId}-${Date.now()}-${titleSlug}`,
    videoId,
    lyricStyle: payload.lyricStyle || "auto",
    lyricFont: payload.lyricFont || "arial",
    status: "queued",
    stage: "Queued",
    progress: 0,
    notes: [],
    error: null,
    attempt: 1,
    maxAttempts: MAX_RENDER_ATTEMPTS,
    retrying: false,
    outputVideoPath: "",
    renderStartedAt: "",
    completedAt: "",
    stageTimings: [
      {
        label: "Queued",
        startedAt: createdAt,
        endedAt: "",
        durationMs: 0
      }
    ],
    createdAt,
    updatedAt: createdAt
  };

  renderJobs.set(job.id, job);
  await persistRenderJob(job);
  runRenderWorkflow(job, {
    ...payload,
    videoId,
    requireVerifiedSync: payload.requireVerifiedSync !== false
  });
  return createJobPublicPayload(job);
}

function getRenderJob(jobId) {
  const job = renderJobs.get(jobId);
  return job ? createJobPublicPayload(job) : null;
}

function getRenderJobFile(jobId) {
  return renderJobs.get(jobId) || null;
}

module.exports = {
  getRenderJob,
  getRenderJobFile,
  initializeRenderJobs,
  startRenderJob
};
