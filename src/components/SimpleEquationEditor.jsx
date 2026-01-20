import React, { useState, useRef, useEffect } from 'react';
import * as ReactQuillNamespace from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { isArabicBrowser } from '../utils/language';
import katex from 'katex';

// Get ReactQuill from namespace (react-quill v2.0.0)
const ReactQuill = ReactQuillNamespace.default || ReactQuillNamespace;
import 'katex/dist/katex.min.css';

const SimpleEquationEditor = ({ value, onChange, placeholder }) => {
  const [showEquationModal, setShowEquationModal] = useState(false);
  const [equationInput, setEquationInput] = useState('');
  const [equationPreview, setEquationPreview] = useState('');
  const quillRef = useRef(null);

  // Common math symbols for quick insertion
  const mathSymbols = [
    { label: 'كسر / Fraction', latex: '\\frac{a}{b}' },
    { label: 'جذر / Square Root', latex: '\\sqrt{x}' },
    { label: 'أس / Power', latex: 'x^{n}' },
    { label: 'مجموع / Sum', latex: '\\sum_{i=1}^{n}' },
    { label: 'تكامل / Integral', latex: '\\int_{a}^{b}' },
    { label: 'ألفا / Alpha', latex: '\\alpha' },
    { label: 'بيتا / Beta', latex: '\\beta' },
    { label: 'باي / Pi', latex: '\\pi' },
    { label: 'أكبر من أو يساوي / >=', latex: '\\geq' },
    { label: 'أصغر من أو يساوي / <=', latex: '\\leq' },
    { label: 'يساوي تقريباً / ≈', latex: '\\approx' },
    { label: 'ليس يساوي / ≠', latex: '\\neq' },
  ];

  // Quill modules configuration
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

  useEffect(() => {
    // Update preview when equation input changes
    if (equationInput) {
      try {
        const html = katex.renderToString(equationInput, {
          throwOnError: false,
          displayMode: true,
        });
        setEquationPreview(html);
      } catch (error) {
        setEquationPreview('Invalid LaTeX');
      }
    } else {
      setEquationPreview('');
    }
  }, [equationInput]);

  const insertEquation = () => {
    if (!equationInput || !quillRef.current) return;

    try {
      const html = katex.renderToString(equationInput, {
        throwOnError: false,
        displayMode: true,
      });

      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      
      // Insert the equation as HTML
      editor.clipboard.dangerouslyPasteHTML(range.index, `<span class="math-equation" contenteditable="false">${html}</span> `);
      
      // Update the value
      const newContent = editor.root.innerHTML;
      if (onChange) {
        onChange(newContent);
      }

      // Close modal and reset
      setShowEquationModal(false);
      setEquationInput('');
    } catch (error) {
      console.error('Error inserting equation:', error);
    }
  };

  const insertSymbol = (latex) => {
    setEquationInput(equationInput + latex);
  };

  return (
    <div className="simple-equation-editor">
      {/* Equation button */}
      <div className="mb-2">
        <button
          type="button"
          onClick={() => setShowEquationModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isArabicBrowser() ? '➕ إدراج معادلة رياضية' : '➕ Insert Math Equation'}
        </button>
      </div>

      {/* ReactQuill Editor */}
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

      {/* Equation Modal */}
      {showEquationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {isArabicBrowser() ? 'إدراج معادلة رياضية' : 'Insert Math Equation'}
            </h3>

            {/* Quick symbols */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">
                {isArabicBrowser() ? 'رموز سريعة:' : 'Quick Symbols:'}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {mathSymbols.map((symbol, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => insertSymbol(symbol.latex)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-left"
                  >
                    {symbol.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LaTeX input */}
            <div className="mb-4">
              <label className="block font-semibold mb-2">
                {isArabicBrowser() ? 'كود LaTeX:' : 'LaTeX Code:'}
              </label>
              <textarea
                value={equationInput}
                onChange={(e) => setEquationInput(e.target.value)}
                className="w-full p-2 border rounded min-h-[100px] font-mono"
                placeholder="مثال / Example: \\frac{a}{b} + \\sqrt{x}"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">
                {isArabicBrowser() 
                  ? 'أدخل كود LaTeX للمعادلة، أو استخدم الرموز السريعة أعلاه' 
                  : 'Enter LaTeX code for the equation, or use quick symbols above'}
              </p>
            </div>

            {/* Preview */}
            {equationPreview && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">
                  {isArabicBrowser() ? 'معاينة:' : 'Preview:'}
                </h4>
                <div 
                  className="p-4 bg-gray-50 rounded border"
                  dangerouslySetInnerHTML={{ __html: equationPreview }}
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowEquationModal(false);
                  setEquationInput('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={insertEquation}
                disabled={!equationInput}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isArabicBrowser() ? 'إدراج' : 'Insert'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .simple-equation-editor .ql-editor {
          min-height: 300px;
          direction: ${isArabicBrowser() ? 'rtl' : 'ltr'};
          text-align: ${isArabicBrowser() ? 'right' : 'left'};
        }
        .simple-equation-editor .math-equation {
          display: inline-block;
          margin: 0 5px;
          padding: 5px;
          background: #f0f0f0;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default SimpleEquationEditor;
