const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const fsp = require("fs/promises");

const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const { resolveAudioInput } = require("./audio");
const { buildYtDlpArgs, resolveCookieFilePath } = require("./ytdlp");

const TRANSCRIPTION_TIMEOUT_MS = 8 * 60 * 1000;
const MODEL_NAME = process.env.WHISPER_MODEL || "base";
const PREVIEW_MODEL_NAME = process.env.WHISPER_PREVIEW_MODEL || "tiny";
const TRANSIENT_PROCESS_ERROR_REGEX = /\b(eperm|eacces|ebusy|emfile|enfile)\b/i;
const COMMAND_RETRY_DELAYS_MS = [250, 800];
const TELUGU_CONTENT_HINT_PATTERN = /telugu|mamdi|meena|konala|tollywood|\.te\b/i;

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function toVideoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function hasTeluguContentHint(options = {}) {
  return TELUGU_CONTENT_HINT_PATTERN.test(
    `${options?.title || ""} ${options?.filename || ""} ${options?.videoId || ""}`
  );
}

function resolveWhisperOptions(options = {}) {
  const teluguContentDetected = hasTeluguContentHint(options);
  const task = teluguContentDetected
    ? "transcribe"
    : options.task === "translate"
      ? "translate"
      : "transcribe";
  const language = teluguContentDetected
    ? "te"
    : normalizeWhitespace(options.language || "");

  return {
    task,
    language,
    fasterWhisperLanguage: language && language.toLowerCase() !== "auto" ? language : "",
    openAiWhisperLanguage: language || "auto",
    teluguContentDetected
  };
}

function filterPreVocalNoiseLines(lines = [], options = {}, fallbackDurationSeconds = 0) {
  const audioDuration = Number(options?.durationSeconds || fallbackDurationSeconds || 0);
  const earlyThreshold = audioDuration > 0 ? audioDuration * 0.2 : 0;

  if (!earlyThreshold) {
    return lines;
  }

  return lines.filter((line) => {
    const wordCount = normalizeWhitespace(line?.text || "").split(/\s+/).filter(Boolean).length;

    if (Number(line?.start || 0) < earlyThreshold && wordCount < 3) {
      return false;
    }

    return true;
  });
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
      }, options.timeout || TRANSCRIPTION_TIMEOUT_MS);

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

async function hasPythonModule(moduleName) {
  try {
    await runCommand("python", ["-c", `import ${moduleName}`], {
      timeout: 15000
    });
    return true;
  } catch {
    return false;
  }
}

async function downloadAudio(videoId, outputDirectory) {
  return downloadAudioWithOptions(videoId, outputDirectory, {});
}

async function cleanupIncompleteAudioArtifacts(outputDirectory) {
  const files = await fsp.readdir(outputDirectory).catch(() => []);

  await Promise.all(
    files
      .filter((file) => /\.part$/i.test(file))
      .map(async (file) => {
        try {
          await fsp.unlink(path.join(outputDirectory, file));
        } catch {}
      })
  );
}

async function transcodeAudioSourceToWav(inputSource, outputPath, timeoutMs) {
  await runCommand(
    ffmpegPath,
    [
      "-y",
      "-i",
      inputSource,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      outputPath
    ],
    {
      timeout: timeoutMs
    }
  );

  const stats = await fsp.stat(outputPath);

  if (Number(stats.size || 0) <= 1024) {
    throw new Error("Audio transcoding created an incomplete file.");
  }

  return outputPath;
}

async function findReusableAudioFile(outputDirectory) {
  const files = await fsp.readdir(outputDirectory).catch(() => []);
  const candidates = await Promise.all(
    files
      .filter((file) => /\.(wav|m4a|mp3|webm|ogg|opus|aac)$/i.test(file) && !/\.part$/i.test(file))
      .map(async (file) => {
        const filePath = path.join(outputDirectory, file);
        const stats = await fsp.stat(filePath);
        return {
          filePath,
          size: Number(stats.size || 0),
          modifiedAt: Number(stats.mtimeMs || 0)
        };
      })
  );

  return candidates
    .filter((candidate) => candidate.size > 1024)
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0]?.filePath || "";
}

