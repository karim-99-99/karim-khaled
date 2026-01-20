// Don't import Quill directly to avoid initialization issues
// We'll get it from react-quill when needed
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Quill instance will be passed in when registering
let QuillInstance = null;

// Set Quill instance when available (called from components)
export const setQuillInstance = (quill) => {
  if (quill) {
    QuillInstance = quill;
  }
};

// Get Quill instance
const getQuill = () => {
  return QuillInstance;
};

// Wait for Quill to be fully initialized before importing Embed
const getEmbed = () => {
  const Quill = getQuill();
  if (!Quill || typeof Quill.import !== 'function') {
    return null;
  }
  try {
    return Quill.import('blots/embed');
  } catch (e) {
    console.warn('Failed to import Embed from Quill:', e);
    return null;
  }
};

// Convert Western numerals to Arabic in rendered output
const toArabicNumerals = (str) => {
  if (!str) return str;
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
};

// Define MathBlot class - will be initialized when Quill is ready
let MathBlot = null;
let EmbedClass = null;

const createMathBlotClass = () => {
  if (MathBlot) return MathBlot;
  
  try {
    EmbedClass = getEmbed();
    
    if (!EmbedClass) {
      // Quill is not ready yet, return null
      return null;
    }
    
    MathBlot = class MathBlot extends EmbedClass {
      static blotName = 'math';
      static tagName = 'span';
      static className = 'math-equation';

      static create(value) {
        const node = super.create();
        
        // Handle string, JSON string, or object
        let latexValue = '';
        let isRTL = true; // Default to RTL
        
        if (!value) {
          latexValue = '';
        } else if (typeof value === 'string') {
          // Try to parse as JSON first
          if (value.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(value);
              if (parsed && parsed.latex) {
                latexValue = parsed.latex;
                isRTL = parsed.rtl !== undefined ? parsed.rtl : true;
              } else {
                latexValue = value; // Fallback to original value
              }
            } catch {
              // Not valid JSON, use as LaTeX string
              latexValue = value;
            }
          } else {
            // Plain LaTeX string
            latexValue = value;
          }
        } else if (typeof value === 'object' && value !== null) {
          latexValue = value.latex || String(value);
          isRTL = value.rtl !== undefined ? value.rtl : true;
        } else {
          latexValue = String(value);
        }
        
        node.setAttribute('data-latex', latexValue);
        node.setAttribute('data-rtl', isRTL ? 'true' : 'false');
        node.setAttribute('contenteditable', 'false');
        node.setAttribute('data-edit-hint', 'Click to edit equation / انقر للتعديل');
        node.setAttribute('title', 'Double-click to edit equation / انقر نقراً مزدوجاً للتعديل');
        
        // RTL/LTR based on flag
        node.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
        
        // Add class for CSS targeting
        if (isRTL) {
          node.classList.add('math-rtl');
          node.classList.remove('math-ltr');
        } else {
          node.classList.add('math-ltr');
          node.classList.remove('math-rtl');
        }
        
        node.style.display = 'inline-block';
        node.style.verticalAlign = 'middle';
        node.style.lineHeight = '1';
        node.style.fontSize = 'inherit';
        node.style.cursor = 'pointer';
        node.style.direction = isRTL ? 'rtl' : 'ltr';
        node.style.unicodeBidi = 'embed';
        node.style.textAlign = isRTL ? 'right' : 'left';
        
        try {
          // Force \limits for operators (∑, ∫, etc.) to display above/below
          let processedValue = latexValue;
          // Add \limits after operators if not already present
          if (typeof processedValue === 'string') {
            processedValue = processedValue.replace(/\\sum(?!\\limits)/g, '\\sum\\limits');
            processedValue = processedValue.replace(/\\int(?!\\limits)/g, '\\int\\limits');
            processedValue = processedValue.replace(/\\prod(?!\\limits)/g, '\\prod\\limits');
            processedValue = processedValue.replace(/\\bigcup(?!\\limits)/g, '\\bigcup\\limits');
            processedValue = processedValue.replace(/\\bigcap(?!\\limits)/g, '\\bigcap\\limits');
          }
          
          // Render with KaTeX
          const rendered = katex.renderToString(processedValue, {
            throwOnError: false,
            displayMode: false,
            output: 'html',
            fleqn: false,
            strict: false
          });
          
          if (rendered) {
            // Set rendered HTML directly (KaTeX handles structure)
            node.innerHTML = rendered;
            
            // FIRST: Style all elements to ensure proper structure
            const katexContainer = node.querySelector('.katex');
            if (katexContainer) {
              katexContainer.style.display = 'inline-block';
              katexContainer.style.verticalAlign = 'middle';
              katexContainer.style.lineHeight = '1';
              katexContainer.style.margin = '0';
              katexContainer.style.padding = '0';
              katexContainer.style.width = 'auto';
              katexContainer.style.height = 'auto';
            }
            
            // Ensure KaTeX HTML structure is preserved
            const katexHtml = node.querySelector('.katex-html');
            if (katexHtml) {
              katexHtml.style.display = 'inline-block';
              katexHtml.style.verticalAlign = 'middle';
              katexHtml.style.lineHeight = '1';
            }
            
            // CRITICAL: Ensure fraction structure is preserved and displayed correctly
            // KaTeX fraction structure: .frac > .frac-num (top), .frac-line (middle), .frac-den (bottom)
            const fracElements = node.querySelectorAll('.frac');
            fracElements.forEach((frac) => {
              frac.style.cssText = 'display: inline-block !important; vertical-align: middle !important; text-align: center !important; position: relative !important; margin: 0 2px !important;';
            });
            
            // Ensure fraction numerator is positioned correctly (ABOVE the line)
            const fracNums = node.querySelectorAll('.frac-num');
            fracNums.forEach((el) => {
              el.style.cssText = 'display: block !important; text-align: center !important; line-height: 1.2 !important; margin: 0 !important; padding: 0 !important; width: 100% !important;';
            });
            
            // Ensure fraction lines are visible and properly styled (BETWEEN num and den)
            const fracLines = node.querySelectorAll('.frac-line');
            fracLines.forEach((line) => {
              line.style.cssText = 'border-bottom: 0.04em solid currentColor !important; border-top: none !important; display: block !important; width: 100% !important; height: 0 !important; margin: 0.9em 0 !important; padding: 0 !important; position: relative !important; transform: translateY(-0.5em) !important;';
            });
            
            // Ensure fraction denominator is positioned correctly (BELOW the line)
            const fracDens = node.querySelectorAll('.frac-den');
            fracDens.forEach((el) => {
              el.style.cssText = 'display: block !important; text-align: center !important; line-height: 1.2 !important; margin: 0 !important; padding: 0 !important; width: 100% !important;';
            });
            
            // CUSTOM: Flip superscripts for RTL mode - swap DOM order
            const applyRTLSuperscriptStyling = (element, rtlFlag) => {
              // Find all msup and msubsup elements (powers and subscripts)
              // Include superscripts inside roots too
              const msupElements = element.querySelectorAll('.msup, .msupsub');
              
              msupElements.forEach((msup) => {
                // Skip if part of operator limits (∑, ∫, lim)
                if (msup.closest('.mop.op-limits') || msup.closest('.op-limits')) {
                  return;
                }
                
                // Check if inside a root - we still want to process it
                const isInsideRoot = msup.closest('.sqrt') !== null;
                
                // Check current state
                const wasRTL = msup.dataset.rtlReversed === 'true';
                
                if (rtlFlag && !wasRTL) {
                  // RTL mode: Move superscript to LEFT (4² → ²4)
                  
                  // Mark as reversed
                  msup.dataset.rtlReversed = 'true';
                  
                  const children = Array.from(msup.children);
                  if (children.length >= 2) {
                    const base = children[0];
                    const sup = children[1];
                    
                    if (!isInsideRoot) {
                      // Outside root: swap DOM order
                      msup.insertBefore(sup, base);
                      msup.style.setProperty('display', 'inline-flex', 'important');
                      msup.style.setProperty('flex-direction', 'row', 'important');
                      msup.style.setProperty('align-items', 'baseline', 'important');
                      msup.style.setProperty('direction', 'ltr', 'important');
                    } else {
                      // Inside root: swap DOM order + use row-reverse
                      // This combination will put superscript on LEFT visually
                      // Swap: move superscript before base in DOM
                      msup.insertBefore(sup, base);
                      
                      // Use row-reverse to reverse the visual order
                      msup.style.setProperty('display', 'inline-flex', 'important');
                      msup.style.setProperty('flex-direction', 'row-reverse', 'important');
                      msup.style.setProperty('align-items', 'baseline', 'important');
                      msup.style.setProperty('direction', 'ltr', 'important');
                      
                      // Flip children back so they're readable (root is flipped, so double flip = normal)
                      base.style.setProperty('transform', 'scaleX(-1)', 'important');
                      base.style.setProperty('display', 'inline-block', 'important');
                      sup.style.setProperty('transform', 'scaleX(-1)', 'important');
                      sup.style.setProperty('display', 'inline-block', 'important');
                    }
                  }
                  
                } else if (!rtlFlag && wasRTL) {
                  // LTR mode: Restore normal order (²4 → 4²)
                  
                  // Remove marker
                  msup.dataset.rtlReversed = 'false';
                  
                  const children = Array.from(msup.children);
                  if (children.length >= 2) {
                    const first = children[0];
                    const second = children[1];
                    
                    // Restore DOM order (swap back)
                    msup.insertBefore(second, first);
                    
                    if (isInsideRoot) {
                      // Inside root: remove transforms
                      first.style.setProperty('transform', 'none', 'important');
                      second.style.setProperty('transform', 'none', 'important');
                    }
                  }
                  
                  // Reset styling
                  msup.style.setProperty('display', 'inline', 'important');
                  msup.style.setProperty('flex-direction', 'initial', 'important');
                  msup.style.setProperty('align-items', 'initial', 'important');
                  msup.style.setProperty('direction', 'initial', 'important');
                }
              });
            };
            
            // CUSTOM: Mirror/flip roots using CSS transform scaleX(-1) - ONLY in RTL mode
            const applyRootMirror = (element, rtlFlag) => {
              // Find all sqrt elements
              const sqrtElements = element.querySelectorAll('.sqrt');
              
              sqrtElements.forEach((sqrt) => {
                // Remove previous mirror state
                sqrt.dataset.mirrored = 'false';
                
                if (rtlFlag) {
                  // RTL mode: Apply horizontal mirror using CSS transform scaleX(-1)
                  sqrt.style.setProperty('transform', 'scaleX(-1)', 'important');
                  sqrt.style.setProperty('display', 'inline-flex', 'important');
                  sqrt.style.setProperty('flex-wrap', 'nowrap', 'important');
                  sqrt.style.setProperty('align-items', 'baseline', 'important');
                  sqrt.style.setProperty('direction', 'ltr', 'important');
                  sqrt.style.setProperty('white-space', 'nowrap', 'important');
                  
                  // Mark as mirrored
                  sqrt.dataset.mirrored = 'true';
                  
                  // Flip all text/numbers back so they're readable
                  // Find elements containing numbers or text - but NOT msup children
                  const textElements = sqrt.querySelectorAll('.vlist-r, .mord, .mnum, .root, .vlist-t');
                  textElements.forEach((el) => {
                    // Skip if inside msup (we'll handle that separately)
                    if (el.closest('.msup, .msupsub')) {
                      return;
                    }
                    // Double flip = back to normal for text
                    el.style.setProperty('transform', 'scaleX(-1)', 'important');
                    el.style.setProperty('display', 'inline-block', 'important');
                  });
                  
                  // Handle msup inside root: apply styles (swapping will be done in applyRTLSuperscriptStyling)
                  const msupInsideRoot = sqrt.querySelectorAll('.msup, .msupsub');
                  msupInsideRoot.forEach((msup) => {
                    // Just set the display properties, don't swap here
                    // Swapping will be handled by applyRTLSuperscriptStyling which runs after this
                    msup.style.setProperty('display', 'inline-flex', 'important');
                    msup.style.setProperty('flex-direction', 'row-reverse', 'important');
                    msup.style.setProperty('flex-wrap', 'nowrap', 'important');
                    msup.style.setProperty('align-items', 'baseline', 'important');
                    msup.style.setProperty('direction', 'ltr', 'important');
                    msup.style.setProperty('white-space', 'nowrap', 'important');
                    
                    // Flip children back so they're readable
                    const children = Array.from(msup.children);
                    children.forEach((child) => {
                      child.style.setProperty('transform', 'scaleX(-1)', 'important');
                      child.style.setProperty('display', 'inline-block', 'important');
                    });
                  });
                  
                  // Also handle any direct text nodes by wrapping them
                  const walker = document.createTreeWalker(
                    sqrt,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                  );
                  
                  const textNodes = [];
                  let node;
                  while ((node = walker.nextNode())) {
                    if (node.textContent.trim() && /[0-9a-zA-Z]/.test(node.textContent)) {
                      // Skip if inside msup
                      if (node.parentElement && node.parentElement.closest('.msup, .msupsub')) {
                        continue;
                      }
                      textNodes.push(node);
                    }
                  }
                  
                  // Wrap text nodes in spans to flip them back
                  textNodes.forEach((textNode) => {
                    if (textNode.parentNode && !textNode.parentNode.classList.contains('root-flipped-text')) {
                      const span = document.createElement('span');
                      span.classList.add('root-flipped-text');
                      span.style.setProperty('display', 'inline-block', 'important');
                      span.style.setProperty('transform', 'scaleX(-1)', 'important');
                      textNode.parentNode.insertBefore(span, textNode);
                      span.appendChild(textNode);
                    }
                  });
                } else {
                  // LTR mode: Remove mirror (normal display)
                  sqrt.style.setProperty('transform', 'none', 'important');
                  sqrt.style.setProperty('display', 'inline-block', 'important');
                  sqrt.style.setProperty('direction', 'ltr', 'important');
                  
                  // Remove flip from text/numbers
                  const textElements = sqrt.querySelectorAll('.vlist-r, .mord, .mnum, .root, .vlist-t, .root-flipped-text');
                  textElements.forEach((el) => {
                    el.style.setProperty('transform', 'none', 'important');
                    el.style.setProperty('display', 'inline-block', 'important');
                  });
                  
                  // Reset msup inside root: remove transforms
                  const msupInsideRoot = sqrt.querySelectorAll('.msup, .msupsub');
                  msupInsideRoot.forEach((msup) => {
                    // Remove transforms from children
                    Array.from(msup.children).forEach((child) => {
                      child.style.setProperty('transform', 'none', 'important');
                    });
                    
                    msup.style.setProperty('display', 'inline', 'important');
                    msup.style.setProperty('flex-direction', 'initial', 'important');
                    msup.style.setProperty('align-items', 'initial', 'important');
                    msup.style.setProperty('direction', 'initial', 'important');
                  });
                  
                  // Remove wrapped text nodes
                  const wrappedTexts = sqrt.querySelectorAll('.root-flipped-text');
                  wrappedTexts.forEach((wrapper) => {
                    const parent = wrapper.parentNode;
                    while (wrapper.firstChild) {
                      parent.insertBefore(wrapper.firstChild, wrapper);
                    }
                    parent.removeChild(wrapper);
                  });
                }
              });
            };
            
            // Apply styling after KaTeX renders - PASS isRTL as parameter
            // Apply root mirror first, then superscripts (to handle superscripts inside roots)
            applyRootMirror(node, isRTL); // Apply mirror ONLY in RTL mode
            applyRTLSuperscriptStyling(node, isRTL); // Then handle superscripts (including inside roots)
            
            // Also apply after a short delay in case KaTeX renders asynchronously
            setTimeout(() => {
              applyRootMirror(node, isRTL);
              applyRTLSuperscriptStyling(node, isRTL);
            }, 10);
            
            // Apply again after longer delay to ensure it works
            setTimeout(() => {
              applyRootMirror(node, isRTL);
              applyRTLSuperscriptStyling(node, isRTL);
            }, 50);
            
            // Force re-apply after even longer delay
            setTimeout(() => {
              applyRootMirror(node, isRTL);
              applyRTLSuperscriptStyling(node, isRTL);
            }, 200);
            
            // Final re-apply to ensure it works
            setTimeout(() => {
              applyRootMirror(node, isRTL);
              applyRTLSuperscriptStyling(node, isRTL);
            }, 500);
            
            // Convert ALL numbers to Arabic numerals (٠-٩)
            const convertTextNodes = (element) => {
              const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );
              
              const textNodes = [];
              let textNode;
              while ((textNode = walker.nextNode())) {
                if (textNode.textContent && /[0-9]/.test(textNode.textContent)) {
                  textNodes.push(textNode);
                }
              }
              
              // Convert Western numerals to Arabic (Eastern) numerals
              textNodes.forEach((textNode) => {
                textNode.textContent = toArabicNumerals(textNode.textContent);
              });
            };
            
            // Apply number conversion after all styling
            convertTextNodes(node);
          }
        } catch (e) {
          console.error('KaTeX render error:', e);
          node.innerHTML = latexValue || (typeof value === 'string' ? value : '');
        }
        
        return node;
      }

      static value(node) {
        // Return string (LaTeX) for Quill compatibility
        // RTL flag is stored in data-rtl attribute
        return node.getAttribute('data-latex') || '';
      }

      static formats(node) {
        // Return string for Quill compatibility
        return node.getAttribute('data-latex') || '';
      }
    };
    
    return MathBlot;
  } catch (e) {
    console.warn('Failed to create MathBlot class:', e);
    return null;
  }
};

