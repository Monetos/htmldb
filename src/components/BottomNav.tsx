import { NavLink } from 'react-router-dom';
import { Dumbbell, Home, ListChecks, LineChart, User, UtensilsCrossed } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

interface TabDef {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Only the Home tab needs this — see the NavLink prefix-matching note below. */
  end?: boolean;
}

const TABS: TabDef[] = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/training', label: 'Training', Icon: Dumbbell },
  { to: '/uebungen', label: 'Übungen', Icon: ListChecks },
  { to: '/statistik', label: 'Statistik', Icon: LineChart },
  { to: '/koerper', label: 'Körper', Icon: User },
  { to: '/ernaehrung', label: 'Ernährung', Icon: UtensilsCrossed },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-6">
        {TABS.map(({ to, label, Icon, end }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-xs ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-500'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="w-full truncate text-center">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
