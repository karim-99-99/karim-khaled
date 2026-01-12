import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { isArabicBrowser } from '../utils/language';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Convert Western numerals to Arabic numerals
const toArabicNumerals = (str) => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
};

// Render LaTeX with KaTeX and convert to Arabic numerals
const renderMathWithArabicNumerals = (latex) => {
  try {
    const rendered = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: 'html'
    });
    // Convert all numbers in the rendered HTML to Arabic numerals
    return toArabicNumerals(rendered);
  } catch (e) {
    return toArabicNumerals(latex);
  }
};

// Custom Quill Blot for inline math rendering with KaTeX
const Inline = Quill.import('blots/inline');

// Only register once
let mathBlotRegistered = false;

class MathBlot extends Inline {
  static blotName = 'math';
  static tagName = 'span';
  static className = 'ql-math';

  static create(value) {
    const node = super.create();
    node.setAttribute('contenteditable', 'false');
    node.setAttribute('data-latex', value);
    node.innerHTML = renderMathWithArabicNumerals(value);
    return node;
  }

  static value(node) {
    return node.getAttribute('data-latex');
  }

  static formats(node) {
    return node.getAttribute('data-latex');
  }
}

if (!mathBlotRegistered) {
  try {
    Quill.register(MathBlot, true);
    mathBlotRegistered = true;
  } catch (e) {
    console.log('MathBlot already registered');
  }
}

