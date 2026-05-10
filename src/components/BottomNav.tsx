import { NavLink } from 'react-router-dom';
import { Dumbbell, ListChecks, LineChart, User, UtensilsCrossed } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

interface TabDef {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const TABS: TabDef[] = [
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
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2 text-xs ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-500'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
