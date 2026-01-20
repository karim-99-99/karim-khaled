import React, { useEffect, useRef, useState } from 'react';
import * as ReactQuillNamespace from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { isArabicBrowser } from '../utils/language';

// Get ReactQuill from namespace (react-quill v2.0.0)
const ReactQuill = ReactQuillNamespace.default || ReactQuillNamespace;

const RealMathTypeEditor = ({ value, onChange, placeholder }) => {
  const quillRef = useRef(null);
  const [isWirisReady, setIsWirisReady] = useState(false);

  useEffect(() => {
    // Check if WIRIS is loaded
    const checkWiris = setInterval(() => {
      if (window.WirisPlugin) {
        console.log('✅ WIRIS Plugin loaded!');
        setIsWirisReady(true);
        clearInterval(checkWiris);
        initializeMathType();
      }
    }, 100);

    return () => clearInterval(checkWiris);
  }, []);

  const initializeMathType = () => {
    if (!quillRef.current || !window.WirisPlugin) return;

    try {
      const editor = quillRef.current.getEditor();
      
      // Initialize WIRIS plugin for Quill
      if (window.WirisPlugin.GenericIntegration) {
        const genericIntegration = window.WirisPlugin.GenericIntegration.instances.html5;
        if (!genericIntegration) {
          window.WirisPlugin.currentInstance = {
            editorObject: editor,
            editorElement: quillRef.current.editingArea
          };
        }
      }
    } catch (error) {
      console.error('Error initializing MathType:', error);
    }
  };

  const openMathTypeEditor = () => {
    if (!window.WirisPlugin || !quillRef.current) {
      alert(isArabicBrowser() 
        ? '⚠️ MathType لم يتم تحميله بعد. يرجى الانتظار أو إعادة تحميل الصفحة.'
        : '⚠️ MathType is not loaded yet. Please wait or reload the page.');
      return;
    }

    try {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);

      // Open MathType editor using WIRIS plugin
      if (window.WirisPlugin.Core && window.WirisPlugin.Core.Services) {
        // Create editor instance
        const mathmlEditor = window.WirisPlugin.Core.Services.createEditDialog();
        
        // Configure for RTL
        mathmlEditor.setParams({
          language: isArabicBrowser() ? 'ar' : 'en',
          rtl: true
        });

        // Open the editor
        mathmlEditor.open();

        // When formula is saved
        mathmlEditor.insertIntoEditor = function(mathml) {
          if (mathml) {
            // Insert MathML into Quill
            const img = window.WirisPlugin.Parser.initParse(mathml);
            editor.clipboard.dangerouslyPasteHTML(range.index, img);
            editor.setSelection(range.index + 1);
          }
        };
      }
    } catch (error) {
      console.error('Error opening MathType:', error);
      alert(isArabicBrowser() 
        ? '❌ خطأ في فتح MathType: ' + error.message
        : '❌ Error opening MathType: ' + error.message);
    }
  };

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        [{ 'direction': 'rtl' }],
        ['link'],
        ['clean'],
        ['mathtype'] // Custom button
      ],
      handlers: {
        'mathtype': openMathTypeEditor
      }
    },
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'align',
    'direction', 'link', 'image'
  ];

  return (
    <div className="real-mathtype-editor-wrapper">
      {/* Instructions */}
      <div className="mb-4 p-6 bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 border-4 border-purple-400 rounded-2xl shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="text-6xl animate-bounce">🎓</div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-purple-900 mb-3 flex items-center gap-2">
              {isArabicBrowser() ? '📐 MathType الاحترافي - مثل Microsoft Word' : '📐 Professional MathType - Like Microsoft Word'}
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-white bg-opacity-70 p-3 rounded-xl border-2 border-blue-300">
                <span className="text-3xl">1️⃣</span>
                <div>
                  <p className="font-bold text-blue-900">
                    {isArabicBrowser() 
                      ? 'اضغط الزر البنفسجي "MathType" في شريط الأدوات' 
                      : 'Click the purple "MathType" button in the toolbar'}
                  </p>
                  <p className="text-sm text-blue-700">
                    {isArabicBrowser() 
                      ? '(سيفتح نافذة MathType الكاملة مثل الصورة)' 
                      : '(Will open full MathType window like the image)'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gradient-to-r from-green-100 to-emerald-100 p-3 rounded-xl border-2 border-green-400">
                <span className="text-3xl">2️⃣</span>
                <div>
                  <p className="font-bold text-green-900">
                    {isArabicBrowser() 
                      ? '🔍 ابحث عن أيقونة RTL/LTR في شريط أدوات MathType (في الأعلى)' 
                      : '🔍 Look for RTL/LTR icon in MathType toolbar (at the top)'}
                  </p>
                  <p className="text-sm text-green-700 font-bold">
                    {isArabicBrowser() 
                      ? '✨ هذا الزر يحوّل الأسس من ٢³ إلى ³٢ تلقائياً!' 
                      : '✨ This button converts powers from 2³ to ³٢ automatically!'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gradient-to-r from-yellow-100 to-orange-100 p-3 rounded-xl border-2 border-yellow-400">
                <span className="text-3xl">3️⃣</span>
                <div>
                  <p className="font-bold text-orange-900">
                    {isArabicBrowser() 
                      ? 'استخدم جميع الأزرار والقوالب في MathType' 
                      : 'Use all buttons and templates in MathType'}
                  </p>
                  <p className="text-sm text-orange-700">
                    {isArabicBrowser() 
                      ? 'جذور، كسور، أسس، نهايات، تكاملات، مصفوفات، وأكثر!' 
                      : 'Roots, fractions, powers, limits, integrals, matrices, and more!'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Status */}
      {!isWirisReady && (
        <div className="mb-4 p-4 bg-blue-100 border-2 border-blue-400 rounded-xl text-center animate-pulse">
          <div className="inline-flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-3 border-blue-700"></div>
            <span className="text-blue-900 font-bold text-lg">
              {isArabicBrowser() 
                ? '⏳ جاري تحميل MathType الاحترافي...' 
                : '⏳ Loading Professional MathType...'}
            </span>
          </div>
        </div>
      )}

      {isWirisReady && (
        <div className="mb-4 p-4 bg-green-100 border-2 border-green-400 rounded-xl text-center">
          <span className="text-green-900 font-bold text-lg flex items-center justify-center gap-2">
            <span className="text-2xl">✅</span>
            {isArabicBrowser() 
              ? 'MathType جاهز! اضغط الزر البنفسجي في الأسفل' 
              : 'MathType Ready! Click the purple button below'}
          </span>
        </div>
      )}

      {/* Custom CSS for MathType button */}
      <style>{`
        .ql-toolbar .ql-mathtype::before {
          content: '𝑓(𝑥)';
          font-size: 18px;
          font-weight: bold;
          color: white;
        }
        .ql-toolbar .ql-mathtype {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border-radius: 8px !important;
          padding: 8px 16px !important;
          margin: 0 4px !important;
          box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3) !important;
          transition: all 0.3s ease !important;
        }
        .ql-toolbar .ql-mathtype:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 12px rgba(102, 126, 234, 0.5) !important;
        }
        .real-mathtype-editor-wrapper .ql-container {
          min-height: 400px;
          font-size: 16px;
        }
        .real-mathtype-editor-wrapper .ql-editor {
          min-height: 400px;
        }
      `}</style>

      <ReactQuill
        ref={quillRef}
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || (isArabicBrowser() ? 'اكتب هنا...' : 'Type here...')}
        theme="snow"
        dir={isArabicBrowser() ? 'rtl' : 'ltr'}
      />

      {/* Trial Version Note */}
      <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-3xl">💡</span>
          <div className="text-sm flex-1">
            <p className="text-yellow-900 font-bold mb-2">
              {isArabicBrowser() ? '📝 معلومات مهمة:' : '📝 Important Information:'}
            </p>
            <ul className="text-yellow-800 space-y-1 list-disc list-inside">
              <li>
                {isArabicBrowser() 
                  ? 'MathType منتج تجاري - النسخة التجريبية مجانية' 
                  : 'MathType is commercial - trial version is free'}
              </li>
              <li>
                {isArabicBrowser() 
                  ? 'الترخيص الكامل متاح من wiris.com' 
                  : 'Full license available at wiris.com'}
              </li>
              <li className="font-bold text-yellow-900">
                {isArabicBrowser() 
                  ? '🎯 زر RTL/LTR موجود داخل نافذة MathType (شريط الأدوات العلوي)' 
                  : '🎯 RTL/LTR button is inside MathType window (top toolbar)'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealMathTypeEditor;
