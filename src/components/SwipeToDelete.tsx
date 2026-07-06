import { useAnimationControls, motion } from 'motion/react';
import type { ReactNode } from 'react';

const REVEAL_WIDTH = 80;
const COMMIT_OFFSET = -64;
const COMMIT_VELOCITY = -500;

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: ReactNode;
  confirmLabel?: string;
  /** Falls back to a plain static render — no drag affordance. */
  disabled?: boolean;
  className?: string;
}

/**
 * Wraps a single row so it can be swiped left to delete. The row's existing
 * tap-to-delete affordance (e.g. a trash icon button) should stay fully
 * functional alongside this — this is an addition, not a replacement, so
 * keyboard/screen-reader users and anyone on a non-touch device are never
 * blocked, and jsdom-based tests (which can't simulate real drag gestures)
 * keep working against the plain click path.
 */
export function SwipeToDelete({
  onDelete,
  children,
  confirmLabel = 'Löschen',
  disabled = false,
  className = '',
}: SwipeToDeleteProps) {
  const controls = useAnimationControls();

  if (disabled) return <div className={className}>{children}</div>;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-danger-600 text-sm font-medium text-white"
      >
        {confirmLabel}
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={0.15}
        animate={controls}
        onDragEnd={(_e, info) => {
          if (info.offset.x < COMMIT_OFFSET || info.velocity.x < COMMIT_VELOCITY) {
            onDelete();
          } else {
            void controls.start({ x: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } });
          }
        }}
        className="relative bg-white dark:bg-slate-800"
      >
        {children}
      </motion.div>
    </div>
  );
}
