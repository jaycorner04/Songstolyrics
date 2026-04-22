const fs = require("fs");
const path = require("path");
const { logsRoot } = require("../config/runtime");

const LOCAL_DEBUG_MAX_ENTRIES = Math.max(0, Number(process.env.LOCAL_DEBUG_MAX_ENTRIES || 0));
const LOCAL_DEBUG_PATH = path.join(logsRoot, "local-debug-events.json");

const localDebugEvents = [];
const localDebugListeners = new Set();
let nextLocalDebugId = 1;
let localDebugLoaded = false;

function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function normalizeHost(value = "") {
  const raw = `${value || ""}`.trim().toLowerCase();

  if (!raw) {
    return "";
  }

  if (raw.startsWith("[") && raw.includes("]")) {
    return raw.slice(1, raw.indexOf("]"));
  }

  if (raw.startsWith("::ffff:")) {
    return raw.slice("::ffff:".length).split(":")[0];
  }

  if (raw === "::1" || raw.includes(":")) {
    return raw;
  }

  return raw.split(":")[0];
}

function extractOriginHost(value = "") {
  const raw = `${value || ""}`.trim();

  if (!raw) {
    return "";
  }

  try {
    return normalizeHost(new URL(raw).hostname || "");
  } catch {
    return normalizeHost(raw);
  }
}

function isLoopbackHost(value = "") {
  const host = normalizeHost(value);
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0:0:0:0:0:0:0:1";
}

function isLocalDebugRequest(req = {}) {
  const host = normalizeHost(req.hostname || req.headers?.host || "");
  const ip = normalizeHost(req.ip || req.socket?.remoteAddress || "");
  const originHost = extractOriginHost(req.headers?.origin || "");
  const refererHost = extractOriginHost(req.headers?.referer || "");
  return (
    isLoopbackHost(host) ||
    isLoopbackHost(ip) ||
    isLoopbackHost(originHost) ||
    isLoopbackHost(refererHost)
  );
}

