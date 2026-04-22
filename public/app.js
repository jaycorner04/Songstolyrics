const form = document.getElementById("converter-form");
const urlInput = document.getElementById("video-url");
const uploadAudioInlineButton = document.getElementById("upload-audio-inline-button");
const submitButton = document.getElementById("submit-button");
const backgroundImagesInput = document.getElementById("background-images");
const backgroundVideoInput = document.getElementById("background-video");
const backgroundVideoMeta = document.getElementById("background-video-meta");
const audioFallbackInput = document.getElementById("audio-fallback");
const audioFallbackMeta = document.getElementById("audio-fallback-meta");
const audioFallbackField = document.getElementById("audio-fallback-field");
const audioFallbackState = document.getElementById("audio-fallback-state");
const changeAudioFallbackButton = document.getElementById("change-audio-fallback-button");
const deleteAudioFallbackButton = document.getElementById("delete-audio-fallback-button");
const audioFallbackTip = document.getElementById("audio-fallback-tip");
const audioFallbackTipTitle = document.getElementById("audio-fallback-tip-title");
const audioFallbackTipText = document.getElementById("audio-fallback-tip-text");
const audioFallbackTipButton = document.getElementById("audio-fallback-tip-button");
const audioFallbackPopup = document.getElementById("audio-fallback-popup");
const audioFallbackPopupTitle = document.getElementById("audio-fallback-popup-title");
const audioFallbackPopupText = document.getElementById("audio-fallback-popup-text");
const audioFallbackPopupButton = document.getElementById("audio-fallback-popup-button");
const audioFallbackPopupClose = document.getElementById("audio-fallback-popup-close");
const outputFormatInput = document.getElementById("output-format");
const renderModeInput = document.getElementById("render-mode");
const lyricStyleInput = document.getElementById("lyric-style");
const lyricFontInput = document.getElementById("lyric-font");
const lyricFontDropdown = document.getElementById("lyric-font-dropdown");
const lyricFontTrigger = document.getElementById("lyric-font-trigger");
const lyricFontTriggerLabel = document.getElementById("lyric-font-trigger-label");
const lyricFontMenu = document.getElementById("lyric-font-menu");
const lyricFontCount = document.getElementById("lyric-font-count");
const lyricFontZoomInput = document.getElementById("lyric-font-zoom");
const lyricFontZoomValue = document.getElementById("lyric-font-zoom-value");
const lyricFontZoomOutButton = document.getElementById("lyric-font-zoom-out");
const lyricFontZoomInButton = document.getElementById("lyric-font-zoom-in");
const neonStyleControls = document.getElementById("neon-style-controls");
const useStyleColorInput = document.getElementById("use-style-color");
const neonColorInput = document.getElementById("neon-color");
const neonGlowInput = document.getElementById("neon-glow");
const neonGlowValue = document.getElementById("neon-glow-value");
const neonGlowShell = document.getElementById("neon-glow-shell");
const lyricPreviewStyleBadge = document.getElementById("lyric-preview-style-badge");
const lyricPreviewFontLabel = document.getElementById("lyric-preview-font-label");
const lyricPreviewMotionLabel = document.getElementById("lyric-preview-motion-label");
const lyricStylePreview = document.getElementById("lyric-style-preview");
const lyricStylePreviewImage = document.getElementById("lyric-style-preview-image");
const lyricStylePreviewVideo = document.getElementById("lyric-style-preview-video");
const lyricPreviewDragSurface = document.getElementById("lyric-preview-drag-surface");
const previewLinesShell = document.getElementById("preview-lines-shell");
const previewLineNodes = Array.from(document.querySelectorAll(".preview-line"));
const lyricPositionStatus = document.getElementById("lyric-position-status");
const lyricPositionCenterButton = document.getElementById("lyric-position-center-button");
const lyricPositionLowerButton = document.getElementById("lyric-position-lower-button");
const lyricPositionResetButton = document.getElementById("lyric-position-reset-button");
const uploadPreviewStrip = document.getElementById("upload-preview-strip");
const changeUploadedImagesButton = document.getElementById("change-uploaded-images-button");
const deleteUploadedImagesButton = document.getElementById("delete-uploaded-images-button");
const shareButton = document.getElementById("share-button");
const renderButton = document.getElementById("render-button");
const renderText = document.getElementById("render-text");
const renderTools = renderButton?.closest(".render-tools") || null;
const renderProgressBar = document.getElementById("render-progress-bar");
const renderProgressPercent = document.getElementById("render-progress-percent");
const renderStageCard = document.getElementById("render-stage-card");
const renderStageList = document.getElementById("render-stage-list");
const renderStageTotalTime = document.getElementById("render-stage-total-time");
const audioPlayer = document.getElementById("audio-player");
const resultPanel = document.getElementById("result-panel");
const mediaColumn = document.querySelector(".media-column");
const statusCard = document.getElementById("status-card");
const statusText = document.getElementById("status-text");
const localDebugShell = document.getElementById("local-debug-shell");
const musicBulletinStamp = document.getElementById("music-bulletin-stamp");
const musicBulletinHeadline = document.getElementById("music-bulletin-headline");
const musicBulletinText = document.getElementById("music-bulletin-text");
const musicBulletinGrid = document.getElementById("music-bulletin-grid");
const musicBulletinTabs = Array.from(document.querySelectorAll(".music-bulletin-tab"));
const posterImage = document.getElementById("poster-image");
const trackTitle = document.getElementById("track-title");
const trackArtist = document.getElementById("track-artist");
const lyricsSource = document.getElementById("lyrics-source");
const syncMode = document.getElementById("sync-mode");
const audioStatusBadge = document.getElementById("audio-status-badge");
const audioAccessShell = document.getElementById("audio-access-shell");
const audioAccessEyebrow = document.getElementById("audio-access-eyebrow");
const audioAccessTitle = document.getElementById("audio-access-title");
const audioAccessText = document.getElementById("audio-access-text");
const audioAccessAction = document.getElementById("audio-access-action");
const desktopAudioAccessSlot = document.getElementById("desktop-audio-access-slot");
const desktopAudioPreviewSlot = document.getElementById("desktop-audio-preview-slot");
const mobileStageCard = document.getElementById("mobile-stage-card");
const mobileStageSlot = document.getElementById("mobile-stage-slot");
const warningsContainer = document.getElementById("warnings");
const thumbnailStrip = document.getElementById("thumbnail-strip");
const thumbnailCard = document.querySelector(".thumbnail-card");
const lyricsList = document.getElementById("lyrics-list");
const localDebugCard = document.getElementById("local-debug-card");
const localDebugList = document.getElementById("local-debug-list");
const localDebugRefreshButton = document.getElementById("local-debug-refresh-button");
const localDebugClearButton = document.getElementById("local-debug-clear-button");
const localDebugBanner = document.getElementById("local-debug-banner");
const localDebugStatus = document.getElementById("local-debug-status");
const videoOutputCard = document.getElementById("video-output-card");
const renderedVideo = document.getElementById("rendered-video");
const downloadVideoLink = document.getElementById("download-video-link");
const postRenderActions = document.getElementById("post-render-actions");
const changeBackgroundImagesButton = document.getElementById("change-background-images-button");
const changeBackgroundVideoButton = document.getElementById("change-background-video-button");
const clearBackgroundButton = document.getElementById("clear-background-button");
const rerenderBackgroundButton = document.getElementById("rerender-background-button");
const postRenderBackgroundStatus = document.getElementById("post-render-background-status");
const liveBackgroundPreview = document.getElementById("live-background-preview");
const liveBackgroundPreviewImage = document.getElementById("live-background-preview-image");
const liveBackgroundPreviewVideo = document.getElementById("live-background-preview-video");

let currentResult = null;
let lyricButtons = [];
let activeLineIndex = -1;
let renderPollTimer = null;
let activeRenderJobId = "";
let renderPollFailureCount = 0;
let localDebugPollTimer = null;
let localDebugEventSource = null;
let localDebugStreamRetryTimer = null;
let localDebugRefreshInFlight = false;
let localDebugRefreshQueued = false;
let localDebugLastRefreshedAt = "";
let musicBulletinTimer = null;
let uploadedBackgrounds = [];
let uploadedBackgroundVideo = null;
let uploadedAudioFallback = null;
let activeMusicBulletinIndex = 0;
let renderSettingsDirty = false;
let audioFallbackPopupKey = "";
let autoRenderPending = false;
let lyricFontDropdownOpen = false;
let lyricPreviewCustomPosition = null;
let lyricPreviewDragState = null;
let lyricPreviewResumeAnimationAfterDrag = false;
const dismissedAudioFallbackPopupKeys = new Set();
const AUDIO_POPUP_DISMISSED_STORAGE_KEY = "song-to-lyrics-audio-popup-dismissed";
const UPLOADED_AUDIO_JOB_POLL_MS = 3000;
const UPLOADED_AUDIO_JOB_TIMEOUT_MS = 12 * 60 * 1000;
const RENDER_POLL_REQUEST_TIMEOUT_MS = 12000;
const RENDER_POLL_RETRY_BASE_MS = 2500;
const MAX_TRANSIENT_RENDER_POLL_FAILURES = 8;
const LOCAL_DEBUG_CACHE_STORAGE_KEY = "song-to-lyrics-local-debug-cache";
const ACTIVE_RENDER_STORAGE_KEY = "song-to-lyrics-active-render";
const LOCAL_DEBUG_REFRESH_MS = 3000;
const LOCAL_DEBUG_REQUEST_TIMEOUT_MS = 4500;
const isLocalHostRuntime = /^(localhost|127(?:\.\d{1,3}){3}|::1)$/i.test(window.location.hostname || "");
const configuredLocalDebugBaseUrl = (
  document.querySelector('meta[name="local-debug-base-url"]')?.getAttribute("content") || ""
).trim();
const normalizedLocalDebugBaseUrl =
  configuredLocalDebugBaseUrl && !/^__.+__$/.test(configuredLocalDebugBaseUrl)
    ? configuredLocalDebugBaseUrl.replace(/\/+$/g, "")
    : "";
const isLocalDebugMode = isLocalHostRuntime || Boolean(normalizedLocalDebugBaseUrl);
const effectiveLocalDebugBaseUrl =
  normalizedLocalDebugBaseUrl || (isLocalHostRuntime ? window.location.origin.replace(/\/+$/g, "") : "");
const lyricPreviewSamples = {
  default: [
    "City lights in stereo",
    "Street drums wake the silence",
    "You keep running through my mind",
    "Every shadow turns to color",
    "Tonight the echo feels alive",
    "We hold the hook a little longer"
  ],
  aa: ["MOST", "PEOPLE LOOKED", "AT HIM", "WITH", "TERROR", "TODAY"],
  comic: [
    "HEY HEART, STAY LOUD",
    "THE PANELS SNAP OPEN",
    "YOU KEEP RUNNING THROUGH MY MIND",
    "EVERY FRAME HITS HARDER",
    "TONIGHT THE ECHO FEELS ALIVE",
    "THE LAST BOX HOLDS THE HOOK"
  ],
  cinematic: [
    "city lights in stereo",
    "wide shot on the skyline",
    "you keep running through my mind",
    "slow drift into the chorus",
    "tonight the echo feels alive",
    "credits land in gold dust"
  ],
  bounce: [
    "Heartbeats in motion",
    "Kick drums lift the floor",
    "You keep running through my mind",
    "The chorus jumps on impact",
    "We rise when the chorus lands",
    "Everything hits on the drop"
  ],
  "side-by-side": [
    "Left side whisper",
    "Static through the hallway",
    "You keep running through my mind",
    "Mirrors answer on the right",
    "Right side afterglow",
    "Two voices cross in rhythm"
  ],
  typewriter: [
    "Signal online",
    "Cursor waits for the hook",
    "You keep running through my mind",
    "Letters land with the snare",
    "Ending scene in slow motion",
    "Final line types itself"
  ],
  spotlight: [
    "Silence around us",
    "Only the center stays lit",
    "You keep running through my mind",
    "Dust hangs inside the beam",
    "Only the chorus remains",
    "The room fades behind the line"
  ],
  magic: [
    "Prapancham Telidhe",
    "Jathai Nuvvu Unte",
    "Velugulu Chuttu Cherai",
    "You keep running through my mind",
    "Tonight the feeling stays soft",
    "Madhuramaina hook niliche"
  ],
  neon: [
    "AFTER DARK WE GLOW",
    "MIDNIGHT SIGNS KEEP FLICKERING",
    "YOU KEEP RUNNING THROUGH MY MIND",
    "THE ALLEY FILLS WITH COLOR",
    "NEON PULSES THROUGH THE HAZE",
    "EVERY BEAT LEAVES A TRACE"
  ],
  glitch: [
    "SIGNAL CUT",
    "FRAME SKIPS ACROSS THE WALL",
    "YOU KEEP RUNNING THROUGH MY MIND",
    "STATIC SPARKS BEHIND THE BEAT",
    "SYSTEM HEART STILL HOLDS THE HOOK",
    "REBOOT INSIDE THE CHORUS"
  ],
  karaoke: [
    "Sing it back",
    "Hands rise on the pre-chorus",
    "You keep running through my mind",
    "The room turns into one voice",
    "Tonight the whole room knows",
    "Everyone lands on the last word"
  ],
  whisper: [
    "soft lights flicker",
    "the room leans into the hush",
    "you keep running through my mind",
    "the silence bends around it",
    "the night breathes even slower",
    "the final word stays close"
  ],
  stacked: [
    "Before the drop",
    "A second line leans in",
    "You keep running through my mind",
    "The next phrase stacks below",
    "After the echo",
    "The chorus keeps its trail"
  ],
  minimal: [
    "In one frame",
    "Just enough to hold the beat",
    "You keep running through my mind",
    "Nothing distracts the line",
    "Nothing else is needed",
    "The silence finishes the scene"
  ],
  fulllength: [
    "AND THE",
    "FURTHER",
    "WE RUN INTO THE NIGHT",
    "THE CLOSER I",
    "GET TO YOU",
    "THE LONGER THE HOOK LASTS"
  ]
};
const lyricStylePreviewMeta = {
  auto: { label: "Auto mix", motion: "Balanced" },
  aa: { label: "AA", motion: "Poster stack" },
  comic: { label: "Comic style", motion: "Pop panels" },
  "line-by-line": { label: "Line by line", motion: "Step reveal" },
  cinematic: { label: "Cinematic", motion: "Slow drift" },
  bounce: { label: "Bounce", motion: "Punchy hit" },
  "side-by-side": { label: "Side by side", motion: "Split lanes" },
  typewriter: { label: "Typewriter", motion: "Word build" },
  spotlight: { label: "Spotlight", motion: "Focused glow" },
  magic: { label: "Magic", motion: "Soft float" },
  neon: { label: "Neon glow", motion: "Luminous pulse" },
  glitch: { label: "Glitch hit", motion: "RGB split" },
  karaoke: { label: "Karaoke box", motion: "Sing-along bar" },
  whisper: { label: "Whisper", motion: "Soft drift" },
  stacked: { label: "Stacked", motion: "Layered rise" },
  minimal: { label: "Minimal", motion: "Clean fade" },
  fulllength: { label: "Fulllength", motion: "Poster stack" }
};
const lyricPreviewPlacementDefaults = {
  auto: { x: 0.5, y: 0.56, anchor: "center" },
  aa: { x: 0.16, y: 0.72, anchor: "left" },
  comic: { x: 0.5, y: 0.54, anchor: "center" },
  "line-by-line": { x: 0.5, y: 0.58, anchor: "center" },
  cinematic: { x: 0.5, y: 0.47, anchor: "center" },
  bounce: { x: 0.5, y: 0.58, anchor: "center" },
  "side-by-side": { x: 0.5, y: 0.54, anchor: "center" },
  typewriter: { x: 0.14, y: 0.56, anchor: "left" },
  spotlight: { x: 0.5, y: 0.44, anchor: "center" },
  magic: { x: 0.5, y: 0.62, anchor: "center" },
  neon: { x: 0.5, y: 0.54, anchor: "center" },
  glitch: { x: 0.5, y: 0.56, anchor: "center" },
  karaoke: { x: 0.5, y: 0.75, anchor: "center" },
  whisper: { x: 0.5, y: 0.48, anchor: "center" },
  stacked: { x: 0.14, y: 0.52, anchor: "left" },
  minimal: { x: 0.5, y: 0.72, anchor: "center" },
  fulllength: { x: 0.18, y: 0.58, anchor: "left" }
};
let lyricPreviewAnimationTimer = null;
let lyricPreviewAnimationVersion = 0;

function getPreviewZoomBounds() {
  if (!lyricFontZoomInput) {
    return { min: 70, max: 200, step: 5 };
  }

  return {
    min: Number(lyricFontZoomInput.min || 70),
    max: Number(lyricFontZoomInput.max || 200),
    step: Number(lyricFontZoomInput.step || 5)
  };
}

