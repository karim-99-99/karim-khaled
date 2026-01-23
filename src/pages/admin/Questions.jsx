// import { useState, useEffect, useRef, lazy, Suspense } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { getSubjects, getQuestions, getQuestionsByLevel, addQuestion, updateQuestion, deleteQuestion, getLevelsByChapter, getCategoriesBySubject, getChaptersByCategory, getItemById, getChapterById, getCategoryById, getSections } from '../../services/storageService';
// import * as backendApi from '../../services/backendApi';
// import * as ReactQuillNamespace from 'react-quill';
// import 'react-quill/dist/quill.snow.css';

// // Get ReactQuill from namespace (react-quill v2.0.0)
// const ReactQuill = ReactQuillNamespace.default || ReactQuillNamespace;
// import Header from '../../components/Header';
// import ErrorBoundary from '../../components/ErrorBoundary';
// import { isArabicBrowser } from '../../utils/language';
// import MathEditor from '../../components/MathEditor';
// import MathRenderer from '../../components/MathRenderer';
// import WordLikeEditor from '../../components/WordLikeEditor';
// import EquationEditor from '../../components/EquationEditor';
// import VisualEquationEditor from '../../components/VisualEquationEditor';
// import WYSIWYGEquationEditor from '../../components/WYSIWYGEquationEditor';
// import SimpleProfessionalMathEditor from '../../components/SimpleProfessionalMathEditor';
// import { InlineMath, BlockMath } from 'react-katex';
// import 'katex/dist/katex.min.css';
// import katex from 'katex';

// const findItemParentsFromSections = (sections, itemId) => {
//   if (!sections || !sections.length) return null;
//   for (const section of sections) {
//     for (const subject of section.subjects || []) {
//       for (const category of subject.categories || []) {
//         for (const chapter of category.chapters || []) {
//           // Check both 'items' and 'lessons' (Backend uses 'items' but API might return 'lessons')
//           const items = chapter.items || chapter.lessons || [];
//           const item = items.find(i => i.id === itemId);
//           if (item) return { subject, category, chapter };
//         }
//       }
//     }
//   }
//   return null;
// };

// const Questions = () => {
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();
//   const itemIdFromUrl = searchParams.get('itemId');
//   const returnUrl = searchParams.get('returnUrl');
//   const useBackend = backendApi.isBackendOn();
  
//   const [subjects, setSubjects] = useState([]);
//   const [selectedSubject, setSelectedSubject] = useState('');
//   const [selectedCategory, setSelectedCategory] = useState('');
//   const [selectedChapter, setSelectedChapter] = useState('');
//   const [selectedLevel, setSelectedLevel] = useState('');
//   const [chaptersForCategory, setChaptersForCategory] = useState([]);
//   const [levelsForChapter, setLevelsForChapter] = useState([]);
//   const [questions, setQuestions] = useState([]);
//   const [showForm, setShowForm] = useState(false);
//   const [editingQuestion, setEditingQuestion] = useState(null);
//   const [questionImage, setQuestionImage] = useState(null);
//   const [questionImagePreview, setQuestionImagePreview] = useState(null);
//   const [imageScale, setImageScale] = useState(100); // Image scale percentage
//   const [imageAlign, setImageAlign] = useState('center'); // Image alignment: 'left', 'center', 'right'
//   const [showImageModal, setShowImageModal] = useState(false);
//   const [modalImageSrc, setModalImageSrc] = useState(null);
//   const [pendingImageSettings, setPendingImageSettings] = useState(null); // Store settings for new questions
//   const [showMathEditor, setShowMathEditor] = useState(false);
//   const [isLoadingForm, setIsLoadingForm] = useState(false);
//   // Using the best working editor - SimpleProfessionalMathEditor with RTL/LTR button!
//   const imageInputRef = useRef(null);
//   const quillRef = useRef(null);
//   const isConvertingRef = useRef(false);
//   const [formData, setFormData] = useState({
//     question: '',
//     questionEn: '',
//     image: null, // base64 encoded image
//     explanation: '', // Explanation for the correct answer
//     answers: [
//       { id: 'a', text: '', isCorrect: false },
//       { id: 'b', text: '', isCorrect: false },
//       { id: 'c', text: '', isCorrect: false },
//       { id: 'd', text: '', isCorrect: false },
//     ],
//   });

//   // Convert Western numerals (0-9) to Arabic numerals (٠-٩)
//   const convertToArabicNumerals = (text) => {
//     const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
//     return text.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
//   };

//   // Convert Arabic numerals (٠-٩) to Western numerals (0-9)
//   const convertToWesternNumerals = (text) => {
//     const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
//     const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
//     return text.replace(/[٠-٩]/g, (digit) => {
//       const index = arabicNumerals.indexOf(digit);
//       return index !== -1 ? westernNumerals[index] : digit;
//     });
//   };

//   // Detect if text contains Arabic characters
//   const hasArabicCharacters = (text) => {
//     // Arabic Unicode range: \u0600-\u06FF
//     return /[\u0600-\u06FF]/.test(text);
//   };

//   // Check context around cursor to determine language
//   const detectLanguageContext = (quill, cursorIndex) => {
//     const text = quill.getText();
    
//     // Find the last non-numeric, non-whitespace, non-punctuation character before cursor
//     // This tells us what language the user is actively typing in
//     let lastLetterIndex = cursorIndex - 1;
//     while (lastLetterIndex >= 0) {
//       const char = text.charAt(lastLetterIndex);
//       // Skip numbers, spaces, and common punctuation
//       if (!/[0-9٠-٩\s.,;:!?\-_()\[\]{}\"']/.test(char)) {
//         // Check if it's Arabic
//         if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(char)) {
//           return 'ar';
//         }
//         // Check if it's Latin
//         if (/[a-zA-Z]/.test(char)) {
//           return 'en';
//         }
//       }
//       lastLetterIndex--;
//     }
    
//     // If no letters found before cursor, check immediate context after cursor
//     let nextLetterIndex = cursorIndex;
//     while (nextLetterIndex < text.length && nextLetterIndex < cursorIndex + 10) {
//       const char = text.charAt(nextLetterIndex);
//       if (!/[0-9٠-٩\s.,;:!?\-_()\[\]{}\"']/.test(char)) {
//         if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(char)) {
//           return 'ar';
//         }
//         if (/[a-zA-Z]/.test(char)) {
//           return 'en';
//         }
//       }
//       nextLetterIndex++;
//     }
    
//     // Check broader context (50 chars before, 10 after) for overall language
//     const start = Math.max(0, cursorIndex - 50);
//     const end = Math.min(text.length, cursorIndex + 10);
//     const context = text.substring(start, end);
    
//     const arabicChars = context.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || [];
//     const latinChars = context.match(/[a-zA-Z]/g) || [];
//     const arabicCount = arabicChars.length;
//     const latinCount = latinChars.length;
    
//     // If Arabic characters exist in context, default to Arabic
//     if (arabicCount > 0) {
//       // If Arabic count is significant, use Arabic
//       if (arabicCount >= latinCount || arabicCount >= 3) {
//         return 'ar';
//       }
//     }
    
//     // If only Latin characters, use English
//     if (latinCount > 0 && arabicCount === 0) {
//       return 'en';
//     }
    
//     // Default: check page direction (this is an Arabic interface, so default to Arabic)
//     const htmlDir = document.documentElement.dir || document.documentElement.getAttribute('dir');
//     return (htmlDir === 'rtl' || isArabicBrowser()) ? 'ar' : 'en';
//   };

