import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

type CelebrationVariant = 'pr' | 'streak' | 'generic';

interface CelebrationProps {
  /** Parent flips this true momentarily to fire the effect. */
  trigger: boolean;
  /** Parent should reset `trigger` back to false here. */
  onComplete?: () => void;
  variant?: CelebrationVariant;
}

const VARIANT_COLOR: Record<CelebrationVariant, string> = {
  pr: '#e35a1a', // celebration-600
  streak: '#f59e0b', // warning-500
  generic: '#5b5ef2', // brand-500
};

const PARTICLE_COUNT = 10;

/**
 * Scaffold only — not wired to any real trigger yet (e.g. PR detection in
 * ExerciseBlock.tsx). A later phase will flip `trigger` on a genuine "new
 * PR" / "streak milestone" signal. Kept intentionally simple: a brief
 * scale+opacity pulse plus a handful of outward-animating dots, no external
 * confetti dependency.
 */
export function Celebration({ trigger, onComplete, variant = 'generic' }: CelebrationProps) {
  const [burstId, setBurstId] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    setBurstId((id) => id + 1);
    const handle = setTimeout(() => onComplete?.(), 700);
    return () => clearTimeout(handle);
  }, [trigger, onComplete]);

  const color = VARIANT_COLOR[variant];
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    return { x: Math.cos(angle) * 48, y: Math.sin(angle) * 48 };
  });

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <AnimatePresence>
        {trigger ? (
          <motion.div
            key={burstId}
            className="absolute h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {trigger
          ? particles.map((p, i) => (
              <motion.span
                key={`${burstId}-${i}`}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: color }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ))
          : null}
      </AnimatePresence>
    </div>
  );
}
