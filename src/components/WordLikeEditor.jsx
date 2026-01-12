import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { isArabicBrowser } from '../utils/language';

// Custom Image Blot for draggable/resizable images
// We'll handle images post-insertion instead of overriding the format

const WordLikeEditor = ({ value, onChange, placeholder, onInsertArabicNumeral, onConvertSelectionToArabic, showForm }) => {
  const quillRef = useRef(null);
  const editorContainerRef = useRef(null);
  const [activeEquationTab, setActiveEquationTab] = useState('design');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageProperties, setShowImageProperties] = useState(false);
  const [editorValue, setEditorValue] = useState(() => {
    return value !== null && value !== undefined ? String(value) : '';
  });
  const [imageProperties, setImageProperties] = useState({
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
    opacity: 100,
    float: 'none',
  });

  // Track if user is actively typing to prevent value sync conflicts
  const isTypingRef = useRef(false);
  const isInitialMount = useRef(true);
  
  // Sync external value with internal state - only when value changes from outside
  useEffect(() => {
    // Don't sync if user is currently typing or on initial mount
    if (isTypingRef.current && !isInitialMount.current) return;
    
    const newValue = value !== null && value !== undefined ? String(value) : '';
    // Only update if value actually changed from external source
    if (newValue !== editorValue) {
      setEditorValue(newValue);
    }
    
    isInitialMount.current = false;
  }, [value]);
  
  // Ensure editor is properly initialized and focusable
  useEffect(() => {
    if (!quillRef.current) return;
    
    // Wait for ReactQuill to fully initialize
    const initTimer = setTimeout(() => {
      try {
        const quill = quillRef.current.getEditor();
        if (!quill) return;
        
        const editor = quill.root;
        if (!editor) return;
        
        // Ensure editor is editable and focusable
        editor.setAttribute('contenteditable', 'true');
        editor.setAttribute('tabindex', '0');
        editor.style.cursor = 'text';
        editor.style.pointerEvents = 'auto';
        editor.style.userSelect = 'text';
        editor.style.outline = 'none';
        
        // Make absolutely sure nothing is blocking interaction
        const editorContainer = editor.parentElement;
        if (editorContainer) {
          editorContainer.style.pointerEvents = 'auto';
        }
        
      } catch (error) {
        console.error('Error initializing editor:', error);
      }
    }, 500);
    
    return () => clearTimeout(initTimer);
  }, [showForm]); // Re-run when form is shown/hidden

  // Expose Quill instance to parent for Arabic numeral insertion
  useEffect(() => {
    if (onInsertArabicNumeral && quillRef.current) {
      // Store the insert function that parent can use
      window.wordLikeEditorInsertArabic = (num) => {
        if (quillRef.current) {
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          if (range) {
            const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            if (num >= 0 && num <= 9) {
              quill.insertText(range.index, arabicNumerals[num]);
              quill.setSelection(range.index + 1);
            }
          }
        }
      };
      
      window.wordLikeEditorConvertSelection = () => {
        if (quillRef.current && onConvertSelectionToArabic) {
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          if (range && range.length > 0) {
            const selectedText = quill.getText(range.index, range.length);
            const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
            const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            const arabicText = selectedText.replace(/[0-9]/g, (digit) => {
              const index = westernNumerals.indexOf(digit);
              return index !== -1 ? arabicNumerals[index] : digit;
            });
            quill.deleteText(range.index, range.length);
            quill.insertText(range.index, arabicText);
            quill.setSelection(range.index, arabicText.length);
            setTimeout(() => {
              const newContent = quill.root.innerHTML;
              onChange(newContent);
            }, 10);
          }
        }
      };
    }
  }, [onInsertArabicNumeral, onConvertSelectionToArabic, onChange]);

  // Math symbols organized like Word's equation ribbon
  const equationSymbols = {
    operators: [
      { symbol: '±', latex: '\\pm', label: 'Plus-minus' },
      { symbol: '∓', latex: '\\mp', label: 'Minus-plus' },
      { symbol: '×', latex: '\\times', label: 'Times' },
      { symbol: '÷', latex: '\\div', label: 'Divide' },
      { symbol: '∙', latex: '\\cdot', label: 'Dot' },
      { symbol: '=', latex: '=', label: 'Equals' },
      { symbol: '≠', latex: '\\neq', label: 'Not equal' },
      { symbol: '≈', latex: '\\approx', label: 'Approx' },
      { symbol: '≡', latex: '\\equiv', label: 'Identical' },
      { symbol: '<', latex: '<', label: 'Less than' },
      { symbol: '>', latex: '>', label: 'Greater than' },
      { symbol: '≤', latex: '\\leq', label: 'Less or equal' },
      { symbol: '≥', latex: '\\geq', label: 'Greater or equal' },
    ],
    scripts: [
      { symbol: 'x²', latex: 'x^{2}', label: 'x squared' },
      { symbol: 'x₁', latex: 'x_{1}', label: 'x sub 1' },
      { symbol: 'xⁿ', latex: 'x^{n}', label: 'x to power n' },
      { symbol: 'eˣ', latex: 'e^{x}', label: 'e to x' },
    ],
    fractions: [
      { symbol: '½', latex: '\\frac{1}{2}', label: 'Half' },
      { symbol: '⅓', latex: '\\frac{1}{3}', label: 'One third' },
      { symbol: '¼', latex: '\\frac{1}{4}', label: 'One quarter' },
      { symbol: '⅔', latex: '\\frac{2}{3}', label: 'Two thirds' },
      { symbol: '¾', latex: '\\frac{3}{4}', label: 'Three quarters' },
    ],
    radicals: [
      { symbol: '√', latex: '\\sqrt{x}', label: 'Square root' },
      { symbol: '∛', latex: '\\sqrt[3]{x}', label: 'Cube root' },
      { symbol: '∜', latex: '\\sqrt[4]{x}', label: 'Fourth root' },
    ],
    integrals: [
      { symbol: '∫', latex: '\\int', label: 'Integral' },
      { symbol: '∬', latex: '\\iint', label: 'Double integral' },
      { symbol: '∭', latex: '\\iiint', label: 'Triple integral' },
      { symbol: '∮', latex: '\\oint', label: 'Contour integral' },
    ],
    sums: [
      { symbol: '∑', latex: '\\sum', label: 'Sum' },
      { symbol: '∏', latex: '\\prod', label: 'Product' },
      { symbol: '∐', latex: '\\coprod', label: 'Coproduct' },
    ],
    greek: [
      { symbol: 'α', latex: '\\alpha', label: 'Alpha' },
      { symbol: 'β', latex: '\\beta', label: 'Beta' },
      { symbol: 'γ', latex: '\\gamma', label: 'Gamma' },
      { symbol: 'δ', latex: '\\delta', label: 'Delta' },
      { symbol: 'ε', latex: '\\epsilon', label: 'Epsilon' },
      { symbol: 'θ', latex: '\\theta', label: 'Theta' },
      { symbol: 'λ', latex: '\\lambda', label: 'Lambda' },
      { symbol: 'μ', latex: '\\mu', label: 'Mu' },
      { symbol: 'π', latex: '\\pi', label: 'Pi' },
      { symbol: 'σ', latex: '\\sigma', label: 'Sigma' },
      { symbol: 'φ', latex: '\\phi', label: 'Phi' },
      { symbol: 'ω', latex: '\\omega', label: 'Omega' },
      { symbol: 'Δ', latex: '\\Delta', label: 'Delta' },
      { symbol: 'Ω', latex: '\\Omega', label: 'Omega' },
    ],
    sets: [
      { symbol: '∈', latex: '\\in', label: 'Element of' },
      { symbol: '∉', latex: '\\notin', label: 'Not element of' },
      { symbol: '⊂', latex: '\\subset', label: 'Subset' },
      { symbol: '⊃', latex: '\\supset', label: 'Superset' },
      { symbol: '∪', latex: '\\cup', label: 'Union' },
      { symbol: '∩', latex: '\\cap', label: 'Intersection' },
      { symbol: '∅', latex: '\\emptyset', label: 'Empty set' },
      { symbol: '∞', latex: '\\infty', label: 'Infinity' },
    ],
  };

  const equationStructures = [
    { name: isArabicBrowser() ? 'كسر' : 'Fraction', latex: '\\frac{a}{b}', icon: 'a/b' },
    { name: isArabicBrowser() ? 'جذر' : 'Radical', latex: '\\sqrt{x}', icon: '√x' },
    { name: isArabicBrowser() ? 'قوة' : 'Script', latex: 'x^{n}', icon: 'xⁿ' },
    { name: isArabicBrowser() ? 'تكامل' : 'Integral', latex: '\\int_{a}^{b}', icon: '∫' },
    { name: isArabicBrowser() ? 'مجموع' : 'Sum', latex: '\\sum_{i=1}^{n}', icon: '∑' },
    { name: isArabicBrowser() ? 'مصفوفة' : 'Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', icon: '[ ]' },
    { name: isArabicBrowser() ? 'أقواس' : 'Bracket', latex: '\\left( x \\right)', icon: '( )' },
    { name: isArabicBrowser() ? 'دالة' : 'Function', latex: '\\sin(x)', icon: 'sin' },
  ];

  // Handle image insertion
  const handleImageInsert = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert(isArabicBrowser() ? 'حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت' : 'Image size too large. Maximum 5MB');
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection(true);
            const index = range ? range.index : quill.getLength() - 1;
            
            // Insert image as base64
            quill.insertEmbed(index, 'image', reader.result);
            
            // After insertion, modify the image to make it draggable
            setTimeout(() => {
              const images = quill.root.querySelectorAll('img');
              const lastImage = images[images.length - 1];
              if (lastImage) {
                lastImage.classList.add('draggable-image');
                Object.assign(lastImage.style, {
                  maxWidth: '400px',
                  height: 'auto',
                  display: 'inline-block',
                  margin: '10px',
                  cursor: 'move',
                  position: 'relative'
                });
              }
              const newContent = quill.root.innerHTML;
              onChange(newContent);
              // Setup handlers after a delay to ensure image is fully rendered
              setTimeout(() => {
                setupImageHandlers();
              }, 200);
            }, 100);
          }
        };
        reader.readAsDataURL(file);
      }
    };
  }, [onChange]);

  // Configure Quill modules
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link'],
        ['image'],
        ['clean']
      ],
      handlers: {
        image: handleImageInsert
      }
    },
  }), [handleImageInsert]);

  // Insert math equation into editor
  const insertMathEquation = useCallback((latex) => {
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
          
          // Create a span with the rendered math
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          const mathElement = tempDiv.firstChild;
          mathElement.setAttribute('data-latex', latex);
          mathElement.classList.add('inline-math');
          mathElement.style.display = 'inline-block';
          
          // Insert into Quill
          const clipboard = quill.clipboard;
          const delta = clipboard.convert(mathElement);
          
          quill.updateContents(
            new Quill.import('parchment').Delta()
              .retain(range.index)
              .concat(delta),
            'user'
          );
          
          // Update content
          setTimeout(() => {
            const newContent = quill.root.innerHTML;
            onChange(newContent);
          }, 10);
        } catch (error) {
          console.error('Error inserting math:', error);
        }
      }
    }
  }, [onChange]);

  // Setup draggable and resizable handlers for images
  const setupImageHandlers = useCallback(() => {
    if (!quillRef.current) return;
    
    try {
      const editor = quillRef.current.getEditor().root;
      const images = editor.querySelectorAll('img');
      
      images.forEach((img) => {
        // Skip if already processed
        if (img.dataset.processed === 'true') return;
        img.dataset.processed = 'true';
        img.classList.add('draggable-image');
        
        // Add drag functionality
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        let dragStartTimer;
        
        img.style.cursor = 'pointer';
        img.style.position = 'relative';
        img.style.display = 'inline-block';
        
        // Make image selectable on click - only if clicking directly on image, not text
        const handleClick = (e) => {
          // Only handle if clicking directly on the image, not on resize handles
          if (e.target !== img || e.target.classList.contains('resize-handle')) {
            return;
          }
          
          // Don't prevent default if just selecting - allow text editing to continue
          // Only show properties panel on double-click or right-click
          if (e.detail === 1) {
            // Single click - don't interfere with text selection
            return;
          }
          
          e.preventDefault();
          e.stopPropagation();
          setSelectedImage(img);
          setShowImageProperties(true);
          
          // Update properties from image
          const computedStyle = window.getComputedStyle(img);
          setImageProperties({
            borderRadius: parseInt(computedStyle.borderRadius) || 0,
            borderWidth: parseInt(computedStyle.borderWidth) || 0,
            borderColor: computedStyle.borderColor || '#000000',
            opacity: Math.round((parseFloat(computedStyle.opacity) || 1) * 100),
            float: computedStyle.float || 'none',
          });
        };
        
        // Use mousedown with right-click or double-click for properties
        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClick({ ...e, detail: 2 });
        });
        
        img.addEventListener('dblclick', handleClick);
        
        // Drag functionality - only when holding Alt key + drag on image
        // This is completely optional and won't interfere with normal typing
        const handleMouseDown = (e) => {
          // Only drag if Alt key is pressed AND clicking directly on image
          if (!e.altKey || e.target !== img || e.target.classList.contains('resize-handle')) {
            return; // Allow normal text editing
          }
          
          // Prevent default to start dragging
          e.preventDefault();
          e.stopPropagation();
          
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          
          const rect = img.getBoundingClientRect();
          const editorRect = editor.getBoundingClientRect();
          startLeft = rect.left - editorRect.left;
          startTop = rect.top - editorRect.top;
          
          img.style.position = 'absolute';
          img.style.zIndex = '1000';
          img.style.cursor = 'grabbing';
        };
        
        const handleMouseMove = (e) => {
          if (!isDragging || !img.isConnected) return;
          
          const editorRect = editor.getBoundingClientRect();
          const newLeft = startLeft + (e.clientX - startX);
          const newTop = startTop + (e.clientY - startY);
          
          img.style.left = `${Math.max(0, Math.min(newLeft, editorRect.width - img.offsetWidth))}px`;
          img.style.top = `${Math.max(0, Math.min(newTop, editorRect.height - img.offsetHeight))}px`;
        };
        
        const handleMouseUp = () => {
          if (isDragging) {
            isDragging = false;
            img.style.zIndex = '1';
            
            // Update content after drag
            setTimeout(() => {
              if (quillRef.current) {
                const quill = quillRef.current.getEditor();
                const newContent = quill.root.innerHTML;
                onChange(newContent);
              }
            }, 10);
          }
        };
        
        // Only attach mousedown if Alt key is needed - won't interfere with normal clicks
        img.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Add resize handles
        const addResizeHandles = () => {
          // Remove existing handles for this image
          const existingHandles = img.parentElement?.querySelectorAll('.resize-handle') || [];
          existingHandles.forEach(h => {
            if (h.dataset.imageId === img.dataset.imageId) {
              h.remove();
            }
          });
          
          if (!img.parentElement) return;
          
          // Create unique ID for this image
          if (!img.dataset.imageId) {
            img.dataset.imageId = `img-${Date.now()}-${Math.random()}`;
          }
          
          // Create resize handles
          const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
          handles.forEach(position => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-handle-${position}`;
            handle.dataset.imageId = img.dataset.imageId;
            handle.style.cssText = `
              position: absolute;
              width: 10px;
              height: 10px;
              background: #4285f4;
              border: 2px solid white;
              border-radius: 50%;
              cursor: ${position}-resize;
              z-index: 1001;
              pointer-events: all;
            `;
            
            // Position handle
            const positions = {
              nw: { top: '-5px', left: '-5px' },
              ne: { top: '-5px', right: '-5px' },
              sw: { bottom: '-5px', left: '-5px' },
              se: { bottom: '-5px', right: '-5px' },
              n: { top: '-5px', left: '50%', transform: 'translateX(-50%)' },
              s: { bottom: '-5px', left: '50%', transform: 'translateX(-50%)' },
              e: { right: '-5px', top: '50%', transform: 'translateY(-50%)' },
              w: { left: '-5px', top: '50%', transform: 'translateY(-50%)' },
            };
            
            Object.assign(handle.style, positions[position]);
            
            // Resize functionality
            let isResizing = false;
            let startWidth, startHeight, startX, startY;
            
            const handleResizeMouseDown = (e) => {
              e.preventDefault();
              e.stopPropagation();
              isResizing = true;
              startWidth = img.offsetWidth;
              startHeight = img.offsetHeight;
              startX = e.clientX;
              startY = e.clientY;
            };
            
            const handleResizeMouseMove = (e) => {
              if (!isResizing || !img.isConnected) return;
              
              const deltaX = e.clientX - startX;
              const deltaY = e.clientY - startY;
              
              let newWidth = startWidth;
              let newHeight = startHeight;
              
              if (position.includes('e')) newWidth = startWidth + deltaX;
              if (position.includes('w')) newWidth = startWidth - deltaX;
              if (position.includes('s')) newHeight = startHeight + deltaY;
              if (position.includes('n')) newHeight = startHeight - deltaY;
              
              // Maintain aspect ratio for corner handles
              if (position.length === 2) {
                const aspectRatio = startWidth / startHeight;
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                  newHeight = newWidth / aspectRatio;
                } else {
                  newWidth = newHeight * aspectRatio;
                }
              }
              
              // Minimum size
              newWidth = Math.max(50, newWidth);
              newHeight = Math.max(50, newHeight);
              
              img.style.width = `${newWidth}px`;
              img.style.height = `${newHeight}px`;
            };
            
            const handleResizeMouseUp = () => {
              if (isResizing) {
                isResizing = false;
                
                // Update content after resize
                setTimeout(() => {
                  if (quillRef.current) {
                    const quill = quillRef.current.getEditor();
                    const newContent = quill.root.innerHTML;
                    onChange(newContent);
                  }
                }, 10);
              }
            };
            
            handle.addEventListener('mousedown', handleResizeMouseDown);
            document.addEventListener('mousemove', handleResizeMouseMove);
            document.addEventListener('mouseup', handleResizeMouseUp);
            
            img.parentElement.style.position = 'relative';
            img.parentElement.appendChild(handle);
          });
        };
        
        // Show handles when image is selected
        if (selectedImage === img) {
          addResizeHandles();
        }
        
        // Store cleanup function
        img._cleanup = () => {
          img.removeEventListener('click', handleClick);
          img.removeEventListener('mousedown', handleMouseDown);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      });
    } catch (error) {
      console.error('Error setting up image handlers:', error);
    }
  }, [selectedImage, onChange]);

  // Apply image properties
  const applyImageProperties = useCallback(() => {
    if (selectedImage) {
      selectedImage.style.borderRadius = `${imageProperties.borderRadius}px`;
      selectedImage.style.borderWidth = `${imageProperties.borderWidth}px`;
      selectedImage.style.borderColor = imageProperties.borderColor;
      selectedImage.style.borderStyle = imageProperties.borderWidth > 0 ? 'solid' : 'none';
      selectedImage.style.opacity = imageProperties.opacity / 100;
      selectedImage.style.float = imageProperties.float;
      
      // Update content
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        const newContent = quill.root.innerHTML;
        onChange(newContent);
        setupImageHandlers();
      }
    }
  }, [selectedImage, imageProperties, onChange, setupImageHandlers]);

  // TEMPORARILY DISABLED: Setup image handlers ONLY when images are inserted
  // This is disabled to fix typing issues - will re-enable after confirming editor works
  // useEffect(() => {
  //   if (!quillRef.current) return;
  //   
  //   const quill = quillRef.current.getEditor();
  //   
  //   // Only setup handlers once when editor is ready
  //   const timeoutId = setTimeout(() => {
  //     const editor = quill.root;
  //     const images = editor.querySelectorAll('img');
  //     // Only setup handlers if there are images and they haven't been processed
  //     if (images.length > 0) {
  //       const unprocessedImages = Array.from(images).filter(img => !img.dataset.processed);
  //       if (unprocessedImages.length > 0) {
  //         setupImageHandlers();
  //       }
  //     }
  //   }, 2000); // Wait 2 seconds after editor loads
  //   
  //   return () => {
  //     clearTimeout(timeoutId);
  //   };
  // }, []);

  useEffect(() => {
    applyImageProperties();
  }, [imageProperties, applyImageProperties]);

  // Custom toolbar with image button
  const CustomToolbar = () => (
    <div id="toolbar" className="ql-toolbar ql-snow border-b border-gray-300">
      <span className="ql-formats">
        <select className="ql-header" defaultValue="">
          <option value="">{isArabicBrowser() ? 'عادي' : 'Normal'}</option>
          <option value="1">{isArabicBrowser() ? 'عنوان 1' : 'Heading 1'}</option>
          <option value="2">{isArabicBrowser() ? 'عنوان 2' : 'Heading 2'}</option>
          <option value="3">{isArabicBrowser() ? 'عنوان 3' : 'Heading 3'}</option>
        </select>
      </span>
      <span className="ql-formats">
        <button className="ql-bold"></button>
        <button className="ql-italic"></button>
        <button className="ql-underline"></button>
        <button className="ql-strike"></button>
      </span>
      <span className="ql-formats">
        <select className="ql-size" defaultValue="">
          <option value="small">{isArabicBrowser() ? 'صغير' : 'Small'}</option>
          <option value="">{isArabicBrowser() ? 'عادي' : 'Normal'}</option>
          <option value="large">{isArabicBrowser() ? 'كبير' : 'Large'}</option>
          <option value="huge">{isArabicBrowser() ? 'كبير جداً' : 'Huge'}</option>
        </select>
      </span>
      <span className="ql-formats">
        <select className="ql-color"></select>
        <select className="ql-background"></select>
      </span>
      <span className="ql-formats">
        <select className="ql-align"></select>
      </span>
      <span className="ql-formats">
        <button className="ql-list" value="ordered"></button>
        <button className="ql-list" value="bullet"></button>
        <button className="ql-blockquote"></button>
        <button className="ql-code-block"></button>
      </span>
      <span className="ql-formats">
        <button className="ql-link"></button>
        <button 
          className="ql-image" 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleImageInsert();
              }}
          title={isArabicBrowser() ? 'إدراج صورة' : 'Insert Image'}
        ></button>
      </span>
      <span className="ql-formats">
        <button className="ql-clean"></button>
      </span>
    </div>
  );

  return (
    <div className="word-like-editor border border-gray-300 rounded-lg bg-white" ref={editorContainerRef}>
      {/* Equation Toolbar - Always Visible (like Word's Equation Ribbon) */}
      <div className="equation-toolbar bg-gray-50 border-b border-gray-300 p-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-700">
            {isArabicBrowser() ? 'المعادلات الرياضية' : 'Equation Tools'}
          </span>
          <div className="flex gap-1 border-r border-gray-300 pr-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveEquationTab('design');
              }}
              className={`px-3 py-1 text-xs font-medium rounded ${
                activeEquationTab === 'design' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isArabicBrowser() ? 'تصميم' : 'Design'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveEquationTab('symbols');
              }}
              className={`px-3 py-1 text-xs font-medium rounded ${
                activeEquationTab === 'symbols' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isArabicBrowser() ? 'رموز' : 'Symbols'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveEquationTab('structures');
              }}
              className={`px-3 py-1 text-xs font-medium rounded ${
                activeEquationTab === 'structures' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isArabicBrowser() ? 'هياكل' : 'Structures'}
            </button>
          </div>
        </div>
        
        {/* Symbols Panel */}
        {activeEquationTab === 'symbols' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1 max-h-48 overflow-y-auto p-2 bg-white rounded border border-gray-200">
            {Object.entries(equationSymbols).map(([category, symbols]) => (
              <div key={category} className="border-b border-gray-200 pb-2 mb-2">
                <div className="text-xs font-semibold text-gray-600 mb-1 capitalize">
                  {isArabicBrowser() ? {
                    operators: 'عمليات',
                    scripts: 'أس',
                    fractions: 'كسور',
                    radicals: 'جذور',
                    integrals: 'تكاملات',
                    sums: 'مجاميع',
                    greek: 'يونانية',
                    sets: 'مجموعات',
                  }[category] || category : category}
                </div>
                <div className="flex flex-wrap gap-1">
                  {symbols.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        insertMathEquation(item.latex);
                      }}
                      className="bg-white hover:bg-blue-50 border border-gray-300 hover:border-blue-400 px-2 py-1 rounded text-sm font-medium transition"
                      title={item.label}
                    >
                      {item.symbol}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Structures Panel */}
        {activeEquationTab === 'structures' && (
          <div className="flex flex-wrap gap-2 p-2 bg-white rounded border border-gray-200">
            {equationStructures.map((struct, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertMathEquation(struct.latex);
                }}
                className="bg-white hover:bg-blue-50 border border-gray-300 hover:border-blue-400 px-3 py-2 rounded text-sm font-medium transition flex items-center gap-2"
                title={struct.name}
              >
                <span className="text-lg">{struct.icon}</span>
                <span>{struct.name}</span>
              </button>
            ))}
          </div>
        )}
        
        {/* Design Panel (Conversions) */}
        {activeEquationTab === 'design' && (
          <div className="flex flex-wrap gap-2 p-2 bg-white rounded border border-gray-200">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleImageInsert();
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              {isArabicBrowser() ? 'إدراج معادلة' : 'Insert Equation'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                insertMathEquation('\\frac{a}{b}');
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              a/b {isArabicBrowser() ? 'كسر' : 'Fraction'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                insertMathEquation('\\sqrt{x}');
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              √x {isArabicBrowser() ? 'جذر' : 'Radical'}
            </button>
          </div>
        )}
      </div>

      {/* Standard Rich Text Toolbar */}
      <CustomToolbar />

      {/* Editor */}
      <div 
        className="editor-wrapper" 
        style={{ direction: 'rtl', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={editorValue || ''}
          onChange={(content) => {
            // Mark that user is typing
            isTypingRef.current = true;
            
            const newContent = content || '';
            setEditorValue(newContent);
            
            // Call parent onChange
            if (onChange) {
              onChange(newContent);
            }
            
            // Reset typing flag after a delay
            setTimeout(() => {
              isTypingRef.current = false;
            }, 500);
          }}
          modules={quillModules}
          placeholder={placeholder || (isArabicBrowser() ? 'اكتب هنا...' : 'Write here...')}
          style={{ 
            minHeight: '300px',
            backgroundColor: '#fff'
          }}
          formats={[
            'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
            'list', 'bullet', 'indent', 'link', 'image', 'color', 'background',
            'align', 'size', 'font'
          ]}
          readOnly={false}
        />
      </div>

      {/* Image Properties Panel */}
      {showImageProperties && selectedImage && (
        <div className="image-properties-panel border-t border-gray-300 bg-gray-50 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {isArabicBrowser() ? 'خصائص الصورة' : 'Image Properties'}
            </h3>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowImageProperties(false);
                setSelectedImage(null);
                // Remove resize handles
                document.querySelectorAll('.resize-handle').forEach(h => h.remove());
              }}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {isArabicBrowser() ? 'تدوير الحواف' : 'Border Radius'} (px)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={imageProperties.borderRadius}
                onChange={(e) => setImageProperties({...imageProperties, borderRadius: parseInt(e.target.value) || 0})}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {isArabicBrowser() ? 'عرض الحد' : 'Border Width'} (px)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={imageProperties.borderWidth}
                onChange={(e) => setImageProperties({...imageProperties, borderWidth: parseInt(e.target.value) || 0})}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {isArabicBrowser() ? 'لون الحد' : 'Border Color'}
              </label>
              <input
                type="color"
                value={imageProperties.borderColor}
                onChange={(e) => setImageProperties({...imageProperties, borderColor: e.target.value})}
                className="w-full h-8 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {isArabicBrowser() ? 'الشفافية' : 'Opacity'} (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={imageProperties.opacity}
                onChange={(e) => setImageProperties({...imageProperties, opacity: parseInt(e.target.value) || 100})}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">
                {isArabicBrowser() ? 'الموضع' : 'Float'}
              </label>
              <select
                value={imageProperties.float}
                onChange={(e) => setImageProperties({...imageProperties, float: e.target.value})}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="none">{isArabicBrowser() ? 'لا شيء' : 'None'}</option>
                <option value="left">{isArabicBrowser() ? 'يسار' : 'Left'}</option>
                <option value="right">{isArabicBrowser() ? 'يمين' : 'Right'}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .word-like-editor .ql-container {
          min-height: 300px;
          direction: rtl;
          position: relative;
        }
        .word-like-editor .ql-editor {
          min-height: 300px;
          direction: rtl;
          font-size: 16px;
          padding: 12px 15px;
          cursor: text;
        }
        .word-like-editor .ql-editor:focus {
          outline: 2px solid #4285f4;
          outline-offset: -2px;
        }
        .word-like-editor .ql-editor p,
        .word-like-editor .ql-editor div {
          margin: 0;
          padding: 0;
        }
        .word-like-editor .ql-editor img.draggable-image {
          user-select: none;
          margin: 5px;
        }
        .word-like-editor .ql-editor img.draggable-image:hover {
          outline: 2px dashed #4285f4;
          outline-offset: 2px;
        }
        .word-like-editor .inline-math {
          display: inline-block;
          vertical-align: middle;
        }
        .resize-handle {
          transition: all 0.2s;
        }
        .resize-handle:hover {
          background: #1a73e8 !important;
          transform: scale(1.2);
        }
        .editor-wrapper .ql-container {
          font-family: inherit;
        }
        .editor-wrapper .ql-container {
          pointer-events: auto !important;
        }
        .editor-wrapper .ql-editor {
          pointer-events: auto !important;
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        .editor-wrapper .ql-editor * {
          pointer-events: auto !important;
        }
        .editor-wrapper .ql-toolbar {
          pointer-events: auto !important;
        }
        .editor-wrapper .ql-toolbar * {
          pointer-events: auto !important;
        }
      `}</style>
    </div>
  );
};

export default WordLikeEditor;

