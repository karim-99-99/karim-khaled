import { useState } from 'react';
import CourseCardWords from './CourseCardWords';

/**
 * Course navigation card with interior scattered words and press/selection glow.
 */
const CourseNavButton = ({
  variant = 'quantitative',
  selected = false,
  dimmed = false,
  className = '',
  children,
  as: Tag = 'button',
  wordVariant,
  cardId,
  groupPressedId = null,
  onPressStart,
  onPressEnd,
  ...props
}) => {
  const [localPressed, setLocalPressed] = useState(false);
  const pressed =
    localPressed ||
    (groupPressedId != null && cardId != null && groupPressedId === cardId);
  const isDimmed =
    dimmed || (groupPressedId != null && cardId != null && groupPressedId !== cardId);

  const wordTone = selected || pressed ? 'bright' : isDimmed ? 'dim' : 'normal';
  const v = wordVariant || variant;

  const stateClass = [
    'course-card-btn',
    selected ? 'course-card-btn--selected' : '',
    isDimmed ? 'course-card-btn--dimmed' : '',
    pressed ? 'course-card-btn--pressed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handlePointerDown = (e) => {
    setLocalPressed(true);
    if (cardId != null) onPressStart?.(cardId);
    props.onPointerDown?.(e);
  };

  const handlePointerEnd = (e) => {
    setLocalPressed(false);
    onPressEnd?.();
    props.onPointerUp?.(e);
  };

  const { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, ...rest } =
    props;

  return (
    <Tag
      className={`${stateClass} relative overflow-hidden ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      {...rest}
    >
      <CourseCardWords variant={v} tone={wordTone} />
      <div className="relative z-10">{children}</div>
    </Tag>
  );
};

export default CourseNavButton;
