import { useEffect, useMemo, useRef, useState } from "react";
import { isArabicBrowser } from "../utils/language";
import {
  getArabicKatexOptions,
  processLatex,
  renderArabicMath,
  validateLatex,
  withDigitStruts,
} from "../utils/arabicKatex";
import "./arabicKatexEditor.css";

const TOOLBAR = [
  {
    group: "جذور",
    items: [
      { title: "جذر تربيعي", visual: "√□", snippet: "\\sqrt{#}" },
      { title: "جذر تكعيبي", visual: "∛□", snippet: "\\sqrt[3]{#}" },
      { title: "جذر نوني", visual: "ⁿ√□", snippet: "\\sqrt[#]{#}" },
    ],
  },
  {
    group: "أسس",
    items: [
      { title: "تربيع", visual: "□²", snippet: "^{2}" },
      { title: "أس", visual: "□ⁿ", snippet: "^{#}" },
      { title: "دليل", visual: "□ₙ", snippet: "_{#}" },
    ],
  },
  {
    group: "كسور",
    items: [
      { title: "كسر", visual: "□/□", snippet: "\\frac{#}{#}" },
      { title: "كسر مختلط", visual: "٣□/□", snippet: "#\\frac{#}{#}" },
    ],
  },
  {
    group: "دوال",
    items: [
      { title: "جيب", visual: "جا", snippet: "\\sin(#)" },
      { title: "جيب التمام", visual: "جتا", snippet: "\\cos(#)" },
      { title: "نهاية", visual: "نها", snippet: "\\lim_{# \\to #}" },
    ],
  },
];

const NUMBERS = [
  ["0", "۰"],
  ["1", "۱"],
  ["2", "۲"],
  ["3", "۳"],
  ["4", "۴"],
  ["5", "۵"],
  ["6", "۶"],
  ["7", "۷"],
  ["8", "۸"],
  ["9", "۹"],
];

const OPS = [
  ["+", "+"],
  ["-", "-"],
  ["=", "="],
  ["(", "("],
  [")", ")"],
  [".", "."],
];

