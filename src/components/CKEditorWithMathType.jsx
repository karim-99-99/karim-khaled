import React, { useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { isArabicBrowser } from '../utils/language';

const CKEditorWithMathType = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);

  const editorConfiguration = {
    language: isArabicBrowser() ? 'ar' : 'en',
    placeholder: placeholder || (isArabicBrowser() ? 'اكتب هنا...' : 'Type here...'),
    toolbar: {
      items: [
        'heading',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'fontSize',
        'fontColor',
        'fontBackgroundColor',
        '|',
        'alignment',
        '|',
        'numberedList',
        'bulletedList',
        '|',
        'indent',
        'outdent',
        '|',
        'link',
        'blockQuote',
        '|',
        'MathType', // MathType button
        'ChemType', // ChemType button (optional)
        '|',
        'undo',
        'redo'
      ],
      shouldNotGroupWhenFull: true
    },
    
    // MathType configuration
    extraPlugins: [],
    
    // RTL support
    contentsLangDirection: isArabicBrowser() ? 'rtl' : 'ltr',
    
    // Height
    height: 400,
  };

  return (
    <div className="ckeditor-mathjax-wrapper" dir={isArabicBrowser() ? 'rtl' : 'ltr'}>
      {/* Instructions */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <span className="text-2xl">📐</span>
          {isArabicBrowser() ? 'كيفية استخدام MathType:' : 'How to use MathType:'}
        </h4>
        <div className="text-sm text-blue-800 space-y-2">
          <div className="flex items-start gap-2">
            <span className="font-bold">1️⃣</span>
            <span>
              {isArabicBrowser() 
                ? 'اضغط على زر 𝑓𝑥 في شريط الأدوات لفتح محرر MathType'
                : 'Click the 𝑓𝑥 button in the toolbar to open MathType editor'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">2️⃣</span>
            <span>
              {isArabicBrowser() 
                ? 'في MathType، ابحث عن زر RTL/LTR في الأعلى لتبديل الاتجاه'
                : 'In MathType, look for the RTL/LTR button at the top to toggle direction'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">3️⃣</span>
            <span className="font-bold text-green-700">
              {isArabicBrowser() 
                ? '✨ وضع RTL: الأسس على اليسار (٢³ → ³٢)'
                : '✨ RTL Mode: Powers on left (2³ → ³٢)'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">4️⃣</span>
            <span className="font-bold text-blue-700">
              {isArabicBrowser() 
                ? '✨ وضع LTR: العرض الإنجليزي الطبيعي (٢³)'
                : '✨ LTR Mode: Standard English display (2³)'}
            </span>
          </div>
        </div>
      </div>

      <CKEditor
        editor={ClassicEditor}
        config={editorConfiguration}
        data={value || ''}
        onReady={editor => {
          editorRef.current = editor;
          
          // Add MathType plugin dynamically
          if (window.WirisPlugin) {
            window.WirisPlugin.currentInstance = editor;
          }
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          if (onChange) {
            onChange(data);
          }
        }}
      />

      {/* Note about MathType */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm">
        <p className="text-yellow-800">
          <strong>📝 {isArabicBrowser() ? 'ملاحظة:' : 'Note:'}</strong>{' '}
          {isArabicBrowser() 
            ? 'MathType يتطلب ترخيص تجاري. يمكنك استخدام النسخة التجريبية المجانية أو الاشتراك من wiris.com'
            : 'MathType requires a commercial license. You can use the free trial or subscribe at wiris.com'}
        </p>
      </div>
    </div>
  );
};

export default CKEditorWithMathType;
