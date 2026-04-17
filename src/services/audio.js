const fs = require("fs");
const path = require("path");
const fsp = require("fs/promises");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ffmpegPath = require("ffmpeg-static");
const { previewAudioCacheRoot } = require("../config/runtime");
const { buildYtDlpArgs } = require("./ytdlp");

let ytdl = null;

try {
  ytdl = require("@distube/ytdl-core");
} catch {
  ytdl = null;
}

const execFileAsync = promisify(execFile);
const TRANSIENT_PROCESS_ERROR_REGEX = /\b(eperm|eacces|ebusy|emfile|enfile)\b/i;
const COMMAND_RETRY_DELAYS_MS = [250, 800];
const STREAM_URL_TTL_MS = 10 * 60 * 1000;
const STREAM_RESOLVE_TIMEOUT_MS = 30000;
const DOWNLOADED_AUDIO_TTL_MS = 12 * 60 * 60 * 1000;
const AUDIO_DOWNLOAD_TIMEOUT_MS = 6 * 60 * 1000;
const YTDL_CORE_TIMEOUT_MS = 30000;
const AUDIO_CACHE_ROOT = previewAudioCacheRoot;
const ALLOW_BROWSER_COOKIES = process.env.ALLOW_BROWSER_COOKIES === "true";
const streamUrlCache = new Map();
const inFlightStreamRequests = new Map();
const downloadedAudioCache = new Map();
const inFlightAudioDownloads = new Map();

const STREAM_ATTEMPTS = {
  audio: [
    {
      formatSelector: "bestaudio[ext=m4a]/bestaudio[acodec!=none]/bestaudio/best[acodec!=none]/best",
      fallbackClients: "android,web,ios"
    },
    {
      formatSelector: "bestaudio[acodec!=none]/bestaudio/best",
      fallbackClients: "android,web"
    },
    {
      formatSelector: "best[acodec!=none]/best",
      fallbackClients: "web,mweb,tv,tv_simply"
    }
  ],
  video: [
    {
      formatSelector: "bestvideo[ext=mp4][height<=1080]/best[ext=mp4][height<=1080]/bestvideo[height<=1080]/best[height<=1080]/best",
      fallbackClients: "android,web,ios"
    },
    {
      formatSelector: "best[ext=mp4][height<=1080]/best[height<=1080]/best",
      fallbackClients: "android,web,mweb"
    }
  ]
};
const AUDIO_DOWNLOAD_ATTEMPTS = [
  {
    formatSelector: "bestaudio[ext=m4a]/bestaudio[acodec!=none]/bestaudio/best[acodec!=none]/best",
    fallbackClients: "android,web,ios"
  },
  {
    formatSelector: "bestaudio[acodec!=none]/bestaudio/best",
    fallbackClients: "android,web,mweb"
  },
  {
    formatSelector: "bestaudio[acodec!=none]/bestaudio/best",
    fallbackClients: "web,mweb,tv,tv_simply",
    extraArgs: []
  }
];

if (ALLOW_BROWSER_COOKIES) {
  AUDIO_DOWNLOAD_ATTEMPTS.splice(
    2,
    0,
    {
      formatSelector: "bestaudio[acodec!=none]/bestaudio/best",
      extraArgs: ["--cookies-from-browser", "chrome"]
    },
    {
      formatSelector: "bestaudio[acodec!=none]/bestaudio/best",
      extraArgs: ["--cookies-from-browser", "edge"]
    }
  );
}

function createAudioError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isYouTubeBotBlockError(error) {
  const message = `${error?.message || error || ""}`;
  return /sign in to confirm you(?:'|’)re not a bot|confirm you(?:'|’)re not a bot|cookies-from-browser|exporting-youtube-cookies/i.test(
    message
  );
}

function createYouTubeBotBlockAudioError(error) {
  const wrappedError = createAudioError(
    "YouTube temporarily blocked audio access for this video. Try another link or try again later.",
    503
  );
  wrappedError.code = "YOUTUBE_BOT_BLOCK";
  wrappedError.cause = error;
  return wrappedError;
}

function toVideoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function getCacheKey(kind, videoId) {
  return `${kind}:${videoId}`;
}

function getDownloadedAudioCacheKey(videoId, outputDirectory) {
  return `${videoId}:${path.resolve(outputDirectory || AUDIO_CACHE_ROOT)}`;
}