// Register MathBlot when Quill is ready - deferred to avoid initialization issues
let isRegistered = false;

const registerMathBlot = () => {
  if (isRegistered) return true;
  
  try {
    const Quill = getQuill();
    if (!Quill || typeof Quill.import !== 'function' || typeof Quill.register !== 'function') {
      return false;
    }
    
    const MathBlotClass = getMathBlot();
    if (!MathBlotClass) {
      return false;
    }
    
    // Check if already registered
    try {
      const existingFormat = Quill.import('formats/math', true);
      const existingBlot = Quill.import('blots/math', true);
      if (existingFormat || existingBlot) {
        isRegistered = true;
        return true;
      }
    } catch (e) {
      // Not registered yet, continue
    }
    
    Quill.register(MathBlotClass);
    isRegistered = true;
    return true;
  } catch (e) {
    console.warn('Failed to register MathBlot:', e);
    return false;
  }
};

// Don't register immediately - wait for component to mount
// Registration will happen when component uses Quill

// Export function to get MathBlot class - lazy getter that ensures Quill is ready
const getMathBlot = () => {
  if (!MathBlot) {
    MathBlot = createMathBlotClass();
  }
  return MathBlot;
};

// Don't auto-register - registration must be triggered manually from components
// This avoids all initialization issues

export default getMathBlot;
export { createMathBlotClass, registerMathBlot };
// setQuillInstance is already exported at the top of the file
