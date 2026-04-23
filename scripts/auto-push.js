#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const stateDir = path.join(repoRoot, ".autopush");
const pidFile = path.join(stateDir, "auto-push.pid");
const debounceMs = Number(process.env.AUTO_PUSH_DEBOUNCE_MS || 15000);
const autoDeployAfterPush = process.env.AUTO_DEPLOY_AFTER_PUSH !== "false";
const autoDeploySshHost = process.env.AUTO_DEPLOY_REMOTE_HOST || process.env.LIVE_DEBUG_REMOTE_HOST || "15.206.23.118";
const autoDeploySshUser = process.env.AUTO_DEPLOY_REMOTE_USER || process.env.LIVE_DEBUG_REMOTE_USER || "ec2-user";
const autoDeployAppDir = process.env.AUTO_DEPLOY_APP_DIR || "/home/ec2-user/Songstolyrics";
const autoDeployAppUrl = process.env.AUTO_DEPLOY_APP_URL || "http://127.0.0.1:3000";
const autoDeploySshKeyPath =
  process.env.AUTO_DEPLOY_SSH_KEY_PATH ||
  process.env.SONG_TO_LYRICS_SSH_KEY_PATH ||
  process.env.LIVE_DEBUG_SSH_KEY_PATH ||
  path.join(process.env.USERPROFILE || "", "Downloads", "song-to-lyrics-key.pem");
const autoDeployTimeoutMs = Number(process.env.AUTO_DEPLOY_TIMEOUT_MS || 15 * 60 * 1000);
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

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: repoRoot,
        maxBuffer: 4 * 1024 * 1024,
        timeout: autoDeployTimeoutMs,
        windowsHide: true,
        ...options
      },
      (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join("\n").trim();

        if (error) {
          reject(new Error(output || error.message));
          return;
        }

        resolve(output);
      }
    );
  });
}

function shellQuote(value = "") {
  return `'${`${value}`.replace(/'/g, `'\\''`)}'`;
}

function resolveSshCommand() {
  if (process.env.AUTO_DEPLOY_SSH_EXE) {
    return process.env.AUTO_DEPLOY_SSH_EXE;
  }

  const windowsSshPath = path.join(process.env.WINDIR || "", "System32", "OpenSSH", "ssh.exe");
  return fs.existsSync(windowsSshPath) ? windowsSshPath : "ssh";
}

async function deployRemote(branch) {
  if (!autoDeployAfterPush) {
    log("auto deploy disabled by AUTO_DEPLOY_AFTER_PUSH=false");
    return;
  }

  if (!autoDeploySshHost || !autoDeploySshUser || !autoDeployAppDir) {
    log("auto deploy skipped because remote host, user, or app directory is not configured");
    return;
  }

  if (!autoDeploySshKeyPath || !fs.existsSync(autoDeploySshKeyPath)) {
    log(`auto deploy skipped because SSH key was not found at ${autoDeploySshKeyPath}`);
    return;
  }

  const sshCommand = resolveSshCommand();
  const remoteTarget = `${autoDeploySshUser}@${autoDeploySshHost}`;
  const remoteCommand = [
    "set -euo pipefail",
    `export APP_URL=${shellQuote(autoDeployAppUrl)}`,
    `export DEPLOY_BRANCH=${shellQuote(branch)}`,
    `cd ${shellQuote(autoDeployAppDir)}`,
    'git fetch origin "$DEPLOY_BRANCH"',
    'git checkout "$DEPLOY_BRANCH"',
    'git reset --hard "origin/$DEPLOY_BRANCH"',
    "chmod +x scripts/deploy-remote.sh",
    'APP_URL="$APP_URL" DEPLOY_BRANCH="$DEPLOY_BRANCH" ./scripts/deploy-remote.sh'
  ].join("; ");

  log(`deploying ${branch} to EC2 after push`);
  await runCommand(sshCommand, [
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ConnectTimeout=20",
    "-i",
    autoDeploySshKeyPath,
    remoteTarget,
    remoteCommand
  ]);
  log("EC2 deploy completed");
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
    await deployRemote(branch);
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
  log(autoDeployAfterPush ? "auto deploy after push enabled" : "auto deploy after push disabled");

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
