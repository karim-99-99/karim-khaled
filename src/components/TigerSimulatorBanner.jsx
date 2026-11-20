import { Link } from "react-router-dom";
import { prefetchTigerTestProps } from "../utils/routePrefetch";
import "./TigerSimulatorBanner.css";

function TigerComputerIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 72 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tigerSimScreen" x1="12" y1="8" x2="52" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="tigerSimKeyGlow" x1="10" y1="40" x2="62" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect x="8" y="4" width="48" height="32" rx="4" stroke="currentColor" strokeWidth="2.2" />
      <rect
        x="12"
        y="8"
        width="40"
        height="24"
        rx="2"
        fill="url(#tigerSimScreen)"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />
      <path d="M28 40h8v3h-8z" fill="currentColor" fillOpacity="0.85" />
      <rect x="22" y="43" width="20" height="3" rx="1.5" fill="currentColor" fillOpacity="0.7" />
      <path
        d="M16 14h24M16 19h16M16 24h20"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
      <rect
        x="4"
        y="48"
        width="56"
        height="8"
        rx="2.5"
        fill="url(#tigerSimKeyGlow)"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M54 12.5l2.2 2.2 5-5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TigerSimulatorBanner = () => {
  return (
    <Link
      to="/tiger-test"
      {...prefetchTigerTestProps}
      className="tiger-sim-banner"
      aria-label="فتح محاكي النمر — المحاكي الشخصي للاختبار المحوسب"
    >
      <span className="tiger-sim-banner__main">
        <TigerComputerIcon className="tiger-sim-banner__icon" />
        <span className="tiger-sim-banner__text">
          <span className="tiger-sim-banner__title">محاكي النمر</span>
          <span className="tiger-sim-banner__subtitle">المحاكي الشخصي للاختبار المحوسب</span>
        </span>
      </span>
      <span className="tiger-sim-banner__cta">
        ابدأ المحاكي
        <span aria-hidden="true">←</span>
      </span>
    </Link>
  );
};

export default TigerSimulatorBanner;