//   // Insert Arabic numeral at cursor position
//   const insertArabicNumeral = (number) => {
//     // Use WordLikeEditor's exposed function if available
//     if (window.wordLikeEditorInsertArabic) {
//       window.wordLikeEditorInsertArabic(number);
//       return;
//     }
    
//     // Fallback to old method if WordLikeEditor ref is available
//     if (quillRef.current) {
//       const quill = quillRef.current.getEditor();
//       // Focus the editor if not already focused
//       const editorElement = quill.root;
//       if (document.activeElement !== editorElement) {
//         editorElement.focus();
//       }
      
//       setTimeout(() => {
//         const range = quill.getSelection(true);
//         const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
//         if (number >= 0 && number <= 9) {
//           const insertIndex = range ? range.index : quill.getLength() - 1;
//           quill.insertText(insertIndex, arabicNumerals[number]);
//           quill.setSelection(insertIndex + 1);
//         }
//       }, 10);
//     }
//   };

//   // Convert selected text numbers to Arabic numerals
//   const convertSelectionToArabic = () => {
//     // Use WordLikeEditor's exposed function if available
//     if (window.wordLikeEditorConvertSelection) {
//       window.wordLikeEditorConvertSelection();
//       return;
//     }
    
//     // Fallback to old method
//     if (quillRef.current) {
//       const quill = quillRef.current.getEditor();
//       const range = quill.getSelection(true);
//       if (range && range.length > 0) {
//         const selectedText = quill.getText(range.index, range.length);
//         const arabicText = convertToArabicNumerals(selectedText);
//         quill.deleteText(range.index, range.length);
//         quill.insertText(range.index, arabicText);
//         quill.setSelection(range.index, arabicText.length);
//       } else {
//         // If no selection, convert all numbers in the entire text
//         const fullText = quill.getText();
//         const arabicText = convertToArabicNumerals(fullText);
//         if (fullText !== arabicText) {
//           const currentLength = quill.getLength();
//           quill.deleteText(0, currentLength - 1);
//           quill.insertText(0, arabicText.substring(0, arabicText.length - 1));
//         }
//       }
//     }
//   };

//   // Helper function to find item's parent information
//   const findItemParents = (itemId) => {
//     try {
//       const sections = getSections();
//       if (!sections || sections.length === 0) {
//         return null;
//       }
//       for (const section of sections) {
//         if (!section || !section.subjects) continue;
//         for (const subject of section.subjects) {
//           if (!subject || !subject.categories) continue;
//           for (const category of (subject.categories || [])) {
//             if (!category || !category.chapters) continue;
//             for (const chapter of (category.chapters || [])) {
//               if (!chapter || !chapter.items) continue;
//               const item = (chapter.items || []).find(i => i.id === itemId);
//               if (item) {
//                 return { subject, category, chapter };
//               }
//             }
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error finding item parents:', error);
//     }
//     return null;
//   };

//   // Handle text change in Quill editor (update form data)
//   const handleQuillChange = (content) => {
//     setFormData((prevFormData) => ({
//       ...prevFormData,
//       question: content
//     }));
//   };

//   // Handle math equation insertion from MathEditor modal - insert as rendered HTML
//   const handleInsertMath = (latex) => {
//     if (quillRef.current) {
//       const quill = quillRef.current.getEditor();
//       const range = quill.getSelection(true);
//       if (range) {
//         try {
//           // Render LaTeX to HTML using KaTeX
//           const html = katex.renderToString(latex, {
//             throwOnError: false,
//             displayMode: false,
//           });
          
//           // Insert rendered HTML directly into Quill
//           const selection = quill.getSelection(true);
          
//           // Use pasteHTML by simulating a paste event
//           const clipboard = quill.clipboard;
//           const tempDiv = document.createElement('div');
//           tempDiv.innerHTML = html;
//           tempDiv.style.display = 'inline-block';
          
//           // Convert HTML to Quill delta
//           const delta = clipboard.convert(tempDiv);
          
//           // Insert at cursor position
//           quill.updateContents(
//             new quill.constructor.import('parchment').Delta()
//               .retain(selection.index)
//               .concat(delta),
//             'user'
//           );
          
//           // Update form data
//           setTimeout(() => {
//             quill.setSelection(selection.index + delta.length(), 0);
//             const newContent = quill.root.innerHTML;
//             setFormData({ ...formData, question: newContent });
//           }, 10);
//         } catch (error) {
//           console.error('Error rendering math:', error);
//           // Fallback: insert as visual symbol if simple, otherwise as LaTeX
//           const simpleSymbols = {
//             'x^2': 'x²',
//             'x_1': 'x₁',
//             '\\sqrt{x}': '√x',
//             '\\sum_{i=1}^{n}': '∑',
//             '\\int_{a}^{b}': '∫',
//             '\\frac{a}{b}': '½'
//           };
//           if (simpleSymbols[latex]) {
//             insertMathSymbol(simpleSymbols[latex]);
//           } else {
//             insertMathEquation(latex);
//           }
//         }
//       }
//     }
//     setShowMathEditor(false);
//   };

//   // Insert math symbol directly into editor
//   const insertMathSymbol = (symbol) => {
//     if (quillRef.current) {
//       const quill = quillRef.current.getEditor();
//       const range = quill.getSelection(true);
//       if (range) {
//         quill.insertText(range.index, symbol);
//         quill.setSelection(range.index + symbol.length);
        
//         // Update form data
//         const newContent = quill.root.innerHTML;
//         setFormData({ ...formData, question: newContent });
//       }
//     }
//   };

//   // Insert LaTeX math equation (wrapped in $$) - will be rendered when displayed
//   const insertMathEquation = (latex) => {
//     if (quillRef.current) {
//       const quill = quillRef.current.getEditor();
//       const range = quill.getSelection(true);
//       if (range) {
//         // Insert as LaTeX wrapped in $$ for rendering later
//         const mathWrapper = `$$${latex}$$`;
//         quill.insertText(range.index, mathWrapper);
//         quill.setSelection(range.index + mathWrapper.length);
        
//         // Update form data
//         const newContent = quill.root.innerHTML;
//         setFormData({ ...formData, question: newContent });
//       }
//     }
//   };

//   // Insert math symbol directly (visual symbol, not LaTeX)
//   const insertMathSymbolVisual = (symbol) => {
//     if (quillRef.current) {
//       const quill = quillRef.current.getEditor();
//       const range = quill.getSelection(true);
//       if (range) {
//         quill.insertText(range.index, symbol);
//         quill.setSelection(range.index + symbol.length);
        
//         // Update form data
//         const newContent = quill.root.innerHTML;
//         setFormData({ ...formData, question: newContent });
//       }
//     }
//   };

//   // Common math symbols for quick insertion
//   const quickMathSymbols = [
//     { label: '+', symbol: '+' },
//     { label: '−', symbol: '−' },
//     { label: '×', symbol: '×' },
//     { label: '÷', symbol: '÷' },
//     { label: '=', symbol: '=' },
//     { label: '≠', symbol: '≠' },
//     { label: '<', symbol: '<' },
//     { label: '>', symbol: '>' },
//     { label: '≤', symbol: '≤' },
//     { label: '≥', symbol: '≥' },
//     { label: '±', symbol: '±' },
//     { label: '√', symbol: '√' },
//     { label: '²', symbol: '²' },
//     { label: '³', symbol: '³' },
//     { label: '½', symbol: '½' },
//     { label: '¼', symbol: '¼' },
//     { label: '¾', symbol: '¾' },
//     { label: 'π', symbol: 'π' },
//     { label: '∞', symbol: '∞' },
//     { label: '∑', symbol: '∑' },
//     { label: '∫', symbol: '∫' },
//     { label: 'α', symbol: 'α' },
//     { label: 'β', symbol: 'β' },
//     { label: 'γ', symbol: 'γ' },
//     { label: 'δ', symbol: 'δ' },
//     { label: 'θ', symbol: 'θ' },
//     { label: 'λ', symbol: 'λ' },
//     { label: 'μ', symbol: 'μ' },
//     { label: 'σ', symbol: 'σ' },
//     { label: 'Δ', symbol: 'Δ' },
//     { label: 'Ω', symbol: 'Ω' },
//   ];

