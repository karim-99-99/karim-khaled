import React, { useState, useRef, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { isArabicBrowser } from '../utils/language';
import 'katex/dist/katex.min.css';
// Import mathBlot - we'll register it manually after Quill is ready
import { setQuillInstance } from '../components/mathBlot';

// Set Quill instance for mathBlot to use - do this immediately
// This must happen before any Quill operations
if (typeof Quill !== 'undefined') {
  setQuillInstance(Quill);
}

// Register Quill modules before component definition to ensure they're ready
let modulesRegistered = false;

const registerQuillModules = async () => {
  if (modulesRegistered || typeof Quill === 'undefined') return;
  
  try {
    const BlotFormatterModule = await import('quill-blot-formatter');
    const ImageDropModule = await import('quill-image-drop-and-paste');
    
    const BlotFormatter = BlotFormatterModule.default || BlotFormatterModule;
    const ImageDrop = ImageDropModule.default || ImageDropModule;
    
    if (BlotFormatter && !Quill.imports?.['modules/blotFormatter']) {
      Quill.register('modules/blotFormatter', BlotFormatter);
    }
    if (ImageDrop && !Quill.imports?.['modules/imageDrop']) {
      Quill.register('modules/imageDrop', ImageDrop);
    }
    modulesRegistered = true;
  } catch (e) {
    console.warn('Failed to register Quill modules:', e);
  }
};

// Start registration immediately
registerQuillModules();

// Math Blot handles all rendering - no need for manual rendering

const SimpleProfessionalMathEditor = ({ value, onChange, placeholder }) => {
  const [showMathModal, setShowMathModal] = useState(false);
  const [mathValue, setMathValue] = useState('');
  const [editingMathIndex, setEditingMathIndex] = useState(null); // Track which equation is being edited
  const [MathfieldElement, setMathfieldElement] = useState(null);
  const quillRef = useRef(null);
  const mathfieldRef = useRef(null);
  const [isRTL, setIsRTL] = useState(() => {
    // Load RTL preference from localStorage
    const saved = localStorage.getItem('mathEditorRTL');
    return saved ? JSON.parse(saved) : true; // Default to RTL for Arabic
  });

  // Ensure modules and MathBlot are registered
  useEffect(() => {
    // Ensure Quill instance is set
    if (typeof Quill !== 'undefined') {
      setQuillInstance(Quill);
    }
    
    // Register Quill modules first
    registerQuillModules();
    
    // Register MathBlot after Quill modules are registered
    const registerMathBlotDelayed = () => {
      // Ensure Quill instance is available
      if (typeof Quill === 'undefined') {
        setTimeout(registerMathBlotDelayed, 50);
        return;
      }
      
      setQuillInstance(Quill);
      
      import('../components/mathBlot').then((mathBlotModule) => {
        if (mathBlotModule && mathBlotModule.registerMathBlot) {
          // Try to register if not already registered
          const success = mathBlotModule.registerMathBlot();
          if (!success) {
            // Retry after a delay if first attempt failed
            setTimeout(() => {
              mathBlotModule.registerMathBlot();
            }, 200);
          }
        }
      }).catch((e) => {
        console.warn('Failed to load mathBlot module:', e);
      });
    };
    
    // Wait for Quill to be ready
    setTimeout(registerMathBlotDelayed, 150);
  }, []);

  // Load MathLive dynamically
  useEffect(() => {
    Promise.all([
      import('mathlive/fonts.css'),
      import('mathlive/static.css')
    ]).catch(() => {});

    import('mathlive').then((mathlive) => {
      setMathfieldElement(() => mathlive.MathfieldElement);
    }).catch((error) => {
      console.error('Failed to load MathLive:', error);
    });
  }, []);

  // Math templates
  const mathTemplates = [
    { icon: '½', latex: '\\frac{1}{2}', label: isArabicBrowser() ? 'نصف' : 'Half' },
    { icon: '⅓', latex: '\\frac{1}{3}', label: isArabicBrowser() ? 'ثلث' : 'Third' },
    { icon: '¼', latex: '\\frac{1}{4}', label: isArabicBrowser() ? 'ربع' : 'Quarter' },
    { icon: '⅔', latex: '\\frac{2}{3}', label: isArabicBrowser() ? 'ثلثان' : 'Two thirds' },
    { icon: '¾', latex: '\\frac{3}{4}', label: isArabicBrowser() ? 'ثلاثة أرباع' : '3/4' },
    { icon: '𝑎/𝑏', latex: '\\frac{#@}{#?}', label: isArabicBrowser() ? 'كسر عام' : 'Fraction' },
    { icon: '√', latex: '\\sqrt{#0}', label: isArabicBrowser() ? 'جذر تربيعي' : 'Square root' },
    { icon: '∛', latex: '\\sqrt[3]{#0}', label: isArabicBrowser() ? 'جذر تكعيبي' : 'Cube root' },
    { icon: '𝑥²', latex: '#0^{2}', label: isArabicBrowser() ? 'تربيع' : 'Square' },
    { icon: '𝑥³', latex: '#0^{3}', label: isArabicBrowser() ? 'تكعيب' : 'Cube' },
    { icon: '𝑥ⁿ', latex: '#0^{#?}', label: isArabicBrowser() ? 'أس' : 'Power' },
    { icon: '𝑥₁', latex: '#0_{1}', label: isArabicBrowser() ? 'منخفض' : 'Subscript' },
    { icon: '∑', latex: '\\sum_{#0}^{#?}', label: isArabicBrowser() ? 'مجموع' : 'Sum' },
    { icon: '∫', latex: '\\int_{#0}^{#?}', label: isArabicBrowser() ? 'تكامل' : 'Integral' },
    { icon: '()', latex: '\\left(#0\\right)', label: isArabicBrowser() ? 'أقواس' : 'Parentheses' },
    { icon: '[]', latex: '\\left[#0\\right]', label: isArabicBrowser() ? 'أقواس مربعة' : 'Brackets' },
    { icon: '÷', latex: '\\div', label: isArabicBrowser() ? 'قسمة' : 'Division' },
    { icon: '×', latex: '\\times', label: isArabicBrowser() ? 'ضرب' : 'Multiplication' },
    { icon: '+', latex: '+', label: isArabicBrowser() ? 'جمع' : 'Addition' },
    { icon: '−', latex: '-', label: isArabicBrowser() ? 'طرح' : 'Subtraction' },
    { icon: '=', latex: '=', label: isArabicBrowser() ? 'يساوي' : 'Equals' },
    { icon: '≠', latex: '\\neq', label: isArabicBrowser() ? 'لا يساوي' : 'Not equal' },
    { icon: '≤', latex: '\\leq', label: isArabicBrowser() ? 'أقل أو يساوي' : 'Less or equal' },
    { icon: '≥', latex: '\\geq', label: isArabicBrowser() ? 'أكبر أو يساوي' : 'Greater or equal' },
    { icon: 'π', latex: '\\pi', label: isArabicBrowser() ? 'باي' : 'Pi' },
    { icon: '±', latex: '\\pm', label: isArabicBrowser() ? 'زائد/ناقص' : 'Plus/minus' },
    { icon: '∞', latex: '\\infty', label: isArabicBrowser() ? 'لا نهاية' : 'Infinity' },
  ];

  // Quill toolbar with image support
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'direction': 'rtl' }],
      ['link', 'image'],
      ['clean']
    ],
    // Enable image formatter for resize and alignment
    blotFormatter: {},
    // Enable drag & drop images
    imageDrop: true,
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'align',
    'direction', 'link', 'image', 'math'
  ];

  // Custom image handler - handle image uploads
  useEffect(() => {
    if (!quillRef.current) return;
    
    const editor = quillRef.current.getEditor();
    const toolbar = editor.getModule('toolbar');
    
    toolbar.addHandler('image', () => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');
      input.click();

      input.onchange = () => {
        const file = input.files[0];
        if (file) {
          // Check file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            alert(isArabicBrowser() 
              ? 'حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت' 
              : 'Image too large. Maximum size is 5MB');
            return;
          }

          // Convert to base64
          const reader = new FileReader();
          reader.onload = (e) => {
            const imageUrl = e.target.result;
            const range = editor.getSelection(true);
            
            // Insert image - blotFormatter will handle resize and alignment
            editor.insertEmbed(range.index, 'image', imageUrl);
            editor.setSelection(range.index + 1);
            
            // Update onChange
            if (onChange) {
              onChange(editor.root.innerHTML);
            }
          };
          reader.readAsDataURL(file);
        }
      };
    });
  }, [onChange]);

  // Insert or update math equation as Quill Embed (Math Blot)
  const insertMath = () => {
    // Get the current value from MathLive field
    let currentMathValue = '';
    if (mathfieldRef.current) {
      const mf = mathfieldRef.current.querySelector('math-field');
      if (mf) {
        currentMathValue = mf.value || mf.getValue?.() || '';
      }
    }
    
    // If no value from field, try state
    if (!currentMathValue && mathValue) {
      currentMathValue = mathValue;
    }
    
    // Check if we have a valid value
    if (!currentMathValue || !currentMathValue.trim()) {
      alert(isArabicBrowser() 
        ? 'الرجاء كتابة معادلة رياضية قبل الإدراج' 
        : 'Please enter a math equation before inserting');
      return;
    }
    
    if (!quillRef.current) {
      setShowMathModal(false);
      return;
    }
    
    // Update state with final value
    setMathValue(currentMathValue);

    try {
      const editor = quillRef.current.getEditor();
      
      // Pass as JSON string to avoid [object Object] issue
      const mathData = JSON.stringify({
        latex: currentMathValue,
        rtl: isRTL
      });
      
      if (editingMathIndex !== null) {
        // Editing existing equation - replace it
        const mathBlots = Array.from(editor.root.querySelectorAll('span.math-equation[data-latex]'));
        if (mathBlots[editingMathIndex]) {
          const blotNode = mathBlots[editingMathIndex];
          try {
            const blot = Quill.find(blotNode, true);
            if (blot) {
              const index = editor.getIndex(blot);
              // Delete old equation and insert new one with RTL flag
              editor.deleteText(index, blot.length(), 'user');
              editor.insertEmbed(index, 'math', mathData, 'user');
              editor.setSelection(index + 1);
            }
          } catch (error) {
            console.error('Error replacing equation:', error);
            // Fallback: remove old node and insert at same position
            const range = editor.getSelection();
            if (range) {
              blotNode.remove();
              editor.insertEmbed(range.index, 'math', mathData, 'user');
              editor.setSelection(range.index + 1);
            }
          }
        }
        setEditingMathIndex(null);
      } else {
        // Inserting new equation with RTL flag
        const range = editor.getSelection(true) || { index: editor.getLength() };
        editor.insertEmbed(range.index, 'math', mathData, 'user');
        editor.setSelection(range.index + 1);
      }
      
      // Update onChange
      setTimeout(() => {
        if (onChange && quillRef.current) {
          try {
            const newContent = quillRef.current.getEditor().root.innerHTML;
            onChange(newContent);
          } catch (err) {
            console.error('Error updating content:', err);
          }
        }
      }, 50);

      // Close modal and reset
      setShowMathModal(false);
      setMathValue('');
      setEditingMathIndex(null);
    } catch (error) {
      console.error('Error inserting math:', error);
      // Don't close modal on error so user can try again
      alert(isArabicBrowser() 
        ? `خطأ في إدراج المعادلة: ${error.message}. حاول مرة أخرى.` 
        : `Error inserting equation: ${error.message}. Please try again.`);
    }
  };

  // Handle click on math equation (Word-like: double-click to edit)
  useEffect(() => {
    if (!quillRef.current) return;

    const editor = quillRef.current.getEditor();
    const root = editor.root;

    const handleMathClick = (e) => {
      const mathElement = e.target.closest('.math-equation[data-latex]');
      if (mathElement) {
        e.preventDefault();
        e.stopPropagation();
        
        // Get LaTeX value and RTL flag
        const latex = mathElement.getAttribute('data-latex');
        const rtlAttr = mathElement.getAttribute('data-rtl');
        const isRTLValue = rtlAttr === 'true' || rtlAttr === null; // Default to true if not set
        
        if (latex) {
          // Find index of this equation in all math equations
          const allMathElements = Array.from(root.querySelectorAll('.math-equation[data-latex]'));
          const index = allMathElements.indexOf(mathElement);
          
          setEditingMathIndex(index);
          setMathValue(latex);
          setIsRTL(isRTLValue); // Update RTL state to match equation
          setShowMathModal(true);
        }
      }
    };

    // Use event delegation for click handling
    root.addEventListener('click', handleMathClick);
    root.addEventListener('dblclick', handleMathClick); // Also support double-click like Word

    return () => {
      root.removeEventListener('click', handleMathClick);
      root.removeEventListener('dblclick', handleMathClick);
    };
  }, [value]);

  // Initialize MathLive field
  useEffect(() => {
    if (showMathModal && mathfieldRef.current && MathfieldElement) {
      mathfieldRef.current.innerHTML = '';
      const mf = new MathfieldElement();
      if (mathValue) {
        mf.value = mathValue; // Load existing LaTeX when editing
      }
      
      // Don't update state on every input - only when inserting
      // This prevents cursor jumping and allows smooth editing
      mf.addEventListener('input', (evt) => {
        // Store value in the element itself, don't trigger re-render
        // We'll read it when user clicks "Insert"
      });
      
      mathfieldRef.current.appendChild(mf);
      
      // Focus the math field
      setTimeout(() => {
        mf.focus();
      }, 100);
    }
  }, [showMathModal, MathfieldElement, mathValue]);

  // Insert template
  const insertTemplate = (latex) => {
    if (mathfieldRef.current) {
      const mf = mathfieldRef.current.querySelector('math-field');
      if (mf) {
        mf.executeCommand(['insert', latex]);
        // Don't update state - just let user continue editing
        // Value will be read when user clicks "Insert"
        mf.focus();
      }
    }
  };

  // Toggle RTL/LTR and re-render all equations
  const toggleRTL = () => {
    const newRTL = !isRTL;
    setIsRTL(newRTL);
    localStorage.setItem('mathEditorRTL', JSON.stringify(newRTL));
    
    // Re-render all existing equations with new RTL setting
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const mathBlots = Array.from(editor.root.querySelectorAll('span.math-equation[data-latex]'));
      
      // Store all equations with their positions
      const equations = [];
      mathBlots.forEach((blotNode) => {
        const latex = blotNode.getAttribute('data-latex');
        if (latex) {
          try {
            const blot = Quill.find(blotNode, true);
            if (blot) {
              const index = editor.getIndex(blot);
              equations.push({ index, latex, blot });
            }
          } catch (error) {
            console.error('Error finding blot:', error);
          }
        }
      });
      
      // Sort by index (reverse order to avoid index shifting)
      equations.sort((a, b) => b.index - a.index);
      
      // Replace all equations with new RTL setting
      equations.forEach(({ index, latex, blot }) => {
        try {
          editor.deleteText(index, blot.length(), 'user');
          const mathData = JSON.stringify({ latex, rtl: newRTL });
          editor.insertEmbed(index, 'math', mathData, 'user');
        } catch (error) {
          console.error('Error updating equation RTL:', error);
        }
      });
      
      // Force re-apply styling after re-render
      setTimeout(() => {
        const updatedMathBlots = Array.from(editor.root.querySelectorAll('span.math-equation[data-latex]'));
        updatedMathBlots.forEach((blotNode) => {
          // Update data-rtl attribute
          blotNode.setAttribute('data-rtl', newRTL ? 'true' : 'false');
          blotNode.setAttribute('dir', newRTL ? 'rtl' : 'ltr');
          if (newRTL) {
            blotNode.classList.add('math-rtl');
            blotNode.classList.remove('math-ltr');
          } else {
            blotNode.classList.add('math-ltr');
            blotNode.classList.remove('math-rtl');
          }
          // Re-apply superscript styling - swap DOM order (including inside roots)
          const msupElements = blotNode.querySelectorAll('.msup, .msupsub');
          msupElements.forEach((msup) => {
            if (!msup.closest('.mop.op-limits') && !msup.closest('.op-limits')) {
              // Check if inside a root - we still want to process it
              const isInsideRoot = msup.closest('.sqrt') !== null;
              
              const wasRTL = msup.dataset.rtlReversed === 'true';
              
              if (newRTL && !wasRTL) {
                // RTL mode: Move superscript to LEFT (4² → ²4)
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
                    
                    // Flip children back so they're readable
                    base.style.setProperty('transform', 'scaleX(-1)', 'important');
                    base.style.setProperty('display', 'inline-block', 'important');
                    sup.style.setProperty('transform', 'scaleX(-1)', 'important');
                    sup.style.setProperty('display', 'inline-block', 'important');
                  }
                }
                
              } else if (!newRTL && wasRTL) {
                // LTR mode: Restore normal order (²4 → 4²)
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
                
                msup.style.setProperty('display', 'inline', 'important');
                msup.style.setProperty('flex-direction', 'initial', 'important');
                msup.style.setProperty('align-items', 'initial', 'important');
                msup.style.setProperty('direction', 'initial', 'important');
              }
            }
          });
          
          // Re-apply root mirror styling based on RTL/LTR
          const sqrtElements = blotNode.querySelectorAll('.sqrt');
          sqrtElements.forEach((sqrt) => {
            // Remove previous mirror state
            sqrt.dataset.mirrored = 'false';
            
            if (newRTL) {
              // RTL mode: Apply horizontal mirror
              sqrt.style.setProperty('transform', 'scaleX(-1)', 'important');
              sqrt.style.setProperty('display', 'inline-flex', 'important');
              sqrt.style.setProperty('flex-wrap', 'nowrap', 'important');
              sqrt.style.setProperty('align-items', 'baseline', 'important');
              sqrt.style.setProperty('direction', 'ltr', 'important');
              sqrt.style.setProperty('white-space', 'nowrap', 'important');
              sqrt.dataset.mirrored = 'true';
              
              // Flip text/numbers back - but NOT msup children (we'll handle that separately)
              const textElements = sqrt.querySelectorAll('.vlist-r, .mord, .mnum, .root, .vlist-t');
              textElements.forEach((el) => {
                // Skip if inside msup
                if (el.closest('.msup, .msupsub')) {
                  return;
                }
                el.style.setProperty('transform', 'scaleX(-1)', 'important');
                el.style.setProperty('display', 'inline-block', 'important');
              });
              
              // Handle msup inside root: apply styles (swapping will be done in applyRTLSuperscriptStyling)
              const msupInsideRoot = sqrt.querySelectorAll('.msup, .msupsub');
              msupInsideRoot.forEach((msup) => {
                // Just set the display properties, don't swap here
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
          
        });
      }, 300);
      
      // Update onChange after all updates
      setTimeout(() => {
        if (onChange && quillRef.current) {
          const newContent = quillRef.current.getEditor().root.innerHTML;
          onChange(newContent);
        }
      }, 400);
    }
  };


  return (
    <div className="simple-professional-math-editor">
      {/* Math Button and RTL/LTR Toggle */}
      <div className="mb-3 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setEditingMathIndex(null); // Reset editing state
            setShowMathModal(true);
            setMathValue('');
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="text-2xl">𝑓(𝑥)</span>
          <span>{isArabicBrowser() ? 'إضافة معادلة رياضية' : 'Add Math Equation'}</span>
        </button>
        
        
        {/* RTL/LTR Toggle Button - Always Visible */}
        <button
          type="button"
          onClick={toggleRTL}
          className={`px-5 py-3 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 shadow-lg transform hover:scale-105 ${
            isRTL 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700' 
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
          }`}
          title={isRTL 
            ? (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع الإنجليزي (LTR)' : 'Click to switch to LTR mode') 
            : (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع العربي (RTL)' : 'Click to switch to RTL mode')
          }
        >
          <span className="text-2xl">
            {isRTL ? '🇸🇦' : '🇬🇧'}
          </span>
          <span className="text-base font-black">
            {isRTL ? 'RTL' : 'LTR'}
          </span>
          <span className="text-xs opacity-90">
            {isRTL 
              ? (isArabicBrowser() ? '(الأسس على اليسار)' : '(Powers on left)')
              : (isArabicBrowser() ? '(عرض طبيعي)' : '(Normal display)')
            }
          </span>
        </button>
      </div>

      <ReactQuill
        ref={quillRef}
        value={value || ''}
        onChange={(content) => onChange && onChange(content)}
        modules={modules}
        formats={formats}
        placeholder={placeholder || (isArabicBrowser() ? 'اكتب السؤال هنا...' : 'Write question here...')}
        theme="snow"
        dir={isArabicBrowser() ? 'rtl' : 'ltr'}
      />

      {/* Math Modal */}
      {showMathModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowMathModal(false)}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <span className="text-3xl">𝑓(𝑥)</span>
                  <span>
                    {editingMathIndex !== null 
                      ? (isArabicBrowser() ? 'تعديل المعادلة الرياضية' : 'Edit Math Equation')
                      : (isArabicBrowser() ? 'محرر المعادلات الرياضية' : 'Math Equation Editor')
                    }
                  </span>
                </h3>
                <div className="flex items-center gap-3">
                  {/* RTL/LTR Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleRTL}
                    className={`px-5 py-2.5 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 shadow-lg transform hover:scale-105 ${
                      isRTL 
                        ? 'bg-white text-blue-700 hover:bg-blue-50' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                    title={isRTL 
                      ? (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع الإنجليزي' : 'Click to switch to LTR') 
                      : (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع العربي' : 'Click to switch to RTL')
                    }
                  >
                    <span className="text-xl">
                      {isRTL ? '🇸🇦' : '🇬🇧'}
                    </span>
                    <span className="text-base font-black">
                      {isRTL ? 'RTL' : 'LTR'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMathModal(false)}
                    className="text-white hover:bg-white hover:text-blue-700 rounded-full w-10 h-10 flex items-center justify-center text-3xl transition font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <p className={`flex-1 text-sm px-3 py-2 rounded ${
                  isRTL ? 'bg-white bg-opacity-20 text-white font-bold' : 'bg-blue-800 bg-opacity-30 text-blue-100'
                }`}>
                  {isRTL
                    ? (isArabicBrowser() 
                      ? '🇸🇦 وضع عربي: الأسس على اليسار (مثال: ٢³ → ³٢)' 
                      : '🇸🇦 RTL Mode: Powers on left (e.g. 2³ → ³٢)')
                    : (isArabicBrowser() 
                      ? '🇬🇧 وضع إنجليزي: عرض طبيعي (مثال: ٢³)' 
                      : '🇬🇧 LTR Mode: Standard display (e.g. 2³)')
                  }
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h4 className="font-bold text-xl mb-4 text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  {isArabicBrowser() ? 'قوالب سريعة:' : 'Quick Templates:'}
                </h4>
                <div className="grid grid-cols-5 md:grid-cols-9 gap-3">
                  {mathTemplates.map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => insertTemplate(template.latex)}
                      className="group relative px-3 py-4 bg-gradient-to-br from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 rounded-xl text-center border-2 border-blue-200 hover:border-blue-500 transition-all transform hover:scale-105 shadow-sm hover:shadow-md"
                      title={template.label}
                    >
                      <span className="text-2xl font-bold text-blue-700">{template.icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {MathfieldElement && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                      <span className="text-2xl">✏️</span>
                      {isArabicBrowser() ? 'المحرر المرئي:' : 'Visual Editor:'}
                    </h4>
                    <span className={`px-4 py-2 rounded-lg text-sm font-bold shadow-md ${
                      isRTL 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-green-500 text-white'
                    }`}>
                      {isRTL ? '🇸🇦 عربي RTL' : '🇬🇧 English LTR'}
                    </span>
                  </div>
                  <div 
                    ref={mathfieldRef}
                    className={`border-4 border-blue-300 rounded-xl p-6 min-h-[120px] bg-gradient-to-br from-white to-blue-50 shadow-inner ${
                      isRTL ? 'math-rtl-mode' : 'math-ltr-mode'
                    }`}
                  />
                  <p className="text-sm text-gray-600 mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    💡 {isArabicBrowser() 
                      ? 'استخدم القوالب السريعة أعلاه، أو اكتب مباشرة في المحرر' 
                      : 'Use quick templates above, or type directly in the editor'}
                  </p>
                </div>
              )}

              <div className="flex gap-4 justify-end pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowMathModal(false);
                    setMathValue('');
                    setEditingMathIndex(null);
                  }}
                  className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all shadow hover:shadow-md"
                >
                  {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={insertMath}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  ✓ {editingMathIndex !== null 
                    ? (isArabicBrowser() ? 'حفظ التعديلات' : 'Save Changes')
                    : (isArabicBrowser() ? 'إدراج المعادلة' : 'Insert Equation')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .simple-professional-math-editor .ql-container {
          font-family: inherit;
          position: relative !important;
        }
        
        .simple-professional-math-editor .ql-editor {
          min-height: 400px;
          font-size: 17px;
          line-height: 1.8;
          position: relative !important;
        }
        
        /* Math equations styling - RTL for Arabic layout */
        .simple-professional-math-editor .ql-editor .math-equation {
          display: inline-block;
          vertical-align: middle;
          margin: 0 4px;
          padding: 2px 4px;
          cursor: pointer;
          transition: background-color 0.2s;
          direction: rtl;
          text-align: right;
        }
        
        .simple-professional-math-editor .ql-editor .math-equation:hover {
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 4px;
        }
        
        /* KaTeX fraction styling - CRITICAL for proper display - RTL */
        .simple-professional-math-editor .ql-editor .math-equation .katex {
          font-size: 1.1em !important;
          direction: rtl !important;
          text-align: right !important;
        }
        
        /* CRITICAL: Proper fraction display */
        .simple-professional-math-editor .ql-editor .math-equation .katex .frac {
          display: inline-block !important;
          vertical-align: middle !important;
          text-align: center !important;
          position: relative !important;
        }
        
        .simple-professional-math-editor .ql-editor .math-equation .katex .frac > span {
          display: block !important;
        }
        
        .simple-professional-math-editor .ql-editor .math-equation .katex .frac-num {
          display: block !important;
          text-align: center !important;
          line-height: 1.2 !important;
        }
        
        .simple-professional-math-editor .ql-editor .math-equation .katex .frac-line {
          border-bottom: 0.04em solid currentColor !important;
          display: block !important;
          width: 100% !important;
          height: 0 !important;
          margin: 0.1em 0 !important;
        }
        
        .simple-professional-math-editor .ql-editor .math-equation .katex .frac-den {
          display: block !important;
          text-align: center !important;
          line-height: 1.2 !important;
        }
        
        math-field {
          font-family: inherit;
        }

        math-field::part(container) {
          border: none;
          padding: 0;
        }
      `}</style>
    </div>
  );
};

export default SimpleProfessionalMathEditor;
