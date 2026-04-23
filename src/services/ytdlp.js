const fs = require("fs");
const path = require("path");

const { runtimeRoot } = require("../config/runtime");

function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function parseEnvList(value = "") {
  return normalizeWhitespace(value)
    .split(",")
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean);
}

function parseSemicolonList(value = "") {
  return `${value || ""}`
    .split(";")
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean);
}

function uniqueList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function toEnvToken(value = "") {
  return `${value || ""}`
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function getScopedEnvName(kind = "") {
  return `YTDLP_${String(kind || "").toUpperCase()}_CLIENTS`;
}

function getScopedProfileEnvName(kind = "") {
  const token = toEnvToken(kind || "");
  return token ? `YTDLP_${token}_PROFILE_CHAIN` : "";
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

function resolveCookieFilePath() {
  const explicitCookieFile = normalizeWhitespace(process.env.YTDLP_COOKIE_FILE || "");

  const candidatePaths = [
    explicitCookieFile,
    path.join(runtimeRoot, "youtube-cookies.txt"),
    path.join(runtimeRoot, "yt-dlp-cookies.txt")
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    try {
      const stats = fs.statSync(candidatePath);

      if (stats.isFile() && Number(stats.size || 0) > 0) {
        return candidatePath;
      }
    } catch {}
  }

  return "";
}

function resolveProxyUrl(target = "") {
  const token = toEnvToken(target);
  const scopedNames = token
    ? [
        `YTDLP_${token}_PROXY_URL`,
        `YTDLP_${token}_PROXY`,
        `${token}_PROXY_URL`,
        `${token}_PROXY`
      ]
    : [];

  const fallbackNames = [
    "YTDLP_PROXY_URL",
    "YTDLP_PROXY",
    "HTTP_PROXY",
    "HTTPS_PROXY"
  ];

  for (const envName of [...scopedNames, ...fallbackNames]) {
    const value = normalizeWhitespace(process.env[envName] || "");

    if (value) {
      return value;
    }
  }

  return "";
}

function resolveProfileChain(kind = "") {
  const scopedName = getScopedProfileEnvName(kind);
  const scopedProfiles = scopedName ? parseEnvList(process.env[scopedName] || "") : [];

  if (scopedProfiles.length) {
    return uniqueList(scopedProfiles);
  }

  const genericProfiles = parseEnvList(process.env.YTDLP_PROFILE_CHAIN || "");

  if (genericProfiles.length) {
    return uniqueList(genericProfiles);
  }

  return ["default"];
}

function resolveProfileExtras(profile = "", kind = "") {
  const normalizedProfile = normalizeWhitespace(profile || "").toLowerCase();
  const args = [];
  const extractorArgs = [];

  if (normalizedProfile === "ejs" || normalizedProfile === "aggressive") {
    const remoteComponents = parseEnvList(process.env.YTDLP_REMOTE_COMPONENTS || "ejs:github");

    remoteComponents.forEach((component) => {
      args.push("--remote-components", component);
    });

    const jsRuntimes = normalizeWhitespace(process.env.YTDLP_JS_RUNTIMES || "node");

    if (jsRuntimes) {
      args.push("--js-runtimes", jsRuntimes);
    }
  }

  if (normalizedProfile === "bgutil" || normalizedProfile === "aggressive") {
    const pluginDirs = parseEnvList(process.env.YTDLP_PLUGIN_DIRS || "");

    pluginDirs.forEach((pluginDirectory) => {
      args.push("--plugin-dirs", pluginDirectory);
    });

    const remoteComponents = parseEnvList(process.env.YTDLP_REMOTE_COMPONENTS || "ejs:github");

    remoteComponents.forEach((component) => {
      args.push("--remote-components", component);
    });

    const jsRuntimes = normalizeWhitespace(process.env.YTDLP_JS_RUNTIMES || "node");

    if (jsRuntimes) {
      args.push("--js-runtimes", jsRuntimes);
    }

    const bgutilBaseUrl = normalizeWhitespace(process.env.YTDLP_BGUTIL_BASE_URL || "");

    if (bgutilBaseUrl) {
      extractorArgs.push(`youtubepot-bgutilhttp:base_url=${bgutilBaseUrl}`);
    }

    const bgutilServerHome = normalizeWhitespace(process.env.YTDLP_BGUTIL_SERVER_HOME || "");

    if (bgutilServerHome) {
      extractorArgs.push(`youtubepot-bgutilscript:server_home=${bgutilServerHome}`);
    }
  }

  if (normalizedProfile === "aggressive") {
    const aggressiveClients = parseEnvList(
      process.env.YTDLP_AGGRESSIVE_CLIENTS ||
        process.env[getScopedEnvName(kind)] ||
        process.env.YTDLP_YOUTUBE_CLIENTS ||
        "android,web,ios,mweb,tv,tv_simply"
    );

    if (aggressiveClients.length) {
      extractorArgs.push(`youtube:player_client=${aggressiveClients.join(",")}`);
    }
  }

  return {
    args,
    extractorArgs
  };
}

function buildYtDlpArgs(options = {}) {
  const {
    kind = "",
    fallbackClients = "",
    includeCookieFile = true,
    profile = ""
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
    const cookieFile = resolveCookieFilePath();

    if (cookieFile) {
      args.push("--cookies", cookieFile);
    }
  }

  const proxyUrl = resolveProxyUrl(kind);

  if (proxyUrl) {
    args.push("--proxy", proxyUrl);
  }

  const remoteComponents = parseEnvList(process.env.YTDLP_REMOTE_COMPONENTS || "");

  remoteComponents.forEach((component) => {
    args.push("--remote-components", component);
  });

  const pluginDirs = parseEnvList(process.env.YTDLP_PLUGIN_DIRS || "");

  pluginDirs.forEach((pluginDirectory) => {
    args.push("--plugin-dirs", pluginDirectory);
  });

  const jsRuntimes = normalizeWhitespace(process.env.YTDLP_JS_RUNTIMES || "");

  if (jsRuntimes) {
    args.push("--js-runtimes", jsRuntimes);
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

  const bgutilBaseUrl = normalizeWhitespace(process.env.YTDLP_BGUTIL_BASE_URL || "");

  if (bgutilBaseUrl) {
    extractorArgs.push(`youtubepot-bgutilhttp:base_url=${bgutilBaseUrl}`);
  }

  const bgutilServerHome = normalizeWhitespace(process.env.YTDLP_BGUTIL_SERVER_HOME || "");

  if (bgutilServerHome) {
    extractorArgs.push(`youtubepot-bgutilscript:server_home=${bgutilServerHome}`);
  }

  const extraExtractorArgs = parseSemicolonList(process.env.YTDLP_EXTRACTOR_ARGS_EXTRA || "");

  extractorArgs.push(...extraExtractorArgs);

  const profileExtras = resolveProfileExtras(profile, kind);

  args.push(...profileExtras.args);
  extractorArgs.push(...profileExtras.extractorArgs);

  const youtubetabSkip = normalizeWhitespace(process.env.YTDLP_YOUTUBETAB_SKIP || "");

  if (youtubetabSkip) {
    args.push("--extractor-args", `youtubetab:skip=${youtubetabSkip}`);
  }

  extractorArgs.forEach((entry) => {
    args.push("--extractor-args", entry);
  });

  return args;
}

function buildYtDlpArgVariants(options = {}) {
  const kind = options.kind || "";
  const explicitProfile = normalizeWhitespace(options.profile || "");
  const profiles = explicitProfile ? [explicitProfile] : resolveProfileChain(kind);
  const variants = [];
  const seen = new Set();

  profiles.forEach((profile) => {
    const args = buildYtDlpArgs({
      ...options,
      profile
    });
    const signature = JSON.stringify(args);

    if (!seen.has(signature)) {
      seen.add(signature);
      variants.push({
        profile: profile || "default",
        args
      });
    }
  });

  if (!variants.length) {
    return [
      {
        profile: "default",
        args: buildYtDlpArgs(options)
      }
    ];
  }

  return variants;
}

module.exports = {
  buildYtDlpArgs,
  buildYtDlpArgVariants,
  resolveCookieFilePath,
  resolveProxyUrl
};
