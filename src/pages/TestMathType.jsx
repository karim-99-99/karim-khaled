import React, { useState } from 'react';
import RealMathTypeEditor from '../components/RealMathTypeEditor';
import { isArabicBrowser } from '../utils/language';

const TestMathType = () => {
  const [content, setContent] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8" dir={isArabicBrowser() ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-4xl font-black text-purple-900 mb-4 flex items-center gap-3">
            <span className="text-5xl">🎓</span>
            {isArabicBrowser() ? 'اختبار MathType الاحترافي' : 'Professional MathType Test'}
          </h1>
          <p className="text-lg text-gray-700">
            {isArabicBrowser() 
              ? 'هذه صفحة تجريبية لاختبار MathType. اضغط الزر البنفسجي في المحرر لفتح MathType!' 
              : 'This is a test page for MathType. Click the purple button in the editor to open MathType!'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <RealMathTypeEditor
            value={content}
            onChange={setContent}
            placeholder={isArabicBrowser() ? 'اكتب هنا أو اضغط زر MathType...' : 'Type here or click MathType button...'}
          />
        </div>

        {content && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {isArabicBrowser() ? '📄 المحتوى المحفوظ:' : '📄 Saved Content:'}
            </h2>
            <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestMathType;
