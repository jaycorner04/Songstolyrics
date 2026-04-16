const path = require("path");
const fsp = require("fs/promises");

const projectRoot = path.join(__dirname, "..", "..");
const publicRoot = path.join(projectRoot, "public");
const runtimeRoot = process.env.RUNTIME_ROOT
  ? path.resolve(process.env.RUNTIME_ROOT)
  : path.join(projectRoot, "runtime");

const uploadsRoot = path.join(runtimeRoot, "uploads");
const cacheRoot = path.join(runtimeRoot, "cache");
const convertCacheRoot = path.join(cacheRoot, "convert");
const previewAudioCacheRoot = path.join(cacheRoot, "preview-audio");
const rendersRoot = path.join(runtimeRoot, "renders");
const renderJobsRoot = path.join(runtimeRoot, "jobs");
const logsRoot = path.join(runtimeRoot, "logs");

const runtimeDirectories = [
  runtimeRoot,
  uploadsRoot,
  cacheRoot,
  convertCacheRoot,
  previewAudioCacheRoot,
  rendersRoot,
  renderJobsRoot,
  logsRoot
];

async function ensureRuntimeDirectories() {
  await Promise.all(runtimeDirectories.map((directoryPath) => fsp.mkdir(directoryPath, { recursive: true })));
}

module.exports = {
  cacheRoot,
  convertCacheRoot,
  ensureRuntimeDirectories,
  logsRoot,
  previewAudioCacheRoot,
  projectRoot,
  publicRoot,
  renderJobsRoot,
  rendersRoot,
  runtimeDirectories,
  runtimeRoot,
  uploadsRoot
};
