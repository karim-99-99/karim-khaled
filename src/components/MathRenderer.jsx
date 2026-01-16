// import { InlineMath, BlockMath } from 'react-katex';
// import 'katex/dist/katex.min.css';
// import { useEffect, useRef } from 'react';
// import katex from 'katex';

// // Component to render HTML with embedded LaTeX math equations
// // Supports both $$equation$$ format and Quill's math-equation spans
// const MathRenderer = ({ html, inline = false }) => {
//   const containerRef = useRef(null);

//   useEffect(() => {
//     if (!html || !containerRef.current) return;

//     // Set innerHTML first
//     containerRef.current.innerHTML = html;
    
//     // Handle images - display inline beside text
//     const images = containerRef.current.querySelectorAll('img');
    
//     images.forEach(img => {
//       const width = img.getAttribute('data-width');
      
//       // Style images for inline display
//       img.style.position = 'relative';
//       img.style.display = 'inline-block';
//       img.style.verticalAlign = 'middle';
//       img.style.margin = '0 10px';
//       img.style.maxWidth = '300px';
//       img.style.height = 'auto';
      
//       if (width) {
//         img.style.width = width;
//         img.style.maxWidth = width;
//       }
//     });

//     // Find all math-equation spans and re-render with KaTeX
//     const mathElements = containerRef.current.querySelectorAll('.math-equation[data-latex]');
    
//     mathElements.forEach((element) => {
//       const latex = element.getAttribute('data-latex');
//       if (latex) {
//         try {
//           // Force \limits for operators (∑, ∫, etc.) to display above/below
//           let processedLatex = latex;
//           processedLatex = processedLatex.replace(/\\sum(?!\\limits)/g, '\\sum\\limits');
//           processedLatex = processedLatex.replace(/\\int(?!\\limits)/g, '\\int\\limits');
//           processedLatex = processedLatex.replace(/\\prod(?!\\limits)/g, '\\prod\\limits');
//           processedLatex = processedLatex.replace(/\\bigcup(?!\\limits)/g, '\\bigcup\\limits');
//           processedLatex = processedLatex.replace(/\\bigcap(?!\\limits)/g, '\\bigcap\\limits');
          
//           // Render with KaTeX
//           const rendered = katex.renderToString(processedLatex, {
//             throwOnError: false,
//             displayMode: false,
//             output: 'html'
//           });
          
//           if (rendered) {
//             // Set rendered HTML first (preserves structure)
//             element.innerHTML = rendered;
            
//             // Convert numbers to Arabic in text nodes only (preserves structure)
//             const convertTextNodes = (el) => {
//               const walker = document.createTreeWalker(
//                 el,
//                 NodeFilter.SHOW_TEXT,
//                 null,
//                 false
//               );
              
//               const textNodes = [];
//               let textNode;
//               while (textNode = walker.nextNode()) {
//                 if (textNode.textContent && /[0-9]/.test(textNode.textContent)) {
//                   textNodes.push(textNode);
//                 }
//               }
              
//               textNodes.forEach((textNode) => {
//                 const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
//                 textNode.textContent = textNode.textContent.replace(/[0-9]/g, (digit) => {
//                   return arabicNumerals[parseInt(digit)];
//                 });
//               });
//             };
            
//             // Convert numbers AFTER structure is set
//             convertTextNodes(element);
            
//             // RTL natural for Arabic mathematical notation
//             element.setAttribute('dir', 'rtl');
//             element.setAttribute('data-rtl', 'true');
//             element.classList.add('math-rtl'); // Add class for CSS rules
//             element.style.direction = 'rtl';
//             element.style.unicodeBidi = 'embed'; // Natural RTL
//             element.style.textAlign = 'right';
            
//             // Ensure proper styling
//             element.style.display = 'inline-block';
//             element.style.verticalAlign = 'middle';
//             element.style.lineHeight = '1';
//             element.style.margin = '0 4px';
//             element.style.padding = '2px 4px';
            
//             // Style KaTeX elements inside - RTL natural
//             const katexContainer = element.querySelector('.katex');
//             if (katexContainer) {
//               katexContainer.style.display = 'inline-block';
//               katexContainer.style.verticalAlign = 'middle';
//               katexContainer.style.lineHeight = '1';
//               katexContainer.style.direction = 'rtl';
//               katexContainer.style.unicodeBidi = 'embed'; // Natural RTL
//               katexContainer.style.textAlign = 'right';
//             }
            