function getLyricPreviewAnimationInterval(styleValue = "auto") {
  const intervals = {
    bounce: 880,
    spotlight: 1400,
    typewriter: 1600,
    whisper: 1500,
    minimal: 1450
  };

  return intervals[styleValue] || 1150;
}
const DEFAULT_NEON_COLOR = "#7fe8ff";
const DEFAULT_NEON_GLOW = 70;
const musicBulletins = [
  {
    stamp: "History pulse",
    headline: "Music history keeps rewriting how songs are seen and remembered.",
    text:
      "This block rotates through turning points that changed music from live memory into notation, recording, broadcast, and visual culture.",
    cards: [
      {
        label: "1025",
        detail: "Guido d'Arezzo helped standardize notation, making melody easier to teach, preserve, and travel."
      },
      {
        label: "1877",
        detail: "The phonograph changed music from a one-time performance into something people could replay."
      },
      {
        label: "1981",
        detail: "MTV pushed songs into the video era, turning visual identity into part of pop success."
      },
      {
        label: "1999",
        detail: "Napster accelerated the shift into digital listening, forcing the music business to rethink distribution."
      }
    ]
  },
  {
    stamp: "Record watch",
    headline: "Music records feel like headlines because the ceiling keeps moving.",
    text:
      "Award history, chart runs, and era-defining milestones keep shifting as artists stretch what a global hit can look like.",
    cards: [
      {
        label: "35 Grammys",
        detail: "Beyonce is the all-time Grammy leader, turning sustained excellence into a modern benchmark."
      },
      {
        label: "4 AOTY wins",
        detail: "Taylor Swift became the first artist to win Album of the Year four times."
      },
      {
        label: "31 Grammys",
        detail: "Georg Solti still holds the record for the most Grammy wins by a male artist."
      },
      {
        label: "19 weeks",
        detail: "Lil Nas X set a Hot 100 endurance record when 'Old Town Road' spent 19 weeks at No. 1."
      }
    ]
  },
  {
    stamp: "YouTube pulse",
    headline: "YouTube view records show how music videos still dominate the global screen.",
    text:
      "The biggest songs on the platform are more than streams. They become visual landmarks that keep pulling millions of new listeners in.",
    cards: [
      {
        label: "#1 Baby Shark",
        detail: "Pinkfong's giant hit remains the platform's most-viewed video overall and a massive music milestone."
      },
      {
        label: "#2 Despacito",
        detail: "Luis Fonsi and Daddy Yankee helped define the modern global crossover era on YouTube."
      },
      {
        label: "#3 Shape of You",
        detail: "Ed Sheeran's pop mainstay remains one of the most-viewed music videos ever uploaded."
      },
      {
        label: "#4 See You Again",
        detail: "Wiz Khalifa and Charlie Puth still sit among YouTube's elite long-running music-video giants."
      }
    ]
  },
  {
    stamp: "Trending now",
    headline: "Current chart leaders show what listeners are pushing right now.",
    text:
      "This quick snapshot follows the Billboard Hot 100 conversation and gives the homepage a live-chart feel instead of a static promo block.",
    cards: [
      {
        label: "#1 Choosin' Texas",
        detail: "Ella Langley leads the Hot 100 dated April 18, 2026, extending the song's run at the top."
      },
      {
        label: "#2 Man I Need",
        detail: "Olivia Dean climbs to No. 2, staying right behind the chart leader in the current top tier."
      },
      {
        label: "#3 I Just Might",
        detail: "Bruno Mars moves up to No. 3, keeping the upper part of the chart highly competitive."
      },
      {
        label: "#4 Night Call",
        detail: "A fast-rising pop single keeps pressure on the top three and makes the trend panel feel more alive."
      }
    ]
  },
  {
    stamp: "Watch links",
    headline: "Jump straight into the giants of YouTube music with one tap.",
    text:
      "These cards link directly to some of the platform's biggest music videos so users can open them instantly and paste them into the app.",
    cards: [
      {
        label: "Baby Shark",
        detail: "Still the most-viewed music video overall on YouTube.",
        href: "https://www.youtube.com/watch?v=XqZsoesa55w",
        cta: "Open on YouTube"
      },
      {
        label: "Despacito",
        detail: "The biggest non-kids music video in total YouTube views.",
        href: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
        cta: "Watch Despacito"
      },
      {
        label: "Shape of You",
        detail: "One of the longest-running elite performers in YouTube music history.",
        href: "https://www.youtube.com/watch?v=JGwWNGJdvx8",
        cta: "Watch Shape of You"
      },
      {
        label: "See You Again",
        detail: "Another giant YouTube music landmark that users can open and paste into the app fast.",
        href: "https://www.youtube.com/watch?v=RgKAFK5djSk",
        cta: "Watch See You Again"
      }
    ]
  }
];
const lyricFontFamilies = {
  arial: "Arial, sans-serif",
  "arial-black": "'Arial Black', Arial, sans-serif",
  impact: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
  trebuchet: "'Trebuchet MS', sans-serif",
  verdana: "Verdana, sans-serif",
  tahoma: "Tahoma, sans-serif",
  georgia: "Georgia, serif",
  palatino: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
  "century-gothic": "'Century Gothic', 'Segoe UI', sans-serif",
  "comic-sans": "'Comic Sans MS', 'Comic Sans', cursive",
  anton: "'Anton', sans-serif",
  "bebas-neue": "'Bebas Neue', sans-serif",
  bangers: "'Bangers', cursive",
  "archivo-black": "'Archivo Black', sans-serif",
  monoton: "'Monoton', cursive",
  "fjalla-one": "'Fjalla One', sans-serif",
  righteous: "'Righteous', sans-serif",
  oswald: "'Oswald', sans-serif",
  sora: "'Sora', sans-serif",
  montserrat: "'Montserrat', sans-serif",
  "rubik-mono-one": "'Rubik Mono One', sans-serif",
  kanit: "'Kanit', sans-serif",
  "titillium-web": "'Titillium Web', sans-serif"
};

function hexToRgbTuple(hex = DEFAULT_NEON_COLOR) {
  const safeHex = `${hex || DEFAULT_NEON_COLOR}`.trim().replace("#", "");
  const normalized = safeHex.length === 3
    ? safeHex.split("").map((char) => `${char}${char}`).join("")
    : safeHex.padEnd(6, "0").slice(0, 6);

  const red = Number.parseInt(normalized.slice(0, 2), 16) || 127;
  const green = Number.parseInt(normalized.slice(2, 4), 16) || 232;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) || 255;
  return `${red}, ${green}, ${blue}`;
}

function getSelectedStyleColorSettings() {
  const color = /^#[0-9a-f]{6}$/i.test(`${neonColorInput?.value || ""}`)
    ? neonColorInput.value
    : DEFAULT_NEON_COLOR;
  const glowPercent = Math.max(10, Math.min(100, Number(neonGlowInput?.value || DEFAULT_NEON_GLOW)));
  return {
    enabled: Boolean(useStyleColorInput?.checked),
    color,
    glowPercent,
    glowStrength: glowPercent / 100
  };
}

function getSelectedLyricZoomValue() {
  const { min, max } = getPreviewZoomBounds();
  return Math.max(min, Math.min(max, Number(lyricFontZoomInput?.value || 100)));
}

function getClientRenderProfile() {
  const width = Math.max(0, Number(window.innerWidth || document.documentElement?.clientWidth || 0));
  const height = Math.max(0, Number(window.innerHeight || document.documentElement?.clientHeight || 0));
  const isMobileViewport = window.matchMedia("(max-width: 900px)").matches;
  const isMobileAgent = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || "");

  return {
    clientViewport: {
      width,
      height,
      devicePixelRatio: Math.max(1, Number(window.devicePixelRatio || 1))
    },
    clientIsMobile: Boolean(isMobileViewport || isMobileAgent)
  };
}

function syncLyricZoomUi() {
  if (lyricFontZoomValue) {
    lyricFontZoomValue.textContent = `${getSelectedLyricZoomValue()}%`;
  }
}

function updateStyleSpecificControls() {
  if (!neonStyleControls) {
    return;
  }

  const neonSelected = lyricStyleInput?.value === "neon";
  if (neonGlowShell) {
    neonGlowShell.hidden = !neonSelected;
  }
  if (neonColorInput) {
    neonColorInput.disabled = !Boolean(useStyleColorInput?.checked);
  }

  if (neonGlowValue) {
    neonGlowValue.textContent = `${getSelectedStyleColorSettings().glowPercent}%`;
  }
}
const lyricEmojiRules = [
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

function revokeUploadedBackgroundVideoPreview() {
  if (uploadedBackgroundVideo?.previewUrl) {
    URL.revokeObjectURL(uploadedBackgroundVideo.previewUrl);
  }
}

function sanitizeLyricWord(word = "") {
  return `${word || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, "")
    .replace(/^'+|'+$/g, "");
}

function decorateLyricWord(word = "") {
  const token = sanitizeLyricWord(word).replace(/'/g, "");

  if (!token) {
    return word;
  }

  const match = lyricEmojiRules.find(({ pattern }) => pattern.test(token));

  if (!match || `${word}`.includes(match.emoji)) {
    return word;
  }

  return `${word} ${match.emoji}`;
}

function decorateLyricLine(text = "") {
  return `${text || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => decorateLyricWord(word))
    .join(" ");
}

function getTrailingLyricEmojiText(text = "") {
  const uniqueEmojis = [...new Set(
    `${text || ""}`
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        const token = sanitizeLyricWord(word).replace(/'/g, "");
        if (!token) {
          return "";
        }
        const match = lyricEmojiRules.find(({ pattern }) => pattern.test(token));
        return match?.emoji || "";
      })
      .filter(Boolean)
  )];

  return uniqueEmojis.join(" ");
}

function looksLikeYouTubeUrl(value) {
  const rawValue = `${value || ""}`.trim();

  if (!rawValue) {
    return false;
  }

  try {
    const url = new URL(rawValue);
    const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();
    return /(?:^|\.)youtube\.com$/i.test(hostname) || hostname === "youtu.be";
  } catch (error) {
    return /(?:youtube\.com|youtu\.be)/i.test(rawValue);
  }
}

function extractVideoIdFromUrl(value = "") {
  const rawValue = `${value || ""}`.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(rawValue)) {
    return rawValue;
  }

  try {
    const url = new URL(rawValue);
    const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();
    url.searchParams.delete("si");

    if (hostname === "youtu.be") {
      const shortId = url.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(shortId) ? shortId : "";
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

      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})(?:[/?]|$)/);
      if (shortsMatch) {
        return shortsMatch[1];
      }

      const pathMatch = url.pathname.match(/\/(?:embed|live)\/([a-zA-Z0-9_-]{11})(?:[/?]|$)/);
      if (pathMatch) {
        return pathMatch[1];
      }
    }
  } catch (error) {
    return "";
  }

  return "";
}

function stripFileExtension(value = "") {
  return `${value || ""}`.replace(/\.[a-z0-9]{1,8}$/i, "").trim();
}

function getUploadedAudioDisplayTitle(audioMeta = uploadedAudioFallback) {
  const cleanTitle = stripFileExtension(audioMeta?.name || "");
  return cleanTitle || audioMeta?.name || "Uploaded audio";
}