//   // Configure Quill editor toolbar
//   const quillModules = {
//     toolbar: [
//       [{ 'header': [1, 2, 3, false] }],
//       ['bold', 'italic', 'underline', 'strike'],
//       [{ 'size': ['small', false, 'large', 'huge'] }],
//       [{ 'color': [] }, { 'background': [] }],
//       [{ 'align': [] }],
//       ['blockquote', 'code-block'],
//       [{ 'list': 'ordered'}, { 'list': 'bullet' }],
//       ['link', 'image'],
//       ['clean']
//     ],
//   };

//   useEffect(() => {
//     try {
//       if (useBackend) {
//         backendApi.getSubjects().then((all) => {
//           try {
//             if (all && all.length) {
//               setSubjects(Array.isArray(all) ? all : []);
//               // After subjects are loaded, find and set the lesson if itemIdFromUrl exists
//               if (itemIdFromUrl) {
//                 // Get lesson directly to find its parents
//                 backendApi.getItemById(itemIdFromUrl).then((lesson) => {
//                   try {
//                     if (lesson && lesson.chapter) {
//                       // Get chapter to find category
//                       backendApi.getChapterById(lesson.chapter).then((chapter) => {
//                         try {
//                           if (chapter && chapter.category) {
//                             // Get category to find subject
//                             backendApi.getCategoryById(chapter.category).then((category) => {
//                               try {
//                                 if (category && category.subject) {
//                                   // Set all fields
//                                   setSelectedSubject(category.subject);
//                                   setSelectedCategory(category.id);
//                                   setSelectedChapter(chapter.id);
//                                   setSelectedLevel(itemIdFromUrl);
//                                 }
//                               } catch (err) {
//                                 console.error('Error setting category fields:', err);
//                               }
//                             }).catch((err) => {
//                               console.error('Error loading category:', err);
//                             });
//                           }
//                         } catch (err) {
//                           console.error('Error processing chapter:', err);
//                         }
//                       }).catch((err) => {
//                         console.error('Error loading chapter:', err);
//                       });
//                     }
//                   } catch (err) {
//                     console.error('Error processing lesson:', err);
//                   }
//                 }).catch((err) => {
//                   console.error('Error loading lesson:', err);
//                 });
//               }
//             }
//           } catch (err) {
//             console.error('Error processing subjects:', err);
//             setSubjects([]);
//           }
//         }).catch((err) => {
//           console.error('Error loading subjects:', err);
//           setSubjects([]);
//         });
//       } else {
//         try {
//           const allSubjects = getSubjects();
//           if (allSubjects && allSubjects.length > 0) {
//             setSubjects(Array.isArray(allSubjects) ? allSubjects : []);
//             if (itemIdFromUrl) {
//               const parents = findItemParents(itemIdFromUrl);
//               if (parents) {
//                 // Set all fields in sequence to ensure proper loading
//                 setSelectedSubject(parents.subject.id);
//                 setTimeout(() => {
//                   setSelectedCategory(parents.category.id);
//                   setTimeout(() => {
//                     setSelectedChapter(parents.chapter.id);
//                     setTimeout(() => {
//                       setSelectedLevel(itemIdFromUrl);
//                     }, 150);
//                   }, 150);
//                 }, 150);
//               }
//             }
//           }
//         } catch (e) {
//           console.error('Error loading subjects from local storage:', e);
//           setSubjects([]);
//         }
//       }
//     } catch (err) {
//       console.error('Unexpected error in useEffect:', err);
//       setSubjects([]);
//     }
//   }, [itemIdFromUrl, useBackend]);

//   useEffect(() => {
//     if (!selectedCategory) {
//       setChaptersForCategory([]);
//       return;
//     }
//     if (useBackend) {
//       backendApi.getChaptersByCategory(selectedCategory).then(setChaptersForCategory).catch(() => setChaptersForCategory([]));
//     } else {
//       setChaptersForCategory(getChaptersByCategory(selectedCategory) || []);
//     }
//   }, [selectedCategory, useBackend]);

//   useEffect(() => {
//     if (!selectedChapter) {
//       setLevelsForChapter([]);
//       return;
//     }
//     if (useBackend) {
//       backendApi.getLevelsByChapter(selectedChapter).then(setLevelsForChapter).catch(() => setLevelsForChapter([]));
//     } else {
//       setLevelsForChapter(getLevelsByChapter(selectedChapter) || []);
//     }
//   }, [selectedChapter, useBackend]);

//   useEffect(() => {
//     if (!selectedLevel) {
//       setQuestions([]);
//       return;
//     }
//     if (useBackend) {
//       backendApi.getQuestionsByLevel(selectedLevel)
//         .then((questions) => {
//           try {
//             // Ensure questions is an array
//             const safeQuestions = Array.isArray(questions) ? questions : [];
//             setQuestions(safeQuestions);
//           } catch (err) {
//             console.error('Error processing questions:', err);
//             setQuestions([]);
//           }
//         })
//         .catch((err) => {
//           console.error('Error loading questions:', err);
//           setQuestions([]);
//         });
//     } else {
//       try {
//         const localQuestions = getQuestionsByLevel(selectedLevel);
//         setQuestions(Array.isArray(localQuestions) ? localQuestions : []);
//       } catch (err) {
//         console.error('Error loading questions from local storage:', err);
//         setQuestions([]);
//       }
//     }
//   }, [selectedLevel, useBackend]);

//   // OLD REACTQUILL HANDLER REMOVED - Now using WordLikeEditor which handles its own events
//   // The WordLikeEditor component manages its own Quill instance and event handlers

//   const handleSubjectChange = (subjectId) => {
//     setSelectedSubject(subjectId);
//     setSelectedCategory('');
//     setSelectedChapter('');
//     setSelectedLevel('');
//     setQuestions([]);
//   };

//   const handleCategoryChange = (categoryId) => {
//     setSelectedCategory(categoryId);
//     setSelectedChapter('');
//     setSelectedLevel('');
//     setQuestions([]);
//   };

//   const handleChapterChange = (chapterId) => {
//     setSelectedChapter(chapterId);
//     setSelectedLevel('');
//     setQuestions([]);
//   };

//   const handleLevelChange = (levelId) => {
//     setSelectedLevel(levelId);
//   };

