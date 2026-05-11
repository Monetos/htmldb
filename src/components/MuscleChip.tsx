import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '../db/schema';

const COLORS: Record<MuscleGroup, string> = {
  chest: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  back_lats: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  back_traps: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  back_rhomboids: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  shoulders_front: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  shoulders_side: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  shoulders_rear: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  biceps: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
  triceps: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  forearms: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  quads: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  hamstrings: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  glutes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  calves: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  abs: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  lower_back: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

interface Props {
  muscle: MuscleGroup;
  variant?: 'primary' | 'secondary';
}

export function MuscleChip({ muscle, variant = 'primary' }: Props) {
  const base = COLORS[muscle];
  const className =
    variant === 'primary'
      ? `${base} px-2 py-0.5 rounded-full text-xs font-medium`
      : `border border-current ${base.replace(/bg-[^\s]+/g, '').replace(/dark:bg-[^\s]+/g, '')} bg-transparent px-2 py-0.5 rounded-full text-xs font-medium opacity-80`;
  return <span className={className}>{MUSCLE_GROUP_LABELS[muscle]}</span>;
}