async function downloadAudioWithOptions(videoId, outputDirectory, options = {}) {
  await fsp.mkdir(outputDirectory, { recursive: true });
  await cleanupIncompleteAudioArtifacts(outputDirectory);

  const existingAudioPath =
    options.audioInputPath &&
    fs.existsSync(options.audioInputPath) &&
    !/\.part$/i.test(options.audioInputPath)
      ? options.audioInputPath
      : await findReusableAudioFile(outputDirectory);

  if (existingAudioPath) {
    return existingAudioPath;
  }

  const minimumDownloadTimeoutMs = options.preview ? 90 * 1000 : 6 * 60 * 1000;
  const effectiveDownloadTimeoutMs = Math.max(Number(options.downloadTimeoutMs || 0), minimumDownloadTimeoutMs);
  const preferKnownAudioBlockRecovery =
    options.preferKnownAudioBlockRecovery === true || Boolean(resolveCookieFilePath());

  try {
    const remoteAudio = await resolveAudioInput(videoId, {
      allowDownloadFallback: false,
      preferKnownBlockRecovery: preferKnownAudioBlockRecovery
    });

    if (remoteAudio?.sourceType === "remote" && remoteAudio.input) {
      const streamedAudioPath = path.join(outputDirectory, "audio-stream.wav");
      return await transcodeAudioSourceToWav(
        remoteAudio.input,
        streamedAudioPath,
        effectiveDownloadTimeoutMs
      );
    }
  } catch {
    // Fall back to downloading a local source below.
  }

  try {
    const resolvedAudio = await resolveAudioInput(videoId, {
      outputDirectory,
      preferLocal: true,
      allowDownloadFallback: true,
      downloadTimeoutMs: effectiveDownloadTimeoutMs,
      preferKnownBlockRecovery: preferKnownAudioBlockRecovery
    });

    if (resolvedAudio?.sourceType === "file" && resolvedAudio.input) {
      return resolvedAudio.input;
    }
  } catch {
    // Fall back to the legacy transcription downloader below.
  }

  const outputTemplate = path.join(outputDirectory, "audio.%(ext)s");
  const ytDlpArgs = buildYtDlpArgs({
    kind: "audio",
    fallbackClients: "android,web,ios"
  });
  await runCommand(
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
      "--postprocessor-args",
      "ffmpeg:-ac 1 -ar 16000",
      "-f",
      "bestaudio[ext=m4a]/bestaudio[acodec!=none]/bestaudio/best[acodec!=none]/best",
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
      "-o",
      outputTemplate,
      toVideoUrl(videoId)
    ],
    {
      timeout: effectiveDownloadTimeoutMs
    }
  );

  const audioFile = await findReusableAudioFile(outputDirectory);

  if (!audioFile) {
    throw new Error("Audio download for transcription did not create a usable file.");
  }

  return audioFile;
}

function parseWhisperJson(filePath, durationSeconds) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const segments = Array.isArray(payload.segments) ? payload.segments : [];
  const duration = Number(durationSeconds || 0);

  const rawLines = segments
    .flatMap((segment) => {
      const start = Math.max(0, Number(segment.start || 0));
      const end = Math.max(start + 0.2, Number(segment.end || start + 2.5));
      const text = normalizeWhitespace(segment.text || "");
      const segmentDuration = duration ? Math.min(end, duration) - start : end - start;

      return splitTranscribedSegment(text, start, segmentDuration, segment.words);
    })
    .filter((line) => line.text && line.duration > 0.1 && (!duration || line.start < duration - 0.1));

  const cleanedLines = removeLikelyHallucinations(rawLines);

  if (!cleanedLines.length) {
    return rawLines;
  }

  if (rawLines.length >= 4 && cleanedLines.length < Math.max(2, Math.round(rawLines.length * 0.35))) {
    return rawLines;
  }

  return cleanedLines;
}