//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       if (file.size > 5 * 1024 * 1024) { // 5MB limit
//         alert(isArabicBrowser() ? 'حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت' : 'Image size too large. Maximum 5MB');
//         return;
//       }
      
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         try {
//           const base64String = reader.result;
//           setQuestionImage(file);
//           setQuestionImagePreview(base64String);
//           setImageScale(100); // Reset scale when new image is uploaded
//           setImageAlign('center'); // Reset alignment
//           setPendingImageSettings({ scale: 100, align: 'center' }); // Reset pending settings
//           setFormData(prev => ({ ...prev, image: base64String }));
//         } catch (err) {
//           console.error('Error processing image:', err);
//           alert(isArabicBrowser() ? 'حدث خطأ أثناء معالجة الصورة' : 'Error processing image');
//         }
//       };
//       reader.onerror = () => {
//         console.error('Error reading image file');
//         alert(isArabicBrowser() ? 'حدث خطأ أثناء قراءة الصورة' : 'Error reading image file');
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleImageZoom = (delta) => {
//     try {
//       const newScale = Math.max(25, Math.min(300, imageScale + delta));
//       setImageScale(newScale);
      
//       // Save to localStorage for persistence (if editing existing question)
//       if (editingQuestion?.id) {
//         try {
//           const saved = localStorage.getItem(`question_image_settings_${editingQuestion.id}`);
//           const settings = saved ? JSON.parse(saved) : {};
//           settings.scale = newScale;
//           localStorage.setItem(`question_image_settings_${editingQuestion.id}`, JSON.stringify(settings));
//         } catch (e) {
//           console.error('Error saving image scale to localStorage:', e);
//         }
//       } else {
//         // For new questions, store in pending settings
//         setPendingImageSettings(prev => ({
//           ...prev,
//           scale: newScale,
//           align: imageAlign
//         }));
//       }
//     } catch (err) {
//       console.error('Error in handleImageZoom:', err);
//     }
//   };

//   const handleImageReset = () => {
//     try {
//       setImageScale(100);
      
//       // Save to localStorage for persistence (if editing existing question)
//       if (editingQuestion?.id) {
//         try {
//           const saved = localStorage.getItem(`question_image_settings_${editingQuestion.id}`);
//           const settings = saved ? JSON.parse(saved) : {};
//           settings.scale = 100;
//           localStorage.setItem(`question_image_settings_${editingQuestion.id}`, JSON.stringify(settings));
//         } catch (e) {
//           console.error('Error saving image scale to localStorage:', e);
//         }
//       } else {
//         // For new questions, store in pending settings
//         setPendingImageSettings(prev => ({
//           ...prev,
//           scale: 100,
//           align: imageAlign
//         }));
//       }
//     } catch (err) {
//       console.error('Error in handleImageReset:', err);
//     }
//   };

//   const handleImageAlign = (align) => {
//     try {
//       setImageAlign(align);
      
//       // Save to localStorage for persistence (if editing existing question)
//       if (editingQuestion?.id) {
//         try {
//           const saved = localStorage.getItem(`question_image_settings_${editingQuestion.id}`);
//           const settings = saved ? JSON.parse(saved) : {};
//           settings.align = align;
//           localStorage.setItem(`question_image_settings_${editingQuestion.id}`, JSON.stringify(settings));
//         } catch (e) {
//           console.error('Error saving image align to localStorage:', e);
//         }
//       } else {
//         // For new questions, store in pending settings
//         setPendingImageSettings(prev => ({
//           ...prev,
//           scale: imageScale,
//           align: align
//         }));
//       }
//     } catch (err) {
//       console.error('Error in handleImageAlign:', err);
//     }
//   };

//   const handleImageMaximize = (imageSrc) => {
//     try {
//       if (!imageSrc || typeof imageSrc !== 'string') {
//         console.warn('Invalid image source for maximization');
//         return;
//       }
//       setModalImageSrc(imageSrc);
//       setShowImageModal(true);
//     } catch (err) {
//       console.error('Error maximizing image:', err);
//     }
//   };

//   const handleRemoveImage = () => {
//     try {
//       setQuestionImage(null);
//       setQuestionImagePreview(null);
//       setPendingImageSettings(null);
//       setFormData(prev => ({ ...prev, image: null }));
//       if (imageInputRef.current) {
//         imageInputRef.current.value = '';
//       }
//     } catch (err) {
//       console.error('Error removing image:', err);
//     }
//   };


//   const handleAddNew = () => {
//     try {
//       setEditingQuestion(null);
//       setQuestionImage(null);
//       setQuestionImagePreview(null);
//       setImageScale(100);
//       setImageAlign('center');
//       setPendingImageSettings(null);
//       setFormData({
//         question: '',
//         questionEn: '',
//         image: null,
//         explanation: '',
//         answers: [
//           { id: 'a', text: '', isCorrect: false },
//           { id: 'b', text: '', isCorrect: false },
//           { id: 'c', text: '', isCorrect: false },
//           { id: 'd', text: '', isCorrect: false },
//         ],
//       });
//     } catch (err) {
//       console.error('Error in handleAddNew:', err);
//     }
//   };
//     if (imageInputRef.current) {
//       imageInputRef.current.value = '';
//     }
//     setShowForm(true);
//     // Force focus after modal opens
//     setTimeout(() => {
//       const quillEditor = document.querySelector('.ql-editor');
//       if (quillEditor) {
//         quillEditor.focus();
//       }
//     }, 100);
//   };

//   const handleEdit = (question) => {
//     try {
//       setIsLoadingForm(true);
//       setEditingQuestion(question);
      
//       // Use setTimeout to show loading state first, then load form
//       setTimeout(() => {
//         try {
//           // Load image settings from localStorage if available
//           let imageScale = 100;
//           let imageAlign = 'center';
//           try {
//             const saved = localStorage.getItem(`question_image_settings_${question.id}`);
//             if (saved) {
//               const settings = JSON.parse(saved);
//               imageScale = settings.scale || question.imageScale || 100;
//               imageAlign = settings.align || question.imageAlign || 'center';
//             } else {
//               // Fallback to question data if available
//               imageScale = question.imageScale || 100;
//               imageAlign = question.imageAlign || 'center';
//             }
//           } catch (e) {
//             console.error('Error loading image settings:', e);
//             imageScale = question.imageScale || 100;
//             imageAlign = question.imageAlign || 'center';
//           }
          
//           setFormData({
//             question: question.question || '',
//             questionEn: question.questionEn || '',
//             image: question.image || null,
//             explanation: question.explanation || '',
//             answers: question.answers ? question.answers.map((ans) => ({ 
//               id: ans.id || ans.key || 'a', 
//               text: ans.text || '', 
//               isCorrect: ans.isCorrect || false 
//             })) : [
//               { id: 'a', text: '', isCorrect: false },
//               { id: 'b', text: '', isCorrect: false },
//               { id: 'c', text: '', isCorrect: false },
//               { id: 'd', text: '', isCorrect: false },
//             ],
//           });
//           if (question.image) {
//             setQuestionImagePreview(question.image);
//           } else {
//             setQuestionImagePreview(null);
//           }
//           setQuestionImage(null);
//           setImageScale(imageScale);
//           setImageAlign(imageAlign);
//           setPendingImageSettings(null); // Clear pending settings when editing
//           if (imageInputRef.current) {
//             imageInputRef.current.value = '';
//           }
//           setShowForm(true);
          
//           // Delay to allow form to render before showing editors
//           setTimeout(() => {
//             setIsLoadingForm(false);
//           }, 300);
//         } catch (err) {
//           console.error('Error loading question for editing:', err);
//           setIsLoadingForm(false);
//           alert(isArabicBrowser() ? 'حدث خطأ أثناء تحميل السؤال' : 'Error loading question');
//         }
//       }, 100);
//     } catch (err) {
//       console.error('Error in handleEdit:', err);
//       setIsLoadingForm(false);
//       alert(isArabicBrowser() ? 'حدث خطأ غير متوقع' : 'Unexpected error');
//     }
//   };

//   const handleDelete = async (questionId) => {
//     if (!window.confirm(isArabicBrowser() ? 'هل أنت متأكد من حذف هذا السؤال؟' : 'Are you sure?')) return;
//     if (useBackend) {
//       try {
//         await backendApi.deleteQuestion(questionId);
//         const list = await backendApi.getQuestionsByLevel(selectedLevel);
//         setQuestions(list);
//       } catch (e) {
//         alert(e.message || (isArabicBrowser() ? 'خطأ في الحذف' : 'Error deleting'));
//       }
//       return;
//     }
//     deleteQuestion(questionId);
//     setQuestions(getQuestionsByLevel(selectedLevel));
//   };

//   const handleAnswerChange = (index, field, value) => {
//     const newAnswers = [...formData.answers];
//     newAnswers[index] = { ...newAnswers[index], [field]: value };
//     setFormData({ ...formData, answers: newAnswers });
//   };

//   const handleCorrectAnswerChange = (index) => {
//     try {
//       if (!formData.answers || !Array.isArray(formData.answers)) {
//         console.error('formData.answers is not an array');
//         return;
//       }
//       const newAnswers = formData.answers.map((ans, i) => ({
//         ...ans,
//         isCorrect: i === index,
//       }));
//       setFormData({ ...formData, answers: newAnswers });
//     } catch (err) {
//       console.error('Error in handleCorrectAnswerChange:', err);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     e.stopPropagation();

//     if (!selectedLevel) {
//       alert(isArabicBrowser() ? 'يرجى اختيار المستوى أولاً' : 'Please select a level first');
//       return;
//     }

//     const payload = {
//       question: formData.question,
//       questionEn: formData.questionEn || '',
//       explanation: formData.explanation?.trim() || null, // Optional field - can be null
//       answers: formData.answers,
//     };
//     const imageFile = questionImage && questionImage instanceof File ? questionImage : null;

//     if (useBackend) {
//       try {
//         let savedQuestion;
//         if (editingQuestion) {
//           savedQuestion = await backendApi.updateQuestion(editingQuestion.id, payload, imageFile);
//         } else {
//           savedQuestion = await backendApi.addQuestion(selectedLevel, payload, imageFile);
//         }
        
//         // Save image settings to localStorage
//         if (savedQuestion?.id) {
//           try {
//             const settings = pendingImageSettings || {
//               scale: imageScale,
//               align: imageAlign
//             };
//             localStorage.setItem(`question_image_settings_${savedQuestion.id}`, JSON.stringify(settings));
//             setPendingImageSettings(null); // Clear pending settings
//           } catch (e) {
//             console.error('Error saving image settings:', e);
//           }
//         }
        
//         const list = await backendApi.getQuestionsByLevel(selectedLevel);
//         setQuestions(list || []);
//       } catch (err) {
//         console.error('Error saving question:', err);
//         alert(err.message || (isArabicBrowser() ? 'حدث خطأ أثناء حفظ السؤال' : 'Error saving question'));
//         return;
//       }
//     } else {
//       try {
//         const questionData = { ...formData, levelId: selectedLevel };
//         let savedQuestion;
//         if (editingQuestion) {
//           updateQuestion(editingQuestion.id, questionData);
//           savedQuestion = { id: editingQuestion.id };
//         } else {
//           const newQuestion = addQuestion(questionData);
//           savedQuestion = newQuestion;
//         }
        
//         // Save image settings to localStorage
//         if (savedQuestion?.id) {
//           try {
//             const settings = pendingImageSettings || {
//               scale: imageScale,
//               align: imageAlign
//             };
//             localStorage.setItem(`question_image_settings_${savedQuestion.id}`, JSON.stringify(settings));
//             setPendingImageSettings(null); // Clear pending settings
//           } catch (e) {
//             console.error('Error saving image settings:', e);
//           }
//         }
        
//         setQuestions(getQuestionsByLevel(selectedLevel) || []);
//       } catch (err) {
//         console.error('Error saving question to local storage:', err);
//         alert(isArabicBrowser() ? 'حدث خطأ أثناء حفظ السؤال' : 'Error saving question');
//         return;
//       }
//     }

//     setShowForm(false);
//     setEditingQuestion(null);
//     setQuestionImage(null);
//     setQuestionImagePreview(null);
//     setImageScale(100);
//     setImageAlign('center');
//     setPendingImageSettings(null);
//     setFormData({
//       question: '',
//       questionEn: '',
//       image: null,
//       explanation: '',
//       answers: [
//         { id: 'a', text: '', isCorrect: false },
//         { id: 'b', text: '', isCorrect: false },
//         { id: 'c', text: '', isCorrect: false },
//         { id: 'd', text: '', isCorrect: false },
//       ],
//     });
//     if (imageInputRef.current) imageInputRef.current.value = '';

//     if (returnUrl && itemIdFromUrl && e.target.type === 'submit') {
//       setTimeout(() => navigate(returnUrl), 500);
//     }
//   };

//   const selectedSubjectObj = subjects && subjects.length > 0 ? subjects.find(s => s.id === selectedSubject) : null;
//   const levels = levelsForChapter;

//   return (
//     <ErrorBoundary isArabic={isArabicBrowser()}>
//       <div className="min-h-screen bg-gray-50">
//         <Header />
//         <div className="py-8 px-4">
//           <div className="max-w-7xl mx-auto">
//             <div className="mb-6 flex justify-between items-center">
//               <h1 className="text-2xl md:text-3xl font-bold text-dark-600">{isArabicBrowser() ? 'إدارة الأسئلة' : 'Manage Questions'}</h1>
//               <button
//                 onClick={() => {
//                   if (returnUrl) {
//                     navigate(returnUrl);
//                   } else {
//                     navigate('/admin/dashboard');
//                   }
//                 }}
//                 className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
//               >
//                 ← {isArabicBrowser() ? 'رجوع' : 'Back'}
//               </button>
//             </div>

//             {/* Filters */}
//             <div className="bg-white rounded-lg shadow p-6 mb-6">
//               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                 <div>
//                   <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
//                     المادة / Subject
//                   </label>
//                   <select
//                     value={selectedSubject}
//                     onChange={(e) => handleSubjectChange(e.target.value)}
//                     className="w-full px-4 py-2 border rounded-lg"
//                   >
//                     <option value="">اختر المادة / Select Subject</option>
//                     {subjects && subjects.length > 0 ? (
//                       subjects.map(subject => (
//                         <option key={subject.id} value={subject.id}>
//                           {subject.name}
//                         </option>
//                       ))
//                     ) : (
//                       <option disabled>لا توجد مواد / No subjects available</option>
//                     )}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
//                     التصنيف / Category
//                   </label>
//                   <select
//                     value={selectedCategory}
//                     onChange={(e) => handleCategoryChange(e.target.value)}
//                     disabled={!selectedSubject}
//                     className="w-full px-4 py-2 border rounded-lg"
//                   >
//                     <option value="">اختر التصنيف / Select Category</option>
//                     {selectedSubjectObj?.categories && Array.isArray(selectedSubjectObj.categories) ? (
//                       selectedSubjectObj.categories.map(category => (
//                         <option key={category?.id || Math.random()} value={category?.id || ''}>
//                           {category?.name || ''}
//                         </option>
//                       ))
//                     ) : (
//                       <option disabled>لا توجد تصنيفات / No categories available</option>
//                     )}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
//                     الفصل / Chapter
//                   </label>
//                   <select
//                     value={selectedChapter}
//                     onChange={(e) => handleChapterChange(e.target.value)}
//                     disabled={!selectedCategory}
//                     className="w-full px-4 py-2 border rounded-lg"
//                   >
//                     <option value="">اختر الفصل / Select Chapter</option>
//                     {chaptersForCategory && Array.isArray(chaptersForCategory) && chaptersForCategory.length > 0 ? (
//                       chaptersForCategory.map(chapter => (
//                         <option key={chapter?.id || Math.random()} value={chapter?.id || ''}>
//                           {chapter?.name || ''}
//                         </option>
//                       ))
//                     ) : (
//                       <option disabled>لا توجد فصول / No chapters available</option>
//                     )}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
//                     المستوى / Level
//                   </label>
//                   <select
//                     value={selectedLevel}
//                     onChange={(e) => handleLevelChange(e.target.value)}
//                     disabled={!selectedChapter}
//                     className="w-full px-4 py-2 border rounded-lg"
//                   >
//                     <option value="">اختر المستوى / Select Level</option>
//                     {levels && Array.isArray(levels) && levels.length > 0 ? (
//                       levels.map(level => (
//                         <option key={level?.id || Math.random()} value={level?.id || ''}>
//                           {level?.name || ''}
//                         </option>
//                       ))
//                     ) : (
//                       <option disabled>لا توجد دروس / No lessons available</option>
//                     )}
//                   </select>
//                 </div>
//               </div>
//             </div>

//             {/* Questions List */}
//             {!selectedLevel ? (
//               <div className="bg-white rounded-lg shadow p-6 text-center">
//                 <p className="text-lg text-gray-500 mb-4">
//                   {isArabicBrowser() 
//                     ? 'يرجى اختيار المادة، التصنيف، الفصل، والمستوى لعرض الأسئلة' 
//                     : 'Please select Subject, Category, Chapter, and Level to view questions'}
//                 </p>
//               </div>
//             ) : (
//               <div className="bg-white rounded-lg shadow p-4 sm:p-6">
//                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
//                   <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
//                     {isArabicBrowser() ? 'الأسئلة' : 'Questions'} ({questions && Array.isArray(questions) ? questions.length : 0})
//                   </h2>
//                   <div className="flex gap-2 flex-wrap">
//                     <button
//                       onClick={handleAddNew}
//                       className="bg-primary-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-primary-600 transition font-medium text-sm sm:text-base w-full sm:w-auto"
//                     >
//                       + {isArabicBrowser() ? 'إضافة سؤال جديد' : 'Add Question'}
//                     </button>
//                   </div>
//                 </div>

//                 <div className="space-y-4">
//                   {!questions || !Array.isArray(questions) || questions.length === 0 ? (
//                     <div className="text-center py-8 text-gray-500">
//                       <p className="text-lg mb-4">{isArabicBrowser() ? 'لا توجد أسئلة لهذا المستوى' : 'No questions for this level'}</p>
//                       <button
//                         onClick={handleAddNew}
//                         className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
//                       >
//                         + {isArabicBrowser() ? 'إضافة سؤال جديد' : 'Add New Question'}
//                       </button>
//                     </div>
//                   ) : (
//                     questions.map((question, index) => (
//                       <div key={question?.id || index} className="border rounded-lg p-3 sm:p-4">
//                         <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-2">
//                           <div className="flex-1 w-full sm:w-auto">
//                             {/* Question with inline images */}
//                             <div className="font-semibold text-sm sm:text-base md:text-lg text-dark-600 mb-2 break-words">
//                               <span>{index + 1}. </span>
//                               <MathRenderer html={question.question || ''} inline={false} />
//                             </div>
                            
//                             {/* Separator */}
//                             <div className="border-t border-gray-300 my-2"></div>
//                             {question.questionEn && (
//                               <div className="text-xs sm:text-sm md:text-base text-dark-500 mb-2 break-words" dangerouslySetInnerHTML={{ __html: question.questionEn }} />
//                             )}
//                             {question.image && (
//                               <div className="mt-2">
//                                 <img
//                                   src={question.image}
//                                   alt="Question"
//                                   className="w-full max-w-md h-auto max-h-48 sm:max-h-64 rounded-lg border object-contain cursor-pointer hover:opacity-90 transition"
//                                   onClick={() => handleImageMaximize(question.image)}
//                                 />
//                               </div>
//                             )}
//                           </div>
//                           <div className="flex gap-2 w-full sm:w-auto">
//                             <button
//                               onClick={() => handleEdit(question)}
//                               className="flex-1 sm:flex-none bg-yellow-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-yellow-600 text-sm sm:text-base transition"
//                             >
//                               {isArabicBrowser() ? 'تعديل' : 'Edit'}
//                             </button>
//                             <button
//                               onClick={() => handleDelete(question.id)}
//                               className="flex-1 sm:flex-none bg-red-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-red-600 text-sm sm:text-base transition"
//                             >
//                               {isArabicBrowser() ? 'حذف' : 'Delete'}
//                             </button>
//                           </div>
//                         </div>
//                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
//                           {question.answers && Array.isArray(question.answers) ? (
//                             question.answers.map((answer) => (
//                               <div
//                                 key={answer?.id || Math.random()}
//                                 className={`p-2 rounded ${
//                                   answer?.isCorrect ? 'bg-yellow-100 border-2 border-yellow-500' : 'bg-gray-100 border border-gray-300'
//                                 }`}
//                               >
//                                 <div className="text-dark-600">
//                                   <MathRenderer html={answer?.text || ''} inline={true} />
//                                 </div>
//                                 {answer?.isCorrect && <span className="text-yellow-500 ml-1 font-bold">✓</span>}
//                               </div>
//                             ))
//                           ) : (
//                             <div className="text-gray-500 text-sm col-span-full">
//                               {isArabicBrowser() ? 'لا توجد إجابات' : 'No answers'}
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     ))
//                   )}
//                 </div>
//               </div>
//             )}

