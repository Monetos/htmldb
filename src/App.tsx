import { Navigate, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { ActiveWorkoutPage } from './features/workout/ActiveWorkoutPage';
import { ExercisesPage } from './features/exercises/ExercisesPage';
import { ExerciseDetailPage } from './features/exercises/ExerciseDetailPage';
import { ExerciseFormPage } from './features/exercises/ExerciseFormPage';
import { ProgressPage } from './features/progress/ProgressPage';
import { RoutinesPage } from './features/routines/RoutinesPage';
import { RoutineDetailPage } from './features/routines/RoutineDetailPage';
import { RoutineFormPage } from './features/routines/RoutineFormPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { BodyPage } from './features/body/BodyPage';
import { BodyHistoryTab } from './features/body/BodyHistoryTab';
import { BodyPhotosTab } from './features/body/BodyPhotosTab';
import { BodyMetricFormPage } from './features/body/BodyMetricFormPage';
import { PhotoFormPage } from './features/body/PhotoFormPage';
import { PhotoComparePage } from './features/body/PhotoComparePage';
import { NutritionPage } from './pages/NutritionPage';
import { useTheme } from './hooks/useTheme';
import { useBootstrap } from './hooks/useBootstrap';

export default function App() {
  // Initialize theme from settings + seed exercises on first launch.
  useTheme();
  useBootstrap();

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/training" replace />} />
          <Route path="/training" element={<ActiveWorkoutPage />} />
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
          <Route path="/ernaehrung" element={<NutritionPage />} />
          <Route path="/einstellungen" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/training" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}
