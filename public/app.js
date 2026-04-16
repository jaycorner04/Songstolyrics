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
const lyricFontPreview = document.getElementById("lyric-font-preview");
const lyricFontPreviewName = document.getElementById("lyric-font-preview-name");
const lyricFontPreviewSample = document.getElementById("lyric-font-preview-sample");
const lyricFontCount = document.getElementById("lyric-font-count");
const uploadPreviewStrip = document.getElementById("upload-preview-strip");
const changeUploadedImagesButton = document.getElementById("change-uploaded-images-button");
const deleteUploadedImagesButton = document.getElementById("delete-uploaded-images-button");
const shareButton = document.getElementById("share-button");
const renderButton = document.getElementById("render-button");
const renderText = document.getElementById("render-text");
const renderProgressBar = document.getElementById("render-progress-bar");
const renderProgressPercent = document.getElementById("render-progress-percent");
const audioPlayer = document.getElementById("audio-player");
const resultPanel = document.getElementById("result-panel");
const statusText = document.getElementById("status-text");
const posterImage = document.getElementById("poster-image");
const trackTitle = document.getElementById("track-title");
const trackArtist = document.getElementById("track-artist");
const lyricsSource = document.getElementById("lyrics-source");
const syncMode = document.getElementById("sync-mode");
const warningsContainer = document.getElementById("warnings");
const thumbnailStrip = document.getElementById("thumbnail-strip");
const thumbnailCard = document.querySelector(".thumbnail-card");
const lyricsList = document.getElementById("lyrics-list");
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
let uploadedBackgrounds = [];
let uploadedBackgroundVideo = null;
const lyricFontPreviewText = "Aa Bb Cc 123 Love burns bright tonight";
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
  if (!lyricFontInput || !lyricFontPreview || !lyricFontPreviewName || !lyricFontPreviewSample) {
    return;
  }

  const selectedOption = lyricFontInput.options[lyricFontInput.selectedIndex];
  const selectedValue = lyricFontInput.value || "arial";
  const fontFamily =
    selectedOption?.dataset.fontFamily ||
    lyricFontFamilies[selectedValue] ||
    lyricFontFamilies.arial;
  const label = selectedOption?.textContent?.trim() || "Arial";

  lyricFontInput.style.fontFamily = fontFamily;
  lyricFontPreviewName.textContent = label;
  lyricFontPreviewSample.textContent = lyricFontPreviewText;
  lyricFontPreviewSample.style.fontFamily = fontFamily;
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

function setRenderProgress(progress) {
  const safeProgress = Math.max(0, Math.min(1, Number(progress || 0)));
  const percentage = Math.round(safeProgress * 100);
  renderProgressBar.style.width = `${percentage}%`;
  renderProgressPercent.textContent = `${percentage}%`;
}

function setRenderMessage(message, isError = false) {
  renderText.textContent = message;
  renderText.classList.toggle("is-error", Boolean(isError));
}

function resetRenderState() {
  clearRenderPolling();
  activeRenderJobId = "";
  renderButton.disabled = true;
  renderButton.textContent = "Create Downloadable Lyric Video";
  setRenderMessage("Paste a song and the app will build a downloadable lyric video automatically.");
  setRenderProgress(0);
  resetRenderedVideo();
}

function primeRenderState() {
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
  setStatus(`Loaded ${result.title}. Starting the lyric video render now.`);
}

function updateRenderJobUi(job) {
  setRenderProgress(job.progress || 0);
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
    renderButton.disabled = false;
    renderButton.textContent = "Create Another Render";
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
    return;
  }

  renderButton.disabled = false;
  renderButton.textContent = "Try Render Again";
  if (rerenderBackgroundButton) {
    rerenderBackgroundButton.textContent = "Rebuild final video";
    rerenderBackgroundButton.disabled = !Boolean(uploadedBackgroundVideo || uploadedBackgrounds.length);
  }
  setRenderMessage(userMessage, true);
  setStatus(userMessage, true);
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
      lyricFont: lyricFontInput.value
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
});
form.addEventListener("submit", handleSubmit);
shareButton.addEventListener("click", copyShareLink);
renderButton.addEventListener("click", handleRender);
lyricStyleInput.addEventListener("change", updateLyricFontPreview);
lyricFontInput.addEventListener("change", updateLyricFontPreview);
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

window.addEventListener("beforeunload", () => {
  revokeUploadedBackgroundVideoPreview();
});

window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const initialUrl = params.get("url");

  if (initialUrl) {
    urlInput.value = initialUrl;
    form.requestSubmit();
  }
});
