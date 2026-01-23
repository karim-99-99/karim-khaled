import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSubjects, getQuestions, getQuestionsByLevel, addQuestion, updateQuestion, deleteQuestion, getLevelsByChapter, getCategoriesBySubject, getChaptersByCategory, getItemById, getChapterById, getCategoryById, getSections } from '../../services/storageService';
import * as ReactQuillNamespace from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Get ReactQuill from namespace (react-quill v2.0.0)
const ReactQuill = ReactQuillNamespace.default || ReactQuillNamespace;
import Header from '../../components/Header';
import ErrorBoundary from '../../components/ErrorBoundary';
import { isArabicBrowser } from '../../utils/language';
import MathEditor from '../../components/MathEditor';
import MathRenderer from '../../components/MathRenderer';
import WordLikeEditor from '../../components/WordLikeEditor';
import EquationEditor from '../../components/EquationEditor';
import VisualEquationEditor from '../../components/VisualEquationEditor';
import WYSIWYGEquationEditor from '../../components/WYSIWYGEquationEditor';
import SimpleProfessionalMathEditor from '../../components/SimpleProfessionalMathEditor';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import katex from 'katex';

const Questions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemIdFromUrl = searchParams.get('itemId');
  const returnUrl = searchParams.get('returnUrl');
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionImage, setQuestionImage] = useState(null);
  const [questionImagePreview, setQuestionImagePreview] = useState(null);
  const [imageScale, setImageScale] = useState(100); // Image scale percentage
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState(null);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  // Using the best working editor - SimpleProfessionalMathEditor with RTL/LTR button!
  const imageInputRef = useRef(null);
  const quillRef = useRef(null);
  const isConvertingRef = useRef(false);
  const [formData, setFormData] = useState({
    question: '',
    questionEn: '',
    image: null, // base64 encoded image
    explanation: '', // Explanation for the correct answer
    answers: [
      { id: 'a', text: '', isCorrect: false },
      { id: 'b', text: '', isCorrect: false },
      { id: 'c', text: '', isCorrect: false },
      { id: 'd', text: '', isCorrect: false },
    ],
  });

  // Convert Western numerals (0-9) to Arabic numerals (٠-٩)
  const convertToArabicNumerals = (text) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return text.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  };

  // Convert Arabic numerals (٠-٩) to Western numerals (0-9)
  const convertToWesternNumerals = (text) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return text.replace(/[٠-٩]/g, (digit) => {
      const index = arabicNumerals.indexOf(digit);
      return index !== -1 ? westernNumerals[index] : digit;
    });
  };

  // Detect if text contains Arabic characters
  const hasArabicCharacters = (text) => {
    // Arabic Unicode range: \u0600-\u06FF
    return /[\u0600-\u06FF]/.test(text);
  };

  // Check context around cursor to determine language
  const detectLanguageContext = (quill, cursorIndex) => {
    const text = quill.getText();
    
    // Find the last non-numeric, non-whitespace, non-punctuation character before cursor
    // This tells us what language the user is actively typing in
    let lastLetterIndex = cursorIndex - 1;
    while (lastLetterIndex >= 0) {
      const char = text.charAt(lastLetterIndex);
      // Skip numbers, spaces, and common punctuation
      if (!/[0-9٠-٩\s.,;:!?\-_()\[\]{}\"']/.test(char)) {
        // Check if it's Arabic
        if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(char)) {
          return 'ar';
        }
        // Check if it's Latin
        if (/[a-zA-Z]/.test(char)) {
          return 'en';
        }
      }
      lastLetterIndex--;
    }
    
    // If no letters found before cursor, check immediate context after cursor
    let nextLetterIndex = cursorIndex;
    while (nextLetterIndex < text.length && nextLetterIndex < cursorIndex + 10) {
      const char = text.charAt(nextLetterIndex);
      if (!/[0-9٠-٩\s.,;:!?\-_()\[\]{}\"']/.test(char)) {
        if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(char)) {
          return 'ar';
        }
        if (/[a-zA-Z]/.test(char)) {
          return 'en';
        }
      }
      nextLetterIndex++;
    }
    
    // Check broader context (50 chars before, 10 after) for overall language
    const start = Math.max(0, cursorIndex - 50);
    const end = Math.min(text.length, cursorIndex + 10);
    const context = text.substring(start, end);
    
    const arabicChars = context.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || [];
    const latinChars = context.match(/[a-zA-Z]/g) || [];
    const arabicCount = arabicChars.length;
    const latinCount = latinChars.length;
    
    // If Arabic characters exist in context, default to Arabic
    if (arabicCount > 0) {
      // If Arabic count is significant, use Arabic
      if (arabicCount >= latinCount || arabicCount >= 3) {
        return 'ar';
      }
    }
    
    // If only Latin characters, use English
    if (latinCount > 0 && arabicCount === 0) {
      return 'en';
    }
    
    // Default: check page direction (this is an Arabic interface, so default to Arabic)
    const htmlDir = document.documentElement.dir || document.documentElement.getAttribute('dir');
    return (htmlDir === 'rtl' || isArabicBrowser()) ? 'ar' : 'en';
  };

  // Insert Arabic numeral at cursor position
  const insertArabicNumeral = (number) => {
    // Use WordLikeEditor's exposed function if available
    if (window.wordLikeEditorInsertArabic) {
      window.wordLikeEditorInsertArabic(number);
      return;
    }
    
    // Fallback to old method if WordLikeEditor ref is available
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      // Focus the editor if not already focused
      const editorElement = quill.root;
      if (document.activeElement !== editorElement) {
        editorElement.focus();
      }
      
      setTimeout(() => {
        const range = quill.getSelection(true);
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        if (number >= 0 && number <= 9) {
          const insertIndex = range ? range.index : quill.getLength() - 1;
          quill.insertText(insertIndex, arabicNumerals[number]);
          quill.setSelection(insertIndex + 1);
        }
      }, 10);
    }
  };

  // Convert selected text numbers to Arabic numerals
  const convertSelectionToArabic = () => {
    // Use WordLikeEditor's exposed function if available
    if (window.wordLikeEditorConvertSelection) {
      window.wordLikeEditorConvertSelection();
      return;
    }
    
    // Fallback to old method
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      if (range && range.length > 0) {
        const selectedText = quill.getText(range.index, range.length);
        const arabicText = convertToArabicNumerals(selectedText);
        quill.deleteText(range.index, range.length);
        quill.insertText(range.index, arabicText);
        quill.setSelection(range.index, arabicText.length);
      } else {
        // If no selection, convert all numbers in the entire text
        const fullText = quill.getText();
        const arabicText = convertToArabicNumerals(fullText);
        if (fullText !== arabicText) {
          const currentLength = quill.getLength();
          quill.deleteText(0, currentLength - 1);
          quill.insertText(0, arabicText.substring(0, arabicText.length - 1));
        }
      }
    }
  };

  // Helper function to find item's parent information
  const findItemParents = (itemId) => {
    try {
      const sections = getSections();
      if (!sections || sections.length === 0) {
        return null;
      }
      for (const section of sections) {
        if (!section || !section.subjects) continue;
        for (const subject of section.subjects) {
          if (!subject || !subject.categories) continue;
          for (const category of (subject.categories || [])) {
            if (!category || !category.chapters) continue;
            for (const chapter of (category.chapters || [])) {
              if (!chapter || !chapter.items) continue;
              const item = (chapter.items || []).find(i => i.id === itemId);
              if (item) {
                return { subject, category, chapter };
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error finding item parents:', error);
    }
    return null;
  };

  // Handle text change in Quill editor (update form data)
  const handleQuillChange = (content) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      question: content
    }));
  };

  // Handle math equation insertion from MathEditor modal - insert as rendered HTML
  const handleInsertMath = (latex) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      if (range) {
        try {
          // Render LaTeX to HTML using KaTeX
          const html = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
          });
          
          // Insert rendered HTML directly into Quill
          const selection = quill.getSelection(true);
          
          // Use pasteHTML by simulating a paste event
          const clipboard = quill.clipboard;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          tempDiv.style.display = 'inline-block';
          
          // Convert HTML to Quill delta
          const delta = clipboard.convert(tempDiv);
          
          // Insert at cursor position
          quill.updateContents(
            new quill.constructor.import('parchment').Delta()
              .retain(selection.index)
              .concat(delta),
            'user'
          );
          
          // Update form data
          setTimeout(() => {
            quill.setSelection(selection.index + delta.length(), 0);
            const newContent = quill.root.innerHTML;
            setFormData({ ...formData, question: newContent });
          }, 10);
        } catch (error) {
          console.error('Error rendering math:', error);
          // Fallback: insert as visual symbol if simple, otherwise as LaTeX
          const simpleSymbols = {
            'x^2': 'x²',
            'x_1': 'x₁',
            '\\sqrt{x}': '√x',
            '\\sum_{i=1}^{n}': '∑',
            '\\int_{a}^{b}': '∫',
            '\\frac{a}{b}': '½'
          };
          if (simpleSymbols[latex]) {
            insertMathSymbol(simpleSymbols[latex]);
          } else {
            insertMathEquation(latex);
          }
        }
      }
    }
    setShowMathEditor(false);
  };

  // Insert math symbol directly into editor
  const insertMathSymbol = (symbol) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      if (range) {
        quill.insertText(range.index, symbol);
        quill.setSelection(range.index + symbol.length);
        
        // Update form data
        const newContent = quill.root.innerHTML;
        setFormData({ ...formData, question: newContent });
      }
    }
  };

  // Insert LaTeX math equation (wrapped in $$) - will be rendered when displayed
  const insertMathEquation = (latex) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      if (range) {
        // Insert as LaTeX wrapped in $$ for rendering later
        const mathWrapper = `$$${latex}$$`;
        quill.insertText(range.index, mathWrapper);
        quill.setSelection(range.index + mathWrapper.length);
        
        // Update form data
        const newContent = quill.root.innerHTML;
        setFormData({ ...formData, question: newContent });
      }
    }
  };

  // Insert math symbol directly (visual symbol, not LaTeX)
  const insertMathSymbolVisual = (symbol) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      if (range) {
        quill.insertText(range.index, symbol);
        quill.setSelection(range.index + symbol.length);
        
        // Update form data
        const newContent = quill.root.innerHTML;
        setFormData({ ...formData, question: newContent });
      }
    }
  };

  // Common math symbols for quick insertion
  const quickMathSymbols = [
    { label: '+', symbol: '+' },
    { label: '−', symbol: '−' },
    { label: '×', symbol: '×' },
    { label: '÷', symbol: '÷' },
    { label: '=', symbol: '=' },
    { label: '≠', symbol: '≠' },
    { label: '<', symbol: '<' },
    { label: '>', symbol: '>' },
    { label: '≤', symbol: '≤' },
    { label: '≥', symbol: '≥' },
    { label: '±', symbol: '±' },
    { label: '√', symbol: '√' },
    { label: '²', symbol: '²' },
    { label: '³', symbol: '³' },
    { label: '½', symbol: '½' },
    { label: '¼', symbol: '¼' },
    { label: '¾', symbol: '¾' },
    { label: 'π', symbol: 'π' },
    { label: '∞', symbol: '∞' },
    { label: '∑', symbol: '∑' },
    { label: '∫', symbol: '∫' },
    { label: 'α', symbol: 'α' },
    { label: 'β', symbol: 'β' },
    { label: 'γ', symbol: 'γ' },
    { label: 'δ', symbol: 'δ' },
    { label: 'θ', symbol: 'θ' },
    { label: 'λ', symbol: 'λ' },
    { label: 'μ', symbol: 'μ' },
    { label: 'σ', symbol: 'σ' },
    { label: 'Δ', symbol: 'Δ' },
    { label: 'Ω', symbol: 'Ω' },
  ];

  // Configure Quill editor toolbar
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  useEffect(() => {
    try {
      const allSubjects = getSubjects();
      if (allSubjects && allSubjects.length > 0) {
        setSubjects(allSubjects);
      }
      
      // If itemId is in URL, auto-select the appropriate dropdowns
      if (itemIdFromUrl) {
        const parents = findItemParents(itemIdFromUrl);
        if (parents) {
          setSelectedSubject(parents.subject.id);
          setSelectedCategory(parents.category.id);
          setSelectedChapter(parents.chapter.id);
          setSelectedLevel(itemIdFromUrl);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Ensure subjects is at least an empty array to prevent crashes
      setSubjects([]);
    }
  }, [itemIdFromUrl]);

  useEffect(() => {
    try {
      if (selectedLevel) {
        const levelQuestions = getQuestionsByLevel(selectedLevel);
        setQuestions(levelQuestions || []);
      } else {
        // If no level selected, show empty array
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setQuestions([]);
    }
  }, [selectedLevel]);

  // OLD REACTQUILL HANDLER REMOVED - Now using WordLikeEditor which handles its own events
  // The WordLikeEditor component manages its own Quill instance and event handlers

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedCategory('');
    setSelectedChapter('');
    setSelectedLevel('');
    setQuestions([]);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedChapter('');
    setSelectedLevel('');
    setQuestions([]);
  };

  const handleChapterChange = (chapterId) => {
    setSelectedChapter(chapterId);
    setSelectedLevel('');
    setQuestions([]);
  };

  const handleLevelChange = (levelId) => {
    setSelectedLevel(levelId);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(isArabicBrowser() ? 'حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت' : 'Image size too large. Maximum 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setQuestionImage(file);
        setQuestionImagePreview(base64String);
        setImageScale(100); // Reset scale when new image is uploaded
        setFormData({ ...formData, image: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageZoom = (delta) => {
    setImageScale(prev => Math.max(25, Math.min(300, prev + delta)));
  };

  const handleImageReset = () => {
    setImageScale(100);
  };

  const handleImageMaximize = (imageSrc) => {
    setModalImageSrc(imageSrc);
    setShowImageModal(true);
  };

  const handleRemoveImage = () => {
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setFormData({ ...formData, image: null });
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };


  const handleAddNew = () => {
    setEditingQuestion(null);
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setImageScale(100);
    setFormData({
      question: '',
      questionEn: '',
      image: null,
      answers: [
        { id: 'a', text: '', isCorrect: false },
        { id: 'b', text: '', isCorrect: false },
        { id: 'c', text: '', isCorrect: false },
        { id: 'd', text: '', isCorrect: false },
      ],
    });
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    setShowForm(true);
    // Force focus after modal opens
    setTimeout(() => {
      const quillEditor = document.querySelector('.ql-editor');
      if (quillEditor) {
        quillEditor.focus();
      }
    }, 100);
  };

  const handleEdit = (question) => {
    setIsLoadingForm(true);
    setEditingQuestion(question);
    
    // Use setTimeout to show loading state first, then load form
    setTimeout(() => {
      setFormData({
        question: question.question || '',
        questionEn: question.questionEn || '',
        image: question.image || null,
        explanation: question.explanation || '',
        answers: question.answers ? question.answers.map((ans) => ({ id: ans.id, text: ans.text || '', isCorrect: ans.isCorrect || false })) : [
          { id: 'a', text: '', isCorrect: false },
          { id: 'b', text: '', isCorrect: false },
          { id: 'c', text: '', isCorrect: false },
          { id: 'd', text: '', isCorrect: false },
        ],
      });
      if (question.image) {
        setQuestionImagePreview(question.image);
      } else {
        setQuestionImagePreview(null);
      }
      setQuestionImage(null);
      setImageScale(100);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      setShowForm(true);
      
      // Delay to allow form to render before showing editors
      setTimeout(() => {
        setIsLoadingForm(false);
      }, 300);
    }, 100);
  };

  const handleDelete = (questionId) => {
    if (window.confirm(isArabicBrowser() ? 'هل أنت متأكد من حذف هذا السؤال؟' : 'Are you sure?')) {
      deleteQuestion(questionId);
      setQuestions(getQuestionsByLevel(selectedLevel));
    }
  };

  const handleAnswerChange = (index, field, value) => {
    const newAnswers = [...formData.answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setFormData({ ...formData, answers: newAnswers });
  };

  const handleCorrectAnswerChange = (index) => {
    const newAnswers = formData.answers.map((ans, i) => ({
      ...ans,
      isCorrect: i === index,
    }));
    setFormData({ ...formData, answers: newAnswers });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedLevel) {
      alert(isArabicBrowser() ? 'يرجى اختيار المستوى أولاً' : 'Please select a level first');
      return;
    }

    const questionData = {
      ...formData,
      levelId: selectedLevel,
    };

    if (editingQuestion) {
      updateQuestion(editingQuestion.id, questionData);
    } else {
      addQuestion(questionData);
    }

    setQuestions(getQuestionsByLevel(selectedLevel));
    setShowForm(false);
    setEditingQuestion(null);
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setFormData({
      question: '',
      questionEn: '',
      image: null,
      explanation: '',
      answers: [
        { id: 'a', text: '', isCorrect: false },
        { id: 'b', text: '', isCorrect: false },
        { id: 'c', text: '', isCorrect: false },
        { id: 'd', text: '', isCorrect: false },
      ],
    });
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    
    // Navigate back to lessons page if returnUrl is provided and we came from a specific lesson
    // Only navigate if explicitly saving (not on cancel or other actions)
    if (returnUrl && itemIdFromUrl && e.target.type === 'submit') {
      setTimeout(() => {
        navigate(returnUrl);
      }, 500);
    }
  };

  const selectedSubjectObj = subjects && subjects.length > 0 ? subjects.find(s => s.id === selectedSubject) : null;
  const levels = selectedChapter ? (getLevelsByChapter(selectedChapter) || []) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-dark-600">{isArabicBrowser() ? 'إدارة الأسئلة' : 'Manage Questions'}</h1>
          <button
            onClick={() => {
              if (returnUrl) {
                navigate(returnUrl);
              } else {
                navigate('/admin/dashboard');
              }
            }}
            className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
          >
            ← {isArabicBrowser() ? 'رجوع' : 'Back'}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                المادة / Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر المادة / Select Subject</option>
                {subjects && subjects.length > 0 ? (
                  subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))
                ) : (
                  <option disabled>لا توجد مواد / No subjects available</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                التصنيف / Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={!selectedSubject}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر التصنيف / Select Category</option>
                {selectedSubjectObj?.categories?.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                الفصل / Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => handleChapterChange(e.target.value)}
                disabled={!selectedCategory}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر الفصل / Select Chapter</option>
                {getChaptersByCategory(selectedCategory).map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                المستوى / Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => handleLevelChange(e.target.value)}
                disabled={!selectedChapter}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر المستوى / Select Level</option>
                {levels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {!selectedLevel ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-lg text-gray-500 mb-4">
              {isArabicBrowser() 
                ? 'يرجى اختيار المادة، التصنيف، الفصل، والمستوى لعرض الأسئلة' 
                : 'Please select Subject, Category, Chapter, and Level to view questions'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                {isArabicBrowser() ? 'الأسئلة' : 'Questions'} ({questions.length})
              </h2>
              <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleAddNew}
                className="bg-primary-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-primary-600 transition font-medium text-sm sm:text-base w-full sm:w-auto"
              >
                + {isArabicBrowser() ? 'إضافة سؤال جديد' : 'Add Question'}
              </button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg mb-4">{isArabicBrowser() ? 'لا توجد أسئلة لهذا المستوى' : 'No questions for this level'}</p>
                  <button
                    onClick={handleAddNew}
                    className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                  >
                    + {isArabicBrowser() ? 'إضافة سؤال جديد' : 'Add New Question'}
                  </button>
                </div>
              ) : (
                questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-2">
                    <div className="flex-1 w-full sm:w-auto">
                      {/* Question with inline images */}
                      <div className="font-semibold text-sm sm:text-base md:text-lg text-dark-600 mb-2 break-words">
                        <span>{index + 1}. </span>
                        <MathRenderer html={question.question || ''} inline={false} />
                      </div>
                      
                      {/* Separator */}
                      <div className="border-t border-gray-300 my-2"></div>
                      {question.questionEn && (
                        <div className="text-xs sm:text-sm md:text-base text-dark-500 mb-2 break-words" dangerouslySetInnerHTML={{ __html: question.questionEn }} />
                      )}
                      {question.image && (
                        <div className="mt-2">
                          <img
                            src={question.image}
                            alt="Question"
                            className="w-full max-w-md h-auto max-h-48 sm:max-h-64 rounded-lg border object-contain cursor-pointer hover:opacity-90 transition"
                            onClick={() => handleImageMaximize(question.image)}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleEdit(question)}
                        className="flex-1 sm:flex-none bg-yellow-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-yellow-600 text-sm sm:text-base transition"
                      >
                        {isArabicBrowser() ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="flex-1 sm:flex-none bg-red-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-red-600 text-sm sm:text-base transition"
                      >
                        {isArabicBrowser() ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                    {question.answers.map((answer) => (
                      <div
                        key={answer.id}
                        className={`p-2 rounded ${
                          answer.isCorrect ? 'bg-yellow-100 border-2 border-yellow-500' : 'bg-gray-100 border border-gray-300'
                        }`}
                      >
                        <div className="text-dark-600">
                          <MathRenderer html={answer.text} inline={true} />
                        </div>
                        {answer.isCorrect && <span className="text-yellow-500 ml-1 font-bold">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Image Maximize Modal */}
        {showImageModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowImageModal(false)}
          >
            <div className="relative max-w-[95vw] max-h-[95vh] bg-white rounded-lg p-4">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 text-xl font-bold z-10"
              >
                ×
              </button>
              <img
                src={modalImageSrc}
                alt="Full size preview"
                className="max-w-full max-h-[90vh] rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Math Editor Modal */}
        {showMathEditor && (
          <MathEditor
            onInsert={handleInsertMath}
            onClose={() => setShowMathEditor(false)}
          />
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setIsLoadingForm(false);
            }
          }}>
            <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl lg:max-w-4xl w-full max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingQuestion ? 'تعديل سؤال / Edit Question' : 'إضافة سؤال جديد / Add Question'}
                </h2>
                
                {/* Loading State */}
                {isLoadingForm && (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500 mb-4"></div>
                      <p className="text-lg font-medium text-gray-600">
                        {isArabicBrowser() ? 'جاري التحميل...' : 'Loading...'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Form Content - Only show when not loading */}
                {!isLoadingForm && (

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                      السؤال / Question
                    </label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="text-xs md:text-sm text-gray-600 font-medium self-center">
                        {isArabicBrowser() ? 'إدراج أرقام عربية:' : 'Insert Arabic Numbers:'}
                      </span>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => insertArabicNumeral(num)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm md:text-base font-medium transition min-w-[35px]"
                          title={`${isArabicBrowser() ? 'إدراج' : 'Insert'} ${convertToArabicNumerals(String(num))}`}
                        >
                          {convertToArabicNumerals(String(num))}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={convertSelectionToArabic}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs md:text-sm font-medium transition"
                        title={isArabicBrowser() ? 'تحويل الأرقام المحددة إلى أرقام عربية' : 'Convert selected numbers to Arabic'}
                      >
                        {isArabicBrowser() ? 'تحويل المحدد' : 'Convert Selected'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mb-2">
                      {isArabicBrowser() 
                        ? '💡 ملاحظة: استخدم شريط أدوات المعادلات لإدراج المعادلات والرموز الرياضية' 
                        : '💡 Note: Use the equation toolbar to insert equations and math symbols'}
                    </p>
                    
                    {/* Best Working Editor - No waiting, no loading! */}
                    <ErrorBoundary isArabic={isArabicBrowser()}>
                      <SimpleProfessionalMathEditor
                        value={formData.question}
                        onChange={handleQuillChange}
                        placeholder={isArabicBrowser() ? 'اكتب السؤال هنا...' : 'Write question here...'}
                      />
                    </ErrorBoundary>
                  </div>

                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                      شرح الإجابة الصحيحة / Explanation (يظهر عند الإجابة الخاطئة)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      {isArabicBrowser() 
                        ? '💡 أضف شرحاً يساعد الطالب على فهم الإجابة الصحيحة عند الخطأ' 
                        : '💡 Add an explanation to help students understand the correct answer when they make a mistake'}
                    </p>
                    <ErrorBoundary isArabic={isArabicBrowser()}>
                      <SimpleProfessionalMathEditor
                        value={formData.explanation}
                        onChange={(content) => setFormData({ ...formData, explanation: content })}
                        placeholder={isArabicBrowser() ? 'اكتب شرح الإجابة الصحيحة هنا...' : 'Write explanation for the correct answer here...'}
                      />
                    </ErrorBoundary>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-3">
                      الإجابات / Answers (اختر الإجابة الصحيحة / Select Correct Answer)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      {isArabicBrowser() 
                        ? '💡 يمكنك إضافة معادلات رياضية وصور في الإجابات أيضاً!' 
                        : '💡 You can add math equations and images in answers too!'}
                    </p>
                    {formData.answers.map((answer, index) => (
                      <div key={answer.id} className="mb-4 p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center pt-3">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={answer.isCorrect}
                              onChange={() => handleCorrectAnswerChange(index)}
                              className="w-5 h-5 cursor-pointer"
                              title={isArabicBrowser() ? 'اختر كإجابة صحيحة' : 'Select as correct answer'}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                              {isArabicBrowser() ? `الإجابة ${String.fromCharCode(65 + index)}` : `Answer ${String.fromCharCode(65 + index)}`}
                              {answer.isCorrect && (
                                <span className="ml-2 text-green-600 font-bold">✓ {isArabicBrowser() ? 'صحيحة' : 'Correct'}</span>
                              )}
                            </label>
                            <ErrorBoundary isArabic={isArabicBrowser()}>
                              <SimpleProfessionalMathEditor
                                value={answer.text}
                                onChange={(content) => handleAnswerChange(index, 'text', content)}
                                placeholder={isArabicBrowser() ? `اكتب الإجابة ${String.fromCharCode(65 + index)} هنا...` : `Write answer ${String.fromCharCode(65 + index)} here...`}
                              />
                            </ErrorBoundary>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                      >
                        {isArabicBrowser() ? 'حفظ' : 'Save'}
                      </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
                    >
                      {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Questions;


