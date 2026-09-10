/** Eastern Arabic-Indic digits used in Egypt/Levant/Gulf UI: ٠١٢٣٤٥٦٧٨٩ */
export const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const WESTERN_OR_PERSIAN_DIGIT = /[0-9\u06F0-\u06F9]/;
const WESTERN_OR_PERSIAN_DIGIT_GLOBAL = /[0-9\u06F0-\u06F9]/g;

const SKIP_TEXT_SELECTOR = [
  "input",
  "textarea",
  "select",
  "option",
  "script",
  "style",
  "noscript",
  "code",
  "pre",
  "kbd",
  "samp",
  "iframe",
  '[contenteditable="true"]',
  "[contenteditable='']",
  ".ql-editor",
  ".ql-tooltip",
  ".ake-textarea",
  "[data-keep-latin-digits]",
].join(",");

const SKIP_ATTR_SELECTOR = [
  "script",
  "style",
  "noscript",
  "code",
  "pre",
  "iframe",
  "[data-keep-latin-digits]",
].join(",");

const TEXT_ATTRS = ["placeholder", "title", "aria-label", "alt", "aria-valuetext"];

export function toArabicIndicDigits(value) {
  return String(value ?? "").replace(WESTERN_OR_PERSIAN_DIGIT_GLOBAL, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x30 && code <= 0x39) return ARABIC_INDIC_DIGITS[code - 0x30];
    return ARABIC_INDIC_DIGITS[code - 0x06f0];
  });
}

export function hasConvertibleDigits(value) {
  return WESTERN_OR_PERSIAN_DIGIT.test(String(value ?? ""));
}

function shouldSkipText(el) {
  return !el || !el.closest || !!el.closest(SKIP_TEXT_SELECTOR);
}

function shouldSkipAttrs(el) {
  return !el || !el.closest || !!el.closest(SKIP_ATTR_SELECTOR);
}

function convertAttributes(el) {
  for (const name of TEXT_ATTRS) {
    if (!el.hasAttribute?.(name)) continue;
    const current = el.getAttribute(name);
    if (!hasConvertibleDigits(current)) continue;
    el.setAttribute(name, toArabicIndicDigits(current));
  }
}

export function applyArabicIndicDigits(root = document.body) {
  if (!root || typeof document === "undefined") return;

  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (parent && !shouldSkipText(parent) && hasConvertibleDigits(root.nodeValue)) {
      root.nodeValue = toArabicIndicDigits(root.nodeValue);
    }
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    if (shouldSkipText(root) && shouldSkipAttrs(root)) return;
    if (!shouldSkipAttrs(root)) convertAttributes(root);
    if (shouldSkipText(root)) return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!hasConvertibleDigits(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || shouldSkipText(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  for (const textNode of nodes) {
    textNode.nodeValue = toArabicIndicDigits(textNode.nodeValue);
  }

  if (root.querySelectorAll) {
    root.querySelectorAll("[placeholder], [title], [aria-label], [alt], [aria-valuetext]").forEach((el) => {
      if (!shouldSkipAttrs(el)) convertAttributes(el);
    });
  }
}

export function startArabicIndicDigitsObserver(root = document.body) {
  if (!root || typeof MutationObserver === "undefined") return () => {};

  applyArabicIndicDigits(root);

  const observer = new MutationObserver((mutations) => {
    observer.disconnect();
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        applyArabicIndicDigits(mutation.target);
        continue;
      }
      if (mutation.type === "attributes") {
        applyArabicIndicDigits(mutation.target);
        continue;
      }
      mutation.addedNodes.forEach((added) => applyArabicIndicDigits(added));
    }
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TEXT_ATTRS,
    });
  });

  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: TEXT_ATTRS,
  });

  return () => observer.disconnect();
}

/** Saudi date/time with Arabic-Indic digits. */
export const ARABIC_NUMBER_LOCALE = "ar-SA-u-nu-arab";