function getCachedStreamUrl(kind, videoId) {
  const cached = streamUrlCache.get(getCacheKey(kind, videoId));

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    streamUrlCache.delete(getCacheKey(kind, videoId));
    return null;
  }

  return cached.url;
}

function clearCachedStreamUrl(kind, videoId) {
  streamUrlCache.delete(getCacheKey(kind, videoId));
}

function toSafeBaseName(videoId = "") {
  return `${videoId || "audio"}`
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "audio";
}

async function ensureDirectory(directoryPath) {
  await fsp.mkdir(directoryPath, { recursive: true });
}

async function execFileWithRetry(command, args, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || COMMAND_RETRY_DELAYS_MS.length + 1));
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    try {
      return await execFileAsync(command, args, options);
    } catch (error) {
      lastError = error;
      attempt += 1;
      const message = `${error?.message || error || ""}`;
      const code = `${error?.code || ""}`;
      const shouldRetry =
        TRANSIENT_PROCESS_ERROR_REGEX.test(message) || TRANSIENT_PROCESS_ERROR_REGEX.test(code);

      if (attempt >= maxAttempts || !shouldRetry) {
        throw error;
      }

      const delayMs = COMMAND_RETRY_DELAYS_MS[Math.min(attempt - 1, COMMAND_RETRY_DELAYS_MS.length - 1)] || 900;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error(`${command} failed.`);
}

