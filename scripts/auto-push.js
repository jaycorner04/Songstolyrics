#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const stateDir = path.join(repoRoot, ".autopush");
const pidFile = path.join(stateDir, "auto-push.pid");
const debounceMs = Number(process.env.AUTO_PUSH_DEBOUNCE_MS || 15000);
const ignoredPrefixes = [
  ".git/",
  ".autopush/",
  ".codex-temp/",
  "node_modules/",
  "runtime/",
  "cache/",
  "uploads/",
  "renders/",
  "tmp/"
];

let syncTimer = null;
let syncInProgress = false;
let pendingReason = "";

function ensureStateDir() {
  fs.mkdirSync(stateDir, { recursive: true });
}

function normalizeRelativePath(filePath = "") {
  return filePath.split(path.sep).join("/").replace(/^\.\//, "");
}

function shouldIgnore(filePath) {
  const normalized = normalizeRelativePath(filePath);
  return ignoredPrefixes.some((prefix) => normalized.startsWith(prefix));
}

function log(message) {
  console.log(`[auto-push] ${message}`);
}

function runGit(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd: repoRoot, windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        const details = [stderr, stdout].filter(Boolean).join("\n").trim();
        reject(new Error(details || error.message));
        return;
      }

      resolve((stdout || "").trim());
    });
  });
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writePidFile() {
  ensureStateDir();

  if (fs.existsSync(pidFile)) {
    const existingPid = Number.parseInt(fs.readFileSync(pidFile, "utf8").trim(), 10);

    if (existingPid && existingPid !== process.pid && processExists(existingPid)) {
      log(`another watcher is already running with pid ${existingPid}, exiting`);
      process.exit(0);
    }
  }

  fs.writeFileSync(pidFile, `${process.pid}\n`, "utf8");
}

function cleanupPidFile() {
  try {
    if (fs.existsSync(pidFile)) {
      const existingPid = Number.parseInt(fs.readFileSync(pidFile, "utf8").trim(), 10);

      if (!existingPid || existingPid === process.pid) {
        fs.unlinkSync(pidFile);
      }
    }
  } catch {}
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function getStatus() {
  return runGit(["status", "--porcelain"]);
}

async function syncRepository(reason) {
  if (syncInProgress) {
    pendingReason = pendingReason || reason;
    return;
  }

  syncInProgress = true;

  try {
    const beforeStatus = await getStatus();

    if (!beforeStatus) {
      return;
    }

    const branch = await runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
    await runGit(["add", "-A"]);

    const stagedStatus = await getStatus();

    if (!stagedStatus) {
      return;
    }

    const commitMessage = `chore: auto-sync ${formatTimestamp()}`;
    await runGit(["commit", "-m", commitMessage]);
    await runGit(["push", "origin", branch]);
    log(`committed and pushed changes after ${reason}`);
  } catch (error) {
    log(`sync failed: ${error.message || error}`);
  } finally {
    syncInProgress = false;

    if (pendingReason) {
      const queuedReason = pendingReason;
      pendingReason = "";
      scheduleSync(queuedReason);
    }
  }
}

function scheduleSync(reason) {
  pendingReason = reason;

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    const activeReason = pendingReason || reason;
    pendingReason = "";
    syncRepository(activeReason);
  }, debounceMs);
}

function startWatcher() {
  writePidFile();

  process.on("exit", cleanupPidFile);
  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));

  log(`watching ${repoRoot}`);
  log(`debounce ${debounceMs}ms`);

  fs.watch(repoRoot, { recursive: true }, (_eventType, filename) => {
    if (!filename) {
      scheduleSync("filesystem activity");
      return;
    }

    if (shouldIgnore(filename)) {
      return;
    }

    scheduleSync(normalizeRelativePath(filename));
  });

  scheduleSync("startup");
}

startWatcher();
