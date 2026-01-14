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
import { useEffect, useRef } from 'react';
import katex from 'katex';

const MathRenderer = ({ html, inline = false }) => {
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
           Powers on the LEFT (GLOBAL)
           =============================== */
        const supsubs = element.querySelectorAll('.msup, .msupsub');
        supsubs.forEach(s => {
          // Skip if part of operator limits (∑, ∫) or inside sqrt
          if (!s.closest('.mop.op-limits') && !s.closest('.sqrt')) {
            s.style.display = 'inline-flex';
            s.style.flexDirection = 'row-reverse';
            s.style.flexWrap = 'nowrap';
            s.style.alignItems = 'baseline';
            
            // Use CSS order to reverse children
            const children = Array.from(s.children);
            if (children.length >= 2) {
              children[0].style.order = '2';
              children[0].style.marginLeft = '0.1em';
              children[children.length - 1].style.order = '1';
            }
          }
        });
        
        // Also handle .base elements that contain superscripts
        const bases = element.querySelectorAll('.base');
        bases.forEach((base) => {
          const hasSupsub = base.querySelector('.msup, .msupsub');
          if (hasSupsub && !base.closest('.mop.op-limits') && !base.closest('.sqrt')) {
            base.style.display = 'inline-flex';
            base.style.flexDirection = 'row-reverse';
            base.style.alignItems = 'flex-start';
          }
        });

        /* ===============================
           SQRT HANDLING (mirror root only)
           =============================== */
        const sqrtElements = element.querySelectorAll('.sqrt');
        sqrtElements.forEach((sqrt) => {
          sqrt.style.transform = 'scaleX(-1)';
          sqrt.style.display = 'inline-flex';

          const contentElements = sqrt.querySelectorAll('.vlist-t, .vlist-r');
          contentElements.forEach(c => {
            c.style.transform = 'scaleX(-1)';
            c.style.direction = 'ltr'; // keep numbers readable
          });

          const sqrtFracs = sqrt.querySelectorAll('.frac');
          sqrtFracs.forEach(frac => {
            frac.style.display = 'inline-flex';
            frac.style.flexDirection = 'column-reverse';
          });

          const rootIndex = sqrt.querySelectorAll('.root');
          rootIndex.forEach(r => {
            r.style.transform = 'scaleX(-1)';
          });
        });

        /* ===============================
           Powers inside sqrt → LEFT (after sqrt transform)
           =============================== */
        sqrtElements.forEach((sqrt) => {
          // Find all superscripts inside sqrt
          const sqrtSupsubs = sqrt.querySelectorAll('.msup, .msupsub');
          sqrtSupsubs.forEach(s => {
            // Force flex reverse with inline styles
            s.style.display = 'inline-flex';
            s.style.flexDirection = 'row-reverse';
            s.style.flexWrap = 'nowrap';
            s.style.alignItems = 'baseline';
            s.style.verticalAlign = 'baseline';
            
            // Use CSS order to reverse children
            const children = Array.from(s.children);
            if (children.length >= 2) {
              // Base (first child) should appear second (on right after reverse)
              children[0].style.order = '2';
              children[0].style.marginLeft = '0.1em';
              // Superscript (last child) should appear first (on left after reverse)
              children[children.length - 1].style.order = '1';
            }
          });
          
          // Handle .base elements that contain superscripts inside sqrt
          const sqrtBases = sqrt.querySelectorAll('.base');
          sqrtBases.forEach((base) => {
            const hasSupsub = base.querySelector('.msup, .msupsub');
            if (hasSupsub) {
              base.style.display = 'inline-flex';
              base.style.flexDirection = 'row-reverse';
              base.style.alignItems = 'flex-start';
            }
          });
        });

      } catch (e) {
        console.error(e);
      }
    });
  }, [html]);

  return <div ref={containerRef} />;
};

export default MathRenderer;
