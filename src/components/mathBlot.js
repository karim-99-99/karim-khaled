import { applyArabicMathHtml } from "../utils/arabicKatex";

let QuillInstance = null;

export const setQuillInstance = (quill) => {
  if (quill) {
    QuillInstance = quill;
  }
};

const getQuill = () => QuillInstance;

const getEmbed = () => {
  const Quill = getQuill();
  if (!Quill || typeof Quill.import !== "function") {
    return null;
  }

  try {
    const embed = Quill.import("blots/embed");
    if (embed && typeof embed === "function") return embed;
  } catch (e) {
    console.warn("Failed to import blots/embed:", e);
  }

  try {
    const Parchment = Quill.import("parchment");
    if (Parchment && Parchment.Embed && typeof Parchment.Embed === "function") {
      return Parchment.Embed;
    }
  } catch (e) {
    console.warn("Failed to import parchment Embed:", e);
  }

  try {
    const blockEmbed = Quill.import("blots/block/embed");
    if (blockEmbed && typeof blockEmbed === "function") return blockEmbed;
  } catch (e) {
    console.warn("Failed to import blots/block/embed:", e);
  }

  console.error("Could not find any suitable Embed class for MathBlot");
  return null;
};

const parseMathValue = (value) => {
  let latexValue = "";
  let isRTL = true;

  if (!value) {
    return { latexValue, isRTL };
  }
  if (typeof value === "string") {
    if (value.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && parsed.latex) {
          latexValue = parsed.latex;
          isRTL = parsed.rtl !== undefined ? parsed.rtl : true;
        } else {
          latexValue = value;
        }
      } catch {
        latexValue = value;
      }
    } else {
      latexValue = value;
    }
  } else if (typeof value === "object" && value !== null) {
    latexValue = value.latex || String(value);
    isRTL = value.rtl !== undefined ? value.rtl : true;
  } else {
    latexValue = String(value);
  }

  return { latexValue, isRTL };
};

let MathBlot = null;
let EmbedClass = null;

const createMathBlotClass = () => {
  if (MathBlot) return MathBlot;

  try {
    EmbedClass = getEmbed();
    if (!EmbedClass || typeof EmbedClass !== "function") {
      console.warn("EmbedClass not available for MathBlot");
      return null;
    }

    MathBlot = class MathBlot extends EmbedClass {
      static blotName = "math";
      static tagName = "span";
      static className = "math-equation";

      static create(value) {
        const node = super.create();
        const { latexValue, isRTL } = parseMathValue(value);

        node.setAttribute("data-latex", latexValue);
        node.setAttribute("data-rtl", isRTL ? "true" : "false");
        node.setAttribute("contenteditable", "false");
        node.setAttribute(
          "data-edit-hint",
          "Click to edit equation / انقر للتعديل",
        );
        node.setAttribute(
          "title",
          "Double-click to edit equation / انقر نقراً مزدوجاً للتعديل",
        );
        node.setAttribute("dir", isRTL ? "rtl" : "ltr");
        node.style.display = "inline-block";
        node.style.verticalAlign = "middle";
        node.style.overflow = "visible";
        node.style.cursor = "pointer";

        try {
          applyArabicMathHtml(node, latexValue, { rtl: isRTL, displayMode: false });
        } catch (e) {
          console.error("KaTeX render error:", e);
          node.innerHTML = latexValue || "";
        }

        return node;
      }

      static value(node) {
        return node.getAttribute("data-latex") || "";
      }

      static formats(node) {
        return node.getAttribute("data-latex") || "";
      }
    };

    return MathBlot;
  } catch (e) {
    console.warn("Failed to create MathBlot class:", e);
    return null;
  }
};

let isRegistered = false;
let registrationAttempted = false;

const registerMathBlot = () => {
  if (isRegistered) return true;

  try {
    const Quill = getQuill();
    if (
      !Quill ||
      typeof Quill.import !== "function" ||
      typeof Quill.register !== "function"
    ) {
      console.warn("Quill not ready for MathBlot registration");
      return false;
    }
    if (registrationAttempted) return false;
    registrationAttempted = true;

    const MathBlotClass = getMathBlot();
    if (!MathBlotClass) {
      console.warn(
        "MathBlot class could not be created - math equations will be disabled",
      );
      return false;
    }

    try {
      const existingFormat = Quill.import("formats/math", true);
      const existingBlot = Quill.import("blots/math", true);
      if (existingFormat || existingBlot) {
        isRegistered = true;
        return true;
      }
    } catch {
      // Not registered yet
    }

    Quill.register(MathBlotClass);
    isRegistered = true;
    return true;
  } catch (e) {
    console.error("Failed to register MathBlot - math equations will be disabled:", e);
    return false;
  }
};

const getMathBlot = () => {
  if (!MathBlot) {
    MathBlot = createMathBlotClass();
  }
  return MathBlot;
};

export default getMathBlot;
export { createMathBlotClass, registerMathBlot };
