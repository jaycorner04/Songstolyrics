const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const fsp = require("fs/promises");

const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const { resolveAudioInput } = require("./audio");
const { buildYtDlpArgs } = require("./ytdlp");

const TRANSCRIPTION_TIMEOUT_MS = 8 * 60 * 1000;
const MODEL_NAME = process.env.WHISPER_MODEL || "base";
const PREVIEW_MODEL_NAME = process.env.WHISPER_PREVIEW_MODEL || "tiny";
const TRANSIENT_PROCESS_ERROR_REGEX = /\b(eperm|eacces|ebusy|emfile|enfile)\b/i;
const COMMAND_RETRY_DELAYS_MS = [250, 800];

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
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

  try {
    const remoteAudio = await resolveAudioInput(videoId, {
      allowDownloadFallback: false,
      preferKnownBlockRecovery: options.preferKnownAudioBlockRecovery === true
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
      preferKnownBlockRecovery: options.preferKnownAudioBlockRecovery === true
    });

    if (resolvedAudio?.sourceType === "file" && resolvedAudio.input) {
      return resolvedAudio.input;
    }
  } catch {
    // Fall back to the legacy transcription downloader below.
  }

  if (options.preferKnownAudioBlockRecovery === true) {
    throw new Error(
      "Known YouTube audio block recovery was already attempted for this source, and no stable transcription audio could be prepared."
    );
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
        duration: Math.max(0.4, chunkEnd - chunkStart)
      });
    }

    if (timedChunks.length) {
      return timedChunks;
    }
  }

  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= 7 && duration <= 4.8) {
    return [{ text, start, duration }];
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
      ? Math.max(0.8, start + duration - cursor)
      : Math.max(1.1, (duration * chunk.wordCount) / totalWords);
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
    const previous = cleaned.at(-1);
    const previousNormalized = previous ? normalizeTranscriptKey(previous.text) : "";

    if (
      previous &&
      normalized &&
      normalized === previousNormalized &&
      line.start < 12 &&
      previous.start < 12
    ) {
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
  return `${text || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function transcribeWithFasterWhisper(audioPath, outputPath, options = {}) {
  const task = options.task === "translate" ? "translate" : "transcribe";
  const language = normalizeWhitespace(options.language || "");
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
      language,
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
  const task = options.task === "translate" ? "translate" : "transcribe";
  const language = normalizeWhitespace(options.language || "");
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

  if (language) {
    args.push("--language", language);
  }

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

  const audioPath = await downloadAudioWithOptions(videoId, outputDirectory, normalizedOptions);
  const audioDurationSeconds = await probeAudioDurationSeconds(audioPath);
  const transcriptionMode = normalizedOptions.task === "translate" ? "translate" : "transcribe";
  const outputPath = path.join(outputDirectory, `${transcriptionMode}-transcript.json`);
  const effectiveDurationSeconds = audioDurationSeconds || durationSeconds;

  if (await hasPythonModule("faster_whisper")) {
    await transcribeWithFasterWhisper(audioPath, outputPath, normalizedOptions);
    const lines = parseWhisperJson(outputPath, effectiveDurationSeconds);
    const words = parseWhisperWords(outputPath, effectiveDurationSeconds);
    return {
      source: transcriptionMode === "translate" ? "audio-translation" : "audio-transcription",
      syncMode: "transcribed",
      task: transcriptionMode,
      audioDurationSeconds,
      audioPath,
      lines,
      words
    };
  }

  if (await hasPythonModule("whisper")) {
    const whisperJsonPath = await transcribeWithOpenAiWhisper(audioPath, outputDirectory, normalizedOptions);
    const lines = parseWhisperJson(whisperJsonPath, effectiveDurationSeconds);
    const words = parseWhisperWords(whisperJsonPath, effectiveDurationSeconds);
    return {
      source: transcriptionMode === "translate" ? "audio-translation" : "audio-transcription",
      syncMode: "transcribed",
      task: transcriptionMode,
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
