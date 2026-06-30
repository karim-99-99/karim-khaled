/** Orange → gray → silver ramp for scattered background words */
export const WORD_SPECTRUM = [
  '#EC802B',
  '#EDC55B',
  '#9C9C9C',
  '#8A8A8A',
  '#B0B0B0',
  '#C0C0C0',
  '#D4D4D4',
];

export const ARABIC_CLASSIC_FONT =
  "'Amiri', 'Scheherazade New', 'Noto Naskh Arabic', 'Traditional Arabic', serif";

/** Scale factor for full-page scattered words */
export const PAGE_WORD_SIZE_SCALE = 1.22;

const CORE_QUANT = [
  'المسائل الهندسية',
  'الجبر',
  'الرسوم البيانية',
  '999',
  '∞',
  'الاحصاء',
  'المسائل الحسابية',
];

export const QUANTITATIVE_WORDS = [
  { text: 'المسائل الهندسية', x: 3, y: 5, rotate: -7, size: 22, shade: 0 },
  { text: 'الجبر', x: 72, y: 8, rotate: 9, size: 32, shade: 1 },
  { text: 'الرسوم البيانية', x: 26, y: 18, rotate: -5, size: 20, shade: 2 },
  { text: '999', x: 86, y: 22, rotate: 11, size: 36, shade: 3 },
  { text: '∞', x: 10, y: 35, rotate: -12, size: 40, shade: 4 },
  { text: 'الاحصاء', x: 46, y: 42, rotate: 6, size: 28, shade: 5 },
  { text: 'المسائل الحسابية', x: 4, y: 55, rotate: -4, size: 19, shade: 6 },
  { text: 'المسائل الهندسية', x: 55, y: 60, rotate: 8, size: 18, shade: 0 },
  { text: 'الجبر', x: 34, y: 72, rotate: -9, size: 24, shade: 2 },
  { text: '999', x: 76, y: 76, rotate: 5, size: 28, shade: 4 },
  { text: 'الرسوم البيانية', x: 18, y: 82, rotate: -6, size: 17, shade: 5 },
  { text: '∞', x: 90, y: 50, rotate: 14, size: 30, shade: 6 },
  { text: 'الاحصاء', x: 62, y: 28, rotate: -8, size: 21, shade: 3 },
  { text: 'المسائل الحسابية', x: 40, y: 48, rotate: 10, size: 16, shade: 1 },
  { text: '999', x: 8, y: 68, rotate: -14, size: 22, shade: 5 },
  { text: 'الجبر', x: 82, y: 88, rotate: 7, size: 20, shade: 0 },
  { text: '∞', x: 48, y: 12, rotate: -5, size: 26, shade: 2 },
  { text: 'الرسوم البيانية', x: 68, y: 38, rotate: 12, size: 15, shade: 4 },
];

export const VERBAL_WORDS = [
  { text: 'المعنى', x: 8, y: 10, rotate: -6, size: 23, shade: 0 },
  { text: 'المرادفات', x: 56, y: 12, rotate: 8, size: 21, shade: 1 },
  { text: 'التناظر', x: 32, y: 26, rotate: -5, size: 24, shade: 2 },
  { text: 'النحو', x: 74, y: 34, rotate: 10, size: 25, shade: 3 },
  { text: 'القراءة', x: 4, y: 46, rotate: 4, size: 22, shade: 4 },
  { text: 'الفهم', x: 40, y: 52, rotate: -9, size: 28, shade: 5 },
  { text: 'المفردات', x: 66, y: 60, rotate: 6, size: 20, shade: 6 },
  { text: 'استيعاب', x: 20, y: 70, rotate: -7, size: 19, shade: 1 },
  { text: '؟', x: 48, y: 16, rotate: -14, size: 36, shade: 3 },
  { text: 'المعنى', x: 84, y: 44, rotate: 9, size: 17, shade: 2 },
  { text: 'المرادفات', x: 14, y: 84, rotate: -4, size: 16, shade: 5 },
  { text: 'التناظر', x: 58, y: 78, rotate: 11, size: 18, shade: 0 },
];

export const FOUNDATION_WORDS = [
  { text: 'أساسيات', x: 12, y: 14, rotate: -5, size: 25, shade: 0 },
  { text: 'تدريب', x: 58, y: 18, rotate: 7, size: 23, shade: 1 },
  { text: 'مفاهيم', x: 34, y: 38, rotate: -8, size: 21, shade: 2 },
  { text: 'خطوة بخطوة', x: 6, y: 56, rotate: 4, size: 18, shade: 4 },
  { text: 'فهم', x: 68, y: 50, rotate: -6, size: 28, shade: 5 },
  { text: 'تطبيق', x: 42, y: 68, rotate: 9, size: 22, shade: 6 },
  { text: 'أساسيات', x: 78, y: 72, rotate: -10, size: 17, shade: 3 },
  { text: 'تدريب', x: 22, y: 82, rotate: 6, size: 16, shade: 1 },
];

