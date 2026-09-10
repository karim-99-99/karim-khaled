import React, { useState, useRef, useEffect } from 'react';
import * as ReactQuillNamespace from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { isArabicBrowser } from '../utils/language';
import 'katex/dist/katex.min.css';
import ArabicKatexEditor from './ArabicKatexEditor';
// Don't import mathBlot at module level - import it dynamically to avoid initialization issues

// Get ReactQuill and Quill from namespace (react-quill v2.0.0)
const ReactQuill = ReactQuillNamespace.default || ReactQuillNamespace;
const Quill = ReactQuill.Quill;

// DON'T use Custom Image Blot - it causes issues in production builds
// Instead, we'll use Parchment Attributors which are more reliable

// We don't need to register custom attributors either
// Quill already handles HTML content well enough
// We'll rely on HTML persistence and DOM manipulation

// Register Quill modules - don't call this at module level!
let modulesRegistered = false;
let blotFormatterAvailable = false;
let imageDropAvailable = false;

const registerQuillModules = async () => {
  if (modulesRegistered || typeof Quill === 'undefined') return;
  
  try {
    // Try to load BlotFormatter (optional - for image resize/alignment)
    try {
      const BlotFormatterModule = await import('quill-blot-formatter');
      const BlotFormatter = BlotFormatterModule.default || BlotFormatterModule;
      if (BlotFormatter && !Quill.imports?.['modules/blotFormatter']) {
        Quill.register('modules/blotFormatter', BlotFormatter);
        blotFormatterAvailable = true;
        console.log('✅ BlotFormatter loaded successfully');
      }
    } catch (e) {
      console.warn('⚠️ BlotFormatter not available (image resize/align disabled):', e.message);
    }
    
    // Try to load ImageDrop (optional - for drag & drop)
    try {
      const ImageDropModule = await import('quill-image-drop-and-paste');
      const ImageDrop = ImageDropModule.default || ImageDropModule;
      if (ImageDrop && !Quill.imports?.['modules/imageDrop']) {
        Quill.register('modules/imageDrop', ImageDrop);
        imageDropAvailable = true;
        console.log('✅ ImageDrop loaded successfully');
      }
    } catch (e) {
      console.warn('⚠️ ImageDrop not available (drag & drop disabled):', e.message);
    }
    
    modulesRegistered = true;
  } catch (e) {
    console.warn('Failed to register Quill modules:', e);
  }
};

// DON'T call registerQuillModules here - it will be called in useEffect

// Math Blot handles all rendering - no need for manual rendering

