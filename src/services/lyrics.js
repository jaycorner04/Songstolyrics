const LYRICS_TIMEOUT_MS = 4500;

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function stripTitleNoise(rawTitle = "") {
  return normalizeWhitespace(
    rawTitle
      .replace(/\[[^\]]*(official|lyrics?|audio|video|visualizer|live|4k|hd)[^\]]*\]/gi, "")
      .replace(/\([^\)]*(official|lyrics?|audio|video|visualizer|live|4k|hd)[^\)]*\)/gi, "")
      .replace(/\b(official music video|official video|official audio|lyrics video|visualizer)\b/gi, "")
      .replace(/\s{2,}/g, " ")
  );
}

function cleanSongTitleFragment(value = "") {
  return normalizeWhitespace(
    `${value || ""}`
      .replace(/\b(official|full|video|lyric(?:al)?|audio|visualizer|song|from|movie|album)\b/gi, "")
      .replace(/^[\-:|/]+|[\-:|/]+$/g, "")
  );
}

function cleanUploadedFilenameFragment(value = "") {
  return normalizeWhitespace(
    `${value || ""}`
      .replace(/\b(?:www\.)?[a-z0-9-]+\.(?:com|org|net|cc|in)\b/gi, " ")
      .replace(/\b(?:ytmp3free|youtubemp3free|mp3free|tomp3|mp3juice)\b/gi, " ")
      .replace(/[.]+/g, " ")
      .replace(
        /\b(upload|uploaded|audio|song|music|official|lyrics?|lyrical|video|hd|4k|viral|status|edit|shorts?|reel|instagram|insta)\b/gi,
        ""
      )
      .replace(/\s{2,}/g, " ")
  );
}

function stripFeaturedArtists(value = "") {
  return normalizeWhitespace(
    `${value || ""}`
      .replace(/\s*[\(\[]\s*(feat|ft)\.?\s+[^\)\]]*[\)\]]\s*/gi, " ")
      .replace(/\s+(feat|ft)\.?\s+.+$/gi, "")
  );
}

