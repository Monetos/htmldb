export type CardElevation = 'flat' | 'raised';

interface CardClassNameOptions {
  elevation?: CardElevation;
  interactive?: boolean;
  className?: string;
}

/**
 * The shared card look as a plain className string, for the rare spots that
 * need it on a native `<button>` rather than through the `<Card>` component
 * itself (e.g. ExercisePicker/FoodPickerModal rows, where the tappable
 * element must be a real <button> for its accessible name to include all
 * its text content).
 *
 * `rounded-2xl` must stay literal here — some tests locate a card via
 * `closest('.rounded-2xl')`.
 */
export function cardClassName({
  elevation = 'flat',
  interactive = false,
  className = '',
}: CardClassNameOptions = {}): string {
  const base = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40';
  const elevationClass =
    elevation === 'raised'
      ? 'shadow-elevated dark:shadow-none dark:ring-1 dark:ring-white/5'
      : 'shadow-card dark:shadow-none';
  const interactiveClass = interactive
    ? 'transition hover:border-brand-300 dark:hover:border-brand-600 active:scale-[0.99] cursor-pointer'
    : '';
  return [base, elevationClass, interactiveClass, className].filter(Boolean).join(' ');
}
