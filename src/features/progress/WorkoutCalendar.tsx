import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../../db/database';
import { isoDayKey } from '../../lib/progression';
import type { Workout } from '../../db/schema';

const EMPTY_WORKOUTS: Workout[] = [];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function shiftMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1, 0, 0, 0, 0);
}

function buildMonthGrid(month: Date): { day: number; key: string; thisMonth: boolean }[] {
  const first = startOfMonth(month);
  const dayOfWeek = (first.getDay() + 6) % 7; // Monday = 0
  const grid: { day: number; key: string; thisMonth: boolean }[] = [];
  // Leading days from the previous month.
  for (let i = dayOfWeek; i > 0; i--) {
    const d = new Date(first);
    d.setDate(d.getDate() - i);
    grid.push({ day: d.getDate(), key: isoDayKey(d.getTime()), thisMonth: false });
  }
  // Current month days.
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(month.getFullYear(), month.getMonth(), d);
    grid.push({ day: d, key: isoDayKey(date.getTime()), thisMonth: true });
  }
  // Trailing to fill to a full week.
  while (grid.length % 7 !== 0) {
    const last = grid[grid.length - 1];
    const lastDate = new Date(`${last.key}T00:00:00`);
    lastDate.setDate(lastDate.getDate() + 1);
    grid.push({ day: lastDate.getDate(), key: isoDayKey(lastDate.getTime()), thisMonth: false });
  }
  return grid;
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function WorkoutCalendar() {
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const workoutsQuery = useLiveQuery(() => db.workouts.toArray(), []);
  const workouts = workoutsQuery ?? EMPTY_WORKOUTS;

  const trainedDays = useMemo(() => {
    const set = new Set<string>();
    for (const w of workouts) {
      if (!w.finishedAt) continue;
      set.add(isoDayKey(w.startedAt));
    }
    return set;
  }, [workouts]);

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const todayKey = isoDayKey(Date.now());

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Vorheriger Monat"
          onClick={() => setCursor((c) => shiftMonths(c, -1))}
          className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold">
          {cursor.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          aria-label="Nächster Monat"
          onClick={() => setCursor((c) => shiftMonths(c, 1))}
          className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-slate-400">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((cell) => {
          const trained = trainedDays.has(cell.key);
          const today = cell.key === todayKey;
          return (
            <div
              key={cell.key + (cell.thisMonth ? '' : '-out')}
              className={`flex aspect-square items-center justify-center rounded-lg text-xs ${
                cell.thisMonth ? '' : 'text-slate-300 dark:text-slate-600'
              } ${
                trained
                  ? 'bg-brand-100 font-semibold text-brand-700 dark:bg-brand-700/30 dark:text-brand-300'
                  : ''
              } ${today ? 'ring-2 ring-brand-500' : ''}`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
