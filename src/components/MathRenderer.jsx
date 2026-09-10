import "katex/dist/katex.min.css";
import { useEffect, useRef, memo } from "react";
import { applyArabicMathHtml } from "../utils/arabicKatex";

const MathRenderer = memo(({ html, content }) => {
  const containerRef = useRef(null);
  const source = html ?? content ?? "";

  useEffect(() => {
    if (!containerRef.current) return;
    if (!source) {
      containerRef.current.innerHTML = "";
      return;
    }

    try {
      containerRef.current.innerHTML = source;

      const images = containerRef.current.querySelectorAll("img");
      images.forEach((img) => {
        const style = img.getAttribute("style");
        if (style) {
          img.style.cssText = style;
        }
        if (!style || !style.includes("max-width")) {
          img.style.maxWidth = "100%";
          img.style.height = "auto";
        }
      });

      const mathElements = containerRef.current.querySelectorAll(
        ".math-equation[data-latex]",
      );

      mathElements.forEach((element) => {
        const latex = element.getAttribute("data-latex");
        if (!latex) return;

        const rtlAttr = element.getAttribute("data-rtl");
        const rtl = rtlAttr !== "false";

        try {
          applyArabicMathHtml(element, latex, { rtl });
          element.style.display = "inline-block";
          element.style.verticalAlign = "middle";
          element.style.overflow = "visible";
        } catch (e) {
          console.error(e);
        }
      });
    } catch (err) {
      console.error("MathRenderer failed:", err);
      try {
        containerRef.current.textContent =
          typeof source === "string"
            ? source.replace(/<[^>]+>/g, " ").slice(0, 2000)
            : "";
      } catch {
        /* ignore */
      }
    }
  }, [source]);

  return (
    <div ref={containerRef} className="math-renderer-root arabic-katex-host" />
  );
});

MathRenderer.displayName = "MathRenderer";

export default MathRenderer;
