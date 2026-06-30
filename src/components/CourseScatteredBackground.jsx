import {
  ARABIC_CLASSIC_FONT,
  WORD_SETS,
  PAGE_WORD_SIZE_SCALE,
  expandWordsForPage,
  wordColor,
  wordOpacity,
} from '../data/courseBackgroundWords';

/**
 * Full-page scattered Arabic words background for course flow pages.
 * @param {{ variant?: 'quantitative'|'verbal'|'foundation'|'collections' }} props
 */
const CourseScatteredBackground = ({ variant = 'quantitative' }) => {
  const base = WORD_SETS[variant] || WORD_SETS.quantitative;
  const words = expandWordsForPage(base);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden
    >
      {words.map((w, i) => {
        const shade = w.shade ?? i % 7;
        return (
          <span
            key={`${w.text}-${i}`}
            className="course-scatter-word absolute font-semibold select-none"
            style={{
              left: `${w.x}%`,
              top: `${w.y}%`,
              fontSize: `${Math.round(w.size * PAGE_WORD_SIZE_SCALE)}px`,
              '--word-rotate': `${w.rotate}deg`,
              color: wordColor(shade),
              opacity: wordOpacity(shade),
              fontFamily: ARABIC_CLASSIC_FONT,
              animationDelay: `${i * 0.22}s`,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export default CourseScatteredBackground;
