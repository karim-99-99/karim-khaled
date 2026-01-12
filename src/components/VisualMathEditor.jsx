import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { isArabicBrowser } from '../utils/language';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { convertLatexToMarkup } from 'mathlive';

// Dynamically import MathLive
let MathfieldElement = null;

const VisualMathEditor = ({ value, onChange, placeholder }) => {
  const [showMathModal, setShowMathModal] = useState(false);
  const [mathValue, setMathValue] = useState('');
  const [mathLiveLoaded, setMathLiveLoaded] = useState(false);
  const quillRef = useRef(null);
  const mathfieldRef = useRef(null);

  useEffect(() => {
    // Load MathLive dynamically with CSS
    const loadMathLive = async () => {
      try {
        // Import CSS files
        await Promise.all([
          import('mathlive/fonts.css'),
          import('mathlive/static.css')
        ]).catch(() => {
          console.log('MathLive CSS loaded from CDN fallback');
        });

        // Import MathLive
        const mathlive = await import('mathlive');
        MathfieldElement = mathlive.MathfieldElement;
        setMathLiveLoaded(true);
        console.log('MathLive loaded successfully');
      } catch (error) {
        console.error('Failed to load MathLive:', error);
      }
    };
    loadMathLive();
  }, []);

  // Re-render existing math equations when value changes (using MathLive math-field)
  useEffect(() => {
    if (!quillRef.current || !mathLiveLoaded || !MathfieldElement) return;

    const editor = quillRef.current.getEditor();
    const mathContainers = editor.root.querySelectorAll('.math-equation-container[data-latex]:not(.rendered)');
    
    mathContainers.forEach((container) => {
      const latex = container.getAttribute('data-latex');
      if (latex && !container.querySelector('math-field')) {
        try {
          // Create a read-only math-field
          const mf = new MathfieldElement({
            readOnly: true,
            mathVirtualKeyboardPolicy: 'off',
          });
          mf.value = latex;
          
          // Style the math-field
          mf.style.display = 'inline-block';
          mf.style.fontSize = '18px';
          mf.style.verticalAlign = 'middle';
          mf.style.margin = '0 4px';
          mf.style.padding = '4px 8px';
          mf.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
          mf.style.border = '2px solid #3b82f6';
          mf.style.borderRadius = '8px';
          mf.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.1)';
          
          container.appendChild(mf);
          container.classList.add('rendered');
        } catch (error) {
          console.error('Error rendering equation:', error);
        }
      }
    });
  }, [value, mathLiveLoaded]);

  useEffect(() => {
    if (mathLiveLoaded && showMathModal && mathfieldRef.current && MathfieldElement) {
      // Create math field
      const mf = new MathfieldElement({
        mathVirtualKeyboardPolicy: 'manual',
      });
      
      // Set initial value
      if (mathValue) {
        mf.value = mathValue;
      }

      // Listen for changes
      mf.addEventListener('input', (evt) => {
        setMathValue(evt.target.value);
      });

      // Clear and append
      mathfieldRef.current.innerHTML = '';
      mathfieldRef.current.appendChild(mf);
    }
  }, [showMathModal, mathLiveLoaded]);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'align',
    'link'
  ];

  const insertMath = () => {
    if (!mathValue || !quillRef.current || !MathfieldElement) {
      setShowMathModal(false);
      return;
    }

    try {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      
      // Create a unique ID for this equation
      const mathId = `math-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Insert a placeholder that will be replaced with actual MathLive component
      const mathHTML = `<span class="math-equation-container" id="${mathId}" data-latex="${mathValue.replace(/"/g, '&quot;')}"></span>&nbsp;`;
      editor.clipboard.dangerouslyPasteHTML(range.index, mathHTML);
      
      // Create and insert the actual MathLive math-field element
      setTimeout(() => {
        const container = document.getElementById(mathId);
        if (container) {
          // Create a read-only math-field
          const mf = new MathfieldElement({
            readOnly: true,
            mathVirtualKeyboardPolicy: 'off',
          });
          mf.value = mathValue;
          
          // Style the math-field
          mf.style.display = 'inline-block';
          mf.style.fontSize = '18px';
          mf.style.verticalAlign = 'middle';
          mf.style.margin = '0 4px';
          mf.style.padding = '4px 8px';
          mf.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
          mf.style.border = '2px solid #3b82f6';
          mf.style.borderRadius = '8px';
          mf.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.1)';
          
          container.appendChild(mf);
        }
      }, 100);
      
      const newContent = editor.root.innerHTML;
      if (onChange) {
        onChange(newContent);
      }

      setShowMathModal(false);
      setMathValue('');
    } catch (error) {
      console.error('Error inserting math:', error);
      alert(isArabicBrowser() ? 'خطأ في إدراج المعادلة' : 'Error inserting equation');
    }
  };

  // Quick math templates
  const mathTemplates = [
    { icon: '𝑥/𝑦', latex: '\\frac{#@}{#?}', label: isArabicBrowser() ? 'كسر' : 'Fraction' },
    { icon: '√', latex: '\\sqrt{#0}', label: isArabicBrowser() ? 'جذر' : 'Root' },
    { icon: '𝑥²', latex: '#0^{#?}', label: isArabicBrowser() ? 'أس' : 'Power' },
    { icon: '𝑥₂', latex: '#0_{#?}', label: isArabicBrowser() ? 'منخفض' : 'Subscript' },
    { icon: '∑', latex: '\\sum_{#0}^{#?}', label: isArabicBrowser() ? 'مجموع' : 'Sum' },
    { icon: '∫', latex: '\\int_{#0}^{#?}', label: isArabicBrowser() ? 'تكامل' : 'Integral' },
    { icon: 'lim', latex: '\\lim_{#0\\to #?}', label: isArabicBrowser() ? 'نهاية' : 'Limit' },
    { icon: '()', latex: '\\left(#0\\right)', label: isArabicBrowser() ? 'أقواس' : 'Parentheses' },
    { icon: '[]', latex: '\\left[#0\\right]', label: isArabicBrowser() ? 'أقواس مربعة' : 'Brackets' },
    { icon: '{}', latex: '\\left\\{#0\\right\\}', label: isArabicBrowser() ? 'أقواس معقوفة' : 'Braces' },
    { icon: 'π', latex: '\\pi', label: 'Pi' },
    { icon: 'α', latex: '\\alpha', label: 'Alpha' },
    { icon: 'β', latex: '\\beta', label: 'Beta' },
    { icon: 'θ', latex: '\\theta', label: 'Theta' },
    { icon: '≤', latex: '\\leq', label: isArabicBrowser() ? 'أصغر أو يساوي' : 'Less or Equal' },
    { icon: '≥', latex: '\\geq', label: isArabicBrowser() ? 'أكبر أو يساوي' : 'Greater or Equal' },
    { icon: '≠', latex: '\\neq', label: isArabicBrowser() ? 'لا يساوي' : 'Not Equal' },
    { icon: '≈', latex: '\\approx', label: isArabicBrowser() ? 'تقريباً' : 'Approximately' },
    { icon: '∞', latex: '\\infty', label: isArabicBrowser() ? 'لانهاية' : 'Infinity' },
    { icon: '±', latex: '\\pm', label: isArabicBrowser() ? 'زائد أو ناقص' : 'Plus Minus' },
  ];

  const insertTemplate = (latex) => {
    if (mathfieldRef.current && mathfieldRef.current.querySelector('math-field')) {
      const mf = mathfieldRef.current.querySelector('math-field');
      mf.executeCommand(['insert', latex]);
    }
  };

  return (
    <div className="visual-math-editor">
      <div className="mb-2">
        <button
          type="button"
          onClick={() => setShowMathModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
        >
          <span className="text-xl">𝑓(𝑥)</span>
          {isArabicBrowser() ? 'محرر المعادلات المرئي' : 'Visual Equation Editor'}
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

      {showMathModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {isArabicBrowser() ? 'محرر المعادلات المرئي' : 'Visual Equation Editor'}
              </h3>
              <button
                type="button"
                onClick={() => setShowMathModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              {/* Quick Templates */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2">
                  {isArabicBrowser() ? 'قوالب سريعة:' : 'Quick Templates:'}
                </h4>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {mathTemplates.map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => insertTemplate(template.latex)}
                      className="px-2 py-2 bg-gray-100 hover:bg-blue-100 rounded text-center border border-gray-300 hover:border-blue-500"
                      title={template.label}
                    >
                      <span className="text-lg">{template.icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Math Editor */}
              {mathLiveLoaded ? (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">
                    {isArabicBrowser() ? 'المحرر المرئي:' : 'Visual Editor:'}
                  </h4>
                  <div 
                    ref={mathfieldRef}
                    className="border-2 border-gray-300 rounded p-4 min-h-[100px] bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {isArabicBrowser() 
                      ? 'استخدم القوالب السريعة أعلاه أو اكتب مباشرة. يمكنك استخدام لوحة المفاتيح أو النقر على الرموز.' 
                      : 'Use quick templates above or type directly. You can use keyboard or click on symbols.'}
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-4 text-center text-gray-500">
                  {isArabicBrowser() ? 'جاري تحميل المحرر...' : 'Loading editor...'}
                </div>
              )}

              {/* LaTeX Preview */}
              {mathValue && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">
                    {isArabicBrowser() ? 'كود LaTeX:' : 'LaTeX Code:'}
                  </h4>
                  <div className="p-2 bg-gray-100 rounded font-mono text-sm break-all">
                    {mathValue}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowMathModal(false);
                    setMathValue('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={insertMath}
                  disabled={!mathValue}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isArabicBrowser() ? 'إدراج المعادلة' : 'Insert Equation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .visual-math-editor .ql-editor {
          min-height: 300px;
          direction: ${isArabicBrowser() ? 'rtl' : 'ltr'};
          text-align: ${isArabicBrowser() ? 'right' : 'left'};
        }
        
        /* Math equation container - wraps the math-field */
        .visual-math-editor .math-equation-container {
          display: inline-block;
          vertical-align: middle;
          cursor: pointer;
          transition: all 0.2s;
        }

        .visual-math-editor .math-equation-container:hover {
          transform: translateY(-1px);
        }

        /* MathLive math-field styling inside the text editor */
        .visual-math-editor .ql-editor math-field {
          display: inline-block !important;
          font-size: 18px !important;
          vertical-align: middle !important;
          margin: 0 4px !important;
          padding: 4px 8px !important;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
          border: 2px solid #3b82f6 !important;
          border-radius: 8px !important;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1) !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        }

        .visual-math-editor .ql-editor math-field:hover {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
          border-color: #2563eb !important;
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2) !important;
        }

        /* Ensure math-field content is styled properly */
        .visual-math-editor .ql-editor math-field::part(container) {
          padding: 0;
        }

        /* MathLive styling for the modal editor */
        .visual-math-editor math-field {
          font-size: 24px;
          padding: 10px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          min-height: 80px;
        }

        .visual-math-editor math-field:focus {
          border-color: #3b82f6;
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default VisualMathEditor;
