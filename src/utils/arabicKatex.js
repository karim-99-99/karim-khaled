import "katex/dist/katex.min.css";
import "katex4arabic/katex-arabic.css";
import {
  renderArabicToString,
  processLatex,
  validateLatex,
} from "katex4arabic";
import katex from "katex";

const TEX_UNIT_PATTERN = /^(?:pt|mm|cm|in|ex|em|mu|px|pc|bp|dd|cc|nd|nc|sp)/;
const DIGIT_CHAR = /[0-9٠-٩۰-۹]/;
const DIGIT_RUN = /[0-9٠-٩۰-۹.,٫٬]/;

/** KaTeX has no metrics for Arabic/Persian digits; wrap digit runs in \mathstrut. */
export function withDigitStruts(latex) {
  const source = String(latex || "");
  let result = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch && DIGIT_CHAR.test(ch)) {
      const prev = i > 0 ? source[i - 1] : "";
      if (prev && /[A-Za-z]/.test(prev)) {
        result += ch;
      } else {
        let j = i;
        while (j < source.length && DIGIT_RUN.test(source[j])) j += 1;
        const run = source.slice(i, j);
        if (TEX_UNIT_PATTERN.test(source.slice(j, j + 2))) {
          result += run;
        } else {
          result += `{\\mathstrut ${run}}`;
        }
        i = j;
        continue;
      }
    } else {
      result += ch ?? "";
    }
    i += 1;
  }
  return result;
}

/** Convert Arabic-Indic / Persian digits in LaTeX source to ASCII 0-9. */
export function arabicToWesternDigits(str) {
  return String(str || "")
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660 + 0x30))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0 + 0x30));
}

export function getArabicKatexOptions({ rtl = true, displayMode = true } = {}) {
  if (!rtl) {
    return {
      numerals: "latin",
      translateFuncs: false,
      translateVars: false,
      translateDiffs: false,
      mirrorSymbols: false,
      mirrorBigOperators: false,
      mirrorSqrt: false,
      mirrorBrackets: false,
      direction: "ltr",
      fullArabicMode: false,
      displayMode,
      throwOnError: false,
      fontFamily: "Amiri",
    };
  }
  return {
    numerals: "arabic",
    translateFuncs: true,
    translateVars: true,
    translateDiffs: true,
    mirrorSymbols: true,
    mirrorBigOperators: true,
    mirrorSqrt: true,
    mirrorBrackets: true,
    direction: "rtl",
    fullArabicMode: true,
    displayMode,
    throwOnError: false,
    fontFamily: "Amiri",
  };
}

export function renderArabicMath(latex, { rtl = true, displayMode = true } = {}) {
  const trimmed = arabicToWesternDigits(String(latex || "")).trim();
  if (!trimmed) return "";
  const options = getArabicKatexOptions({ rtl, displayMode });
  try {
    return renderArabicToString(withDigitStruts(trimmed), options);
  } catch {
    try {
      return katex.renderToString(trimmed, {
        throwOnError: false,
        displayMode: !!displayMode,
      });
    } catch {
      return `<span class="katex-error">${trimmed}</span>`;
    }
  }
}

function inheritSurroundingTextLook(host) {
  if (!host || typeof window === "undefined") return;
  const probe =
    host.previousElementSibling || host.nextElementSibling || host.parentElement;
  if (!probe) return;
  const cs = window.getComputedStyle(probe);
  if (cs.fontFamily) host.style.fontFamily = cs.fontFamily;
  if (cs.fontSize) host.style.fontSize = cs.fontSize;
  const root = host.querySelector(".katex-arabic");
  if (!root) return;
  root.style.setProperty("--ka-size-multiplier", "1");
  if (cs.fontFamily) {
    root.style.setProperty("--ka-font-family", cs.fontFamily);
    root.style.fontFamily = cs.fontFamily;
  } else {
    root.style.setProperty("--ka-font-family", "inherit");
    root.style.fontFamily = "inherit";
  }
  root.style.fontSize = "1em";
}

/** Inline question math: inherit nearby text font/size. Modal preview stays larger. */
export function applyArabicMathHtml(
  element,
  latex,
  { rtl = true, displayMode = false, matchSurroundingText = true } = {},
) {
  if (!element) return null;
  element.classList.remove("math-rtl", "math-ltr");
  element.classList.add("arabic-katex-host");
  element.innerHTML = renderArabicMath(latex, { rtl, displayMode });
  const root = element.querySelector(".katex-arabic");
  if (root) {
    root.classList.remove("size-xl");
    root.style.overflow = "visible";
    if (matchSurroundingText) {
      inheritSurroundingTextLook(element);
    } else {
      root.classList.add("size-xl");
    }
  }
  return root;
}

export { processLatex, validateLatex };
