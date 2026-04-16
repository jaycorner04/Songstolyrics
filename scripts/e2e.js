#!/usr/bin/env node

const { spawn } = require("child_process");

const port = process.env.E2E_PORT || "3320";
const env = {
  ...process.env,
  PORT: port,
  HOST: "127.0.0.1"
};
const TRANSIENT_PROCESS_ERROR_REGEX = /\b(eperm|eacces|ebusy|emfile|enfile)\b/i;
const SPAWN_RETRY_DELAYS_MS = [250, 800];
const DEFAULT_LINKS = [
  "https://youtu.be/uelHwf8o7_U",
  "https://youtu.be/H5v3kku4y6Q",
  "https://youtu.be/kPa7bsKwL-c",
  "https://youtu.be/Ja7Yz0MPbwI",
  "https://youtu.be/cuLuIPk9uyw"
];

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

  throw lastError || new Error("Could not start the E2E server process.");
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

  throw lastError || new Error("Could not launch the E2E server process.");
}

async function waitForServer(url, attempts = 30) {
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function runConvertChecks(baseUrl, urls) {
  const failures = [];

  for (const url of urls) {
    const startedAt = Date.now();

    try {
      const payload = await fetchJson(`${baseUrl}/api/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const summary = {
        url,
        title: payload.title,
        lines: Array.isArray(payload.lines) ? payload.lines.length : 0,
        lyricsSource: payload.lyricsSource,
        syncMode: payload.syncMode,
        ms: Date.now() - startedAt
      };

      console.log(`convert ok: ${JSON.stringify(summary)}`);

      if (!payload.title || !Array.isArray(payload.lines) || !payload.lines.length) {
        failures.push(`Convert returned incomplete payload for ${url}`);
      }
    } catch (error) {
      failures.push(`Convert failed for ${url}: ${error.message}`);
    }
  }

  return failures;
}

async function runRenderCheck(baseUrl, inputUrl) {
  const convert = await fetchJson(`${baseUrl}/api/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: inputUrl })
  });
  const render = await fetchJson(`${baseUrl}/api/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputUrl,
      videoId: convert.videoId,
      title: convert.title,
      channelTitle: convert.channelTitle,
      durationSeconds: convert.durationSeconds,
      lines: convert.lines,
      song: convert.song,
      syncMode: convert.syncMode,
      poster: convert.poster,
      thumbnails: convert.thumbnails,
      customBackgrounds: [],
      outputFormat: "auto",
      renderMode: process.env.E2E_RENDER_MODE === "standard" ? "standard" : "fast",
      lyricStyle: process.env.E2E_LYRIC_STYLE || "comic",
      lyricFont: process.env.E2E_LYRIC_FONT || "impact"
    })
  });

  console.log(`render started: ${render.id}`);
  const timeoutMs = Number(process.env.E2E_RENDER_TIMEOUT_MS || 18 * 60 * 1000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const job = await fetchJson(`${baseUrl}/api/render/${render.id}`);
    console.log(
      `render poll: ${JSON.stringify({
        status: job.status,
        stage: job.stage,
        progress: job.progress,
        retrying: job.retrying,
        error: job.error
      })}`
    );

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(job.error || "Render failed.");
    }

    await wait(8000);
  }

  throw new Error("Render timed out before completion.");
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
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(`${baseUrl}/api/health`);
    await waitForServer(`${baseUrl}/api/readiness`);
    const links = process.env.E2E_LINKS
      ? process.env.E2E_LINKS.split(",").map((value) => value.trim()).filter(Boolean)
      : DEFAULT_LINKS;
    const failures = await runConvertChecks(baseUrl, links);

    if (process.env.E2E_SKIP_RENDER !== "true") {
      const renderLink = process.env.E2E_RENDER_LINK || links[1] || links[0];
      const renderJob = await runRenderCheck(baseUrl, renderLink);
      console.log(`render ok: ${JSON.stringify({ id: renderJob.id, videoUrl: renderJob.videoUrl })}`);
    }

    if (failures.length) {
      throw new Error(failures.join("\n"));
    }

    console.log("E2E test passed.");
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
