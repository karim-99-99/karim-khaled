import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { addUser, getUserByEmail, getUserByUsername } from '../services/storageService';
import { register as backendRegister } from '../services/backendApi';
import Header from '../components/Header';
import backgroundImage from '../assets/kareem.jpg';
import { isArabicBrowser } from '../utils/language';

const useBackend = () => !!import.meta.env.VITE_API_URL;

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!formData.email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (!formData.name.trim()) {
      setError('يرجى إدخال الاسم');
      return;
    }

    if (useBackend()) {
      setLoading(true);
      try {
        await backendRegister({
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          password2: formData.password,
          first_name: formData.name.trim(),
          last_name: '',
          phone: formData.phone.trim() || '',
          role: 'student',
        });
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } catch (err) {
        setError(err.message || 'حدث خطأ أثناء التسجيل');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (getUserByEmail(formData.email)) {
      setError('البريد الإلكتروني مستخدم بالفعل');
      return;
    }
    if (getUserByUsername(formData.username)) {
      setError('اسم المستخدم مستخدم بالفعل');
      return;
    }

    try {
      addUser({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        name: formData.name.trim(),
        role: 'student'
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء التسجيل');
    }
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
            <p className="text-base md:text-lg text-dark-600 font-medium">إنشاء حساب جديد</p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg font-medium">
                تم إنشاء الحساب بنجاح! سيتم تفعيل حسابك من قبل المدير قريباً.
              </div>
              <p className="text-sm text-dark-600">سيتم توجيهك إلى صفحة تسجيل الدخول...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  {isArabicBrowser() ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder={isArabicBrowser() ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  {isArabicBrowser() ? 'اسم المستخدم' : 'Username'}
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder={isArabicBrowser() ? 'أدخل اسم المستخدم' : 'Enter username'}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  {isArabicBrowser() ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  {isArabicBrowser() ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder={isArabicBrowser() ? '05xxxxxxxx' : '05xxxxxxxx'}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  {isArabicBrowser() ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder={isArabicBrowser() ? '6 أحرف على الأقل' : 'At least 6 characters'}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition shadow-lg hover:shadow-xl disabled:opacity-70"
              >
                {loading ? (isArabicBrowser() ? 'جاري الإنشاء...' : 'Creating...') : (isArabicBrowser() ? 'إنشاء الحساب' : 'Create Account')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-dark-600">
              {isArabicBrowser() ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
              <Link to="/login" className="text-primary-500 font-semibold hover:underline">
                {isArabicBrowser() ? 'تسجيل الدخول' : 'Login'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;












