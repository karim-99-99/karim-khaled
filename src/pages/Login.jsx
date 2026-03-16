import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getUserByEmail, setCurrentUser } from "../services/storageService";
import {
  login as backendLogin,
  isBackendOn,
  mapUserFromBackend,
} from "../services/backendApi";
import Header from "../components/Header";
import backgroundImage from "../assets/kareem.jpg";
import { isArabicBrowser } from "../utils/language";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAccountNotActive, setIsAccountNotActive] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const useBackend = isBackendOn() || !!import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsAccountNotActive(false);

    if (useBackend) {
      setLoading(true);
      try {
        const { token, user } = await backendLogin(email.trim(), password);
        const mapped = mapUserFromBackend(user);
        setCurrentUser({ ...mapped, token });
        const redirectPath = searchParams.get("redirect");
        if (redirectPath) navigate(redirectPath);
        else
          navigate(mapped.role === "admin" ? "/admin/dashboard" : "/courses");
      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        const isInactive =
          msg.includes("not active") ||
          msg.includes("contact administrator") ||
          msg.includes("غير مفعّل");
        if (isInactive) {
          setIsAccountNotActive(true);
          setError(
            isArabicBrowser()
              ? "حسابك غير مفعّل. يرجى التواصل مع الإدارة لتفعيل الحساب."
              : "Your account is not active. Please contact administration to activate it."
          );
        } else if (err.code === "device_restricted") {
          setError(
            "الوصول مسموح فقط من الجهاز الذي سجّلت منه. للوصول من أجهزة متعددة، تواصل مع المدير لتفعيل الصلاحية."
          );
        } else if (msg.includes("فشل الاتصال بالخادم")) {
          setError(
            "فشل الاتصال بالخادم. قد يكون Backend نائماً (في الخطة المجانية من Render).\n\n" +
              "الحلول:\n" +
              "1. انتظر 30-60 ثانية ثم جرّب مرة أخرى\n" +
              "2. تحقق من أن Backend يعمل في Render Dashboard\n" +
              "3. تحقق من إعدادات CORS_ALLOWED_ORIGINS في Render"
          );
        } else {
          setError(err.message || "فشل تسجيل الدخول");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    const user = getUserByEmail(email);
    if (!user) {
      setError("البريد الإلكتروني غير صحيح");
      return;
    }
    if (user.password !== password) {
      setError("كلمة المرور غير صحيحة");
      return;
    }
    if (user.role === "student" && user.isActive !== true) {
      setError("حسابك غير مفعّل. يرجى التواصل مع المدير لتفعيل حسابك.");
      return;
    }
    setCurrentUser(user);
    const redirectPath = searchParams.get("redirect");
    if (redirectPath) navigate(redirectPath);
    else navigate(user.role === "admin" ? "/admin/dashboard" : "/courses");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border-t-4 border-primary-500">
          <div className="text-center mb-8">
            <img
              src={backgroundImage}
              alt="Logo"
              className="h-28 w-32 mx-auto mb-4 object-contain rounded-3xl"
            />
            <h1 className="text-2xl md:text-3xl font-bold text-dark-600 mb-2">
              نظام التعليم
            </h1>
            <p className="text-base md:text-lg text-dark-600 font-medium">
              تسجيل الدخول
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                {useBackend
                  ? isArabicBrowser()
                    ? "اسم المستخدم"
                    : "Username"
                  : isArabicBrowser()
                    ? "البريد الإلكتروني"
                    : "Email"}
              </label>
              <input
                type={useBackend ? "text" : "email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                placeholder={useBackend ? "admin" : "example@email.com"}
              />
            </div>

            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                {isArabicBrowser() ? "كلمة المرور" : ""}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-yellow-50 border border-yellow-300 text-dark-600 px-4 py-3 rounded-lg font-medium space-y-3">
                <p>{error}</p>
                {isAccountNotActive && (
                  <a
                    href="https://wa.me/966502403757"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full mt-2 px-4 py-2.5 bg-[#25D366] text-white rounded-lg font-bold hover:bg-[#20BD5A] transition text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    {isArabicBrowser() ? "تواصل مع الإدارة عبر واتساب" : "Contact admin via WhatsApp"}
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              {loading
                ? isArabicBrowser()
                  ? "جاري الدخول..."
                  : "Signing in..."
                : isArabicBrowser()
                  ? "تسجيل الدخول"
                  : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-dark-600">
              {isArabicBrowser() ? "ليس لديك حساب؟" : "Don't have an account?"}
            </p>
            <Link
              to="/register"
              className="block w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition shadow-lg hover:shadow-xl"
            >
              {isArabicBrowser() ? "إنشاء حساب جديد" : "Create New Account"}
            </Link>
          </div>

          <div className="mt-6 text-center text-xs md:text-sm text-dark-600">
            <p className="font-medium">
              {isArabicBrowser() ? "حساب تجريبي للطالب:" : ""}
            </p>
            <p className="mt-2 font-mono text-xs md:text-sm text-dark-500">
              {useBackend
                ? "student / student123"
                : "student@test.com / student123"}
            </p>
            <p className="mt-2 font-medium">
              {isArabicBrowser() ? "حساب المدير:" : " :"}
            </p>
            <p className="font-mono text-xs md:text-sm text-dark-500">
              {useBackend ? "admin / admin123" : "admin@teacher.com / admin123"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
