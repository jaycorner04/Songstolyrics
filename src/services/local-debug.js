const LOCAL_DEBUG_MAX_ENTRIES = 80;

const localDebugEvents = [];
let nextLocalDebugId = 1;

function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function normalizeHost(value = "") {
  return `${value || ""}`
    .trim()
    .replace(/^\[|\]$/g, "")
    .split(":")[0]
    .toLowerCase();
}

function isLoopbackHost(value = "") {
  const host = normalizeHost(value);
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isLocalDebugRequest(req = {}) {
  const host = normalizeHost(req.hostname || req.headers?.host || "");
  const ip = normalizeHost(req.ip || req.socket?.remoteAddress || "");
  return isLoopbackHost(host) || isLoopbackHost(ip);
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

  if (localDebugEvents.length > LOCAL_DEBUG_MAX_ENTRIES) {
    localDebugEvents.length = LOCAL_DEBUG_MAX_ENTRIES;
  }

  return entry;
}

function getLocalDebugEvents() {
  return [...localDebugEvents];
}

function clearLocalDebugEvents() {
  localDebugEvents.length = 0;
}

function deleteLocalDebugEvent(id) {
  const targetId = Number(id || 0);

  if (!targetId) {
    return false;
  }

  const index = localDebugEvents.findIndex((entry) => Number(entry?.id || 0) === targetId);

  if (index === -1) {
    return false;
  }

  localDebugEvents.splice(index, 1);
  return true;
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
  recordLocalDebugEvent
};
