/** Student device/IP lock: API 403 that the UI used to treat as "empty content". */

export const DEVICE_RESTRICTED_AR =
  "هذا الحساب مسجّل على جهاز واحد فقط. يمكنك استخدام الواي‑فاي أو بيانات الجوال على نفس الجهاز، لكن لا يمكن فتح الحساب من جهاز أو متصفح آخر. تواصل مع الإدارة لتفعيل «السماح بالوصول من أجهزة متعددة».";

export const DEVICE_RESTRICTED_EN =
  "This account is registered on one device only. You can use Wi‑Fi or mobile data on the same device, but not another device or browser. Contact the admin to enable multi-device access.";

export const DEVICE_RESTRICTED_EVENT = "qodrat:device-restricted";
const FLAG_KEY = "device_restricted_notice";

export function isDeviceRestrictedError(err) {
  const msg = String(
    err?.message || err?.data?.detail || err?.data?.error || ""
  );
  return (
    err?.code === "device_restricted" ||
    msg.includes("registered device") ||
    msg.includes("multi-device") ||
    msg.includes("جهاز واحد") ||
    msg.includes("عدة أجهزة")
  );
}

export function formatDeviceRestrictedError(err, isArabic = true) {
  if (!isDeviceRestrictedError(err)) return "";
  return isArabic ? DEVICE_RESTRICTED_AR : DEVICE_RESTRICTED_EN;
}

export function notifyDeviceRestricted() {
  try {
    sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DEVICE_RESTRICTED_EVENT));
  }
}

export function clearDeviceRestricted() {
  try {
    sessionStorage.removeItem(FLAG_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DEVICE_RESTRICTED_EVENT));
  }
}

export function isDeviceRestrictedFlagSet() {
  try {
    return sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}