function shortenInlineAudioLabel(value = "", maxLength = 24) {
  const normalized = `${value || ""}`.trim();

  if (!normalized) {
    return "Add audio";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(8, maxLength - 1)).trim()}...`;
}

function syncInlineAudioButtonLabel(audioMeta = uploadedAudioFallback) {
  if (!uploadAudioInlineButton) {
    return;
  }

  if (!audioMeta?.file) {
    uploadAudioInlineButton.textContent = "Add audio";
    uploadAudioInlineButton.title = "Add audio";
    uploadAudioInlineButton.classList.remove("is-ready");
    return;
  }

  const songTitle = getUploadedAudioDisplayTitle(audioMeta);
  uploadAudioInlineButton.textContent = shortenInlineAudioLabel(songTitle);
  uploadAudioInlineButton.title = `Uploaded audio: ${songTitle}`;
  uploadAudioInlineButton.classList.add("is-ready");
}

function slugifyLocalProjectId(value = "") {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function isUploadedAudioProject(result = currentResult) {
  return result?.sourceType === "uploaded-audio";
}

function hasProjectSource(result = currentResult) {
  return Boolean(result?.inputUrl) || isUploadedAudioProject(result);
}

function isShareableProject(result = currentResult) {
  return Boolean(result?.inputUrl) && !isUploadedAudioProject(result);
}

function buildUploadedAudioProjectResult(audioMeta = uploadedAudioFallback) {
  if (!audioMeta?.file) {
    return null;
  }

  const rawTitle = stripFileExtension(audioMeta.name || "Uploaded audio");
  const title = rawTitle || "Uploaded audio";
  const projectId = slugifyLocalProjectId(title) || "uploaded-audio";

  return {
    sourceType: "uploaded-audio",
    projectId,
    inputUrl: "",
    videoId: `upload-${projectId}`,
    title,
    channelTitle: "Uploaded audio",
    description: "This project was started from an uploaded audio file.",
    durationSeconds: Number(audioMeta.duration || 0),
    thumbnails: [],
    poster: "",
    audioUrl: audioMeta.previewUrl || "",
    audioPreviewBlocked: false,
    audioAccess: {
      mode: "available",
      previewAvailable: Boolean(audioMeta.previewUrl),
      badgeLabel: "Audio uploaded",
      title: "Uploaded audio is ready",
      summary:
        "This project will render directly from your uploaded audio file. A YouTube link is optional for this path.",
      primaryActionLabel: "Create lyric video",
      recommendedAction: "render"
    },
    audioMimeType: audioMeta.mimeType || "audio/mpeg",
    song: {
      title,
      artist: "Uploaded audio"
    },
    lyricsSource: "uploaded-audio",
    syncMode: "transcribed",
    lines: [],
    warnings: [
      "This project started from uploaded audio, so the render will build timing from the file instead of from a YouTube link.",
      "Add background images or a background video if you want custom visuals before the render starts."
    ]
  };
}

function getUploadedAudioProjectCacheKey(audioMeta = uploadedAudioFallback) {
  if (!audioMeta?.file) {
    return "";
  }

  return [
    audioMeta.name || "",
    Number(audioMeta.size || 0),
    Number(audioMeta.file?.lastModified || 0),
    audioMeta.mimeType || ""
  ].join(":");
}

function mergeUploadedAudioProjectResult(serverResult = {}, audioMeta = uploadedAudioFallback) {
  if (!audioMeta?.file) {
    return serverResult;
  }

  return {
    ...serverResult,
    sourceType: "uploaded-audio",
    inputUrl: "",
    audioUrl: audioMeta.previewUrl || serverResult.audioUrl || "",
    durationSeconds: Number(serverResult.durationSeconds || audioMeta.duration || 0),
    audioMimeType: audioMeta.mimeType || serverResult.audioMimeType || "audio/mpeg",
    audioAccess: {
      ...(serverResult.audioAccess || {}),
      mode: "available",
      previewAvailable: Boolean(audioMeta.previewUrl),
      badgeLabel: "Audio uploaded",
      title:
        serverResult.audioAccess?.title ||
        "Uploaded audio is ready",
      summary:
        serverResult.audioAccess?.summary ||
        "This project can build lyrics and the final video directly from your uploaded audio file. A YouTube link is optional for this path.",
      primaryActionLabel: "Create lyric video",
      recommendedAction: "render"
    }
  };
}

async function prepareUploadedAudioProject(audioMeta = uploadedAudioFallback) {
  if (!audioMeta?.file) {
    throw new Error("Upload audio before starting an audio-only project.");
  }

  const cacheKey = getUploadedAudioProjectCacheKey(audioMeta);

  if (audioMeta.preparedProject && audioMeta.preparedProjectCacheKey === cacheKey) {
    return mergeUploadedAudioProjectResult(audioMeta.preparedProject, audioMeta);
  }

  const formData = new FormData();
  formData.append("audioFile", audioMeta.file, audioMeta.name || "uploaded-audio");
  formData.append("title", stripFileExtension(audioMeta.name || "Uploaded audio"));
  formData.append("durationSeconds", String(Number(audioMeta.duration || 0)));

  const response = await fetch("/api/convert-audio", {
    method: "POST",
    body: formData
  });
  const payload = await readJsonResponseSafely(response, {});

  if (!response.ok) {
    throw new Error(payload.error || "The uploaded audio could not be analyzed.");
  }

  if (payload?.jobId) {
    const uploadedAudioJob = await waitForUploadedAudioProjectJob(payload.jobId);
    audioMeta.preparedProject = uploadedAudioJob;
    audioMeta.preparedProjectCacheKey = cacheKey;
    return mergeUploadedAudioProjectResult(uploadedAudioJob, audioMeta);
  }

  audioMeta.preparedProject = payload;
  audioMeta.preparedProjectCacheKey = cacheKey;
  return mergeUploadedAudioProjectResult(payload, audioMeta);
}

async function waitForUploadedAudioProjectJob(jobId = "") {
  const safeJobId = `${jobId || ""}`.trim();

  if (!safeJobId) {
    throw new Error("The uploaded audio job did not return an ID.");
  }

  const startedAt = Date.now();
  let lastStatusMessage = "";

  while (Date.now() - startedAt < UPLOADED_AUDIO_JOB_TIMEOUT_MS) {
    const response = await fetch(`/api/job/${encodeURIComponent(safeJobId)}`);
    const payload = await readJsonResponseSafely(response, {});

    if (!response.ok) {
      throw new Error(payload.error || "The uploaded audio job could not be checked.");
    }

    const status = `${payload.status || ""}`.toLowerCase();
    const message =
      payload.message ||
      (status === "processing"
        ? "Transcribing audio with Whisper - usually 2 to 3 minutes. Hang tight..."
        : status === "pending"
          ? "Queued uploaded audio for lyric analysis."
          : "");

    if (message && message !== lastStatusMessage) {
      setStatus(message);
      setRenderMessage(message);
      lastStatusMessage = message;
    }

    if (status === "done") {
      return payload.result || null;
    }

    if (status === "error") {
      throw new Error(payload.error || "The uploaded audio could not be analyzed.");
    }

    await wait(UPLOADED_AUDIO_JOB_POLL_MS);
  }

  throw new Error(
    "Transcribing audio is taking longer than usual. Please wait a moment and try again."
  );
}

function persistDismissedAudioPopupKeys() {
  try {
    window.sessionStorage.setItem(
      AUDIO_POPUP_DISMISSED_STORAGE_KEY,
      JSON.stringify([...dismissedAudioFallbackPopupKeys])
    );
  } catch {}
}

function restoreDismissedAudioPopupKeys() {
  try {
    const raw = window.sessionStorage.getItem(AUDIO_POPUP_DISMISSED_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");

    if (Array.isArray(parsed)) {
      parsed.filter(Boolean).forEach((key) => dismissedAudioFallbackPopupKeys.add(String(key)));
    }
  } catch {}
}

function formatTime(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(value / 60);
  const remainder = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function formatFileSize(bytes) {
  const value = Math.max(0, Number(bytes || 0));

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("is-error", Boolean(isError));
}

function scrollToUiTarget(target, options = {}) {
  const resolvedTarget =
    typeof target === "string"
      ? document.getElementById(target.replace(/^#/, ""))
      : target;

  if (!resolvedTarget) {
    return;
  }

  const behavior = options.behavior || "smooth";
  const block = options.block || "start";

  window.setTimeout(() => {
    try {
      resolvedTarget.scrollIntoView({
        behavior,
        block
      });
    } catch {}
  }, Number(options.delayMs || 40));
}

function scrollToRenderProgressCard() {
  scrollToUiTarget(renderButton || renderTools || resultPanel, {
    block: "center",
    delayMs: 60
  });
}

function scrollToAudioFallbackCard() {
  scrollToUiTarget(audioFallbackField || audioFallbackTip || "audio-fallback-field", {
    block: "center",
    delayMs: 60
  });
}

function syncMobileResultStack() {
  if (!mediaColumn || !trackCard || !posterFrame || !videoOutputCard) {
    return;
  }

  const isMobileViewport = window.matchMedia("(max-width: 760px)").matches;

  if (isMobileViewport) {
    mediaColumn.style.display = "flex";
    mediaColumn.style.flexDirection = "column";
    mediaColumn.style.gap = "12px";
    trackCard.style.order = "1";
    posterFrame.style.order = "3";
    if (mobileStageCard) {
      mobileStageCard.style.order = "2";
    }
    videoOutputCard.style.order = "4";
    return;
  }

  mediaColumn.style.display = "";
  mediaColumn.style.flexDirection = "";
  mediaColumn.style.gap = "";
  trackCard.style.order = "";
  posterFrame.style.order = "";
  if (mobileStageCard) {
    mobileStageCard.style.order = "";
  }
  videoOutputCard.style.order = "";
}

function buildFallbackAudioAccessState(result = {}) {
  if (!result?.audioPreviewBlocked) {
    return {
      mode: "available",
      previewAvailable: true,
      badgeLabel: "Audio live",
      title: "Live soundtrack is reachable",
      summary:
        "YouTube preview audio is available for this link. The final render will still verify timing before export.",
      primaryActionLabel: "Create lyric video",
      recommendedAction: "render"
    };
  }

  return {
    mode: "upload-recommended",
    previewAvailable: false,
    badgeLabel: "Add sound",
    title: "This link is ready, and a sound file will make it perfect",
    summary:
      "Lyrics and artwork are ready. Add the song audio file here if you want guaranteed sound in the final video.",
    primaryActionLabel: "Add audio",
    recommendedAction: "upload-audio"
  };
}

function getCurrentAudioAccessState(result = currentResult) {
  return result?.audioAccess || buildFallbackAudioAccessState(result || {});
}

function canAutoBuildLyricsFromAudio(result = {}) {
  if (!result || isUploadedAudioProject(result)) {
    return false;
  }

  const noLyricsAvailable = !result.lines?.length || String(result.syncMode || "").toLowerCase() === "none";

  if (!noLyricsAvailable) {
    return false;
  }

  return true;
}

function linkNeedsUploadedAudio(result = currentResult) {
  if (!result || isUploadedAudioProject(result)) {
    return false;
  }

  return getCurrentAudioAccessState(result).mode === "upload-recommended";
}

function buildUploadedAudioRequiredMessage(result = currentResult) {
  const title = normalizeWhitespace(result?.title || "").trim();
  return title
    ? `${title} needs uploaded audio to build synced lyrics and keep sound in the final video.`
    : "This link needs uploaded audio to build synced lyrics and keep sound in the final video.";
}

function promptRequiredAudioUpload(result = currentResult, options = {}) {
  if (!result || isUploadedAudioProject(result) || uploadedAudioFallback?.file) {
    return false;
  }

  const audioAccess = getCurrentAudioAccessState(result);
  const uploadRequired =
    audioAccess?.recommendedAction === "upload-audio" ||
    audioAccess?.mode === "upload-recommended" ||
    result?.audioPreviewBlocked === true;

  if (!uploadRequired) {
    return false;
  }

  const statusMessage = "This video needs audio - upload MP3 to continue";

  promptAudioFallbackRecovery(
    `${statusMessage}. Add the song file in the audio card below, then the render can start.`,
    { scroll: false }
  );
  setStatus(statusMessage, true);
  setRenderMessage(statusMessage);

  if (renderButton) {
    renderButton.disabled = true;
    renderButton.textContent = "Add Audio To Render";
  }

  if (options.scroll !== false) {
    scrollToAudioFallbackCard();
  }

  spotlightAudioFallbackInput({ scroll: false });
  return true;
}

function updateAudioFallbackStateUi(result = currentResult) {
  if (!audioFallbackField || !audioFallbackState) {
    return;
  }

  const hasResult = hasProjectSource(result);
  const hasUploadedAudio = Boolean(uploadedAudioFallback?.file);
  const audioAccess = getCurrentAudioAccessState(result);
  const mode = audioAccess.mode || "available";
  const uploadedAudioTitle = getUploadedAudioDisplayTitle(uploadedAudioFallback);

  audioFallbackField.classList.remove("is-supported", "is-needed", "is-ready");

  if (hasUploadedAudio) {
    audioFallbackField.classList.add("is-ready");
    audioFallbackState.textContent = isUploadedAudioProject(result)
      ? `Uploaded song ready: ${uploadedAudioTitle} will drive this render directly.`
      : `Uploaded song ready: ${uploadedAudioTitle} is attached and will be used on the next render if needed.`;
    return;
  }

  if (!hasResult) {
    audioFallbackState.textContent = "Audio status will show here after you load a song.";
    return;
  }

  if (mode === "available") {
    audioFallbackField.classList.add("is-supported");
    audioFallbackState.textContent = "Audio supported: live soundtrack is available. Upload is optional.";
    return;
  }

  audioFallbackField.classList.add("is-needed");
  audioFallbackState.textContent =
    mode === "recovery"
      ? "Audio may still recover on the server, but upload audio for guaranteed sound in the final video."
      : "Audio needed: upload the song file here if you want guaranteed sound in the final video.";
}

function syncAudioFallbackPopup(result = currentResult) {
  if (!audioFallbackPopup || !audioFallbackPopupTitle || !audioFallbackPopupText) {
    return;
  }

  const hasResult = hasProjectSource(result);
  const hasUploadedAudio = Boolean(uploadedAudioFallback?.file);
  const audioAccess = getCurrentAudioAccessState(result);
  const mode = audioAccess.mode || "available";
  const nextPopupKey = hasResult
    ? `${result?.projectId || result?.videoId || result?.inputUrl || result?.title || ""}:${isUploadedAudioProject(result) ? "upload" : "source"}`
    : "";
  audioFallbackPopupKey = nextPopupKey;

  const shouldShow = hasResult && !isUploadedAudioProject(result) && !hasUploadedAudio && mode !== "available";
  const isDismissed = Boolean(nextPopupKey) && dismissedAudioFallbackPopupKeys.has(nextPopupKey);

  audioFallbackPopup.hidden = !shouldShow || isDismissed;
  audioFallbackPopup.style.display = !shouldShow || isDismissed ? "none" : "";

  if (!shouldShow) {
    if (!hasResult) {
      audioFallbackPopupKey = "";
    }
    return;
  }

  if (mode === "recovery") {
    audioFallbackPopupTitle.textContent = "Add audio for guaranteed sound";
    audioFallbackPopupText.textContent =
      "This link is still trying smart recovery. Upload the song file now if you want guaranteed sound in the final video.";
    return;
  }

  audioFallbackPopupTitle.textContent = "This link needs uploaded audio";
  audioFallbackPopupText.textContent =
    "Add the song audio file now so the app can build synced lyrics and keep sound in the final video.";
}

function applyAudioAccessState(result = currentResult) {
  if (!audioAccessShell || !audioStatusBadge || !audioAccessTitle || !audioAccessText) {
    return;
  }

  audioStatusBadge.classList.remove("is-audio-live", "is-audio-recovery", "is-audio-upload");
  audioStatusBadge.style.background = "";
  audioStatusBadge.style.color = "";

  if (!hasProjectSource(result)) {
    audioStatusBadge.textContent = "Audio status";
    audioAccessEyebrow.textContent = "Sound mode";
    audioAccessTitle.textContent = "Checking the soundtrack path";
    audioAccessText.textContent =
      "The app will decide whether this project uses live YouTube audio, protected server recovery, or your uploaded soundtrack.";
    audioAccessShell.classList.remove("is-live", "is-recovery", "is-upload");
    if (audioAccessAction) {
      audioAccessAction.hidden = true;
      audioAccessAction.textContent = "Upload audio";
    }
    audioPlayer.hidden = false;
    updateAudioFallbackStateUi(result);
    syncAudioFallbackPopup(result);
    syncMobileAudioCards(result);
    return;
  }

  const audioAccess = getCurrentAudioAccessState(result);
  const mode = audioAccess.mode || "available";
  const hasUploadedAudio = Boolean(uploadedAudioFallback?.file);
  const uploadRecommended = mode === "upload-recommended";
  const recoveryMode = mode === "recovery";
  const showUploadAction = uploadRecommended || recoveryMode || hasUploadedAudio;

  audioAccessShell.classList.remove("is-live", "is-recovery", "is-upload");
  audioAccessShell.classList.add(
    mode === "available" ? "is-live" : uploadRecommended ? "is-upload" : "is-recovery"
  );
  audioStatusBadge.textContent = audioAccess.badgeLabel || "Audio status";
  audioStatusBadge.classList.add(
    mode === "available" ? "is-audio-live" : uploadRecommended ? "is-audio-upload" : "is-audio-recovery"
  );
  audioAccessEyebrow.textContent = uploadRecommended
    ? "Fallback soundtrack"
    : recoveryMode
      ? "Smart recovery"
      : "Live soundtrack";
  audioAccessTitle.textContent = hasUploadedAudio && mode !== "available"
    ? "Uploaded audio is ready for the next render"
    : audioAccess.title || "Checking the soundtrack path";
  audioAccessText.textContent =
    hasUploadedAudio && mode !== "available"
      ? `The uploaded audio file ${uploadedAudioFallback.name} is queued. The next render will use it so the final video keeps sound.`
      : audioAccess.summary ||
        "The app will decide whether this link can use live YouTube audio, protected server recovery, or an uploaded soundtrack.";

  if (audioAccessAction) {
    audioAccessAction.hidden = !showUploadAction;
    audioAccessAction.textContent =
      isUploadedAudioProject(result)
        ? "Change audio"
        : hasUploadedAudio && mode !== "available"
        ? "Change audio"
        : uploadRecommended
          ? "Add audio"
          : "Keep audio ready";
  }

  audioPlayer.hidden = !Boolean(audioAccess.previewAvailable && result?.audioUrl);
  updateAudioFallbackStateUi(result);
  syncAudioFallbackPopup(result);
  syncMobileAudioCards(result);
}

function syncIdleRenderCta() {
  if (!renderButton || activeRenderJobId) {
    return;
  }

  if (!hasProjectSource()) {
    renderButton.disabled = true;
    renderButton.textContent = "Create Downloadable Lyric Video";
    setRenderMessage("Paste a song or upload audio and the app will build a downloadable lyric video automatically.");
    return;
  }

  if (autoRenderPending) {
    renderButton.disabled = true;
    renderButton.textContent = "Starting...";
    setRenderMessage("Song loaded. Starting the render automatically from your top Create button...");
    return;
  }

  const audioAccess = getCurrentAudioAccessState();
  const hasUploadedAudio = Boolean(uploadedAudioFallback?.file);
  const noLyricsAvailable =
    !isUploadedAudioProject() &&
    !currentResult?.lines?.length &&
    String(currentResult?.lyricsSource || "").toLowerCase() === "unavailable";

  if (noLyricsAvailable) {
    renderButton.disabled = true;
    renderButton.textContent = "No Lyrics Found";
    setRenderMessage(
      "No lyrics were found for this video yet. Try another song link or upload the track audio directly to build from that file."
    );
    return;
  }

  renderButton.disabled = false;

  if (renderSettingsDirty) {
    renderButton.textContent =
      audioAccess.mode === "available" ? "Apply Style & Render" : "Apply Changes & Render";
    return;
  }

  if (audioAccess.mode === "available") {
    renderButton.textContent = isUploadedAudioProject()
      ? videoOutputCard.hidden
        ? "Create From Uploaded Audio"
        : "Create Another Audio Render"
      : videoOutputCard.hidden
        ? "Create Downloadable Lyric Video"
        : "Create Another Render";
    setRenderMessage(
      isUploadedAudioProject()
        ? "Uploaded audio preview is ready. Press create and the render will build lyrics and timing directly from your file."
        : hasUploadedAudio
        ? `YouTube audio is live for this link. ${uploadedAudioFallback.name} will stay on standby in case recovery is needed later.`
        : "YouTube audio preview is live. The final render will still verify timing before export."
    );
    return;
  }

  if (hasUploadedAudio) {
    renderButton.textContent = "Render With Uploaded Audio";
    setRenderMessage(
      `This link is in ${audioAccess.mode === "recovery" ? "smart recovery" : "sound-ready"} mode. The next render will use ${uploadedAudioFallback.name} for guaranteed sound.`
    );
    return;
  }

  if (audioAccess.mode === "upload-recommended") {
    renderButton.disabled = true;
    renderButton.textContent = "Add Audio To Render";
    setRenderMessage(
      "This link needs uploaded audio before rendering so the final video does not come out without sound."
    );
    return;
  }

  renderButton.textContent =
    audioAccess.mode === "recovery" ? "Create Smart Recovery Render" : "Add Audio Or Render";
  setRenderMessage(
    audioAccess.mode === "recovery"
      ? "This link opened in smart recovery mode. The server will try its stronger soundtrack path during render, and you can still add audio now for guaranteed sound."
      : "This link is ready to render. Add audio now for guaranteed sound, or render anyway and let the server try one more soundtrack pass."
  );
}

function setLoadingState(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Loading..." : "Create";
  if (uploadAudioInlineButton) {
    uploadAudioInlineButton.disabled = isLoading;
  }
}

function updateLyricFontPreview() {
  if (!lyricFontInput) {
    return;
  }

  const selectedOption = lyricFontInput.options[lyricFontInput.selectedIndex];
  const selectedValue = lyricFontInput.value || "arial";
  const fontFamily =
    selectedOption?.dataset.fontFamily ||
    lyricFontFamilies[selectedValue] ||
    lyricFontFamilies.arial;

  lyricFontInput.style.fontFamily = fontFamily;
  lyricFontInput.disabled = false;
  lyricFontInput.title = "";

  Array.from(lyricFontInput.options).forEach((option) => {
    option.style.fontFamily =
      option.dataset.fontFamily || lyricFontFamilies[option.value] || lyricFontFamilies.arial;
  });

  if (lyricFontTriggerLabel) {
    lyricFontTriggerLabel.textContent = selectedOption?.textContent?.trim() || "Arial";
    lyricFontTriggerLabel.style.fontFamily = fontFamily;
  }

  if (lyricFontTrigger) {
    lyricFontTrigger.style.fontFamily = fontFamily;
  }

  if (lyricFontMenu) {
    Array.from(lyricFontMenu.querySelectorAll(".font-dropdown-option")).forEach((optionButton) => {
      const isSelected = optionButton.dataset.value === selectedValue;
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  if (lyricFontCount) {
    lyricFontCount.textContent = `Fonts available: ${lyricFontInput.options.length}`;
  }
}

function ensureLyricFontDropdownReady() {
  if (!lyricFontInput) {
    return;
  }

  if (lyricFontCount && /loading/i.test(`${lyricFontCount.textContent || ""}`)) {
    lyricFontCount.textContent = `Fonts available: ${lyricFontInput.options.length}`;
  }

  if (lyricFontMenu && !lyricFontMenu.children.length) {
    buildLyricFontDropdown();
  }
}

function closeLyricFontDropdown() {
  lyricFontDropdownOpen = false;

  if (lyricFontDropdown) {
    lyricFontDropdown.dataset.open = "false";
  }

  if (lyricFontTrigger) {
    lyricFontTrigger.setAttribute("aria-expanded", "false");
  }

  if (lyricFontMenu) {
    lyricFontMenu.hidden = true;
  }
}

function openLyricFontDropdown() {
  if (!lyricFontDropdown || !lyricFontTrigger || !lyricFontMenu) {
    return;
  }

  ensureLyricFontDropdownReady();
  lyricFontDropdownOpen = true;
  lyricFontDropdown.dataset.open = "true";
  lyricFontTrigger.setAttribute("aria-expanded", "true");
  lyricFontMenu.hidden = false;
}

function toggleLyricFontDropdown() {
  if (lyricFontDropdownOpen) {
    closeLyricFontDropdown();
    return;
  }

  openLyricFontDropdown();
}

function buildLyricFontDropdown() {
  if (!lyricFontInput || !lyricFontMenu) {
    return;
  }

  lyricFontMenu.innerHTML = "";
  const previewText = "Aa Bb 123";

  Array.from(lyricFontInput.children).forEach((groupNode) => {
    if (groupNode.tagName?.toLowerCase() === "optgroup") {
      const section = document.createElement("div");
      section.className = "font-dropdown-group";

      const heading = document.createElement("div");
      heading.className = "font-dropdown-group-label";
      heading.textContent = groupNode.label || "Fonts";
      section.appendChild(heading);

      Array.from(groupNode.children).forEach((option) => {
        if (option.tagName?.toLowerCase() !== "option") {
          return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "font-dropdown-option";
        button.dataset.value = option.value;
        button.dataset.fontFamily =
          option.dataset.fontFamily || lyricFontFamilies[option.value] || lyricFontFamilies.arial;
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", option.selected ? "true" : "false");
        button.style.fontFamily = button.dataset.fontFamily;
        button.innerHTML = `
          <span class="font-dropdown-option-name">${option.textContent?.trim() || option.value}</span>
          <span class="font-dropdown-option-preview" style="font-family: ${button.dataset.fontFamily};">${previewText}</span>
        `;
        button.addEventListener("click", () => {
          lyricFontInput.value = option.value;
          lyricFontInput.dispatchEvent(new Event("change", { bubbles: true }));
          closeLyricFontDropdown();
        });

        section.appendChild(button);
      });

      lyricFontMenu.appendChild(section);
      return;
    }

    if (groupNode.tagName?.toLowerCase() === "option") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "font-dropdown-option";
      button.dataset.value = groupNode.value;
      button.dataset.fontFamily =
        groupNode.dataset.fontFamily || lyricFontFamilies[groupNode.value] || lyricFontFamilies.arial;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", groupNode.selected ? "true" : "false");
      button.style.fontFamily = button.dataset.fontFamily;
      button.innerHTML = `
        <span class="font-dropdown-option-name">${groupNode.textContent?.trim() || groupNode.value}</span>
        <span class="font-dropdown-option-preview" style="font-family: ${button.dataset.fontFamily};">${previewText}</span>
      `;
      button.addEventListener("click", () => {
        lyricFontInput.value = groupNode.value;
        lyricFontInput.dispatchEvent(new Event("change", { bubbles: true }));
        closeLyricFontDropdown();
      });
      lyricFontMenu.appendChild(button);
    }
  });

  updateLyricFontPreview();
}

function ensureLyricFontDropdownReady() {
  if (!lyricFontInput || !lyricFontMenu) {
    return;
  }

  if (lyricFontCount) {
    lyricFontCount.textContent = `Fonts available: ${lyricFontInput.options.length}`;
  }

  if (!lyricFontMenu.children.length) {
    buildLyricFontDropdown();
  }
}

function openLyricFontDropdown() {
  if (!lyricFontDropdown || !lyricFontTrigger || !lyricFontMenu) {
    return;
  }

  ensureLyricFontDropdownReady();
  lyricFontDropdown.scrollIntoView({ block: "nearest", inline: "nearest" });
  lyricFontDropdownOpen = true;
  lyricFontDropdown.dataset.open = "true";
  lyricFontTrigger.setAttribute("aria-expanded", "true");
  lyricFontMenu.hidden = false;
}

function renderLyricPositionStatus() {
  if (!lyricPositionStatus) {
    return;
  }

  const hasCustomPlacement = Boolean(lyricPreviewCustomPosition);
  const placement = getLyricPreviewPlacement();
  const backgroundReady = Boolean(uploadedBackgrounds.length || uploadedBackgroundVideo);
  const positionText = `${formatLyricPlacementPercentage(placement.x)} from left - ${formatLyricPlacementPercentage(placement.y)} from top`;

  lyricPositionStatus.textContent = hasCustomPlacement
    ? `Custom lyric placement saved. The render will place the lyrics at ${positionText}.`
    : backgroundReady
      ? "The uploaded background is previewing now. Drag the lyrics anywhere you want before rendering."
      : "Upload a background, then drag the live preview lyrics anywhere you want them to stay in the final render.";
}

function clampPreviewPlacement(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function getLyricPreviewPlacementDefault(styleValue = "auto") {
  return lyricPreviewPlacementDefaults[styleValue] || lyricPreviewPlacementDefaults.auto;
}

function getLyricPreviewPlacement(styleValue = lyricStyleInput?.value || "auto") {
  const defaults = getLyricPreviewPlacementDefault(styleValue);
  if (lyricPreviewCustomPosition) {
    return {
      x: lyricPreviewCustomPosition.x,
      y: lyricPreviewCustomPosition.y,
      anchor: "center"
    };
  }

  return {
    x: defaults.x,
    y: defaults.y,
    anchor: defaults.anchor || "center"
  };
}

function getLyricPreviewAnchorTranslateX(anchor = "center") {
  if (anchor === "left") {
    return "0%";
  }

  if (anchor === "right") {
    return "-100%";
  }

  return "-50%";
}

function updateLyricPreviewPlacement(styleValue = lyricStyleInput?.value || "auto") {
  if (!lyricStylePreview || !previewLinesShell) {
    return;
  }

  const placement = getLyricPreviewPlacement(styleValue);
  const left = `${(placement.x * 100).toFixed(2)}%`;
  const top = `${(placement.y * 100).toFixed(2)}%`;
  const translateX = getLyricPreviewAnchorTranslateX(placement.anchor);
  lyricStylePreview.style.setProperty("--preview-lyrics-x", left);
  lyricStylePreview.style.setProperty("--preview-lyrics-y", top);
  lyricStylePreview.style.setProperty("--preview-shell-translate-x", translateX);
  lyricStylePreview.style.setProperty("--preview-shell-translate-y", "-50%");
  previewLinesShell.style.left = left;
  previewLinesShell.style.top = top;
  previewLinesShell.style.transform = `translate(${translateX}, -50%)`;
  previewLinesShell.dataset.anchor = placement.anchor;
}

function formatLyricPlacementPercentage(value = 0) {
  return `${Math.round(clampPreviewPlacement(value) * 100)}%`;
}

function renderLyricPositionStatus() {
  if (!lyricPositionStatus) {
    return;
  }

  const hasCustomPlacement = Boolean(lyricPreviewCustomPosition);
  const placement = getLyricPreviewPlacement();
  const backgroundReady = Boolean(uploadedBackgrounds.length || uploadedBackgroundVideo);
  const positionText = `${formatLyricPlacementPercentage(placement.x)} from left · ${formatLyricPlacementPercentage(placement.y)} from top`;

  lyricPositionStatus.textContent = hasCustomPlacement
    ? `Custom lyric placement saved. The render will place the lyrics at ${positionText}.`
    : backgroundReady
      ? "The uploaded background is previewing now. Drag the lyrics anywhere you want before rendering."
      : "Upload a background, then drag the live preview lyrics anywhere you want them to stay in the final render.";
}

function setLyricPreviewCustomPosition(position = null) {
  if (!position) {
    lyricPreviewCustomPosition = null;
  } else {
    lyricPreviewCustomPosition = {
      x: clampPreviewPlacement(position.x),
      y: clampPreviewPlacement(position.y)
    };
  }

  updateLyricPreviewPlacement();
  renderLyricPositionStatus();
}

function resolveLyricPreviewRenderPosition() {
  if (!lyricPreviewCustomPosition) {
    return null;
  }

  const placement = getLyricPreviewPlacement();
  return {
    x: Number(placement.x.toFixed(4)),
    y: Number(placement.y.toFixed(4)),
    anchor: placement.anchor
  };
}

function notifyLyricPreviewPositionChanged(message = "Lyric position changed in the live preview.") {
  setStatus(message);
}

function resetLyricPreviewPosition() {
  if (!lyricPreviewCustomPosition) {
    renderLyricPositionStatus();
    return;
  }

  setLyricPreviewCustomPosition(null);
  notifyLyricPreviewPositionChanged("Lyric position reset. Render again to restore the default placement in the final video.");
}

function applyLyricPreviewPlacementPreset(position = {}) {
  setLyricPreviewCustomPosition(position);
  notifyLyricPreviewPositionChanged("Lyric position updated. The final render will use this placement.");
}

function updateLyricPreviewBackground() {
  if (!lyricStylePreview || !lyricStylePreviewImage || !lyricStylePreviewVideo) {
    return;
  }

  const previewImage = uploadedBackgrounds[0]?.dataUrl || "";
  const previewVideo = uploadedBackgroundVideo?.previewUrl || "";
  const hasCustomBackground = Boolean(previewImage || previewVideo);
  lyricStylePreview.classList.toggle("is-custom-background", hasCustomBackground);

  if (previewVideo) {
    lyricStylePreview.style.removeProperty("--lyric-preview-uploaded-image");
    lyricStylePreviewImage.hidden = true;
    lyricStylePreviewImage.removeAttribute("src");
    lyricStylePreviewVideo.hidden = false;

    if (lyricStylePreviewVideo.src !== previewVideo) {
      lyricStylePreviewVideo.src = previewVideo;
      lyricStylePreviewVideo.load();
    }

    lyricStylePreviewVideo.play().catch(() => {});
    return;
  }

  lyricStylePreviewVideo.pause();
  lyricStylePreviewVideo.hidden = true;
  lyricStylePreviewVideo.removeAttribute("src");
  lyricStylePreviewVideo.load();
  lyricStylePreviewImage.hidden = !previewImage;

  if (previewImage) {
    lyricStylePreview.style.setProperty("--lyric-preview-uploaded-image", `url("${previewImage}")`);
    lyricStylePreviewImage.src = previewImage;
  } else {
    lyricStylePreview.style.removeProperty("--lyric-preview-uploaded-image");
    lyricStylePreviewImage.removeAttribute("src");
  }

  renderLyricPositionStatus();
}

function getLyricPreviewDragPoint(event) {
  const touch = event?.touches?.[0] || event?.changedTouches?.[0];
  const clientX = Number(touch?.clientX ?? event?.clientX);
  const clientY = Number(touch?.clientY ?? event?.clientY);

  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null;
  }

  return { clientX, clientY };
}

function isPrimaryMouseButton(event) {
  return event?.type === "mousedown" ? event.button === 0 : true;
}

function handleLyricPreviewPointerDown(event) {
  if (!previewLinesShell || !lyricPreviewDragSurface || lyricPreviewDragState) {
    return;
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  if (!isPrimaryMouseButton(event)) {
    return;
  }

  const point = getLyricPreviewDragPoint(event);
  const stageRect = lyricPreviewDragSurface.getBoundingClientRect();
  const shellRect = previewLinesShell.getBoundingClientRect();

  if (!point || !stageRect.width || !stageRect.height || !shellRect.width || !shellRect.height) {
    return;
  }

  const currentPlacement = getLyricPreviewPlacement();

  lyricPreviewDragState = {
    pointerId: event.pointerId ?? (event.type === "mousedown" ? "mouse" : "touch"),
    inputType: event.pointerType || (event.type === "mousedown" ? "mouse" : event.type?.startsWith("touch") ? "touch" : "pointer"),
    stageWidth: stageRect.width,
    stageHeight: stageRect.height,
    startClientX: point.clientX,
    startClientY: point.clientY,
    startPlacementX: currentPlacement.x,
    startPlacementY: currentPlacement.y,
    moved: false
  };

  if (lyricPreviewAnimationTimer) {
    window.clearInterval(lyricPreviewAnimationTimer);
    lyricPreviewAnimationTimer = null;
    lyricPreviewResumeAnimationAfterDrag = true;
  } else {
    lyricPreviewResumeAnimationAfterDrag = false;
  }

  lyricStylePreview?.classList.add("is-user-positioning");
  previewLinesShell.classList.add("is-dragging");
  const captureTarget = event.currentTarget?.setPointerCapture ? event.currentTarget : previewLinesShell;
  try {
    captureTarget.setPointerCapture?.(event.pointerId);
  } catch {
    // Some mobile browsers only allow pointer capture on the direct touch target.
  }
  document.body.style.userSelect = "none";
  document.body.style.touchAction = "none";
  event.preventDefault?.();
}

function handleLyricPreviewPointerMove(event) {
  if (!lyricPreviewDragState) {
    return;
  }

  if (event.pointerId !== undefined && event.pointerId !== lyricPreviewDragState.pointerId) {
    return;
  }

  if (event.type === "mousemove" && !["mouse", "pointer"].includes(lyricPreviewDragState.inputType)) {
    return;
  }

  if (event.type === "touchmove" && !["touch", "pointer"].includes(lyricPreviewDragState.inputType)) {
    return;
  }

  const point = getLyricPreviewDragPoint(event);
  const stageRect = lyricPreviewDragSurface?.getBoundingClientRect();

  if (!point || !stageRect?.width || !stageRect?.height) {
    return;
  }

  const deltaX = (point.clientX - lyricPreviewDragState.startClientX) / Math.max(1, stageRect.width);
  const deltaY = (point.clientY - lyricPreviewDragState.startClientY) / Math.max(1, stageRect.height);
  let nextX = clampPreviewPlacement(lyricPreviewDragState.startPlacementX + deltaX, 0.06, 0.94);
  let nextY = clampPreviewPlacement(lyricPreviewDragState.startPlacementY + deltaY, 0.08, 0.92);

  // Match the mobile-story editor feel: softly snap near the center guide.
  if (Math.abs(nextX - 0.5) <= 0.025) {
    nextX = 0.5;
  }
  if (Math.abs(nextY - 0.5) <= 0.025) {
    nextY = 0.5;
  }

  lyricStylePreview?.classList.toggle("is-snapped-x", nextX === 0.5);
  lyricStylePreview?.classList.toggle("is-snapped-y", nextY === 0.5);

  const nextPosition = {
    x: nextX,
    y: nextY
  };

  if (
    !lyricPreviewCustomPosition ||
    Math.abs(nextPosition.x - lyricPreviewCustomPosition.x) > 0.001 ||
    Math.abs(nextPosition.y - lyricPreviewCustomPosition.y) > 0.001
  ) {
    lyricPreviewDragState.moved = true;
    setLyricPreviewCustomPosition(nextPosition);
  }

  event.preventDefault?.();
}

function finishLyricPreviewDrag(event) {
  if (!lyricPreviewDragState) {
    return;
  }

  if (event?.pointerId !== undefined && event.pointerId !== lyricPreviewDragState.pointerId) {
    return;
  }

  if (event?.type === "mouseup" && !["mouse", "pointer"].includes(lyricPreviewDragState.inputType)) {
    return;
  }

  if ((event?.type === "touchend" || event?.type === "touchcancel") && !["touch", "pointer"].includes(lyricPreviewDragState.inputType)) {
    return;
  }

  lyricStylePreview?.classList.remove("is-user-positioning");
  lyricStylePreview?.classList.remove("is-snapped-x", "is-snapped-y");
  previewLinesShell?.classList.remove("is-dragging");
  try {
    previewLinesShell?.releasePointerCapture?.(event?.pointerId);
  } catch {
    // Ignore release errors when the browser did not grant capture.
  }
  document.body.style.userSelect = "";
  document.body.style.touchAction = "";
  const wasMoved = lyricPreviewDragState.moved;
  lyricPreviewDragState = null;

  if (lyricPreviewResumeAnimationAfterDrag) {
    lyricPreviewResumeAnimationAfterDrag = false;
    updateLyricStylePreview();
  }

  if (wasMoved) {
    notifyLyricPreviewPositionChanged();
  }
}

function handleLyricPreviewKeyboardMove(event) {
  if (!previewLinesShell) {
    return;
  }

  const step = event.shiftKey ? 0.05 : 0.025;
  const currentPlacement = resolveLyricPreviewRenderPosition() || getLyricPreviewPlacement();
  let nextPosition = null;

  switch (event.key) {
    case "ArrowLeft":
      nextPosition = { x: currentPlacement.x - step, y: currentPlacement.y };
      break;
    case "ArrowRight":
      nextPosition = { x: currentPlacement.x + step, y: currentPlacement.y };
      break;
    case "ArrowUp":
      nextPosition = { x: currentPlacement.x, y: currentPlacement.y - step };
      break;
    case "ArrowDown":
      nextPosition = { x: currentPlacement.x, y: currentPlacement.y + step };
      break;
    case "Escape":
      resetLyricPreviewPosition();
      return;
    default:
      return;
  }

  event.preventDefault();
  setLyricPreviewCustomPosition(nextPosition);
  notifyLyricPreviewPositionChanged();
}

function updateLyricStylePreview() {
  if (
    !lyricStylePreview ||
    !previewLineNodes.length ||
    !lyricStyleInput ||
    !lyricFontInput
  ) {
    return;
  }

  const styleValue = lyricStyleInput.value || "auto";
  const previewKey = lyricPreviewSamples[styleValue] ? styleValue : "default";
  const lines = lyricPreviewSamples[previewKey] || lyricPreviewSamples.default;
  const styleMeta = lyricStylePreviewMeta[styleValue] || lyricStylePreviewMeta.auto;
  const selectedOption = lyricFontInput.options[lyricFontInput.selectedIndex];
  const fontFamily =
    selectedOption?.dataset.fontFamily ||
    lyricFontFamilies[lyricFontInput.value] ||
    lyricFontFamilies.arial;
  const fontLabel = selectedOption?.textContent?.trim() || "Arial";
  const lyricZoomValue = getSelectedLyricZoomValue();
  const allPreviewClasses = [
    "is-auto",
    "is-aa",
    "is-comic",
    "is-line-by-line",
    "is-cinematic",
    "is-bounce",
    "is-side-by-side",
    "is-typewriter",
    "is-spotlight",
    "is-magic",
    "is-neon",
    "is-glitch",
    "is-karaoke",
    "is-whisper",
    "is-stacked",
    "is-minimal",
    "is-fulllength"
  ];

  lyricStylePreview.classList.remove(...allPreviewClasses);
  lyricStylePreview.classList.add(`is-${styleValue}`);

  previewLineNodes.forEach((line) => {
    line.style.fontFamily = fontFamily;
  });

  const filledLines = Array.from(
    { length: previewLineNodes.length },
    (_, index) => lines[index % Math.max(1, lines.length)]
  );
  const focusedIndex = Math.min(Math.max(0, Math.floor(previewLineNodes.length / 2)), previewLineNodes.length - 1);
  const animationVersion = ++lyricPreviewAnimationVersion;
  let previewTick = 0;

  const paintPreviewLines = () => {
    previewLineNodes.forEach((line) => {
      line.classList.remove("is-active", "is-near", "is-mid", "is-far");
      line.style.animation = "none";
    });

    // Force the style-specific CSS animations to restart on each lyric cycle.
    previewLineNodes.forEach((line) => {
      void line.offsetWidth;
      line.style.animation = "";
    });

    previewLineNodes.forEach((line, index) => {
      const depth = Math.abs(index - focusedIndex);
      line.textContent = filledLines[index] || "";
      if (index === focusedIndex) {
        line.classList.add("is-active");
      } else if (depth === 1) {
        line.classList.add("is-near");
      } else if (depth === 2) {
        line.classList.add("is-mid");
      } else {
        line.classList.add("is-far");
      }
      line.dataset.previewDepth = `${depth}`;
      line.dataset.previewTick = `${previewTick}`;
    });

    lyricStylePreview.dataset.previewStyle = styleValue;
    lyricStylePreview.dataset.previewTick = `${previewTick}`;
  };

  paintPreviewLines();

  if (lyricPreviewStyleBadge) {
    lyricPreviewStyleBadge.textContent = styleMeta.label;
  }

  if (lyricPreviewFontLabel) {
    lyricPreviewFontLabel.textContent = fontLabel;
  }

  if (lyricPreviewMotionLabel) {
    lyricPreviewMotionLabel.textContent = styleMeta.motion;
  }

  const styleColorSettings = getSelectedStyleColorSettings();
  syncLyricZoomUi();

  if (lyricStylePreview) {
    lyricStylePreview.style.setProperty("--preview-font-zoom", `${(lyricZoomValue / 100).toFixed(2)}`);
    if (styleColorSettings.enabled) {
      lyricStylePreview.style.setProperty("--preview-style-color", styleColorSettings.color);
      lyricStylePreview.style.setProperty("--preview-style-rgb", hexToRgbTuple(styleColorSettings.color));
    } else {
      lyricStylePreview.style.removeProperty("--preview-style-color");
      lyricStylePreview.style.removeProperty("--preview-style-rgb");
    }

    if (styleValue === "neon") {
      lyricStylePreview.style.setProperty("--preview-neon-color", styleColorSettings.color);
      lyricStylePreview.style.setProperty("--preview-neon-rgb", hexToRgbTuple(styleColorSettings.color));
      lyricStylePreview.style.setProperty("--preview-neon-glow", `${styleColorSettings.glowStrength}`);
    } else {
      lyricStylePreview.style.removeProperty("--preview-neon-color");
      lyricStylePreview.style.removeProperty("--preview-neon-rgb");
      lyricStylePreview.style.removeProperty("--preview-neon-glow");
    }
  }

  updateLyricPreviewPlacement(styleValue);
  renderLyricPositionStatus();

  if (lyricPreviewAnimationTimer) {
    window.clearInterval(lyricPreviewAnimationTimer);
  }

  if (filledLines.length > 1) {
    lyricPreviewAnimationTimer = window.setInterval(() => {
      if (animationVersion !== lyricPreviewAnimationVersion) {
        return;
      }

      filledLines.push(filledLines.shift());
      previewTick += 1;
      paintPreviewLines();
    }, getLyricPreviewAnimationInterval(styleValue));
  }
}

function renderMusicBulletin(index = 0) {
  if (!musicBulletinStamp || !musicBulletinHeadline || !musicBulletinText || !musicBulletinGrid) {
    return;
  }

  const total = musicBulletins.length;
  const safeIndex = ((Number(index) || 0) % total + total) % total;
  const bulletin = musicBulletins[safeIndex];
  activeMusicBulletinIndex = safeIndex;

  musicBulletinStamp.textContent = bulletin.stamp;
  musicBulletinHeadline.textContent = bulletin.headline;
  musicBulletinText.textContent = bulletin.text;
  musicBulletinGrid.innerHTML = bulletin.cards
    .map(
      (card) => `
        <article class="music-era-pill">
          <strong>${card.label}</strong>
          <span>${card.detail}</span>
          ${card.href ? `<a class="music-era-link" href="${card.href}" target="_blank" rel="noopener noreferrer">${card.cta || "Open link"}</a>` : ""}
        </article>
      `
    )
    .join("");

  musicBulletinTabs.forEach((tab, tabIndex) => {
    const isActive = tabIndex === safeIndex;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function scheduleMusicBulletinRotation() {
  if (musicBulletinTimer) {
    window.clearInterval(musicBulletinTimer);
  }

  if (isCompactMobileLayout()) {
    musicBulletinTimer = null;
    return;
  }

  musicBulletinTimer = window.setInterval(() => {
    renderMusicBulletin(activeMusicBulletinIndex + 1);
  }, 6500);
}

function simplifyUiMessage(message, fallback = "Something went wrong. Please try again.") {
  const text = String(message || "").trim();

  if (!text) {
    return fallback;
  }

  if (/could not process that youtube video right now/i.test(text)) {
    return "This video could not be processed right now. Please try again.";
  }

  if (/render job could not be found/i.test(text)) {
    return "That render session expired. Please start the video again.";
  }

  if (/not ready yet/i.test(text)) {
    return "The video is still being prepared.";
  }

  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

async function readJsonResponseSafely(response, fallback = {}) {
  const rawText = await response.text().catch(() => "");
  const safeText = `${rawText || ""}`.trim();

  if (!safeText) {
    return fallback;
  }

  try {
    return JSON.parse(safeText);
  } catch {
    const normalizedError = safeText
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      ...fallback,
      error:
        normalizedError ||
        `The server returned an unexpected ${response.headers.get("content-type") || "response"}.`
    };
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isTransientRenderStartError(error) {
  const statusCode = Number(error?.statusCode || 0);
  const message = `${error?.message || error || ""}`.toLowerCase();

  if ([408, 425, 429, 499, 500, 502, 503, 504].includes(statusCode)) {
    return true;
  }

  return /request aborted|failed to fetch|networkerror|network request failed|load failed|timeout|timed out|econnreset|socket hang up|fetch failed/.test(
    message
  );
}

function isCompactMobileLayout() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function getActiveAudioPreviewNode() {
  return document.getElementById("yt-audio-embed") || audioPlayer;
}

function syncMobileAudioCards(result = currentResult) {
  if (
    !desktopAudioAccessSlot ||
    !desktopAudioPreviewSlot ||
    !audioAccessShell ||
    !audioPlayer
  ) {
    return;
  }

  if (audioAccessShell.parentNode !== desktopAudioAccessSlot) {
    desktopAudioAccessSlot.appendChild(audioAccessShell);
  }

  const previewNode = getActiveAudioPreviewNode();
  if (previewNode && previewNode.parentNode !== desktopAudioPreviewSlot) {
    desktopAudioPreviewSlot.appendChild(previewNode);
  }
}

function syncMobileStageCard() {
  if (!renderStageCard || !mobileStageCard || !mobileStageSlot) {
    return;
  }

  const mobileLayout = isCompactMobileLayout();

  if (!renderStageCard.dataset.desktopParent) {
    const parentId = renderStageCard.parentElement?.id || "";
    if (parentId) {
      renderStageCard.dataset.desktopParent = parentId;
    }
  }

  if (mobileLayout) {
    if (renderStageCard.parentNode !== mobileStageSlot) {
      mobileStageSlot.appendChild(renderStageCard);
    }
    mobileStageCard.hidden = renderStageCard.hidden;
    mediaColumn?.classList.toggle("has-mobile-stage", !renderStageCard.hidden);
    return;
  }

  const desktopParent = renderStageCard.dataset.desktopParent
    ? document.getElementById(renderStageCard.dataset.desktopParent)
    : null;

  if (desktopParent && renderStageCard.parentNode !== desktopParent) {
    desktopParent.appendChild(renderStageCard);
  }

  mobileStageCard.hidden = true;
  mediaColumn?.classList.remove("has-mobile-stage");
}

function formatDebugDateTime(value = "") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "Unknown time";
  }

  return date.toLocaleString();
}

function formatDebugDetails(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value || "");
  }
}

function buildLocalDebugUrl(pathname = "") {
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${effectiveLocalDebugBaseUrl}${safePath}`;
}

