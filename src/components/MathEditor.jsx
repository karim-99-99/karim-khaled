import { useEffect, useRef, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { isArabicBrowser } from '../utils/language';

// Load MathQuill via CDN to avoid Vite import issues
let MQ;
let MQ_MathField;
let mathQuillLoaded = false;
let loadingPromise = null;

const loadMathQuill = async () => {
  if (mathQuillLoaded && MQ_MathField) {
    return MQ_MathField;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve) => {
    // Check if MathQuill is already loaded globally
    if (window.MathQuill) {
      MQ = window.MathQuill;
      MQ_MathField = MQ.MathField;
      mathQuillLoaded = true;
      loadingPromise = null;
      resolve(MQ_MathField);
      return;
    }

    // Load jQuery first (required by MathQuill)
    const loadJQuery = () => {
      if (window.jQuery || window.$) {
        return Promise.resolve();
      }
      return new Promise((resolveJQ) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js';
        script.onload = resolveJQ;
        script.onerror = resolveJQ; // Continue even if jQuery fails
        document.head.appendChild(script);
      });
    };

    // Load MathQuill CSS
    const loadCSS = () => {
      return new Promise((resolveCSS) => {
        if (document.querySelector('link[href*="mathquill"]')) {
          resolveCSS();
          return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/mathquill@0.10.1/build/mathquill.css';
        link.onload = resolveCSS;
        link.onerror = resolveCSS;
        document.head.appendChild(link);
      });
    };

    // Load MathQuill JS
    const loadJS = () => {
      return new Promise((resolveJS) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathquill@0.10.1/build/mathquill.min.js';
        script.onload = () => {
          // Wait a moment for MathQuill to initialize
          setTimeout(() => {
            if (window.MathQuill) {
              MQ = window.MathQuill;
              MQ_MathField = MQ.MathField;
              mathQuillLoaded = true;
              loadingPromise = null;
              resolveJS(MQ_MathField);
            } else {
              console.error('MathQuill not found after loading');
              loadingPromise = null;
              resolveJS(null);
            }
          }, 100);
        };
        script.onerror = () => {
          console.error('Failed to load MathQuill script');
          loadingPromise = null;
          resolveJS(null);
        };
        document.head.appendChild(script);
      });
    };

    // Load all dependencies in order
    loadJQuery()
      .then(() => Promise.all([loadCSS(), loadJS()]))
      .then((results) => {
        const result = results[1]; // JS load result
        if (result) {
          resolve(result);
        } else {
          resolve(null);
        }
      })
      .catch((error) => {
        console.error('Error loading MathQuill:', error);
        loadingPromise = null;
        resolve(null);
      });
  });

  return loadingPromise;
};

