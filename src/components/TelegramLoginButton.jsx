import { useEffect, useState } from "react";
import {
  getTelegramAuthConfig,
  loginWithTelegram,
} from "../services/backendApi";
import { isArabicBrowser } from "../utils/language";

const SCRIPT_OIDC = "https://telegram.org/js/telegram-login.js";
const SCRIPT_WIDGET = "https://telegram.org/js/telegram-widget.js?22";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

/**
 * Telegram sign-in / sign-up.
 * Prefers new OIDC Login with phone scope; falls back to classic widget.
 */
export default function TelegramLoginButton({ onSuccess, onError, disabled }) {
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const ar = isArabicBrowser();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getTelegramAuthConfig();
        if (cancelled) return;
        setConfig(cfg);
        if (!cfg?.enabled) {
          setReady(true);
          return;
        }
        if (cfg.client_id) {
          await loadScript(SCRIPT_OIDC);
        } else if (cfg.widget_available && cfg.bot_username) {
          await loadScript(SCRIPT_WIDGET);
        }
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) {
          setConfig({ enabled: false });
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = async (payload) => {
    setBusy(true);
    try {
      const data = await loginWithTelegram(payload);
      onSuccess?.(data);
    } catch (err) {
      onError?.(err);
    } finally {
      setBusy(false);
    }
  };

  const handleOidcClick = () => {
    if (busy || disabled) return;
    const clientId = Number(config?.client_id);
    if (!clientId || !window.Telegram?.Login?.auth) {
      onError?.(
        new Error(
          ar
            ? "مكتبة تيليجرام غير جاهزة. حدّث الصفحة أو راجع إعدادات البوت."
            : "Telegram library not ready. Refresh or check bot settings."
        )
      );
      return;
    }
    setBusy(true);
    try {
      window.Telegram.Login.auth(
        {
          client_id: clientId,
          // profile + phone: user must consent to share verified phone number
          scope: ["profile", "phone"],
          lang: ar ? "ar" : "en",
        },
        (data) => {
          if (!data || data.error) {
            setBusy(false);
            onError?.(
              new Error(
                data?.error ||
                  (ar ? "تم إلغاء تسجيل الدخول عبر تيليجرام" : "Telegram login cancelled")
              )
            );
            return;
          }
          const idToken = data.id_token;
          if (!idToken) {
            setBusy(false);
            onError?.(
              new Error(
                ar
                  ? "لم يُرجع تيليجرام رمز الدخول"
                  : "Telegram did not return an id_token"
              )
            );
            return;
          }
          finish({ id_token: idToken });
        }
      );
    } catch (e) {
      setBusy(false);
      onError?.(e);
    }
  };

  // Classic widget mount (no phone — messaging access only)
  useEffect(() => {
    if (!ready || !config?.enabled || config.client_id) return;
    if (!config.widget_available || !config.bot_username) return;
    const host = document.getElementById("telegram-login-widget-host");
    if (!host || host.dataset.mounted === "1") return;
    host.innerHTML = "";
    const s = document.createElement("script");
    s.async = true;
    s.src = SCRIPT_WIDGET;
    s.setAttribute("data-telegram-login", config.bot_username);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "8");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-userpic", "false");
    s.setAttribute("data-lang", ar ? "ar" : "en");
    window.__onTelegramWidgetAuth = (user) => {
      finish(user);
    };
    s.setAttribute("data-onauth", "__onTelegramWidgetAuth(user)");
    host.appendChild(s);
    host.dataset.mounted = "1";
  }, [ready, config, ar]);

  if (!ready) {
    return (
      <div className="w-full py-3 text-center text-sm text-gray-500">
        {ar ? "جاري تحميل تيليجرام..." : "Loading Telegram..."}
      </div>
    );
  }

  if (!config?.enabled) {
    return null;
  }

  if (config.client_id) {
    return (
      <button
        type="button"
        onClick={handleOidcClick}
        disabled={busy || disabled}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white transition disabled:opacity-70"
        style={{ backgroundColor: "#229ED9" }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.12.098.153.23.169.323.016.093.036.305.02.47z" />
        </svg>
        {busy
          ? ar
            ? "جاري التحقق..."
            : "Verifying..."
          : ar
            ? "الدخول / التسجيل عبر تيليجرام"
            : "Sign in with Telegram"}
      </button>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div id="telegram-login-widget-host" className="min-h-[40px]" />
      <p className="text-xs text-gray-500 text-center">
        {ar
          ? "الويدجت الكلاسيكي لا يطلب رقم الجوال. أضف TELEGRAM_CLIENT_ID لطلب الهاتف."
          : "Classic widget has no phone. Set TELEGRAM_CLIENT_ID to request phone."}
      </p>
    </div>
  );
}