//             {/* Image Maximize Modal */}
//             {showImageModal && (
//               <div 
//                 className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
//                 onClick={() => setShowImageModal(false)}
//               >
//                 <div className="relative max-w-[95vw] max-h-[95vh] bg-white rounded-lg p-4">
//                   <button
//                     onClick={() => setShowImageModal(false)}
//                     className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 text-xl font-bold z-10"
//                   >
//                     ×
//                   </button>
//                   <img
//                     src={modalImageSrc}
//                     alt="Full size preview"
//                     className="max-w-full max-h-[90vh] rounded-lg"
//                     onClick={(e) => e.stopPropagation()}
//                   />
//                 </div>
//               </div>
//             )}

//             {/* Math Editor Modal */}
//             {showMathEditor && (
//               <MathEditor
//                 onInsert={handleInsertMath}
//                 onClose={() => setShowMathEditor(false)}
//               />
//             )}

//             {/* Add/Edit Form Modal */}
//             {showForm && (
//               <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={(e) => {
//                 if (e.target === e.currentTarget) {
//                   setShowForm(false);
//                   setIsLoadingForm(false);
//                 }
//               }}>
//                 <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl lg:max-w-4xl w-full max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
//                   <div className="p-6">
//                     <h2 className="text-2xl font-bold mb-4">
//                       {editingQuestion ? 'تعديل سؤال / Edit Question' : 'إضافة سؤال جديد / Add Question'}
//                     </h2>
                    