//             // Exception: Keep ∑ and ∫ operators in LTR
//             const operators = element.querySelectorAll('.mop.op-limits');
//             operators.forEach((op) => {
//               op.style.direction = 'ltr';
//               op.style.unicodeBidi = 'normal';
//             });
            
//             // CRITICAL: Ensure fraction structure is preserved
//             const fracElements = element.querySelectorAll('.frac');
//             fracElements.forEach((frac) => {
//               frac.style.cssText = 'display: inline-block !important; vertical-align: middle !important; text-align: center !important; position: relative !important; line-height: normal !important;';
//             });
            
//             const fracNums = element.querySelectorAll('.frac-num');
//             fracNums.forEach((el) => {
//               el.style.cssText = 'display: block !important; text-align: center !important; line-height: 1.2 !important; margin: 0 !important; padding: 0 !important; width: 100% !important;';
//             });
            
//             const fracLines = element.querySelectorAll('.frac-line');
//             fracLines.forEach((line) => {
//               line.style.cssText = 'border-bottom-width: 0.04em !important; border-bottom-style: solid !important; border-bottom-color: currentColor !important; height: 0 !important; width: 100% !important; display: block !important; margin-top: 0.1em !important; margin-bottom: 0.1em !important; position: relative !important;';
//             });
            
//             const fracDens = element.querySelectorAll('.frac-den');
//             fracDens.forEach((el) => {
//               el.style.cssText = 'display: block !important; text-align: center !important; line-height: 1.2 !important; margin: 0 !important; padding: 0 !important; width: 100% !important;';
//             });
            
//             // CUSTOM: Flip ALL superscripts and subscripts (powers) to appear on the LEFT for Arabic
//             // Target .msup and .msupsub directly for maximum browser compatibility
//             const supsubElements = element.querySelectorAll('.msup, .msupsub');
//             supsubElements.forEach((supsub) => {
//               // Skip if part of operator limits (∑, ∫)
//               const isOperatorLimit = supsub.closest('.mop.op-limits');
              
//               if (!isOperatorLimit) {
//                 // Force flex reverse with inline styles for cross-browser compatibility
//                 supsub.style.cssText = `
//                   display: inline-flex !important;
//                   flex-direction: row-reverse !important;
//                   flex-wrap: nowrap !important;
//                   align-items: baseline !important;
//                   vertical-align: baseline !important;
//                   margin: 0 0.15em !important;
//                   gap: 0.1em !important;
//                 `;
                
//                 // Reverse order of children using CSS order property
//                 const children = Array.from(supsub.children);
//                 if (children.length >= 2) {
//                   children[0].style.order = '2';
//                   children[0].style.marginLeft = '0.1em';
//                   children[children.length - 1].style.order = '1';
//                 }
//               }
//             });
            
//             // Also handle .base elements that contain superscripts
//             const bases = element.querySelectorAll('.base');
//             bases.forEach((base) => {
//               const hasSupsub = base.querySelector('.msup, .msupsub');
              
//               if (hasSupsub) {
//                 // Check if this is NOT part of op-limits (∑, ∫)
//                 const isOperatorLimit = base.closest('.mop.op-limits');
                
//                 if (!isOperatorLimit) {
//                   // Apply flex styling to reverse order
//                   base.style.cssText = `
//                     display: inline-flex !important;
//                     flex-direction: row-reverse !important;
//                     align-items: flex-start !important;
//                   `;
//                 }
//               }
//             });
            
//             // CRITICAL: Handle square roots (√) - Mirror for RTL Arabic
//             const sqrtElements = element.querySelectorAll('.sqrt');
//             sqrtElements.forEach((sqrt) => {
//               // Mirror the entire root symbol
//               sqrt.style.cssText = `
//                 transform: scaleX(-1) !important;
//                 display: inline-flex !important;
//                 flex-wrap: nowrap !important;
//                 align-items: baseline !important;
//                 direction: ltr !important;
//                 white-space: nowrap !important;
//                 padding: 0 0.4em !important;
//                 overflow: visible !important;
//               `;
              
//               // Flip the content back so it's readable (double flip = normal reading)
//               const contentElements = sqrt.querySelectorAll('.vlist-t, .vlist-r');
//               contentElements.forEach((content) => {
//                 content.style.cssText = `
//                   transform: scaleX(-1) translateX(-0.3em) !important;
//                   display: inline-block !important;
//                   direction: ltr !important;
//                   padding: 0 0.15em !important;
//                   overflow: visible !important;
//                 `;
//               });
              
