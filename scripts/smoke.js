#!/usr/bin/env node

const { spawn } = require("child_process");

const port = process.env.SMOKE_PORT || "3310";
const env = {
  ...process.env,
  PORT: port,
  HOST: "127.0.0.1"
};
const TRANSIENT_PROCESS_ERROR_REGEX = /\b(eperm|eacces|ebusy|emfile|enfile)\b/i;
const SPAWN_RETRY_DELAYS_MS = [250, 800];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function spawnWithRetries(command, args, options = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= SPAWN_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return spawn(command, args, options);
    } catch (error) {
      lastError = error;

      if (!TRANSIENT_PROCESS_ERROR_REGEX.test(`${error?.message || ""}`) || attempt === SPAWN_RETRY_DELAYS_MS.length) {
        throw error;
      }

      await wait(SPAWN_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError || new Error("Could not start the smoke-test server process.");
}

async function launchServerProcess(command, args, options = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= SPAWN_RETRY_DELAYS_MS.length; attempt += 1) {
    const child = spawn(command, args, options);

    try {
      await new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) {
            return;
          }

          settled = true;
          child.removeListener("error", onError);
          resolve();
        }, 1200);

        function onError(error) {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timer);
          reject(error);
        }

        child.once("error", onError);
      });

      return child;
    } catch (error) {
      lastError = error;
      child.kill();

      if (!TRANSIENT_PROCESS_ERROR_REGEX.test(`${error?.message || ""}`) || attempt === SPAWN_RETRY_DELAYS_MS.length) {
        throw error;
      }

      await wait(SPAWN_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError || new Error("Could not launch the smoke-test server process.");
}

async function waitForServer(url, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response;
      }
    } catch {}

    await wait(1000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

(async () => {
  const child = await launchServerProcess(process.execPath, ["src/server.js"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const healthResponse = await waitForServer(`http://127.0.0.1:${port}/api/health`);
    const readinessResponse = await waitForServer(`http://127.0.0.1:${port}/api/readiness`);
    const health = await healthResponse.json();
    const readiness = await readinessResponse.json();

    if (!health.ok) {
      throw new Error("Health check did not return ok=true.");
    }

    if (!readiness.ok || !readiness.checks) {
      throw new Error("Readiness check did not return the expected payload.");
    }

    console.log("Smoke test passed.");
  } finally {
    child.kill();
  }

  if (stderr.trim()) {
    console.error(stderr.trim());
  }
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