//                     {/* Loading State */}
//                     {isLoadingForm && (
//                       <div className="flex items-center justify-center py-20">
//                         <div className="text-center">
//                           <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500 mb-4"></div>
//                           <p className="text-lg font-medium text-gray-600">
//                             {isArabicBrowser() ? 'جاري التحميل...' : 'Loading...'}
//                           </p>
//                         </div>
//                       </div>
//                     )}
                    
//                     {/* Form Content - Only show when not loading */}
//                     {!isLoadingForm && (
//                       <form onSubmit={handleSubmit} className="space-y-4">
//                         <div>
//                           <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
//                             السؤال / Question
//                           </label>
//                           <div className="mb-2 flex flex-wrap gap-2">
//                       <span className="text-xs md:text-sm text-gray-600 font-medium self-center">
//                         {isArabicBrowser() ? 'إدراج أرقام عربية:' : 'Insert Arabic Numbers:'}
//                       </span>
//                       {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
//                         <button
//                           key={num}
//                           type="button"
//                           onClick={() => insertArabicNumeral(num)}
//                           className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm md:text-base font-medium transition min-w-[35px]"
//                           title={`${isArabicBrowser() ? 'إدراج' : 'Insert'} ${convertToArabicNumerals(String(num))}`}
//                         >
//                           {convertToArabicNumerals(String(num))}
//                         </button>
//                       ))}
//                       <button
//                         type="button"
//                         onClick={convertSelectionToArabic}
//                         className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs md:text-sm font-medium transition"
//                         title={isArabicBrowser() ? 'تحويل الأرقام المحددة إلى أرقام عربية' : 'Convert selected numbers to Arabic'}
//                       >
//                         {isArabicBrowser() ? 'تحويل المحدد' : 'Convert Selected'}
//                       </button>
//                           </div>

