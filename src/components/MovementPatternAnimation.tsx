import { MOVEMENT_PATTERN_LABELS, type MovementPattern } from '../db/schema';

interface Targets {
  figure?: string;
  headTorso?: string;
  arms?: string;
  armRight?: string;
  legs?: string;
  legFront?: string;
  legBack?: string;
}

// Every animate-mp-* string below is a full literal so Tailwind's content
// scanner (which only sees static strings, not interpolated ones) picks it
// up — do NOT refactor this into `animate-mp-${pattern}` string building.
const PATTERN_ANIMATION: Record<MovementPattern, Targets> = {
  squat: {
    headTorso: 'animate-mp-squat-upper motion-reduce:animate-none',
    legs: 'animate-mp-squat-legs motion-reduce:animate-none',
  },
  hinge: { headTorso: 'animate-mp-hinge-torso motion-reduce:animate-none' },
  horizontal_push: { arms: 'animate-mp-push-h-arms motion-reduce:animate-none' },
  horizontal_pull: { arms: 'animate-mp-pull-h-arms motion-reduce:animate-none' },
  vertical_push: { arms: 'animate-mp-push-v-arms motion-reduce:animate-none' },
  vertical_pull: { figure: 'animate-mp-pull-v-body motion-reduce:animate-none' },
  lunge: {
    headTorso: 'animate-mp-lunge-upper motion-reduce:animate-none',
    legFront: 'animate-mp-lunge-front-leg motion-reduce:animate-none',
    legBack: 'animate-mp-lunge-back-leg motion-reduce:animate-none',
  },
  carry_core: { figure: 'animate-mp-carry-brace motion-reduce:animate-none' },
  isolation: { armRight: 'animate-mp-isolation-limb motion-reduce:animate-none' },
};

interface MovementPatternAnimationProps {
  pattern: MovementPattern;
  className?: string;
}

/**
 * One shared abstract stick figure; which body-part group animates (and how)
 * varies per movement pattern via Tailwind classes from PATTERN_ANIMATION.
 */
export function MovementPatternAnimation({ pattern, className = '' }: MovementPatternAnimationProps) {
  const t = PATTERN_ANIMATION[pattern];
  return (
    <svg
      role="img"
      aria-label={`Bewegungsmuster: ${MOVEMENT_PATTERN_LABELS[pattern]}`}
      viewBox="0 0 100 100"
      className={className}
    >
      <g fill="none" strokeWidth={4} strokeLinecap="round" className="stroke-slate-600 dark:stroke-slate-300">
        <g style={{ transformOrigin: '50px 50px' }} className={t.figure ?? ''}>
          <g style={{ transformOrigin: '50px 54px' }} className={t.headTorso ?? ''}>
            <circle cx={50} cy={16} r={7} className="fill-slate-600 dark:fill-slate-300" stroke="none" />
            <line x1={50} y1={24} x2={50} y2={54} />
          </g>
          <g style={{ transformOrigin: '50px 30px' }} className={t.arms ?? ''}>
            <line x1={50} y1={30} x2={32} y2={46} />
            <line
              x1={50}
              y1={30}
              x2={68}
              y2={46}
              style={{ transformOrigin: '50px 30px' }}
              className={t.armRight ?? ''}
            />
          </g>
          <g className={t.legs ?? ''}>
            <line
              x1={50}
              y1={54}
              x2={40}
              y2={86}
              style={{ transformOrigin: '50px 54px' }}
              className={t.legFront ?? ''}
            />
            <line
              x1={50}
              y1={54}
              x2={60}
              y2={86}
              style={{ transformOrigin: '50px 54px' }}
              className={t.legBack ?? ''}
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
