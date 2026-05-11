import { AppHeader } from '../components/AppHeader';

export function NutritionPage() {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Ernährung" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
          Makro- und Wasser-Tracking folgen in Phase 5.
        </div>
      </main>
    </div>
  );
}
