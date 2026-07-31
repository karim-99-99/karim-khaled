import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ProfileAvatar from "../components/ProfileAvatar";
import {
  getCurrentUser,
  setCurrentUser,
  getUsers as getUsersLocal,
  updateUser as updateUserLocal,
} from "../services/storageService";
import {
  getMe,
  changeMyPassword,
  isBackendOn,
} from "../services/backendApi";
import { isArabicBrowser } from "../utils/language";

const yesNo = (v, ar) => {
  if (ar) return v ? "نعم" : "لا";
  return v ? "Yes" : "No";
};

const Profile = () => {
  const navigate = useNavigate();
  const ar = isArabicBrowser();
  const useBackend = isBackendOn() || !!import.meta.env.VITE_API_URL;
  const [user, setUser] = useState(() => getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    const local = getCurrentUser();
    if (!local) {
      navigate("/login?redirect=/profile");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (useBackend) {
          const fresh = await getMe();
          if (!cancelled && fresh) {
            const merged = { ...local, ...fresh, token: local.token };
            setCurrentUser(merged);
            setUser(merged);
          } else if (!cancelled) {
            setUser(local);
          }
        } else if (!cancelled) {
          setUser(local);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, useBackend]);

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.name ||
    user?.username ||
    "—";

  const perm = user?.permissions || {};

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg("");
    setPwdError("");
    if (!oldPassword || !newPassword || !newPassword2) {
      setPwdError(
        ar ? "يرجى تعبئة جميع حقول كلمة المرور." : "Please fill all password fields."
      );
      return;
    }
    if (newPassword !== newPassword2) {
      setPwdError(
        ar ? "كلمتا المرور الجديدتان غير متطابقتين." : "New passwords do not match."
      );
      return;
    }
    if (newPassword.length < 8) {
      setPwdError(
        ar
          ? "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل."
          : "New password must be at least 8 characters."
      );
      return;
    }
    setPwdBusy(true);
    try {
      if (useBackend) {
        await changeMyPassword({
          oldPassword,
          newPassword,
          newPassword2,
        });
      } else {
        const users = getUsersLocal();
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx === -1) throw new Error(ar ? "المستخدم غير موجود" : "User not found");
        if ((users[idx].password || "") !== oldPassword) {
          throw new Error(
            ar ? "كلمة المرور الحالية غير صحيحة." : "Current password is incorrect."
          );
        }
        updateUserLocal(user.id, { password: newPassword });
      }
      setOldPassword("");
      setNewPassword("");
      setNewPassword2("");
      setPwdMsg(
        ar ? "تم تغيير كلمة المرور بنجاح." : "Password changed successfully."
      );
    } catch (err) {
      const detail =
        err?.data?.old_password?.[0] ||
        err?.data?.new_password?.[0] ||
        err?.data?.detail ||
        err?.message;
      setPwdError(
        detail ||
          (ar ? "فشل تغيير كلمة المرور." : "Failed to change password.")
      );
    } finally {
      setPwdBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-primary-50/40" dir="rtl">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-dark-800 mb-6 text-center">
          {ar ? "الملف الشخصي" : "My Profile"}
        </h1>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center text-dark-600">
            {ar ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl shadow-md border border-primary-100 p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary-200 bg-white shadow">
                  <ProfileAvatar
                    choice={user.avatarChoice || "male_gulf"}
                    size={80}
                  />
                </div>
                <div className="text-center sm:text-right">
                  <h2 className="text-xl font-bold text-dark-900">{fullName}</h2>
                  <p className="text-dark-500 text-sm mt-1">@{user.username}</p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      user.role === "admin"
                        ? "bg-amber-100 text-amber-900"
                        : user.role === "content_admin"
                          ? "bg-violet-100 text-violet-900"
                          : "bg-primary-100 text-primary-800"
                    }`}
                  >
                    {user.role === "admin"
                      ? ar
                        ? "مدير"
                        : "Admin"
                      : user.role === "content_admin"
                        ? ar
                          ? "مساعد محتوى"
                          : "Content helper"
                        : ar
                          ? "طالب"
                          : "Student"}
                  </span>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-dark-500 mb-1">
                    {ar ? "البريد الإلكتروني" : "Email"}
                  </dt>
                  <dd className="font-medium text-dark-800 break-all">
                    {user.email || "—"}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-dark-500 mb-1">
                    {ar ? "رقم الجوال" : "Phone"}
                  </dt>
                  <dd className="font-medium text-dark-800">
                    {user.phone || "—"}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-dark-500 mb-1">
                    {ar ? "اسم المستخدم" : "Username"}
                  </dt>
                  <dd className="font-medium text-dark-800">
                    {user.username || "—"}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-dark-500 mb-1">
                    {ar ? "حالة الحساب" : "Account status"}
                  </dt>
                  <dd
                    className={`font-medium ${
                      user.isActive !== false ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {user.isActive !== false
                      ? ar
                        ? "مفعّل"
                        : "Active"
                      : ar
                        ? "غير مفعّل"
                        : "Inactive"}
                  </dd>
                </div>
                {(user.accountActiveFrom || user.accountActiveUntil) && (
                  <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
                    <dt className="text-dark-500 mb-1">
                      {ar ? "فترة التفعيل" : "Active period"}
                    </dt>
                    <dd className="font-medium text-dark-800">
                      {(user.accountActiveFrom
                        ? String(user.accountActiveFrom).slice(0, 10)
                        : "—") +
                        " → " +
                        (user.accountActiveUntil
                          ? String(user.accountActiveUntil).slice(0, 10)
                          : "—")}
                    </dd>
                  </div>
                )}
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-dark-500 mb-1">
                    {ar ? "تاريخ الانضمام" : "Joined"}
                  </dt>
                  <dd className="font-medium text-dark-800">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString(
                          ar ? "ar-SA" : "en-GB",
                          { year: "numeric", month: "short", day: "numeric" }
                        )
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-dark-500 mb-1">
                    {ar ? "أجهزة متعددة" : "Multi-device"}
                  </dt>
                  <dd className="font-medium text-dark-800">
                    {yesNo(!!user.allowMultiDevice, ar)}
                  </dd>
                </div>
              </dl>

              {user.role === "student" && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="font-bold text-dark-800 mb-3">
                    {ar ? "صلاحيات الوصول" : "Access permissions"}
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <li className="rounded-lg bg-primary-50/80 px-3 py-2">
                      {ar ? "قسم القدرات" : "Abilities"}:{" "}
                      <strong>{yesNo(!!perm.hasAbilitiesAccess, ar)}</strong>
                    </li>
                    <li className="rounded-lg bg-primary-50/80 px-3 py-2">
                      {ar ? "لفظي" : "Verbal"}:{" "}
                      <strong>
                        {yesNo(!!perm.abilitiesSubjects?.verbal, ar)}
                      </strong>
                    </li>
                    <li className="rounded-lg bg-primary-50/80 px-3 py-2">
                      {ar ? "كمي" : "Quantitative"}:{" "}
                      <strong>
                        {yesNo(!!perm.abilitiesSubjects?.quantitative, ar)}
                      </strong>
                    </li>
                    <li className="rounded-lg bg-primary-50/80 px-3 py-2">
                      {ar ? "تأسيس" : "Foundation"}:{" "}
                      <strong>
                        {yesNo(!!perm.abilitiesCategories?.foundation, ar)}
                      </strong>
                    </li>
                    <li className="rounded-lg bg-primary-50/80 px-3 py-2">
                      {ar ? "تجميعات" : "Collections"}:{" "}
                      <strong>
                        {yesNo(!!perm.abilitiesCategories?.collections, ar)}
                      </strong>
                    </li>
                  </ul>
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-md border border-primary-100 p-6 md:p-8">
              <h2 className="text-lg font-bold text-dark-800 mb-2">
                {ar ? "تغيير كلمة المرور" : "Change password"}
              </h2>
              <p className="text-sm text-dark-500 mb-5">
                {ar
                  ? "أدخل كلمة المرور الحالية ثم كلمة المرور الجديدة مرتين."
                  : "Enter your current password, then the new password twice."}
              </p>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">
                    {ar ? "كلمة المرور الحالية" : "Current password"}
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">
                    {ar ? "كلمة المرور الجديدة" : "New password"}
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">
                    {ar ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"}
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                {pwdError && (
                  <p className="text-red-600 text-sm whitespace-pre-wrap">{pwdError}</p>
                )}
                {pwdMsg && (
                  <p className="text-green-700 text-sm font-medium">{pwdMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={pwdBusy}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition disabled:opacity-60"
                >
                  {pwdBusy
                    ? ar
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : ar
                      ? "حفظ كلمة المرور"
                      : "Save password"}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
