import { useState, useEffect, useRef, useCallback } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { isArabicBrowser } from '../utils/language';

// Load MathQuill dynamically
let MQ;
let mathQuillFields = new Map();

const loadMathQuill = () => {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined') {
        resolve(null);
        return;
      }

      // Check if already loaded
      if (window.MathQuill) {
        MQ = window.MathQuill;
        resolve(MQ);
        return;
      }

      if (typeof document === 'undefined' || !document.head) {
        resolve(null);
        return;
      }

      // Load jQuery first (MathQuill requires it)
      if (!window.jQuery && !window.$) {
        try {
          const jqScript = document.createElement('script');
          jqScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
          jqScript.onload = () => {
            loadMathQuillScript(resolve);
          };
          jqScript.onerror = () => {
            console.error('Error loading jQuery');
            resolve(null);
          };
          document.head.appendChild(jqScript);
        } catch (error) {
          console.error('Error loading jQuery:', error);
          resolve(null);
        }
      } else {
        loadMathQuillScript(resolve);
      }
    } catch (error) {
      console.error('Error in loadMathQuill:', error);
      resolve(null);
    }
  });
};

const loadMathQuillScript = (resolve) => {
  try {
    if (typeof document === 'undefined' || !document.head) {
      resolve(null);
      return;
    }

    // Load MathQuill CSS
    if (!document.querySelector('link[href*="mathquill"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/mathquill@0.10.1/build/mathquill.css';
      try {
        document.head.appendChild(link);
      } catch (error) {
        console.error('Error loading MathQuill CSS:', error);
      }
    }

    // Load MathQuill JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathquill@0.10.1/build/mathquill.min.js';
    script.onload = () => {
      setTimeout(() => {
        try {
          if (window.MathQuill) {
            MQ = window.MathQuill;
            window.MathQuill = MQ; // Make sure it's globally available
            resolve(MQ);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Error initializing MathQuill after load:', error);
          resolve(null);
        }
      }, 100);
    };
    script.onerror = () => {
      console.error('Error loading MathQuill script');
      resolve(null);
    };
    
    try {
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error appending MathQuill script:', error);
      resolve(null);
    }
  } catch (error) {
    console.error('Error in loadMathQuillScript:', error);
    resolve(null);
  }
};

const VisualEquationEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const [content, setContent] = useState(value || '');
  const [activeEquationTab, setActiveEquationTab] = useState('symbols');
  const [showSymbolPalette, setShowSymbolPalette] = useState(true);
  const equationCounter = useRef(0);
  const mathQuillInitialized = useRef(false);
  const [mathQuillError, setMathQuillError] = useState(false);

  // Update content when equations change
  const updateContent = useCallback(() => {
    if (!editorRef.current) return;

    // Collect all content including equations
    const newContent = editorRef.current.innerHTML;
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  }, [onChange]);

  // Initialize existing equation fields
  const initializeExistingEquations = useCallback(() => {
    if (!MQ || !editorRef.current) return;

    const equationSpans = editorRef.current.querySelectorAll('.equation-field:not([data-initialized])');
    equationSpans.forEach((span) => {
      if (span.dataset.initialized === 'true') return;

      const latex = span.dataset.latex || span.textContent || 'x';
      const equationId = span.dataset.equationId || `eq_${Date.now()}_${equationCounter.current++}`;
      
      span.dataset.initialized = 'true';
      span.dataset.equationId = equationId;
      span.innerHTML = ''; // Clear content for MathQuill

      try {
        const mathField = MQ.MathField(span, {
          spaceBehavesLikeTab: true,
          leftRightIntoCmdGoes: 'up',
          restrictMismatchedBrackets: true,
          sumStartsWithNEquals: true,
          supSubsRequireOperand: true,
          charsThatBreakOutOfSupSub: '+-=<>',
          autoSubscriptNumerals: false,
          autoCommands: 'pi theta sqrt sum prod alpha beta gamma rho int',
          autoOperatorNames: 'sin cos tan sec csc cot log ln',
          handlers: {
            edit: function() {
              span.dataset.latex = mathField.latex();
              updateContent();
            }
          }
        });

        mathField.latex(latex);
        mathQuillFields.set(equationId, mathField);
      } catch (error) {
        console.error('Error initializing MathQuill field:', error);
        span.textContent = `[${latex}]`;
      }
    });
  }, [updateContent]);

  // Load MathQuill on mount
  useEffect(() => {
    try {
      loadMathQuill().then((mq) => {
        if (mq) {
          mathQuillInitialized.current = true;
          setTimeout(() => {
            initializeExistingEquations();
          }, 200);
        } else {
          console.warn('MathQuill failed to load. Equations will not be editable.');
          setMathQuillError(true);
        }
      }).catch((error) => {
        console.error('Error loading MathQuill:', error);
        setMathQuillError(true);
      });
    } catch (error) {
      console.error('Error initializing MathQuill:', error);
      setMathQuillError(true);
    }
  }, [initializeExistingEquations]);

  // Sync external value
  useEffect(() => {
    if (value !== content && value !== undefined && value !== null) {
      const newValue = String(value);
      setContent(newValue);
      if (editorRef.current) {
        editorRef.current.innerHTML = newValue;
        setTimeout(() => {
          initializeExistingEquations();
        }, 100);
      }
    }
  }, [value, content, initializeExistingEquations]);



  // Insert new equation
  const insertEquation = useCallback((initialLatex = 'x') => {
    if (!editorRef.current) return;

    if (!MQ || mathQuillError || !mathQuillInitialized.current) {
      // If MathQuill not loaded, insert as simple text with LaTeX notation
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      
      const equationId = `eq_${Date.now()}_${equationCounter.current++}`;
      const span = document.createElement('span');
      span.className = 'equation-text';
      span.dataset.equationId = equationId;
      span.dataset.latex = initialLatex;
      span.contentEditable = 'false';
      span.style.display = 'inline-block';
      span.style.margin = '0 2px';
      span.style.padding = '2px 4px';
      span.style.backgroundColor = '#f3f4f6';
      span.style.border = '1px solid #d1d5db';
      span.style.borderRadius = '3px';
      span.style.cursor = 'default';
      span.style.verticalAlign = 'middle';
      span.textContent = `[${initialLatex}]`;
      
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
      
      const textNode = document.createTextNode(' ');
      editorRef.current.appendChild(textNode);
      updateContent();
      if (editorRef.current) {
        editorRef.current.focus();
      }
      return;
    }

    try {
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      const equationId = `eq_${Date.now()}_${equationCounter.current++}`;
      const span = document.createElement('span');
      span.className = 'equation-field';
      span.dataset.equationId = equationId;
      span.dataset.latex = initialLatex;
      span.contentEditable = 'false';
      span.style.display = 'inline-block';
      span.style.margin = '0 2px';
      span.style.padding = '2px 4px';
      span.style.backgroundColor = '#f3f4f6';
      span.style.border = '1px solid #d1d5db';
      span.style.borderRadius = '3px';
      span.style.cursor = 'text';
      span.style.verticalAlign = 'middle';
      span.style.minWidth = '50px';
      span.style.minHeight = '24px';

      // Create MathQuill field
      const mathField = MQ.MathField(span, {
        spaceBehavesLikeTab: true,
        leftRightIntoCmdGoes: 'up',
        restrictMismatchedBrackets: true,
        sumStartsWithNEquals: true,
        supSubsRequireOperand: true,
        charsThatBreakOutOfSupSub: '+-=<>',
        autoSubscriptNumerals: false,
        autoCommands: 'pi theta sqrt sum prod alpha beta gamma rho int',
        autoOperatorNames: 'sin cos tan sec csc cot log ln',
        handlers: {
          edit: function() {
            span.dataset.latex = mathField.latex();
            updateContent();
          }
        }
      });

      mathField.latex(initialLatex);
      mathQuillFields.set(equationId, mathField);

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

      // Add space after equation
      const textNode = document.createTextNode(' ');
      editorRef.current.appendChild(textNode);

      // Focus the equation field
      setTimeout(() => {
        try {
          mathField.focus();
        } catch (error) {
          console.error('Error focusing math field:', error);
        }
      }, 50);

      updateContent();
      if (editorRef.current) {
        editorRef.current.focus();
      }
    } catch (error) {
      console.error('Error inserting equation:', error);
      // Fallback to text insertion
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const textNode = document.createTextNode(`[${initialLatex}]`);
      if (range && editorRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(textNode);
      } else {
        editorRef.current.appendChild(textNode);
      }
      updateContent();
    }
  }, [updateContent, mathQuillError]);

  // Find focused equation field
  const findFocusedEquation = useCallback(() => {
    // Check all equation fields to see which one is focused
    for (const [id, mathField] of mathQuillFields.entries()) {
      const el = mathField.el();
      // Check if element or its children have focus
      if (el === document.activeElement || el.contains(document.activeElement)) {
        return mathField;
      }
      // Check for MathQuill cursor classes
      if (el.querySelector('.mq-cursor, .mq-hasCursor, .mq-focused')) {
        return mathField;
      }
    }
    return null;
  }, []);

  // Insert symbol into currently focused equation or create new one
  const insertSymbol = useCallback((latex) => {
    const focusedMathField = findFocusedEquation();

    if (focusedMathField) {
      // Insert into focused equation
      if (latex.includes('\\frac')) {
        focusedMathField.cmd('\\frac');
      } else if (latex.includes('\\sqrt') && !latex.includes('[3]') && !latex.includes('[4]')) {
        focusedMathField.cmd('\\sqrt');
      } else if (latex.includes('^{}')) {
        focusedMathField.cmd('^');
      } else if (latex.includes('\\int')) {
        focusedMathField.cmd('\\int');
      } else if (latex.includes('\\sum')) {
        focusedMathField.cmd('\\sum');
      } else if (latex.includes('\\left')) {
        focusedMathField.cmd('\\left');
      } else {
        // Insert as latex text
        focusedMathField.write(latex);
      }
      focusedMathField.focus();
      updateContent();
      return;
    }

    // Otherwise insert new equation with symbol
    insertEquation(latex);
  }, [insertEquation, findFocusedEquation, updateContent]);

  // Handle input in editor
  const handleInput = useCallback((e) => {
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
      { name: 'كسر', symbol: 'a/b', latex: '\\frac', structure: true },
      { name: 'نصف', symbol: '½', latex: '\\frac{1}{2}' },
      { name: 'ثلث', symbol: '⅓', latex: '\\frac{1}{3}' },
      { name: 'ربع', symbol: '¼', latex: '\\frac{1}{4}' },
      { name: 'ثلثان', symbol: '⅔', latex: '\\frac{2}{3}' },
      { name: 'ثلاثة أرباع', symbol: '¾', latex: '\\frac{3}{4}' },
    ],
    radicals: [
      { name: 'جذر تربيعي', symbol: '√', latex: '\\sqrt', structure: true },
      { name: 'جذر تكعيبي', symbol: '∛', latex: '\\sqrt[3]', structure: true },
      { name: 'جذر رابع', symbol: '∜', latex: '\\sqrt[4]', structure: true },
    ],
    powers: [
      { name: 'قوة', symbol: 'xⁿ', latex: '^{}', structure: true },
      { name: 'أس', symbol: 'x²', latex: 'x^2' },
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
      { name: 'سيجما', symbol: 'Σ', latex: '\\sum', structure: true },
    ],
    sets: [
      { name: 'مالانهاية', symbol: '∞', latex: '\\infty' },
      { name: 'تكامل', symbol: '∫', latex: '\\int', structure: true },
      { name: 'ينتمي', symbol: '∈', latex: '\\in' },
      { name: 'لا ينتمي', symbol: '∉', latex: '\\notin' },
      { name: 'اتحاد', symbol: '∪', latex: '\\cup' },
      { name: 'تقاطع', symbol: '∩', latex: '\\cap' },
      { name: 'مجموعة فارغة', symbol: '∅', latex: '\\emptyset' },
    ],
    functions: [
      { name: 'جا', symbol: 'sin', latex: '\\sin' },
      { name: 'جتا', symbol: 'cos', latex: '\\cos' },
      { name: 'ظا', symbol: 'tan', latex: '\\tan' },
      { name: 'قا', symbol: 'sec', latex: '\\sec' },
      { name: 'قتا', symbol: 'csc', latex: '\\csc' },
      { name: 'ظتا', symbol: 'cot', latex: '\\cot' },
      { name: 'لوغاريتم', symbol: 'log', latex: '\\log', structure: true },
      { name: 'لوغاريتم طبيعي', symbol: 'ln', latex: '\\ln', structure: true },
    ],
    brackets: [
      { name: 'أقواس', symbol: '( )', latex: '\\left(\\right)', structure: true },
      { name: 'أقواس مربعة', symbol: '[ ]', latex: '\\left[\\right]', structure: true },
      { name: 'أقواس معكوفة', symbol: '{ }', latex: '\\left{\\right}', structure: true },
    ],
  };

  const handleSymbolClick = useCallback((symbol) => {
    if (symbol.structure) {
      // For structures, check if we're in an equation or create new one
      const focusedMathField = findFocusedEquation();

      if (focusedMathField) {
        // Insert structure into focused equation
        if (symbol.latex === '\\frac') {
          focusedMathField.cmd('\\frac');
        } else if (symbol.latex === '\\sqrt') {
          focusedMathField.cmd('\\sqrt');
        } else if (symbol.latex === '\\sqrt[3]') {
          focusedMathField.write('\\sqrt[3]{');
        } else if (symbol.latex === '\\sqrt[4]') {
          focusedMathField.write('\\sqrt[4]{');
        } else if (symbol.latex === '^{}') {
          focusedMathField.cmd('^');
        } else if (symbol.latex === '\\int') {
          focusedMathField.cmd('\\int');
        } else if (symbol.latex === '\\sum') {
          focusedMathField.cmd('\\sum');
        } else if (symbol.latex.includes('\\left')) {
          focusedMathField.cmd('\\left');
        } else {
          focusedMathField.write(symbol.latex);
        }
        focusedMathField.focus();
        updateContent();
      } else {
        // Create new equation with structure
        if (symbol.latex === '\\frac') {
          insertEquation('\\frac{a}{b}');
        } else if (symbol.latex === '\\sqrt') {
          insertEquation('\\sqrt{x}');
        } else if (symbol.latex === '\\sqrt[3]') {
          insertEquation('\\sqrt[3]{x}');
        } else if (symbol.latex === '\\sqrt[4]') {
          insertEquation('\\sqrt[4]{x}');
        } else if (symbol.latex === '^{}') {
          insertEquation('x^{n}');
        } else if (symbol.latex === '\\int') {
          insertEquation('\\int_{a}^{b}');
        } else if (symbol.latex === '\\sum') {
          insertEquation('\\sum_{i=1}^{n}');
        } else {
          insertEquation(symbol.latex);
        }
      }
    } else {
      insertSymbol(symbol.latex);
    }
  }, [findFocusedEquation, insertSymbol, insertEquation, updateContent]);

  return (
    <div className="visual-equation-editor border border-gray-300 rounded-lg bg-white">
      {/* Simple Symbol Toolbar */}
      <div className="symbol-toolbar bg-gray-50 border-b border-gray-300 p-3">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              insertEquation('x');
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
                {isArabicBrowser() ? category : category}
              </button>
            ))}
          </div>
        </div>

        {/* Symbol Palette */}
        {activeEquationTab && arabicSymbols[activeEquationTab] && (
          <div className="symbol-palette grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded border border-gray-200">
            {arabicSymbols[activeEquationTab].map((item, idx) => (
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
                <span className="text-lg">{item.symbol}</span>
                <span className="text-xs text-gray-600">{item.name}</span>
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
        data-placeholder={placeholder || (isArabicBrowser() ? 'اكتب هنا... انقر على "إدراج معادلة" لإضافة معادلة رياضية' : 'Write here... Click "Insert Equation" to add a math equation')}
        suppressContentEditableWarning
        tabIndex={0}
      />

      <style>{`
        .editor-content:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .equation-field {
          display: inline-block !important;
          margin: 0 2px !important;
          padding: 2px 4px !important;
          background-color: #f3f4f6 !important;
          border: 1px solid #d1d5db !important;
          border-radius: 3px !important;
          cursor: text !important;
          vertical-align: middle !important;
          transition: all 0.2s !important;
        }
        .equation-field:hover,
        .equation-field.mq-focused {
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
        /* Ensure MathQuill fractions have straight horizontal lines */
        .mq-fraction {
          display: inline-block;
          vertical-align: middle;
        }
        .mq-fraction-line {
          display: block !important;
          border-top: 1px solid #000 !important;
          border-bottom: none !important;
          margin: 2px 0 !important;
          padding: 0 !important;
          height: 0 !important;
          width: 100% !important;
          background: none !important;
          box-shadow: none !important;
        }
        .mq-fraction .mq-numerator,
        .mq-fraction .mq-denominator {
          display: block;
          text-align: center;
        }
        .mq-fraction .mq-numerator {
          padding-bottom: 1px;
        }
        .mq-fraction .mq-denominator {
          padding-top: 1px;
        }
      `}</style>
    </div>
  );
};

export default VisualEquationEditor;
