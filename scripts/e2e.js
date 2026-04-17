#!/usr/bin/env node

const { spawn } = require("child_process");

const port = process.env.E2E_PORT || "3320";
const env = {
  ...process.env,
  PORT: port,
  HOST: "127.0.0.1"
};
const TRANSIENT_PROCESS_ERROR_REGEX = /\b(eperm|eacces|ebusy|emfile|enfile)\b/i;
const TRANSIENT_NETWORK_ERROR_REGEX = /\b(fetch failed|timed out|timeout|econnreset|enetunreach|ehostunreach|socket hang up|502|503|504|429)\b/i;
const SPAWN_RETRY_DELAYS_MS = [250, 800];
const NETWORK_RETRY_DELAYS_MS = [1500, 5000];
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function looksTransientNetworkError(error) {
  return TRANSIENT_NETWORK_ERROR_REGEX.test(`${error?.message || error || ""}`);
}

async function retryOperation(label, operation, delaysMs, shouldRetry) {
  let lastError = null;

  for (let attempt = 0; attempt <= delaysMs.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === delaysMs.length) {
        throw error;
      }

      const delayMs = delaysMs[attempt];
      console.log(`${label} retrying after transient error: ${error.message || error}`);
      await wait(delayMs);
    }
  }

  throw lastError || new Error(`${label} failed.`);
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

async function fetchResponse(url, options = {}) {
  const response = await fetch(url, options);
  return response;
}

async function discardResponseBody(response) {
  try {
    await response.body?.cancel();
  } catch {}
}

async function runSurfaceChecks(baseUrl) {
  const homepage = await fetchResponse(`${baseUrl}/`);
  const homepageHtml = await homepage.text();

  assert(homepage.ok, "Homepage did not respond successfully.");
  assert(/text\/html/i.test(homepage.headers.get("content-type") || ""), "Homepage did not return HTML.");
  assert(/song to lyrics/i.test(homepageHtml), "Homepage did not include the expected app title.");

  const invalidConvertResponse = await fetchResponse(`${baseUrl}/api/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "" })
  });
  const invalidConvertPayload = await invalidConvertResponse.json();
  assert(invalidConvertResponse.status === 400, "Empty convert request should return 400.");
  assert(
    /youtube video link/i.test(`${invalidConvertPayload.error || ""}`),
    "Empty convert request did not return the expected validation message."
  );

  const missingRenderResponse = await fetchResponse(`${baseUrl}/api/render/not-a-real-job`);
  const missingRenderPayload = await missingRenderResponse.json();
  assert(missingRenderResponse.status === 404, "Missing render job should return 404.");
  assert(/could not be found/i.test(`${missingRenderPayload.error || ""}`), "Missing render job returned an unexpected message.");
}

async function runConvertChecks(baseUrl, urls) {
  const failures = [];
  const successfulPayloads = [];

  for (const url of urls) {
    const startedAt = Date.now();

    try {
      const payload = await retryOperation(
        `convert ${url}`,
        () =>
          fetchJson(`${baseUrl}/api/convert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
          }),
        NETWORK_RETRY_DELAYS_MS,
        looksTransientNetworkError
      );
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

      if (!payload.audioUrl || !payload.audioUrl.startsWith("/api/audio/")) {
        failures.push(`Convert did not return a valid audioUrl for ${url}`);
      }

      successfulPayloads.push(payload);
    } catch (error) {
      failures.push(`Convert failed for ${url}: ${error.message}`);
    }
  }

  return { failures, payloads: successfulPayloads };
}

async function runAudioCheck(baseUrl, convertPayload) {
  const response = await fetchResponse(`${baseUrl}${convertPayload.audioUrl}`, {
    redirect: "manual"
  });
  const cacheControl = response.headers.get("cache-control") || "";

  assert(cacheControl.includes("no-store"), "Audio endpoint should disable caching.");

  if (response.status === 302) {
    const location = response.headers.get("location") || "";
    assert(location.startsWith("http"), "Redirected audio endpoint did not return a valid target.");
    await discardResponseBody(response);
    return;
  }

  assert(response.ok, "Audio endpoint did not return a successful response.");
  assert(/^audio\//i.test(response.headers.get("content-type") || ""), "Audio endpoint did not return audio content.");
  await discardResponseBody(response);
}

async function runRenderCheck(baseUrl, inputUrl) {
  const convert = await retryOperation(
    `render convert ${inputUrl}`,
    () =>
      fetchJson(`${baseUrl}/api/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl })
      }),
    NETWORK_RETRY_DELAYS_MS,
    looksTransientNetworkError
  );
  const render = await retryOperation(
    `render start ${inputUrl}`,
    () =>
      fetchJson(`${baseUrl}/api/render`, {
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
      }),
    NETWORK_RETRY_DELAYS_MS,
    looksTransientNetworkError
  );

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

async function runRenderArtifactChecks(baseUrl, jobId) {
  const fileResponse = await fetchResponse(`${baseUrl}/api/render/${jobId}/file`);
  assert(fileResponse.ok, "Render file endpoint did not return a successful response.");
  assert(
    /video\/mp4/i.test(fileResponse.headers.get("content-type") || ""),
    "Render file endpoint did not return an MP4."
  );
  await discardResponseBody(fileResponse);

  const downloadResponse = await fetchResponse(`${baseUrl}/api/render/${jobId}/download`);
  const disposition = downloadResponse.headers.get("content-disposition") || "";
  assert(downloadResponse.ok, "Render download endpoint did not return a successful response.");
  assert(/attachment/i.test(disposition), "Render download endpoint did not return an attachment response.");
  await discardResponseBody(downloadResponse);
}

async function restartServer(child, baseUrl) {
  child.kill();
  await wait(1500);

  const restartedChild = await launchServerProcess(process.execPath, ["src/server.js"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  await waitForServer(`${baseUrl}/api/health`);
  await waitForServer(`${baseUrl}/api/readiness`);
  return restartedChild;
}

(async () => {
  let child = await launchServerProcess(process.execPath, ["src/server.js"], {
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
    await runSurfaceChecks(baseUrl);
    const links = process.env.E2E_LINKS
      ? process.env.E2E_LINKS.split(",").map((value) => value.trim()).filter(Boolean)
      : DEFAULT_LINKS;
    const { failures, payloads } = await runConvertChecks(baseUrl, links);

    if (payloads.length) {
      await runAudioCheck(baseUrl, payloads[0]);
    }

    if (process.env.E2E_SKIP_RENDER !== "true" && payloads.length) {
      const renderLink = process.env.E2E_RENDER_LINK || links[1] || links[0];
      const renderJob = await runRenderCheck(baseUrl, renderLink);
      await runRenderArtifactChecks(baseUrl, renderJob.id);
      child = await restartServer(child, baseUrl);
      const persistedJob = await fetchJson(`${baseUrl}/api/render/${renderJob.id}`);
      assert(persistedJob.status === "completed", "Completed render job did not persist across restart.");
      await runRenderArtifactChecks(baseUrl, renderJob.id);
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
