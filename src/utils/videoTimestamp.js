/**
 * Parse a video timestamp into total seconds.
 * Accepts: "14:55", "1:14:55", "14:55.5" (floor), or plain seconds "895" / 895.
 * Returns null for empty/invalid.
 */
export function parseVideoTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  const s = String(value).trim();
  if (!s) return null;

  // Plain seconds
  if (/^\d+(\.\d+)?$/.test(s)) {
    return Math.max(0, Math.floor(Number(s)));
  }

  // MM:SS or H:MM:SS
  const parts = s.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) {
    const [m, sec] = nums;
    if (sec >= 60) return null;
    return Math.floor(m) * 60 + Math.floor(sec);
  }
  const [h, m, sec] = nums;
  if (m >= 60 || sec >= 60) return null;
  return Math.floor(h) * 3600 + Math.floor(m) * 60 + Math.floor(sec);
}

/**
 * Format total seconds as M:SS or H:MM:SS for admin inputs.
 */
export function formatVideoTimestamp(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds === "") {
    return "";
  }
  const n = Number(totalSeconds);
  if (!Number.isFinite(n) || n < 0) return "";
  const t = Math.floor(n);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const ss = String(sec).padStart(2, "0");
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  }
  return `${m}:${ss}`;
}
