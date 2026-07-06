import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { bestPrFromSets } from '../../lib/progression';
import { formatWeight } from '../../lib/format';
import type { Exercise, SetEntry } from '../../db/schema';
import { Card } from '../../components/Card';
import { cardClassName } from '../../lib/cardStyles';

interface Row {
  exercise: Exercise;
  heaviestKg: number | null;
  heaviestFor5Kg: number | null;
  best1Rm: number | null;
}

type SortKey = 'name' | 'heaviestKg' | 'heaviestFor5Kg' | 'best1Rm';

const EMPTY_SETS: SetEntry[] = [];
const EMPTY_EXERCISES: Exercise[] = [];

export function PrTable() {
  const [sortBy, setSortBy] = useState<SortKey>('best1Rm');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const exercisesQuery = useLiveQuery(() => db.exercises.toArray(), []);
  const setsQuery = useLiveQuery(() => db.sets.toArray(), []);

  const exercises = exercisesQuery ?? EMPTY_EXERCISES;
  const sets = setsQuery ?? EMPTY_SETS;

  const rows = useMemo<Row[]>(() => {
    const byExercise = new Map<string, SetEntry[]>();
    for (const s of sets) {
      if (s.isWarmup) continue;
      const arr = byExercise.get(s.exerciseId) ?? [];
      arr.push(s);
      byExercise.set(s.exerciseId, arr);
    }
    const result: Row[] = [];
    for (const ex of exercises) {
      const exSets = byExercise.get(ex.id);
      if (!exSets || exSets.length === 0) continue;
      const best = bestPrFromSets(exSets);
      result.push({
        exercise: ex,
        heaviestKg: best.heaviestKg,
        heaviestFor5Kg: best.heaviestFor5Kg,
        best1Rm: best.best1Rm,
      });
    }
    return result;
  }, [exercises, sets]);

  const sorted = useMemo(() => {
    const dir = direction === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => {
      if (sortBy === 'name') return a.exercise.name.localeCompare(b.exercise.name) * dir;
      const av = a[sortBy] ?? -Infinity;
      const bv = b[sortBy] ?? -Infinity;
      if (av === bv) return a.exercise.name.localeCompare(b.exercise.name) * dir;
      return (av - bv) * dir;
    });
  }, [rows, sortBy, direction]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  if (rows.length === 0) {
    return (
      <Card className="border-dashed p-4 text-center text-sm text-slate-500">
        Noch keine PRs – logge ein paar Sätze.
      </Card>
    );
  }

  return (
    <div className={cardClassName({ className: 'overflow-hidden' })}>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <Th label="Übung" onClick={() => toggleSort('name')} active={sortBy === 'name'} direction={direction} className="w-1/2 text-left" />
            <Th label="Heavy" onClick={() => toggleSort('heaviestKg')} active={sortBy === 'heaviestKg'} direction={direction} />
            <Th label="≥5 Wdh" onClick={() => toggleSort('heaviestFor5Kg')} active={sortBy === 'heaviestFor5Kg'} direction={direction} />
            <Th label="1RM" onClick={() => toggleSort('best1Rm')} active={sortBy === 'best1Rm'} direction={direction} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.exercise.id}
              className="border-t border-slate-100 dark:border-slate-700/60"
            >
              <td className="truncate px-3 py-2">
                <Link
                  to={`/uebungen/${row.exercise.id}`}
                  className="hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {row.exercise.name}
                </Link>
              </td>
              <Cell value={row.heaviestKg} suffix="kg" />
              <Cell value={row.heaviestFor5Kg} suffix="kg" />
              <Cell value={row.best1Rm} suffix="kg" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  label,
  onClick,
  active,
  direction,
  className = '',
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  direction: 'asc' | 'desc';
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? onClick() : null)}
      className={`cursor-pointer select-none px-2 py-2 text-right ${className}`}
    >
      <span className={`inline-flex items-center gap-1 ${active ? 'text-slate-700 dark:text-slate-100' : ''}`}>
        {label}
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </span>
    </th>
  );
}

function Cell({ value, suffix }: { value: number | null; suffix: string }) {
  return (
    <td className="px-2 py-2 text-right tabular-nums">
      {value === null ? (
        <span className="text-slate-400">–</span>
      ) : (
        <>
          {formatWeight(Math.round(value * 10) / 10)} {suffix}
        </>
      )}
    </td>
  );
}
