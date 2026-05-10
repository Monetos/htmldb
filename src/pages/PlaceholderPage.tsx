import { AppHeader } from '../components/AppHeader';

interface Props {
  title: string;
  hint?: string;
}

export function PlaceholderPage({ title, hint }: Props) {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title={title} />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
          <p className="mt-2">{hint ?? 'Wird in einer kommenden Phase gebaut.'}</p>
        </div>
      </main>
    </div>
  );
}
