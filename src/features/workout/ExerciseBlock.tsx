import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Circle, ExternalLink, Flame, Trash2, TrendingDown, Trophy } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { Exercise, RoutineExercise, SetEntry, UnilateralSide } from '../../db/schema';
import { useRestTimer } from '../../store/restTimer';
import { addSet, deleteSet, lastWorkoutSetsForExercise } from './workoutLib';
import { SetDraftRow, SET_ROW_GRID_COLS, type DraftSet } from './SetRow';
import { CalculatorModal } from './CalculatorModal';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SwipeToDelete } from '../../components/SwipeToDelete';
import { MuscleChip } from '../../components/MuscleChip';
import { formatWeightInUnit, kgToUnit } from '../../lib/units';
import { useWeightUnit } from '../../hooks/useWeightUnit';
import { prBreakingSetsInWorkout } from '../../lib/progression';

export interface GroupContext {
  groupId: string;
  /** 0-based position within the group's fixed exercise order. */
  memberIndex: number;
  memberCount: number;
  /** Whether this exercise should have its draft open right now (its turn in the round). */
  isActive: boolean;
}

interface Props {
  workoutId: string;
  exercise: Exercise;
  /** When provided, ExerciseBlock surfaces target sets / reps from the routine. */
  routineTarget?: RoutineExercise;
  /** Present only for superset/circuit members — orchestrates turn-taking and shared rest. */
  group?: GroupContext;
}

