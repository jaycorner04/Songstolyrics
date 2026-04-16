const fs = require("fs");
const path = require("path");
const fsp = require("fs/promises");

const { renderJobsRoot } = require("../config/runtime");

const persistQueues = new Map();

function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function getJobFilePath(jobId = "") {
  const safeId = `${jobId || ""}`.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return path.join(renderJobsRoot, `${safeId}.json`);
}

function serializeJob(job = {}) {
  return {
    id: job.id,
    videoId: job.videoId || "",
    status: job.status || "queued",
    stage: job.stage || "Queued",
    progress: Number(job.progress || 0),
    notes: Array.isArray(job.notes) ? job.notes : [],
    error: job.error || null,
    attempt: Number(job.attempt || 1),
    maxAttempts: Number(job.maxAttempts || 1),
    retrying: Boolean(job.retrying),
    outputVideoPath: job.outputVideoPath || "",
    createdAt: job.createdAt || new Date().toISOString(),
    updatedAt: job.updatedAt || new Date().toISOString()
  };
}

async function persistRenderJob(job = {}) {
  const payload = serializeJob(job);
  const filePath = getJobFilePath(payload.id);
  const tempPath = `${filePath}.tmp`;
  const queueKey = payload.id;

  const nextWrite = (persistQueues.get(queueKey) || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      await fsp.mkdir(renderJobsRoot, { recursive: true });
      await fsp.writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
      await fsp.rename(tempPath, filePath);
    });

  persistQueues.set(queueKey, nextWrite);
  await nextWrite;
}

function appendRecoveryNote(notes = [], note = "") {
  const safeNote = normalizeWhitespace(note);

  if (!safeNote) {
    return Array.isArray(notes) ? notes : [];
  }

  const currentNotes = Array.isArray(notes) ? notes : [];
  return currentNotes.includes(safeNote) ? currentNotes : [...currentNotes, safeNote];
}

function recoverPersistedJob(job = {}) {
  const recovered = serializeJob(job);
  const fileMissing =
    recovered.status === "completed" &&
    recovered.outputVideoPath &&
    !fs.existsSync(recovered.outputVideoPath);

  if (recovered.status === "queued" || recovered.status === "running" || recovered.retrying) {
    recovered.status = "failed";
    recovered.stage = "Interrupted by server restart";
    recovered.retrying = false;
    recovered.progress = 1;
    recovered.error = "The server restarted before this render finished. Start the render again.";
    recovered.notes = appendRecoveryNote(
      recovered.notes,
      "This render stopped when the server restarted. Start it again to continue."
    );
  } else if (fileMissing) {
    recovered.status = "failed";
    recovered.stage = "Rendered file missing";
    recovered.progress = 1;
    recovered.error = "The final render file is no longer available on disk.";
    recovered.outputVideoPath = "";
    recovered.notes = appendRecoveryNote(
      recovered.notes,
      "The previous render finished earlier, but its output file is no longer present on disk."
    );
  }

  recovered.updatedAt = new Date().toISOString();
  return recovered;
}

async function loadPersistedRenderJobs() {
  await fsp.mkdir(renderJobsRoot, { recursive: true });
  const fileNames = await fsp.readdir(renderJobsRoot).catch(() => []);
  const jobs = [];

  for (const fileName of fileNames) {
    if (!/\.json$/i.test(fileName)) {
      continue;
    }

    try {
      const payload = JSON.parse(
        await fsp.readFile(path.join(renderJobsRoot, fileName), "utf8")
      );
      const recovered = recoverPersistedJob(payload);
      jobs.push(recovered);
      await persistRenderJob(recovered);
    } catch {}
  }

  jobs.sort(
    (left, right) =>
      Number(new Date(right.updatedAt || right.createdAt || 0)) -
      Number(new Date(left.updatedAt || left.createdAt || 0))
  );

  return jobs;
}

module.exports = {
  loadPersistedRenderJobs,
  persistRenderJob
};
