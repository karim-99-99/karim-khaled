const SIZE_CLASSES = ["ql-size-small", "ql-size-large", "ql-size-huge"];
const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const SKIP_CLOSEST = ".katex, .katex-html, .katex-mathml, svg";

function stripSizeFromStyle(styleValue) {
  if (!styleValue) return "";
  return styleValue
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.split(":")[0].trim().toLowerCase();
      return key !== "font-size" && key !== "line-height" && key !== "font";
    })
    .join("; ");
}

/** Flatten mixed Quill/heading sizes so a question reads at one type size. */
export function normalizeQuestionTypography(html) {
  if (html == null || typeof html !== "string") return html;
  const source = html.trim();
  if (!source) return html;
  if (typeof document === "undefined") return html;

  const root = document.createElement("div");
  root.innerHTML = html;

  root.querySelectorAll("h1, h2, h3, h4, h5, h6, big, small, font").forEach((el) => {
    const span = document.createElement("span");
    span.innerHTML = el.innerHTML;
    for (const { name, value } of Array.from(el.attributes)) {
      if (name === "size" || name === "face") continue;
      if (name === "style") {
        const cleaned = stripSizeFromStyle(value);
        if (cleaned) span.setAttribute("style", cleaned);
        continue;
      }
      span.setAttribute(name, value);
    }
    el.replaceWith(span);
  });

  root.querySelectorAll(".ql-size-small, .ql-size-large, .ql-size-huge").forEach((el) => {
    el.classList.remove(...SIZE_CLASSES);
    if (!el.className.trim()) el.removeAttribute("class");
  });

  root.querySelectorAll(".katex-arabic").forEach((el) => {
    el.classList.remove("size-sm", "size-md", "size-lg", "size-xl", "size-2xl");
  });

  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  nodes.forEach((el) => {
    if (el.closest(SKIP_CLOSEST) && !el.classList.contains("math-equation")) return;
    if (el.tagName === "IMG" || el.tagName === "SVG") return;
    if (HEADING_TAGS.has(el.tagName)) return;
    if (!el.hasAttribute("style")) return;
    const cleaned = stripSizeFromStyle(el.getAttribute("style"));
    if (cleaned) el.setAttribute("style", cleaned);
    else el.removeAttribute("style");
  });

  return root.innerHTML;
}
