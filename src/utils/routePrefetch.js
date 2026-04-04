/**
 * Preload route chunks before navigation so lazy routes feel instant.
 * Safe to call multiple times; dynamic import() dedupes in flight.
 */
export function prefetchCoursesFlow() {
  return Promise.all([
    import("../pages/Subjects.jsx"),
    import("../pages/Categories.jsx"),
    import("../pages/Chapters.jsx"),
    import("../pages/Levels.jsx"),
  ]).catch(() => {});
}

export function prefetchLessonMediaRoutes() {
  return Promise.all([
    import("../pages/Video.jsx"),
    import("../pages/FileViewer.jsx"),
    import("../pages/Quiz.jsx"),
    import("../pages/Result.jsx"),
  ]).catch(() => {});
}

export function prefetchFoundation() {
  return import("../pages/Foundation.jsx").catch(() => {});
}

/** Run after first paint / when browser is idle */
export function scheduleIdlePrefetch() {
  const run = () => {
    prefetchCoursesFlow();
    prefetchLessonMediaRoutes();
  };
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => run(), { timeout: 2500 });
  } else {
    setTimeout(run, 300);
  }
}

export const prefetchOnIntentProps = {
  onMouseEnter: prefetchCoursesFlow,
  onFocus: prefetchCoursesFlow,
  onTouchStart: prefetchCoursesFlow,
};