//               // Handle mord and mnum separately for better spacing
//               const numberElements = sqrt.querySelectorAll('.mord, .mnum');
//               numberElements.forEach((num) => {
//                 num.style.cssText = `
//                   transform: scaleX(-1) !important;
//                   display: inline-block !important;
//                   direction: ltr !important;
//                   margin: 0 0.05em !important;
//                 `;
//               });
              
//               // CRITICAL: Handle fractions inside sqrt - INVERT (swap numerator and denominator)
//               const sqrtFracs = sqrt.querySelectorAll('.frac');
//               sqrtFracs.forEach((frac) => {
//                 // Reverse the fraction order and ensure visibility
//                 frac.style.cssText = `
//                   display: inline-flex !important;
//                   vertical-align: middle !important;
//                   text-align: center !important;
//                   position: relative !important;
//                   line-height: normal !important;
//                   flex-direction: column-reverse !important;
//                   overflow: visible !important;
//                   min-width: 1em !important;
//                 `;
//               });
              
//               // Ensure fraction numerator (top) - will become bottom due to column-reverse
//               const sqrtFracNums = sqrt.querySelectorAll('.frac-num');
//               sqrtFracNums.forEach((num) => {
//                 num.style.cssText = `
//                   display: block !important;
//                   text-align: center !important;
//                   line-height: 1.2 !important;
//                   margin: 0 !important;
//                   padding: 0 !important;
//                   width: 100% !important;
//                   transform: scaleX(-1) !important;
//                 `;
                
//                 // Also flip all numbers inside the numerator
//                 const numNumbers = num.querySelectorAll('.mord, .mnum');
//                 numNumbers.forEach((n) => {
//                   n.style.transform = 'scaleX(-1) !important';
//                 });
//               });
              
//               // Ensure fraction denominator (bottom) - will become top due to column-reverse
//               const sqrtFracDens = sqrt.querySelectorAll('.frac-den');
//               sqrtFracDens.forEach((den) => {
//                 den.style.cssText = `
//                   display: block !important;
//                   text-align: center !important;
//                   line-height: 1.2 !important;
//                   margin: 0 !important;
//                   padding: 0 !important;
//                   width: 100% !important;
//                   transform: scaleX(-1) !important;
//                 `;
                
//                 // Also flip all numbers inside the denominator
//                 const denNumbers = den.querySelectorAll('.mord, .mnum');
//                 denNumbers.forEach((n) => {
//                   n.style.transform = 'scaleX(-1) !important';
//                 });
//               });
              
//               // Handle root index (like the 3 in ³√)
//               const rootElements = sqrt.querySelectorAll('.root');
//               rootElements.forEach((root) => {
//                 root.style.cssText = `
//                   transform: scaleX(-1) !important;
//                   display: inline-block !important;
//                 `;
//               });
//             });
//           }
//         } catch (e) {
//           console.error('KaTeX render error:', e);
//         }
//       }
//     });
//   }, [html]);

//   // Helper function to convert numbers to Arabic
//   const toArabicNumerals = (str) => {
//     if (!str) return str;
//     const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
//     return str.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
//   };

//   // Check if HTML contains $$...$$ format
//   if (html && html.includes('$$')) {
//     const parts = [];
//     const mathRegex = /\$\$(.*?)\$\$/g;
//     let match;
//     let lastIndex = 0;
    
//     while ((match = mathRegex.exec(html)) !== null) {
//       // Add text before the match
//       if (match.index > lastIndex) {
//         const textBefore = html.substring(lastIndex, match.index);
//         if (textBefore.trim()) {
//           parts.push({ type: 'html', content: textBefore });
//         }
//       }
      
//       // Add the math equation
//       parts.push({ type: 'math', content: match[1] });
      
//       lastIndex = match.index + match[0].length;
//     }
    
//     // Add remaining text after last match
//     if (lastIndex < html.length) {
//       const textAfter = html.substring(lastIndex);
//       if (textAfter.trim()) {
//         parts.push({ type: 'html', content: textAfter });
//       }
//     }
    
