import React from 'react';
import ProfileAvatar from './ProfileAvatar';

export const AVATAR_OPTIONS = [
  { id: 'male_gulf', label: 'رجل' },
  { id: 'female_gulf', label: 'امرأة خليجية' },
];

const AvatarPickerModal = ({ open, selected, onSelect, onClose, onSave, saving = false }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-extrabold text-dark-900">
              اختر صورة البروفايل
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition font-bold"
              disabled={saving}
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-dark-600 mb-5">
            اختر الشكل اللي تحب يظهر أعلى اليسار داخل الموقع.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AVATAR_OPTIONS.map((opt) => {
              const active = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelect(opt.id)}
                  className={`border-2 rounded-2xl p-4 flex items-center gap-4 text-right hover:shadow transition ${
                    active ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ProfileAvatar choice={opt.id} size={48} />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-dark-900">{opt.label}</div>
                    <div className="text-xs text-dark-600 mt-1">
                      {opt.id === 'male_gulf' ? 'بالزي الخليجي' : 'بالزي الخليجي'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onSave}
              disabled={!selected || saving}
              className="flex-1 py-3 rounded-xl font-extrabold bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-60"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-extrabold bg-gray-400 text-white hover:bg-gray-500 transition disabled:opacity-60"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;

