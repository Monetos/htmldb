import { Navigate, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { TrainingPage } from './pages/TrainingPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { ProgressPage } from './pages/ProgressPage';
import { BodyPage } from './pages/BodyPage';
import { NutritionPage } from './pages/NutritionPage';
import { useTheme } from './hooks/useTheme';

export default function App() {
  // Initialize theme from settings on first render so the toggle stays in sync.
  useTheme();

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/training" replace />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/uebungen" element={<ExercisesPage />} />
          <Route path="/statistik" element={<ProgressPage />} />
          <Route path="/koerper" element={<BodyPage />} />
          <Route path="/ernaehrung" element={<NutritionPage />} />
          <Route path="*" element={<Navigate to="/training" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}
