function normalizeWhitespace(value = "") {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

const TELUGU_SCRIPT_PATTERN = /[\u0C00-\u0C7F]/u;
const DEVANAGARI_SCRIPT_PATTERN = /[\u0900-\u097F]/u;
const ROMANIZED_TELUGU_HINT_PATTERN =
  /\b(telugu|tollywood|andhra|telangana|vadhine|vadine|mardhal|maradhal|maradalu|yemi|emi|cheyamanduve|cheyyamanduve|cheyya|nuvvu|ninnu|neeku|naaku|nenu|nanne|neeve|raave|rara|pilla|bangaram|prema|manasu|chinni|chinna|amma|ayya|annayya|akka|bava|enduke|enduko|ledu|kadha|kada)\b/i;

function buildIndicRomanizer({
  scriptPattern,
  independentVowels,
  vowelSigns,
  consonants,
  symbols,
  digits,
  virama,
  anusvara,
  chandrabindu
}) {
  function romanizeAnusvara(nextCharacter = "") {
    const base = consonants[nextCharacter];

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

  return function romanizeIndicText(value = "") {
    const input = `${value || ""}`;

    if (!scriptPattern.test(input)) {
      return normalizeWhitespace(input);
    }

    let output = "";

    for (let index = 0; index < input.length; index += 1) {
      const character = input[index];
      const nextCharacter = input[index + 1];

      if (independentVowels[character]) {
        output += independentVowels[character];
        continue;
      }

      if (consonants[character]) {
        const base = consonants[character];

        if (nextCharacter === virama) {
          output += base;
          index += 1;
          continue;
        }

        if (vowelSigns[nextCharacter]) {
          output += `${base}${vowelSigns[nextCharacter]}`;
          index += 1;
          continue;
        }

        output += `${base}a`;
        continue;
      }

      if (character === anusvara || character === chandrabindu) {
        output += romanizeAnusvara(nextCharacter);
        continue;
      }

      if (symbols[character]) {
        output += symbols[character];
        continue;
      }

      if (digits[character]) {
        output += digits[character];
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
  };
}

const romanizeTeluguText = buildIndicRomanizer({
  scriptPattern: TELUGU_SCRIPT_PATTERN,
  independentVowels: {
    "\u0C05": "a",
    "\u0C06": "aa",
    "\u0C07": "i",
    "\u0C08": "ee",
    "\u0C09": "u",
    "\u0C0A": "oo",
    "\u0C0B": "ru",
    "\u0C60": "ruu",
    "\u0C0C": "lu",
    "\u0C61": "luu",
    "\u0C0E": "e",
    "\u0C0F": "ee",
    "\u0C10": "ai",
    "\u0C12": "o",
    "\u0C13": "oo",
    "\u0C14": "au"
  },
  vowelSigns: {
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
  },
  consonants: {
    "\u0C15": "k",
    "\u0C16": "kh",
    "\u0C17": "g",
    "\u0C18": "gh",
    "\u0C19": "ng",
    "\u0C1A": "ch",
    "\u0C1B": "chh",
    "\u0C1C": "j",
    "\u0C1D": "jh",
    "\u0C1E": "ny",
    "\u0C1F": "t",
    "\u0C20": "th",
    "\u0C21": "d",
    "\u0C22": "dh",
    "\u0C23": "n",
    "\u0C24": "t",
    "\u0C25": "th",
    "\u0C26": "d",
    "\u0C27": "dh",
    "\u0C28": "n",
    "\u0C2A": "p",
    "\u0C2B": "ph",
    "\u0C2C": "b",
    "\u0C2D": "bh",
    "\u0C2E": "m",
    "\u0C2F": "y",
    "\u0C30": "r",
    "\u0C31": "r",
    "\u0C32": "l",
    "\u0C33": "l",
    "\u0C35": "v",
    "\u0C36": "sh",
    "\u0C37": "sh",
    "\u0C38": "s",
    "\u0C39": "h"
  },
  symbols: {
    "\u0C03": "h"
  },
  digits: {
    "\u0C66": "0",
    "\u0C67": "1",
    "\u0C68": "2",
    "\u0C69": "3",
    "\u0C6A": "4",
    "\u0C6B": "5",
    "\u0C6C": "6",
    "\u0C6D": "7",
    "\u0C6E": "8",
    "\u0C6F": "9"
  },
  virama: "\u0C4D",
  anusvara: "\u0C02",
  chandrabindu: "\u0C01"
});

const romanizeDevanagariText = buildIndicRomanizer({
  scriptPattern: DEVANAGARI_SCRIPT_PATTERN,
  independentVowels: {
    "\u0905": "a",
    "\u0906": "aa",
    "\u0907": "i",
    "\u0908": "ee",
    "\u0909": "u",
    "\u090A": "oo",
    "\u090B": "ru",
    "\u0960": "ruu",
    "\u090C": "lu",
    "\u0961": "luu",
    "\u090F": "e",
    "\u0910": "ai",
    "\u0913": "o",
    "\u0914": "au"
  },
  vowelSigns: {
    "\u093E": "aa",
    "\u093F": "i",
    "\u0940": "ee",
    "\u0941": "u",
    "\u0942": "oo",
    "\u0943": "ru",
    "\u0944": "ruu",
    "\u0962": "lu",
    "\u0963": "luu",
    "\u0947": "e",
    "\u0948": "ai",
    "\u094B": "o",
    "\u094C": "au"
  },
  consonants: {
    "\u0915": "k",
    "\u0916": "kh",
    "\u0917": "g",
    "\u0918": "gh",
    "\u0919": "ng",
    "\u091A": "ch",
    "\u091B": "chh",
    "\u091C": "j",
    "\u091D": "jh",
    "\u091E": "ny",
    "\u091F": "t",
    "\u0920": "th",
    "\u0921": "d",
    "\u0922": "dh",
    "\u0923": "n",
    "\u0924": "t",
    "\u0925": "th",
    "\u0926": "d",
    "\u0927": "dh",
    "\u0928": "n",
    "\u092A": "p",
    "\u092B": "ph",
    "\u092C": "b",
    "\u092D": "bh",
    "\u092E": "m",
    "\u092F": "y",
    "\u0930": "r",
    "\u0932": "l",
    "\u0933": "l",
    "\u0935": "v",
    "\u0936": "sh",
    "\u0937": "sh",
    "\u0938": "s",
    "\u0939": "h",
    "\u0958": "q",
    "\u0959": "kh",
    "\u095A": "gh",
    "\u095B": "z",
    "\u095C": "d",
    "\u095D": "rh",
    "\u095E": "f",
    "\u095F": "y"
  },
  symbols: {
    "\u0903": "h",
    "\u093D": "'"
  },
  digits: {
    "\u0966": "0",
    "\u0967": "1",
    "\u0968": "2",
    "\u0969": "3",
    "\u096A": "4",
    "\u096B": "5",
    "\u096C": "6",
    "\u096D": "7",
    "\u096E": "8",
    "\u096F": "9"
  },
  virama: "\u094D",
  anusvara: "\u0902",
  chandrabindu: "\u0901"
});

function containsTeluguScript(value = "") {
  return TELUGU_SCRIPT_PATTERN.test(`${value || ""}`);
}

function containsDevanagariScript(value = "") {
  return DEVANAGARI_SCRIPT_PATTERN.test(`${value || ""}`);
}

function containsIndicPhoneticScript(value = "") {
  const input = `${value || ""}`;
  return containsTeluguScript(input) || containsDevanagariScript(input);
}

function containsRomanizedTeluguHint(value = "") {
  return ROMANIZED_TELUGU_HINT_PATTERN.test(normalizeWhitespace(value));
}

function romanizeLyricLines(lines = []) {
  let changed = false;

  const romanizedLines = (Array.isArray(lines) ? lines : []).map((line) => {
    const text = `${line?.text || ""}`;

    if (containsTeluguScript(text)) {
      changed = true;
      return {
        ...line,
        text: romanizeTeluguText(text)
      };
    }

    if (containsDevanagariScript(text)) {
      changed = true;
      return {
        ...line,
        text: romanizeDevanagariText(text)
      };
    }

    return line;
  });

  return {
    changed,
    lines: romanizedLines
  };
}

module.exports = {
  containsDevanagariScript,
  containsIndicPhoneticScript,
  containsRomanizedTeluguHint,
  containsTeluguScript,
  romanizeDevanagariText,
  romanizeLyricLines,
  romanizeTeluguText
};
