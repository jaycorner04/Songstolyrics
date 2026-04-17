const form = document.getElementById("converter-form");
const urlInput = document.getElementById("video-url");
const submitButton = document.getElementById("submit-button");
const backgroundImagesInput = document.getElementById("background-images");
const backgroundVideoInput = document.getElementById("background-video");
const backgroundVideoMeta = document.getElementById("background-video-meta");
const outputFormatInput = document.getElementById("output-format");
const renderModeInput = document.getElementById("render-mode");
const lyricStyleInput = document.getElementById("lyric-style");
const lyricFontInput = document.getElementById("lyric-font");
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
const previewLineOne = document.getElementById("preview-line-1");
const previewLineTwo = document.getElementById("preview-line-2");
const previewLineThree = document.getElementById("preview-line-3");
const uploadPreviewStrip = document.getElementById("upload-preview-strip");
const changeUploadedImagesButton = document.getElementById("change-uploaded-images-button");
const deleteUploadedImagesButton = document.getElementById("delete-uploaded-images-button");
const shareButton = document.getElementById("share-button");
const renderButton = document.getElementById("render-button");
const renderText = document.getElementById("render-text");
const renderProgressBar = document.getElementById("render-progress-bar");
const renderProgressPercent = document.getElementById("render-progress-percent");
const renderStageCard = document.getElementById("render-stage-card");
const renderStageList = document.getElementById("render-stage-list");
const renderStageTotalTime = document.getElementById("render-stage-total-time");
const audioPlayer = document.getElementById("audio-player");
const resultPanel = document.getElementById("result-panel");
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
const warningsContainer = document.getElementById("warnings");
const thumbnailStrip = document.getElementById("thumbnail-strip");
const thumbnailCard = document.querySelector(".thumbnail-card");
const lyricsList = document.getElementById("lyrics-list");
const localDebugCard = document.getElementById("local-debug-card");
const localDebugList = document.getElementById("local-debug-list");
const localDebugRefreshButton = document.getElementById("local-debug-refresh-button");
const localDebugClearButton = document.getElementById("local-debug-clear-button");
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
let localDebugPollTimer = null;
let musicBulletinTimer = null;
let uploadedBackgrounds = [];
let uploadedBackgroundVideo = null;
let activeMusicBulletinIndex = 0;
let renderSettingsDirty = false;
const isLocalDebugMode = /^(localhost|127(?:\.\d{1,3}){3}|::1)$/i.test(window.location.hostname || "");
const lyricPreviewSamples = {
  default: ["City lights in stereo", "You keep running through my mind", "Tonight the echo feels alive"],
  aa: ["MOST", "PEOPLE LOOKED", "AT HIM WITH TERROR"],
  comic: ["HEY HEART, STAY LOUD", "YOU KEEP RUNNING THROUGH MY MIND", "TONIGHT THE ECHO FEELS ALIVE"],
  cinematic: ["city lights in stereo", "you keep running through my mind", "tonight the echo feels alive"],
  bounce: ["Heartbeats in motion", "You keep running through my mind", "We rise when the chorus lands"],
  "side-by-side": ["Left side whisper", "You keep running through my mind", "Right side afterglow"],
  typewriter: ["Signal online", "You keep running through my mind", "Ending scene in slow motion"],
  spotlight: ["Silence around us", "You keep running through my mind", "Only the chorus remains"],
  magic: ["Prapancham Telidhe", "Jathai Nuvvu Unte", "Tonight the feeling stays soft"],
  neon: ["AFTER DARK WE GLOW", "You keep running through my mind", "Neon pulses through the haze"],
  glitch: ["SIGNAL CUT", "You keep running through my mind", "Static sparks behind the beat"],
  karaoke: ["Sing it back", "You keep running through my mind", "Tonight the whole room knows"],
  whisper: ["soft lights flicker", "you keep running through my mind", "the silence leans closer"],
  stacked: ["Before the drop", "You keep running through my mind", "After the echo"],
  minimal: ["In one frame", "You keep running through my mind", "Nothing else is needed"],
  fulllength: ["AND THE", "CLOSER I", "GET TO YOU"]
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
  return Math.max(70, Math.min(145, Number(lyricFontZoomInput?.value || 100)));
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

function looksLikeYouTubeUrl(value) {
  return /(?:youtube\.com|youtu\.be)/i.test(`${value || ""}`);
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

function setLoadingState(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Loading..." : "Create";
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

  if (lyricFontCount) {
    lyricFontCount.textContent = `Fonts available: ${lyricFontInput.options.length}`;
  }
}

function updateLyricStylePreview() {
  if (
    !lyricStylePreview ||
    !previewLineOne ||
    !previewLineTwo ||
    !previewLineThree ||
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

  [previewLineOne, previewLineTwo, previewLineThree].forEach((line) => {
    line.style.fontFamily = fontFamily;
  });

  previewLineOne.textContent = lines[0];
  previewLineTwo.textContent = lines[1];
  previewLineThree.textContent = lines[2];

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

async function refreshLocalDebugPanel() {
  if (!isLocalDebugMode || !localDebugCard || !localDebugList) {
    return;
  }

  try {
    const response = await fetch(`/api/local-debug/errors?ts=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    renderLocalDebugPanel(Array.isArray(payload.entries) ? payload.entries : []);
  } catch {}
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
  }, 4000);
}

async function reportLocalDebugError(payload = {}) {
  if (!isLocalDebugMode) {
    return;
  }

  try {
    await fetch("/api/local-debug/errors", {
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

  try {
    await fetch("/api/local-debug/errors", {
      method: "DELETE",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
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
    await fetch(`/api/local-debug/errors/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });
  } catch {}

  if (!remainingEntries.length) {
    renderLocalDebugPanel([]);
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
    updatePostRenderBackgroundStatus();
    setStatus(
      videoOutputCard.hidden
        ? `${uploadedBackgrounds.length} custom background image${uploadedBackgrounds.length === 1 ? "" : "s"} ready.`
        : "Background preview updated instantly. Rebuild the final video only if you want the new background in the download."
    );
  } catch (error) {
    uploadedBackgrounds = [];
    renderUploadPreviews();
    updatePostRenderBackgroundStatus();
    setStatus(error.message || "Could not prepare the uploaded images.", true);
  }
}

async function handleBackgroundVideoUpload() {
  const [file] = Array.from(backgroundVideoInput.files || []);
  revokeUploadedBackgroundVideoPreview();
  uploadedBackgroundVideo = null;
  renderBackgroundVideoMeta();
  updatePostRenderBackgroundStatus();

  if (!file) {
    return;
  }

  setStatus("Reading background video details...");

  try {
    uploadedBackgroundVideo = await readVideoFileMetadata(file);
    uploadedBackgroundVideo.previewUrl = URL.createObjectURL(file);
    renderBackgroundVideoMeta();
    updatePostRenderBackgroundStatus();
    setStatus(
      videoOutputCard.hidden
        ? `Background video ready: ${uploadedBackgroundVideo.name}.`
        : "Background video preview updated instantly. Rebuild the final video only if you want the download changed."
    );
  } catch (error) {
    revokeUploadedBackgroundVideoPreview();
    uploadedBackgroundVideo = null;
    renderBackgroundVideoMeta();
    updatePostRenderBackgroundStatus();
    setStatus(error.message || "Could not prepare the background video.", true);
  }
}

function clearCustomBackgroundSelection() {
  uploadedBackgrounds = [];
  revokeUploadedBackgroundVideoPreview();
  uploadedBackgroundVideo = null;
  backgroundImagesInput.value = "";
  backgroundVideoInput.value = "";
  renderUploadPreviews();
  renderBackgroundVideoMeta();
  updatePostRenderBackgroundStatus();
}

function clearRenderPolling() {
  if (renderPollTimer) {
    window.clearTimeout(renderPollTimer);
    renderPollTimer = null;
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
  if (!currentResult?.inputUrl) {
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

  renderButton.disabled = false;
  renderButton.textContent = "Apply Style & Render";
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
  setRenderMessage("Paste a song and the app will build a downloadable lyric video automatically.");
  setRenderProgress(0);
  renderStageTimings({});
  resetRenderedVideo();
}

function primeRenderState() {
  renderSettingsDirty = false;
  renderButton.disabled = false;
  renderButton.textContent = "Create Downloadable Lyric Video";

  if (currentResult?.lines?.length) {
    setRenderMessage("The full lyric video can render from the source song and save as a final .mp4.");
    return;
  }

  setRenderMessage(
    "Lyrics were not found for this track, so the renderer may fall back to title cards if needed."
  );
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

  const text = document.createElement("span");
  text.className = "line-text";
  text.textContent = decorateLyricLine(line.text);

  const time = document.createElement("span");
  time.className = "line-time";
  time.textContent = formatTime(line.start);

  button.append(text, time);
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
  url.searchParams.set("url", videoUrl);
  window.history.replaceState({}, "", url);
}

async function copyShareLink() {
  if (!currentResult?.inputUrl) {
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

function renderResult(result) {
  currentResult = result;
  renderSettingsDirty = false;
  resultPanel.hidden = false;

  trackTitle.textContent = result.title;
  trackArtist.textContent = result.song?.artist
    ? `${result.song.artist} - ${result.channelTitle}`
    : result.channelTitle;
  lyricsSource.textContent = `Source: ${result.lyricsSource.replace(/-/g, " ")}`;
  syncMode.textContent = `Sync: ${result.syncMode.replace(/-/g, " ")}`;

  setPoster(result.poster);
  renderThumbnails(result.thumbnails || []);
  renderWarnings(result.warnings || []);
  renderLyrics(result.lines || []);
  primeRenderState();

  audioPlayer.src = result.audioUrl;
  audioPlayer.load();
  updatePostRenderBackgroundStatus();
  updateArtworkVisibility();

  updateQueryString(result.inputUrl);
  setStatus(`Loaded ${result.title}. Starting the lyric video render with your current style settings.`);
}

function updateRenderJobUi(job) {
  setRenderProgress(job.progress || 0);
  renderStageTimings(job);
  const userMessage = simplifyUiMessage(
    job.userMessage || job.error || job.stage || "",
    "Building your lyric video."
  );

  if (job.status === "queued" || job.status === "running") {
    renderButton.disabled = true;
    renderButton.textContent = job.retrying ? "Fixing..." : "Rendering...";
    if (rerenderBackgroundButton) {
      rerenderBackgroundButton.disabled = true;
      rerenderBackgroundButton.textContent = "Rebuilding...";
    }
    setRenderMessage(userMessage);
    setStatus(userMessage);
    return;
  }

  if (job.status === "completed") {
    activeRenderJobId = "";
    renderButton.disabled = false;
    renderButton.textContent = renderSettingsDirty ? "Apply Style & Render" : "Create Another Render";
    setRenderMessage(userMessage || (job.notes?.[0] ? `Done. ${job.notes[0]}` : "Lyric video ready."));
    setRenderProgress(1);
    videoOutputCard.hidden = false;
    renderedVideo.src = job.videoUrl;
    renderedVideo.load();
    downloadVideoLink.href = job.downloadUrl;
    downloadVideoLink.download = `${currentResult?.videoId || "lyric-video"}.mp4`;
    setPostRenderActionsVisible(true);
    if (rerenderBackgroundButton) {
      rerenderBackgroundButton.disabled = false;
      rerenderBackgroundButton.textContent = "Rebuild final video";
    }
    setStatus(userMessage || "The lyric video is ready to preview and download.");
    refreshLocalDebugPanel().catch(() => {});
    return;
  }

  activeRenderJobId = "";
  renderButton.disabled = false;
  renderButton.textContent = "Try Render Again";
  if (rerenderBackgroundButton) {
    rerenderBackgroundButton.textContent = "Rebuild final video";
    rerenderBackgroundButton.disabled = !Boolean(uploadedBackgroundVideo || uploadedBackgrounds.length);
  }
  setRenderMessage(userMessage, true);
  setStatus(userMessage, true);
  refreshLocalDebugPanel().catch(() => {});
}

async function pollRenderJob(jobId) {
  clearRenderPolling();

  try {
    const response = await fetch(`/api/render/${jobId}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Could not read render progress.");
    }

    updateRenderJobUi(payload);

    if (payload.status === "queued" || payload.status === "running") {
      renderPollTimer = window.setTimeout(() => pollRenderJob(jobId), 2500);
    }
  } catch (error) {
    reportLocalDebugError({
      source: "client-render-poll",
      title: "Render polling failed",
      userMessage: simplifyUiMessage(
        error.message || "Could not monitor render progress.",
        "Could not monitor render progress."
      ),
      errorMessage: error.message || "",
      cause: activeRenderJobId || jobId,
      stack: error.stack || "",
      details: {
        jobId: activeRenderJobId || jobId,
        resultVideoId: currentResult?.videoId || ""
      }
    });
    const message = simplifyUiMessage(
      error.message || "Could not monitor render progress.",
      "Could not monitor render progress."
    );
    const expiredSession = /render job could not be found/i.test(message);

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
  if (!currentResult?.inputUrl) {
    setStatus("Load a YouTube track before rendering a video.", true);
    return;
  }

  clearRenderPolling();
  resetRenderedVideo();
  renderSettingsDirty = false;
  renderButton.disabled = true;
  renderButton.textContent = "Starting...";
  setRenderMessage("Checking the link, verifying lyric timing against the audio, and preparing the download job...");
  setRenderProgress(0.04);
  setStatus("Starting the lyric video render after the sync check passes...");

  try {
    const renderPayload = {
      inputUrl: currentResult.inputUrl,
      videoId: currentResult.videoId,
      title: currentResult.title,
      channelTitle: currentResult.channelTitle,
      durationSeconds: currentResult.durationSeconds,
      lines: currentResult.lines,
      song: currentResult.song,
      syncMode: currentResult.syncMode,
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
      outputFormat: outputFormatInput.value,
      renderMode: renderModeInput.value,
      lyricStyle: lyricStyleInput.value,
      lyricFont: lyricFontInput.value,
      lyricFontZoom: getSelectedLyricZoomValue(),
      useStyleColor: getSelectedStyleColorSettings().enabled,
      styleColor: getSelectedStyleColorSettings().color,
      neonGlow: getSelectedStyleColorSettings().glowPercent,
      ...getClientRenderProfile()
    };
    const formData = new FormData();
    formData.append("renderPayload", JSON.stringify(renderPayload));

    if (uploadedBackgroundVideo?.file) {
      formData.append("backgroundVideo", uploadedBackgroundVideo.file, uploadedBackgroundVideo.name);
    }

    const response = await fetch("/api/render", {
      method: "POST",
      body: formData
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "The lyric video could not be started.");
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
  if (!videoUrl) {
    setStatus("Paste a YouTube link before continuing.", true);
    return;
  }

  setLoadingState(true);
  resetRenderState();
  setStatus("Fetching video details, audio, and lyrics...");

  try {
    const response = await fetch("/api/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: videoUrl })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "The video could not be processed.");
    }

    if (payload.videoId && !uploadedBackgrounds.length && !uploadedBackgroundVideo) {
      try {
        const frameResponse = await fetch(
          `/api/video-frames/${payload.videoId}?duration=${encodeURIComponent(payload.durationSeconds || 0)}`
        );
        const framePayload = await frameResponse.json();

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

    renderResult(payload);
    await handleRender();
  } catch (error) {
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
  setStatus("The page loaded, but audio playback could not start for this video.", true);
  reportLocalDebugError({
    source: "client-audio",
    title: "Audio playback error",
    userMessage: "The page loaded, but audio playback could not start for this video.",
    errorMessage: audioPlayer.error?.message || `HTMLMediaElement error code ${audioPlayer.error?.code || "unknown"}`,
    cause: audioPlayer.currentSrc || currentResult?.audioUrl || "",
    details: {
      mediaErrorCode: audioPlayer.error?.code || null,
      audioSrc: audioPlayer.currentSrc || currentResult?.audioUrl || "",
      videoId: currentResult?.videoId || ""
    }
  });
});
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
    lyricFontZoomInput.value = String(Math.max(70, getSelectedLyricZoomValue() - 5));
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
    lyricFontZoomInput.value = String(Math.min(145, getSelectedLyricZoomValue() + 5));
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
resetRenderState();
renderUploadPreviews();
renderBackgroundVideoMeta();
updatePostRenderBackgroundStatus();
updateLyricFontPreview();
syncLyricZoomUi();
updateStyleSpecificControls();
updateLyricStylePreview();
renderMusicBulletin(0);
scheduleMusicBulletinRotation();
renderLocalDebugPanel([]);

musicBulletinTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const nextIndex = Number(tab.dataset.bulletinIndex || 0);
    renderMusicBulletin(nextIndex);
    scheduleMusicBulletinRotation();
  });
});

if (localDebugRefreshButton) {
  localDebugRefreshButton.addEventListener("click", () => {
    refreshLocalDebugPanel().catch(() => {});
  });
}

if (localDebugClearButton) {
  localDebugClearButton.addEventListener("click", () => {
    clearLocalDebugPanel().catch(() => {});
  });
}

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
});

window.addEventListener("DOMContentLoaded", () => {
  refreshLocalDebugPanel().catch(() => {});
  scheduleLocalDebugRefresh();
  const params = new URLSearchParams(window.location.search);
  const initialUrl = params.get("url");

  if (initialUrl) {
    urlInput.value = initialUrl;
    form.requestSubmit();
  }
});
