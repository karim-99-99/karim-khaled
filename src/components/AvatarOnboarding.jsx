import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AvatarPickerModal, { AVATAR_OPTIONS } from './AvatarPickerModal';
import * as backendApi from '../services/backendApi';
import { getCurrentUser, setCurrentUser, setCurrentUserAvatarChoice } from '../services/storageService';

const AvatarOnboarding = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const user = getCurrentUser();
  const isStudent = user?.role === 'student';
  const hasChoice = !!user?.avatarChoice;

  const shouldAutoOpen = useMemo(() => {
    if (!isStudent) return false;
    if (hasChoice) return false;
    const path = location.pathname || '';
    if (path.startsWith('/login') || path.startsWith('/register')) return false;
    return true;
  }, [isStudent, hasChoice, location.pathname]);

  useEffect(() => {
    if (shouldAutoOpen) {
      setSelected(AVATAR_OPTIONS[0]?.id || 'male_gulf');
      setOpen(true);
    }
  }, [shouldAutoOpen]);

  // لا نفتح منتقى البروفايل من حدث خارجي — الطالب يختار مرة واحدة فقط عند أول تسجيل

  const close = () => setOpen(false);

  const save = async () => {
    const choice = selected;
    if (!choice) return;
    setSaving(true);
    try {
      // Prefer backend when available and authenticated
      if (backendApi.isBackendOn()) {
        const updatedUser = await backendApi.setMyAvatarChoice(choice);
        // preserve token if exists
        const cur = getCurrentUser();
        setCurrentUser({ ...(cur || {}), ...updatedUser, token: cur?.token || updatedUser?.token });
      } else {
        setCurrentUserAvatarChoice(choice);
      }
      close();
    } catch (e) {
      // fallback to local update if backend fails
      try {
        setCurrentUserAvatarChoice(choice);
        close();
      } catch (_) {}
    } finally {
      setSaving(false);
    }
  };

  if (!isStudent) return null;

  return (
    <AvatarPickerModal
      open={open}
      selected={selected}
      onSelect={setSelected}
      onClose={close}
      onSave={save}
      saving={saving}
    />
  );
};

export default AvatarOnboarding;