//     // Render with parsing approach - RTL for Arabic
//     return (
//       <span>
//         {parts.map((part, index) => {
//           if (part.type === 'math') {
//             const MathComponent = inline ? InlineMath : BlockMath;
//             // Convert LaTeX numbers to Arabic before rendering
//             const arabicLatex = toArabicNumerals(part.content);
//               return (
//                 <span 
//                   key={index}
//                   className="math-rtl"
//                   data-rtl="true"
//                   style={{ 
//                     direction: 'rtl', 
//                     unicodeBidi: 'embed',
//                     display: 'inline-block',
//                     textAlign: 'right'
//                   }}
//                 >
//                   <MathComponent math={arabicLatex} />
//                 </span>
//               );
//           } else {
//             return (
//               <span
//                 key={index}
//                 dangerouslySetInnerHTML={{ __html: part.content }}
//               />
//             );
//           }
//         })}
//       </span>
//     );
//   }

//   // Otherwise, render HTML directly (handles .math-equation spans via useEffect)
//   return (
//     <div 
//       ref={containerRef}
//       className="math-rtl"
//       data-rtl="true"
//       style={{ 
//         display: inline ? 'inline' : 'block',
//         position: 'relative' // Allow absolute positioned images
//       }} 
//     />
//   );
// };

// export default MathRenderer;import { InlineMath, BlockMath } from 'react-katex'; 




import 'katex/dist/katex.min.css';
import { useEffect, useRef, memo } from 'react';
import katex from 'katex';

