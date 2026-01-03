import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/storageService';
import logoimage from '../assets/karim.png';

const HeaderNoRouter = ({ onNavigate, currentUser: propCurrentUser, onUserChange }) => {
  const [currentUser, setCurrentUser] = useState(propCurrentUser || getCurrentUser());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const user = propCurrentUser || getCurrentUser();
    setCurrentUser(user);
  }, [propCurrentUser]);

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    if (onUserChange) {
      onUserChange(null);
    }
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    if (onNavigate) {
      onNavigate('landing');
    }
  };

  const handleNavClick = (section) => {
    if (onNavigate) {
      onNavigate(section);
    }
    setIsMenuOpen(false);
    
    // Scroll to section
    setTimeout(() => {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <header className="bg-transparent sticky top-0 z-50 bg-white ">
      <div className="max-w-7xl mx-auto px-4 relative bg-white">
        <div className="flex items-center justify-center h-16 relative bg-white">
          <button
            onClick={() => handleNavClick('landing')}
            className="absolute right-0 flex items-center gap-2  hover:opacity-80 transition-opacity"
          >
            <img 
              src={logoimage} 
              alt="بدايتي Logo" 
              className="h-20 w-20 object-contain flex-shrink-0 mt-2"
              style={{ display: 'block', minWidth: '48px', minHeight: '48px' }}
            />
            {/* <span className="text-2xl font-bold text-primary-500">بدايتي</span> */}
          </button>

          <nav className="hidden md:flex items-center gap-4 justify-center">
            <button
              onClick={() => handleNavClick('landing')}
              className="px-4 py-2 rounded-full transition-colors font-medium bg-transparent text-dark-600 hover:text-primary-500 hover:border-2 hover:border-primary-500 border-2 border-transparent"
            >
              الرئيسية
            </button>
            <button
              onClick={() => handleNavClick('courses')}
              className="px-4 py-2 rounded-full transition-colors font-medium bg-transparent text-dark-600 hover:text-primary-500 hover:border-2 hover:border-primary-500 border-2 border-transparent"
            >
              الدورات
            </button>
            <button
              onClick={() => handleNavClick('about')}
              className="px-4 py-2 rounded-full transition-colors font-medium bg-transparent text-dark-600 hover:text-primary-500 hover:border-2 hover:border-primary-500 border-2 border-transparent"
            >
              من نحن
            </button>
            <button
              onClick={() => handleNavClick('contact')}
              className="px-4 py-2 rounded-full transition-colors font-medium bg-transparent text-dark-600 hover:text-primary-500 hover:border-2 hover:border-primary-500 border-2 border-transparent"
            >
              تواصل معنا
            </button>

            {/* User Menu - Desktop */}
            {currentUser ? (
              <div className="absolute left-0 relative bg-white">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium text-white"
                >
                  {currentUser.name}
                  <span>▼</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    {currentUser.role === 'admin' ? (
                      <>
                        <button
                          onClick={() => {
                            handleNavClick('admin-dashboard');
                            setIsUserMenuOpen(false);
                          }}
                          className="block w-full text-right px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                        >
                          لوحة التحكم
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          handleNavClick('home');
                          setIsUserMenuOpen(false);
                        }}
                        className="block w-full text-right px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                      >
                        الصفحة الرئيسية
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-right px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                    >
                      تسجيل الخروج
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
          <div className="md:hidden flex items-center gap-2 absolute left-0 z-10 bg-white">
            {currentUser && (
              <>
                {/* User Menu Selector - always visible for admin and student */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium text-white text-xs sm:text-sm whitespace-nowrap"
                  >
                    {currentUser.name}
                    <span className="text-xs">▼</span>
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                      {currentUser.role === 'admin' ? (
                        <>
                          <button
                            onClick={() => {
                              handleNavClick('admin-dashboard');
                              setIsUserMenuOpen(false);
                              setIsMenuOpen(false);
                            }}
                            className="block w-full text-right px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                          >
                            لوحة التحكم
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            handleNavClick('home');
                            setIsUserMenuOpen(false);
                            setIsMenuOpen(false);
                          }}
                          className="block w-full text-right px-4 py-2 text-dark-600 hover:bg-gray-100 transition-colors"
                        >
                          الصفحة الرئيسية
                        </button>
                      )}
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
                {/* {currentUser.role === 'admin' && (
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-primary-500 rounded-full flex-shrink-0" title="مدير النظام">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )} */}
              </>
            )}
            <button
              className="p-2 text-dark-600 flex-shrink-0"
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
          <div className="md:hidden pb-4 border-t border-gray-200 mt-2 pt-4 bg-white ">
            <nav className="flex flex-col gap-4">
              <button
                onClick={() => handleNavClick('landing')}
                className="text-dark-600 hover:text-primary-500 transition-colors font-medium text-right"
              >
                الرئيسية
              </button>
              <button
                onClick={() => handleNavClick('courses')}
                className="text-dark-600 hover:text-primary-500 transition-colors font-medium text-right"
              >
                الدورات
              </button>
              <button
                onClick={() => handleNavClick('about')}
                className="text-dark-600 hover:text-primary-500 transition-colors font-medium text-right"
              >
                من نحن
              </button>
              <button
                onClick={() => handleNavClick('contact')}
                className="text-dark-600 hover:text-primary-500 transition-colors font-medium text-right"
              >
                تواصل معنا
              </button>

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

export default HeaderNoRouter;