const ProfessionalMathEditor = ({ value, onChange, placeholder }) => {
  const [showMathModal, setShowMathModal] = useState(false);
  const [mathValue, setMathValue] = useState('');
  const [MathfieldElement, setMathfieldElement] = useState(null);
  const quillRef = useRef(null);
  const mathfieldRef = useRef(null);

  // Load MathLive dynamically
  useEffect(() => {
    // Load CSS
    Promise.all([
      import('mathlive/fonts.css'),
      import('mathlive/static.css')
    ]).catch(() => {
      console.log('MathLive CSS loaded');
    });

    // Load MathLive
    import('mathlive').then((mathlive) => {
      setMathfieldElement(() => mathlive.MathfieldElement);
    }).catch((error) => {
      console.error('Failed to load MathLive:', error);
    });
  }, []);

  // Quick math templates with Arabic display
  const mathTemplates = [
    { icon: '½', latex: '\\frac{1}{2}', label: isArabicBrowser() ? 'نصف (½)' : 'Half' },
    { icon: '⅓', latex: '\\frac{1}{3}', label: isArabicBrowser() ? 'ثلث (⅓)' : 'Third' },
    { icon: '¼', latex: '\\frac{1}{4}', label: isArabicBrowser() ? 'ربع (¼)' : 'Quarter' },
    { icon: '⅔', latex: '\\frac{2}{3}', label: isArabicBrowser() ? 'ثلثان (⅔)' : 'Two thirds' },
    { icon: '¾', latex: '\\frac{3}{4}', label: isArabicBrowser() ? '¾' : '3/4' },
    { icon: '𝑎/𝑏', latex: '\\frac{#@}{#?}', label: isArabicBrowser() ? 'كسر عام' : 'Fraction' },
    { icon: '√', latex: '\\sqrt{#0}', label: isArabicBrowser() ? 'جذر تربيعي' : 'Square root' },
    { icon: '∛', latex: '\\sqrt[3]{#0}', label: isArabicBrowser() ? 'جذر تكعيبي' : 'Cube root' },
    { icon: '𝑥²', latex: '#0^{2}', label: isArabicBrowser() ? 'تربيع (²)' : 'Square' },
    { icon: '𝑥³', latex: '#0^{3}', label: isArabicBrowser() ? 'تكعيب (³)' : 'Cube' },
    { icon: '𝑥ⁿ', latex: '#0^{#?}', label: isArabicBrowser() ? 'أس' : 'Power' },
    { icon: '𝑥₁', latex: '#0_{1}', label: isArabicBrowser() ? 'منخفض ١' : 'Subscript 1' },
    { icon: '𝑥ₙ', latex: '#0_{#?}', label: isArabicBrowser() ? 'منخفض' : 'Subscript' },
    { icon: '∑', latex: '\\sum_{#0}^{#?}', label: isArabicBrowser() ? 'مجموع' : 'Sum' },
    { icon: '∫', latex: '\\int_{#0}^{#?}', label: isArabicBrowser() ? 'تكامل' : 'Integral' },
    { icon: '()', latex: '\\left(#0\\right)', label: isArabicBrowser() ? 'أقواس ()' : 'Parentheses' },
    { icon: '[]', latex: '\\left[#0\\right]', label: isArabicBrowser() ? 'أقواس مربعة []' : 'Brackets' },
    { icon: '{}', latex: '\\left\\{#0\\right\\}', label: isArabicBrowser() ? 'أقواس معقوفة {}' : 'Braces' },
    { icon: '÷', latex: '\\div', label: isArabicBrowser() ? 'قسمة ÷' : 'Division' },
    { icon: '×', latex: '\\times', label: isArabicBrowser() ? 'ضرب ×' : 'Multiplication' },
    { icon: '+', latex: '+', label: isArabicBrowser() ? 'جمع +' : 'Addition' },
    { icon: '−', latex: '-', label: isArabicBrowser() ? 'طرح −' : 'Subtraction' },
    { icon: '=', latex: '=', label: isArabicBrowser() ? 'يساوي =' : 'Equals' },
    { icon: '≠', latex: '\\neq', label: isArabicBrowser() ? 'لا يساوي ≠' : 'Not equal' },
    { icon: '≤', latex: '\\leq', label: isArabicBrowser() ? 'أقل أو يساوي ≤' : 'Less or equal' },
    { icon: '≥', latex: '\\geq', label: isArabicBrowser() ? 'أكبر أو يساوي ≥' : 'Greater or equal' },
    { icon: '<', latex: '<', label: isArabicBrowser() ? 'أقل من <' : 'Less than' },
    { icon: '>', latex: '>', label: isArabicBrowser() ? 'أكبر من >' : 'Greater than' },
    { icon: 'π', latex: '\\pi', label: isArabicBrowser() ? 'باي π' : 'Pi' },
    { icon: '±', latex: '\\pm', label: isArabicBrowser() ? 'زائد/ناقص ±' : 'Plus/minus' },
    { icon: '∞', latex: '\\infty', label: isArabicBrowser() ? 'لا نهاية ∞' : 'Infinity' },
  ];

  // Quill modules with custom toolbar
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        ['link', 'image'],
        ['clean'],
        ['mathEquation'] // Custom math button
      ],
      handlers: {
        mathEquation: () => {
          setShowMathModal(true);
          setMathValue('');
        }
      }
    },
  }), []);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'align', 'list', 'bullet',
    'indent', 'direction', 'link', 'image', 'math'
  ];

  // Initialize MathLive field in modal
  useEffect(() => {
    if (showMathModal && mathfieldRef.current && MathfieldElement) {
      // Clear previous content
      mathfieldRef.current.innerHTML = '';
      
      // Create new mathfield
      const mf = new MathfieldElement({
        mathVirtualKeyboardPolicy: 'manual',
      });
      
      if (mathValue) {
        mf.value = mathValue;
      }

      mf.addEventListener('input', (evt) => {
        setMathValue(evt.target.value);
      });

      mathfieldRef.current.appendChild(mf);
    }
  }, [showMathModal, MathfieldElement]);

  // Insert math equation into Quill
  const insertMath = () => {
    if (!mathValue || !quillRef.current) {
      setShowMathModal(false);
      return;
    }

    try {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true) || { index: 0 };
      
      // Render the math to HTML with Arabic numerals
      const mathHTML = renderMathWithArabicNumerals(mathValue);
      
      // Create the math span element
      const mathSpan = `<span class="ql-math" contenteditable="false" data-latex="${mathValue.replace(/"/g, '&quot;')}">${mathHTML}</span>&nbsp;`;
      
      // Insert using clipboard
      editor.clipboard.dangerouslyPasteHTML(range.index, mathSpan);
      
      // Move cursor after the inserted math
      setTimeout(() => {
        editor.setSelection(range.index + 1, Quill.sources.SILENT);
      }, 10);
      
      const newContent = editor.root.innerHTML;
      if (onChange) {
        onChange(newContent);
      }

      setShowMathModal(false);
      setMathValue('');
    } catch (error) {
      console.error('Error inserting math:', error);
    }
  };

  // Insert template into mathfield
  const insertTemplate = (latex) => {
    if (mathfieldRef.current) {
      const mf = mathfieldRef.current.querySelector('math-field');
      if (mf) {
        mf.executeCommand(['insert', latex]);
        setMathValue(mf.value);
      }
    }
  };

  // Re-render math equations on load (if needed)
  useEffect(() => {
    if (!quillRef.current || !value) return;

    // Small delay to ensure Quill is fully loaded
    const timer = setTimeout(() => {
      try {
        const editor = quillRef.current?.getEditor();
        if (!editor) return;

        const mathElements = editor.root.querySelectorAll('span.ql-math[data-latex]');
        
        mathElements.forEach((element) => {
          const latex = element.getAttribute('data-latex');
          if (latex) {
            // Check if already rendered
            const hasKatex = element.querySelector('.katex');
            if (!hasKatex) {
              element.innerHTML = renderMathWithArabicNumerals(latex);
            } else {
              // Re-render to ensure Arabic numerals
              const currentHtml = element.innerHTML;
              if (!/[٠-٩]/.test(currentHtml) && /[0-9]/.test(currentHtml)) {
                element.innerHTML = renderMathWithArabicNumerals(latex);
              }
            }
          }
        });
      } catch (e) {
        console.error('Error re-rendering math:', e);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="professional-math-editor">
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMathModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <span className="text-3xl">𝑓(𝑥)</span>
                  <span>{isArabicBrowser() ? 'محرر المعادلات الرياضية' : 'Math Equation Editor'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMathModal(false)}
                  className="text-white hover:bg-white hover:text-blue-700 rounded-full w-10 h-10 flex items-center justify-center text-3xl transition font-bold"
                >
                  ×
                </button>
              </div>
              <div className="text-blue-100 text-sm mt-2 space-y-1">
                <p>
                  {isArabicBrowser() 
                    ? '✨ محرر احترافي للمعادلات الرياضية - مثل Microsoft Word' 
                    : '✨ Professional Math Editor - Like Microsoft Word'}
                </p>
                <p className="text-blue-200 bg-blue-800 bg-opacity-30 px-3 py-1 rounded">
                  {isArabicBrowser() 
                    ? '🔢 جميع الأرقام ستظهر بالأرقام العربية (٠، ١، ٢، ٣، ...) تلقائياً' 
                    : '🔢 All numbers will display in Arabic numerals (٠، ١، ٢، ٣، ...) automatically'}
                </p>
              </div>
            </div>

            <div className="p-6">
              {/* Quick Templates */}
              <div className="mb-6">
                <h4 className="font-bold text-xl mb-4 text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  {isArabicBrowser() ? 'قوالب سريعة:' : 'Quick Templates:'}
                </h4>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                  {mathTemplates.map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => insertTemplate(template.latex)}
                      className="group relative px-3 py-4 bg-gradient-to-br from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 rounded-xl text-center border-2 border-blue-200 hover:border-blue-500 transition-all transform hover:scale-105 shadow-sm hover:shadow-md"
                      title={template.label}
                    >
                      <span className="text-2xl font-bold text-blue-700">{template.icon}</span>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {template.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* MathLive Editor */}
              {MathfieldElement && (
                <div className="mb-6">
                  <h4 className="font-bold text-xl mb-4 text-gray-800 flex items-center gap-2">
                    <span className="text-2xl">✏️</span>
                    {isArabicBrowser() ? 'المحرر المرئي:' : 'Visual Editor:'}
                  </h4>
                  <div 
                    ref={mathfieldRef}
                    className="border-4 border-blue-300 rounded-xl p-6 min-h-[120px] bg-gradient-to-br from-white to-blue-50 shadow-inner"
                  />
                  <p className="text-sm text-gray-600 mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    💡 {isArabicBrowser() 
                      ? 'استخدم القوالب السريعة أعلاه، أو اكتب مباشرة في المحرر' 
                      : 'Use quick templates above, or type directly in the editor'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowMathModal(false);
                    setMathValue('');
                  }}
                  className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all shadow hover:shadow-md"
                >
                  {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={insertMath}
                  disabled={!mathValue}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                >
                  ✓ {isArabicBrowser() ? 'إدراج المعادلة' : 'Insert Equation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .professional-math-editor .ql-editor {
          min-height: 300px;
          font-size: 17px;
          line-height: 1.8;
        }
        
        /* Math equation styling */
        .professional-math-editor .ql-editor .ql-math {
          display: inline-block;
          vertical-align: middle;
          padding: 4px 10px;
          margin: 0 4px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px solid #3b82f6;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
          transition: all 0.2s;
          cursor: pointer;
        }

        .professional-math-editor .ql-editor .ql-math:hover {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #2563eb;
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
          transform: translateY(-1px);
        }

        .professional-math-editor .ql-editor .ql-math .katex {
          font-size: 1.3em;
        }

        /* Custom toolbar button for math */
        .ql-toolbar .ql-mathEquation:after {
          content: '𝑓(𝑥)';
          font-size: 20px;
          font-weight: bold;
          color: #2563eb;
        }

        .ql-toolbar .ql-mathEquation:hover {
          color: #1d4ed8;
        }

        /* MathLive styling in modal */
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

export default ProfessionalMathEditor;
