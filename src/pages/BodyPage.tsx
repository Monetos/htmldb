import { AppHeader } from '../components/AppHeader';

export function BodyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Körper" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
          Körperdaten &amp; Fortschrittsfotos folgen in Phase 4.
        </div>
      </main>
    </div>
  );
}