async function fetchLocalDebugJson(pathname = "", options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, LOCAL_DEBUG_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(buildLocalDebugUrl(pathname), {
      cache: "no-store",
      signal: controller.signal,
      ...options
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function persistLocalDebugCache({
  entries = [],
  runtimeRoot = "",
  lastRefreshedAt = "",
  connected = false
} = {}) {
  if (!isLocalDebugMode) {
    return;
  }

  try {
    window.localStorage.setItem(
      LOCAL_DEBUG_CACHE_STORAGE_KEY,
      JSON.stringify({
        entries: Array.isArray(entries) ? entries : [],
        runtimeRoot: `${runtimeRoot || ""}`,
        lastRefreshedAt: `${lastRefreshedAt || ""}`,
        connected: Boolean(connected)
      })
    );
  } catch {}
}

function restoreLocalDebugCache() {
  if (!isLocalDebugMode) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_DEBUG_CACHE_STORAGE_KEY);
    const parsed = JSON.parse(raw || "null");

    if (!parsed || !Array.isArray(parsed.entries)) {
      return null;
    }

    return {
      entries: parsed.entries,
      runtimeRoot: `${parsed.runtimeRoot || ""}`,
      lastRefreshedAt: `${parsed.lastRefreshedAt || ""}`,
      connected: parsed.connected !== false
    };
  } catch {
    return null;
  }
}

function persistActiveRenderJob(job = {}) {
  try {
    const nextJobId = `${job?.id || activeRenderJobId || ""}`.trim();

    if (!nextJobId) {
      window.localStorage.removeItem(ACTIVE_RENDER_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      ACTIVE_RENDER_STORAGE_KEY,
      JSON.stringify({
        id: nextJobId,
        title: `${job?.title || currentResult?.title || ""}`.trim(),
        videoId: `${job?.videoId || currentResult?.videoId || ""}`.trim(),
        startedAt: job?.startedAt || new Date().toISOString()
      })
    );
  } catch {}
}

function restoreActiveRenderJob() {
  try {
    const raw = window.localStorage.getItem(ACTIVE_RENDER_STORAGE_KEY);
    const parsed = JSON.parse(raw || "null");

    if (!parsed?.id) {
      return null;
    }

    return {
      id: `${parsed.id || ""}`.trim(),
      title: `${parsed.title || ""}`.trim(),
      videoId: `${parsed.videoId || ""}`.trim(),
      startedAt: `${parsed.startedAt || ""}`.trim()
    };
  } catch {
    return null;
  }
}

function clearPersistedActiveRenderJob() {
  try {
    window.localStorage.removeItem(ACTIVE_RENDER_STORAGE_KEY);
  } catch {}
}

function maybeRequestRenderNotificationPermission() {
  if (isCompactMobileLayout() || !("Notification" in window) || !window.isSecureContext) {
    return;
  }

  if (Notification.permission !== "default") {
    return;
  }

  try {
    const permissionRequest = Notification.requestPermission();
    if (permissionRequest?.catch) {
      permissionRequest.catch(() => {});
    }
  } catch {}
}

function showRenderReadyNotification(job = {}) {
  if (
    isCompactMobileLayout() ||
    !("Notification" in window) ||
    !window.isSecureContext ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const trackTitle = `${job?.title || currentResult?.title || "Your lyric video"}`.trim();

  try {
    const notification = new Notification("Lyric video ready", {
      body: `${trackTitle} finished rendering. Tap to come back and download it.`,
      tag: `song-to-lyrics-render-${job?.id || ""}`,
      renotify: true
    });

    notification.onclick = () => {
      try {
        window.focus();
      } catch {}
      scrollToUiTarget(videoOutputCard || "video-output-card", {
        block: "start"
      });
      notification.close();
    };

    window.setTimeout(() => {
      notification.close();
    }, 12000);
  } catch {}
}

function resumeRenderPollingIfNeeded() {
  if (document.hidden) {
    return;
  }

  const persistedJob = restoreActiveRenderJob();
  const jobId = `${activeRenderJobId || persistedJob?.id || ""}`.trim();

  if (!jobId) {
    return;
  }

  activeRenderJobId = jobId;
  clearRenderPolling();
  renderButton.disabled = true;
  renderButton.textContent = "Rendering...";

  const trackedTitle = `${currentResult?.title || persistedJob?.title || "your lyric video"}`.trim();
  setRenderMessage(`Reconnecting to the active render for ${trackedTitle}...`);
  setStatus(`Reconnecting to the active render for ${trackedTitle} so you can keep tracking progress...`);
  pollRenderJob(jobId);
}

function renderLocalDebugPanel(entries = []) {
  if (!localDebugCard || !localDebugList) {
    return;
  }

  localDebugCard.hidden = !isLocalDebugMode;
  if (localDebugShell) {
    localDebugShell.hidden = !isLocalDebugMode;
  }
  localDebugList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "debug-empty-state";
    empty.textContent = "No local debug errors yet.";
    localDebugList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "debug-entry";
    item.dataset.errorId = String(entry.id || "");

    const title = document.createElement("div");
    title.className = "debug-entry-head";
    title.innerHTML =
      `<strong>Error #${entry.id}</strong><span>${formatDebugDateTime(entry.createdAt)}</span>`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "mini-action-button is-muted debug-delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteLocalDebugEntry(entry.id).catch(() => {});
    });

    const summary = document.createElement("div");
    summary.className = "debug-summary";
    summary.innerHTML =
      `<p><span>Source</span>${entry.source || "-"}</p>` +
      `<p><span>Title</span>${entry.title || "-"}</p>` +
      `<p><span>User message</span>${entry.userMessage || "-"}</p>` +
      `<p><span>Cause</span>${entry.cause || entry.errorMessage || "-"}</p>`;

    const details = document.createElement("details");
    details.className = "debug-details";
    details.open = entries.length <= 3 || entry === entries[0];

    const detailsSummary = document.createElement("summary");
    detailsSummary.textContent = "Full error details";

    const body = document.createElement("pre");
    body.textContent = formatDebugDetails({
      errorMessage: entry.errorMessage || "",
      stack: entry.stack || "",
      details: entry.details || {}
    });

    details.append(detailsSummary, body);
    item.append(title, deleteButton, summary, details);
    localDebugList.appendChild(item);
  });
}