export const COLLECTIONS_WORDS = [
  { text: 'مستوى', x: 10, y: 12, rotate: -7, size: 24, shade: 0 },
  { text: 'بنك', x: 62, y: 16, rotate: 5, size: 26, shade: 1 },
  { text: 'تجميع', x: 36, y: 30, rotate: -4, size: 23, shade: 2 },
  { text: 'درس', x: 76, y: 42, rotate: 8, size: 25, shade: 3 },
  { text: 'فيديو', x: 8, y: 54, rotate: -10, size: 21, shade: 4 },
  { text: 'واجب', x: 46, y: 62, rotate: 6, size: 22, shade: 5 },
  { text: 'مراجعة', x: 70, y: 72, rotate: -5, size: 20, shade: 6 },
  { text: 'بنك', x: 24, y: 80, rotate: 12, size: 18, shade: 0 },
  { text: 'مستوى', x: 88, y: 58, rotate: -8, size: 17, shade: 3 },
];

export const WORD_SETS = {
  quantitative: QUANTITATIVE_WORDS,
  verbal: VERBAL_WORDS,
  foundation: FOUNDATION_WORDS,
  collections: COLLECTIONS_WORDS,
};

/** Dense layout inside buttons/cards (percent positions within card) */
export const CARD_WORD_LAYOUTS = [
  { x: 8, y: 12, rotate: -8, size: 17 },
  { x: 62, y: 8, rotate: 10, size: 19 },
  { x: 38, y: 38, rotate: -5, size: 16 },
  { x: 78, y: 55, rotate: 12, size: 18 },
  { x: 12, y: 68, rotate: -12, size: 17 },
  { x: 52, y: 78, rotate: 6, size: 15 },
  { x: 85, y: 28, rotate: -6, size: 16 },
  { x: 28, y: 52, rotate: 9, size: 14 },
];

/**
 * @param {'quantitative'|'verbal'|'foundation'|'collections'} variant
 * @returns {Array} words sized for card interiors
 */
export function getCardWords(variant = 'quantitative') {
  const labels =
    variant === 'verbal'
      ? ['المعنى', 'المرادفات', 'التناظر', 'النحو', 'الفهم', 'المفردات', 'القراءة', '؟']
      : variant === 'foundation'
        ? ['أساسيات', 'تدريب', 'مفاهيم', 'فهم', 'تطبيق', 'خطوة بخطوة', 'أساسيات', 'تدريب']
        : variant === 'collections'
          ? ['مستوى', 'بنك', 'تجميع', 'درس', 'واجب', 'فيديو', 'مراجعة', 'بنك']
          : CORE_QUANT;

  return CARD_WORD_LAYOUTS.map((layout, i) => ({
    text: labels[i % labels.length],
    ...layout,
    shade: i % 7,
  }));
}

/** Mirror words for a denser full-page background */
export function expandWordsForPage(words) {
  const shifted = words.map((w, i) => ({
    ...w,
    x: Math.min(94, (w.x + 31 + i * 3) % 96),
    y: Math.min(92, (w.y + 24 + i * 2) % 94),
    rotate: w.rotate + (i % 2 === 0 ? 14 : -11),
    size: Math.max(16, w.size - 2),
    shade: (w.shade + 3) % 7,
  }));
  return [...words, ...shifted];
}

/**
 * @param {{ subjectId?: string, categoryName?: string }} ctx
 * @returns {'quantitative'|'verbal'|'foundation'|'collections'}
 */
export function resolveCourseBackgroundVariant({ subjectId, categoryName } = {}) {
  if (categoryName === 'التأسيس') return 'foundation';
  if (categoryName === 'التجميعات') return 'collections';
  if (subjectId === 'مادة_اللفظي') return 'verbal';
  if (subjectId === 'مادة_الكمي') return 'quantitative';
  return 'quantitative';
}

export function wordColor(shade = 0) {
  const index = Math.max(0, Math.min(shade, WORD_SPECTRUM.length - 1));
  return WORD_SPECTRUM[index];
}

export function wordOpacity(shade = 0, tone = 'normal') {
  const base = 0.32 + (Math.max(0, Math.min(shade, 6)) / 6) * 0.38;
  if (tone === 'bright') return Math.min(0.85, base * 1.75);
  if (tone === 'dim') return base * 0.35;
  return base;
}

export function cardWordOpacity(shade = 0, tone = 'normal') {
  const base = 0.22 + (Math.max(0, Math.min(shade, 6)) / 6) * 0.18;
  if (tone === 'bright') return Math.min(0.72, base * 2.4);
  if (tone === 'dim') return base * 0.3;
  return base;
}
