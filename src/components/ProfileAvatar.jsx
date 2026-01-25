import React from 'react';

const common = {
  size: 32,
};

export const ProfileAvatar = ({ choice, size = common.size, className = '' }) => {
  const s = size;
  const stroke = '#1f2937';

  // Very lightweight inline SVGs (Gulf attire inspired)
  if (choice === 'female_gulf') {
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 64 64"
        className={className}
        aria-label="Female Gulf Avatar"
        role="img"
      >
        <rect x="0" y="0" width="64" height="64" fill="#f2eaff" />
        {/* Neck/shoulders */}
        <path d="M18 56c2-14 10-22 14-22s12 8 14 22H18z" fill="#ffffff" />
        {/* Abaya */}
        <path d="M20 56c2-13 8-20 12-20s10 7 12 20H20z" fill="#111827" opacity="0.98" />
        {/* Face */}
        <path d="M24 30c0-6 4-12 8-12s8 6 8 12-4 10-8 10-8-4-8-10z" fill="#f0c7a6" />
        {/* Hijab */}
        <path d="M18 34c2-14 11-20 14-20s12 6 14 20c-4-5-9-8-14-8s-10 3-14 8z" fill="#111827" />
        {/* Eyes */}
        <circle cx="28.5" cy="29.5" r="1.1" fill={stroke} />
        <circle cx="35.5" cy="29.5" r="1.1" fill={stroke} />
      </svg>
    );
  }

  // male_gulf (default)
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      className={className}
      aria-label="Male Gulf Avatar"
      role="img"
    >
      {/* Background like screenshot */}
      <rect x="0" y="0" width="64" height="64" fill="#f2eaff" />
      {/* Thobe/shoulders */}
      <path d="M16 56c2-16 9-24 16-24s14 8 16 24H16z" fill="#ffffff" />
      {/* Neck */}
      <rect x="29" y="34" width="6" height="10" rx="3" fill="#e9bfa0" />
      {/* Face */}
      <path d="M24 30c0-7 4-13 8-13s8 6 8 13-4 11-8 11-8-4-8-11z" fill="#f0c7a6" />
      {/* Eyebrows */}
      <path d="M26 28c2-2 4-2 6-1" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 28c-2-2-4-2-6-1" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="28.5" cy="31" r="1.1" fill={stroke} />
      <circle cx="35.5" cy="31" r="1.1" fill={stroke} />
      {/* Mouth */}
      <path d="M29 36c2 1 4 1 6 0" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
      {/* Ghutra */}
      <path d="M18 28c2-11 10-17 14-17s12 6 14 17c-4-4-9-6-14-6s-10 2-14 6z" fill="#ffffff" />
      {/* Agal (black band) */}
      <path d="M23 22c3-3 6-4 9-4s6 1 9 4" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

export default ProfileAvatar;

