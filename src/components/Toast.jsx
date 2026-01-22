import { useEffect, useState } from 'react';
import { isArabicBrowser } from '../utils/language';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 min-w-[300px] max-w-md
        ${bgColor} text-white rounded-lg shadow-2xl
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{ direction: isArabicBrowser() ? 'rtl' : 'ltr' }}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{icon}</span>
          <p className="text-sm md:text-base font-medium flex-1">{message}</p>
        </div>
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-200 transition ml-3 text-xl font-bold"
          aria-label={isArabicBrowser() ? 'إغلاق' : 'Close'}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
