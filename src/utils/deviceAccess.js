/** Student device/IP lock: API 403 that the UI used to treat as "empty content". */

export const DEVICE_RESTRICTED_AR =
  "هذا الحساب مسموح له باستخدام جهاز واحد فقط على الموقع. إذا كنت تحتاج استخدام الحساب من أكثر من جهاز، تواصل مع الإدارة.";

export const DEVICE_RESTRICTED_EN =
  "This account is allowed to use only one device on this website. If you need to use this account on multiple devices, contact the admin.";

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
