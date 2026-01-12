import React, { useEffect, useRef, useState, useMemo } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor } from '@ckeditor/ckeditor5-editor-classic';
import { Essentials } from '@ckeditor/ckeditor5-essentials';
import { Bold, Italic, Underline } from '@ckeditor/ckeditor5-basic-styles';
import { Heading } from '@ckeditor/ckeditor5-heading';
import { List } from '@ckeditor/ckeditor5-list';
import { Link } from '@ckeditor/ckeditor5-link';
import { Image, ImageInsert } from '@ckeditor/ckeditor5-image';
import { Undo } from '@ckeditor/ckeditor5-undo';
import MathType from '@wiris/mathtype-ckeditor5';
import { isArabicBrowser } from '../utils/language';

// Create custom editor class with MathType - moved inside component to avoid module-level issues
const createCustomEditor = () => {
  try {
    class CustomMathEditor extends ClassicEditor {
      static builtinPlugins = [
        Essentials,
        Bold,
        Italic,
        Underline,
        Heading,
        List,
        Link,
        Image,
        ImageInsert,
        Undo,
        MathType, // Add MathType plugin (includes both MathType and ChemType)
      ];

      static defaultConfig = {
        toolbar: {
          items: [
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            '|',
            'MathType',
            'ChemType',
            '|',
            'bulletedList',
            'numberedList',
            '|',
            'link',
            'insertImage',
            '|',
            'undo',
            'redo',
          ],
          shouldNotGroupWhenFull: true,
        },
        language: 'en',
        direction: 'ltr',
        mathTypeParameters: {
          editorParameters: {
            language: 'en',
          },
        },
      };
    }
    return CustomMathEditor;
  } catch (error) {
    console.error('Error creating CustomMathEditor:', error);
    throw error;
  }
};

const ExamMathEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);
  const [error, setError] = useState(null);

  // Create editor class only when component mounts
  const CustomEditor = useMemo(() => {
    try {
      return createCustomEditor();
    } catch (err) {
      console.error('Failed to create editor:', err);
      setError(err.message || 'Failed to initialize editor');
      return null;
    }
  }, []);

  useEffect(() => {
    // Load WIRIS script if not already loaded
    if (typeof window !== 'undefined') {
      const existingScript = document.querySelector('script[src*="WIRISplugins"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.wiris.net/demo/plugins/app/WIRISplugins.js?viewer=image';
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => {
          console.log('WIRIS MathType script loaded');
        };
        script.onerror = () => {
          console.error('Failed to load WIRIS MathType script');
        };
      }
    }
  }, []);

  const editorConfig = useMemo(() => ({
    language: isArabicBrowser() ? 'ar' : 'en',
    placeholder: placeholder || (isArabicBrowser() ? 'اكتب هنا...' : 'Write here...'),
    direction: isArabicBrowser() ? 'rtl' : 'ltr',
    mathTypeParameters: {
      editorParameters: {
        language: isArabicBrowser() ? 'ar' : 'en',
      },
    },
  }), [placeholder]);

  if (error || !CustomEditor) {
    return (
      <div className="p-4 border border-red-300 rounded bg-red-50">
        <p className="text-red-600 text-sm mb-2">
          {isArabicBrowser() 
            ? 'حدث خطأ في تحميل المحرر. استخدم مربع النص أدناه.' 
            : 'Error loading editor. Please use the text box below.'}
        </p>
        {error && (
          <p className="text-red-500 text-xs mb-2">
            {error}
          </p>
        )}
        <textarea
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder || (isArabicBrowser() ? 'اكتب هنا...' : 'Write here...')}
          className="w-full mt-2 p-2 border rounded min-h-[300px]"
          dir={isArabicBrowser() ? 'rtl' : 'ltr'}
        />
      </div>
    );
  }

  return (
    <div className="exam-math-editor" dir={isArabicBrowser() ? 'rtl' : 'ltr'}>
      <CKEditor
        editor={CustomEditor}
        data={value || ''}
        config={editorConfig}
        onReady={(editor) => {
          editorRef.current = editor;
          setEditorReady(true);
          
          // Set RTL direction for Arabic
          if (isArabicBrowser()) {
            try {
              const viewRoot = editor.editing.view.document.getRoot();
              editor.editing.view.change((writer) => {
                writer.setAttribute('dir', 'rtl', viewRoot);
              });
            } catch (error) {
              console.log('Setting RTL:', error);
            }
          }

          console.log('CKEditor ready! MathType buttons should appear in toolbar.');
          console.log('Available plugins:', Array.from(editor.plugins).map(p => p.constructor.name));
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          if (onChange) {
            onChange(data);
          }
        }}
        onBlur={(event, editor) => {
          const data = editor.getData();
          if (onChange) {
            onChange(data);
          }
        }}
        onError={(error, { willEditorRestart }) => {
          console.error('CKEditor error:', error);
          setError(error.message || 'Editor error occurred');
          if (willEditorRestart) {
            console.log('Editor will restart');
            setError(null);
          }
        }}
      />
      
      <div className="mt-2 text-xs text-gray-500">
        {isArabicBrowser() 
          ? '💡 انقر على أزرار MathType (f) أو ChemType (c) في شريط الأدوات لإدراج المعادلات الرياضية أو الكيميائية' 
          : '💡 Click the MathType (f) or ChemType (c) buttons in the toolbar to insert math or chemistry equations'}
      </div>
      
      {!editorReady && (
        <div className="mt-2 text-xs text-gray-400">
          {isArabicBrowser() ? 'جاري تهيئة المحرر...' : 'Initializing editor...'}
        </div>
      )}
      
      <style>{`
        .exam-math-editor .ck-editor__editable {
          min-height: 300px;
          direction: ${isArabicBrowser() ? 'rtl' : 'ltr'} !important;
          text-align: ${isArabicBrowser() ? 'right' : 'left'} !important;
        }
        .exam-math-editor .ck-editor__editable[dir="rtl"] {
          direction: rtl !important;
          text-align: right !important;
        }
        .exam-math-editor .ck-toolbar {
          direction: ${isArabicBrowser() ? 'rtl' : 'ltr'};
        }
        .exam-math-editor .ck-editor__editable img {
          max-width: 100%;
          height: auto;
          display: inline-block;
        }
        .exam-math-editor .ck-toolbar .ck-toolbar__separator {
          margin: 0 8px;
        }
        /* MathType button styles */
        .exam-math-editor .ck-button[aria-label*="MathType"],
        .exam-math-editor .ck-button[aria-label*="ChemType"] {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default ExamMathEditor;