const SimpleProfessionalMathEditor = ({ value, onChange, placeholder }) => {
  const [showMathModal, setShowMathModal] = useState(false);
  const [mathValue, setMathValue] = useState('');
  const [editingMathIndex, setEditingMathIndex] = useState(null); // Track which equation is being edited
  const [isEditorReady, setIsEditorReady] = useState(false); // Track editor readiness
  const quillRef = useRef(null);
  const [isRTL, setIsRTL] = useState(() => {
    try {
      const saved = localStorage.getItem('mathEditorRTL');
      if (saved == null || saved === '') return true;
      return !!JSON.parse(saved);
    } catch {
      return true;
    }
  });

  // Ensure modules and MathBlot are registered
  useEffect(() => {
    let mounted = true;
    
    const initializeEditor = async () => {
      try {
        // Ensure Quill instance is available first
        if (typeof Quill === 'undefined' || !Quill.import || !Quill.register) {
          if (mounted) {
            setTimeout(initializeEditor, 100);
          }
          return;
        }
        
        // Register Quill modules + Arabic font/size whitelist
        await registerQuillModules();
        try {
          const FontAttributor = Quill.import('formats/font');
          FontAttributor.whitelist = ['cairo', 'tajawal', 'amiri', 'arial'];
          Quill.register(FontAttributor, true);
        } catch (fontErr) {
          console.warn('Could not register Quill fonts:', fontErr);
        }
        
        // Wait for modules to be ready
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Import and register MathBlot - but don't fail if it doesn't work
        try {
          const mathBlotModule = await import('../components/mathBlot');
          
          if (!mounted) return;
          
          // Set Quill instance
          if (mathBlotModule && mathBlotModule.setQuillInstance) {
            mathBlotModule.setQuillInstance(Quill);
          }
          
          // Try to register MathBlot
          if (mathBlotModule && mathBlotModule.registerMathBlot) {
            const success = mathBlotModule.registerMathBlot();
            if (!success) {
              console.warn('MathBlot registration failed - math equations will not be available');
              // Continue anyway - editor will work without math support
            }
          }
        } catch (mathError) {
          console.error('Failed to load MathBlot module:', mathError);
          // Continue anyway - editor will work without math equations
        }
        
        // Mark editor as ready regardless of MathBlot status
        if (mounted) {
          setIsEditorReady(true);
        }
      } catch (e) {
        console.error('Failed to initialize editor:', e);
        if (mounted) {
          setTimeout(initializeEditor, 500);
        }
      }
    };
    
    const timeout = setTimeout(initializeEditor, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // Quill toolbar with image support
  // Build modules config dynamically based on available features
  const modules = React.useMemo(() => {
    const config = {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        [{ 'font': ['cairo', 'tajawal', 'amiri', 'arial'] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [
          '#14212b', '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
          '#0f766e', '#2563eb', '#7c3aed', '#db2777', '#4b5563',
        ] }, { 'background': [
          '#ffffff', '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7',
          '#ccfbf1', '#dbeafe', '#ede9fe', '#fce7f3', '#f3f4f6',
        ] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        [{ 'direction': 'rtl' }],
        ['link', 'image'], // ⚠️ زر الصورة موجود هنا / Image button is here
        ['clean']
      ],
    };
    
    // Add blotFormatter only if available (for image resize and alignment)
    if (blotFormatterAvailable) {
      config.blotFormatter = {
        overlay: {
          style: {
            border: '2px solid #3b82f6',
          }
        },
        align: {
          icons: {
            left: `
              <svg viewBox="0 0 18 18">
                <line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"></line>
                <line class="ql-stroke" x1="3" x2="13" y1="14" y2="14"></line>
                <line class="ql-stroke" x1="3" x2="9" y1="4" y2="4"></line>
              </svg>
            `,
            center: `
              <svg viewBox="0 0 18 18">
                <line class="ql-stroke" x1="15" x2="3" y1="9" y2="9"></line>
                <line class="ql-stroke" x1="14" x2="4" y1="14" y2="14"></line>
                <line class="ql-stroke" x1="12" x2="6" y1="4" y2="4"></line>
              </svg>
            `,
            right: `
              <svg viewBox="0 0 18 18">
                <line class="ql-stroke" x1="15" x2="3" y1="9" y2="9"></line>
                <line class="ql-stroke" x1="15" x2="5" y1="14" y2="14"></line>
                <line class="ql-stroke" x1="15" x2="9" y1="4" y2="4"></line>
              </svg>
            `,
          },
        },
      };
    }
    
    // Add imageDrop only if available (for drag & drop)
    if (imageDropAvailable) {
      config.imageDrop = true;
    }
    
    return config;
  }, []);

  const formats = [
    'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'align',
    'direction', 'link', 'image', 'math'
  ];

  // Custom image handler - handle image uploads
  useEffect(() => {
    if (!quillRef.current || !isEditorReady) return;
    
    try {
      const editor = quillRef.current.getEditor();
      if (!editor) return;
      
      const toolbar = editor.getModule('toolbar');
      if (!toolbar) return;
      
      toolbar.addHandler('image', () => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');
      input.click();

      input.onchange = () => {
        const file = input.files[0];
        if (file) {
          // Check file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            alert(isArabicBrowser() 
              ? 'حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت' 
              : 'Image too large. Maximum size is 5MB');
            return;
          }

          // Convert to base64
          const reader = new FileReader();
          reader.onload = (e) => {
            const imageUrl = e.target.result;
            const range = editor.getSelection(true);
            
            // Insert image - blotFormatter will handle resize and alignment
            editor.insertEmbed(range.index, 'image', imageUrl);
            editor.setSelection(range.index + 1);
            
            // Update onChange
            if (onChange) {
              onChange(editor.root.innerHTML);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      });
    } catch (error) {
      console.error('Error setting up image handler:', error);
    }
  }, [onChange, isEditorReady]);

  // Track blotFormatter changes and save them
  useEffect(() => {
    if (!quillRef.current || !isEditorReady) return;
    
    try {
      const editor = quillRef.current.getEditor();
      if (!editor) return;

      let saveTimeout = null;
      
      const saveContent = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          if (onChange && quillRef.current) {
            try {
              const content = quillRef.current.getEditor().root.innerHTML;
              onChange(content);
            } catch (err) {
              console.error('Error saving content:', err);
            }
          }
        }, 150);
      };

      // Listen to text-change events
      const handleTextChange = (delta, oldDelta, source) => {
        if (source === 'user' || source === 'api') {
          saveContent();
        }
      };

      editor.on('text-change', handleTextChange);

      // MutationObserver to track ALL changes on images
      const observer = new MutationObserver((mutations) => {
        let needsSave = false;
        
        mutations.forEach((mutation) => {
          const target = mutation.target;
          
          // Check for attribute changes on images
          if (mutation.type === 'attributes' && target.tagName === 'IMG') {
            needsSave = true;
          }
          
          // Check for child changes that might contain images
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.tagName === 'IMG' || (node.querySelector && node.querySelector('img'))) {
                needsSave = true;
              }
            });
          }
        });

        if (needsSave) {
          saveContent();
        }
      });

      // Start observing with comprehensive options
      observer.observe(editor.root, {
        attributes: true,
        attributeOldValue: true,
        childList: true,
        subtree: true,
        characterData: false
      });

      // Also listen to DOM events on images for immediate feedback
      const handleImageEvent = (e) => {
        if (e.target.tagName === 'IMG') {
          saveContent();
        }
      };

      editor.root.addEventListener('mouseup', handleImageEvent);
      editor.root.addEventListener('touchend', handleImageEvent);
      
      // Listen for clicks outside images (when deselecting)
      const handleClickOutside = (e) => {
        if (!e.target.closest('.blot-formatter__overlay')) {
          // User clicked outside - save any pending changes
          saveContent();
        }
      };
      
      document.addEventListener('click', handleClickOutside);

      return () => {
        editor.off('text-change', handleTextChange);
        observer.disconnect();
        editor.root.removeEventListener('mouseup', handleImageEvent);
        editor.root.removeEventListener('touchend', handleImageEvent);
        document.removeEventListener('click', handleClickOutside);
        if (saveTimeout) clearTimeout(saveTimeout);
      };
    } catch (error) {
      console.error('Error setting up change tracker:', error);
    }
  }, [onChange, isEditorReady]);

  // Insert or update math equation as Quill Embed (Math Blot)
  const insertMath = () => {
    const currentMathValue = (mathValue || '').trim();
    
    // Check if we have a valid value
    if (!currentMathValue || !currentMathValue.trim()) {
      alert(isArabicBrowser() 
        ? 'الرجاء كتابة معادلة رياضية قبل الإدراج' 
        : 'Please enter a math equation before inserting');
      return;
    }
    
    if (!quillRef.current) {
      setShowMathModal(false);
      return;
    }
    
    // Update state with final value
    setMathValue(currentMathValue);

    try {
      const editor = quillRef.current.getEditor();
      
      // Pass as JSON string to avoid [object Object] issue
      const mathData = JSON.stringify({
        latex: currentMathValue,
        rtl: isRTL
      });
      
      if (editingMathIndex !== null) {
        // Editing existing equation - replace it
        const mathBlots = Array.from(editor.root.querySelectorAll('span.math-equation[data-latex]'));
        if (mathBlots[editingMathIndex]) {
          const blotNode = mathBlots[editingMathIndex];
          try {
            const blot = Quill.find(blotNode, true);
            if (blot) {
              const index = editor.getIndex(blot);
              // Delete old equation and insert new one with RTL flag
              editor.deleteText(index, blot.length(), 'user');
              editor.insertEmbed(index, 'math', mathData, 'user');
              editor.setSelection(index + 1);
            }
          } catch (error) {
            console.error('Error replacing equation:', error);
            // Fallback: remove old node and insert at same position
            const range = editor.getSelection();
            if (range) {
              blotNode.remove();
              editor.insertEmbed(range.index, 'math', mathData, 'user');
              editor.setSelection(range.index + 1);
            }
          }
        }
        setEditingMathIndex(null);
      } else {
        // Inserting new equation with RTL flag
        const range = editor.getSelection(true) || { index: editor.getLength() };
        editor.insertEmbed(range.index, 'math', mathData, 'user');
        editor.setSelection(range.index + 1);
      }
      
      // Update onChange
      setTimeout(() => {
        if (onChange && quillRef.current) {
          try {
            const newContent = quillRef.current.getEditor().root.innerHTML;
            onChange(newContent);
          } catch (err) {
            console.error('Error updating content:', err);
          }
        }
      }, 50);

      // Close modal and reset
      setShowMathModal(false);
      setMathValue('');
      setEditingMathIndex(null);
    } catch (error) {
      console.error('Error inserting math:', error);
      // Don't close modal on error so user can try again
      alert(isArabicBrowser() 
        ? `خطأ في إدراج المعادلة: ${error.message}. حاول مرة أخرى.` 
        : `Error inserting equation: ${error.message}. Please try again.`);
    }
  };

  // Handle click on math equation (Word-like: double-click to edit)
  useEffect(() => {
    if (!quillRef.current || !isEditorReady) return;

    try {
      const editor = quillRef.current.getEditor();
      if (!editor || !editor.root) return;
      
      const root = editor.root;

    const handleMathClick = (e) => {
      const mathElement = e.target.closest('.math-equation[data-latex]');
      if (mathElement) {
        e.preventDefault();
        e.stopPropagation();
        
        // Get LaTeX value and RTL flag
        const latex = mathElement.getAttribute('data-latex');
        const rtlAttr = mathElement.getAttribute('data-rtl');
        const isRTLValue = rtlAttr === 'true' || rtlAttr === null; // Default to true if not set
        
        if (latex) {
          // Find index of this equation in all math equations
          const allMathElements = Array.from(root.querySelectorAll('.math-equation[data-latex]'));
          const index = allMathElements.indexOf(mathElement);
          
          setEditingMathIndex(index);
          setMathValue(latex);
          setIsRTL(isRTLValue); // Update RTL state to match equation
          setShowMathModal(true);
        }
      }
    };

      // Use event delegation for click handling
      root.addEventListener('click', handleMathClick);
      root.addEventListener('dblclick', handleMathClick); // Also support double-click like Word

      return () => {
        root.removeEventListener('click', handleMathClick);
        root.removeEventListener('dblclick', handleMathClick);
      };
    } catch (error) {
      console.error('Error setting up math click handler:', error);
    }
  }, [value, isEditorReady]);

  // Toggle RTL/LTR and re-render all equations with KaTeX4Arabic
  const toggleRTL = () => {
    const newRTL = !isRTL;
    setIsRTL(newRTL);
    localStorage.setItem('mathEditorRTL', JSON.stringify(newRTL));
    
    // Re-render all existing equations with new RTL setting
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const mathBlots = Array.from(editor.root.querySelectorAll('span.math-equation[data-latex]'));
      
      // Store all equations with their positions
      const equations = [];
      mathBlots.forEach((blotNode) => {
        const latex = blotNode.getAttribute('data-latex');
        if (latex) {
          try {
            const blot = Quill.find(blotNode, true);
            if (blot) {
              const index = editor.getIndex(blot);
              equations.push({ index, latex, blot });
            }
          } catch (error) {
            console.error('Error finding blot:', error);
          }
        }
      });
      
      // Sort by index (reverse order to avoid index shifting)
      equations.sort((a, b) => b.index - a.index);
      
      // Replace all equations with new RTL setting
      equations.forEach(({ index, latex, blot }) => {
        try {
          editor.deleteText(index, blot.length(), 'user');
          const mathData = JSON.stringify({ latex, rtl: newRTL });
          editor.insertEmbed(index, 'math', mathData, 'user');
        } catch (error) {
          console.error('Error updating equation RTL:', error);
        }
      });

      setTimeout(() => {
        if (onChange && quillRef.current) {
          const newContent = quillRef.current.getEditor().root.innerHTML;
          onChange(newContent);
        }
      }, 50);
    }
  };

  const TEXT_COLORS = [
    { label: isArabicBrowser() ? 'أسود' : 'Black', value: '#14212b' },
    { label: isArabicBrowser() ? 'أحمر' : 'Red', value: '#dc2626' },
    { label: isArabicBrowser() ? 'برتقالي' : 'Orange', value: '#ea580c' },
    { label: isArabicBrowser() ? 'أخضر' : 'Green', value: '#16a34a' },
    { label: isArabicBrowser() ? 'أزرق' : 'Blue', value: '#2563eb' },
    { label: isArabicBrowser() ? 'بنفسجي' : 'Purple', value: '#7c3aed' },
  ];

  const applyEditorColor = (color, kind = 'color') => {
    if (!quillRef.current) return;
    try {
      const editor = quillRef.current.getEditor();
      editor.focus();
      editor.format(kind, color || false);

      const range = editor.getSelection(true);
      if (range) {
        const selected = Array.from(
          editor.root.querySelectorAll('.math-equation, .katex-arabic')
        ).filter((el) => {
          try {
            const sel = editor.getSelection();
            if (!sel) return false;
            const blot = Quill.find(el, true);
            if (!blot) return false;
            const index = editor.getIndex(blot);
            return index >= sel.index && index < sel.index + Math.max(sel.length, 1);
          } catch {
            return false;
          }
        });
        selected.forEach((el) => {
          const host = el.closest('.math-equation') || el;
          if (kind === 'color') {
            host.style.color = color || '';
            host.style.setProperty('--ka-color', color || 'inherit');
          } else {
            host.style.backgroundColor = color || '';
          }
        });
      }

      if (onChange) onChange(editor.root.innerHTML);
    } catch (err) {
      console.error('Error applying color:', err);
    }
  };

  return (
    <div className="simple-professional-math-editor">
      {/* Math Button and RTL/LTR Toggle */}
      <div className="mb-3 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setEditingMathIndex(null); // Reset editing state
            setShowMathModal(true);
            setMathValue('');
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="text-2xl">𝑓(𝑥)</span>
          <span>{isArabicBrowser() ? 'إضافة معادلة رياضية' : 'Add Math Equation'}</span>
        </button>
        
        
        {/* RTL/LTR Toggle Button - Always Visible */}
        <button
          type="button"
          onClick={toggleRTL}
          className={`px-5 py-3 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 shadow-lg transform hover:scale-105 ${
            isRTL 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700' 
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
          }`}
          title={isRTL 
            ? (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع الإنجليزي (LTR)' : 'Click to switch to LTR mode') 
            : (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع العربي (RTL)' : 'Click to switch to RTL mode')
          }
        >
          <span className="text-2xl">
            {isRTL ? '🇸🇦' : '🇬🇧'}
          </span>
          <span className="text-base font-black">
            {isRTL ? 'RTL' : 'LTR'}
          </span>
          <span className="text-xs opacity-90">
            {isRTL 
              ? (isArabicBrowser() ? '(الأسس على اليسار)' : '(Powers on left)')
              : (isArabicBrowser() ? '(عرض طبيعي)' : '(Normal display)')
            }
          </span>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <span className="text-sm font-bold text-gray-700">
          {isArabicBrowser() ? 'لون الخط' : 'Text color'}
        </span>
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => applyEditorColor(c.value, 'color')}
            className="h-7 w-7 rounded-full border border-gray-300 shadow-sm hover:scale-110 transition"
            style={{ backgroundColor: c.value }}
            aria-label={c.label}
          />
        ))}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <span>{isArabicBrowser() ? 'مخصص' : 'Custom'}</span>
          <input
            type="color"
            defaultValue="#14212b"
            onChange={(e) => applyEditorColor(e.target.value, 'color')}
            className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0"
            title={isArabicBrowser() ? 'اختر لون الخط' : 'Choose text color'}
          />
        </label>
        <button
          type="button"
          onClick={() => applyEditorColor(false, 'color')}
          className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50"
        >
          {isArabicBrowser() ? 'إلغاء اللون' : 'Clear color'}
        </button>
        <span className="w-px h-6 bg-gray-200 hidden sm:block" />
        <span className="text-sm font-bold text-gray-700">
          {isArabicBrowser() ? 'تمييز' : 'Highlight'}
        </span>
        <input
          type="color"
          defaultValue="#fef9c3"
          onChange={(e) => applyEditorColor(e.target.value, 'background')}
          className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0"
          title={isArabicBrowser() ? 'لون الخلفية' : 'Highlight color'}
        />
        <button
          type="button"
          onClick={() => applyEditorColor(false, 'background')}
          className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50"
        >
          {isArabicBrowser() ? 'إلغاء التمييز' : 'Clear highlight'}
        </button>
      </div>

      {isEditorReady ? (
        <ReactQuill
          ref={quillRef}
          value={value || ''}
          onChange={(content) => onChange && onChange(content)}
          modules={modules}
          formats={formats}
          placeholder={placeholder || (isArabicBrowser() ? 'اكتب السؤال هنا...' : 'Write question here...')}
          theme="snow"
          dir={isArabicBrowser() ? 'rtl' : 'ltr'}
        />
      ) : (
        <div className="border-2 border-gray-300 rounded-lg p-8 min-h-[400px] flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">
              {isArabicBrowser() ? 'جاري تحميل المحرر...' : 'Loading editor...'}
            </p>
          </div>
        </div>
      )}

      {/* Math Modal */}
      {showMathModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowMathModal(false)}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <span className="text-3xl">𝑓(𝑥)</span>
                  <span>
                    {editingMathIndex !== null 
                      ? (isArabicBrowser() ? 'تعديل المعادلة الرياضية' : 'Edit Math Equation')
                      : (isArabicBrowser() ? 'محرر المعادلات الرياضية' : 'Math Equation Editor')
                    }
                  </span>
                </h3>
                <div className="flex items-center gap-3">
                  {/* RTL/LTR Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleRTL}
                    className={`px-5 py-2.5 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 shadow-lg transform hover:scale-105 ${
                      isRTL 
                        ? 'bg-white text-blue-700 hover:bg-blue-50' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                    title={isRTL 
                      ? (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع الإنجليزي' : 'Click to switch to LTR') 
                      : (isArabicBrowser() ? 'اضغط للتحويل إلى الوضع العربي' : 'Click to switch to RTL')
                    }
                  >
                    <span className="text-xl">
                      {isRTL ? '🇸🇦' : '🇬🇧'}
                    </span>
                    <span className="text-base font-black">
                      {isRTL ? 'RTL' : 'LTR'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMathModal(false)}
                    className="text-white hover:bg-white hover:text-blue-700 rounded-full w-10 h-10 flex items-center justify-center text-3xl transition font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <p className={`flex-1 text-sm px-3 py-2 rounded ${
                  isRTL ? 'bg-white bg-opacity-20 text-white font-bold' : 'bg-blue-800 bg-opacity-30 text-blue-100'
                }`}>
                  {isRTL
                    ? (isArabicBrowser() 
                      ? '🇸🇦 وضع عربي: الأسس على اليسار (مثال: ٢³ → ³٢)' 
                      : '🇸🇦 RTL Mode: Powers on left (e.g. 2³ → ³٢)')
                    : (isArabicBrowser() 
                      ? '🇬🇧 وضع إنجليزي: عرض طبيعي (مثال: ٢³)' 
                      : '🇬🇧 LTR Mode: Standard display (e.g. 2³)')
                  }
                </p>
              </div>
            </div>

            <div className="p-6">
              <ArabicKatexEditor
                value={mathValue}
                onChange={setMathValue}
                rtl={isRTL}
              />

              <div className="flex gap-4 justify-end pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowMathModal(false);
                    setMathValue('');
                    setEditingMathIndex(null);
                  }}
                  className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all shadow hover:shadow-md"
                >
                  {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={insertMath}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  ✓ {editingMathIndex !== null 
                    ? (isArabicBrowser() ? 'حفظ التعديلات' : 'Save Changes')
                    : (isArabicBrowser() ? 'إدراج المعادلة' : 'Insert Equation')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .simple-professional-math-editor .ql-container {
          font-family: inherit;
          position: relative !important;
        }
        
        .simple-professional-math-editor .ql-editor {
          min-height: 400px;
          font-size: 17px;
          line-height: 1.8;
          position: relative !important;
        }
        
        /* Image alignment styles */
        .simple-professional-math-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          cursor: pointer;
        }
        
        .simple-professional-math-editor .ql-editor img[style*="float: left"],
        .simple-professional-math-editor .ql-editor img[style*="float:left"] {
          float: left !important;
          margin: 5px 10px 5px 0 !important;
        }
        
        .simple-professional-math-editor .ql-editor img[style*="float: right"],
        .simple-professional-math-editor .ql-editor img[style*="float:right"] {
          float: right !important;
          margin: 5px 0 5px 10px !important;
        }
        
        .simple-professional-math-editor .ql-editor img[style*="display: block"],
        .simple-professional-math-editor .ql-editor img[style*="display:block"] {
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        
        /* BlotFormatter overlay styling */
        .blot-formatter__overlay {
          z-index: 10;
        }
        
        /* Math equations styling */
        .simple-professional-math-editor .ql-editor .math-equation {
          display: inline-block;
          vertical-align: middle;
          margin: 0 4px;
          padding: 2px 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .simple-professional-math-editor .ql-editor .math-equation:hover {
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 4px;
        }

        .simple-professional-math-editor .ql-editor .katex-arabic {
          overflow: visible;
        }

        .simple-professional-math-editor .ql-font-cairo {
          font-family: Cairo, sans-serif;
        }
        .simple-professional-math-editor .ql-font-tajawal {
          font-family: Tajawal, sans-serif;
        }
        .simple-professional-math-editor .ql-font-amiri {
          font-family: Amiri, serif;
        }
        .simple-professional-math-editor .ql-font-arial {
          font-family: Arial, sans-serif;
        }

        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-label::before,
        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-item::before {
          content: 'خط';
        }
        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="cairo"]::before,
        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="cairo"]::before {
          content: 'Cairo';
          font-family: Cairo, sans-serif;
        }
        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="tajawal"]::before,
        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="tajawal"]::before {
          content: 'Tajawal';
          font-family: Tajawal, sans-serif;
        }
        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="amiri"]::before,
        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="amiri"]::before {
          content: 'Amiri';
          font-family: Amiri, serif;
        }
        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="arial"]::before,
        .simple-professional-math-editor .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="arial"]::before {
          content: 'Arial';
          font-family: Arial, sans-serif;
        }

        .simple-professional-math-editor .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .simple-professional-math-editor .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          content: 'عادي';
        }
        .simple-professional-math-editor .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="small"]::before,
        .simple-professional-math-editor .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="small"]::before {
          content: 'صغير';
        }
        .simple-professional-math-editor .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="large"]::before,
        .simple-professional-math-editor .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="large"]::before {
          content: 'كبير';
        }
        .simple-professional-math-editor .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="huge"]::before,
        .simple-professional-math-editor .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="huge"]::before {
          content: 'أكبر';
        }
      `}</style>
    </div>
  );
};

export default SimpleProfessionalMathEditor;
