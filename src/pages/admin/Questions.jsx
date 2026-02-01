import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  getSections,
} from "../../services/storageService";
import * as backendApi from "../../services/backendApi";
import * as ReactQuillNamespace from "react-quill";
import "react-quill/dist/quill.snow.css";

// Get ReactQuill from namespace (react-quill v2.0.0)
const ReactQuill = ReactQuillNamespace.default || ReactQuillNamespace;
import Header from "../../components/Header";
import ErrorBoundary from "../../components/ErrorBoundary";
import { isArabicBrowser } from "../../utils/language";
import MathEditor from "../../components/MathEditor";
import MathRenderer from "../../components/MathRenderer";
import WordLikeEditor from "../../components/WordLikeEditor";
import EquationEditor from "../../components/EquationEditor";
import VisualEquationEditor from "../../components/VisualEquationEditor";
import WYSIWYGEquationEditor from "../../components/WYSIWYGEquationEditor";
import SimpleProfessionalMathEditor from "../../components/SimpleProfessionalMathEditor";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import katex from "katex";

const Questions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemIdFromUrl = searchParams.get("itemId");
  const returnUrl = searchParams.get("returnUrl");
  const subjectIdFromUrl = searchParams.get("subjectId");
  const categoryIdFromUrl = searchParams.get("categoryId");
  const chapterIdFromUrl = searchParams.get("chapterId");

  const useBackend = !!import.meta.env.VITE_API_URL;

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionImage, setQuestionImage] = useState(null);
  const [questionImagePreview, setQuestionImagePreview] = useState(null);
  const [imageScale, setImageScale] = useState(100); // Image scale percentage
  const [imageAlign, setImageAlign] = useState("center"); // Image alignment: left, center, right
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState(null);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [showPassageForm, setShowPassageForm] = useState(false);
  const [editingPassage, setEditingPassage] = useState(null);
  const [addingQuestionToPassage, setAddingQuestionToPassage] = useState(null);
  const [newPassageQuestionForm, setNewPassageQuestionForm] = useState({
    question: "",
    answers: [
      { id: "a", text: "", isCorrect: false },
      { id: "b", text: "", isCorrect: false },
      { id: "c", text: "", isCorrect: false },
      { id: "d", text: "", isCorrect: false },
    ],
  });
  // Using the best working editor - SimpleProfessionalMathEditor with RTL/LTR button!
  const imageInputRef = useRef(null);
  const quillRef = useRef(null);
  const isConvertingRef = useRef(false);
  const [formData, setFormData] = useState({
    question: "",
    questionEn: "",
    image: null, // base64 encoded image
    explanation: "", // Explanation for the correct answer
    answers: [
      { id: "a", text: "", isCorrect: false },
      { id: "b", text: "", isCorrect: false },
      { id: "c", text: "", isCorrect: false },
      { id: "d", text: "", isCorrect: false },
    ],
  });
  const [passageFormData, setPassageFormData] = useState({
    passageText: "",
    questions: [
      {
        id: `q_${Date.now()}_1`,
        question: "",
        answers: [
          { id: "a", text: "", isCorrect: false },
          { id: "b", text: "", isCorrect: false },
          { id: "c", text: "", isCorrect: false },
          { id: "d", text: "", isCorrect: false },
        ],
      },
    ],
  });

  // Convert Western numerals (0-9) to Arabic numerals (٠-٩)
  const convertToArabicNumerals = (text) => {
    const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return text.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  };

  // Convert Arabic numerals (٠-٩) to Western numerals (0-9)
  const convertToWesternNumerals = (text) => {
    const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    const westernNumerals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    return text.replace(/[٠-٩]/g, (digit) => {
      const index = arabicNumerals.indexOf(digit);
      return index !== -1 ? westernNumerals[index] : digit;
    });
  };

  /** تحويل الأرقام العادية فقط (٠–٩) في محتوى Quill. لا نمسّ المعادلات: .math-equation, [data-latex], .katex */
  const convertPlainTextNumbersToArabic = (html) => {
    if (html == null || typeof html !== "string") return html;
    const t = html.trim();
    if (!t) return html;
    const ar = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    const convertDigits = (s) => s.replace(/[0-9]/g, (d) => ar[parseInt(d)]);
    if (typeof document === "undefined" || !t.includes("<"))
      return convertDigits(html);
    const div = document.createElement("div");
    div.innerHTML = html;
    const mathSel = ".math-equation, [data-latex], .katex";
    const walker = document.createTreeWalker(
      div,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach((node) => {
      if (node.parentElement && !node.parentElement.closest(mathSel))
        node.textContent = convertDigits(node.textContent);
    });
    return div.innerHTML;
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
        if (
          /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
            char
          )
        ) {
          return "ar";
        }
        // Check if it's Latin
        if (/[a-zA-Z]/.test(char)) {
          return "en";
        }
      }
      lastLetterIndex--;
    }

    // If no letters found before cursor, check immediate context after cursor
    let nextLetterIndex = cursorIndex;
    while (
      nextLetterIndex < text.length &&
      nextLetterIndex < cursorIndex + 10
    ) {
      const char = text.charAt(nextLetterIndex);
      if (!/[0-9٠-٩\s.,;:!?\-_()\[\]{}\"']/.test(char)) {
        if (
          /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
            char
          )
        ) {
          return "ar";
        }
        if (/[a-zA-Z]/.test(char)) {
          return "en";
        }
      }
      nextLetterIndex++;
    }

    // Check broader context (50 chars before, 10 after) for overall language
    const start = Math.max(0, cursorIndex - 50);
    const end = Math.min(text.length, cursorIndex + 10);
    const context = text.substring(start, end);

    const arabicChars =
      context.match(
        /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g
      ) || [];
    const latinChars = context.match(/[a-zA-Z]/g) || [];
    const arabicCount = arabicChars.length;
    const latinCount = latinChars.length;

    // If Arabic characters exist in context, default to Arabic
    if (arabicCount > 0) {
      // If Arabic count is significant, use Arabic
      if (arabicCount >= latinCount || arabicCount >= 3) {
        return "ar";
      }
    }

    // If only Latin characters, use English
    if (latinCount > 0 && arabicCount === 0) {
      return "en";
    }

    // Default: check page direction (this is an Arabic interface, so default to Arabic)
    const htmlDir =
      document.documentElement.dir ||
      document.documentElement.getAttribute("dir");
    return htmlDir === "rtl" || isArabicBrowser() ? "ar" : "en";
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
        const arabicNumerals = [
          "٠",
          "١",
          "٢",
          "٣",
          "٤",
          "٥",
          "٦",
          "٧",
          "٨",
          "٩",
        ];
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
          for (const category of subject.categories || []) {
            if (!category || !category.chapters) continue;
            for (const chapter of category.chapters || []) {
              if (!chapter || !chapter.items) continue;
              const item = (chapter.items || []).find((i) => i.id === itemId);
              if (item) {
                return { subject, category, chapter };
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error finding item parents:", error);
    }
    return null;
  };

  // Handle text change in Quill editor (update form data)
  const handleQuillChange = (content) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      question: content,
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
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;
          tempDiv.style.display = "inline-block";

          // Convert HTML to Quill delta
          const delta = clipboard.convert(tempDiv);

          // Insert at cursor position
          quill.updateContents(
            new quill.constructor.import("parchment")
              .Delta()
              .retain(selection.index)
              .concat(delta),
            "user"
          );

          // Update form data
          setTimeout(() => {
            quill.setSelection(selection.index + delta.length(), 0);
            const newContent = quill.root.innerHTML;
            setFormData({ ...formData, question: newContent });
          }, 10);
        } catch (error) {
          console.error("Error rendering math:", error);
          // Fallback: insert as visual symbol if simple, otherwise as LaTeX
          const simpleSymbols = {
            "x^2": "x²",
            x_1: "x₁",
            "\\sqrt{x}": "√x",
            "\\sum_{i=1}^{n}": "∑",
            "\\int_{a}^{b}": "∫",
            "\\frac{a}{b}": "½",
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
    { label: "+", symbol: "+" },
    { label: "−", symbol: "−" },
    { label: "×", symbol: "×" },
    { label: "÷", symbol: "÷" },
    { label: "=", symbol: "=" },
    { label: "≠", symbol: "≠" },
    { label: "<", symbol: "<" },
    { label: ">", symbol: ">" },
    { label: "≤", symbol: "≤" },
    { label: "≥", symbol: "≥" },
    { label: "±", symbol: "±" },
    { label: "√", symbol: "√" },
    { label: "²", symbol: "²" },
    { label: "³", symbol: "³" },
    { label: "½", symbol: "½" },
    { label: "¼", symbol: "¼" },
    { label: "¾", symbol: "¾" },
    { label: "π", symbol: "π" },
    { label: "∞", symbol: "∞" },
    { label: "∑", symbol: "∑" },
    { label: "∫", symbol: "∫" },
    { label: "α", symbol: "α" },
    { label: "β", symbol: "β" },
    { label: "γ", symbol: "γ" },
    { label: "δ", symbol: "δ" },
    { label: "θ", symbol: "θ" },
    { label: "λ", symbol: "λ" },
    { label: "μ", symbol: "μ" },
    { label: "σ", symbol: "σ" },
    { label: "Δ", symbol: "Δ" },
    { label: "Ω", symbol: "Ω" },
  ];

  // Configure Quill editor toolbar
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ size: ["small", false, "large", "huge"] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  };

  useEffect(() => {
    try {
      const allSubjects = getSubjects();
      const allowed = (allSubjects || []).filter(
        (s) => s?.id === "مادة_اللفظي" || s?.id === "مادة_الكمي"
      );
      if (allowed.length > 0) setSubjects(allowed);

      if (itemIdFromUrl) {
        if (subjectIdFromUrl && categoryIdFromUrl && chapterIdFromUrl) {
          setSelectedSubject(subjectIdFromUrl);
          setSelectedCategory(categoryIdFromUrl);
          setSelectedChapter(chapterIdFromUrl);
          setSelectedLevel(itemIdFromUrl);
        } else {
          const parents = findItemParents(itemIdFromUrl);
          if (parents) {
            setSelectedSubject(parents.subject.id);
            setSelectedCategory(parents.category.id);
            setSelectedChapter(parents.chapter.id);
            setSelectedLevel(itemIdFromUrl);
          }
        }
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setSubjects([]);
    }
  }, [itemIdFromUrl, subjectIdFromUrl, categoryIdFromUrl, chapterIdFromUrl]);

  useEffect(() => {
    let alive = true;
    const loadQuestions = async () => {
      try {
        if (!selectedLevel) {
          setQuestions([]);
          return;
        }

        setLoadingQuestions(true);
        let levelQuestions = [];

        if (useBackend && backendApi.isBackendOn()) {
          try {
            levelQuestions = await backendApi.getQuestionsByLevel(
              selectedLevel
            );
          } catch (err) {
            console.error("Error loading questions from backend:", err);
            // Fallback to local storage
            levelQuestions = getQuestionsByLevel(selectedLevel);
          }
        } else {
          levelQuestions = getQuestionsByLevel(selectedLevel);
        }

        if (!alive) return;

        // Sort questions by createdAt to maintain order
        let sortedQuestions = (levelQuestions || []).sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateA - dateB;
        });

        // Refetch passage detail when list omits passage_text / passage_questions (e.g. pagination)
        if (
          useBackend &&
          backendApi.isBackendOn() &&
          backendApi.getQuestionById
        ) {
          const merged = [];
          for (const q of sortedQuestions) {
            if (q.type === "passage") {
              const noPassageText = !(q.passageText || "").trim();
              const noQuestions = !q.questions || q.questions.length === 0;
              const noContent = noPassageText && noQuestions;
              if (noContent && q.id) {
                try {
                  const full = await backendApi.getQuestionById(q.id);
                  if (
                    full &&
                    ((full.passageText || "").trim() ||
                      (full.questions || []).length > 0)
                  ) {
                    merged.push({
                      ...q,
                      passageText: full.passageText ?? q.passageText,
                      questions: full.questions ?? q.questions,
                    });
                    continue;
                  }
                } catch (e) {
                  console.warn("Refetch passage by id failed:", q.id, e);
                }
              }
            }
            merged.push(q);
          }
          sortedQuestions = merged;
        }

        if (!alive) return;
        setQuestions(sortedQuestions);
      } catch (error) {
        console.error("Error loading questions:", error);
        if (alive) {
          setQuestions([]);
        }
      } finally {
        if (alive) {
          setLoadingQuestions(false);
        }
      }
    };

    loadQuestions();
    return () => {
      alive = false;
    };
  }, [selectedLevel, useBackend]);

  const refetchQuestionsForLevel = async (levelId) => {
    if (!levelId) return;
    try {
      let levelQuestions = [];
      if (useBackend && backendApi.isBackendOn()) {
        levelQuestions = await backendApi.getQuestionsByLevel(levelId);
      } else {
        levelQuestions = getQuestionsByLevel(levelId);
      }
      let sorted = (levelQuestions || []).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateA - dateB;
      });
      if (
        useBackend &&
        backendApi.isBackendOn() &&
        backendApi.getQuestionById
      ) {
        const merged = [];
        for (const q of sorted) {
          if (q.type === "passage") {
            const noPassageText = !(q.passageText || "").trim();
            const noQuestions = !q.questions || q.questions.length === 0;
            const noContent = noPassageText && noQuestions;
            if (noContent && q.id) {
              try {
                const full = await backendApi.getQuestionById(q.id);
                if (
                  full &&
                  ((full.passageText || "").trim() ||
                    (full.questions || []).length > 0)
                ) {
                  merged.push({
                    ...q,
                    passageText: full.passageText ?? q.passageText,
                    questions: full.questions ?? q.questions,
                  });
                  continue;
                }
              } catch (e) {
                console.warn("Refetch passage by id failed:", q.id, e);
              }
            }
          }
          merged.push(q);
        }
        sorted = merged;
      }
      setQuestions(sorted);
    } catch (err) {
      console.error("Error refetching questions:", err);
    }
  };

  // OLD REACTQUILL HANDLER REMOVED - Now using WordLikeEditor which handles its own events
  // The WordLikeEditor component manages its own Quill instance and event handlers

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedCategory("");
    setSelectedChapter("");
    setSelectedLevel("");
    setQuestions([]);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedChapter("");
    setSelectedLevel("");
    setQuestions([]);
  };

  const handleChapterChange = (chapterId) => {
    setSelectedChapter(chapterId);
    setSelectedLevel("");
    setQuestions([]);
  };

  const handleLevelChange = (levelId) => {
    setSelectedLevel(levelId);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert("حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setQuestionImage(file);
        setQuestionImagePreview(base64String);
        setImageScale(100); // Reset scale when new image is uploaded
        setImageAlign("center"); // Reset alignment when new image is uploaded
        // Save image with metadata
        setFormData({
          ...formData,
          image: base64String,
          imageScale: 100,
          imageAlign: "center",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageZoom = (delta) => {
    setImageScale((prev) => {
      const newScale = Math.max(25, Math.min(300, prev + delta));
      // Update formData with new scale
      setFormData((current) => ({ ...current, imageScale: newScale }));
      return newScale;
    });
  };

  const handleImageReset = () => {
    setImageScale(100);
    setImageAlign("center");
    // Update formData
    setFormData((current) => ({
      ...current,
      imageScale: 100,
      imageAlign: "center",
    }));
  };

  const handleImageAlign = (alignment) => {
    setImageAlign(alignment);
    // Update formData with new alignment
    setFormData((current) => ({ ...current, imageAlign: alignment }));
  };

  const handleImageMaximize = (imageSrc) => {
    setModalImageSrc(imageSrc);
    setShowImageModal(true);
  };

  const handleRemoveImage = () => {
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setImageScale(100);
    setImageAlign("center");
    setFormData({
      ...formData,
      image: null,
      imageScale: 100,
      imageAlign: "center",
    });
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleAddNew = () => {
    setEditingQuestion(null);
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setImageScale(100);
    setImageAlign("center");
    setFormData({
      question: "",
      questionEn: "",
      image: null,
      explanation: "",
      answers: [
        { id: "a", text: "", isCorrect: false },
        { id: "b", text: "", isCorrect: false },
        { id: "c", text: "", isCorrect: false },
        { id: "d", text: "", isCorrect: false },
      ],
    });
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setShowForm(true);
    // Force focus after modal opens
    setTimeout(() => {
      const quillEditor = document.querySelector(".ql-editor");
      if (quillEditor) {
        quillEditor.focus();
      }
    }, 100);
  };

  const handleAddPassage = () => {
    setEditingPassage(null);
    setPassageFormData({
      passageText: "",
      questions: [],
    });
    setShowPassageForm(true);
  };

  const handleAddQuestionToPassage = () => {
    const newQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question: "",
      answers: [
        { id: "a", text: "", isCorrect: false },
        { id: "b", text: "", isCorrect: false },
        { id: "c", text: "", isCorrect: false },
        { id: "d", text: "", isCorrect: false },
      ],
    };
    setPassageFormData({
      ...passageFormData,
      questions: [...passageFormData.questions, newQuestion],
    });
  };

  const handleRemoveQuestionFromPassage = (questionId) => {
    if (passageFormData.questions.length <= 1) {
      alert("يجب أن تحتوي القطعة على سؤال واحد على الأقل");
      return;
    }
    setPassageFormData({
      ...passageFormData,
      questions: passageFormData.questions.filter((q) => q.id !== questionId),
    });
  };

  const handlePassageQuestionChange = (questionId, field, value) => {
    setPassageFormData({
      ...passageFormData,
      questions: passageFormData.questions.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q
      ),
    });
  };

  const handlePassageAnswerChange = (questionId, answerIndex, field, value) => {
    setPassageFormData({
      ...passageFormData,
      questions: passageFormData.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map((ans, idx) =>
                idx === answerIndex ? { ...ans, [field]: value } : ans
              ),
            }
          : q
      ),
    });
  };

  const handlePassageCorrectAnswerChange = (questionId, answerIndex) => {
    setPassageFormData({
      ...passageFormData,
      questions: passageFormData.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map((ans, idx) => ({
                ...ans,
                isCorrect: idx === answerIndex,
              })),
            }
          : q
      ),
    });
  };

  const handlePassageSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedLevel) {
      alert("يرجى اختيار المستوى أولاً");
      return;
    }

    if (!passageFormData.passageText.trim()) {
      alert("يرجى إدخال نص القطعة");
      return;
    }

    const isNewPassage = !editingPassage;
    if (!isNewPassage && passageFormData.questions.length === 0) {
      alert("يرجى إضافة سؤال واحد على الأقل للقطعة");
      return;
    }

    // Validate all questions (when editing or when we have questions)
    for (const q of passageFormData.questions) {
      if (!q.question.trim()) {
        alert("يرجى إدخال نص جميع الأسئلة");
        return;
      }
      const hasCorrectAnswer = q.answers.some((ans) => ans.isCorrect);
      if (!hasCorrectAnswer) {
        alert("يرجى اختيار إجابة صحيحة لكل سؤال");
        return;
      }
      for (const ans of q.answers) {
        if (!ans.text.trim()) {
          alert("يرجى إدخال نص جميع الاختيارات");
          return;
        }
      }
    }

    const passageTextAr = convertPlainTextNumbersToArabic(
      passageFormData.passageText
    );
    const questionsToSave = passageFormData.questions || [];
    const questionsAr = questionsToSave.map((q) => ({
      ...q,
      question: convertPlainTextNumbersToArabic(q.question) ?? q.question,
    }));

    try {
      if (useBackend && backendApi.isBackendOn()) {
        if (editingPassage) {
          await backendApi.updatePassage(editingPassage.id, {
            passageText: passageTextAr,
            questions: questionsAr,
          });
        } else {
          await backendApi.addPassage(selectedLevel, {
            passageText: passageTextAr,
            questions: questionsAr,
          });
        }
      } else {
        const passageData = {
          type: "passage",
          passageText: passageTextAr,
          questions: questionsAr,
          levelId: selectedLevel,
        };

        if (editingPassage) {
          updateQuestion(editingPassage.id, passageData);
        } else {
          addQuestion(passageData);
        }
      }

      // Reload questions
      if (useBackend && backendApi.isBackendOn()) {
        const levelQuestions = await backendApi.getQuestionsByLevel(
          selectedLevel
        );
        const sortedQuestions = (levelQuestions || []).sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateA - dateB;
        });
        setQuestions(sortedQuestions);
      } else {
        setQuestions(getQuestionsByLevel(selectedLevel));
      }

      setShowPassageForm(false);
      setEditingPassage(null);
      setPassageFormData({ passageText: "", questions: [] });

      if (returnUrl && itemIdFromUrl && e.target.type === "submit") {
        setTimeout(() => {
          navigate(returnUrl);
        }, 500);
      }
    } catch (error) {
      console.error("Error saving passage:", error);
      const msg = (error?.message || "").trim();
      alert(
        msg
          ? `حدث خطأ أثناء حفظ القطعة:\n${msg}`
          : "حدث خطأ أثناء حفظ القطعة. يرجى المحاولة مرة أخرى."
      );
    }
  };

  const handleAddQuestionToExistingPassage = (passage) => {
    setAddingQuestionToPassage(passage);
    setNewPassageQuestionForm({
      question: "",
      answers: [
        { id: "a", text: "", isCorrect: false },
        { id: "b", text: "", isCorrect: false },
        { id: "c", text: "", isCorrect: false },
        { id: "d", text: "", isCorrect: false },
      ],
    });
  };

  const handleSaveNewPassageQuestion = async (e) => {
    e.preventDefault();
    if (!addingQuestionToPassage) return;
    const q = newPassageQuestionForm;
    if (!q.question.trim()) {
      alert("يرجى إدخال نص السؤال");
      return;
    }
    const hasCorrect = q.answers.some((a) => a.isCorrect);
    if (!hasCorrect) {
      alert("يرجى اختيار الإجابة الصحيحة");
      return;
    }
    for (const a of q.answers) {
      if (!a.text.trim()) {
        alert("يرجى إدخال نص جميع الاختيارات");
        return;
      }
    }
    const existingQuestions = addingQuestionToPassage.questions || [];
    const newQ = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question: q.question,
      answers: q.answers,
    };
    const updatedQuestions = [...existingQuestions, newQ];
    const passageText = (addingQuestionToPassage.passageText || "").trim();
    const questionsAr = updatedQuestions.map((qq) => ({
      question: convertPlainTextNumbersToArabic(qq.question) ?? qq.question,
      answers: (qq.answers || []).map((a) => ({
        id: a.id,
        text: convertPlainTextNumbersToArabic(a.text) ?? a.text,
        isCorrect: !!a.isCorrect,
      })),
    }));
    try {
      if (useBackend && backendApi.isBackendOn()) {
        await backendApi.updatePassage(addingQuestionToPassage.id, {
          passageText,
          questions: questionsAr,
        });
      } else {
        updateQuestion(addingQuestionToPassage.id, {
          type: "passage",
          passageText,
          questions: updatedQuestions,
          levelId: selectedLevel,
        });
      }
      const levelQuestions =
        useBackend && backendApi.isBackendOn()
          ? await backendApi.getQuestionsByLevel(selectedLevel)
          : getQuestionsByLevel(selectedLevel);
      const sorted = (levelQuestions || []).sort((a, b) => {
        const dA = new Date(a.createdAt || 0);
        const dB = new Date(b.createdAt || 0);
        return dA - dB;
      });
      setQuestions(sorted);
      setAddingQuestionToPassage(null);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ السؤال");
    }
  };

  const handleEditPassage = (passage) => {
    setEditingPassage(passage);
    setPassageFormData({
      passageText: passage.passageText || "",
      questions: passage.questions || [
        {
          id: `q_${Date.now()}_1`,
          question: "",
          answers: [
            { id: "a", text: "", isCorrect: false },
            { id: "b", text: "", isCorrect: false },
            { id: "c", text: "", isCorrect: false },
            { id: "d", text: "", isCorrect: false },
          ],
        },
      ],
    });
    setShowPassageForm(true);
  };

  const handleDeletePassage = async (passageId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه القطعة وجميع أسئلتها؟"))
      return;
    try {
      if (useBackend && backendApi.isBackendOn()) {
        await backendApi.deleteQuestion(passageId);
        await refetchQuestionsForLevel(selectedLevel);
      } else {
        deleteQuestion(passageId);
        setQuestions(getQuestionsByLevel(selectedLevel));
      }
    } catch (error) {
      console.error("Error deleting passage:", error);
      alert("حدث خطأ أثناء حذف القطعة. يرجى المحاولة مرة أخرى.");
    }
  };

  const handleEdit = (question) => {
    setIsLoadingForm(true);
    setEditingQuestion(question);

    // Use setTimeout to show loading state first, then load form
    setTimeout(() => {
      setFormData({
        question: question.question || "",
        questionEn: question.questionEn || "",
        image: question.image || null,
        imageScale: question.imageScale || 100,
        imageAlign: question.imageAlign || "center",
        explanation: question.explanation || "",
        answers: question.answers
          ? question.answers.map((ans) => ({
              id: ans.id,
              text: ans.text || "",
              isCorrect: ans.isCorrect || false,
            }))
          : [
              { id: "a", text: "", isCorrect: false },
              { id: "b", text: "", isCorrect: false },
              { id: "c", text: "", isCorrect: false },
              { id: "d", text: "", isCorrect: false },
            ],
      });
      if (question.image) {
        setQuestionImagePreview(question.image);
      } else {
        setQuestionImagePreview(null);
      }
      setQuestionImage(null);
      // Load saved image scale and alignment
      setImageScale(question.imageScale || 100);
      setImageAlign(question.imageAlign || "center");
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      setShowForm(true);

      // Delay to allow form to render before showing editors
      setTimeout(() => {
        setIsLoadingForm(false);
      }, 300);
    }, 100);
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;
    try {
      if (useBackend && backendApi.isBackendOn()) {
        await backendApi.deleteQuestion(questionId);
        await refetchQuestionsForLevel(selectedLevel);
      } else {
        deleteQuestion(questionId);
        setQuestions(getQuestionsByLevel(selectedLevel));
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      alert("حدث خطأ أثناء حذف السؤال. يرجى المحاولة مرة أخرى.");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedLevel) {
      alert("يرجى اختيار المستوى أولاً");
      return;
    }

    const questionAr = convertPlainTextNumbersToArabic(formData.question);
    const questionData = {
      ...formData,
      question: questionAr,
      levelId: selectedLevel,
    };

    try {
      if (useBackend && backendApi.isBackendOn()) {
        setIsLoadingForm(true);
        if (editingQuestion) {
          await backendApi.updateQuestion(
            editingQuestion.id,
            {
              question: questionAr,
              questionEn: formData.questionEn,
              explanation: formData.explanation,
              answers: formData.answers,
            },
            questionImage || null
          );
        } else {
          await backendApi.addQuestion(
            selectedLevel,
            {
              question: questionAr,
              questionEn: formData.questionEn,
              explanation: formData.explanation,
              answers: formData.answers,
            },
            questionImage || null
          );
        }
        await refetchQuestionsForLevel(selectedLevel);
      } else {
        if (editingQuestion) {
          updateQuestion(editingQuestion.id, questionData);
        } else {
          addQuestion(questionData);
        }
        setQuestions(getQuestionsByLevel(selectedLevel));
      }

      setShowForm(false);
      setEditingQuestion(null);
      setQuestionImage(null);
      setQuestionImagePreview(null);
      setFormData({
        question: "",
        questionEn: "",
        image: null,
        explanation: "",
        answers: [
          { id: "a", text: "", isCorrect: false },
          { id: "b", text: "", isCorrect: false },
          { id: "c", text: "", isCorrect: false },
          { id: "d", text: "", isCorrect: false },
        ],
      });
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }

      if (returnUrl && itemIdFromUrl && e.target.type === "submit") {
        setTimeout(() => navigate(returnUrl), 500);
      }
    } catch (error) {
      console.error("Error saving question:", error);
      alert("حدث خطأ أثناء حفظ السؤال. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const selectedSubjectObj =
    subjects && subjects.length > 0
      ? subjects.find((s) => s.id === selectedSubject)
      : null;
  const levels = selectedChapter
    ? getLevelsByChapter(selectedChapter) || []
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-dark-600">
              إدارة الأسئلة
            </h1>
            <button
              onClick={() => {
                if (returnUrl) {
                  navigate(returnUrl);
                } else {
                  navigate("/admin/dashboard");
                }
              }}
              className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
            >
              ← رجوع
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  المادة
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">اختر المادة</option>
                  {subjects && subjects.length > 0 ? (
                    subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>لا توجد مواد</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  التصنيف
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={!selectedSubject}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">اختر التصنيف</option>
                  {selectedSubjectObj?.categories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  الفصل
                </label>
                <select
                  value={selectedChapter}
                  onChange={(e) => handleChapterChange(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">اختر الفصل</option>
                  {getChaptersByCategory(selectedCategory).map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  المستوى
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  disabled={!selectedChapter}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">اختر المستوى</option>
                  {levels.map((level) => (
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
                يرجى اختيار المادة، التصنيف، الفصل، والمستوى لعرض الأسئلة
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                  الأسئلة ({questions.length})
                </h2>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleAddNew}
                    className="bg-primary-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-primary-600 transition font-medium text-sm sm:text-base w-full sm:w-auto"
                  >
                    + إضافة سؤال جديد
                  </button>
                  <button
                    onClick={handleAddPassage}
                    className="bg-green-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-green-600 transition font-medium text-sm sm:text-base w-full sm:w-auto"
                  >
                    + إضافة قطعة
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg mb-4">لا توجد أسئلة لهذا المستوى</p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleAddNew}
                        className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                      >
                        + إضافة سؤال جديد
                      </button>
                      <button
                        onClick={handleAddPassage}
                        className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                      >
                        + إضافة قطعة
                      </button>
                    </div>
                  </div>
                ) : (
                  questions.map((question, index) => {
                    // Check if this is a passage type
                    if (question.type === "passage") {
                      return (
                        <div
                          key={question.id}
                          className="border-2 border-green-500 rounded-lg p-4 sm:p-6 bg-green-50"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                            <div className="flex-1 w-full">
                              <div className="mb-3">
                                <span className="inline-block bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold mb-2">
                                  قطعة
                                </span>
                              </div>
                              {/* Passage Text */}
                              <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
                                <div className="text-sm sm:text-base md:text-lg text-dark-700 leading-relaxed">
                                  {(question.passageText || "").trim() ? (
                                    <MathRenderer
                                      html={question.passageText || ""}
                                      inline={false}
                                    />
                                  ) : (
                                    <p className="text-gray-500 italic">
                                      لا يوجد نص للقطعة. اضغط &quot;تعديل&quot;
                                      لإضافة المحتوى.
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Questions in Passage */}
                              <div className="space-y-4">
                                {question.questions &&
                                question.questions.length > 0 ? (
                                  question.questions.map((q, qIndex) => (
                                    <div
                                      key={q.id || qIndex}
                                      className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200"
                                    >
                                      <div className="font-semibold text-sm sm:text-base text-dark-600 mb-3">
                                        <span className="text-green-600 font-bold">
                                          السؤال {qIndex + 1}:
                                        </span>
                                        <div className="mt-2">
                                          <MathRenderer
                                            html={q.question || ""}
                                            inline={false}
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                        {q.answers &&
                                          q.answers.map((answer) => (
                                            <div
                                              key={answer.id}
                                              className={`p-2 rounded ${
                                                answer.isCorrect
                                                  ? "bg-yellow-100 border-2 border-yellow-500"
                                                  : "bg-gray-100 border border-gray-300"
                                              }`}
                                            >
                                              <div className="text-dark-600 text-sm">
                                                <MathRenderer
                                                  html={answer.text}
                                                  inline={true}
                                                />
                                              </div>
                                              {answer.isCorrect && (
                                                <span className="text-yellow-500 ml-1 font-bold">
                                                  ✓
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-gray-500 italic py-2">
                                    لا توجد أسئلة في القطعة بعد.
                                  </p>
                                )}
                              </div>
                              <div className="mt-4">
                                <button
                                  onClick={() =>
                                    handleAddQuestionToExistingPassage(question)
                                  }
                                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium text-sm"
                                >
                                  + إضافة سؤال
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleEditPassage(question)}
                                className="flex-1 sm:flex-none bg-yellow-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-yellow-600 text-sm sm:text-base transition"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => handleDeletePassage(question.id)}
                                className="flex-1 sm:flex-none bg-red-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-red-600 text-sm sm:text-base transition"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Regular question
                    return (
                      <div
                        key={question.id}
                        className="border rounded-lg p-3 sm:p-4"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-2">
                          <div className="flex-1 w-full sm:w-auto">
                            {/* Question with inline images */}
                            <div className="font-semibold text-sm sm:text-base md:text-lg text-dark-600 mb-2 break-words">
                              <span>{index + 1}. </span>
                              <MathRenderer
                                html={question.question || ""}
                                inline={false}
                              />
                            </div>

                            {/* Separator */}
                            <div className="border-t border-gray-300 my-2"></div>
                            {question.questionEn && (
                              <div
                                className="text-xs sm:text-sm md:text-base text-dark-500 mb-2 break-words"
                                dangerouslySetInnerHTML={{
                                  __html: question.questionEn,
                                }}
                              />
                            )}
                            {question.image && (
                              <div
                                className={`mt-2 flex ${
                                  question.imageAlign === "right"
                                    ? "justify-end"
                                    : question.imageAlign === "left"
                                    ? "justify-start"
                                    : "justify-center"
                                }`}
                              >
                                <img
                                  src={question.image}
                                  alt="Question"
                                  style={{
                                    width: question.imageScale
                                      ? `${question.imageScale}%`
                                      : "100%",
                                    maxWidth: "100%",
                                    height: "auto",
                                  }}
                                  className="max-h-48 sm:max-h-64 rounded-lg border object-contain cursor-pointer hover:opacity-90 transition shadow-sm"
                                  onClick={() =>
                                    handleImageMaximize(question.image)
                                  }
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleEdit(question)}
                              className="flex-1 sm:flex-none bg-yellow-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-yellow-600 text-sm sm:text-base transition"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDelete(question.id)}
                              className="flex-1 sm:flex-none bg-red-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-red-600 text-sm sm:text-base transition"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                          {question.answers.map((answer) => (
                            <div
                              key={answer.id}
                              className={`p-2 rounded ${
                                answer.isCorrect
                                  ? "bg-yellow-100 border-2 border-yellow-500"
                                  : "bg-gray-100 border border-gray-300"
                              }`}
                            >
                              <div className="text-dark-600">
                                <MathRenderer
                                  html={answer.text}
                                  inline={true}
                                />
                              </div>
                              {answer.isCorrect && (
                                <span className="text-yellow-500 ml-1 font-bold">
                                  ✓
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Add Question to Passage Modal */}
          {addingQuestionToPassage && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div
                className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl w-full max-h-[95vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">إضافة سؤال للقطعة</h2>
                  <form
                    onSubmit={handleSaveNewPassageQuestion}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-dark-600 mb-2">
                        نص السؤال
                      </label>
                      <ErrorBoundary isArabic={isArabicBrowser()}>
                        <SimpleProfessionalMathEditor
                          value={newPassageQuestionForm.question}
                          onChange={(c) =>
                            setNewPassageQuestionForm({
                              ...newPassageQuestionForm,
                              question: c,
                            })
                          }
                          placeholder="اكتب السؤال هنا..."
                        />
                      </ErrorBoundary>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-600 mb-2">
                        الاختيارات (اختر الإجابة الصحيحة)
                      </label>
                      <div className="space-y-3">
                        {newPassageQuestionForm.answers.map((ans, idx) => (
                          <div
                            key={ans.id}
                            className="flex items-start gap-2 p-2 bg-gray-50 rounded border"
                          >
                            <input
                              type="radio"
                              name="newPassageCorrect"
                              checked={ans.isCorrect}
                              onChange={() =>
                                setNewPassageQuestionForm({
                                  ...newPassageQuestionForm,
                                  answers: newPassageQuestionForm.answers.map(
                                    (a, i) => ({ ...a, isCorrect: i === idx })
                                  ),
                                })
                              }
                              className="mt-3"
                            />
                            <div className="flex-1 min-w-0">
                              <ErrorBoundary isArabic={isArabicBrowser()}>
                                <SimpleProfessionalMathEditor
                                  value={ans.text}
                                  onChange={(c) =>
                                    setNewPassageQuestionForm({
                                      ...newPassageQuestionForm,
                                      answers:
                                        newPassageQuestionForm.answers.map(
                                          (a, i) =>
                                            i === idx ? { ...a, text: c } : a
                                        ),
                                    })
                                  }
                                  placeholder={`الاختيار ${String.fromCharCode(
                                    65 + idx
                                  )}`}
                                />
                              </ErrorBoundary>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600"
                      >
                        حفظ
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingQuestionToPassage(null)}
                        className="flex-1 bg-gray-400 text-white py-2 rounded-lg"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </div>
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

          {/* Add/Edit Passage Form Modal */}
          {showPassageForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div
                className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-4xl lg:max-w-6xl w-full max-h-[95vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4">
                    {editingPassage ? "تعديل قطعة" : "إضافة قطعة جديدة"}
                  </h2>

                  <form onSubmit={handlePassageSubmit} className="space-y-6">
                    {/* Passage Text */}
                    <div>
                      <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                        نص القطعة
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        💡 اكتب نص القطعة هنا. يمكنك استخدام شريط الأدوات لإضافة
                        تنسيقات ومعادلات رياضية
                      </p>
                      <ErrorBoundary isArabic={isArabicBrowser()}>
                        <SimpleProfessionalMathEditor
                          value={passageFormData.passageText}
                          onChange={(content) =>
                            setPassageFormData({
                              ...passageFormData,
                              passageText: content,
                            })
                          }
                          placeholder="اكتب نص القطعة هنا..."
                        />
                      </ErrorBoundary>
                    </div>

                    {/* Questions in Passage - فقط عند التعديل */}
                    {editingPassage && (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="block text-sm md:text-base font-medium text-dark-600">
                            أسئلة القطعة
                          </label>
                          <button
                            type="button"
                            onClick={handleAddQuestionToPassage}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium text-sm"
                          >
                            + إضافة سؤال
                          </button>
                        </div>

                        <div className="space-y-6">
                          {passageFormData.questions.map((q, qIndex) => (
                            <div
                              key={q.id}
                              className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50"
                            >
                              <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-dark-600">
                                  السؤال {qIndex + 1}
                                </h3>
                                {passageFormData.questions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveQuestionFromPassage(q.id)
                                    }
                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm"
                                  >
                                    حذف السؤال
                                  </button>
                                )}
                              </div>

                              {/* Question Text */}
                              <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  نص السؤال
                                </label>
                                <ErrorBoundary isArabic={isArabicBrowser()}>
                                  <SimpleProfessionalMathEditor
                                    value={q.question}
                                    onChange={(content) =>
                                      handlePassageQuestionChange(
                                        q.id,
                                        "question",
                                        content
                                      )
                                    }
                                    placeholder={`اكتب نص السؤال ${
                                      qIndex + 1
                                    } هنا...`}
                                  />
                                </ErrorBoundary>
                              </div>

                              {/* Answers */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  الاختيارات (اختر الإجابة الصحيحة)
                                </label>
                                <div className="space-y-3">
                                  {q.answers.map((answer, ansIndex) => (
                                    <div
                                      key={answer.id}
                                      className="flex items-start gap-3 bg-white p-3 rounded border"
                                    >
                                      <div className="flex items-center pt-2">
                                        <input
                                          type="radio"
                                          name={`correctAnswer_${q.id}`}
                                          checked={answer.isCorrect}
                                          onChange={() =>
                                            handlePassageCorrectAnswerChange(
                                              q.id,
                                              ansIndex
                                            )
                                          }
                                          className="w-5 h-5 cursor-pointer"
                                          title="اختر كإجابة صحيحة"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-2">
                                          {String.fromCharCode(65 + ansIndex)}
                                          {answer.isCorrect && (
                                            <span className="ml-2 text-green-600 font-bold">
                                              ✓ صحيحة
                                            </span>
                                          )}
                                        </label>
                                        <ErrorBoundary
                                          isArabic={isArabicBrowser()}
                                        >
                                          <SimpleProfessionalMathEditor
                                            value={answer.text}
                                            onChange={(content) =>
                                              handlePassageAnswerChange(
                                                q.id,
                                                ansIndex,
                                                "text",
                                                content
                                              )
                                            }
                                            placeholder={`اكتب الاختيار ${String.fromCharCode(
                                              65 + ansIndex
                                            )} هنا...`}
                                          />
                                        </ErrorBoundary>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                      >
                        حفظ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPassageForm(false);
                          setEditingPassage(null);
                          setPassageFormData({
                            passageText: "",
                            questions: [],
                          });
                        }}
                        className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div
                className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl lg:max-w-4xl w-full max-h-[95vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4">
                    {editingQuestion ? "تعديل سؤال" : "إضافة سؤال جديد"}
                  </h2>

                  {/* Loading State */}
                  {isLoadingForm && (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500 mb-4"></div>
                        <p className="text-lg font-medium text-gray-600">
                          جاري التحميل...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Form Content - Only show when not loading */}
                  {!isLoadingForm && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                          السؤال
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          💡 ملاحظة: استخدم شريط أدوات المعادلات لإدراج
                          المعادلات والرموز الرياضية
                        </p>

                        {/* Best Working Editor - No waiting, no loading! */}
                        <ErrorBoundary isArabic={isArabicBrowser()}>
                          <SimpleProfessionalMathEditor
                            value={formData.question}
                            onChange={handleQuillChange}
                            placeholder="اكتب السؤال هنا..."
                          />
                        </ErrorBoundary>
                      </div>

                      {/* Image Upload Section */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                        <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                          📷 إضافة صورة للسؤال (اختياري)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          يمكنك رفع صورة توضيحية للسؤال (الحد الأقصى 5 ميجابايت)
                        </p>

                        {/* File Input */}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none mb-3"
                        />

                        {/* Image Preview and Controls */}
                        {questionImagePreview && (
                          <div className="mt-4 space-y-3">
                            {/* Image Preview */}
                            <div
                              className={`flex ${
                                imageAlign === "right"
                                  ? "justify-end"
                                  : imageAlign === "left"
                                  ? "justify-start"
                                  : "justify-center"
                              }`}
                            >
                              <div className="relative inline-block">
                                <img
                                  src={questionImagePreview}
                                  alt="Preview"
                                  style={{
                                    width: `${imageScale}%`,
                                    maxWidth: "100%",
                                    height: "auto",
                                  }}
                                  className="rounded-lg border-2 border-gray-300 shadow-sm"
                                />
                              </div>
                            </div>

                            {/* Image Controls */}
                            <div className="bg-white rounded-lg p-3 space-y-3 border border-gray-200">
                              {/* Size Controls */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  📏 حجم الصورة: {imageScale}%
                                </label>
                                <div className="flex gap-2 items-center">
                                  <button
                                    type="button"
                                    onClick={() => handleImageZoom(-10)}
                                    className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm font-medium"
                                    title="تصغير"
                                  >
                                    ➖ تصغير
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleImageZoom(10)}
                                    className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm font-medium"
                                    title="تكبير"
                                  >
                                    ➕ تكبير
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleImageReset}
                                    className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm font-medium"
                                    title="إعادة تعيين"
                                  >
                                    🔄 إعادة تعيين
                                  </button>
                                </div>
                              </div>

                              {/* Alignment Controls */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  📍 موضع الصورة
                                </label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleImageAlign("left")}
                                    className={`flex-1 px-3 py-2 rounded transition font-medium text-sm ${
                                      imageAlign === "left"
                                        ? "bg-primary-500 text-white shadow-md"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                  >
                                    ← يسار
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleImageAlign("center")}
                                    className={`flex-1 px-3 py-2 rounded transition font-medium text-sm ${
                                      imageAlign === "center"
                                        ? "bg-primary-500 text-white shadow-md"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                  >
                                    ↔ وسط
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleImageAlign("right")}
                                    className={`flex-1 px-3 py-2 rounded transition font-medium text-sm ${
                                      imageAlign === "right"
                                        ? "bg-primary-500 text-white shadow-md"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                  >
                                    يمين →
                                  </button>
                                </div>
                              </div>

                              {/* Remove Image Button */}
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition font-medium text-sm"
                              >
                                🗑️ حذف الصورة
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                          شرح الإجابة الصحيحة (يظهر عند الإجابة الخاطئة)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          💡 أضف شرحاً يساعد الطالب على فهم الإجابة الصحيحة عند
                          الخطأ
                        </p>
                        <ErrorBoundary isArabic={isArabicBrowser()}>
                          <SimpleProfessionalMathEditor
                            value={formData.explanation}
                            onChange={(content) =>
                              setFormData({ ...formData, explanation: content })
                            }
                            placeholder="اكتب شرح الإجابة الصحيحة هنا..."
                          />
                        </ErrorBoundary>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm md:text-base font-medium text-dark-600 mb-3">
                          الإجابات (اختر الإجابة الصحيحة)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          💡 يمكنك إضافة معادلات رياضية وصور في الإجابات أيضاً!
                        </p>
                        {formData.answers.map((answer, index) => (
                          <div
                            key={answer.id}
                            className="mb-4 p-3 border rounded-lg bg-gray-50"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex items-center pt-3">
                                <input
                                  type="radio"
                                  name="correctAnswer"
                                  checked={answer.isCorrect}
                                  onChange={() =>
                                    handleCorrectAnswerChange(index)
                                  }
                                  className="w-5 h-5 cursor-pointer"
                                  title="اختر كإجابة صحيحة"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-600 mb-2">
                                  الإجابة {String.fromCharCode(65 + index)}
                                  {answer.isCorrect && (
                                    <span className="ml-2 text-green-600 font-bold">
                                      ✓ صحيحة
                                    </span>
                                  )}
                                </label>
                                <ErrorBoundary isArabic={isArabicBrowser()}>
                                  <SimpleProfessionalMathEditor
                                    value={answer.text}
                                    onChange={(content) =>
                                      handleAnswerChange(index, "text", content)
                                    }
                                    placeholder={`اكتب الإجابة ${String.fromCharCode(
                                      65 + index
                                    )} هنا...`}
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
                          حفظ
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
                        >
                          إلغاء
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
