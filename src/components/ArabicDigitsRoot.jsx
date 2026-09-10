import { useEffect } from "react";
import { startArabicIndicDigitsObserver } from "../utils/arabicNumerals";

/** Converts every visible 0-9 / Persian digit on the page to Arabic-Indic ٠-٩. */
export default function ArabicDigitsRoot() {
  useEffect(() => startArabicIndicDigitsObserver(document.body), []);
  return null;
}
