import React, { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { isArabicBrowser } from '../utils/language';

const MathTypeEditor = ({ value, onChange, placeholder }) => {
  const quillRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for Wiris plugin to load
    const checkWiris = setInterval(() => {
      if (window.com && window.com.wiris && window.com.wiris.jseditor) {
        setIsReady(true);
        clearInterval(checkWiris);
      }
    }, 100);

    return () => clearInterval(checkWiris);
  }, []);

  useEffect(() => {
    if (!isReady || !quillRef.current) return;

    const editor = quillRef.current.getEditor();
    const toolbar = editor.getModule('toolbar');

    // Add MathType button handler
    const mathButton = toolbar.container.querySelector('.ql-formula');
    if (mathButton) {
      mathButton.addEventListener('click', () => {
        openMathType();
      });
    }
  }, [isReady]);

  const openMathType = () => {
    if (!window.com || !window.com.wiris || !window.com.wiris.jseditor) {
      alert(isArabicBrowser() 
        ? 'MathType غير متوفر. يرجى التحقق من الاتصال بالإنترنت.'
        : 'MathType is not available. Please check your internet connection.');
      return;
    }

    try {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);

      // Open MathType editor
      const mathEditor = window.com.wiris.jseditor.JsEditor.newInstance({
        'language': isArabicBrowser() ? 'ar' : 'en',
        'rtl': true, // Enable RTL support
        'toolbar': 'general'
      });

      mathEditor.open();

      // When equation is inserted
      mathEditor.addEventListener('contentChanged', () => {
        const mathml = mathEditor.getMathML();
        if (mathml) {
          // Insert MathML into editor
          editor.clipboard.dangerouslyPasteHTML(range.index, mathml);
          editor.setSelection(range.index + 1);
        }
      });
    } catch (error) {
      console.error('Error opening MathType:', error);
      alert(isArabicBrowser() 
        ? 'خطأ في فتح MathType'
        : 'Error opening MathType');
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'direction': 'rtl' }],
      ['formula'], // MathType button
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'align',
    'direction', 'link', 'formula'
  ];

  return (
    <div className="mathtype-editor-wrapper">
      {/* Instructions */}
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl shadow-md">
        <div className="flex items-start gap-3">
          <span className="text-4xl">🎓</span>
          <div>
            <h4 className="font-bold text-purple-900 text-lg mb-2">
              {isArabicBrowser() ? 'استخدام MathType المحترف' : 'Using Professional MathType'}
            </h4>
            <div className="text-sm text-purple-800 space-y-2">
              <div className="flex items-start gap-2 bg-white bg-opacity-60 p-2 rounded">
                <span className="font-bold text-lg">📐</span>
                <span>
                  {isArabicBrowser() 
                    ? 'اضغط على زر 𝑓(𝑥) في شريط الأدوات لفتح محرر MathType الاحترافي'
                    : 'Click the 𝑓(𝑥) button in the toolbar to open professional MathType editor'}
                </span>
              </div>
              <div className="flex items-start gap-2 bg-white bg-opacity-60 p-2 rounded">
                <span className="font-bold text-lg">🔄</span>
                <span className="font-bold text-green-700">
                  {isArabicBrowser() 
                    ? 'ابحث عن أيقونة RTL/LTR في MathType لتبديل اتجاه المعادلات!'
                    : 'Look for RTL/LTR icon in MathType to toggle equation direction!'}
                </span>
              </div>
              <div className="flex items-start gap-2 bg-white bg-opacity-60 p-2 rounded">
                <span className="font-bold text-lg">🇸🇦</span>
                <span>
                  {isArabicBrowser() 
                    ? 'RTL: الأسس على اليسار | LTR: الأسس على اليمين'
                    : 'RTL: Powers on left | LTR: Powers on right'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isReady && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded-lg text-center">
          <div className="inline-flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800 font-medium">
              {isArabicBrowser() ? 'جاري تحميل MathType...' : 'Loading MathType...'}
            </span>
          </div>
        </div>
      )}

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

      {/* Note about MathType */}
      <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="text-sm">
            <p className="text-yellow-900 font-bold mb-1">
              {isArabicBrowser() ? 'ملاحظة مهمة:' : 'Important Note:'}
            </p>
            <p className="text-yellow-800">
              {isArabicBrowser() 
                ? 'MathType هو منتج تجاري من Wiris. يمكنك استخدام النسخة التجريبية المجانية أو الاشتراك من '
                : 'MathType is a commercial product by Wiris. You can use the free trial or subscribe at '}
              <a 
                href="https://www.wiris.com/mathtype" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-yellow-900 underline hover:text-yellow-700"
              >
                wiris.com
              </a>
            </p>
            <p className="text-yellow-700 mt-2 text-xs">
              {isArabicBrowser() 
                ? '💡 البديل المجاني الحالي (SimpleProfessionalMathEditor) يوفر نفس الوظائف تقريباً'
                : '💡 Current free alternative (SimpleProfessionalMathEditor) provides similar functionality'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathTypeEditor;
