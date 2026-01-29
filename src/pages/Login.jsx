import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getUserByEmail, setCurrentUser } from '../services/storageService';
import { login as backendLogin, isBackendOn, mapUserFromBackend } from '../services/backendApi';
import Header from '../components/Header';
import backgroundImage from '../assets/kareem.jpg';
import { isArabicBrowser } from '../utils/language';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const useBackend = isBackendOn() || !!import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (useBackend) {
      setLoading(true);
      try {
        const { token, user } = await backendLogin(email.trim(), password);
        const mapped = mapUserFromBackend(user);
        setCurrentUser({ ...mapped, token });
        const redirectPath = searchParams.get('redirect');
        if (redirectPath) navigate(redirectPath);
        else navigate(mapped.role === 'admin' ? '/admin/dashboard' : '/courses');
      } catch (err) {
        let errorMessage = err.message || 'فشل تسجيل الدخول';
        
        // Provide more helpful error messages
        if (errorMessage.includes('فشل الاتصال بالخادم')) {
          errorMessage = 'فشل الاتصال بالخادم. قد يكون Backend نائماً (في الخطة المجانية من Render).\n\n' +
            'الحلول:\n' +
            '1. انتظر 30-60 ثانية ثم جرّب مرة أخرى\n' +
            '2. تحقق من أن Backend يعمل في Render Dashboard\n' +
            '3. تحقق من إعدادات CORS_ALLOWED_ORIGINS في Render';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
      return;
    }

    const user = getUserByEmail(email);
    if (!user) {
      setError('البريد الإلكتروني غير صحيح');
      return;
    }
    if (user.password !== password) {
      setError('كلمة المرور غير صحيحة');
      return;
    }
    if (user.role === 'student' && user.isActive !== true) {
      setError('حسابك غير مفعّل. يرجى التواصل مع المدير لتفعيل حسابك.');
      return;
    }
    setCurrentUser(user);
    const redirectPath = searchParams.get('redirect');
    if (redirectPath) navigate(redirectPath);
    else navigate(user.role === 'admin' ? '/admin/dashboard' : '/courses');
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
          <h1 className="text-2xl md:text-3xl font-bold text-dark-600 mb-2">نظام التعليم</h1>
          <p className="text-base md:text-lg text-dark-600 font-medium">تسجيل الدخول</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
              {useBackend ? (isArabicBrowser() ? 'اسم المستخدم' : 'Username') : (isArabicBrowser() ? 'البريد الإلكتروني' : 'Email')}
            </label>
            <input
              type={useBackend ? 'text' : 'email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder={useBackend ? 'admin' : 'example@email.com'}
            />
          </div>

          <div>
            <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
              {isArabicBrowser() ? 'كلمة المرور' : ''}
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
            <div className="bg-yellow-50 border border-yellow-300 text-dark-600 px-4 py-3 rounded-lg font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition shadow-lg hover:shadow-xl disabled:opacity-70"
          >
            {loading ? (isArabicBrowser() ? 'جاري الدخول...' : 'Signing in...') : (isArabicBrowser() ? 'تسجيل الدخول' : 'Login')}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-dark-600">
            {isArabicBrowser() ? 'ليس لديك حساب؟' : "Don't have an account?"}
          </p>
          <Link 
            to="/register" 
            className="block w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition shadow-lg hover:shadow-xl"
          >
            {isArabicBrowser() ? 'إنشاء حساب جديد' : 'Create New Account'}
          </Link>
        </div>

        <div className="mt-6 text-center text-xs md:text-sm text-dark-600">
          <p className="font-medium">{isArabicBrowser() ? 'حساب تجريبي للطالب:' : ''}</p>
          <p className="mt-2 font-mono text-xs md:text-sm text-dark-500">{useBackend ? 'student / student123' : 'student@test.com / student123'}</p>
          <p className="mt-2 font-medium">{isArabicBrowser() ? 'حساب المدير:' : ' :'}</p>
          <p className="font-mono text-xs md:text-sm text-dark-500">{useBackend ? 'admin / admin123' : 'admin@teacher.com / admin123'}</p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