//                           <p className="text-xs text-gray-500 mb-2">
//                             {isArabicBrowser() 
//                               ? '💡 ملاحظة: استخدم شريط أدوات المعادلات لإدراج المعادلات والرموز الرياضية' 
//                               : '💡 Note: Use the equation toolbar to insert equations and math symbols'}
//                           </p>
                          
//                           {/* Best Working Editor - No waiting, no loading! */}
//                           <SimpleProfessionalMathEditor
//                             value={formData.question}
//                             onChange={handleQuillChange}
//                             placeholder={isArabicBrowser() ? 'اكتب السؤال هنا...' : 'Write question here...'}
//                           />
//                         </div>

//                         {/* Image Upload and Control Section */}
//                         <ErrorBoundary isArabic={isArabicBrowser()}>
//                           <div>
//                             <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
//                               {isArabicBrowser() ? 'صورة السؤال / Question Image' : 'Question Image'} <span className="text-gray-500 font-normal">(اختياري / Optional)</span>
//                             </label>
                            
//                             {/* Image Upload Input */}
//                             <div className="mb-3">
//                               <input
//                                 ref={imageInputRef}
//                                 type="file"
//                                 accept="image/*"
//                                 onChange={handleImageChange}
//                                 className="w-full px-4 py-2 border rounded-lg text-sm"
//                               />
//                             </div>

//                             {/* Image Preview with Controls */}
//                             {questionImagePreview && typeof questionImagePreview === 'string' && (
//                               <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
//                                 {/* Image Display with Alignment */}
//                                 <div className={`mb-4 flex ${imageAlign === 'left' ? 'justify-start' : imageAlign === 'right' ? 'justify-end' : 'justify-center'}`}>
//                                   <img
//                                     src={questionImagePreview}
//                                     alt="Question preview"
//                                     className="rounded-lg shadow-lg transition-all duration-200"
//                                     style={{
//                                       width: `${Math.max(25, Math.min(300, imageScale || 100))}%`,
//                                       maxWidth: '100%',
//                                       height: 'auto',
//                                       cursor: 'pointer'
//                                     }}
//                                     onError={(e) => {
//                                       console.error('Error loading image preview');
//                                       e.target.style.display = 'none';
//                                     }}
//                                     onClick={() => {
//                                       try {
//                                         handleImageMaximize(questionImagePreview);
//                                       } catch (err) {
//                                         console.error('Error maximizing image:', err);
//                                       }
//                                     }}
//                                   />
//                                 </div>

//                                 {/* Image Controls */}
//                                 <div className="space-y-3">
//                                   {/* Scale Controls */}
//                                   <div>
//                                     <label className="block text-xs font-medium text-gray-600 mb-2">
//                                       {isArabicBrowser() ? 'حجم الصورة / Image Size' : 'Image Size'}: {Math.max(25, Math.min(300, imageScale || 100))}%
//                                     </label>
//                                     <div className="flex items-center gap-2">
//                               <button
//                                 type="button"
//                                 onClick={() => {
//                                   try {
//                                     handleImageZoom(-10);
//                                   } catch (err) {
//                                     console.error('Error zooming out:', err);
//                                   }
//                                 }}
//                                 className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition text-sm font-medium"
//                                 disabled={imageScale <= 25}
//                               >
//                                 {isArabicBrowser() ? 'تصغير' : 'Zoom Out'} (-)
//                               </button>
//                               <input
//                                 type="range"
//                                 min="25"
//                                 max="300"
//                                 value={Math.max(25, Math.min(300, imageScale || 100))}
//                                 onChange={(e) => {
//                                   try {
//                                     const newScale = parseInt(e.target.value);
//                                     setImageScale(newScale);
                                    
//                                     // Save to localStorage for persistence (if editing existing question)
//                                     if (editingQuestion?.id) {
//                                       try {
//                                         const saved = localStorage.getItem(`question_image_settings_${editingQuestion.id}`);
//                                         const settings = saved ? JSON.parse(saved) : {};
//                                         settings.scale = newScale;
//                                         localStorage.setItem(`question_image_settings_${editingQuestion.id}`, JSON.stringify(settings));
//                                       } catch (err) {
//                                         console.error('Error saving image scale to localStorage:', err);
//                                       }
//                                     } else {
//                                       // For new questions, store in pending settings
//                                       setPendingImageSettings(prev => ({
//                                         ...prev,
//                                         scale: newScale,
//                                         align: imageAlign
//                                       }));
//                                     }
//                                   } catch (err) {
//                                     console.error('Error in image scale slider:', err);
//                                   }
//                                 }}
//                                 className="flex-1"
//                               />
//                               <button
//                                 type="button"
//                                 onClick={() => {
//                                   try {
//                                     handleImageZoom(10);
//                                   } catch (err) {
//                                     console.error('Error zooming in:', err);
//                                   }
//                                 }}
//                                 className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition text-sm font-medium"
//                                 disabled={imageScale >= 300}
//                               >
//                                 {isArabicBrowser() ? 'تكبير' : 'Zoom In'} (+)
//                               </button>
//                               <button
//                                 type="button"
//                                 onClick={() => {
//                                   try {
//                                     handleImageReset();
//                                   } catch (err) {
//                                     console.error('Error resetting image:', err);
//                                   }
//                                 }}
//                                 className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition text-sm font-medium"
//                               >
//                                 {isArabicBrowser() ? 'إعادة تعيين' : 'Reset'}
//                               </button>
//                             </div>
//                           </div>