const MathEditor = ({ onInsert, onClose }) => {
  const mathFieldRef = useRef(null);
  const mathField = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [latex, setLatex] = useState('');
  const [isRTL, setIsRTL] = useState(() => {
    // Load RTL preference from localStorage
    const saved = localStorage.getItem('mathEditorRTL');
    return saved ? JSON.parse(saved) : true; // Default to RTL for Arabic
  });

  useEffect(() => {
    let mounted = true;
    
    const initMathQuill = async () => {
      const MathField = await loadMathQuill();
      
      if (!mounted || !mathFieldRef.current || !MathField) {
        return;
      }

      const config = {
        spaceBehavesLikeTab: true,
        leftRightIntoCmdGoes: 'up',
        restrictMismatchedBrackets: true,
        sumStartsWithNEquals: true,
        supSubsRequireOperand: true,
        charsThatBreakOutOfSupSub: '+-=<>',
        autoSubscriptNumerals: true,
        autoCommands: 'pi theta sqrt sum prod alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron rho sigma tau upsilon phi chi psi omega',
        autoOperatorNames: 'sin cos tan sec csc cot sinh cosh tanh log ln exp arcsin arccos arctan',
        maxDepth: 10,
        handlers: {
          edit: () => {
            if (mathField.current && mounted) {
              const latexValue = mathField.current.latex();
              setLatex(latexValue);
            }
          }
        }
      };

      try {
        mathField.current = MathField(mathFieldRef.current, config);
        if (mathField.current && mounted) {
          mathField.current.focus();
        }
      } catch (error) {
        console.error('Error initializing MathQuill:', error);
      }
    };

    initMathQuill();

    return () => {
      mounted = false;
      if (mathField.current) {
        mathField.current = null;
      }
    };
  }, []);

  const handleInsert = () => {
    if (mathField.current && onInsert) {
      const latexValue = mathField.current.latex();
      onInsert(latexValue);
      if (onClose) onClose();
    }
  };

  const toggleRTL = () => {
    const newRTL = !isRTL;
    setIsRTL(newRTL);
    localStorage.setItem('mathEditorRTL', JSON.stringify(newRTL));
  };

  // Common math symbols with Arabic numerals support
  const mathSymbols = [
    // Operators
    { symbol: '+', latex: '+' },
    { symbol: '−', latex: '-' },
    { symbol: '×', latex: '\\times' },
    { symbol: '÷', latex: '\\div' },
    { symbol: '=', latex: '=' },
    { symbol: '≠', latex: '\\neq' },
    { symbol: '<', latex: '<' },
    { symbol: '>', latex: '>' },
    { symbol: '≤', latex: '\\leq' },
    { symbol: '≥', latex: '\\geq' },
    { symbol: '±', latex: '\\pm' },
    { symbol: '√', latex: '\\sqrt{x}' },
    { symbol: 'ⁿ', latex: '^{n}' },
    
    // Fractions and operations
    { symbol: '½', latex: '\\frac{1}{2}' },
    { symbol: '¼', latex: '\\frac{1}{4}' },
    { symbol: '¾', latex: '\\frac{3}{4}' },
    { symbol: 'π', latex: '\\pi' },
    { symbol: '∞', latex: '\\infty' },
    { symbol: '∑', latex: '\\sum' },
    { symbol: '∏', latex: '\\prod' },
    { symbol: '∫', latex: '\\int' },
    
    // Greek letters
    { symbol: 'α', latex: '\\alpha' },
    { symbol: 'β', latex: '\\beta' },
    { symbol: 'γ', latex: '\\gamma' },
    { symbol: 'δ', latex: '\\delta' },
    { symbol: 'θ', latex: '\\theta' },
    { symbol: 'λ', latex: '\\lambda' },
    { symbol: 'μ', latex: '\\mu' },
    { symbol: 'σ', latex: '\\sigma' },
    { symbol: 'Δ', latex: '\\Delta' },
    { symbol: 'Ω', latex: '\\Omega' },
    
    // Sets and logic
    { symbol: '∈', latex: '\\in' },
    { symbol: '∉', latex: '\\notin' },
    { symbol: '⊂', latex: '\\subset' },
    { symbol: '∪', latex: '\\cup' },
    { symbol: '∩', latex: '\\cap' },
    { symbol: '∅', latex: '\\emptyset' },
    
    // Functions
    { symbol: 'sin', latex: '\\sin' },
    { symbol: 'cos', latex: '\\cos' },
    { symbol: 'tan', latex: '\\tan' },
    { symbol: 'log', latex: '\\log' },
    { symbol: 'ln', latex: '\\ln' },
    { symbol: 'exp', latex: '\\exp' },
  ];

  const handleSymbolClick = (latexValue) => {
    if (mathField.current) {
      // Replace placeholder x if present
      if (latexValue.includes('{x}')) {
        mathField.current.cmd(latexValue.replace('{x}', ''));
      } else {
        mathField.current.write(latexValue);
      }
      mathField.current.focus();
    }
  };

  const handleArabicNumber = (arabicNum) => {
    // Convert Arabic numeral to LaTeX
    const arabicToLatin = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    const latinNum = arabicToLatin[arabicNum] || arabicNum;
    if (mathField.current) {
      mathField.current.write(latinNum);
      mathField.current.focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4" onClick={(e) => {
      if (e.target === e.currentTarget && onClose) {
        onClose();
      }
    }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-dark-600">
              {isArabicBrowser() ? 'محرر المعادلات الرياضية' : 'Math Equation Editor'}
            </h2>
            <div className="flex items-center gap-3">
              {/* RTL/LTR Toggle Button */}
              <button
                onClick={toggleRTL}
                className={`px-6 py-3 rounded-lg font-bold transition-all duration-200 flex items-center gap-3 ${
                  isRTL 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transform hover:scale-105' 
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg transform hover:scale-105'
                }`}
                title={isRTL 
                  ? (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع الإنجليزي' : 'Click to switch to LTR') 
                  : (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع العربي' : 'Click to switch to RTL')
                }
              >
                <span className="text-2xl">
                  {isRTL ? '🇸🇦' : '🇬🇧'}
                </span>
                <div className="flex flex-col items-start">
                  <span className="text-xs opacity-80">
                    {isRTL ? 'عربي' : 'English'}
                  </span>
                  <span className="text-lg font-black">
                    {isRTL ? 'RTL' : 'LTR'}
                  </span>
                </div>
                <span className="text-xl">
                  {isRTL ? '⬅️' : '➡️'}
                </span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
          </div>

          {/* Math Input Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-600 mb-2">
              {isArabicBrowser() ? 'اكتب المعادلة الرياضية' : 'Type Math Equation'}
            </label>
            <div 
              ref={mathFieldRef}
              className="border-2 border-gray-300 rounded-lg p-4 min-h-[80px] bg-white text-2xl"
              style={{ direction: 'ltr' }}
            />
          </div>

          {/* Preview */}
          <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-dark-600">
                {isArabicBrowser() ? 'معاينة المعادلة' : 'Equation Preview'}
              </label>
              <span className={`px-4 py-2 rounded-lg text-sm font-bold shadow-md ${
                isRTL 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-green-500 text-white'
              }`}>
                {isRTL ? '🇸🇦 عربي RTL' : '🇬🇧 English LTR'}
              </span>
            </div>
            <div 
              className={`text-center py-6 px-4 bg-white rounded-lg border border-gray-300 min-h-[100px] flex items-center justify-center ${
                isRTL ? 'math-rtl-mode' : 'math-ltr-mode'
              }`}
            >
              {latex ? (
                <div className="text-3xl">
                  <BlockMath math={latex} />
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-gray-400 block mb-2">
                    {isArabicBrowser() ? 'ستظهر المعادلة هنا' : 'Equation preview will appear here'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {isArabicBrowser() 
                      ? `مثال: اكتب 2^3 لترى الفرق بين ${isRTL ? 'RTL' : 'LTR'}`
                      : `Example: Type 2^3 to see ${isRTL ? 'RTL' : 'LTR'} difference`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RTL/LTR Examples */}
          <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <h3 className="text-sm font-bold text-yellow-800 mb-2">
              {isArabicBrowser() 
                ? `💡 أمثلة الفرق بين RTL و LTR:` 
                : `💡 Examples of RTL vs LTR difference:`
              }
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-blue-100 p-3 rounded">
                <div className="font-bold text-blue-900 mb-1">🇸🇦 RTL (عربي):</div>
                <div className="space-y-1 text-blue-800">
                  <div>• <span className="font-mono">2^3</span> → ³٢ (الأس على اليسار)</div>
                  <div>• <span className="font-mono">x^2</span> → ²x</div>
                  <div>• الكسور والجذور طبيعية</div>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded">
                <div className="font-bold text-green-900 mb-1">🇬🇧 LTR (English):</div>
                <div className="space-y-1 text-green-800">
                  <div>• <span className="font-mono">2^3</span> → 2³ (normal)</div>
                  <div>• <span className="font-mono">x^2</span> → x²</div>
                  <div>• Everything standard</div>
                </div>
              </div>
            </div>
          </div>

          {/* Arabic Numbers */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-600 mb-2">
              {isArabicBrowser() ? 'الأرقام العربية' : 'Arabic Numbers'}
            </label>
            <div className="flex flex-wrap gap-2">
              {['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'].map((num, idx) => (
                <button
                  key={idx}
                  onClick={() => handleArabicNumber(num)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-lg font-medium transition"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Math Symbols */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-600 mb-2">
              {isArabicBrowser() ? 'الرموز الرياضية' : 'Math Symbols'}
            </label>
            <div className="flex flex-wrap gap-2">
              {mathSymbols.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSymbolClick(item.latex)}
                  className="bg-gray-200 hover:bg-gray-300 text-dark-600 px-3 py-2 rounded text-base font-medium transition"
                  title={item.latex}
                >
                  {item.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Templates */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-600 mb-2">
              {isArabicBrowser() ? 'قوالب سريعة' : 'Quick Templates'}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSymbolClick('\\frac{a}{b}')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                {isArabicBrowser() ? 'كسر' : 'Fraction'} (a/b)
              </button>
              <button
                onClick={() => handleSymbolClick('\\sqrt{x}')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                {isArabicBrowser() ? 'جذر' : 'Square Root'}
              </button>
              <button
                onClick={() => handleSymbolClick('x^{n}')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                {isArabicBrowser() ? 'قوة' : 'Power'} (xⁿ)
              </button>
              <button
                onClick={() => handleSymbolClick('\\sum_{i=1}^{n}')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                {isArabicBrowser() ? 'مجموع' : 'Sum'}
              </button>
              <button
                onClick={() => handleSymbolClick('\\int_{a}^{b}')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                {isArabicBrowser() ? 'تكامل' : 'Integral'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition font-medium"
            >
              {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleInsert}
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition font-medium"
            >
              {isArabicBrowser() ? 'إدراج' : 'Insert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathEditor;
