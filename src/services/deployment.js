const fs = require("fs");
const { promisify } = require("util");
const { execFile } = require("child_process");

const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

const { runtimeRoot } = require("../config/runtime");

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 12000;

async function runCheck(command, args = []) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: COMMAND_TIMEOUT_MS,
      windowsHide: true
    });

    return {
      ok: true,
      detail: `${stdout || stderr || ""}`.trim().split(/\r?\n/)[0] || "available"
    };
  } catch (error) {
    return {
      ok: false,
      detail: `${error.stderr || error.stdout || error.message || "unavailable"}`
        .trim()
        .split(/\r?\n/)[0]
    };
  }
}

function buildCheck(ok, detail, required = true) {
  return {
    ok: Boolean(ok),
    detail: detail || "",
    required
  };
}

async function getRuntimeDiagnostics() {
  const [nodeVersion, ffmpeg, ffprobe, python, ytDlp, fasterWhisper, openAiWhisper] = await Promise.all([
    Promise.resolve(process.version),
    ffmpegPath ? runCheck(ffmpegPath, ["-version"]) : Promise.resolve({ ok: false, detail: "ffmpeg-static missing" }),
    ffprobePath
      ? runCheck(ffprobePath, ["-version"])
      : Promise.resolve({ ok: false, detail: "ffprobe-static missing" }),
    runCheck("python", ["--version"]),
    runCheck("python", ["-m", "yt_dlp", "--version"]),
    runCheck("python", ["-c", "import faster_whisper"]),
    runCheck("python", ["-c", "import whisper"])
  ]);

  const checks = {
    node: buildCheck(true, nodeVersion, true),
    ffmpeg: buildCheck(ffmpeg.ok, ffmpeg.detail, true),
    ffprobe: buildCheck(ffprobe.ok, ffprobe.detail, true),
    python: buildCheck(python.ok, python.detail, true),
    ytDlp: buildCheck(ytDlp.ok, ytDlp.detail, true),
    fasterWhisper: buildCheck(fasterWhisper.ok, fasterWhisper.detail, false),
    openAiWhisper: buildCheck(openAiWhisper.ok, openAiWhisper.detail, false),
    runtimeRoot: buildCheck(fs.existsSync(runtimeRoot), runtimeRoot, true)
  };

  const transcriptionReady = checks.fasterWhisper.ok || checks.openAiWhisper.ok;
  const requiredReady = Object.values(checks)
    .filter((check) => check.required)
    .every((check) => check.ok);

  return {
    checkedAt: new Date().toISOString(),
    ready: requiredReady,
    renderReady: requiredReady,
    transcriptionReady,
    checks
  };
}

module.exports = {
  getRuntimeDiagnostics
};