export function ExerciseBlock({ workoutId, exercise, routineTarget, group }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const { unit } = useWeightUnit();
  const sets =
    useLiveQuery(
      () =>
        db.sets
          .where('workoutId')
          .equals(workoutId)
          .filter((s) => s.exerciseId === exercise.id)
          .sortBy('setNumber'),
      [workoutId, exercise.id],
    ) ?? [];

  const lastReference = useLiveQuery(
    () => lastWorkoutSetsForExercise(exercise.id, workoutId),
    [exercise.id, workoutId],
  );

  // All historical sets for this exercise (any workout), ordered chronologically.
  // Used to flag PR-breaking sets logged during the current workout.
  const historicalSetsQuery = useLiveQuery(
    () => db.sets.where('exerciseId').equals(exercise.id).sortBy('completedAt'),
    [exercise.id],
  );
  const prByCurrentSetId = useMemo(() => {
    if (!historicalSetsQuery) return new Map();
    return prBreakingSetsInWorkout(historicalSetsQuery, workoutId);
  }, [historicalSetsQuery, workoutId]);

  const [showDraftLocal, setShowDraftLocal] = useState(sets.length === 0);
  const [showCalculator, setShowCalculator] = useState(false);
  // Grouped members' draft visibility is fully derived from round state — the
  // user can't open/close it out of turn (round order is fixed for Phase 10).
  const showDraft = group ? group.isActive : showDraftLocal;
  const startRest = useRestTimer((s) => s.start);

  useEffect(() => {
    if (group?.isActive) {
      sectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [group?.isActive, group?.groupId]);

  // Pre-fill new set from the most recent set of this exercise in *any* workout
  const lastPrev = lastReference?.sets;
  const previousSet: SetEntry | undefined =
    sets[sets.length - 1] ?? (lastPrev && lastPrev.length > 0 ? lastPrev[lastPrev.length - 1] : undefined);

  // Routine workouts pre-fill reps with the upper end of the target range when
  // we have no prior set to copy from.
  const draftRepsFromTarget = routineTarget?.targetRepsMax;
  const restSecondsForTimer = routineTarget?.targetRestSeconds ?? exercise.defaultRestSeconds;
  const targetSets = routineTarget?.targetSets;
  const nextSetNumber = sets.length + 1;
  const isLastTargetSet = targetSets !== undefined && nextSetNumber === targetSets;
  const exceededTargetSets = targetSets !== undefined && nextSetNumber > targetSets;
  // Prefill rounds to the same precision the read-only displays use, so the
  // draft's starting value matches what the user just saw in "Letztes Mal".
  const draftWeightPrefill =
    unit === 'lbs'
      ? Math.round(kgToUnit(previousSet?.weightKg ?? 0, unit))
      : Math.round(kgToUnit(previousSet?.weightKg ?? 0, unit) * 10) / 10;
  const draftInitial: DraftSet | undefined = previousSet
    ? {
        weightKg: draftWeightPrefill,
        reps: previousSet.reps,
        rpe: '',
        isWarmup: false,
        isDropSet: false,
        toFailure: false,
        unilateralSide: '',
      }
    : draftRepsFromTarget !== undefined
      ? {
          weightKg: '',
          reps: draftRepsFromTarget,
          rpe: '',
          isWarmup: false,
          isDropSet: false,
          toFailure: false,
          unilateralSide: '',
        }
      : undefined;

  const handleComplete = async (input: {
    weightKg: number;
    reps: number;
    rpe?: number;
    isWarmup: boolean;
    isDropSet: boolean;
    toFailure: boolean;
    unilateralSide?: UnilateralSide;
  }) => {
    await addSet({ workoutId, exerciseId: exercise.id, ...input });
    // Within a superset round there's no rest between members — only after
    // the last member's set does the shared rest timer start.
    if (!input.isWarmup && (!group || group.memberIndex === group.memberCount - 1)) {
      startRest(restSecondsForTimer);
    }
    if (!group) setShowDraftLocal(false);
  };

  return (
    <ExerciseSurface grouped={Boolean(group)} sectionRef={sectionRef} ariaLabel={`Übung ${exercise.name}`}>
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{exercise.name}</h3>
            <Link
              to={`/uebungen/${exercise.id}`}
              aria-label="Details"
              className="text-slate-400 hover:text-brand-500"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              type="button"
              aria-label="Rechner öffnen"
              onClick={() => setShowCalculator(true)}
              className="text-slate-400 hover:text-brand-500"
            >
              <Calculator className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {exercise.primaryMuscles.map((m) => (
              <MuscleChip key={m} muscle={m} />
            ))}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          {routineTarget ? (
            <>
              <div className="font-medium text-slate-700 dark:text-slate-200">
                {routineTarget.targetSets} × {routineTarget.targetRepsMin}–
                {routineTarget.targetRepsMax}
              </div>
              <div>Pause {routineTarget.targetRestSeconds}s</div>
            </>
          ) : (
            <>Pause {exercise.defaultRestSeconds}s</>
          )}
        </div>
      </header>
      {routineTarget?.note ? (
        <p className="mb-2 rounded-xl bg-slate-50 px-3 py-1 text-xs italic text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
          „{routineTarget.note}"
        </p>
      ) : null}
      {prByCurrentSetId.size > 0 ? (
        <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Trophy className="h-3 w-3" /> Neuer PR!
        </p>
      ) : null}
      {targetSets !== undefined && showDraft ? (
        <p
          className={`mb-2 text-xs ${
            isLastTargetSet
              ? 'font-semibold text-amber-600 dark:text-amber-400'
              : exceededTargetSets
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500'
          }`}
        >
          {exceededTargetSets
            ? 'Über dem Zielbereich — Bonus-Satz'
            : `Satz ${nextSetNumber} von ${targetSets}${isLastTargetSet ? ' — Letzter Satz!' : ''}`}
        </p>
      ) : null}

      {lastReference ? (
        <details className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
          <summary className="cursor-pointer select-none">
            Letztes Mal: {new Date(lastReference.workout.startedAt).toLocaleDateString('de-DE')}
          </summary>
          <ul className="mt-1 list-inside list-decimal">
            {lastReference.sets.map((s) => (
              <li key={s.id}>
                {formatWeightInUnit(s.weightKg, unit)} {unit} × {s.reps}
                {s.isWarmup ? ' (Warmup)' : ''}
                {s.rpe ? ` @ RPE ${s.rpe}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div role="table" className="w-full text-sm">
        <div role="rowgroup">
          <div role="row" className={`${SET_ROW_GRID_COLS} text-xs uppercase tracking-wide text-slate-500`}>
            <span role="columnheader" className="px-1 py-1 text-center">
              #
            </span>
            <span role="columnheader" className="px-1 py-1 text-center">
              {unit}
            </span>
            <span role="columnheader" className="px-1 py-1 text-center">
              Wdh
            </span>
            <span role="columnheader" className="px-1 py-1 text-center">
              RPE
            </span>
            <span role="columnheader" className="px-1 py-1 text-center">
              Tags
            </span>
            <span role="columnheader" className="px-1 py-1"></span>
          </div>
        </div>
        <div role="rowgroup">
          {sets.map((s) => {
            const broke = prByCurrentSetId.get(s.id) ?? [];
            return (
              <SwipeToDelete key={s.id} onDelete={() => deleteSet(s.id)}>
                <div role="row" className={`${SET_ROW_GRID_COLS} border-t border-slate-200 dark:border-slate-700`}>
                  <div role="cell" className="px-1 py-2 text-center text-xs font-medium text-slate-500">
                    <div className="flex items-center justify-center gap-1">
                      <span>{s.setNumber}</span>
                      {broke.length > 0 ? (
                        <span
                          aria-label="Neuer Personal Record"
                          title={`Neuer PR: ${broke.join(', ')}`}
                          className="inline-flex h-4 items-center"
                        >
                          <Trophy className="h-3 w-3 text-amber-500" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div role="cell" className="px-1 py-2 text-center tabular-nums">
                    {formatWeightInUnit(s.weightKg, unit)}
                  </div>
                  <div role="cell" className="px-1 py-2 text-center tabular-nums">
                    {s.reps}
                  </div>
                  <div role="cell" className="px-1 py-2 text-center tabular-nums text-slate-500">
                    {s.rpe ?? '–'}
                  </div>
                  <div role="cell" className="flex flex-wrap items-center justify-center gap-0.5 px-1 py-2">
                    {s.isWarmup ? (
                      <span aria-label="Warmup" title="Warmup">
                        <Circle className="h-3 w-3 text-slate-400" />
                      </span>
                    ) : null}
                    {s.isDropSet ? (
                      <span aria-label="Drop-Satz" title="Drop-Satz">
                        <TrendingDown className="h-3 w-3 text-brand-500" />
                      </span>
                    ) : null}
                    {s.toFailure ? (
                      <span aria-label="Bis Muskelversagen" title="Bis Muskelversagen">
                        <Flame className="h-3 w-3 text-brand-500" />
                      </span>
                    ) : null}
                    {s.unilateralSide ? (
                      <span
                        aria-label={s.unilateralSide === 'left' ? 'Linke Seite' : 'Rechte Seite'}
                        className="text-[10px] font-bold text-brand-500"
                      >
                        {s.unilateralSide === 'left' ? 'L' : 'R'}
                      </span>
                    ) : null}
                  </div>
                  <div role="cell" className="px-1 py-2">
                    <button
                      type="button"
                      aria-label={`Satz ${s.setNumber} löschen`}
                      onClick={() => deleteSet(s.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </SwipeToDelete>
            );
          })}
          {showDraft ? (
            <SetDraftRow
              setNumber={sets.length + 1}
              initial={draftInitial}
              unit={unit}
              onComplete={handleComplete}
              onCancel={!group && sets.length > 0 ? () => setShowDraftLocal(false) : undefined}
            />
          ) : null}
        </div>
      </div>

      {!group && !showDraft ? (
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={() => setShowDraftLocal(true)}>
            + Satz hinzufügen
          </Button>
        </div>
      ) : null}

      <CalculatorModal
        open={showCalculator}
        onClose={() => setShowCalculator(false)}
        workoutId={workoutId}
        exercise={exercise}
        unit={unit}
        initialWeightKg={previousSet?.weightKg}
      />
    </ExerciseSurface>
  );
}

function ExerciseSurface({
  grouped,
  sectionRef,
  ariaLabel,
  children,
}: {
  grouped: boolean;
  sectionRef: RefObject<HTMLElement>;
  ariaLabel: string;
  children: ReactNode;
}) {
  // Grouped members render as plain padded sections — the SupersetGroup
  // wrapper around them already supplies the card chrome (border/shadow),
  // separated by its own divide-y instead of nested card borders.
  if (grouped) {
    return (
      <section ref={sectionRef} aria-label={ariaLabel} className="p-3">
        {children}
      </section>
    );
  }
  return (
    <Card as="section" ref={sectionRef} aria-label={ariaLabel}>
      {children}
    </Card>
  );
}