function parseWhisperWords(filePath, durationSeconds) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const segments = Array.isArray(payload.segments) ? payload.segments : [];
  const duration = Number(durationSeconds || 0);
  const words = [];

  segments.forEach((segment) => {
    const segmentStart = Math.max(0, Number(segment.start || 0));
    const segmentEnd = Math.max(segmentStart + 0.2, Number(segment.end || segmentStart + 1));
    const rawWords = Array.isArray(segment.words) ? segment.words : [];

    if (rawWords.length) {
      rawWords.forEach((word) => {
        const text = normalizeWhitespace(word.word || word.text || "");
        const start = Math.max(segmentStart, Number(word.start ?? segmentStart));
        const end = Math.max(start + 0.05, Number(word.end ?? start + 0.2));

        if (!text || (duration && start >= duration - 0.05)) {
          return;
        }

        words.push({
          text,
          start,
          end: duration ? Math.min(end, duration) : end
        });
      });
      return;
    }

    const tokens = normalizeWhitespace(segment.text || "").split(/\s+/).filter(Boolean);

    if (!tokens.length) {
      return;
    }

    const segmentDuration = Math.max(0.2, segmentEnd - segmentStart);
    const wordDuration = segmentDuration / Math.max(tokens.length, 1);

    tokens.forEach((token, index) => {
      const start = segmentStart + wordDuration * index;
      const end = index === tokens.length - 1 ? segmentEnd : start + wordDuration;

      if (duration && start >= duration - 0.05) {
        return;
      }

      words.push({
        text: token,
        start,
        end: duration ? Math.min(end, duration) : end
      });
    });
  });

  return words.filter((word) => word.text && word.end > word.start);
}

function readWhisperMetadata(filePath) {
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      language: normalizeWhitespace(payload?.language || ""),
      task: normalizeWhitespace(payload?.task || "")
    };
  } catch {
    return {
      language: "",
      task: ""
    };
  }
}

function normalizeTranscriptWordEntries(rawWords = [], segmentStart = 0, segmentEnd = 0) {
  return (Array.isArray(rawWords) ? rawWords : [])
    .map((word) => {
      const text = normalizeWhitespace(word?.word || word?.text || "");
      const start = Math.max(Number(segmentStart || 0), Number(word?.start ?? segmentStart));
      const end = Math.max(start + 0.05, Number(word?.end ?? start + 0.2));

      return {
        text,
        start,
        end: Number(segmentEnd || 0) > 0 ? Math.min(end, Number(segmentEnd)) : end
      };
    })
    .filter((word) => word.text && word.end > word.start)
    .sort((left, right) => left.start - right.start);
}

