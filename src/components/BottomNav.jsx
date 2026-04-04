import { Link, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { getCurrentUser } from "../services/storageService";
import { prefetchCoursesFlow } from "../utils/routePrefetch";
import StudentResultsModal from "./StudentResultsModal";

const navItems = [
  {
    to: "/",
    label: "الرئيسية",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    match: (path) => path === "/",
  },
  {
    to: "/courses",
    label: "الدورات",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    match: (path) =>
      path === "/courses" ||
      path === "/all-courses" ||
      path.startsWith("/section/"),
  },
  {
    href: "https://wa.me/966502403757",
    label: "تواصل معنا",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    to: "/foundation",
    label: "الدورات المجانية",
    hidden: true,
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
        />
      </svg>
    ),
    match: (path) => path === "/foundation",
  },
];

const resultsNavItem = {
  key: "student-results",
  results: true,
  label: "نتائج",
  icon: (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
};

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname || "/";
  const [showResults, setShowResults] = useState(false);
  const isStudent = getCurrentUser()?.role === "student";

  const items = useMemo(() => {
    const list = navItems.filter((item) => !item.hidden);
    if (!isStudent) return list;
    const contactIdx = list.findIndex((x) => x.href);
    if (contactIdx === -1) return list;
    const next = [...list];
    next.splice(contactIdx, 0, resultsNavItem);
    return next;
  }, [isStudent]);

  return (
    <>
      <nav
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-800 border-t border-dark-600 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]"
        role="navigation"
        aria-label="التنقل الرئيسي"
      >
        <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-1">
          {items.map((item) => {
            if (item.results) {
              const active = showResults;
              const className = `flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-xl transition-colors ${
                active
                  ? "text-amber-300 border border-amber-500/80 bg-gradient-to-b from-amber-500/25 to-violet-600/20"
                  : "text-dark-200 hover:text-amber-200 hover:bg-dark-700"
              }`;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={className}
                  aria-label={item.label}
                  aria-expanded={showResults}
                  onClick={() => setShowResults(true)}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="text-[10px] sm:text-xs font-semibold truncate max-w-full px-0.5">
                    {item.label}
                  </span>
                </button>
              );
            }
            const isActive = item.match ? item.match(path) : false;
            const className = `flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-xl transition-colors ${
              isActive
                ? "text-primary-300 border border-primary-500 bg-primary-500/15"
                : "text-dark-200 hover:text-white hover:bg-dark-700"
            }`;
            if (item.href) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                  aria-label={item.label}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="text-[10px] sm:text-xs font-medium truncate max-w-full px-0.5">
                    {item.label}
                  </span>
                </a>
              );
            }
            const prefetchProps =
              item.to === "/courses"
                ? {
                    onMouseEnter: prefetchCoursesFlow,
                    onTouchStart: prefetchCoursesFlow,
                    onFocus: prefetchCoursesFlow,
                  }
                : {};
            return (
              <Link
                key={item.to}
                to={item.to}
                {...prefetchProps}
                className={className}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="text-[10px] sm:text-xs font-medium truncate max-w-full px-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      {isStudent && (
        <StudentResultsModal
          open={showResults}
          onClose={() => setShowResults(false)}
        />
      )}
    </>
  );
}