async function withTimeout(factory, timeoutMs, timeoutLabel) {
  let timer = null;

  try {
    return await Promise.race([
      factory(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${timeoutLabel} timed out.`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function getAudioMimeType(filePath = "") {
  const extension = path.extname(filePath || "").toLowerCase();

  switch (extension) {
    case ".m4a":
    case ".mp4":
      return "audio/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
    case ".opus":
      return "audio/ogg";
    case ".webm":
      return "audio/webm";
    case ".aac":
      return "audio/aac";
    default:
      return "application/octet-stream";
  }
}

async function findDownloadedAudioFile(videoId, outputDirectory) {
  await ensureDirectory(outputDirectory);

  const cacheKey = getDownloadedAudioCacheKey(videoId, outputDirectory);
  const cachedEntry = downloadedAudioCache.get(cacheKey);

  if (cachedEntry && cachedEntry.expiresAt > Date.now() && fs.existsSync(cachedEntry.filePath)) {
    try {
      const stats = await fsp.stat(cachedEntry.filePath);

      if (Number(stats.size || 0) > 1024) {
        return cachedEntry.filePath;
      }
    } catch {
      downloadedAudioCache.delete(cacheKey);
    }
  }

  const baseName = toSafeBaseName(videoId);
  const files = await fsp.readdir(outputDirectory);
  const matchingEntries = await Promise.all(
    files
      .filter((fileName) => fileName.startsWith(`${baseName}.`))
      .map(async (fileName) => {
        const filePath = path.join(outputDirectory, fileName);
        const stats = await fsp.stat(filePath);
        return {
          filePath,
          modifiedAt: Number(stats.mtimeMs || 0),
          size: Number(stats.size || 0)
        };
      })
  );
  const validEntry = matchingEntries
    .filter(
      (entry) =>
        !/\.part$/i.test(entry.filePath) &&
        entry.size > 1024 &&
        entry.modifiedAt > Date.now() - DOWNLOADED_AUDIO_TTL_MS
    )
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0];

  if (!validEntry) {
    return null;
  }

  downloadedAudioCache.set(cacheKey, {
    expiresAt: Date.now() + DOWNLOADED_AUDIO_TTL_MS,
    filePath: validEntry.filePath
  });

  return validEntry.filePath;
}

async function transcodeRemoteAudioUrlToFile(audioUrl, outputDirectory, videoId, timeoutMs) {
  const outputPath = path.join(outputDirectory, `${toSafeBaseName(videoId)}.wav`);

  await execFileWithRetry(
    ffmpegPath,
    [
      "-y",
      "-i",
      audioUrl,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "44100",
      "-ac",
      "2",
      outputPath
    ],
    {
      maxBuffer: 1024 * 1024 * 4,
      timeout: Number(timeoutMs || AUDIO_DOWNLOAD_TIMEOUT_MS)
    }
  );

  return outputPath;
}

async function resolveStreamUrlWithYtdlCore(videoId, kind = "audio") {
  if (!ytdl?.getInfo) {
    return "";
  }

  const info = await withTimeout(
    () => ytdl.getInfo(toVideoUrl(videoId)),
    YTDL_CORE_TIMEOUT_MS,
    "ytdl-core info lookup"
  );
  const formats = Array.isArray(info?.formats) ? info.formats : [];

  if (!formats.length) {
    return "";
  }

  if (kind === "audio") {
    const audioFormats = formats
      .filter((format) => format?.url && format.hasAudio && !format.hasVideo)
      .sort((left, right) => {
        const leftBitrate = Number(left.audioBitrate || left.bitrate || 0);
        const rightBitrate = Number(right.audioBitrate || right.bitrate || 0);
        return rightBitrate - leftBitrate;
      });

    if (audioFormats.length) {
      return `${audioFormats[0].url || ""}`.trim();
    }

    try {
      const chosen = ytdl.chooseFormat(formats, {
        quality: "highestaudio",
        filter: "audioonly"
      });

      return `${chosen?.url || ""}`.trim();
    } catch {
      return "";
    }
  }

  return "";
}

async function downloadAudioFile(videoId, outputDirectory, options = {}) {
  const cacheKey = getDownloadedAudioCacheKey(videoId, outputDirectory);
  const cachedFilePath = await findDownloadedAudioFile(videoId, outputDirectory);

  if (cachedFilePath) {
    return cachedFilePath;
  }

  const activeRequest = inFlightAudioDownloads.get(cacheKey);

  if (activeRequest) {
    return activeRequest;
  }

  const requestPromise = (async () => {
    await ensureDirectory(outputDirectory);
    const baseName = toSafeBaseName(videoId);
    const outputTemplate = path.join(outputDirectory, `${baseName}.%(ext)s`);
    let lastError = null;

    for (const attempt of AUDIO_DOWNLOAD_ATTEMPTS) {
      try {
        const ytDlpArgs = buildYtDlpArgs({
          kind: "audio",
          fallbackClients: attempt.fallbackClients || ""
        });
        await execFileWithRetry(
          "python",
          [
            "-m",
            "yt_dlp",
            ...ytDlpArgs,
            "--no-playlist",
            "--no-warnings",
            "--extract-audio",
            "--audio-format",
            "wav",
            "--audio-quality",
            "5",
            "--ffmpeg-location",
            path.dirname(ffmpegPath),
            "--extractor-retries",
            "2",
            "--retries",
            "2",
            "--fragment-retries",
            "2",
            "--socket-timeout",
            "20",
            "--no-part",
            "--force-overwrites",
            "-f",
            attempt.formatSelector,
            ...(attempt.extraArgs || []),
            "-o",
            outputTemplate,
            toVideoUrl(videoId)
          ],
          {
            maxBuffer: 1024 * 1024 * 4,
            timeout: Number(options.downloadTimeoutMs || AUDIO_DOWNLOAD_TIMEOUT_MS)
          }
        );

        const downloadedFilePath = await findDownloadedAudioFile(videoId, outputDirectory);

        if (downloadedFilePath) {
          downloadedAudioCache.set(cacheKey, {
            expiresAt: Date.now() + DOWNLOADED_AUDIO_TTL_MS,
            filePath: downloadedFilePath
          });
          return downloadedFilePath;
        }
      } catch (error) {
        lastError = error;
      }
    }

    try {
      const fallbackStreamUrl = await resolveStreamUrlWithYtdlCore(videoId, "audio");

      if (fallbackStreamUrl) {
        const transcodedPath = await transcodeRemoteAudioUrlToFile(
          fallbackStreamUrl,
          outputDirectory,
          videoId,
          Number(options.downloadTimeoutMs || AUDIO_DOWNLOAD_TIMEOUT_MS)
        );
        const downloadedFilePath = await findDownloadedAudioFile(videoId, outputDirectory);

        if (downloadedFilePath || transcodedPath) {
          const usableFilePath = downloadedFilePath || transcodedPath;
          downloadedAudioCache.set(cacheKey, {
            expiresAt: Date.now() + DOWNLOADED_AUDIO_TTL_MS,
            filePath: usableFilePath
          });
          return usableFilePath;
        }
      }
    } catch (error) {
      lastError = error;
    }

    if (isYouTubeBotBlockError(lastError)) {
      throw createYouTubeBotBlockAudioError(lastError);
    }

    throw lastError || createAudioError("Could not download a playable audio track for that YouTube video.", 502);
  })();

  inFlightAudioDownloads.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightAudioDownloads.delete(cacheKey);
  }
}

async function resolveStreamUrl(videoId, formatSelector, kind) {
  const cachedUrl = getCachedStreamUrl(kind, videoId);

  if (cachedUrl) {
    return cachedUrl;
  }

  const cacheKey = getCacheKey(kind, videoId);
  const activeRequest = inFlightStreamRequests.get(cacheKey);

  if (activeRequest) {
    return activeRequest;
  }

  const attempts = STREAM_ATTEMPTS[kind] || [{ formatSelector, extraArgs: [] }];
  const requestPromise = (async () => {
    let lastError = null;

    for (const attempt of attempts) {
      try {
        const ytDlpArgs = buildYtDlpArgs({
          kind,
          fallbackClients: attempt.fallbackClients || ""
        });
        const { stdout } = await execFileWithRetry(
          "python",
          [
            "-m",
            "yt_dlp",
            ...ytDlpArgs,
            "--no-playlist",
            "--no-warnings",
            "--extractor-retries",
            "2",
            "--socket-timeout",
            "15",
            "--get-url",
            "-f",
            attempt.formatSelector || formatSelector,
            toVideoUrl(videoId)
          ],
          {
            maxBuffer: 1024 * 1024 * 4,
            timeout: STREAM_RESOLVE_TIMEOUT_MS
          }
        );

        const streamUrl = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find(Boolean);

        if (!streamUrl) {
          continue;
        }

        streamUrlCache.set(cacheKey, {
          expiresAt: Date.now() + STREAM_URL_TTL_MS,
          url: streamUrl
        });

        return streamUrl;
      } catch (error) {
        lastError = error;
        // Try the next format/client combination.
      }
    }

    try {
      const ytdlCoreUrl = await resolveStreamUrlWithYtdlCore(videoId, kind);

      if (ytdlCoreUrl) {
        streamUrlCache.set(cacheKey, {
          expiresAt: Date.now() + STREAM_URL_TTL_MS,
          url: ytdlCoreUrl
        });
        return ytdlCoreUrl;
      }
    } catch (error) {
      lastError = error;

      if (isYouTubeBotBlockError(error)) {
        throw createYouTubeBotBlockAudioError(error);
      }
    }

    if (isYouTubeBotBlockError(lastError)) {
      throw createYouTubeBotBlockAudioError(lastError);
    }

    throw createAudioError(`Could not create a playable ${kind} stream for that YouTube video.`, 502);
  })();

  inFlightStreamRequests.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightStreamRequests.delete(cacheKey);
  }
}

async function resolveAudioUrl(videoId) {
  return resolveStreamUrl(
    videoId,
    "bestaudio[ext=m4a]/bestaudio[acodec!=none]/bestaudio/best[acodec!=none]/best",
    "audio"
  );
}

async function resolveAudioInput(videoId, options = {}) {
  const allowDownloadFallback = options.allowDownloadFallback !== false;
  const preferLocal = options.preferLocal === true;
  const outputDirectory = options.outputDirectory || AUDIO_CACHE_ROOT;
  let streamError = null;

  if (!preferLocal) {
    try {
      const audioUrl = await resolveAudioUrl(videoId);
      return {
        input: audioUrl,
        sourceType: "remote",
        mimeType: "audio/mp4",
        recovered: false
      };
    } catch (error) {
      streamError = error;
      clearCachedStreamUrl("audio", videoId);
    }
  }

  if (!allowDownloadFallback) {
    if (isYouTubeBotBlockError(streamError)) {
      throw createYouTubeBotBlockAudioError(streamError);
    }

    throw streamError || createAudioError("Could not resolve a usable audio source for that YouTube video.", 502);
  }

  const filePath = await downloadAudioFile(videoId, outputDirectory, options);

  return {
    input: filePath,
    sourceType: "file",
    mimeType: getAudioMimeType(filePath),
    recovered: true,
    streamError: streamError ? String(streamError.message || streamError) : ""
  };
}

async function resolveVideoUrl(videoId) {
  return resolveStreamUrl(
    videoId,
    "bestvideo[ext=mp4][height<=1080]/best[ext=mp4][height<=1080]/bestvideo[height<=1080]/best[height<=1080]/best",
    "video"
  );
}

module.exports = {
  getAudioMimeType,
  isYouTubeBotBlockError,
  resolveAudioInput,
  resolveAudioUrl,
  resolveVideoUrl
};
