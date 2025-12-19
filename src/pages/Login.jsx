import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserByEmail, setCurrentUser } from '../services/storageService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
    
    if (user.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">نظام التعليم</h1>
          <p className="text-gray-600">تسجيل الدخول / Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البريد الإلكتروني / Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور / Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
          >
            تسجيل الدخول / Login
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>حساب تجريبي للطالب / Test Student Account:</p>
          <p className="mt-2 font-mono text-xs">student@test.com / student123</p>
          <p className="mt-2">حساب المدير / Admin Account:</p>
          <p className="font-mono text-xs">admin@teacher.com / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;