function normalizeSongTitleForMatching(value = "") {
  return normalizeWhitespace(stripFeaturedArtists(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenizeMatchText(value = "") {
  return normalizeSongTitleForMatching(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function getTokenOverlapRatio(leftValue = "", rightValue = "") {
  const leftTokens = tokenizeMatchText(leftValue);
  const rightTokens = new Set(tokenizeMatchText(rightValue));

  if (!leftTokens.length || !rightTokens.size) {
    return 0;
  }

  const sharedCount = leftTokens.filter((token) => rightTokens.has(token)).length;
  return sharedCount / leftTokens.length;
}

function looksLikeLabelChannel(channelTitle = "") {
  return /\b(saregama|t-series|sony music|zee music|aditya music|lahari|tips|think music|sun music|mango music|mythri|music south)\b/i.test(
    channelTitle || ""
  );
}

function inferSongFromVideo(rawTitle, channelTitle) {
  const cleanedTitle = stripTitleNoise(rawTitle);
  const separators = [" - ", " -", "- ", " | ", " : ", " / "];
  let artist = normalizeWhitespace((channelTitle || "").replace(/- Topic$/i, ""));
  let title = cleanedTitle;
  const primarySegment = cleanSongTitleFragment(cleanedTitle.split(/\s+\|\s+|\s+-\s+|\s+\/\s+|\s+:\s+/)[0]);
  const remainderText = normalizeWhitespace(
    cleanedTitle
      .split(/\s+\|\s+|\s+-\s+|\s+\/\s+|\s+:\s+/)
      .slice(1)
      .join(" ")
  );
  const looksLikePromoVideoTitle =
    /\b(video song|lyric(?:al)? video|official|audio|from|starring|music)\b/i.test(cleanedTitle) ||
    /\|/.test(cleanedTitle);

  if (primarySegment && looksLikePromoVideoTitle) {
    title = stripFeaturedArtists(primarySegment);

    if (looksLikeLabelChannel(channelTitle)) {
      artist = "";
    }
  }

  for (const separator of separators) {
    if (cleanedTitle.includes(separator)) {
      const [left, ...rest] = cleanedTitle.split(separator);
      const right = rest.join(separator);

      if (left && right) {
        const leftClean = cleanSongTitleFragment(left);
        const rightClean = normalizeWhitespace(right);
        const rightLooksLikeMetadata =
          /\b(video song|lyric(?:al)? video|official|audio|from|starring|music|movie|album)\b/i.test(
            rightClean
          ) || /\|/.test(rightClean) || looksLikeLabelChannel(channelTitle);

        if (rightLooksLikeMetadata && leftClean) {
          title = stripFeaturedArtists(leftClean);

          if (looksLikeLabelChannel(channelTitle)) {
            artist = "";
          }
        } else {
          artist = normalizeWhitespace(left);
          title = stripFeaturedArtists(normalizeWhitespace(right));
        }

        break;
      }
    }
  }

  if (!artist && remainderText && /feat|ft\.?/i.test(remainderText)) {
    artist = normalizeWhitespace(remainderText.split(/\bfeat\b|\bft\.?\b/i)[0]);
  }

  return {
    artist,
    title,
    searchQuery: normalizeWhitespace(`${artist} ${title}`) || cleanedTitle,
    cleanedVideoTitle: cleanedTitle
  };
}

function inferSongFromFilename(filename = "") {
  const cleanedFilename = cleanUploadedFilenameFragment(
    `${filename || ""}`
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
  );

  if (!cleanedFilename) {
    return inferSongFromVideo("Uploaded audio", "Uploaded audio");
  }

  const byMatch = cleanedFilename.split(/\s+by\s+/i).map((part) => normalizeWhitespace(part));

  if (byMatch.length === 2 && byMatch[0] && byMatch[1]) {
    return {
      artist: byMatch[1],
      title: stripFeaturedArtists(byMatch[0]),
      searchQuery: normalizeWhitespace(`${byMatch[1]} ${byMatch[0]}`),
      cleanedVideoTitle: cleanedFilename
    };
  }

  const devotionalAnchorIndex = cleanedFilename
    .toLowerCase()
    .split(/\s+/)
    .findIndex((token) =>
      /^(stotram|mantra|bhajan|chalisa|aarti|aarti|slokam|ashtakam|sahasranamam|suprabhatam|keerthana|kirtan)$/.test(
        token
      )
    );
  const devotionalTitle =
    devotionalAnchorIndex >= 0
      ? normalizeWhitespace(
          cleanedFilename
            .split(/\s+/)
            .slice(0, devotionalAnchorIndex + 1)
            .join(" ")
        )
      : "";

  if (devotionalTitle) {
    return {
      artist: "",
      title: stripFeaturedArtists(devotionalTitle),
      searchQuery: devotionalTitle,
      cleanedVideoTitle: cleanedFilename
    };
  }

  const guessedFromTitle = inferSongFromVideo(cleanedFilename, "Uploaded audio");
  const normalizedArtist =
    /^uploaded audio$/i.test(normalizeWhitespace(guessedFromTitle.artist || "")) ? "" : guessedFromTitle.artist;

  return {
    ...guessedFromTitle,
    artist: normalizedArtist,
    searchQuery:
      normalizeWhitespace(`${normalizedArtist} ${guessedFromTitle.title}`) || cleanedFilename,
    cleanedVideoTitle: cleanedFilename
  };
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LYRICS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toLyricsApiBase() {
  return (process.env.LYRICS_OVH_BASE_URL || "https://api.lyrics.ovh").replace(/\/$/, "");
}

function dedupeCandidates(candidates) {
  const seen = new Set();

  return candidates.filter((candidate) => {
    const key = `${candidate.artist.toLowerCase()}::${candidate.title.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function scoreCandidate(candidate, guessedSong) {
  const candidateArtist = candidate.artist.toLowerCase();
  const candidateTitle = normalizeSongTitleForMatching(candidate.title);
  const guessedArtist = (guessedSong.artist || "").toLowerCase();
  const guessedTitle = normalizeSongTitleForMatching(guessedSong.title || "");
  const cleanedVideoTitle = (guessedSong.cleanedVideoTitle || "").toLowerCase();

  let score = 0;

  if (candidateTitle === guessedTitle) {
    score += 80;
  } else if (guessedTitle && candidateTitle.includes(guessedTitle)) {
    score += 40;
  }

  if (candidateArtist === guessedArtist) {
    score += 60;
  } else if (guessedArtist && candidateArtist.includes(guessedArtist)) {
    score += 25;
  }

  if (cleanedVideoTitle.includes(candidateTitle)) {
    score += 25;
  }

  return score;
}

function scoreLrcLibCandidate(candidate, guessedSong, durationSeconds) {
  const normalized = {
    artist: normalizeWhitespace(candidate.artistName || "").toLowerCase(),
    title: normalizeSongTitleForMatching(candidate.trackName || candidate.name || "")
  };
  const guessedArtist = (guessedSong.artist || "").toLowerCase();
  const guessedTitle = normalizeSongTitleForMatching(guessedSong.title || "");
  const cleanedVideoTitle = guessedSong.cleanedVideoTitle || "";

  let score = 0;

  if (normalized.title === guessedTitle) {
    score += 100;
  } else if (guessedTitle && normalized.title.includes(guessedTitle)) {
    score += 60;
  }

  if (normalized.artist === guessedArtist) {
    score += 80;
  } else if (guessedArtist && normalized.artist.includes(guessedArtist)) {
    score += 35;
  }

  if (durationSeconds && candidate.duration) {
    const drift = Math.abs(Number(candidate.duration) - Number(durationSeconds));
    score += Math.max(0, 25 - drift);
  }

  if (candidate.syncedLyrics) {
    score += 30;
  }

  if (candidate.plainLyrics) {
    score += 10;
  }

  score += Math.round(getTokenOverlapRatio(candidate.trackName || candidate.name || "", cleanedVideoTitle) * 40);

  return score;
}

function isRelevantLrcLibCandidate(candidate, guessedSong) {
  const candidateTitle = candidate.trackName || candidate.name || "";
  const candidateArtist = candidate.artistName || "";
  const titleOverlap = Math.max(
    getTokenOverlapRatio(candidateTitle, guessedSong.title || ""),
    getTokenOverlapRatio(candidateTitle, guessedSong.cleanedVideoTitle || "")
  );
  const artistOverlap =
    getTokenOverlapRatio(candidateArtist, guessedSong.artist || "") ||
    getTokenOverlapRatio(guessedSong.artist || "", candidateArtist);

  return titleOverlap >= 0.5 || (titleOverlap >= 0.34 && artistOverlap >= 0.5);
}

function isRelevantLyricsCandidate(candidate, guessedSong) {
  const titleOverlap = Math.max(
    getTokenOverlapRatio(candidate.title || "", guessedSong.title || ""),
    getTokenOverlapRatio(candidate.title || "", guessedSong.cleanedVideoTitle || "")
  );
  const artistOverlap =
    getTokenOverlapRatio(candidate.artist || "", guessedSong.artist || "") ||
    getTokenOverlapRatio(guessedSong.artist || "", candidate.artist || "");

  return titleOverlap >= 0.5 || (titleOverlap >= 0.34 && artistOverlap >= 0.5);
}

async function searchLrcLib(guessedSong, durationSeconds) {
  const url = new URL("https://lrclib.net/api/search");
  url.searchParams.set("track_name", stripFeaturedArtists(guessedSong.title));

  if (guessedSong.artist) {
    url.searchParams.set("artist_name", guessedSong.artist);
  }

  const payload = await fetchJson(url);
  const items = Array.isArray(payload) ? payload : [];

  return items.sort(
    (left, right) =>
      scoreLrcLibCandidate(right, guessedSong, durationSeconds) -
      scoreLrcLibCandidate(left, guessedSong, durationSeconds)
  );
}

function parseLrcTimestamp(timestamp) {
  const match = `${timestamp || ""}`.match(/(\d+):(\d+)(?:\.(\d+))?/);

  if (!match) {
    return null;
  }

  const minutes = Number(match[1] || 0);
  const seconds = Number(match[2] || 0);
  const fractionRaw = match[3] || "0";
  const fraction =
    fractionRaw.length === 2 ? Number(fractionRaw) / 100 : Number(fractionRaw) / 1000;

  return minutes * 60 + seconds + fraction;
}

function parseSyncedLyrics(syncedLyrics, durationSeconds) {
  const rows = `${syncedLyrics || ""}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const starts = [];
  const texts = [];

  for (const row of rows) {
    const match = row.match(/^\[([^\]]+)\]\s*(.*)$/);

    if (!match) {
      continue;
    }

    const start = parseLrcTimestamp(match[1]);
    const text = normalizeWhitespace(match[2]);

    if (start === null || !text) {
      continue;
    }

    starts.push(start);
    texts.push(text);
  }

  if (!texts.length) {
    return [];
  }

  return buildTimedLines(texts, starts, durationSeconds || starts.at(-1) + 4);
}

async function searchLyricsCandidates(guessedSong) {
  const baseUrl = toLyricsApiBase();
  const queries = [guessedSong.searchQuery, guessedSong.title]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .slice(0, 2);

  const rawCandidates = [
    {
      artist: guessedSong.artist,
      title: guessedSong.title
    }
  ];

  const payloads = await Promise.all(
    queries.map((query) => fetchJson(`${baseUrl}/suggest/${encodeURIComponent(query)}`))
  );

  for (const payload of payloads) {
    const items = payload?.data || [];

    for (const item of items.slice(0, 4)) {
      rawCandidates.push({
        artist: normalizeWhitespace(item.artist?.name || ""),
        title: normalizeWhitespace(item.title || "")
      });
    }
  }

  return dedupeCandidates(rawCandidates)
    .filter((candidate) => candidate.artist && candidate.title)
    .sort((left, right) => scoreCandidate(right, guessedSong) - scoreCandidate(left, guessedSong));
}

async function fetchLyricsText(candidate) {
  const baseUrl = toLyricsApiBase();
  const endpoint = `${baseUrl}/v1/${encodeURIComponent(candidate.artist)}/${encodeURIComponent(
    candidate.title
  )}`;
  const payload = await fetchJson(endpoint);
  return payload?.lyrics ? payload.lyrics.replace(/\r/g, "") : "";
}

function parseLyricsLines(lyricsText = "") {
  return lyricsText
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

function buildTimedLines(lines, starts, endBoundary) {
  return lines.map((text, index) => {
    const start = Number(starts[index] || 0);
    const nextStart =
      index < starts.length - 1 ? Number(starts[index + 1]) : Number(endBoundary || start + 4);

    return {
      text,
      start: Math.max(0, start),
      duration: Math.max(1.8, nextStart - start)
    };
  });
}

function limitTimedLinesToDuration(lines, durationSeconds) {
  const duration = Number(durationSeconds || 0);

  if (!duration) {
    return lines;
  }

  return lines
    .filter((line) => Number(line.start || 0) < duration - 0.2)
    .map((line) => ({
      ...line,
      duration: Math.max(0.2, Math.min(Number(line.duration || 0), duration - line.start))
    }))
    .filter((line) => line.duration > 0);
}

function estimateStartsFromDuration(lines, durationSeconds) {
  const lineCount = lines.length;
  const effectiveDuration = Math.max(durationSeconds || 0, lineCount * 2.5, 20);
  const weights = lines.map((line) => Math.max(1, Math.min(line.length, 60)));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  let cumulative = 0;

  return lines.map((line, index) => {
    const start = totalWeight
      ? (cumulative / totalWeight) * effectiveDuration
      : (index / Math.max(lineCount - 1, 1)) * effectiveDuration;
    cumulative += weights[index];
    return start;
  });
}

function getTimingAlignmentWeight(text = "", duration = 0) {
  const wordCount = normalizeWhitespace(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, wordCount * 0.95 + Math.max(0.8, Number(duration || 0)) * 0.42);
}

function alignStartsToCaptions(lines, captionCues, durationSeconds) {
  if (!captionCues.length) {
    return estimateStartsFromDuration(lines, durationSeconds);
  }

  const timeline = captionCues
    .map((cue) => ({
      start: Number(cue.start || 0),
      duration: Math.max(0.8, Number(cue.duration || 0)),
      weight: getTimingAlignmentWeight(cue.text, cue.duration)
    }))
    .filter((cue) => Number.isFinite(cue.start) && cue.start >= 0)
    .sort((left, right) => left.start - right.start);

  if (timeline.length === 1) {
    return estimateStartsFromDuration(lines, durationSeconds);
  }

  const cueTotalWeight = timeline.reduce((sum, cue) => sum + cue.weight, 0) || timeline.length;
  let cueWeightCursor = 0;

  const cueMarkers = timeline.map((cue) => {
    const marker = {
      progress: cueWeightCursor / cueTotalWeight,
      start: cue.start
    };
    cueWeightCursor += cue.weight;
    return marker;
  });
  cueMarkers.push({
    progress: 1,
    start: timeline[timeline.length - 1].start
  });

  const lyricWeights = lines.map((line) => getTimingAlignmentWeight(line));
  const lyricTotalWeight = lyricWeights.reduce((sum, weight) => sum + weight, 0) || lines.length;
  let lyricWeightCursor = 0;

  return lines.map((line, index) => {
    const progress = lyricWeightCursor / lyricTotalWeight;
    lyricWeightCursor += lyricWeights[index];

    const upperIndex = cueMarkers.findIndex((marker) => marker.progress >= progress);

    if (upperIndex <= 0) {
      return cueMarkers[0].start;
    }

    if (upperIndex === -1) {
      return cueMarkers[cueMarkers.length - 1].start;
    }

    const lowerMarker = cueMarkers[upperIndex - 1];
    const upperMarker = cueMarkers[upperIndex];
    const span = Math.max(0.0001, upperMarker.progress - lowerMarker.progress);
    const fraction = Math.max(0, Math.min(1, (progress - lowerMarker.progress) / span));

    return lowerMarker.start + (upperMarker.start - lowerMarker.start) * fraction;
  });
}

function normalizeCaptionCues(captionCues = []) {
  return captionCues.map((cue) => ({
    text: normalizeWhitespace(cue.text),
    start: Number(cue.start || 0),
    duration: Number(cue.duration || 2),
    readableText: cue?.readableText !== false
  }));
}

async function buildLyricsPayload({ rawTitle, channelTitle, durationSeconds, captionCues = [] }) {
  const guessedSong = inferSongFromVideo(rawTitle, channelTitle);
  const lrcLibMatchesPromise = searchLrcLib(guessedSong, durationSeconds);
  const directLyricsPromise = guessedSong.artist && guessedSong.title
    ? fetchLyricsText({
        artist: guessedSong.artist,
        title: guessedSong.title
      })
    : Promise.resolve("");
  const lrcLibMatches = await lrcLibMatchesPromise;
  const bestLrcLibMatch = lrcLibMatches.find((candidate) => isRelevantLrcLibCandidate(candidate, guessedSong));

  if (bestLrcLibMatch?.syncedLyrics) {
    const syncedLines = parseSyncedLyrics(bestLrcLibMatch.syncedLyrics, durationSeconds);

    if (syncedLines.length) {
      return {
        song: {
          artist: normalizeWhitespace(bestLrcLibMatch.artistName || guessedSong.artist),
          title: normalizeWhitespace(bestLrcLibMatch.trackName || bestLrcLibMatch.name || guessedSong.title)
        },
        source: "lrclib",
        syncMode: "synced-lyrics",
        lines: syncedLines
      };
    }
  }

  const candidates = await searchLyricsCandidates(guessedSong);

  let chosenSong = guessedSong;
  let lyricsLines = [];
  const directLyricsText = await directLyricsPromise;
  const directLyricsLines = parseLyricsLines(directLyricsText);

  if (bestLrcLibMatch?.plainLyrics) {
    const parsedLines = parseLyricsLines(bestLrcLibMatch.plainLyrics);

    if (parsedLines.length) {
      chosenSong = {
        artist: normalizeWhitespace(bestLrcLibMatch.artistName || guessedSong.artist),
        title: normalizeWhitespace(bestLrcLibMatch.trackName || bestLrcLibMatch.name || guessedSong.title)
      };
      lyricsLines = parsedLines;
    }
  }

  if (!lyricsLines.length && directLyricsLines.length) {
    lyricsLines = directLyricsLines;
  }

  for (const candidate of candidates.slice(0, 3)) {
    if (lyricsLines.length) {
      break;
    }

    if (!isRelevantLyricsCandidate(candidate, guessedSong)) {
      continue;
    }

    const lyricsText = await fetchLyricsText(candidate);
    const parsedLines = parseLyricsLines(lyricsText);

    if (!parsedLines.length) {
      continue;
    }

    chosenSong = candidate;
    lyricsLines = parsedLines;
    break;
  }

  const normalizedCaptionCues = normalizeCaptionCues(captionCues);

  if (lyricsLines.length) {
    const starts = normalizedCaptionCues.length
      ? alignStartsToCaptions(lyricsLines, normalizedCaptionCues, durationSeconds)
      : estimateStartsFromDuration(lyricsLines, durationSeconds);
    const finalCue = normalizedCaptionCues.at(-1);
    const endBoundary =
      durationSeconds || (finalCue ? finalCue.start + finalCue.duration : 0) || starts.at(-1) + 4;

    const timedLines = buildTimedLines(lyricsLines, starts, endBoundary);

    return {
      song: chosenSong,
      source: bestLrcLibMatch?.plainLyrics ? "lrclib" : "lyrics.ovh",
      syncMode: normalizedCaptionCues.length ? "caption-aligned" : "estimated",
      lines: limitTimedLinesToDuration(timedLines, durationSeconds)
    };
  }

  const readableCaptionCues = normalizedCaptionCues.filter(
    (cue) => cue.text && cue.readableText !== false
  );

  if (readableCaptionCues.length) {
    const finalCue = readableCaptionCues.at(-1);
    const endBoundary = durationSeconds || (finalCue ? finalCue.start + finalCue.duration : 0);

    return {
      song: guessedSong,
      source: "youtube-captions",
      syncMode: "captions",
      lines: buildTimedLines(
        readableCaptionCues.map((cue) => cue.text),
        readableCaptionCues.map((cue) => cue.start),
        endBoundary
      )
    };
  }

  return {
    song: guessedSong,
    source: "unavailable",
    syncMode: "none",
    lines: []
  };
}

module.exports = {
  buildLyricsPayload,
  buildTimedLines,
  estimateStartsFromDuration,
  inferSongFromFilename,
  inferSongFromVideo,
  parseLyricsLines,
  parseSyncedLyrics,
  searchLrcLib
};