function splitTranscribedSegment(text, start, duration, rawWordEntries = []) {
  if (!text || duration <= 0) {
    return [];
  }

  const minimumLineDuration = 2.5;
  const segmentEnd = start + duration;
  const wordEntries = normalizeTranscriptWordEntries(rawWordEntries, start, segmentEnd);

  if (wordEntries.length) {
    const chunkSize = 7;
    const timedChunks = [];

    for (let index = 0; index < wordEntries.length; index += chunkSize) {
      const slice = wordEntries.slice(index, index + chunkSize);
      const chunkStart = Number(slice[0]?.start ?? start);
      const chunkEnd = Math.max(chunkStart + 0.12, Number(slice.at(-1)?.end ?? chunkStart + 0.4));
      const chunkText = normalizeWhitespace(slice.map((entry) => entry.text).join(" "));

      if (!chunkText) {
        continue;
      }

      timedChunks.push({
        text: chunkText,
        start: chunkStart,
        duration: Math.max(minimumLineDuration, chunkEnd - chunkStart)
      });
    }

    if (timedChunks.length) {
      return timedChunks;
    }
  }

  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= 7 && duration <= 4.8) {
    return [{ text, start, duration: Math.max(minimumLineDuration, duration) }];
  }

  const chunks = [];
  const phraseParts = text
    .split(/(?<=[,.;:!?])\s+/)
    .map((part) => normalizeWhitespace(part.replace(/[,.;:!?]+$/g, "")))
    .filter(Boolean);

  if (phraseParts.length > 1) {
    for (const part of phraseParts) {
      const partWords = part.split(/\s+/).filter(Boolean);
      chunks.push(...chunkWords(partWords, 7));
    }
  } else {
    chunks.push(...chunkWords(words, 7));
  }

  const totalWords = chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0) || 1;
  let cursor = start;

  return chunks.map((chunk, index) => {
    const isLast = index === chunks.length - 1;
    const chunkDuration = isLast
      ? Math.max(minimumLineDuration, start + duration - cursor)
      : Math.max(minimumLineDuration, (duration * chunk.wordCount) / totalWords);
    const line = {
      text: chunk.text,
      start: cursor,
      duration: chunkDuration
    };
    cursor += chunkDuration;
    return line;
  });
}

function chunkWords(words, size) {
  const chunks = [];

  for (let index = 0; index < words.length; index += size) {
    const slice = words.slice(index, index + size);
    chunks.push({
      text: slice.join(" "),
      wordCount: slice.length
    });
  }

  return chunks;
}

function removeLikelyHallucinations(lines) {
  const earlyLines = lines.filter((line) => line.start < 10);
  const earlyCounts = new Map();

  for (const line of earlyLines) {
    const key = normalizeTranscriptKey(line.text);
    earlyCounts.set(key, (earlyCounts.get(key) || 0) + 1);
  }

  const repeatedEarlyCount = Math.max(0, ...earlyCounts.values());
  const sourceLines =
    earlyLines.length >= 4 && repeatedEarlyCount >= 3
      ? lines.filter((line) => line.start >= 10)
      : lines;
  const cleaned = [];

  for (let index = 0; index < sourceLines.length; index += 1) {
    const line = sourceLines[index];
    const normalized = normalizeTranscriptKey(line.text);

    if (!normalized || isLikelyTranscriptGarbage(line.text)) {
      continue;
    }

    const previous = cleaned.at(-1);
    const previousNormalized = previous ? normalizeTranscriptKey(previous.text) : "";

    if (
      previous &&
      normalized &&
      normalized === previousNormalized &&
      Math.abs(Number(line.start || 0) - Number(previous.start || 0)) <= 6
    ) {
      continue;
    }

    const normalizedWordCount = normalized.split(/\s+/).filter(Boolean).length;
    const recentShortRepeatCount = cleaned
      .slice(Math.max(0, cleaned.length - 4))
      .filter(
        (previousLine) =>
          normalizeTranscriptKey(previousLine.text) === normalized &&
          Math.abs(Number(line.start || 0) - Number(previousLine.start || 0)) <= 18
      ).length;

    if (recentShortRepeatCount >= 1 && normalizedWordCount <= 2) {
      continue;
    }

    cleaned.push(line);
  }

  const firstMeaningfulIndex = cleaned.findIndex((line, index) => {
    const normalized = normalizeTranscriptKey(line.text);
    const nextMatches = cleaned
      .slice(index + 1, index + 4)
      .filter(
        (nextLine) =>
          nextLine.start < 12 &&
          normalizeTranscriptKey(nextLine.text) === normalized
      ).length;

    return !(line.start < 12 && nextMatches >= 1);
  });

  return firstMeaningfulIndex > 0 ? cleaned.slice(firstMeaningfulIndex) : cleaned;
}

