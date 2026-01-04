import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Component to render HTML with embedded LaTeX math equations
// Equations should be wrapped like: $$equation$$
const MathRenderer = ({ html, inline = false }) => {
  if (!html) return null;

  // Parse HTML and extract math equations
  const parseMathInHTML = (htmlString) => {
    const parts = [];
    let currentIndex = 0;
    
    // Find all math equations wrapped in $$...$$
    const mathRegex = /\$\$(.*?)\$\$/g;
    let match;
    let lastIndex = 0;
    
    while ((match = mathRegex.exec(htmlString)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const textBefore = htmlString.substring(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push({ type: 'html', content: textBefore });
        }
      }
      
      // Add the math equation
      parts.push({ type: 'math', content: match[1] });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last match
    if (lastIndex < htmlString.length) {
      const textAfter = htmlString.substring(lastIndex);
      if (textAfter.trim()) {
        parts.push({ type: 'html', content: textAfter });
      }
    }
    
    // If no math found, return the original HTML
    if (parts.length === 0) {
      return [{ type: 'html', content: htmlString }];
    }
    
    return parts;
  };

  const parts = parseMathInHTML(html);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.type === 'math') {
          const MathComponent = inline ? InlineMath : BlockMath;
          return (
            <MathComponent key={index} math={part.content} />
          );
        } else {
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: part.content }}
            />
          );
        }
      })}
    </span>
  );
};

export default MathRenderer;