function serializeDebugValue(value, depth = 0) {
  if (depth > 4) {
    return "[depth limit]";
  }

  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (typeof value === "string") {
    return value.length > 2500 ? `${value.slice(0, 2497)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => serializeDebugValue(entry, depth + 1));
  }

  if (value instanceof Error) {
    return {
      name: value.name || "Error",
      message: value.message || "",
      stack: value.stack || "",
      cause:
        value.cause instanceof Error
          ? {
              name: value.cause.name || "Error",
              message: value.cause.message || "",
              stack: value.cause.stack || ""
            }
          : serializeDebugValue(value.cause, depth + 1)
    };
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 30)
        .map(([key, entryValue]) => [key, serializeDebugValue(entryValue, depth + 1)])
    );
  }

  return String(value);
}

function recordLocalDebugEvent(payload = {}) {
  ensureLocalDebugLoaded();

  const entry = {
    id: nextLocalDebugId++,
    createdAt: new Date().toISOString(),
    source: normalizeWhitespace(payload.source || "server"),
    title: normalizeWhitespace(payload.title || "Debug event"),
    userMessage: normalizeWhitespace(payload.userMessage || ""),
    errorMessage: normalizeWhitespace(payload.errorMessage || ""),
    cause: normalizeWhitespace(payload.cause || ""),
    stack: `${payload.stack || ""}`.trim(),
    details: serializeDebugValue(payload.details || {})
  };

  localDebugEvents.unshift(entry);
  trimLocalDebugEvents();
  persistLocalDebugEvents();
  notifyLocalDebugListeners({
    type: "recorded",
    entry
  });
  return entry;
}

function getLocalDebugEvents() {
  ensureLocalDebugLoaded();
  return [...localDebugEvents];
}

function clearLocalDebugEvents() {
  ensureLocalDebugLoaded();
  localDebugEvents.length = 0;
  persistLocalDebugEvents();
  notifyLocalDebugListeners({
    type: "cleared"
  });
}

function deleteLocalDebugEvent(id) {
  ensureLocalDebugLoaded();
  const targetId = Number(id || 0);

  if (!targetId) {
    return false;
  }

  const index = localDebugEvents.findIndex((entry) => Number(entry?.id || 0) === targetId);

  if (index === -1) {
    return false;
  }

  localDebugEvents.splice(index, 1);
  persistLocalDebugEvents();
  notifyLocalDebugListeners({
    type: "deleted",
    id: targetId
  });
  return true;
}

function subscribeLocalDebugEvents(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  localDebugListeners.add(listener);
  return () => {
    localDebugListeners.delete(listener);
  };
}

function notifyLocalDebugListeners(payload = {}) {
  for (const listener of localDebugListeners) {
    try {
      listener({
        ...payload,
        updatedAt: new Date().toISOString(),
        entryCount: localDebugEvents.length
      });
    } catch {}
  }
}

function createEmptyLocalDebugPayload() {
  return {
    version: 1,
    updatedAt: "",
    nextId: 1,
    entries: []
  };
}

function trimLocalDebugEvents() {
  if (LOCAL_DEBUG_MAX_ENTRIES > 0 && localDebugEvents.length > LOCAL_DEBUG_MAX_ENTRIES) {
    localDebugEvents.length = LOCAL_DEBUG_MAX_ENTRIES;
  }
}

function ensureLocalDebugLoaded() {
  if (localDebugLoaded) {
    return;
  }

  localDebugLoaded = true;

  try {
    const raw = fs.readFileSync(LOCAL_DEBUG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    const sanitizedEntries = entries
      .map((entry) => ({
        id: Number(entry?.id || 0),
        createdAt: `${entry?.createdAt || ""}`,
        source: normalizeWhitespace(entry?.source || "server"),
        title: normalizeWhitespace(entry?.title || "Debug event"),
        userMessage: normalizeWhitespace(entry?.userMessage || ""),
        errorMessage: normalizeWhitespace(entry?.errorMessage || ""),
        cause: normalizeWhitespace(entry?.cause || ""),
        stack: `${entry?.stack || ""}`.trim(),
        details: serializeDebugValue(entry?.details || {})
      }))
      .filter((entry) => entry.id > 0);

    localDebugEvents.length = 0;
    localDebugEvents.push(...sanitizedEntries);
    trimLocalDebugEvents();
    nextLocalDebugId = Math.max(
      Number(parsed?.nextId || 1),
      ...localDebugEvents.map((entry) => Number(entry.id || 0) + 1),
      1
    );
  } catch {
    const emptyPayload = createEmptyLocalDebugPayload();
    nextLocalDebugId = emptyPayload.nextId;
  }
}

function persistLocalDebugEvents() {
  try {
    fs.mkdirSync(path.dirname(LOCAL_DEBUG_PATH), { recursive: true });
    fs.writeFileSync(
      LOCAL_DEBUG_PATH,
      JSON.stringify(
        {
          version: 1,
          updatedAt: new Date().toISOString(),
          nextId: nextLocalDebugId,
          entries:
            LOCAL_DEBUG_MAX_ENTRIES > 0
              ? localDebugEvents.slice(0, LOCAL_DEBUG_MAX_ENTRIES)
              : localDebugEvents
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {}
}

function buildRequestDebugContext(req = {}) {
  return {
    method: req.method || "",
    path: req.originalUrl || req.url || "",
    hostname: req.hostname || req.headers?.host || "",
    ip: req.ip || req.socket?.remoteAddress || "",
    query: serializeDebugValue(req.query || {}),
    body: serializeDebugValue(req.body || {})
  };
}

module.exports = {
  buildRequestDebugContext,
  clearLocalDebugEvents,
  deleteLocalDebugEvent,
  getLocalDebugEvents,
  isLocalDebugRequest,
  recordLocalDebugEvent,
  subscribeLocalDebugEvents
};
