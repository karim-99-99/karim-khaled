import { useState, useEffect, useRef, useCallback } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { isArabicBrowser } from '../utils/language';

const WYSIWYGEquationEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const [content, setContent] = useState(value || '');
  const [activeEquationTab, setActiveEquationTab] = useState('symbols');
  const [editingEquation, setEditingEquation] = useState(null);
  const [editingLatex, setEditingLatex] = useState('');
  const [showEquationModal, setShowEquationModal] = useState(false);
  const equationCounter = useRef(0);

  // Sync external value
  useEffect(() => {
    if (value !== content && value !== undefined && value !== null) {
      const newValue = String(value);
      setContent(newValue);
      if (editorRef.current) {
        editorRef.current.innerHTML = newValue;
        renderAllEquations();
      }
    }
  }, [value]);

  // Render all equations in content
  const renderAllEquations = useCallback(() => {
    if (!editorRef.current) return;

    const equationElements = editorRef.current.querySelectorAll('[data-equation-latex]');
    equationElements.forEach((element) => {
      const latex = element.getAttribute('data-equation-latex');
      if (latex) {
        try {
          const rendered = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
          });
          element.innerHTML = rendered;
          element.className = 'math-equation-rendered';
        } catch (error) {
          console.error('Error rendering equation:', error);
          element.textContent = `[${latex}]`;
        }
      }
    });
  }, []);

  // Update content
  const updateContent = useCallback(() => {
    if (!editorRef.current) return;
    const newContent = editorRef.current.innerHTML;
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  }, [onChange]);

  // Insert visual equation (rendered with KaTeX)
  const insertVisualEquation = useCallback((latex) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    const equationId = `eq_${Date.now()}_${equationCounter.current++}`;
    const span = document.createElement('span');
    span.className = 'math-equation-rendered';
    span.dataset.equationId = equationId;
    span.dataset.equationLatex = latex;
    span.contentEditable = 'false';
    span.style.display = 'inline-block';
    span.style.margin = '0 2px';
    span.style.padding = '2px 4px';
    span.style.backgroundColor = '#f3f4f6';
    span.style.border = '1px solid #d1d5db';
    span.style.borderRadius = '3px';
    span.style.cursor = 'pointer';
    span.style.verticalAlign = 'middle';
    span.style.transition = 'all 0.2s';

    // Render equation with KaTeX
    try {
      const rendered = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
      });
      span.innerHTML = rendered;
    } catch (error) {
      console.error('Error rendering equation:', error);
      span.textContent = `[${latex}]`;
    }

    // Add click handler to edit
    span.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const eqLatex = span.dataset.equationLatex;
      setEditingEquation(equationId);
      setEditingLatex(eqLatex || '');
      setShowEquationModal(true);
    });

    // Insert into editor
    if (range && editorRef.current.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(span);
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current.appendChild(span);
    }

    // Add space
    const textNode = document.createTextNode(' ');
    editorRef.current.appendChild(textNode);

    // Update content
    updateContent();
    
    // Focus editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [updateContent]);

  // Update equation
  const updateEquation = useCallback(() => {
    if (!editorRef.current || !editingEquation) return;

    const equationElement = editorRef.current.querySelector(`[data-equation-id="${editingEquation}"]`);
    if (equationElement) {
      equationElement.dataset.equationLatex = editingLatex;
      try {
        const rendered = katex.renderToString(editingLatex || 'x', {
          throwOnError: false,
          displayMode: false,
        });
        equationElement.innerHTML = rendered;
      } catch (error) {
        console.error('Error rendering equation:', error);
        equationElement.textContent = `[${editingLatex}]`;
      }
      updateContent();
    } else {
      // If not found, insert as new
      insertVisualEquation(editingLatex || 'x');
    }

    setShowEquationModal(false);
    setEditingEquation(null);
    setEditingLatex('');
    
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [editingEquation, editingLatex, insertVisualEquation, updateContent]);

  // Handle input
  const handleInput = useCallback(() => {
    updateContent();
  }, [updateContent]);

  // Arabic mathematical symbols
  const arabicSymbols = {
    operations: [
      { name: 'جمع', symbol: '+', latex: '+' },
      { name: 'طرح', symbol: '−', latex: '-' },
      { name: 'ضرب', symbol: '×', latex: '\\times' },
      { name: 'قسمة', symbol: '÷', latex: '\\div' },
      { name: 'يساوي', symbol: '=', latex: '=' },
      { name: 'لا يساوي', symbol: '≠', latex: '\\neq' },
      { name: 'أصغر', symbol: '<', latex: '<' },
      { name: 'أكبر', symbol: '>', latex: '>' },
      { name: 'أصغر أو يساوي', symbol: '≤', latex: '\\leq' },
      { name: 'أكبر أو يساوي', symbol: '≥', latex: '\\geq' },
      { name: 'تقريباً يساوي', symbol: '≈', latex: '\\approx' },
      { name: 'زائد أو ناقص', symbol: '±', latex: '\\pm' },
    ],
    fractions: [
      { name: 'كسر', symbol: 'a/b', latex: '\\frac{a}{b}', structure: true },
      { name: 'نصف', symbol: '½', latex: '\\frac{1}{2}' },
      { name: 'ثلث', symbol: '⅓', latex: '\\frac{1}{3}' },
      { name: 'ربع', symbol: '¼', latex: '\\frac{1}{4}' },
      { name: 'ثلثان', symbol: '⅔', latex: '\\frac{2}{3}' },
      { name: 'ثلاثة أرباع', symbol: '¾', latex: '\\frac{3}{4}' },
    ],
    radicals: [
      { name: 'جذر تربيعي', symbol: '√x', latex: '\\sqrt{x}', structure: true },
      { name: 'جذر تكعيبي', symbol: '∛x', latex: '\\sqrt[3]{x}', structure: true },
      { name: 'جذر رابع', symbol: '∜x', latex: '\\sqrt[4]{x}', structure: true },
    ],
    powers: [
      { name: 'قوة', symbol: 'xⁿ', latex: 'x^{n}', structure: true },
      { name: 'أس تربيعي', symbol: 'x²', latex: 'x^2' },
      { name: 'تكعيب', symbol: 'x³', latex: 'x^3' },
    ],
    greek: [
      { name: 'ألفا', symbol: 'α', latex: '\\alpha' },
      { name: 'بيتا', symbol: 'β', latex: '\\beta' },
      { name: 'غاما', symbol: 'γ', latex: '\\gamma' },
      { name: 'دلتا', symbol: 'Δ', latex: '\\Delta' },
      { name: 'ثيتا', symbol: 'θ', latex: '\\theta' },
      { name: 'باي', symbol: 'π', latex: '\\pi' },
      { name: 'أوميغا', symbol: 'Ω', latex: '\\Omega' },
      { name: 'سيجما', symbol: 'Σ', latex: '\\sum_{i=1}^{n}', structure: true },
    ],
    sets: [
      { name: 'مالانهاية', symbol: '∞', latex: '\\infty' },
      { name: 'تكامل', symbol: '∫', latex: '\\int_{a}^{b}', structure: true },
      { name: 'ينتمي', symbol: '∈', latex: '\\in' },
      { name: 'لا ينتمي', symbol: '∉', latex: '\\notin' },
      { name: 'اتحاد', symbol: '∪', latex: '\\cup' },
      { name: 'تقاطع', symbol: '∩', latex: '\\cap' },
      { name: 'مجموعة فارغة', symbol: '∅', latex: '\\emptyset' },
    ],
    functions: [
      { name: 'جا', symbol: 'sin', latex: '\\sin(x)', structure: true },
      { name: 'جتا', symbol: 'cos', latex: '\\cos(x)', structure: true },
      { name: 'ظا', symbol: 'tan', latex: '\\tan(x)', structure: true },
      { name: 'قا', symbol: 'sec', latex: '\\sec(x)', structure: true },
      { name: 'قتا', symbol: 'csc', latex: '\\csc(x)', structure: true },
      { name: 'ظتا', symbol: 'cot', latex: '\\cot(x)', structure: true },
      { name: 'لوغاريتم', symbol: 'log', latex: '\\log(x)', structure: true },
      { name: 'لوغاريتم طبيعي', symbol: 'ln', latex: '\\ln(x)', structure: true },
    ],
    brackets: [
      { name: 'أقواس', symbol: '( )', latex: '\\left(x\\right)', structure: true },
      { name: 'أقواس مربعة', symbol: '[ ]', latex: '\\left[x\\right]', structure: true },
      { name: 'أقواس معكوفة', symbol: '{ }', latex: '\\left\\{x\\right\\}', structure: true },
    ],
  };

  const handleSymbolClick = useCallback((symbol) => {
    insertVisualEquation(symbol.latex);
  }, [insertVisualEquation]);

  // Render equations on initial load
  useEffect(() => {
    if (editorRef.current && content) {
      renderAllEquations();
    }
  }, []);

  return (
    <>
      <div className="wysiwyg-equation-editor border border-gray-300 rounded-lg bg-white">
        {/* Symbol Toolbar */}
        <div className="symbol-toolbar bg-gray-50 border-b border-gray-300 p-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditingLatex('x');
                setEditingEquation(null);
                setShowEquationModal(true);
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              {isArabicBrowser() ? 'إدراج معادلة' : 'Insert Equation'}
            </button>
            <div className="flex gap-1 border-r border-gray-300 pr-2 flex-wrap">
              {Object.keys(arabicSymbols).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveEquationTab(activeEquationTab === category ? null : category);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded transition ${
                    activeEquationTab === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol Palette */}
          {activeEquationTab && arabicSymbols[activeEquationTab] && (
            <div className="symbol-palette grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded border border-gray-200">
              {arabicSymbols[activeEquationTab].map((item, idx) => {
                let displaySymbol = item.symbol;
                try {
                  // Try to render complex symbols visually
                  if (item.symbol === 'a/b' || item.latex.includes('\\frac')) {
                    displaySymbol = katex.renderToString(item.latex, { throwOnError: false, displayMode: false });
                  } else if (item.symbol === 'xⁿ' || item.latex.includes('^{')) {
                    displaySymbol = katex.renderToString(item.latex, { throwOnError: false, displayMode: false });
                  } else if (item.structure) {
                    displaySymbol = katex.renderToString(item.latex, { throwOnError: false, displayMode: false });
                  }
                } catch (error) {
                  // Fallback to text symbol
                }
                
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSymbolClick(item);
                    }}
                    className="bg-white hover:bg-blue-50 border border-gray-300 hover:border-blue-400 px-3 py-2 rounded text-base font-medium transition flex flex-col items-center gap-1"
                    title={item.name}
                  >
                    <span 
                      className="text-lg" 
                      dangerouslySetInnerHTML={{ __html: typeof displaySymbol === 'string' && displaySymbol.includes('<') ? displaySymbol : item.symbol }}
                    />
                    <span className="text-xs text-gray-600">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onClick={(e) => {
            e.stopPropagation();
            if (editorRef.current && !editorRef.current.matches(':focus')) {
              editorRef.current.focus();
            }
          }}
          onFocus={(e) => {
            e.stopPropagation();
          }}
          className="editor-content min-h-[300px] p-4 border-t border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text"
          style={{
            direction: 'rtl',
            fontSize: '16px',
            lineHeight: '1.6',
            fontFamily: 'inherit',
            outline: 'none',
            minHeight: '300px',
          }}
          data-placeholder={placeholder || (isArabicBrowser() ? 'اكتب هنا... انقر على رمز لإدراج معادلة مرئية' : 'Write here... Click a symbol to insert a visual equation')}
          suppressContentEditableWarning
          tabIndex={0}
        />

        <style>{`
          .editor-content:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          .math-equation-rendered {
            display: inline-block !important;
            margin: 0 2px !important;
            padding: 2px 4px !important;
            background-color: #f3f4f6 !important;
            border: 1px solid #d1d5db !important;
            border-radius: 3px !important;
            cursor: pointer !important;
            vertical-align: middle !important;
            transition: all 0.2s !important;
          }
          .math-equation-rendered:hover {
            border-color: #3b82f6 !important;
            background-color: #dbeafe !important;
            transform: scale(1.02);
          }
          .math-equation-rendered .katex {
            font-size: 1em !important;
          }
          .editor-content img {
            max-width: 400px;
            height: auto;
            display: inline-block;
            margin: 5px;
          }
          .editor-content {
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          /* Ensure fractions have straight lines */
          .math-equation-rendered .katex .frac-line {
            border-bottom: 1px solid #000 !important;
            border-top: 0 !important;
          }
        `}</style>
      </div>

      {/* Equation Editor Modal */}
      {showEquationModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEquationModal(false);
              setEditingEquation(null);
              setEditingLatex('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">
              {isArabicBrowser() 
                ? editingEquation ? 'تعديل المعادلة' : 'إدراج معادلة جديدة'
                : editingEquation ? 'Edit Equation' : 'Insert New Equation'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LaTeX:
              </label>
              <textarea
                value={editingLatex}
                onChange={(e) => setEditingLatex(e.target.value)}
                placeholder={isArabicBrowser() ? 'اكتب LaTeX هنا، مثال: \\frac{x^n + \\frac{1}{2}}{y}' : 'Enter LaTeX here, example: \\frac{x^n + \\frac{1}{2}}{y}'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] font-mono text-sm"
                dir="ltr"
              />
            </div>

            {editingLatex && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isArabicBrowser() ? 'معاينة' : 'Preview'}:
                </label>
                <div className="text-center py-4" dangerouslySetInnerHTML={{ __html: katex.renderToString(editingLatex || 'x', { throwOnError: false, displayMode: false }) }} />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowEquationModal(false);
                  setEditingEquation(null);
                  setEditingLatex('');
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
              >
                {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (editingEquation) {
                    updateEquation();
                  } else {
                    // Use 'x' as default if empty
                    const latexToInsert = editingLatex.trim() || 'x';
                    insertVisualEquation(latexToInsert);
                    setShowEquationModal(false);
                    setEditingEquation(null);
                    setEditingLatex('');
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                {isArabicBrowser() 
                  ? editingEquation ? 'تحديث' : 'إدراج'
                  : editingEquation ? 'Update' : 'Insert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WYSIWYGEquationEditor;
