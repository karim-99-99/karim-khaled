import { Link, useLocation } from "react-router-dom";

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

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname || "/";

  return (
    <nav
      className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-800 border-t border-dark-600 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]"
      role="navigation"
      aria-label="التنقل الرئيسي"
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-2">
        {navItems
          .filter((item) => !item.hidden)
          .map((item) => {
            const isActive = item.match(path);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-xl transition-colors ${
                  isActive
                    ? "text-primary-300 border border-primary-500 bg-primary-500/15"
                    : "text-dark-200 hover:text-white hover:bg-dark-700"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="text-xs font-medium truncate max-w-full px-1">
                  {item.label}
                </span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