function ArabicKatexEditor({ value = "", onChange, rtl = true }) {
  const inputRef = useRef(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [processed, setProcessed] = useState("");
  const [error, setError] = useState("");
  const ar = isArabicBrowser();

  const latex = value ?? "";

  const preview = useMemo(() => {
    const trimmed = String(latex).trim();
    if (!trimmed) {
      return {
        html: "",
        processed: "",
        error: "",
      };
    }
    const options = getArabicKatexOptions({ rtl, displayMode: true });
    const validationError = validateLatex(trimmed);
    try {
      return {
        html: renderArabicMath(trimmed, { rtl, displayMode: true }),
        processed: processLatex(withDigitStruts(trimmed), options),
        error: validationError ? String(validationError) : "",
      };
    } catch (err) {
      let processedLatex = "";
      try {
        processedLatex = processLatex(trimmed, options);
      } catch {
        processedLatex = "";
      }
      return {
        html: "",
        processed: processedLatex,
        error: err?.message || String(err),
      };
    }
  }, [latex, rtl]);

  useEffect(() => {
    setPreviewHtml(preview.html);
    setProcessed(preview.processed);
    setError(preview.error);
  }, [preview]);

  const emit = (next, selection) => {
    onChange?.(next);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el || !selection) return;
      el.focus();
      el.setSelectionRange(selection.start, selection.end);
    });
  };

  const insertSnippet = (template) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? latex.length;
    const end = el?.selectionEnd ?? latex.length;
    const selected = latex.slice(start, end);
    const parts = template.split("#");
    const holeRanges = [];
    let result = parts[0];
    for (let i = 0; i < parts.length - 1; i += 1) {
      const fill = i === 0 && selected ? selected : "";
      const from = result.length;
      result += fill;
      holeRanges.push([from, from + fill.length]);
      result += parts[i + 1];
    }
    const next = latex.slice(0, start) + result + latex.slice(end);
    const [from, to] = holeRanges[0] ?? [result.length, result.length];
    emit(next, { start: start + from, end: start + to });
  };

  const insertAtCursor = (text) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? latex.length;
    const end = el?.selectionEnd ?? latex.length;
    const next = latex.slice(0, start) + text + latex.slice(end);
    const pos = start + text.length;
    emit(next, { start: pos, end: pos });
  };

  const deleteSelection = () => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? latex.length;
    const end = el?.selectionEnd ?? latex.length;
    if (start !== end) {
      emit(latex.slice(0, start) + latex.slice(end), { start, end: start });
    } else if (start > 0) {
      emit(latex.slice(0, start - 1) + latex.slice(end), {
        start: start - 1,
        end: start - 1,
      });
    }
  };

  return (
    <div className="arabic-katex-editor">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h4 className="font-bold text-gray-800 m-0">
          {ar ? "رموز سريعة" : "Quick symbols"}
        </h4>
        <span className="ake-hint">
          {ar ? "اضغط الرمز ثم اكتب الرقم مكان التحديد" : "Click a symbol, then type into the selected hole"}
        </span>
      </div>
      <div className="ake-toolbar">
        {TOOLBAR.map((group) => (
          <div key={group.group} className="ake-toolbar-group" aria-label={group.group}>
            {group.items.map((item) => (
              <button
                key={item.title}
                type="button"
                className="ake-sym-btn"
                title={item.title}
                onClick={() => insertSnippet(item.snippet)}
              >
                {item.visual}
                <small>{item.title}</small>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mb-2 mt-4">
        <h4 className="font-bold text-gray-800 m-0">
          {ar ? "معادلة LaTeX" : "LaTeX equation"}
        </h4>
        <span className="ake-hint">
          {ar ? "اكتب الأرقام اللاتينية 0–9 — تُعرض فارسية تلقائياً" : "Type 0–9 — they display as Persian digits"}
        </span>
      </div>
      <textarea
        ref={inputRef}
        className="ake-textarea"
        spellCheck={false}
        aria-label="LaTeX input"
        value={latex}
        onChange={(e) => onChange?.(e.target.value)}
      />
      <div className="ake-numpad">
        {NUMBERS.map(([latin, persian]) => (
          <button
            key={latin}
            type="button"
            className="ake-num-btn"
            title={latin}
            onClick={() => insertAtCursor(latin)}
          >
            {persian}
          </button>
        ))}
        {OPS.map(([latin, label]) => (
          <button
            key={latin}
            type="button"
            className="ake-num-btn"
            onClick={() => insertAtCursor(latin)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="ake-num-btn danger" onClick={deleteSelection}>
          {ar ? "حذف" : "Delete"}
        </button>
        <button
          type="button"
          className="ake-num-btn danger"
          onClick={() => {
            onChange?.("");
            inputRef.current?.focus();
          }}
        >
          {ar ? "مسح" : "Clear"}
        </button>
      </div>

      <h4 className="font-bold text-gray-800 mt-4 mb-2">
        {ar ? "المعاينة العربية" : "Arabic preview"}
      </h4>
      <div className="ake-preview arabic-katex-host" aria-live="polite">
        {previewHtml ? (
          <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
        ) : (
          <span className="ake-preview-empty">
            {ar ? "اكتب معادلة أو اضغط رمزاً لعرضها هنا" : "Type an equation or click a symbol"}
          </span>
        )}
      </div>
      {error ? <p className="ake-error">{error}</p> : null}
      {processed ? (
        <div className="ake-processed">
          <h4 className="font-bold text-gray-800 mb-2 text-sm">
            {ar ? "LaTeX بعد المعالجة" : "Processed LaTeX"}
          </h4>
          <code>{processed}</code>
        </div>
      ) : null}
    </div>
  );
}

export default ArabicKatexEditor;
