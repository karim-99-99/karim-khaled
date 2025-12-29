import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getUserByEmail, setCurrentUser } from '../services/storageService';
import Header from '../components/Header';
import backgroundImage from '../assets/kareem.jpg';
import { isArabicBrowser } from '../utils/language';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const user = getUserByEmail(email);
    
    if (!user) {
      setError('البريد الإلكتروني غير صحيح');
      return;
    }

    if (user.password !== password) {
      setError('كلمة المرور غير صحيحة');
      return;
    }

    setCurrentUser(user);
    
    // Check if there's a redirect parameter, otherwise go to courses
    const redirectPath = searchParams.get('redirect');
    if (redirectPath) {
      navigate(redirectPath);
    } else {
      navigate('/courses');
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
          <p className="text-base md:text-lg text-dark-600 font-medium">تسجيل الدخول</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
              {isArabicBrowser() ? 'البريد الإلكتروني' : ''}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              placeholder="example@email.com"
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
            className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition shadow-lg hover:shadow-xl"
          >
            {isArabicBrowser() ? 'تسجيل الدخول' : ''}
          </button>
        </form>

        <div className="mt-6 text-center text-xs md:text-sm text-dark-600">
          <p className="font-medium">{isArabicBrowser() ? 'حساب تجريبي للطالب:' : ''}</p>
          <p className="mt-2 font-mono text-xs md:text-sm text-dark-500">student@test.com / student123</p>
          <p className="mt-2 font-medium">{isArabicBrowser() ? 'حساب المدير:' : ' :'}</p>
          <p className="font-mono text-xs md:text-sm text-dark-500">admin@teacher.com / admin123</p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


