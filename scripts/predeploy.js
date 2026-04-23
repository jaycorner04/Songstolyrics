#!/usr/bin/env node

const { spawn } = require("child_process");

const STEPS = [
  {
    label: "doctor",
    command: process.execPath,
    args: ["scripts/doctor.js"],
    retries: 0
  },
  {
    label: "lyrics",
    command: process.execPath,
    args: ["scripts/check-lyric-regressions.js"],
    retries: 0
  },
  {
    label: "smoke",
    command: process.execPath,
    args: ["scripts/smoke.js"],
    retries: 0
  },
  {
    label: "e2e",
    command: process.execPath,
    args: ["scripts/e2e.js"],
    retries: 1
  }
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runStep(step) {
  return new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        ALLOW_BROWSER_COOKIES: process.env.ALLOW_BROWSER_COOKIES || "false"
      }
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${step.label} failed with exit code ${code}.`));
    });
  });
}

async function runStepWithRetries(step) {
  const attempts = (step.retries || 0) + 1;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await runStep(step);
      return;
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      console.log(`${step.label} retry ${attempt}/${step.retries} after failure: ${error.message || error}`);
      await wait(5000);
    }
  }

  throw lastError || new Error(`${step.label} failed.`);
}

(async () => {
  console.log("Running predeploy checks for Song to Lyrics...");

  for (const step of STEPS) {
    console.log(`\n=== ${step.label.toUpperCase()} ===`);
    await runStepWithRetries(step);
  }

  console.log("\nPredeploy checks passed.");
})().catch((error) => {
  console.error(`\nPredeploy checks failed: ${error.message || error}`);
  process.exit(1);
});
