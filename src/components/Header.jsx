import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/storageService';
import headerimage from '../assets/kareem.jpg'
const Header = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-dark-800 text-yellow-400 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src={headerimage}
              alt="Logo"
              className="h-16 w-32 object-contain rounded-3xl text-xl "
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              الرئيسية / Home
            </Link>
            <Link
              to="/courses"
              className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              الدورات / Courses
            </Link>
            <Link
              to="/about"
              className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              من نحن / Who Are We
            </Link>
            <Link
              to="/contact"
              className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              تواصل معنا / Contact
            </Link>

            {/* User Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium text-white"
                >
                  {currentUser.name}
                  <span>▼</span>
                </button>

                {isMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    {currentUser.role === 'admin' ? (
                      <Link
                        to="/admin/dashboard"
                        className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        لوحة التحكم / Dashboard
                      </Link>
                    ) : (
                      <Link
                        to="/home"
                        className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        الصفحة الرئيسية / My Home
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-right px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                    >
                      تسجيل الخروج / Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium text-white"
              >
                تسجيل الدخول / Login
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-yellow-400"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 border-t border-dark-700 mt-2 pt-4">
            <nav className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                الرئيسية / Home
              </Link>
              <Link
                to="/courses"
                className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                الدورات / Courses
              </Link>
              <Link
                to="/about"
                className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                من نحن / Who Are We
              </Link>
              <Link
                to="/contact"
                className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                تواصل معنا / Contact
              </Link>

              {currentUser ? (
                <>
                  {currentUser.role === 'admin' ? (
                    <Link
                      to="/admin/dashboard"
                      className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      لوحة التحكم / Dashboard
                    </Link>
                  ) : (
                    <Link
                      to="/home"
                      className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      الصفحة الرئيسية / My Home
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-right text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
                  >
                    تسجيل الخروج / Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium text-center text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  تسجيل الدخول / Login
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

