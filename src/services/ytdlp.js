function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function parseEnvList(value = "") {
  return normalizeWhitespace(value)
    .split(",")
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean);
}

function getScopedEnvName(kind = "") {
  return `YTDLP_${String(kind || "").toUpperCase()}_CLIENTS`;
}

function resolvePlayerClients(kind = "", fallbackClients = "") {
  const scopedClients = parseEnvList(process.env[getScopedEnvName(kind)] || "");

  if (scopedClients.length) {
    return scopedClients;
  }

  const genericClients = parseEnvList(process.env.YTDLP_YOUTUBE_CLIENTS || "");

  if (genericClients.length) {
    return genericClients;
  }

  return parseEnvList(fallbackClients);
}

function buildYtDlpArgs(options = {}) {
  const {
    kind = "",
    fallbackClients = "",
    includeCookieFile = true
  } = options;
  const args = [];
  const configFile = normalizeWhitespace(process.env.YTDLP_CONFIG_FILE || "");

  if (configFile) {
    args.push("--config-locations", configFile);
  } else {
    // Ignore user/home yt-dlp config so local and deployed behavior stay aligned.
    args.push("--ignore-config");
  }

  if (includeCookieFile) {
    const cookieFile = normalizeWhitespace(process.env.YTDLP_COOKIE_FILE || "");

    if (cookieFile) {
      args.push("--cookies", cookieFile);
    }
  }

  const extractorArgs = [];
  const playerClients = resolvePlayerClients(kind, fallbackClients);

  if (playerClients.length) {
    extractorArgs.push(`youtube:player_client=${playerClients.join(",")}`);
  }

  const playerSkip = normalizeWhitespace(process.env.YTDLP_PLAYER_SKIP || "");

  if (playerSkip) {
    extractorArgs.push(`youtube:player_skip=${playerSkip}`);
  }

  const visitorData = normalizeWhitespace(process.env.YTDLP_VISITOR_DATA || "");

  if (visitorData) {
    extractorArgs.push(`youtube:visitor_data=${visitorData}`);
  }

  const poToken = normalizeWhitespace(process.env.YTDLP_PO_TOKEN || "");

  if (poToken) {
    const poTokenClient =
      normalizeWhitespace(process.env.YTDLP_PO_TOKEN_CLIENT || "") ||
      playerClients[0] ||
      "web";
    extractorArgs.push(`youtube:po_token=${poTokenClient}+${poToken}`);
  }

  const youtubetabSkip = normalizeWhitespace(process.env.YTDLP_YOUTUBETAB_SKIP || "");

  if (youtubetabSkip) {
    args.push("--extractor-args", `youtubetab:skip=${youtubetabSkip}`);
  }

  extractorArgs.forEach((entry) => {
    args.push("--extractor-args", entry);
  });

  return args;
}

module.exports = {
  buildYtDlpArgs
};
