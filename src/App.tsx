import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { UpdatePrompt } from './components/UpdatePrompt';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ActiveWorkoutPage } from './features/workout/ActiveWorkoutPage';
import { WorkoutSummaryPage } from './features/workout/WorkoutSummaryPage';
import { ExercisesPage } from './features/exercises/ExercisesPage';
import { ExerciseFormPage } from './features/exercises/ExerciseFormPage';
import { RoutinesPage } from './features/routines/RoutinesPage';
import { RoutineDetailPage } from './features/routines/RoutineDetailPage';
import { RoutineFormPage } from './features/routines/RoutineFormPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { BodyPage } from './features/body/BodyPage';
import { BodyPhotosTab } from './features/body/BodyPhotosTab';
import { BodyMetricFormPage } from './features/body/BodyMetricFormPage';
import { PhotoFormPage } from './features/body/PhotoFormPage';
import { PhotoComparePage } from './features/body/PhotoComparePage';
import { NutritionPage } from './features/nutrition/NutritionPage';
import { TodayTab } from './features/nutrition/TodayTab';
import { FoodsTab } from './features/nutrition/FoodsTab';
import { FoodFormPage } from './features/nutrition/FoodFormPage';
import { useTheme } from './hooks/useTheme';
import { useBootstrap } from './hooks/useBootstrap';
import { useAdaptiveTdee } from './hooks/useAdaptiveTdee';

// Chart-heavy routes are lazy-loaded so Recharts only enters the bundle when
// the user actually navigates to a stats / week view.
const ProgressPage = lazy(() =>
  import('./features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })),
);
const BodyHistoryTab = lazy(() =>
  import('./features/body/BodyHistoryTab').then((m) => ({ default: m.BodyHistoryTab })),
);
const WeekTab = lazy(() =>
  import('./features/nutrition/WeekTab').then((m) => ({ default: m.WeekTab })),
);
const ExerciseDetailPage = lazy(() =>
  import('./features/exercises/ExerciseDetailPage').then((m) => ({ default: m.ExerciseDetailPage })),
);

function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 text-center text-sm text-slate-500">
      Lade…
    </div>
  );
}

export default function App() {
  // Initialize theme from settings + seed exercises on first launch.
  useTheme();
  useBootstrap();
  useAdaptiveTdee();

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex-1 pb-16">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/training" element={<ActiveWorkoutPage />} />
            <Route path="/training/zusammenfassung/:workoutId" element={<WorkoutSummaryPage />} />
            <Route path="/uebungen" element={<ExercisesPage />} />
            <Route path="/uebungen/neu" element={<ExerciseFormPage />} />
            <Route path="/uebungen/:id" element={<ExerciseDetailPage />} />
            <Route path="/uebungen/:id/bearbeiten" element={<ExerciseFormPage />} />
            <Route path="/routinen" element={<RoutinesPage />} />
            <Route path="/routinen/neu" element={<RoutineFormPage />} />
            <Route path="/routinen/:id" element={<RoutineDetailPage />} />
            <Route path="/routinen/:id/bearbeiten" element={<RoutineFormPage />} />
            <Route path="/statistik" element={<ProgressPage />} />
            <Route path="/koerper" element={<BodyPage />}>
              <Route index element={<Navigate to="/koerper/verlauf" replace />} />
              <Route path="verlauf" element={<BodyHistoryTab />} />
              <Route path="fotos" element={<BodyPhotosTab />} />
            </Route>
            <Route path="/koerper/messung/neu" element={<BodyMetricFormPage />} />
            <Route path="/koerper/messung/:id/bearbeiten" element={<BodyMetricFormPage />} />
            <Route path="/koerper/foto/neu" element={<PhotoFormPage />} />
            <Route path="/koerper/foto/vergleich" element={<PhotoComparePage />} />
            <Route path="/ernaehrung" element={<NutritionPage />}>
              <Route index element={<Navigate to="/ernaehrung/heute" replace />} />
              <Route path="heute" element={<TodayTab />} />
              <Route path="woche" element={<WeekTab />} />
              <Route path="lebensmittel" element={<FoodsTab />} />
            </Route>
            <Route path="/ernaehrung/lebensmittel/neu" element={<FoodFormPage />} />
            <Route path="/ernaehrung/lebensmittel/:id/bearbeiten" element={<FoodFormPage />} />
            <Route path="/einstellungen" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <BottomNav />
      <UpdatePrompt />
    </div>
  );
}
