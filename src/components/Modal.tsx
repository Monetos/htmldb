import { useEffect, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type ModalSize = 'fill' | 'auto' | 'compact';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Becomes the dialog's aria-label — keep call-site strings unchanged. */
  title: string;
  children: ReactNode;
  /** True for a modal opened from within another already-open modal. */
  stacked?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
  /**
   * 'fill' — fixed h-[90vh], for scrollable list pickers (ExercisePicker,
   * FoodPickerModal). 'auto' (default) — max-h-[92vh] + overflow-y-auto,
   * content-driven height (BarcodeScannerModal, AiFoodModal). 'compact' — no
   * height constraint, natural content height (simple confirm dialogs like
   * the finish-workout dialog).
   */
  size?: ModalSize;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  fill: 'flex h-[90vh] flex-col',
  auto: 'flex max-h-[92vh] flex-col overflow-y-auto',
  compact: '',
};

/**
 * Shared overlay, replacing five independently hand-rolled full-screen
 * dialogs. Slides up from the bottom on mobile widths (matches every
 * existing bespoke modal's `items-end sm:items-center` pattern) with a
 * spring transition. No focus trap yet (none of the modals it replaces had
 * one either) — only Escape-to-close and an optional initial-focus target.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  stacked = false,
  initialFocusRef,
  size = 'auto',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    initialFocusRef?.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, initialFocusRef]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="presentation"
          className={`fixed inset-0 flex items-end justify-center bg-black/50 p-0 dark:bg-black/60 sm:items-center sm:p-4 ${
            stacked ? 'z-40' : 'z-30'
          }`}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl rounded-t-3xl bg-white p-4 shadow-modal dark:bg-slate-900 sm:rounded-2xl ${SIZE_CLASSES[size]}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
