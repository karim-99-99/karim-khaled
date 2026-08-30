/** Stable id for this browser profile (survives Wi‑Fi ↔ mobile data; not shared across devices). */
const STORAGE_KEY = "qodrat_device_id_v1";

export function getDeviceId() {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
