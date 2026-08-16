/**
 * Preload route chunks before navigation so lazy routes feel instant.
 * Safe to call multiple times; dynamic import() dedupes in flight.
 */
import { pingHealth } from "../services/backendApi";

export function prefetchCoursesFlow() {
  pingHealth();
  return Promise.all([
    import("../pages/Subjects.jsx"),
    import("../pages/Categories.jsx"),
    import("../pages/Chapters.jsx"),
    import("../pages/Levels.jsx"),
  ]).catch(() => {});
}

export function prefetchLessonMediaRoutes() {
  pingHealth();
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

export function prefetchTigerTest() {
  pingHealth();
  return import("../pages/TigerTest.jsx").catch(() => {});
}

export const prefetchTigerTestProps = {
  onMouseEnter: prefetchTigerTest,
  onFocus: prefetchTigerTest,
  onTouchStart: prefetchTigerTest,
};

/** Run after first paint / when browser is idle */
export function scheduleIdlePrefetch() {
  const run = () => {
    prefetchCoursesFlow();
    prefetchLessonMediaRoutes();
    prefetchTigerTest();
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
