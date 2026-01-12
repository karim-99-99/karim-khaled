import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { isArabicBrowser } from '../utils/language';

const EquationEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const [content, setContent] = useState(value || '');
  const [activeEquationTab, setActiveEquationTab] = useState('design');
  const [showEquationModal, setShowEquationModal] = useState(false);
  const [currentEquation, setCurrentEquation] = useState('');
  const [selectedEquationId, setSelectedEquationId] = useState(null);
  const equationCounter = useRef(0);

  // Sync external value
  useEffect(() => {
    if (value !== content && value !== undefined && value !== null) {
      const newValue = String(value);
      setContent(newValue);
      if (editorRef.current) {
        // Set content first
        editorRef.current.innerHTML = newValue;
        
        // Re-initialize all equation spans
        const equationSpans = editorRef.current.querySelectorAll('span[data-equation]');
        equationSpans.forEach((span) => {
          const latex = span.dataset.equation || span.getAttribute('data-equation');
          if (latex) {
            span.contentEditable = 'false';
            span.setAttribute('contenteditable', 'false');
            span.className = 'equation-rendered';
            span.style.display = 'inline-block';
            span.style.margin = '0 2px';
            span.style.padding = '2px 4px';
            span.style.backgroundColor = '#f3f4f6';
            span.style.border = '1px solid #d1d5db';
            span.style.borderRadius = '3px';
            span.style.cursor = 'pointer';
            span.style.verticalAlign = 'middle';
            
            try {
              const rendered = katex.renderToString(latex, {
                throwOnError: false,
                displayMode: false,
              });
              span.innerHTML = rendered;
            } catch (error) {
              console.error('Error rendering equation:', error);
              span.textContent = latex;
            }

            // Add click handler if not already added
            if (!span.dataset.clickHandlerAdded) {
              const handleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const eqId = span.dataset.equationId || span.getAttribute('data-equation-id') || span.getAttribute('data-equationid');
                const eqLatex = span.dataset.equation || span.getAttribute('data-equation');
                setSelectedEquationId(eqId);
                setCurrentEquation(eqLatex || '');
                setShowEquationModal(true);
              };
              
              span.addEventListener('click', handleClick);
              span.dataset.clickHandlerAdded = 'true';
            }
          }
        });
      }
    }
  }, [value]);

  // Initialize editor with content
  useEffect(() => {
    if (editorRef.current && content && !editorRef.current.dataset.initialized) {
      editorRef.current.dataset.initialized = 'true';
      renderEquations(content);
    }
  }, []);

  // Render KaTeX equations in HTML content
  const renderEquations = useCallback((htmlContent) => {
    if (!editorRef.current) return;

    // Parse HTML and render equations
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const body = doc.body;

    // Find all equation spans and render them with KaTeX
    const equationSpans = body.querySelectorAll('span[data-equation]');
    equationSpans.forEach((span) => {
      const latex = span.getAttribute('data-equation');
      if (latex) {
        try {
          const rendered = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
          });
          span.innerHTML = rendered;
          span.className = 'equation-rendered';
        } catch (error) {
          console.error('Error rendering equation:', error);
          span.textContent = latex;
        }
      }
    });

    editorRef.current.innerHTML = body.innerHTML;
  }, []);

  // Handle content change
  const handleInput = useCallback((e) => {
    const newContent = e.target.innerHTML || '';
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  }, [onChange]);

  // Insert equation at cursor
  const insertEquation = useCallback((latex = '') => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    const equationId = `eq_${Date.now()}_${equationCounter.current++}`;
    const span = document.createElement('span');
    span.className = 'equation-rendered';
    span.dataset.equation = latex || 'x';
    span.dataset.equationId = equationId;
    span.contentEditable = 'false';
    span.setAttribute('contenteditable', 'false');
    span.style.display = 'inline-block';
    span.style.margin = '0 2px';
    span.style.padding = '2px 4px';
    span.style.backgroundColor = '#f3f4f6';
    span.style.border = '1px solid #d1d5db';
    span.style.borderRadius = '3px';
    span.style.cursor = 'pointer';
    span.style.verticalAlign = 'middle';

    // Render equation with KaTeX
    try {
      const rendered = katex.renderToString(latex || 'x', {
        throwOnError: false,
        displayMode: false,
      });
      span.innerHTML = rendered;
    } catch (error) {
      console.error('Error rendering equation:', error);
      span.textContent = latex || 'x';
    }

    // Add click handler to edit equation
    const handleEquationClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const eqId = span.dataset.equationId;
      const eqLatex = span.dataset.equation;
      setSelectedEquationId(eqId);
      setCurrentEquation(eqLatex || '');
      setShowEquationModal(true);
    };
    span.addEventListener('click', handleEquationClick);

    if (range) {
      range.deleteContents();
      range.insertNode(span);
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current.appendChild(span);
    }

    // Update content
    const newContent = editorRef.current.innerHTML;
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }

    // Focus editor
    editorRef.current.focus();
  }, [onChange]);

  // Update existing equation
  const updateEquation = useCallback(() => {
    if (!editorRef.current || !selectedEquationId) return;

    // Try both attribute formats
    let equationSpan = editorRef.current.querySelector(`span[data-equation-id="${selectedEquationId}"]`);
    if (!equationSpan) {
      equationSpan = editorRef.current.querySelector(`span[data-equationid="${selectedEquationId}"]`);
    }
    if (!equationSpan) {
      // Fallback: search all equation spans
      const allSpans = editorRef.current.querySelectorAll('span[data-equation]');
      equationSpan = Array.from(allSpans).find(span => 
        span.dataset.equationId === selectedEquationId || 
        span.getAttribute('data-equation-id') === selectedEquationId ||
        span.getAttribute('data-equationid') === selectedEquationId
      );
    }

    if (equationSpan) {
      equationSpan.dataset.equation = currentEquation;
      equationSpan.setAttribute('data-equation', currentEquation);
      try {
        const rendered = katex.renderToString(currentEquation, {
          throwOnError: false,
          displayMode: false,
        });
        equationSpan.innerHTML = rendered;
      } catch (error) {
        console.error('Error rendering equation:', error);
        equationSpan.textContent = currentEquation;
      }

      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      if (onChange) {
        onChange(newContent);
      }
    } else {
      // If equation not found, insert as new
      insertEquation(currentEquation);
    }

    setShowEquationModal(false);
    setSelectedEquationId(null);
    setCurrentEquation('');
    
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [currentEquation, selectedEquationId, onChange, insertEquation]);

  // Insert new equation
  const insertNewEquation = useCallback(() => {
    insertEquation(currentEquation || 'x');
    setShowEquationModal(false);
    setCurrentEquation('');
    setSelectedEquationId(null);
  }, [currentEquation, insertEquation]);

  // Equation structures like Word
  const equationStructures = [
    { name: isArabicBrowser() ? 'كسر' : 'Fraction', latex: '\\frac{a}{b}', icon: 'a/b' },
    { name: isArabicBrowser() ? 'جذر' : 'Radical', latex: '\\sqrt{x}', icon: '√x' },
    { name: isArabicBrowser() ? 'قوة' : 'Script', latex: 'x^{n}', icon: 'xⁿ' },
    { name: isArabicBrowser() ? 'تكامل' : 'Integral', latex: '\\int_{a}^{b}', icon: '∫' },
    { name: isArabicBrowser() ? 'مجموع' : 'Sum', latex: '\\sum_{i=1}^{n}', icon: '∑' },
    { name: isArabicBrowser() ? 'مصفوفة' : 'Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', icon: '[ ]' },
    { name: isArabicBrowser() ? 'أقواس' : 'Bracket', latex: '\\left( x \\right)', icon: '( )' },
    { name: isArabicBrowser() ? 'دالة' : 'Function', latex: '\\sin(x)', icon: 'sin' },
  ];

  // Math symbols organized like Word
  const mathSymbols = {
    operators: [
      { symbol: '±', latex: '\\pm' },
      { symbol: '×', latex: '\\times' },
      { symbol: '÷', latex: '\\div' },
      { symbol: '=', latex: '=' },
      { symbol: '≠', latex: '\\neq' },
      { symbol: '≈', latex: '\\approx' },
      { symbol: '<', latex: '<' },
      { symbol: '>', latex: '>' },
      { symbol: '≤', latex: '\\leq' },
      { symbol: '≥', latex: '\\geq' },
    ],
    fractions: [
      { symbol: '½', latex: '\\frac{1}{2}' },
      { symbol: '⅓', latex: '\\frac{1}{3}' },
      { symbol: '¼', latex: '\\frac{1}{4}' },
      { symbol: '⅔', latex: '\\frac{2}{3}' },
      { symbol: '¾', latex: '\\frac{3}{4}' },
    ],
    radicals: [
      { symbol: '√', latex: '\\sqrt{x}' },
      { symbol: '∛', latex: '\\sqrt[3]{x}' },
      { symbol: '∜', latex: '\\sqrt[4]{x}' },
    ],
    greek: [
      { symbol: 'α', latex: '\\alpha' },
      { symbol: 'β', latex: '\\beta' },
      { symbol: 'π', latex: '\\pi' },
      { symbol: 'θ', latex: '\\theta' },
      { symbol: 'Δ', latex: '\\Delta' },
      { symbol: 'Ω', latex: '\\Omega' },
    ],
    sets: [
      { symbol: '∞', latex: '\\infty' },
      { symbol: '∑', latex: '\\sum' },
      { symbol: '∫', latex: '\\int' },
      { symbol: '∈', latex: '\\in' },
      { symbol: '∉', latex: '\\notin' },
    ],
  };

  return (
    <>
      <div className="equation-editor border border-gray-300 rounded-lg bg-white">
        {/* Equation Toolbar - Like Word's Equation Ribbon */}
        <div className="equation-toolbar bg-gray-50 border-b border-gray-300 p-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              {isArabicBrowser() ? 'أدوات المعادلات' : 'Equation Tools'}
            </span>
            <div className="flex gap-1 border-r border-gray-300 pr-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveEquationTab('design');
                }}
                className={`px-3 py-1 text-xs font-medium rounded transition ${
                  activeEquationTab === 'design' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isArabicBrowser() ? 'تصميم' : 'Design'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveEquationTab('symbols');
                }}
                className={`px-3 py-1 text-xs font-medium rounded transition ${
                  activeEquationTab === 'symbols' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isArabicBrowser() ? 'رموز' : 'Symbols'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveEquationTab('structures');
                }}
                className={`px-3 py-1 text-xs font-medium rounded transition ${
                  activeEquationTab === 'structures' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isArabicBrowser() ? 'هياكل' : 'Structures'}
              </button>
            </div>
          </div>

          {/* Design Tab */}
          {activeEquationTab === 'design' && (
            <div className="flex flex-wrap gap-2 p-2 bg-white rounded border border-gray-200">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentEquation('x');
                  setSelectedEquationId(null);
                  setShowEquationModal(true);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                {isArabicBrowser() ? 'إدراج معادلة جديدة' : 'Insert New Equation'}
              </button>
            </div>
          )}

          {/* Symbols Tab */}
          {activeEquationTab === 'symbols' && (
            <div className="space-y-3 max-h-64 overflow-y-auto p-2 bg-white rounded border border-gray-200">
              {Object.entries(mathSymbols).map(([category, symbols]) => (
                <div key={category} className="border-b border-gray-200 pb-2 last:border-0">
                  <div className="text-xs font-semibold text-gray-600 mb-2 capitalize">
                    {category}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {symbols.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          insertEquation(item.latex);
                        }}
                        className="bg-white hover:bg-blue-50 border border-gray-300 hover:border-blue-400 px-3 py-2 rounded text-base font-medium transition min-w-[40px]"
                        title={item.latex}
                      >
                        {item.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Structures Tab */}
          {activeEquationTab === 'structures' && (
            <div className="flex flex-wrap gap-2 p-2 bg-white rounded border border-gray-200">
              {equationStructures.map((struct, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    insertEquation(struct.latex);
                  }}
                  className="bg-white hover:bg-blue-50 border border-gray-300 hover:border-blue-400 px-3 py-2 rounded text-sm font-medium transition flex items-center gap-2"
                  title={struct.name}
                >
                  <span className="text-lg">{struct.icon}</span>
                  <span>{struct.name}</span>
                </button>
              ))}
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
          data-placeholder={placeholder || (isArabicBrowser() ? 'اكتب هنا...' : 'Write here...')}
          suppressContentEditableWarning
          tabIndex={0}
        />

        <style>{`
          .editor-content:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          .equation-rendered {
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
          .equation-rendered:hover {
            border-color: #3b82f6 !important;
            background-color: #dbeafe !important;
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
          .equation-rendered .katex {
            font-size: 16px !important;
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
              setSelectedEquationId(null);
              setCurrentEquation('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">
              {isArabicBrowser() 
                ? selectedEquationId ? 'تعديل المعادلة' : 'إدراج معادلة جديدة'
                : selectedEquationId ? 'Edit Equation' : 'Insert New Equation'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isArabicBrowser() ? 'LaTeX' : 'LaTeX'}:
              </label>
              <textarea
                value={currentEquation}
                onChange={(e) => setCurrentEquation(e.target.value)}
                placeholder={isArabicBrowser() ? 'اكتب LaTeX هنا، مثال: \\frac{1}{2}' : 'Enter LaTeX here, example: \\frac{1}{2}'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] font-mono text-sm"
                dir="ltr"
              />
            </div>

            {currentEquation && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isArabicBrowser() ? 'معاينة' : 'Preview'}:
                </label>
                <div className="text-center py-4">
                  <InlineMath math={currentEquation || 'x'} />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowEquationModal(false);
                  setSelectedEquationId(null);
                  setCurrentEquation('');
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
                  if (selectedEquationId) {
                    updateEquation();
                  } else {
                    insertNewEquation();
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                {isArabicBrowser() 
                  ? selectedEquationId ? 'تحديث' : 'إدراج'
                  : selectedEquationId ? 'Update' : 'Insert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EquationEditor;
