#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const renderPath = path.join(process.cwd(), "src", "services", "render.js");
const renderSource = fs.readFileSync(renderPath, "utf8");

function assertIncludes(snippet, message) {
  if (!renderSource.includes(snippet)) {
    throw new Error(message);
  }
}

function assertNotIncludes(snippet, message) {
  if (renderSource.includes(snippet)) {
    throw new Error(message);
  }
}

assertIncludes(
  'if (shouldRefreshUploadedAudioTranscript(stabilizedUploadedTranscriptLines, durationSeconds) || isUploadedAudioSource) {',
  "Uploaded-audio lyric protection failed: full-song transcription gate changed."
);

assertIncludes(
  'modelName: process.env.WHISPER_UPLOADED_FINAL_MODEL || "small"',
  "Uploaded-audio lyric protection failed: final transcription model changed."
);

assertIncludes(
  "beamSize: 6,",
  "Uploaded-audio lyric protection failed: final transcription beam size changed."
);

assertIncludes(
  'passName: "uploaded-final-full"',
  "Uploaded-audio lyric protection failed: final uploaded-audio transcription pass name changed."
);

assertIncludes(
  'The final render rebuilt lyrics from a full-song uploaded-audio transcription so subtitles stay locked to the vocals across the track.',
  "Uploaded-audio lyric protection failed: stable full-song timing note changed."
);

assertNotIncludes(
  "getUploadedAudioFinalTranscriptionOptions(",
  "Uploaded-audio lyric protection failed: fast-mode override helper returned."
);

assertNotIncludes(
  'Fast render detected weak uploaded-audio timing, so it ran a lighter full-song transcription pass before export.',
  "Uploaded-audio lyric protection failed: lighter uploaded-audio rescue path returned."
);

console.log("Lyric regression guard passed.");
