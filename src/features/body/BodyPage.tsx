import { NavLink, Outlet } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';

const TABS = [
  { to: '/koerper/verlauf', label: 'Verlauf' },
  { to: '/koerper/fotos', label: 'Fotos' },
];

export function BodyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Körper" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-4">
        <nav className="mb-4 inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-1.5 text-sm transition ${
                  isActive
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </main>
    </div>
  );
}