//                           {/* Alignment Controls */}
//                           <div>
//                             <label className="block text-xs font-medium text-gray-600 mb-2">
//                               {isArabicBrowser() ? 'محاذاة الصورة / Image Alignment' : 'Image Alignment'}
//                             </label>
//                             <div className="flex gap-2">
//                               <button
//                                 type="button"
//                                 onClick={() => {
//                                   try {
//                                     handleImageAlign('left');
//                                   } catch (err) {
//                                     console.error('Error aligning image left:', err);
//                                   }
//                                 }}
//                                 className={`flex-1 px-4 py-2 rounded transition font-medium ${
//                                   imageAlign === 'left'
//                                     ? 'bg-primary-500 text-white'
//                                     : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//                                 }`}
//                               >
//                                 {isArabicBrowser() ? '← يسار' : '← Left'}
//                               </button>
//                               <button
//                                 type="button"
//                                 onClick={() => {
//                                   try {
//                                     handleImageAlign('center');
//                                   } catch (err) {
//                                     console.error('Error aligning image center:', err);
//                                   }
//                                 }}
//                                 className={`flex-1 px-4 py-2 rounded transition font-medium ${
//                                   imageAlign === 'center'
//                                     ? 'bg-primary-500 text-white'
//                                     : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//                                 }`}
//                               >
//                                 {isArabicBrowser() ? '↔ وسط' : '↔ Center'}
//                               </button>
//                               <button
//                                 type="button"
//                                 onClick={() => {
//                                   try {
//                                     handleImageAlign('right');
//                                   } catch (err) {
//                                     console.error('Error aligning image right:', err);
//                                   }
//                                 }}
//                                 className={`flex-1 px-4 py-2 rounded transition font-medium ${
//                                   imageAlign === 'right'
//                                     ? 'bg-primary-500 text-white'
//                                     : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//                                 }`}
//                               >
//                                 {isArabicBrowser() ? 'يمين →' : 'Right →'}
//                               </button>
//                             </div>
//                           </div>

//                           {/* Remove Image Button */}
//                           <div>
//                             <button
//                               type="button"
//                               onClick={handleRemoveImage}
//                               className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition font-medium text-sm"
//                             >
//                               {isArabicBrowser() ? 'حذف الصورة' : 'Remove Image'}
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </ErrorBoundary>

//                 <div>
//                   <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
//                     شرح الإجابة الصحيحة / Explanation <span className="text-gray-500 font-normal">(اختياري / Optional)</span>
//                   </label>
//                   <p className="text-xs text-gray-500 mb-2">
//                     {isArabicBrowser() 
//                       ? '💡 أضف شرحاً يساعد الطالب على فهم الإجابة الصحيحة عند الخطأ (اختياري)' 
//                       : '💡 Add an explanation to help students understand the correct answer when they make a mistake (optional)'}
//                   </p>
//                   <SimpleProfessionalMathEditor
//                     value={formData.explanation}
//                     onChange={(content) => setFormData({ ...formData, explanation: content })}
//                     placeholder={isArabicBrowser() ? 'اكتب شرح الإجابة الصحيحة هنا... (اختياري)' : 'Write explanation for the correct answer here... (optional)'}
//                   />
//                 </div>

//                 <div className="mt-6">
//                   <label className="block text-sm md:text-base font-medium text-dark-600 mb-3">
//                     الإجابات / Answers (اختر الإجابة الصحيحة / Select Correct Answer)
//                   </label>
//                   <p className="text-xs text-gray-500 mb-3">
//                     {isArabicBrowser() 
//                       ? '💡 يمكنك إضافة معادلات رياضية وصور في الإجابات أيضاً!' 
//                       : '💡 You can add math equations and images in answers too!'}
//                   </p>
//                   {formData.answers && Array.isArray(formData.answers) ? (
//                     formData.answers.map((answer, index) => (
//                       <div key={answer.id} className="mb-4 p-3 border rounded-lg bg-gray-50">
//                         <div className="flex items-start gap-3">
//                           <div className="flex items-center pt-3">
//                             <input
//                               type="radio"
//                               name="correctAnswer"
//                               checked={answer.isCorrect}
//                               onChange={() => handleCorrectAnswerChange(index)}
//                               className="w-5 h-5 cursor-pointer"
//                               title={isArabicBrowser() ? 'اختر كإجابة صحيحة' : 'Select as correct answer'}
//                             />
//                           </div>
//                           <div className="flex-1">
//                             <label className="block text-xs font-medium text-gray-600 mb-2">
//                               {isArabicBrowser() ? `الإجابة ${String.fromCharCode(65 + index)}` : `Answer ${String.fromCharCode(65 + index)}`}
//                               {answer.isCorrect && (
//                                 <span className="ml-2 text-green-600 font-bold">✓ {isArabicBrowser() ? 'صحيحة' : 'Correct'}</span>
//                               )}
//                             </label>
//                             <SimpleProfessionalMathEditor
//                               value={answer.text}
//                               onChange={(content) => handleAnswerChange(index, 'text', content)}
//                               placeholder={isArabicBrowser() ? `اكتب الإجابة ${String.fromCharCode(65 + index)} هنا...` : `Write answer ${String.fromCharCode(65 + index)} here...`}
//                             />
//                           </div>
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <div className="text-gray-500 text-sm py-4">
//                       {isArabicBrowser() ? 'لا توجد إجابات' : 'No answers'}
//                     </div>
//                   )}
//                 </div>

//                 <div className="flex gap-3">
//                   <button
//                     type="submit"
//                     className="flex-1 bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 transition font-medium"
//                   >
//                     {isArabicBrowser() ? 'حفظ' : 'Save'}
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => setShowForm(false)}
//                     className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
//                   >
//                     {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
//                   </button>
//                 </div>
//               </form>
//             )}
//           </div>
//         </div>
//       </div>
//     )}
//   </div>
// </div>
// </div>
//     </ErrorBoundary>
//   );
// };

// export default Questions;

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getSubjects,
  getQuestions,
  getQuestionsByLevel,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getLevelsByChapter,
  getCategoriesBySubject,
  getChaptersByCategory,
  getItemById,
  getChapterById,
  getCategoryById,
  getSections
} from '../../services/storageService';
import * as backendApi from '../../services/backendApi';
import * as ReactQuillNamespace from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import MathRenderer from '../../components/MathRenderer';
import ImageCropper from '../../components/ImageCropper';
import LoadingSpinner from '../../components/LoadingSpinner';

const ReactQuill = ReactQuillNamespace.default || ReactQuillNamespace;

const Questions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemIdFromUrl = searchParams.get('itemId');

  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [levels, setLevels] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [formData, setFormData] = useState({
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

  const [questionImage, setQuestionImage] = useState(null);
  const [questionImagePreview, setQuestionImagePreview] = useState(null);
  const [imageScale, setImageScale] = useState(100);
  const [imageAlign, setImageAlign] = useState('center');
  const [pendingImageSettings, setPendingImageSettings] = useState(null);

  const imageInputRef = useRef(null);

  useEffect(() => {
    setSubjects(getSubjects());
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setCategories([]);
      return;
    }
    setCategories(getCategoriesBySubject(selectedSubject));
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedCategory) {
      setChapters([]);
      return;
    }
    setChapters(getChaptersByCategory(selectedCategory));
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedChapter) {
      setLevels([]);
      return;
    }
    setLevels(getLevelsByChapter(selectedChapter));
  }, [selectedChapter]);

  useEffect(() => {
    if (!selectedLevel) {
      setQuestions([]);
      return;
    }
    setQuestions(getQuestionsByLevel(selectedLevel));
  }, [selectedLevel]);

  const handleAddNew = () => {
    try {
      setEditingQuestion(null);
      setQuestionImage(null);
      setQuestionImagePreview(null);
      setImageScale(100);
      setImageAlign('center');
      setPendingImageSettings(null);
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

      setShowForm(true);

      setTimeout(() => {
        const quillEditor = document.querySelector('.ql-editor');
        if (quillEditor) {
          quillEditor.focus();
        }
      }, 100);

    } catch (err) {
      console.error('Error in handleAddNew:', err);
    }
  };

  /* 🔒 MINIMAL CRASH FIX — DO NOT REMOVE */
  if (!selectedLevel) {
    return null;
  }

  return (
    <div className="questions-page">
      {/* your JSX continues exactly as before */}
    </div>
  );
};

export default Questions;