function renderLocalDebugStatus({
  connected = false,
  entryCount = 0,
  runtimeRoot = "",
  lastRefreshedAt = ""
} = {}) {
  if ((!localDebugStatus && !localDebugBanner) || !isLocalDebugMode) {
    return;
  }

  const isEc2Feed = Boolean(runtimeRoot && runtimeRoot.includes("/data"));
  const bannerState = connected ? (isEc2Feed ? "live" : "local") : "offline";
  const bannerMessage = connected
    ? isEc2Feed
      ? "Live EC2 feed connected"
      : "Local app feed connected"
    : "Debug feed disconnected";

  if (localDebugBanner) {
    localDebugBanner.dataset.state = bannerState;
    localDebugBanner.textContent = bannerMessage;
  }

  if (!localDebugStatus) {
    return;
  }

  const parts = [];
  parts.push(
    connected
      ? isEc2Feed
        ? "Reading errors from the live EC2 server"
        : "Reading errors from the local app on this machine"
      : "Waiting for the debug feed"
  );
  parts.push(`${entryCount} error${entryCount === 1 ? "" : "s"}`);

  if (runtimeRoot) {
    parts.push(`Runtime ${runtimeRoot}`);
  }

  if (lastRefreshedAt) {
    parts.push(`Refreshed ${lastRefreshedAt}`);
  }

  localDebugStatus.textContent = parts.join(" | ");
}

async function refreshLocalDebugPanel(options = {}) {
  if (!isLocalDebugMode || !localDebugCard || !localDebugList) {
    return;
  }

  if (localDebugRefreshInFlight) {
    localDebugRefreshQueued = true;
    return;
  }

  localDebugRefreshInFlight = true;
  localDebugRefreshQueued = false;

  try {
    const requestTs = Date.now();
    const [healthResponse, response] = await Promise.all([
      fetchLocalDebugJson(`/api/health?ts=${requestTs}`),
      fetchLocalDebugJson(`/api/local-debug/errors?ts=${requestTs}`)
    ]);

    if (!response.ok) {
      return;
    }

    const healthPayload = healthResponse.ok ? await readJsonResponseSafely(healthResponse, {}) : {};
    const payload = await readJsonResponseSafely(response, {});
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    localDebugLastRefreshedAt = new Date().toLocaleTimeString();
    persistLocalDebugCache({
      entries,
      runtimeRoot: `${healthPayload?.runtimeRoot || ""}`,
      lastRefreshedAt: localDebugLastRefreshedAt,
      connected: true
    });
    renderLocalDebugPanel(entries);
    renderLocalDebugStatus({
      connected: true,
      entryCount: entries.length,
      runtimeRoot: `${healthPayload?.runtimeRoot || ""}`,
      lastRefreshedAt: localDebugLastRefreshedAt
    });
  } catch {
    renderLocalDebugStatus({
      connected: false,
      entryCount: 0,
      runtimeRoot: "",
      lastRefreshedAt: localDebugLastRefreshedAt
    });
  } finally {
    localDebugRefreshInFlight = false;

    if (localDebugRefreshQueued || options.immediateFollowup) {
      localDebugRefreshQueued = false;
      window.setTimeout(() => {
        refreshLocalDebugPanel().catch(() => {});
      }, 0);
    }
  }
}

function scheduleLocalDebugRefresh() {
  if (!isLocalDebugMode) {
    return;
  }

  if (localDebugPollTimer) {
    window.clearTimeout(localDebugPollTimer);
  }

  localDebugPollTimer = window.setTimeout(async () => {
    await refreshLocalDebugPanel();
    scheduleLocalDebugRefresh();
  }, LOCAL_DEBUG_REFRESH_MS);
}

function closeLocalDebugStream() {
  if (localDebugEventSource) {
    localDebugEventSource.close();
    localDebugEventSource = null;
  }

  if (localDebugStreamRetryTimer) {
    window.clearTimeout(localDebugStreamRetryTimer);
    localDebugStreamRetryTimer = null;
  }
}

function connectLocalDebugStream() {
  if (!isLocalDebugMode || typeof window.EventSource !== "function" || localDebugEventSource) {
    return;
  }

  try {
    const stream = new window.EventSource(buildLocalDebugUrl(`/api/local-debug/stream?ts=${Date.now()}`));
    localDebugEventSource = stream;

    const handleUpdate = () => {
      refreshLocalDebugPanel({ immediateFollowup: true }).catch(() => {});
    };

    stream.addEventListener("ready", handleUpdate);
    stream.addEventListener("update", handleUpdate);
    stream.onopen = () => {
      refreshLocalDebugPanel({ immediateFollowup: true }).catch(() => {});
    };
    stream.onerror = () => {
      closeLocalDebugStream();
      localDebugStreamRetryTimer = window.setTimeout(() => {
        localDebugStreamRetryTimer = null;
        connectLocalDebugStream();
      }, 1500);
    };
  } catch {}
}

async function reportLocalDebugError(payload = {}) {
  if (!isLocalDebugMode) {
    return;
  }

  try {
    await fetch(buildLocalDebugUrl("/api/local-debug/errors"), {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify(payload)
    });
  } catch {}

  refreshLocalDebugPanel().catch(() => {});
}

async function clearLocalDebugPanel() {
  if (!isLocalDebugMode) {
    return;
  }

  renderLocalDebugPanel([]);
  persistLocalDebugCache({
    entries: [],
    runtimeRoot: "",
    lastRefreshedAt: localDebugLastRefreshedAt,
    connected: true
  });

  try {
    await fetch(buildLocalDebugUrl("/api/local-debug/errors"), {
      method: "DELETE",
      cache: "no-store",
      headers: {}
    });
  } catch {}

  refreshLocalDebugPanel().catch(() => {});
}

async function deleteLocalDebugEntry(id) {
  if (!isLocalDebugMode || !id) {
    return;
  }

  const remainingEntries = Array.from(localDebugList?.querySelectorAll(".debug-entry") || [])
    .map((entry) => ({
      id: Number(entry.dataset.errorId || 0)
    }))
    .filter((entry) => entry.id && entry.id !== Number(id));

  try {
    await fetch(buildLocalDebugUrl(`/api/local-debug/errors/${encodeURIComponent(id)}`), {
      method: "DELETE",
      cache: "no-store",
      headers: {}
    });
  } catch {}

  if (!remainingEntries.length) {
    renderLocalDebugPanel([]);
    persistLocalDebugCache({
      entries: [],
      runtimeRoot: "",
      lastRefreshedAt: localDebugLastRefreshedAt,
      connected: true
    });
  }

  refreshLocalDebugPanel().catch(() => {});
}

function readImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0
      });
    };
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const sourceUrl = String(reader.result || "");
      const image = new Image();
      image.onload = () => {
        const maxEdge = 1600;
        const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);

        resolve({
          name: file.name,
          width,
          height,
          dataUrl: canvas.toDataURL("image/jpeg", 0.86)
        });
      };
      image.onerror = async () => {
        const dimensions = await readImageDimensions(sourceUrl);
        resolve({
          name: file.name,
          ...dimensions,
          dataUrl: sourceUrl
        });
      };
      image.src = sourceUrl;
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function readVideoFileMetadata(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        file,
        name: file.name,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: Number(video.duration || 0),
        size: Number(file.size || 0)
      });
      URL.revokeObjectURL(objectUrl);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read metadata from ${file.name}.`));
    };
    video.src = objectUrl;
  });
}

function readAudioFileMetadata(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement("audio");

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve({
        file,
        name: file.name,
        duration: Number(audio.duration || 0),
        size: Number(file.size || 0),
        mimeType: file.type || "",
        previewUrl: objectUrl
      });
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read metadata from ${file.name}.`));
    };
    audio.src = objectUrl;
  });
}

function renderUploadPreviews() {
  uploadPreviewStrip.innerHTML = "";
  if (changeUploadedImagesButton) {
    changeUploadedImagesButton.disabled = false;
  }
  if (deleteUploadedImagesButton) {
    deleteUploadedImagesButton.disabled = !uploadedBackgrounds.length;
  }

  if (!uploadedBackgrounds.length) {
    const empty = document.createElement("p");
    empty.className = "upload-empty";
    empty.textContent = "No custom backgrounds selected yet.";
    uploadPreviewStrip.appendChild(empty);
    return;
  }

  for (const background of uploadedBackgrounds) {
    const item = document.createElement("div");
    item.className = "upload-preview";

    const image = document.createElement("img");
    image.src = background.dataUrl;
    image.alt = background.name || "Uploaded background";

    const label = document.createElement("span");
    label.textContent = `${background.width}x${background.height}`;

    item.append(image, label);
    uploadPreviewStrip.appendChild(item);
  }
}

function describeBackgroundSelection() {
  if (uploadedBackgroundVideo && uploadedBackgrounds.length) {
    return `${uploadedBackgroundVideo.name} is previewing now as the background video, and ${uploadedBackgrounds.length} image${uploadedBackgrounds.length === 1 ? "" : "s"} are also ready if you want to switch again.`;
  }

  if (uploadedBackgroundVideo) {
    return `${uploadedBackgroundVideo.name} is previewing now. The downloaded MP4 will only change if you press Rebuild final video.`;
  }

  if (uploadedBackgrounds.length) {
    return `${uploadedBackgrounds.length} custom background image${uploadedBackgrounds.length === 1 ? "" : "s"} are previewing now. The downloaded MP4 stays unchanged until you rebuild it.`;
  }

  return "No custom background override is selected. Change images or video to update the background preview instantly without rerendering.";
}

function updateLiveBackgroundPreview() {
  if (!liveBackgroundPreview) {
    return;
  }

  const shouldShowPreview = Boolean(
    !videoOutputCard.hidden && (uploadedBackgroundVideo?.previewUrl || uploadedBackgrounds.length)
  );

  liveBackgroundPreview.hidden = !shouldShowPreview;

  if (!shouldShowPreview) {
    liveBackgroundPreviewImage.hidden = true;
    liveBackgroundPreviewImage.removeAttribute("src");
    liveBackgroundPreviewVideo.pause();
    liveBackgroundPreviewVideo.hidden = true;
    liveBackgroundPreviewVideo.removeAttribute("src");
    liveBackgroundPreviewVideo.load();
    return;
  }

  if (uploadedBackgroundVideo?.previewUrl) {
    liveBackgroundPreviewImage.hidden = true;
    liveBackgroundPreviewImage.removeAttribute("src");
    liveBackgroundPreviewVideo.hidden = false;

    if (liveBackgroundPreviewVideo.src !== uploadedBackgroundVideo.previewUrl) {
      liveBackgroundPreviewVideo.src = uploadedBackgroundVideo.previewUrl;
      liveBackgroundPreviewVideo.load();
    }

    liveBackgroundPreviewVideo.play().catch(() => {});
    return;
  }

  const previewImage = uploadedBackgrounds[0]?.dataUrl || "";
  liveBackgroundPreviewVideo.pause();
  liveBackgroundPreviewVideo.hidden = true;
  liveBackgroundPreviewVideo.removeAttribute("src");
  liveBackgroundPreviewVideo.load();
  liveBackgroundPreviewImage.hidden = !previewImage;
  liveBackgroundPreviewImage.src = previewImage;
}