const MathRenderer = memo(({ html }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!html || !containerRef.current) return;

    containerRef.current.innerHTML = html;

    const mathElements = containerRef.current.querySelectorAll(
      '.math-equation[data-latex]'
    );
    
    mathElements.forEach((element) => {
      const latex = element.getAttribute('data-latex');
      if (!latex) return;

      try {
        element.innerHTML = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: false
        });

        // Make math box not get covered/clipped on mobile
        element.style.display = 'inline-block';
        element.style.verticalAlign = 'middle';
        element.style.overflow = 'visible';
        element.style.position = 'relative';
        element.style.zIndex = '2';
        element.style.lineHeight = '1.4';
        element.style.padding = '0.12em 0.08em';

        const katexRoot = element.querySelector('.katex');
        if (katexRoot) {
          katexRoot.style.display = 'inline-block';
          katexRoot.style.overflow = 'visible';
          katexRoot.style.position = 'relative';
          katexRoot.style.zIndex = '2';
          katexRoot.style.lineHeight = '1.2';
        }

        // Force KaTeX superscripts to be on the LEFT (always)
        // KaTeX HTML usually renders as: <span class="mord">BASE</span><span class="msupsub">SUP</span>
        // So we swap msupsub to be before its base sibling.
        const forceSuperscriptsLeft = (root) => {
          const supsubs = root.querySelectorAll('.msupsub');
          supsubs.forEach((msupsub) => {
            if (msupsub.closest('.mop.op-limits')) return;
            if (msupsub.dataset.supLeftApplied === '1') return;
            msupsub.dataset.supLeftApplied = '1';

            const parent = msupsub.parentElement;
            const baseEl = msupsub.previousElementSibling;
            if (!parent || !baseEl) return;

            // Move msupsub before base => exponent appears on the left
            parent.insertBefore(msupsub, baseEl);

            // IMPORTANT: parent is in RTL context, so force LTR just for this tiny run
            // so the first node (msupsub) is actually on the LEFT visually.
            parent.style.setProperty('direction', 'ltr', 'important');
            parent.style.setProperty('unicode-bidi', 'isolate', 'important');
            parent.style.setProperty('white-space', 'nowrap', 'important');

            // Make the exponent closer to the base
            msupsub.style.setProperty('margin-right', '0.02em', 'important');
            msupsub.style.setProperty('margin-left', '0', 'important');
          });
        };

        // Raise fraction bar slightly (the line between numerator/denominator)
        const raiseFractionBar = (root) => {
          const lines = root.querySelectorAll('.frac-line');
          lines.forEach((line) => {
            line.style.setProperty('position', 'relative', 'important');
            // negative => move up a bit
            line.style.setProperty('top', '-0.12em', 'important');
          });
        };

        /* ===============================
           Arabic numerals (0–9 → ٠–٩)
           =============================== */
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT
        );
        const arabic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
        let node;
        while ((node = walker.nextNode())) {
          node.textContent = node.textContent.replace(
            /[0-9]/g,
            d => arabic[d]
          );
        }

        element.style.direction = 'rtl';
        element.style.unicodeBidi = 'embed';

        /* ===============================
           SQRT HANDLING (mirror root only)
           =============================== */
        const sqrtElements = element.querySelectorAll('.sqrt');
        sqrtElements.forEach((sqrt) => {
          sqrt.style.transform = 'scaleX(-1)';
          // inline-flex can shrink/clip sqrt height on some mobile layouts
          sqrt.style.display = 'inline-block';
          sqrt.style.overflow = 'visible';
          sqrt.style.position = 'relative';
          sqrt.style.zIndex = '3';
          sqrt.style.paddingTop = '0.12em';
          sqrt.style.paddingBottom = '0.12em';
          // ضمان ظهور الجذر
          sqrt.style.visibility = 'visible';
          sqrt.style.opacity = '1';
          
          // على الموبايل: جعل الجذر يتكيف مع المحتوى
          const isMobileCheck = typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(max-width: 640px)').matches;
          
          if (isMobileCheck) {
            sqrt.style.setProperty('display', 'inline-flex', 'important');
            sqrt.style.setProperty('align-items', 'flex-start', 'important');
            sqrt.style.setProperty('flex-wrap', 'nowrap', 'important');
            sqrt.style.setProperty('visibility', 'visible', 'important');
            sqrt.style.setProperty('opacity', '1', 'important');
          }

          const contentElements = sqrt.querySelectorAll('.vlist-t, .vlist-r');
          contentElements.forEach(c => {
            c.style.transform = 'scaleX(-1)';
            c.style.direction = 'ltr'; // keep numbers readable
            c.style.overflow = 'visible';
            // تحريك الأرقام داخل الجذر إلى اليمين قليلاً
            c.style.paddingLeft = '0.45em';
          });

          const sqrtFracs = sqrt.querySelectorAll('.frac');
          sqrtFracs.forEach(frac => {
            frac.style.display = 'inline-flex';
            frac.style.flexDirection = 'column-reverse';
          });

          const rootIndex = sqrt.querySelectorAll('.root');
          rootIndex.forEach(r => {
            r.style.transform = 'scaleX(-1)';
            r.style.position = 'relative';
            r.style.zIndex = '4';
            // تحريك الأس (index) إلى اليسار قليلاً
            r.style.left = '0.9em';
          });

          // Mobile: make the radical symbol taller so content stays inside
          const isMobile =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(max-width: 640px)').matches;

          if (isMobile) {
            // منع الجذر من الخروج خارج الشاشة + ضمان ظهوره
            sqrt.style.setProperty('padding', '0.1em', 'important');
            sqrt.style.setProperty('overflow', 'visible', 'important');
            sqrt.style.setProperty('max-width', '100%', 'important');
            sqrt.style.setProperty('box-sizing', 'border-box', 'important');
            sqrt.style.setProperty('display', 'inline-flex', 'important');
            sqrt.style.setProperty('align-items', 'center', 'important');
            sqrt.style.setProperty('visibility', 'visible', 'important'); // ضمان الظهور
            sqrt.style.setProperty('opacity', '1', 'important'); // ضمان الظهور
            sqrt.style.setProperty('position', 'relative', 'important');
            sqrt.style.setProperty('z-index', '5', 'important');
            // تقليل margin في الموبايل
            sqrt.style.setProperty('margin-left', '0.15em', 'important');
            sqrt.style.setProperty('margin-right', '0.15em', 'important');
            sqrt.style.setProperty('margin-top', '0.1em', 'important');
            sqrt.style.setProperty('margin-bottom', '0.1em', 'important');

            // إصلاح ظهور الجذر في الموبايل - استخدام selectors متعددة للتأكد
            // KaTeX يستخدم بنية مختلفة للجذر، يجب البحث في جميع العناصر
            const radicalHolders = sqrt.querySelectorAll('.hide-tail, .sqrt > span, .vlist');
            radicalHolders.forEach((h) => {
              h.style.setProperty('overflow', 'visible', 'important');
              // ارتفاع محدد لضمان ظهور الجذر بشكل صحيح
              h.style.setProperty('height', '1.8em', 'important'); // أطول في الارتفاع
              h.style.setProperty('min-height', '1.5em', 'important');
              h.style.setProperty('max-height', '2.5em', 'important');
              h.style.setProperty('flex-shrink', '0', 'important');
              h.style.setProperty('display', 'inline-block', 'important');
              h.style.setProperty('visibility', 'visible', 'important');
              h.style.setProperty('opacity', '1', 'important');
              // عرض تلقائي لكن محدود
              h.style.setProperty('width', 'auto', 'important');
              h.style.setProperty('max-width', '100%', 'important');
            });

            // البحث عن جميع SVGs داخل الجذر - لا نعتمد على selector واحد فقط
            const allSvgs = sqrt.querySelectorAll('svg');
            const radicalSvgs = Array.from(allSvgs).filter(svg => {
              // نتحقق من أن هذا SVG هو جزء من رمز الجذر
              const parent = svg.parentElement;
              return parent && (
                parent.classList.contains('hide-tail') ||
                parent.classList.contains('vlist') ||
                svg.getAttribute('viewBox') || // أي SVG له viewBox
                svg.querySelector('path') // أي SVG يحتوي على paths
              );
            });

            radicalSvgs.forEach((svg) => {
              // التأكد من ظهور SVG
              svg.style.setProperty('display', 'block', 'important');
              svg.style.setProperty('visibility', 'visible', 'important');
              svg.style.setProperty('opacity', '1', 'important');
              svg.style.setProperty('position', 'relative', 'important');
              svg.style.setProperty('z-index', '10', 'important');
              
              // الحفاظ على viewBox الأصلي مع aspect ratio صحيح
              const viewBox = svg.getAttribute('viewBox');
              if (viewBox) {
                // نستخدم meet للحفاظ على نسبة العرض/الارتفاع
                svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');
              }
              
              // إزالة أي transform قد يخفي أو يشوه الجذر
              const currentTransform = svg.style.transform || svg.getAttribute('transform');
              if (currentTransform && (currentTransform.includes('scale(0)') || currentTransform.includes('scaleY(0)'))) {
                svg.style.setProperty('transform', 'none', 'important');
              }
              
              // ضبط الارتفاع أولاً (أطول لاحتواء الكسور)
              svg.style.setProperty('height', '1.8em', 'important'); // زيادة الارتفاع قليلاً
              svg.style.setProperty('min-height', '1.5em', 'important');
              svg.style.setProperty('max-height', '2.5em', 'important');
              
              // العرض يجب أن يكون تلقائي ولكن محدود - لا نجعله ممتداً بلا حدود
              // نستخدم width: auto مع max-width محدد بناءً على المحتوى
              svg.style.setProperty('width', 'auto', 'important');
              svg.style.setProperty('min-width', '0.6em', 'important');
              
              // نقيد العرض بشكل ذكي - لا نجعله `none` لأنه سيسبب التمدد
              // سنحدده بعد قياس المحتوى
              svg.style.setProperty('max-width', '100%', 'important'); // حد مؤقت
              svg.style.setProperty('overflow', 'visible', 'important');
              
              // بعد رسم العناصر، نحدد العرض بناءً على المحتوى الفعلي
              // نستخدم setTimeout لإعطاء الوقت للعناصر للرسم أولاً
              setTimeout(() => {
                const contentElement = sqrt.querySelector('.vlist-t, .vlist-r');
                if (contentElement) {
                  const contentRect = contentElement.getBoundingClientRect();
                  const svgRect = svg.getBoundingClientRect();
                  
                  // نحسب عرض مناسب بناءً على المحتوى
                  if (contentRect.width > 0 && svgRect.width > 0) {
                    // إذا كان SVG أوسع بكثير من المحتوى
                    if (svgRect.width > contentRect.width * 1.5) {
                      // نحد العرض إلى المحتوى + 30% كحد أقصى
                      const targetWidth = Math.min(contentRect.width * 1.3, 2.2);
                      // نستخدم width مباشرة بدلاً من max-width لفرض العرض
                      svg.style.setProperty('width', `${targetWidth}px`, 'important');
                      svg.style.setProperty('max-width', `${targetWidth}px`, 'important');
                    }
                  }
                } else {
                  // إذا لم يكن هناك محتوى واضح، نستخدم عرض ثابت صغير
                  svg.style.setProperty('width', '1em', 'important');
                  svg.style.setProperty('max-width', '1.5em', 'important');
                }
              }, 50); // تأخير بسيط للتأكد من أن العناصر رُسمت
              
              // التأكد من أن paths داخل SVG مرئية
              const paths = svg.querySelectorAll('path');
              paths.forEach(path => {
                path.style.setProperty('fill', 'currentColor', 'important');
                path.style.setProperty('stroke', 'none', 'important');
                path.style.setProperty('opacity', '1', 'important');
                path.style.setProperty('visibility', 'visible', 'important');
              });
            });
            
            // إذا لم نجد أي SVGs، نبحث عن العناصر الأخرى التي تمثل الجذر
            if (radicalSvgs.length === 0) {
              // محاولة إيجاد العناصر الأخرى
              const radicalElements = sqrt.querySelectorAll('.vlist-t > span, .vlist-r > span, span[style*="sqrt"]');
              radicalElements.forEach((el) => {
                el.style.setProperty('display', 'inline-block', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
                el.style.setProperty('opacity', '1', 'important');
              });
            }

            // Ensure fractions inside root stay properly positioned and don't overflow
            const sqrtFracsMobile = sqrt.querySelectorAll('.frac');
            sqrtFracsMobile.forEach((frac) => {
              frac.style.setProperty('display', 'inline-flex', 'important');
              frac.style.setProperty('flex-direction', 'column-reverse', 'important');
              frac.style.setProperty('vertical-align', 'middle', 'important');
              frac.style.setProperty('position', 'relative', 'important');
              frac.style.setProperty('overflow', 'visible', 'important');
              // منع الكسور من اختراق الجذر - تقليل العرض
              frac.style.setProperty('max-width', 'calc(100% - 1em)', 'important');
              frac.style.setProperty('word-wrap', 'break-word', 'important');
              // التأكد من أن الكسر يبقى داخل الجذر
              frac.style.setProperty('flex-shrink', '1', 'important');
            });
            
            // تحسين محتوى الجذر نفسه - جعله يتكيف مع الحجم ومنع الخروج
            const contentElements = sqrt.querySelectorAll('.vlist-t, .vlist-r');
            contentElements.forEach(c => {
              // ضمان ظهور المحتوى
              c.style.setProperty('display', 'inline-block', 'important');
              c.style.setProperty('visibility', 'visible', 'important');
              c.style.setProperty('opacity', '1', 'important');
              c.style.setProperty('position', 'relative', 'important');
              c.style.setProperty('z-index', '2', 'important');
              // منع المحتوى من الخروج، لكن السماح بالعرض الطبيعي
              c.style.setProperty('max-width', '100%', 'important');
              c.style.setProperty('overflow', 'visible', 'important');
              c.style.setProperty('word-wrap', 'break-word', 'important');
              c.style.setProperty('flex-shrink', '1', 'important');
              // جعل المحتوى يحدد عرض الجذر
              c.style.setProperty('width', 'auto', 'important');
              c.style.setProperty('min-width', '0', 'important');
            });

            // If radicand is a single simple number, it may sit too high on mobile.
            // Nudge it down slightly, but keep complex expressions unchanged.
            const radicandBoxes = sqrt.querySelectorAll('.mord[style*="padding-left"]');
            radicandBoxes.forEach((box) => {
              const text = (box.textContent || '').trim();
              const isSimpleNumber = /^[0-9٠-٩]+$/.test(text);
              const hasComplex =
                !!box.querySelector('.frac, .msupsub, .sqrt, .mop, .mbin, .mrel, .mopen, .mclose');

              if (isSimpleNumber && !hasComplex) {
                box.style.setProperty('transform', 'translateY(0.14em)', 'important');
              }
            });

            // Mobile: give extra breathing room so adjacent text doesn't overlap
            element.style.lineHeight = '1.5';
            element.style.paddingTop = '0.15em';
            element.style.paddingBottom = '0.15em';
            element.style.paddingLeft = '0.2em';
            element.style.paddingRight = '0.2em';
            element.style.setProperty('max-width', '100%', 'important');
            element.style.setProperty('box-sizing', 'border-box', 'important');
            element.style.setProperty('word-wrap', 'break-word', 'important');
            element.style.setProperty('overflow-wrap', 'break-word', 'important');
          }
        });

        // Apply after sqrt transforms as well
        forceSuperscriptsLeft(element);
        raiseFractionBar(element);

      } catch (e) {
        console.error(e);
      }
    });
  }, [html]);

  return <div ref={containerRef} />;
});

MathRenderer.displayName = 'MathRenderer';

export default MathRenderer;
