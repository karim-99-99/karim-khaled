import {
  ARABIC_CLASSIC_FONT,
  cardWordOpacity,
  getCardWords,
  wordColor,
} from '../data/courseBackgroundWords';

/**
 * Scattered words inside a course navigation card/button.
 * @param {{ variant?: string, tone?: 'normal'|'bright'|'dim' }} props
 */
const CourseCardWords = ({ variant = 'quantitative', tone = 'normal' }) => {
  const words = getCardWords(variant);

  return (
    <div
      className="course-card-words absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {words.map((w, i) => (
        <span
          key={`${w.text}-${i}`}
          className="course-card-word absolute font-semibold select-none"
          style={{
            left: `${w.x}%`,
            top: `${w.y}%`,
            fontSize: `${w.size}px`,
            '--word-rotate': `${w.rotate}deg`,
            color: wordColor(w.shade),
            opacity: cardWordOpacity(w.shade, tone),
            fontFamily: ARABIC_CLASSIC_FONT,
            animationDelay: `${i * 0.28}s`,
          }}
        >
          {w.text}
        </span>
      ))}
    </div>
  );
};

export default CourseCardWords;
