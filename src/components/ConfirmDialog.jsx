import { isArabicBrowser } from '../utils/language';

const ConfirmDialog = ({ message, onConfirm, onCancel, title }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 w-full"
        style={{ direction: isArabicBrowser() ? 'rtl' : 'ltr' }}
      >
        {title && (
          <h3 className="text-lg md:text-xl font-bold text-dark-600 mb-4">
            {title}
          </h3>
        )}
        <p className="text-dark-600 mb-6 text-base md:text-lg">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-medium"
          >
            {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
          >
            {isArabicBrowser() ? 'تأكيد' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