function updatePostRenderBackgroundStatus() {
  if (!postRenderBackgroundStatus) {
    return;
  }

  const hasCustomBackground = Boolean(uploadedBackgroundVideo || uploadedBackgrounds.length);
  postRenderBackgroundStatus.textContent = describeBackgroundSelection();
  postRenderBackgroundStatus.classList.toggle("is-ready", hasCustomBackground);

  if (rerenderBackgroundButton) {
    rerenderBackgroundButton.disabled = !hasCustomBackground;
  }

  updateArtworkVisibility();
  updateLyricPreviewBackground();
  updateLiveBackgroundPreview();
}

function setPostRenderActionsVisible(isVisible) {
  if (!postRenderActions) {
    return;
  }

  postRenderActions.hidden = !isVisible;
  updatePostRenderBackgroundStatus();
}

function renderBackgroundVideoMeta() {
  if (!uploadedBackgroundVideo) {
    backgroundVideoMeta.textContent = "No background video selected.";
    return;
  }

  const orientation =
    uploadedBackgroundVideo.height > uploadedBackgroundVideo.width ? "portrait" : "landscape";
  backgroundVideoMeta.textContent =
    `${uploadedBackgroundVideo.name} • ${uploadedBackgroundVideo.width}x${uploadedBackgroundVideo.height} • ` +
    `${formatTime(uploadedBackgroundVideo.duration)} • ${formatFileSize(uploadedBackgroundVideo.size)} • ${orientation}`;
}

function revokeUploadedAudioPreviewUrl() {
  if (uploadedAudioFallback?.previewUrl) {
    URL.revokeObjectURL(uploadedAudioFallback.previewUrl);
  }
}

function renderAudioFallbackMeta() {
  if (!uploadedAudioFallback) {
    audioFallbackMeta.textContent = "No audio fallback selected.";
    syncInlineAudioButtonLabel(null);
    return;
  }

  audioFallbackMeta.textContent =
    `Uploaded song: ${getUploadedAudioDisplayTitle(uploadedAudioFallback)} • ${formatTime(uploadedAudioFallback.duration)} • ${formatFileSize(uploadedAudioFallback.size)}`;
  syncInlineAudioButtonLabel(uploadedAudioFallback);
}

function showAudioFallbackRecovery(options = {}) {
  if (!audioFallbackTip) {
    return;
  }

  const {
    title = "Add audio if sound is missing",
    text = "The app already tried the normal YouTube audio path. If this song stays silent, add the audio file here and render again.",
    ready = false
  } = options;

  audioFallbackTip.hidden = false;
  audioFallbackTip.classList.toggle("is-ready", Boolean(ready));
  audioFallbackTipTitle.textContent = title;
  audioFallbackTipText.textContent = text;
  audioFallbackTipButton.textContent = ready ? "Change uploaded audio" : "Upload audio now";
}

function hideAudioFallbackRecovery() {
  if (!audioFallbackTip) {
    return;
  }

  audioFallbackTip.hidden = true;
  audioFallbackTip.classList.remove("is-ready");
}

function promptAudioFallbackRecovery(message = "", options = {}) {
  const hasUploadedAudio = Boolean(uploadedAudioFallback?.file);
  const defaultText = hasUploadedAudio
    ? `Audio fallback ${uploadedAudioFallback.name} is ready. Render again and the app will use it instead of the blocked YouTube sound.`
    : "This link needs uploaded audio before render. Add the song audio file once and the app will build synced lyrics with sound.";

  showAudioFallbackRecovery({
    title: hasUploadedAudio ? "Audio fallback is ready" : "This link needs uploaded audio",
    text: message || defaultText,
    ready: hasUploadedAudio
  });

  if (options.scroll !== false) {
    scrollToAudioFallbackCard();
  }
}

async function handleBackgroundUpload() {
  const files = Array.from(backgroundImagesInput.files || []).slice(0, 5);

  if ((backgroundImagesInput.files || []).length > 5) {
    setStatus("Only the first 5 background images will be used.");
  }

  uploadedBackgrounds = [];
  renderUploadPreviews();
  updatePostRenderBackgroundStatus();

  if (!files.length) {
    updatePostRenderBackgroundStatus();
    return;
  }

  setStatus("Preparing uploaded background images...");

  try {
    uploadedBackgrounds = await Promise.all(files.map((file) => compressImageFile(file)));
    renderUploadPreviews();
    updateLyricPreviewBackground();
    updatePostRenderBackgroundStatus();
    setStatus(
      videoOutputCard.hidden
        ? `${uploadedBackgrounds.length} custom background image${uploadedBackgrounds.length === 1 ? "" : "s"} ready in the live preview. Drag the lyrics to a clear area if needed.`
        : "Background preview updated instantly. Rebuild the final video only if you want the new background in the download."
    );
  } catch (error) {
    uploadedBackgrounds = [];
    renderUploadPreviews();
    updateLyricPreviewBackground();
    updatePostRenderBackgroundStatus();
    setStatus(error.message || "Could not prepare the uploaded images.", true);
  }
}

async function handleBackgroundVideoUpload() {
  const [file] = Array.from(backgroundVideoInput.files || []);
  revokeUploadedBackgroundVideoPreview();
  uploadedBackgroundVideo = null;
  renderBackgroundVideoMeta();
  updateLyricPreviewBackground();
  updatePostRenderBackgroundStatus();

  if (!file) {
    return;
  }

  setStatus("Reading background video details...");

  try {
    uploadedBackgroundVideo = await readVideoFileMetadata(file);
    uploadedBackgroundVideo.previewUrl = URL.createObjectURL(file);
    renderBackgroundVideoMeta();
    updateLyricPreviewBackground();
    updatePostRenderBackgroundStatus();
    setStatus(
      videoOutputCard.hidden
        ? `Background video ready: ${uploadedBackgroundVideo.name}. It is now previewing behind the lyrics.`
        : "Background video preview updated instantly. Rebuild the final video only if you want the download changed."
    );
  } catch (error) {
    revokeUploadedBackgroundVideoPreview();
    uploadedBackgroundVideo = null;
    renderBackgroundVideoMeta();
    updateLyricPreviewBackground();
    updatePostRenderBackgroundStatus();
    setStatus(error.message || "Could not prepare the background video.", true);
  }
}

async function handleAudioFallbackUpload() {
  const [file] = Array.from(audioFallbackInput.files || []);
  revokeUploadedAudioPreviewUrl();
  uploadedAudioFallback = null;
  renderAudioFallbackMeta();

  if (!file) {
    return;
  }

  setStatus("Reading audio fallback details...");

  try {
    uploadedAudioFallback = await readAudioFileMetadata(file);
    renderAudioFallbackMeta();
    if (!urlInput.value.trim() && (!currentResult || isUploadedAudioProject(currentResult))) {
      setStatus("Listening to the uploaded audio and building lyrics...");
      await renderResult(await prepareUploadedAudioProject(uploadedAudioFallback));
    } else {
      applyAudioAccessState();
    }
    promptAudioFallbackRecovery(
      currentResult?.audioPreviewBlocked
        ? `Audio fallback ${uploadedAudioFallback.name} is ready. Render again and the app will use it instead of the blocked YouTube sound.`
        : isUploadedAudioProject(currentResult)
          ? `Uploaded audio ${uploadedAudioFallback.name} is ready. Lyrics are loaded and the app can build the lyric video directly from this file.`
          : `Audio fallback ${uploadedAudioFallback.name} is ready. The app will only use it if YouTube audio becomes unavailable.`,
      { scroll: false }
    );
    syncIdleRenderCta();
    setStatus(
      currentResult?.audioPreviewBlocked
        ? `Audio fallback ready: ${uploadedAudioFallback.name}. The next render will use it instead of blocked YouTube audio.`
        : isUploadedAudioProject(currentResult)
          ? `Uploaded audio ready: ${uploadedAudioFallback.name}. Lyrics were generated from the file and the project can render without any YouTube link.`
          : `Audio fallback ready: ${uploadedAudioFallback.name}. It will be used if YouTube audio is blocked.`
    );

    if (autoRenderPending && currentResult && linkNeedsUploadedAudio(currentResult)) {
      setRenderMessage("Audio uploaded. Starting the render automatically now...");
      setStatus(`Audio uploaded: ${uploadedAudioFallback.name}. Starting the render automatically now...`);
      await handleRender();
    }
  } catch (error) {
    if (uploadedAudioFallback?.file) {
      renderAudioFallbackMeta();

      if (!urlInput.value.trim() && (!currentResult || isUploadedAudioProject(currentResult))) {
        await renderResult(buildUploadedAudioProjectResult(uploadedAudioFallback));
      } else {
        applyAudioAccessState();
      }

      syncIdleRenderCta();
      setStatus(
        error.message ||
          "The uploaded audio is ready, but the lyric preview could not be prepared yet. The final render will still build from the file.",
        true
      );
      return;
    }

    revokeUploadedAudioPreviewUrl();
    uploadedAudioFallback = null;
    renderAudioFallbackMeta();
    applyAudioAccessState();
    syncIdleRenderCta();
    setStatus(error.message || "Could not prepare the uploaded audio fallback.", true);
  }
}

function clearAudioFallbackSelection() {
  revokeUploadedAudioPreviewUrl();
  uploadedAudioFallback = null;
  audioFallbackInput.value = "";
  renderAudioFallbackMeta();
  hideAudioFallbackRecovery();
  if (isUploadedAudioProject(currentResult)) {
    currentResult = null;
    resultPanel.hidden = true;
    updateQueryString("");
    if (shareButton) {
      shareButton.hidden = true;
      shareButton.disabled = true;
    }
  }
  applyAudioAccessState();
  syncIdleRenderCta();
}

function spotlightAudioFallbackInput(options = {}) {
  const highlightTarget = audioFallbackField || audioFallbackTip || audioFallbackInput;

  if (!highlightTarget) {
    return;
  }

  if (options.scroll !== false) {
    scrollToAudioFallbackCard();
  }

  highlightTarget.style.outline = "2px solid #f59e0b";
  highlightTarget.style.outlineOffset = "2px";
  highlightTarget.style.borderRadius = "18px";
  window.setTimeout(() => {
    highlightTarget.style.outline = "";
    highlightTarget.style.outlineOffset = "";
    highlightTarget.style.borderRadius = "";
  }, 3000);
}

function clearHardAudioBlockPreview() {
  const existingEmbed = document.getElementById("yt-audio-embed");

  if (existingEmbed) {
    existingEmbed.remove();
  }

  syncMobileAudioCards();
}

function handleHardAudioBlock(result = currentResult) {
  const videoId = result?.videoId || extractVideoIdFromUrl(result?.inputUrl || "");

  audioPlayer.pause();
  audioPlayer.hidden = true;
  audioPlayer.removeAttribute("src");

  clearHardAudioBlockPreview();

  if (videoId) {
    const wrap = document.createElement("div");
    wrap.id = "yt-audio-embed";
    wrap.className = "youtube-audio-embed";
    wrap.innerHTML = `
      <iframe
        width="100%"
        height="96"
        src="https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0"
        frameborder="0"
        allow="autoplay; encrypted-media"
        style="display:block;border:0;border-radius:16px;">
      </iframe>`;
    const previewTarget = desktopAudioPreviewSlot || audioPlayer.parentNode;
    previewTarget.appendChild(wrap);
  }

  if (audioStatusBadge) {
    audioStatusBadge.textContent = "Upload for video";
    audioStatusBadge.style.background = "#f59e0b";
    audioStatusBadge.style.color = "#16191d";
  }

  if (audioAccessTitle) {
    audioAccessTitle.textContent = "Preview plays through YouTube";
  }

  if (audioAccessText) {
    audioAccessText.textContent =
      "You can still hear the song above. To include sound in the downloaded lyric video, upload the MP3 below and render again.";
  }

  if (audioFallbackTip) {
    audioFallbackTip.hidden = false;

    if (audioFallbackTipTitle) {
      audioFallbackTipTitle.textContent = "Upload MP3 for the downloadable video";
    }

    if (audioFallbackTipText) {
      audioFallbackTipText.textContent =
        "The preview above still works through YouTube. To burn audio into the downloaded MP4, add the song audio file here and render again.";
    }
  }

  spotlightAudioFallbackInput();
  syncMobileAudioCards(result);
}

