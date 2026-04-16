function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

const TELUGU_SCRIPT_PATTERN = /[\u0C00-\u0C7F]/u;
const VIRAMA = "\u0C4D";

const INDEPENDENT_VOWELS = {
  "అ": "a",
  "ఆ": "aa",
  "ఇ": "i",
  "ఈ": "ee",
  "ఉ": "u",
  "ఊ": "oo",
  "ఋ": "ru",
  "ౠ": "ruu",
  "ఌ": "lu",
  "ౡ": "luu",
  "ఎ": "e",
  "ఏ": "ee",
  "ఐ": "ai",
  "ఒ": "o",
  "ఓ": "oo",
  "ఔ": "au"
};

const VOWEL_SIGNS = {
  "\u0C3E": "aa",
  "\u0C3F": "i",
  "\u0C40": "ee",
  "\u0C41": "u",
  "\u0C42": "oo",
  "\u0C43": "ru",
  "\u0C44": "ruu",
  "\u0C62": "lu",
  "\u0C63": "luu",
  "\u0C46": "e",
  "\u0C47": "ee",
  "\u0C48": "ai",
  "\u0C4A": "o",
  "\u0C4B": "oo",
  "\u0C4C": "au"
};

const CONSONANTS = {
  "క": "k",
  "ఖ": "kh",
  "గ": "g",
  "ఘ": "gh",
  "ఙ": "ng",
  "చ": "ch",
  "ఛ": "chh",
  "జ": "j",
  "ఝ": "jh",
  "ఞ": "ny",
  "ట": "t",
  "ఠ": "th",
  "డ": "d",
  "ఢ": "dh",
  "ణ": "n",
  "త": "t",
  "థ": "th",
  "ద": "d",
  "ధ": "dh",
  "న": "n",
  "ప": "p",
  "ఫ": "ph",
  "బ": "b",
  "భ": "bh",
  "మ": "m",
  "య": "y",
  "ర": "r",
  "ఱ": "r",
  "ల": "l",
  "ళ": "l",
  "వ": "v",
  "శ": "sh",
  "ష": "sh",
  "స": "s",
  "హ": "h"
};

const SYMBOLS = {
  "ః": "h",
  "ఁ": "m"
};

const DIGITS = {
  "౦": "0",
  "౧": "1",
  "౨": "2",
  "౩": "3",
  "౪": "4",
  "౫": "5",
  "౬": "6",
  "౭": "7",
  "౮": "8",
  "౯": "9"
};

function containsTeluguScript(value = "") {
  return TELUGU_SCRIPT_PATTERN.test(`${value || ""}`);
}

function romanizeAnusvara(nextCharacter = "") {
  const base = CONSONANTS[nextCharacter];

  if (!base) {
    return "m";
  }

  if (/^(k|kh|g|gh)$/.test(base)) {
    return "ng";
  }

  if (/^(ch|chh|j|jh|ny)$/.test(base)) {
    return "n";
  }

  if (/^(t|th|d|dh|n)$/.test(base)) {
    return "n";
  }

  if (/^(p|ph|b|bh|m)$/.test(base)) {
    return "m";
  }

  return "n";
}

function romanizeTeluguText(value = "") {
  const input = `${value || ""}`;

  if (!containsTeluguScript(input)) {
    return normalizeWhitespace(input);
  }

  let output = "";

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (INDEPENDENT_VOWELS[character]) {
      output += INDEPENDENT_VOWELS[character];
      continue;
    }

    if (CONSONANTS[character]) {
      const base = CONSONANTS[character];

      if (nextCharacter === VIRAMA) {
        output += base;
        index += 1;
        continue;
      }

      if (VOWEL_SIGNS[nextCharacter]) {
        output += `${base}${VOWEL_SIGNS[nextCharacter]}`;
        index += 1;
        continue;
      }

      output += `${base}a`;
      continue;
    }

    if (character === "ం") {
      output += romanizeAnusvara(nextCharacter);
      continue;
    }

    if (SYMBOLS[character]) {
      output += SYMBOLS[character];
      continue;
    }

    if (DIGITS[character]) {
      output += DIGITS[character];
      continue;
    }

    output += character;
  }

  return normalizeWhitespace(
    output
      .replace(/\s+([,.!?;:])/g, "$1")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
  );
}

function romanizeLyricLines(lines = []) {
  let changed = false;

  const romanizedLines = (Array.isArray(lines) ? lines : []).map((line) => {
    const text = `${line?.text || ""}`;

    if (!containsTeluguScript(text)) {
      return line;
    }

    changed = true;
    return {
      ...line,
      text: romanizeTeluguText(text)
    };
  });

  return {
    changed,
    lines: romanizedLines
  };
}

module.exports = {
  containsTeluguScript,
  romanizeLyricLines,
  romanizeTeluguText
};