function normalizeTranscriptKey(text) {
  return `${text || ""}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();
}

function isLikelyTranscriptGarbage(text) {
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return true;
  }

  const letters = normalized.match(/\p{L}/gu) || [];
  const digits = normalized.match(/\p{N}/gu) || [];
  const words = normalized
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const normalizedWords = words.map((word) =>
    word
      .toLowerCase()
      .replace(/[^\p{L}\p{N}']+/gu, "")
      .trim()
  );
  const uniqueWordCount = new Set(normalizedWords.filter(Boolean)).size;
  const compactLength = normalized.replace(/\s+/g, "").length;
  const letterDensity = letters.length / Math.max(1, compactLength);
  const meaningfulWordCount = normalizedWords.filter(Boolean).length;
  const shortWordCount = normalizedWords.filter((word) => word && word.length <= 2).length;

  if (!letters.length && digits.length) {
    return true;
  }

  if (/^(?:[\p{N}]+[^\p{L}]*)+$/u.test(normalized)) {
    return true;
  }

  if (digits.length >= 3 && digits.length > letters.length) {
    return true;
  }

  if (meaningfulWordCount <= 3 && digits.length >= 1 && letters.length <= 2) {
    return true;
  }

  if (meaningfulWordCount > 0 && shortWordCount === meaningfulWordCount && digits.length >= 1) {
    return true;
  }

  if (digits.length >= 1 && letterDensity < 0.42) {
    return true;
  }

  if (words.length >= 3 && uniqueWordCount <= 1) {
    return true;
  }

  return false;
}

async function transcribeWithFasterWhisper(audioPath, outputPath, options = {}) {
  const { task, fasterWhisperLanguage } = resolveWhisperOptions(options);
  const modelName = normalizeWhitespace(options.modelName || MODEL_NAME) || MODEL_NAME;
  const beamSize = Math.max(1, Number(options.beamSize || (options.preview ? 1 : 5)) || 1);
  const conditionOnPreviousText = options.conditionOnPreviousText !== false;
  const vadFilter =
    typeof options.vadFilter === "boolean" ? options.vadFilter : !options.preview;
  const script = `
import json
import sys
from faster_whisper import WhisperModel

audio_path = sys.argv[1]
output_path = sys.argv[2]
model_name = sys.argv[3]
task_name = sys.argv[4]
language_name = sys.argv[5] or None
beam_size = int(sys.argv[6])
condition_on_previous_text = sys.argv[7] == "1"
vad_filter = sys.argv[8] == "1"

model = WhisperModel(model_name, device="cpu", compute_type="int8")
segments, info = model.transcribe(
    audio_path,
    beam_size=beam_size,
    vad_filter=vad_filter,
    task=task_name,
    language=language_name,
    word_timestamps=True,
    condition_on_previous_text=condition_on_previous_text
)
payload = {
    "language": info.language,
    "task": task_name,
    "segments": [
        {
            "start": float(segment.start),
            "end": float(segment.end),
            "text": segment.text.strip(),
            "words": [
                {
                    "word": word.word.strip(),
                    "start": float(word.start),
                    "end": float(word.end)
                }
                for word in (segment.words or [])
                if getattr(word, "word", "").strip()
            ]
        }
        for segment in segments
    ]
}

with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, ensure_ascii=False)
`;

  await runCommand(
    "python",
    [
      "-c",
      script,
      audioPath,
      outputPath,
      modelName,
      task,
      fasterWhisperLanguage,
      String(beamSize),
      conditionOnPreviousText ? "1" : "0",
      vadFilter ? "1" : "0"
    ],
    {
      timeout: Number(options.timeoutMs || TRANSCRIPTION_TIMEOUT_MS)
    }
  );
}

async function transcribeWithOpenAiWhisper(audioPath, outputDirectory, options = {}) {
  const { task, openAiWhisperLanguage } = resolveWhisperOptions(options);
  const modelName = normalizeWhitespace(options.modelName || MODEL_NAME) || MODEL_NAME;
  const beamSize = Math.max(1, Number(options.beamSize || (options.preview ? 1 : 5)) || 1);
  const args = [
    "-m",
    "whisper",
    audioPath,
    "--model",
    modelName,
    "--task",
    task,
    "--beam_size",
    String(beamSize),
    "--word_timestamps",
    "True",
    "--output_format",
    "json",
    "--output_dir",
    outputDirectory
  ];

  args.push("--language", openAiWhisperLanguage);

  await runCommand(
    "python",
    args,
    {
      timeout: Number(options.timeoutMs || TRANSCRIPTION_TIMEOUT_MS)
    }
  );

  const baseName = path.basename(audioPath, path.extname(audioPath));
  return path.join(outputDirectory, `${baseName}.json`);
}

async function transcribeYouTubeAudio(videoId, renderDirectory, durationSeconds, options = {}) {
  const outputDirectory = path.join(renderDirectory, "transcription");
  const normalizedOptions = {
    ...options
  };

  if (normalizedOptions.preview && !normalizedOptions.modelName) {
    normalizedOptions.modelName = PREVIEW_MODEL_NAME;
  }

  const resolvedWhisperOptions = resolveWhisperOptions(normalizedOptions);
  normalizedOptions.task = resolvedWhisperOptions.task;
  if (resolvedWhisperOptions.language) {
    normalizedOptions.language = resolvedWhisperOptions.language;
  }

  const audioPath = await downloadAudioWithOptions(videoId, outputDirectory, normalizedOptions);
  const audioDurationSeconds = await probeAudioDurationSeconds(audioPath);
  const transcriptionMode = resolvedWhisperOptions.task;
  const outputPath = path.join(outputDirectory, `${transcriptionMode}-transcript.json`);
  const effectiveDurationSeconds = audioDurationSeconds || durationSeconds;

  if (await hasPythonModule("faster_whisper")) {
    await transcribeWithFasterWhisper(audioPath, outputPath, normalizedOptions);
    const lines = filterPreVocalNoiseLines(
      parseWhisperJson(outputPath, effectiveDurationSeconds),
      {
        ...normalizedOptions,
        durationSeconds: effectiveDurationSeconds
      },
      effectiveDurationSeconds
    );
    const words = parseWhisperWords(outputPath, effectiveDurationSeconds);
    const metadata = readWhisperMetadata(outputPath);
    return {
      source: transcriptionMode === "translate" ? "audio-translation" : "audio-transcription",
      syncMode: "transcribed",
      task: transcriptionMode,
      language: metadata.language,
      audioDurationSeconds,
      audioPath,
      lines,
      words
    };
  }

  if (await hasPythonModule("whisper")) {
    const whisperJsonPath = await transcribeWithOpenAiWhisper(audioPath, outputDirectory, normalizedOptions);
    const lines = filterPreVocalNoiseLines(
      parseWhisperJson(whisperJsonPath, effectiveDurationSeconds),
      {
        ...normalizedOptions,
        durationSeconds: effectiveDurationSeconds
      },
      effectiveDurationSeconds
    );
    const words = parseWhisperWords(whisperJsonPath, effectiveDurationSeconds);
    const metadata = readWhisperMetadata(whisperJsonPath);
    return {
      source: transcriptionMode === "translate" ? "audio-translation" : "audio-transcription",
      syncMode: "transcribed",
      task: transcriptionMode,
      language: metadata.language,
      audioDurationSeconds,
      audioPath,
      lines,
      words
    };
  }

  throw new Error("Whisper transcription is not installed. Install faster-whisper or openai-whisper to transcribe videos with no lyrics.");
}

async function probeAudioDurationSeconds(audioPath) {
  try {
    const { stdout } = await runCommand(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
        audioPath
      ],
      {
        timeout: 30000
      }
    );
    const duration = Number(`${stdout || ""}`.trim());
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  } catch {
    return 0;
  }
}

module.exports = {
  transcribeYouTubeAudio
};