async function applyAudioPlayerWithRecovery(result = currentResult) {
  const videoId = result?.videoId || extractVideoIdFromUrl(result?.inputUrl || "");
  const audioAccess = getCurrentAudioAccessState(result);

  audioPlayer.pause();
  audioPlayer.preload = "none";

  if (result?.audioUrl && audioAccess.mode === "available") {
    clearHardAudioBlockPreview();
    audioStatusBadge.style.background = "";
    audioStatusBadge.style.color = "";
    audioPlayer.src = result.audioUrl;
    audioPlayer.hidden = false;
    syncMobileAudioCards(result);
    return;
  }

  audioPlayer.removeAttribute("src");
  audioPlayer.hidden = true;

  if (!videoId || !result?.audioPreviewBlocked) {
    return;
  }

  // When the server has already classified the link as recovery-only,
  // don't fire a second automatic HEAD probe that just creates noisy debug errors.
  if (audioAccess.mode === "recovery" && audioAccess.previewAvailable === false) {
    handleHardAudioBlock(result);
    return;
  }

  try {
    const probeResponse = await Promise.race([
      fetch(`/api/audio/${encodeURIComponent(videoId)}`, {
        method: "HEAD",
        cache: "no-store",
        headers: {
          "X-Local-Debug-Silent": "1"
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000))
    ]);

    if (probeResponse.ok || probeResponse.redirected) {
      const recoveredUrl = `/api/audio/${encodeURIComponent(videoId)}`;
      result.audioUrl = recoveredUrl;
      result.audioPreviewBlocked = false;
      result.audioAccess = {
        ...audioAccess,
        mode: "recovery",
        previewAvailable: true,
        badgeLabel: "Audio recovered",
        title: "Recovered soundtrack preview is ready",
        summary:
          "The server recovered a playable preview path for this link. You can continue with the live preview, and uploaded audio still stays available as backup.",
        primaryActionLabel: "Create lyric video",
        recommendedAction: "render"
      };
      audioPlayer.src = recoveredUrl;
      audioPlayer.hidden = false;
      clearHardAudioBlockPreview();
      audioStatusBadge.style.background = "";
      audioStatusBadge.style.color = "";
      applyAudioAccessState(result);
      syncIdleRenderCta();
      syncMobileAudioCards(result);
      return;
    }
  } catch {}

  handleHardAudioBlock(result);
}

function clearCustomBackgroundSelection() {
  uploadedBackgrounds = [];
  revokeUploadedBackgroundVideoPreview();
  uploadedBackgroundVideo = null;
  backgroundImagesInput.value = "";
  backgroundVideoInput.value = "";
  renderUploadPreviews();
  renderBackgroundVideoMeta();
  updateLyricPreviewBackground();
  updatePostRenderBackgroundStatus();
}

function clearRenderPolling() {
  if (renderPollTimer) {
    window.clearTimeout(renderPollTimer);
    renderPollTimer = null;
  }
}

async function fetchRenderJobStatus(jobId) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, RENDER_POLL_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`/api/render/${jobId}`, {
      cache: "no-store",
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function resetRenderedVideo() {
  renderedVideo.removeAttribute("src");
  renderedVideo.load();
  downloadVideoLink.href = "#";
  videoOutputCard.hidden = true;
  setPostRenderActionsVisible(false);
  updateLiveBackgroundPreview();
}

function markRenderOutputStale(message = "Style or font changed. Render again to update the downloadable video.") {
  if (!hasProjectSource()) {
    return;
  }

  renderSettingsDirty = true;

  if (activeRenderJobId) {
    setRenderMessage("The current render is still using the previous style settings. Render again after it finishes to apply the new look.");
    setStatus("Style or font changed while rendering. Start one more render after this finishes to apply the new look.");
    return;
  }

  if (!videoOutputCard.hidden) {
    resetRenderedVideo();
  }

  syncIdleRenderCta();
  setRenderMessage(message);
  setStatus(message);
}

function setRenderProgress(progress) {
  const safeProgress = Math.max(0, Math.min(1, Number(progress || 0)));
  const percentage = Math.round(safeProgress * 100);
  renderProgressBar.style.width = `${percentage}%`;
  renderProgressPercent.textContent = `${percentage}%`;
}

function formatRenderDuration(durationMs = 0) {
  const safeDurationMs = Math.max(0, Number(durationMs || 0));

  if (safeDurationMs < 1000) {
    return `${safeDurationMs} ms`;
  }

  const totalSeconds = safeDurationMs / 1000;

  if (totalSeconds < 10) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (minutes < 60) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes.toString().padStart(2, "0")}m`;
}

function renderStageTimings(job = {}) {
  if (!renderStageCard || !renderStageList || !renderStageTotalTime) {
    return;
  }

  const stageTimings = Array.isArray(job.stageTimings) ? job.stageTimings : [];

  if (!stageTimings.length && !Number(job.renderDurationMs || 0)) {
    renderStageCard.hidden = true;
    renderStageList.innerHTML = "";
    renderStageTotalTime.textContent = "0s";
    syncMobileStageCard();
    return;
  }

  renderStageCard.hidden = false;
  renderStageTotalTime.textContent = `Total ${formatRenderDuration(job.renderDurationMs || 0)}`;
  renderStageList.innerHTML = "";

  stageTimings.slice(-6).forEach((entry = {}) => {
    const row = document.createElement("div");
    row.className = "render-stage-row";

    const label = document.createElement("span");
    label.className = "render-stage-row-label";
    label.textContent = entry.label || "Working";

    const meta = document.createElement("span");
    meta.className = "render-stage-row-meta";
    meta.textContent = entry.active
      ? `${formatRenderDuration(entry.durationMs || 0)} live`
      : formatRenderDuration(entry.durationMs || 0);

    if (entry.active) {
      row.classList.add("is-active");
    }

    row.append(label, meta);
    renderStageList.appendChild(row);
  });

  syncMobileStageCard();
}

function setRenderMessage(message, isError = false) {
  renderText.textContent = message;
  renderText.classList.toggle("is-error", Boolean(isError));
}

function resetRenderState() {
  renderSettingsDirty = false;
  clearRenderPolling();
  activeRenderJobId = "";
  renderButton.disabled = true;
  renderButton.textContent = "Create Downloadable Lyric Video";
  setRenderMessage("Paste a song or upload audio and the app will build a downloadable lyric video automatically.");
  setRenderProgress(0);
  renderStageTimings({});
  resetRenderedVideo();
  clearHardAudioBlockPreview();
  if (shareButton) {
    shareButton.hidden = true;
    shareButton.disabled = true;
  }
  applyAudioAccessState(null);
}

function primeRenderState() {
  renderSettingsDirty = false;
  syncIdleRenderCta();

  if (!currentResult?.lines?.length) {
    setRenderMessage(
      String(currentResult?.lyricsSource || "").toLowerCase() === "unavailable" &&
        !isUploadedAudioProject(currentResult)
        ? "No lyrics were found for this video. Try another song link or upload the audio file directly."
        : "Lyrics were not found for this track, so the renderer may fall back to title cards if needed."
    );
  }
}

function renderWarnings(warnings = []) {
  warningsContainer.innerHTML = "";

  for (const warning of warnings) {
    const item = document.createElement("div");
    item.className = "warning-item";
    item.textContent = warning;
    warningsContainer.appendChild(item);
  }
}

function setPoster(url) {
  if (currentResult && url) {
    currentResult.poster = url;
  }

  posterImage.src = url || "";
  posterImage.alt = currentResult ? `${currentResult.title} artwork` : "Video artwork";
}

function getThumbnailDistanceScore(previous = "", current = "") {
  const previousText = `${previous || ""}`;
  const currentText = `${current || ""}`;

  if (!previousText) {
    return 1;
  }

  let differenceCount = 0;
  const maxLength = Math.max(previousText.length, currentText.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (previousText[index] !== currentText[index]) {
      differenceCount += 1;
    }
  }

  return differenceCount / Math.max(1, maxLength);
}

function renderThumbnails(thumbnails = []) {
  thumbnailStrip.innerHTML = "";
  const uniqueThumbnails = thumbnails
    .filter((thumbnail, index, list) => list.findIndex((item) => item.url === thumbnail.url) === index)
    .filter((thumbnail, index, list) => {
      if (index === 0) {
        return true;
      }

      const previousUrl = list[index - 1]?.url || "";
      return getThumbnailDistanceScore(previousUrl, thumbnail.url) >= 0.08;
    });

  for (const thumbnail of uniqueThumbnails.slice(0, 6)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumbnail-button";
    button.setAttribute("aria-label", "Use this image as the feature artwork");

    const image = document.createElement("img");
    image.src = thumbnail.url;
    image.alt = "YouTube thumbnail";

    button.appendChild(image);
    button.addEventListener("click", () => {
      setPoster(thumbnail.url);
      [...thumbnailStrip.children].forEach((child) => child.classList.remove("active"));
      button.classList.add("active");
    });

    if (thumbnail.url === currentResult.poster) {
      button.classList.add("active");
    }

    thumbnailStrip.appendChild(button);
  }
}

function updateArtworkVisibility() {
  if (!thumbnailCard) {
    return;
  }

  const shouldHideArtwork = Boolean(uploadedBackgrounds.length || uploadedBackgroundVideo);
  thumbnailCard.hidden = shouldHideArtwork;
}

function createLyricButton(line, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "lyric-line";
  button.dataset.index = String(index);

  const textGroup = document.createElement("span");
  textGroup.className = "line-text-group";

  const text = document.createElement("span");
  text.className = "line-text";
  text.textContent = line.text;

  const trailingEmojiText = getTrailingLyricEmojiText(line.text);
  if (trailingEmojiText) {
    const emojiTrail = document.createElement("span");
    emojiTrail.className = "line-emoji-trail";
    emojiTrail.textContent = trailingEmojiText;
    textGroup.append(text, emojiTrail);
  } else {
    textGroup.append(text);
  }

  const time = document.createElement("span");
  time.className = "line-time";
  time.textContent = formatTime(line.start);

  button.append(textGroup, time);
  button.addEventListener("click", () => {
    audioPlayer.currentTime = line.start;
    audioPlayer.play().catch(() => {});
  });

  return button;
}

function renderLyrics(lines = []) {
  lyricsList.innerHTML = "";
  lyricButtons = [];
  activeLineIndex = -1;

  if (!lines.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent =
      "No web lyrics or transcript lines were available for this video. Try another link or one with captions.";
    lyricsList.appendChild(emptyState);
    return;
  }

  lyricButtons = lines.map((line, index) => createLyricButton(line, index));
  lyricButtons.forEach((button) => lyricsList.appendChild(button));
}

function findActiveLineIndex(currentTime, lines) {
  if (!lines.length) {
    return -1;
  }

  let low = 0;
  let high = lines.length - 1;
  let bestIndex = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (lines[middle].start <= currentTime) {
      bestIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return bestIndex;
}

function syncLyricsToPlayback() {
  if (!currentResult?.lines?.length) {
    return;
  }

  const nextIndex = findActiveLineIndex(audioPlayer.currentTime, currentResult.lines);

  if (nextIndex === activeLineIndex) {
    return;
  }

  activeLineIndex = nextIndex;

  lyricButtons.forEach((button, index) => {
    button.classList.toggle("active", index === nextIndex);
  });

  const activeButton = lyricButtons[nextIndex];
  if (activeButton) {
    activeButton.scrollIntoView({
      block: "nearest",
      behavior: "smooth"
    });
  }
}

function updateQueryString(videoUrl) {
  const url = new URL(window.location.href);
  if (videoUrl) {
    url.searchParams.set("url", videoUrl);
  } else {
    url.searchParams.delete("url");
  }
  window.history.replaceState({}, "", url);
}

async function copyShareLink() {
  if (!isShareableProject()) {
    return;
  }

  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set("url", currentResult.inputUrl);

  const originalLabel = shareButton.textContent;

  try {
    await navigator.clipboard.writeText(shareUrl.toString());
    shareButton.textContent = "Share link copied";
  } catch (error) {
    shareButton.textContent = "Copy failed";
  }

  window.setTimeout(() => {
    shareButton.textContent = originalLabel;
  }, 1800);
}

async function renderResult(result) {
  currentResult = result;
  renderSettingsDirty = false;
  resultPanel.hidden = false;

  trackTitle.textContent = result.title;
  trackArtist.textContent = isUploadedAudioProject(result)
    ? `Uploaded file • ${formatTime(result.durationSeconds || 0)}`
    : result.song?.artist
      ? `${result.song.artist} - ${result.channelTitle}`
      : result.channelTitle;
  lyricsSource.textContent = `Source: ${result.lyricsSource.replace(/-/g, " ")}`;
  syncMode.textContent = `Sync: ${result.syncMode.replace(/-/g, " ")}`;

  setPoster(result.poster);
  renderThumbnails(result.thumbnails || []);
  renderWarnings(result.warnings || []);
  renderLyrics(result.lines || []);
  primeRenderState();

  updatePostRenderBackgroundStatus();
  updateArtworkVisibility();
  applyAudioAccessState(result);
  promptRequiredAudioUpload(result, { scroll: false });
  await applyAudioPlayerWithRecovery(result);

  if (shareButton) {
    shareButton.hidden = !isShareableProject(result);
    shareButton.disabled = !isShareableProject(result);
  }

  updateQueryString(isShareableProject(result) ? result.inputUrl : "");
  if (isUploadedAudioProject(result)) {
    hideAudioFallbackRecovery();
  } else if (getCurrentAudioAccessState(result).mode !== "available" && !linkNeedsUploadedAudio(result)) {
    promptAudioFallbackRecovery(
      getCurrentAudioAccessState(result).mode === "recovery"
        ? "This link is in protected recovery mode. The server will try its stronger soundtrack path during render, and you can still upload audio now for guaranteed sound."
        : "This link is loading without a playable server soundtrack right now. Upload the song audio once if you want guaranteed sound in the final video.",
      { scroll: false }
    );
    spotlightAudioFallbackInput({ scroll: false });
  } else if (uploadedAudioFallback) {
    promptAudioFallbackRecovery(
      `Audio fallback ${uploadedAudioFallback.name} is ready and will only be used if the server loses the YouTube soundtrack.`,
      { scroll: false }
    );
  } else {
    hideAudioFallbackRecovery();
  }
  syncIdleRenderCta();
  const audioAccess = getCurrentAudioAccessState(result);
  const noLyricsAvailable =
    !isUploadedAudioProject(result) &&
    !result.lines?.length &&
    String(result.lyricsSource || "").toLowerCase() === "unavailable";
  const uploadRequiredBeforeRender = linkNeedsUploadedAudio(result) && !uploadedAudioFallback?.file;

  if (uploadRequiredBeforeRender) {
    promptRequiredAudioUpload(result);
    return;
  }

  setStatus(
    autoRenderPending
      ? `Loaded ${result.title}. Starting the render automatically now...`
      : noLyricsAvailable
        ? canAutoBuildLyricsFromAudio(result)
          ? `No web lyrics were found for ${result.title}, so the render will build lyric timing from the audio automatically.`
          : `No lyrics were found for ${result.title}. Try another song link or upload the track audio directly.`
        : isUploadedAudioProject(result)
        ? `Uploaded audio loaded. The app can now create the lyric video directly from ${result.title}.`
        : audioAccess.mode === "available"
        ? `Loaded ${result.title}. Live soundtrack preview is ready, and the render can continue with your current style settings.`
        : audioAccess.mode === "recovery"
          ? `Loaded ${result.title}. This link opened in protected recovery mode, so the final render will try the stronger soundtrack path before needing uploaded audio.`
          : `Loaded ${result.title}. Lyrics and artwork are ready, but this song needs uploaded audio if you want guaranteed sound in the final video.`
  );
}

function updateRenderJobUi(job) {
  setRenderProgress(job.progress || 0);
  renderStageTimings(job);
  const userMessage = simplifyUiMessage(
    job.userMessage || job.error || job.stage || "",
    "Building your lyric video."
  );
  const persistedJob = restoreActiveRenderJob();

  if (job.status === "queued" || job.status === "running") {
    persistActiveRenderJob({
      ...persistedJob,
      ...job,
      id: job.id || activeRenderJobId,
      title: job.title || currentResult?.title || persistedJob?.title || "",
      videoId: job.videoId || currentResult?.videoId || persistedJob?.videoId || ""
    });
    renderButton.disabled = true;
    renderButton.textContent = job.retrying ? "Fixing..." : "Rendering...";
    if (rerenderBackgroundButton) {
      rerenderBackgroundButton.disabled = true;
      rerenderBackgroundButton.textContent = "Rebuilding...";
    }
    setRenderMessage(userMessage);
    setStatus(userMessage);
    scrollToRenderProgressCard();
    return;
  }

  if (job.status === "completed") {
    activeRenderJobId = "";
    clearPersistedActiveRenderJob();
    renderButton.disabled = false;
    setRenderProgress(1);
    videoOutputCard.hidden = false;
    renderedVideo.src = job.videoUrl;
    renderedVideo.load();
    downloadVideoLink.href = job.downloadUrl;
    downloadVideoLink.download = `${currentResult?.videoId || persistedJob?.videoId || job.videoId || "lyric-video"}.mp4`;
    setPostRenderActionsVisible(true);
    if (rerenderBackgroundButton) {
      rerenderBackgroundButton.disabled = false;
      rerenderBackgroundButton.textContent = "Rebuild final video";
    }
    const usedUploadedAudio = Array.isArray(job.notes)
      ? job.notes.some((note) => /uploaded audio fallback/i.test(`${note || ""}`))
      : false;
    const usedSilentFallback = Array.isArray(job.notes)
      ? job.notes.some((note) => /silent fallback/i.test(`${note || ""}`))
      : false;
    if (usedUploadedAudio) {
      promptAudioFallbackRecovery(
        "This render used your uploaded audio fallback successfully, so the downloaded MP4 keeps sound even though the source link was blocked.",
        { scroll: false }
      );
    } else if (usedSilentFallback) {
      promptAudioFallbackRecovery(
        "This render finished with a silent fallback track because the source audio was still blocked. Upload the song audio and render again to restore sound.",
        { scroll: false }
      );
    }
    applyAudioAccessState();
    syncIdleRenderCta();
    setRenderMessage(userMessage || (job.notes?.[0] ? `Done. ${job.notes[0]}` : "Lyric video ready."));
    setStatus(userMessage || "The lyric video is ready to preview and download.");
    scrollToUiTarget(videoOutputCard || "video-output-card", {
      block: "start"
    });
    if (document.hidden || (typeof document.hasFocus === "function" && !document.hasFocus())) {
      showRenderReadyNotification({
        ...persistedJob,
        ...job,
        title: job.title || currentResult?.title || persistedJob?.title || ""
      });
    }
    refreshLocalDebugPanel().catch(() => {});
    return;
  }

  activeRenderJobId = "";
  clearPersistedActiveRenderJob();
  renderButton.disabled = false;
  if (rerenderBackgroundButton) {
    rerenderBackgroundButton.textContent = "Rebuild final video";
    rerenderBackgroundButton.disabled = !Boolean(uploadedBackgroundVideo || uploadedBackgrounds.length);
  }
  applyAudioAccessState();
  syncIdleRenderCta();
  setRenderMessage(userMessage, true);
  scrollToUiTarget(statusCard || "status-card", {
    block: "center"
  });
  if (/blocked audio|cookie file|silent fallback|no stable transcription audio|could not reach the video audio/i.test(`${job.error || ""} ${job.userMessage || ""}`)) {
    promptAudioFallbackRecovery(
      "The server could not lock onto the song audio for this link. Upload the audio file and render again to keep sound.",
      { scroll: true }
    );
  }
  setStatus(userMessage, true);
  refreshLocalDebugPanel().catch(() => {});
}

async function pollRenderJob(jobId) {
  clearRenderPolling();

  try {
    const response = await fetchRenderJobStatus(jobId);
    const payload = await readJsonResponseSafely(response, {});

    if (!response.ok) {
      const responseError = new Error(payload.error || "Could not read render progress.");
      responseError.statusCode = response.status;
      throw responseError;
    }

    renderPollFailureCount = 0;
    updateRenderJobUi(payload);

    if (payload.status === "queued" || payload.status === "running") {
      renderPollTimer = window.setTimeout(() => pollRenderJob(jobId), RENDER_POLL_RETRY_BASE_MS);
    }
  } catch (error) {
    const message = simplifyUiMessage(
      error.message || "Could not monitor render progress.",
      "Could not monitor render progress."
    );
    const expiredSession = /render job could not be found/i.test(message);
    const transientPollFailure = !expiredSession && isTransientRenderStartError({
      ...error,
      message
    });

    if (transientPollFailure && renderPollFailureCount < MAX_TRANSIENT_RENDER_POLL_FAILURES) {
      renderPollFailureCount += 1;
      renderButton.disabled = true;
      renderButton.textContent = "Rendering...";
      setRenderMessage(
        "The render is still running on the server. Reconnecting to live progress now...",
        false
      );
      setStatus(
        "Connection dropped for a moment, but the render is still active. Reconnecting...",
        false
      );
      renderPollTimer = window.setTimeout(
        () => pollRenderJob(jobId),
        Math.min(12000, RENDER_POLL_RETRY_BASE_MS * (renderPollFailureCount + 1))
      );
      return;
    }

    reportLocalDebugError({
      source: "client-render-poll",
      title: "Render polling failed",
      userMessage: message,
      errorMessage: error.message || "",
      cause: activeRenderJobId || jobId,
      stack: error.stack || "",
      details: {
        jobId: activeRenderJobId || jobId,
        resultVideoId: currentResult?.videoId || "",
        renderPollFailureCount,
        expiredSession
      }
    });

    if (expiredSession) {
      activeRenderJobId = "";
      clearPersistedActiveRenderJob();
    }

    renderPollFailureCount = 0;
    renderButton.disabled = false;
    renderButton.textContent = expiredSession
      ? "Create Downloadable Lyric Video"
      : "Try Render Again";
    setRenderMessage(
      expiredSession
        ? "The previous render session expired after a server restart. Start the render again."
        : message,
      true
    );
    setStatus(
      expiredSession
        ? "The previous render session expired. Start the render again from this page."
        : message,
      true
    );
  }
}

async function handleRender() {
  if (!hasProjectSource()) {
    autoRenderPending = false;
    setStatus("Paste a YouTube link or upload audio before rendering a video.", true);
    return;
  }

  const audioAccess = getCurrentAudioAccessState();
  const hasUploadedAudio = Boolean(uploadedAudioFallback?.file);

  if (!isUploadedAudioProject() && audioAccess.mode === "upload-recommended" && !hasUploadedAudio) {
    autoRenderPending = true;
    const uploadRequiredMessage = buildUploadedAudioRequiredMessage();
    setStatus(uploadRequiredMessage, true);
    setRenderMessage(
      "Rendering is paused until you add the song audio file in the audio card below.",
      true
    );
    promptAudioFallbackRecovery(
      `${uploadRequiredMessage} Add the song audio file and then the render will start automatically with sound.`,
      { scroll: true }
    );
    scrollToAudioFallbackCard();
    spotlightAudioFallbackInput({ scroll: false });
    syncIdleRenderCta();
    return;
  }

  autoRenderPending = false;
  clearRenderPolling();
  renderPollFailureCount = 0;
  resetRenderedVideo();
  renderSettingsDirty = false;
  maybeRequestRenderNotificationPermission();
  renderButton.disabled = true;
  renderButton.textContent = "Starting...";
  setRenderMessage(
    audioAccess.mode === "available"
      ? "Checking the link, verifying lyric timing against the audio, and preparing the download job..."
      : audioAccess.mode === "recovery"
        ? "Starting protected recovery mode. The app will try the stronger soundtrack path before it asks for uploaded audio."
        : "Starting the render in fallback mode. The app will try one last server recovery pass, but uploaded audio is still the safest way to keep sound."
  );
  setRenderProgress(0.04);
  setStatus(
    audioAccess.mode === "available"
      ? "Starting the lyric video render after the sync check passes..."
      : audioAccess.mode === "recovery"
        ? "Starting a protected recovery render for this link..."
      : "Starting the render without a trusted preview soundtrack. Upload audio any time if you need guaranteed sound."
  );
  scrollToRenderProgressCard();

  try {
    const renderPayload = {
      inputUrl: isUploadedAudioProject(currentResult) ? "" : currentResult.inputUrl,
      videoId: currentResult.videoId,
      title: currentResult.title,
      channelTitle: currentResult.channelTitle,
      durationSeconds: currentResult.durationSeconds,
      lines: currentResult.lines,
      transcriptLines: currentResult.transcriptLines,
      referenceLyricsLines: currentResult.referenceLyricsLines,
      song: currentResult.song,
      syncMode: currentResult.syncMode,
      audioPreviewBlocked: Boolean(currentResult.audioPreviewBlocked),
      poster: currentResult.poster,
      thumbnails: currentResult.thumbnails,
      customBackgrounds: uploadedBackgrounds,
      customBackgroundVideo: uploadedBackgroundVideo
        ? {
            name: uploadedBackgroundVideo.name,
            width: uploadedBackgroundVideo.width,
            height: uploadedBackgroundVideo.height,
            duration: uploadedBackgroundVideo.duration,
            size: uploadedBackgroundVideo.size
          }
        : null,
      customAudioUpload: uploadedAudioFallback
        ? {
            name: uploadedAudioFallback.name,
            duration: uploadedAudioFallback.duration,
            size: uploadedAudioFallback.size,
            mimeType: uploadedAudioFallback.mimeType
          }
        : null,
      outputFormat: outputFormatInput.value,
      renderMode: renderModeInput.value,
      lyricStyle: lyricStyleInput.value,
      lyricFont: lyricFontInput.value,
      lyricFontZoom: getSelectedLyricZoomValue(),
      lyricPlacement: resolveLyricPreviewRenderPosition(),
      useStyleColor: getSelectedStyleColorSettings().enabled,
      styleColor: getSelectedStyleColorSettings().color,
      neonGlow: getSelectedStyleColorSettings().glowPercent,
      ...getClientRenderProfile()
    };
    const buildRenderFormData = () => {
      const formData = new FormData();
      formData.append("renderPayload", JSON.stringify(renderPayload));

      if (uploadedBackgroundVideo?.file) {
        formData.append("backgroundVideo", uploadedBackgroundVideo.file, uploadedBackgroundVideo.name);
      }

      if (uploadedAudioFallback?.file) {
        formData.append("audioFile", uploadedAudioFallback.file, uploadedAudioFallback.name);
      }

      return formData;
    };

    let payload = null;
    let lastRenderStartError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        if (attempt > 0) {
          setRenderMessage("The upload connection was interrupted, so the app is retrying the render start...");
          setStatus("Retrying the render start after an interrupted upload...");
          await wait(700);
        }

        const response = await fetch("/api/render", {
          method: "POST",
          body: buildRenderFormData()
        });

        let responsePayload = {};

        try {
          responsePayload = await readJsonResponseSafely(response, {});
        } catch {}

        if (!response.ok) {
          const renderStartError = new Error(
            responsePayload.error || "The lyric video could not be started."
          );
          renderStartError.statusCode = response.status;
          throw renderStartError;
        }

        payload = responsePayload;
        lastRenderStartError = null;
        break;
      } catch (error) {
        lastRenderStartError = error;

        if (attempt === 1 || !isTransientRenderStartError(error)) {
          throw error;
        }
      }
    }

    if (!payload && lastRenderStartError) {
      throw lastRenderStartError;
    }

    activeRenderJobId = payload.id;
    updateRenderJobUi(payload);
    pollRenderJob(activeRenderJobId);
  } catch (error) {
    reportLocalDebugError({
      source: "client-render-start",
      title: "Render start failed",
      userMessage: simplifyUiMessage(
        error.message || "The lyric video could not be started.",
        "The lyric video could not be started."
      ),
      errorMessage: error.message || "",
      cause: currentResult?.videoId || "",
      stack: error.stack || "",
      details: {
        videoId: currentResult?.videoId || "",
        renderMode: renderModeInput.value,
        lyricStyle: lyricStyleInput.value,
        lyricFont: lyricFontInput.value,
        useStyleColor: getSelectedStyleColorSettings().enabled,
        styleColor: getSelectedStyleColorSettings().color,
        neonGlow: getSelectedStyleColorSettings().glowPercent
      }
    });
    renderButton.disabled = false;
    renderButton.textContent = "Create Downloadable Lyric Video";
    const message = simplifyUiMessage(
      error.message || "The lyric video could not be started.",
      "The lyric video could not be started."
    );
    setRenderMessage(message, true);
    setStatus(message, true);
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const videoUrl = urlInput.value.trim();
  const hasUploadedAudio = Boolean(uploadedAudioFallback?.file);
  const mobileSafeMode = isCompactMobileLayout();

  if (!videoUrl && !hasUploadedAudio) {
    setStatus("Paste a YouTube link or upload audio before continuing.", true);
    return;
  }

  activeRenderJobId = "";
  autoRenderPending = true;
  clearPersistedActiveRenderJob();
  setLoadingState(true);
  resetRenderState();
  setStatus(
    videoUrl
      ? "Fetching video details, audio, and lyrics..."
      : "Preparing the uploaded audio project..."
  );

  try {
    if (!videoUrl && hasUploadedAudio) {
      let uploadedAudioProject =
        isUploadedAudioProject(currentResult) && Array.isArray(currentResult?.lines)
          ? currentResult
          : null;

      if (!uploadedAudioProject) {
        try {
          uploadedAudioProject = await prepareUploadedAudioProject(uploadedAudioFallback);
        } catch (error) {
          uploadedAudioProject = buildUploadedAudioProjectResult(uploadedAudioFallback);
          uploadedAudioProject.warnings = [
            ...(uploadedAudioProject.warnings || []),
            "The mobile preview lyric analysis could not finish, so the render will listen to this uploaded audio directly and build the final timing during export."
          ];
          setStatus(
            "Preview lyrics took too long on this device. Starting render from the uploaded audio directly...",
            false
          );
        }
      }

      if (!uploadedAudioProject) {
        autoRenderPending = false;
        throw new Error("The uploaded audio could not be prepared.");
      }

      await renderResult(uploadedAudioProject);
      await handleRender();
      return;
    }

    const response = await fetch("/api/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: videoUrl })
    });

    const payload = await readJsonResponseSafely(response, {});

    if (!response.ok) {
      autoRenderPending = false;
      throw new Error(payload.error || "The video could not be processed.");
    }

    if (
      !mobileSafeMode &&
      payload.inputUrl &&
      payload.videoId &&
      !uploadedBackgrounds.length &&
      !uploadedBackgroundVideo
    ) {
      try {
        const frameResponse = await fetch(
          `/api/video-frames/${payload.videoId}?duration=${encodeURIComponent(payload.durationSeconds || 0)}`
        );
        const framePayload = await readJsonResponseSafely(frameResponse, {});

        if (frameResponse.ok && Array.isArray(framePayload.frames) && framePayload.frames.length) {
          payload.thumbnails = framePayload.frames.map((url, index) => ({
            url,
            width: 480,
            height: 270,
            label: `Frame ${index + 1}`
          }));
        }
      } catch {}
    } else {
      payload.thumbnails = [];
    }

    const noLyricsAvailable =
      !isUploadedAudioProject(payload) &&
      (!payload.lines?.length || payload.syncMode === "none");
    const allowAudioBuiltLyricsProject = canAutoBuildLyricsFromAudio(payload);

    if (noLyricsAvailable && !allowAudioBuiltLyricsProject) {
      autoRenderPending = false;
      currentResult = null;
      resultPanel.hidden = true;
      setStatus(
        "No lyrics or captions found for this video. Try a music video, or upload the audio file directly.",
        true
      );
      setLoadingState(false);
      return;
    }

    if (allowAudioBuiltLyricsProject) {
      payload.warnings = [
        ...(Array.isArray(payload.warnings) ? payload.warnings : []),
        "No web lyrics were found, so the render will generate lyric timing directly from the audio."
      ];
    }

    await renderResult(payload);

    if (linkNeedsUploadedAudio(payload) && !uploadedAudioFallback?.file) {
      promptRequiredAudioUpload(payload, { scroll: true });
      return;
    }

    await handleRender();
  } catch (error) {
    autoRenderPending = false;
    reportLocalDebugError({
      source: "client-submit",
      title: "Video load failed",
      userMessage: simplifyUiMessage(
        error.message || "Something went wrong while loading that video.",
        "Something went wrong while loading that video."
      ),
      errorMessage: error.message || "",
      cause: videoUrl,
      stack: error.stack || "",
      details: {
        inputUrl: videoUrl
      }
    });
    setStatus(
      simplifyUiMessage(
        error.message || "Something went wrong while loading that video.",
        "Something went wrong while loading that video."
      ),
      true
    );
  } finally {
    setLoadingState(false);
  }
}

function handleInputPaste(event) {
  const pastedValue = event.clipboardData?.getData("text")?.trim() || "";

  if (looksLikeYouTubeUrl(pastedValue)) {
    window.setTimeout(() => {
      setStatus("Link pasted. Press Create to load the song and start rendering.");
    }, 50);
  }
}

audioPlayer.addEventListener("timeupdate", syncLyricsToPlayback);
audioPlayer.addEventListener("seeked", syncLyricsToPlayback);
audioPlayer.addEventListener("loadedmetadata", syncLyricsToPlayback);
audioPlayer.addEventListener("error", () => {
  promptAudioFallbackRecovery(
    "Live preview audio is not available for this link right now. Add the song audio file if you want guaranteed sound in the final video.",
    { scroll: false }
  );
  setStatus(
    "This song loaded, but live preview audio is not available from the server right now. You can still continue or add the song audio for guaranteed sound.",
    true
  );
  reportLocalDebugError({
    source: "client-audio",
    title: "Audio playback error",
    userMessage:
      "This song loaded, but live preview audio is not available from the server right now. You can still continue or add the song audio for guaranteed sound.",
    errorMessage: audioPlayer.error?.message || `HTMLMediaElement error code ${audioPlayer.error?.code || "unknown"}`,
    cause: audioPlayer.currentSrc || currentResult?.audioUrl || "",
    details: {
      mediaErrorCode: audioPlayer.error?.code || null,
      audioSrc: audioPlayer.currentSrc || currentResult?.audioUrl || "",
      videoId: currentResult?.videoId || ""
    }
  });
});
audioAccessAction?.addEventListener("click", () => {
  if (uploadedAudioFallback?.file) {
    audioFallbackInput.click();
    return;
  }

  audioFallbackInput.click();
});
uploadAudioInlineButton?.addEventListener("click", () => audioFallbackInput.click());
form.addEventListener("submit", handleSubmit);
shareButton.addEventListener("click", copyShareLink);
renderButton.addEventListener("click", handleRender);
lyricStyleInput.addEventListener("change", () => {
  updateStyleSpecificControls();
  updateLyricFontPreview();
  updateLyricStylePreview();
  markRenderOutputStale("Lyrics style changed. Render again to apply the new style to the output video.");
});
lyricFontInput.addEventListener("change", () => {
  updateLyricFontPreview();
  updateLyricStylePreview();
  markRenderOutputStale("Lyrics font changed. Render again to apply the new font to the output video.");
});
lyricFontTrigger?.addEventListener("click", (event) => {
  event.preventDefault();
  toggleLyricFontDropdown();
});
document.addEventListener("click", (event) => {
  if (!lyricFontDropdown || !lyricFontDropdownOpen) {
    return;
  }

  if (lyricFontDropdown.contains(event.target)) {
    return;
  }

  closeLyricFontDropdown();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lyricFontDropdownOpen) {
    closeLyricFontDropdown();
    lyricFontTrigger?.focus();
  }
});
if (lyricFontZoomInput) {
  lyricFontZoomInput.addEventListener("input", () => {
    syncLyricZoomUi();
    updateLyricStylePreview();
    markRenderOutputStale("Lyrics size changed. Render again to apply the new size to the output video.");
  });
}
if (lyricFontZoomOutButton) {
  lyricFontZoomOutButton.addEventListener("click", () => {
    if (!lyricFontZoomInput) {
      return;
    }
    const { min, step } = getPreviewZoomBounds();
    lyricFontZoomInput.value = String(Math.max(min, getSelectedLyricZoomValue() - step));
    syncLyricZoomUi();
    updateLyricStylePreview();
    markRenderOutputStale("Lyrics size changed. Render again to apply the new size to the output video.");
  });
}
if (lyricFontZoomInButton) {
  lyricFontZoomInButton.addEventListener("click", () => {
    if (!lyricFontZoomInput) {
      return;
    }
    const { max, step } = getPreviewZoomBounds();
    lyricFontZoomInput.value = String(Math.min(max, getSelectedLyricZoomValue() + step));
    syncLyricZoomUi();
    updateLyricStylePreview();
    markRenderOutputStale("Lyrics size changed. Render again to apply the new size to the output video.");
  });
}
if (neonColorInput) {
  neonColorInput.addEventListener("input", () => {
    updateStyleSpecificControls();
    updateLyricStylePreview();
    markRenderOutputStale("Lyric color changed. Render again to apply the new color to the output video.");
  });
}
if (useStyleColorInput) {
  useStyleColorInput.addEventListener("change", () => {
    updateStyleSpecificControls();
    updateLyricStylePreview();
    markRenderOutputStale("Lyric color settings changed. Render again to apply them to the output video.");
  });
}
if (neonGlowInput) {
  neonGlowInput.addEventListener("input", () => {
    updateStyleSpecificControls();
    updateLyricStylePreview();
    markRenderOutputStale("Glow settings changed. Render again to apply them to the output video.");
  });
}
lyricPreviewDragSurface?.addEventListener("pointerdown", handleLyricPreviewPointerDown);
previewLinesShell?.addEventListener("pointerdown", handleLyricPreviewPointerDown);
lyricPreviewDragSurface?.addEventListener("touchstart", handleLyricPreviewPointerDown, { passive: false });
previewLinesShell?.addEventListener("touchstart", handleLyricPreviewPointerDown, { passive: false });
lyricPreviewDragSurface?.addEventListener("mousedown", handleLyricPreviewPointerDown);
previewLinesShell?.addEventListener("mousedown", handleLyricPreviewPointerDown);
previewLinesShell?.addEventListener("keydown", handleLyricPreviewKeyboardMove);
changeBackgroundImagesButton.addEventListener("click", () => backgroundImagesInput.click());
changeUploadedImagesButton.addEventListener("click", () => backgroundImagesInput.click());
deleteUploadedImagesButton.addEventListener("click", () => {
  uploadedBackgrounds = [];
  backgroundImagesInput.value = "";
  renderUploadPreviews();
  updatePostRenderBackgroundStatus();
  setStatus("Uploaded background images were removed.");
});
changeBackgroundVideoButton.addEventListener("click", () => backgroundVideoInput.click());
clearBackgroundButton.addEventListener("click", () => {
  clearCustomBackgroundSelection();
  setStatus("Custom backgrounds were cleared. The live preview returned to the default state without rerendering.");
});
rerenderBackgroundButton.addEventListener("click", () => {
  handleRender();
});
urlInput.addEventListener("paste", handleInputPaste);
backgroundImagesInput.addEventListener("change", handleBackgroundUpload);
backgroundVideoInput.addEventListener("change", handleBackgroundVideoUpload);
audioFallbackInput.addEventListener("change", handleAudioFallbackUpload);
audioFallbackTipButton?.addEventListener("click", () => audioFallbackInput.click());
audioFallbackPopupButton?.addEventListener("click", () => audioFallbackInput.click());
audioFallbackPopupClose?.addEventListener("click", () => {
  if (audioFallbackPopupKey) {
    dismissedAudioFallbackPopupKeys.add(audioFallbackPopupKey);
    persistDismissedAudioPopupKeys();
  }
  if (audioFallbackPopup) {
    audioFallbackPopup.hidden = true;
    audioFallbackPopup.style.display = "none";
  }
});
changeAudioFallbackButton.addEventListener("click", () => audioFallbackInput.click());
deleteAudioFallbackButton.addEventListener("click", () => {
  clearAudioFallbackSelection();
  setStatus("Uploaded audio fallback was removed.");
});
resetRenderState();
renderUploadPreviews();
renderBackgroundVideoMeta();
renderAudioFallbackMeta();
updatePostRenderBackgroundStatus();
syncMobileResultStack();
buildLyricFontDropdown();
updateLyricFontPreview();
syncLyricZoomUi();
updateStyleSpecificControls();
updateLyricStylePreview();
updateLyricPreviewBackground();
renderLyricPositionStatus();
restoreDismissedAudioPopupKeys();
renderMusicBulletin(0);
scheduleMusicBulletinRotation();
syncMobileAudioCards();
syncMobileStageCard();
renderLocalDebugPanel([]);
renderLocalDebugStatus({
  connected: false,
  entryCount: 0,
  runtimeRoot: "",
  lastRefreshedAt: ""
});

musicBulletinTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const nextIndex = Number(tab.dataset.bulletinIndex || 0);
    renderMusicBulletin(nextIndex);
    scheduleMusicBulletinRotation();
  });
});

if (localDebugRefreshButton) {
  localDebugRefreshButton.addEventListener("click", () => {
    if (localDebugPollTimer) {
      window.clearTimeout(localDebugPollTimer);
      localDebugPollTimer = null;
    }
    refreshLocalDebugPanel().catch(() => {});
    scheduleLocalDebugRefresh();
  });
}

if (localDebugClearButton) {
  localDebugClearButton.addEventListener("click", () => {
    clearLocalDebugPanel().catch(() => {});
  });
}

window.addEventListener("resize", () => {
  syncMobileResultStack();
  updateLyricPreviewPlacement();
});
window.addEventListener("pointermove", handleLyricPreviewPointerMove);
window.addEventListener("pointerup", finishLyricPreviewDrag);
window.addEventListener("pointercancel", finishLyricPreviewDrag);
window.addEventListener("touchmove", handleLyricPreviewPointerMove, { passive: false });
window.addEventListener("touchend", finishLyricPreviewDrag);
window.addEventListener("touchcancel", finishLyricPreviewDrag);
window.addEventListener("mousemove", handleLyricPreviewPointerMove);
window.addEventListener("mouseup", finishLyricPreviewDrag);
lyricPositionResetButton?.addEventListener("click", () => {
  resetLyricPreviewPosition();
});

window.addEventListener("error", (event) => {
  reportLocalDebugError({
    source: "client-window",
    title: "Unhandled window error",
    userMessage: simplifyUiMessage(event.message || "An unhandled browser error happened."),
    errorMessage: event.message || "",
    cause: `${event.filename || ""}:${event.lineno || 0}:${event.colno || 0}`,
    stack: event.error?.stack || "",
    details: {
      filename: event.filename || "",
      line: event.lineno || 0,
      column: event.colno || 0
    }
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  reportLocalDebugError({
    source: "client-promise",
    title: "Unhandled promise rejection",
    userMessage: simplifyUiMessage(reason?.message || String(reason || "")),
    errorMessage: reason?.message || String(reason || ""),
    cause: reason?.name || "",
    stack: reason?.stack || "",
    details: {
      reason: typeof reason === "object" ? reason : String(reason || "")
    }
  });
});

window.addEventListener("beforeunload", () => {
  revokeUploadedBackgroundVideoPreview();
  if (musicBulletinTimer) {
    window.clearInterval(musicBulletinTimer);
  }
  if (localDebugPollTimer) {
    window.clearTimeout(localDebugPollTimer);
  }
  closeLocalDebugStream();
});

window.addEventListener("focus", () => {
  resumeRenderPollingIfNeeded();

  if (!isLocalDebugMode) {
    return;
  }

  refreshLocalDebugPanel().catch(() => {});
  scheduleLocalDebugRefresh();
  connectLocalDebugStream();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    resumeRenderPollingIfNeeded();
  }

  if (!isLocalDebugMode || document.hidden) {
    return;
  }

  refreshLocalDebugPanel().catch(() => {});
  scheduleLocalDebugRefresh();
  connectLocalDebugStream();
});

window.addEventListener("DOMContentLoaded", () => {
  const activeRenderJob = restoreActiveRenderJob();
  if (activeRenderJob?.id) {
    activeRenderJobId = activeRenderJob.id;
    renderButton.disabled = true;
    renderButton.textContent = "Rendering...";
    setRenderMessage(
      `The mobile render for ${activeRenderJob.title || "your lyric video"} is still running on the server. Reconnecting now...`
    );
    setStatus(
      `The mobile render for ${activeRenderJob.title || "your lyric video"} is still running on the server. Reconnecting now...`
    );
  }

  const cachedLocalDebug = restoreLocalDebugCache();
  if (cachedLocalDebug) {
    localDebugLastRefreshedAt = cachedLocalDebug.lastRefreshedAt || "";
    renderLocalDebugPanel(cachedLocalDebug.entries);
    renderLocalDebugStatus({
      connected: cachedLocalDebug.connected,
      entryCount: cachedLocalDebug.entries.length,
      runtimeRoot: cachedLocalDebug.runtimeRoot,
      lastRefreshedAt: cachedLocalDebug.lastRefreshedAt
    });
  }
  refreshLocalDebugPanel().catch(() => {});
  scheduleLocalDebugRefresh();
  connectLocalDebugStream();
  syncMobileAudioCards();
  syncMobileStageCard();
  urlInput.value = "";
  updateQueryString("");
  resumeRenderPollingIfNeeded();
});

window.addEventListener("resize", () => {
  syncMobileAudioCards();
  syncMobileStageCard();
  scheduleMusicBulletinRotation();
});
