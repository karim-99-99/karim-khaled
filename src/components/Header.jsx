import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/storageService';
import headerimage from '../assets/kareem.jpg';
import logoimage from '../assets/karim.png';
import { isArabicBrowser } from '../utils/language';
import ProfileAvatar from './ProfileAvatar';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    // Logo loaded
  }, []);

  useEffect(() => {
    // Update user when route changes (and after avatar saved)
    setCurrentUserState(getCurrentUser());
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <header className="bg-transparent sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="flex items-center justify-center h-16 relative">
          {/* Logo/Brand - positioned on the right */}
          <Link to="/" className="absolute right-0 flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img 
              src={logoimage} 
              // alt="بدايتي Logo" 
              className="h-12 w-12 object-contain flex-shrink-0"
              style={{ display: 'block', minWidth: '48px', minHeight: '48px' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {/* <span className="text-2xl font-bold text-primary-500">بدايتي</span> */}
          </Link>

          {/* Desktop Navigation - centered, ordered from left to right */}
          <nav className="hidden md:flex items-center gap-4 justify-center">
            <Link
              to="/"
              className={`px-4 py-2 rounded-full transition-colors font-medium bg-transparent ${
                location.pathname === '/' 
                  ? 'text-primary-500 border-2 border-primary-500' 
                  : 'text-dark-600 hover:text-primary-500 hover:border-2 hover:border-primary-500 border-2 border-transparent'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              الرئيسية
            </Link>
            <Link
              to="/courses"
              className={`px-4 py-2 rounded-full transition-colors font-medium bg-transparent ${
                location.pathname === '/courses' || location.pathname === '/all-courses'
                  ? 'text-primary-500 border-2 border-primary-500' 
                  : 'text-dark-600 hover:text-primary-500 hover:border-2 hover:border-primary-500 border-2 border-transparent'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              الدورات
            </Link>
            <Link
              to="/foundation"
              className={`px-4 py-2 rounded-full transition-colors font-medium bg-transparent ${
                location.pathname === '/foundation'
                  ? 'text-primary-500 border-2 border-primary-500'
                  : 'text-dark-600 hover:text-primary-500 hover:border-2 hover:border-primary-500 border-2 border-transparent'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              دروس مجانية
            </Link>
            <Link
              to="/about"
              className={`px-4 py-2 rounded-full transition-colors font-medium bg-transparent ${
                location.pathname === '/about' 
                  ? 'text-primary-500 border-2 border-primary-500' 
                  : 'text-dark-600 hover:text-primary-500 hover:border-2 hover:border-primary-500 border-2 border-transparent'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              من نحن
            </Link>
            <Link
              to="/contact"
              className={`px-4 py-2 rounded-full transition-colors font-medium bg-transparent ${
                location.pathname === '/contact' 
                  ? 'text-primary-500 border-2 border-primary-500' 
                  : 'text-dark-600 hover:text-primary-500 hover:border-2 hover:border-primary-500 border-2 border-transparent'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              تواصل معنا
            </Link>

            {/* User Menu - Desktop */}
            {currentUser ? (
              <div className="absolute left-0 relative">
                <div className="flex items-center gap-2">
                  {/* Standalone avatar (not inside dropdown). الطالب يختار مرة واحدة فقط عند التسجيل. */}
                  <div
                    className="w-10 h-10 rounded-full bg-white border-2 border-white shadow flex items-center justify-center overflow-hidden"
                    title={currentUser?.role === 'student' && currentUser?.avatarChoice ? undefined : 'تغيير صورة البروفايل'}
                  >
                    <ProfileAvatar choice={currentUser?.avatarChoice || 'male_gulf'} size={40} />
                  </div>

                  {/* Dropdown trigger */}
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium text-white"
                  >
                    {currentUser.name}
                    <span>▼</span>
                  </button>
                </div>

                {isUserMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    {/* Navigation shortcuts (always visible in user menu) */}
                    <Link
                      to="/contact"
                      className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMenuOpen(false);
                      }}
                    >
                      تواصل معنا
                    </Link>
                    <Link
                      to="/about"
                      className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMenuOpen(false);
                      }}
                    >
                      من نحن
                    </Link>
                    <Link
                      to="/foundation"
                      className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMenuOpen(false);
                      }}
                    >
                      دروس مجانية
                    </Link>
                    <Link
                      to="/courses"
                      className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMenuOpen(false);
                      }}
                    >
                      {isArabicBrowser() ? 'الدورات' : 'Courses'}
                    </Link>

                    {currentUser.role === 'admin' && (
                      <>
                        <div className="border-t border-gray-200" />
                        <Link
                          to="/admin/dashboard"
                          className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsMenuOpen(false);
                          }}
                        >
                          {isArabicBrowser() ? 'لوحة التحكم' : 'Dashboard'}
                        </Link>
                        <Link
                          to="/admin/questions"
                          className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsMenuOpen(false);
                          }}
                        >
                          {isArabicBrowser() ? 'إدارة الاختبار' : 'Test Management'}
                        </Link>
                        <Link
                          to="/admin/users"
                          className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsMenuOpen(false);
                          }}
                        >
                          {isArabicBrowser() ? 'إدارة المستخدمين' : 'User Management'}
                        </Link>
                      </>
                    )}
                    <Link
                      to="/register"
                      className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors border-t border-gray-200"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMenuOpen(false);
                      }}
                    >
                      {isArabicBrowser() ? 'إنشاء حساب جديد' : 'Create New Account'}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-right px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                    >
                      {isArabicBrowser() ? 'تسجيل الخروج' : 'Logout'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute left-0 flex items-center gap-2">
                <Link
                  to="/register"
                  className="px-4 py-2 border-2 border-primary-500 rounded-full bg-transparent hover:bg-primary-500 hover:text-white transition-colors font-medium text-primary-500"
                >
                  إنشاء حساب
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 border-2 border-primary-500 rounded-full bg-transparent hover:bg-primary-500 hover:text-white transition-colors font-medium text-primary-500"
                >
                  تسجيل الدخول
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button and User Button */}
          <div className="md:hidden flex items-center gap-2 absolute left-0 z-10">
            {currentUser && (
              <>
                {/* User Menu Selector - always visible for admin and student */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    {/* Standalone avatar. الطالب يختار مرة واحدة فقط عند التسجيل. */}
                    <div
                      className="w-10 h-10 rounded-full bg-white border-2 border-white shadow flex items-center justify-center overflow-hidden"
                      title={currentUser?.role === 'student' && currentUser?.avatarChoice ? undefined : 'تغيير صورة البروفايل'}
                    >
                      <ProfileAvatar choice={currentUser?.avatarChoice || 'male_gulf'} size={40} />
                    </div>

                    {/* Dropdown trigger */}
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-white md:bg-primary-500 hover:bg-gray-100 md:hover:bg-primary-600 rounded-lg transition-colors font-medium text-dark-600 md:text-white text-xs sm:text-sm whitespace-nowrap border border-gray-200 md:border-none"
                    >
                      {currentUser.name}
                      <span className="text-xs">▼</span>
                    </button>
                  </div>
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                      {/* Navigation shortcuts (always visible in user menu) */}
                      <Link
                        to="/contact"
                        className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors text-right"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsMenuOpen(false);
                        }}
                      >
                        تواصل معنا
                      </Link>
                      <Link
                        to="/about"
                        className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors text-right"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsMenuOpen(false);
                        }}
                      >
                        من نحن
                      </Link>
                      <Link
                        to="/foundation"
                        className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors text-right"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsMenuOpen(false);
                        }}
                      >
                        دروس مجانية
                      </Link>
                      <Link
                        to="/courses"
                        className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors text-right"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsMenuOpen(false);
                        }}
                      >
                        الدورات
                      </Link>

                      {currentUser.role === 'admin' && (
                        <>
                          <div className="border-t border-gray-200" />
                          <Link
                            to="/admin/dashboard"
                            className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors text-right"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsMenuOpen(false);
                            }}
                          >
                            لوحة التحكم
                          </Link>
                          <Link
                            to="/admin/questions"
                            className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors text-right"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsMenuOpen(false);
                            }}
                          >
                            إدارة الاختبار
                          </Link>
                          <Link
                            to="/admin/users"
                            className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors text-right"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsMenuOpen(false);
                            }}
                          >
                            إدارة المستخدمين
                          </Link>
                        </>
                      )}
                      <Link
                        to="/register"
                        className="block px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors text-right border-t border-gray-200"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsMenuOpen(false);
                        }}
                      >
                        إنشاء حساب جديد
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-right px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                      >
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Admin Icon - only for admin, visible indicator */}
                {currentUser.role === 'admin' && (
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-primary-500 rounded-full flex-shrink-0" title="مدير النظام">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </>
            )}
            <button
              className="p-2 text-dark-600 flex-shrink-0 bg-white md:bg-transparent rounded-lg border border-gray-200 md:border-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200 mt-2 pt-4">
            <nav className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-dark-600 hover:text-primary-500 transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                الرئيسية
              </Link>
              <Link
                to="/courses"
                className="text-dark-600 hover:text-primary-500 transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                الدورات
              </Link>
              <Link
                to="/foundation"
                className="text-dark-600 hover:text-primary-500 transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                دروس مجانية
              </Link>
              <Link
                to="/about"
                className="text-dark-600 hover:text-primary-500 transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                من نحن
              </Link>
              <Link
                to="/contact"
                className="text-dark-600 hover:text-primary-500 transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                تواصل معنا
              </Link>

              {!currentUser && (
                <>
                  <Link
                    to="/register"
                    className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium text-center text-dark-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    إنشاء حساب
                  </Link>
                  <Link
                    to="/login"
                    className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium text-center text-dark-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    تسجيل الدخول
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

