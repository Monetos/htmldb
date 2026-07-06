export interface RoutineTemplateExercise {
  exerciseName: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRestSeconds: number;
  groupId?: string;
}

export interface RoutineTemplateDay {
  name: string;
  exercises: RoutineTemplateExercise[];
}

export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  days: RoutineTemplateDay[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'ppl',
    name: 'Push/Pull/Legs (3 Tage)',
    description: 'Klassischer 3er-Split: Drücken, Ziehen, Beine — je einmal pro Woche.',
    days: [
      {
        name: 'PPL – Push',
        exercises: [
          { exerciseName: 'Bankdrücken Langhantel', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, targetRestSeconds: 150 },
          { exerciseName: 'Schulterdrücken Kurzhantel (sitzend)', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Schrägbankdrücken Langhantel', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Seitheben Kurzhantel', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, targetRestSeconds: 60 },
          { exerciseName: 'Dips', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Trizepsdrücken am Kabel', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetRestSeconds: 60 },
        ],
      },
      {
        name: 'PPL – Pull',
        exercises: [
          { exerciseName: 'Kreuzheben (konventionell)', targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, targetRestSeconds: 240 },
          { exerciseName: 'Klimmzug (breit, Obergriff)', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, targetRestSeconds: 120 },
          { exerciseName: 'Rudern mit Langhantel (vorgebeugt)', targetSets: 4, targetRepsMin: 8, targetRepsMax: 10, targetRestSeconds: 120 },
          { exerciseName: 'Latzug eng (Untergriff)', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Face Pulls am Kabel', targetSets: 3, targetRepsMin: 15, targetRepsMax: 20, targetRestSeconds: 60 },
          { exerciseName: 'Bizepscurls Langhantel', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 60 },
        ],
      },
      {
        name: 'PPL – Legs',
        exercises: [
          { exerciseName: 'Kniebeuge (High-Bar)', targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, targetRestSeconds: 240 },
          { exerciseName: 'Beinpresse 45°', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Beinbeuger liegend', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetRestSeconds: 90 },
          { exerciseName: 'Hip Thrust', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Wadenheben stehend', targetSets: 4, targetRepsMin: 12, targetRepsMax: 20, targetRestSeconds: 60 },
          { exerciseName: 'Plank', targetSets: 3, targetRepsMin: 30, targetRepsMax: 45, targetRestSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper/Lower (2 Tage)',
    description: 'Oberkörper/Unterkörper-Split, gut für 2-4 Trainingstage pro Woche.',
    days: [
      {
        name: 'Upper/Lower – Oberkörper',
        exercises: [
          { exerciseName: 'Bankdrücken Langhantel', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, targetRestSeconds: 150 },
          { exerciseName: 'Rudern mit Langhantel (vorgebeugt)', targetSets: 4, targetRepsMin: 8, targetRepsMax: 10, targetRestSeconds: 120 },
          { exerciseName: 'Schulterdrücken Kurzhantel (sitzend)', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Latzug breit', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Seitheben Kurzhantel', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, targetRestSeconds: 60 },
          { exerciseName: 'Bizepscurls Langhantel', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 60 },
          { exerciseName: 'Trizepsdrücken am Kabel', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetRestSeconds: 60 },
        ],
      },
      {
        name: 'Upper/Lower – Unterkörper',
        exercises: [
          { exerciseName: 'Kniebeuge (High-Bar)', targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, targetRestSeconds: 240 },
          { exerciseName: 'Kreuzheben rumänisch', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Beinpresse 45°', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Beinbeuger liegend', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetRestSeconds: 90 },
          { exerciseName: 'Hip Thrust', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Wadenheben sitzend', targetSets: 4, targetRepsMin: 12, targetRepsMax: 20, targetRestSeconds: 60 },
          { exerciseName: 'Beinheben hängend', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetRestSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Ganzkörper (3 Tage)',
    description: 'Drei abwechslungsreiche Ganzkörper-Workouts (A/B/C) für 3 Tage pro Woche.',
    days: [
      {
        name: 'Ganzkörper A',
        exercises: [
          { exerciseName: 'Kniebeuge (High-Bar)', targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, targetRestSeconds: 180 },
          { exerciseName: 'Bankdrücken Langhantel', targetSets: 3, targetRepsMin: 6, targetRepsMax: 10, targetRestSeconds: 150 },
          { exerciseName: 'Rudern an der Maschine', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Schulterdrücken Kurzhantel (sitzend)', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Plank', targetSets: 3, targetRepsMin: 30, targetRepsMax: 45, targetRestSeconds: 60 },
        ],
      },
      {
        name: 'Ganzkörper B',
        exercises: [
          { exerciseName: 'Kreuzheben (konventionell)', targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, targetRestSeconds: 240 },
          { exerciseName: 'Schrägbankdrücken Langhantel', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Klimmzug (breit, Obergriff)', targetSets: 3, targetRepsMin: 6, targetRepsMax: 10, targetRestSeconds: 120 },
          { exerciseName: 'Ausfallschritte (Walking Lunges) Kurzhantel', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Crunches', targetSets: 3, targetRepsMin: 15, targetRepsMax: 20, targetRestSeconds: 60 },
        ],
      },
      {
        name: 'Ganzkörper C',
        exercises: [
          { exerciseName: 'Front Squat', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, targetRestSeconds: 180 },
          { exerciseName: 'Dips', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Einarmiges Kurzhantelrudern', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Arnold Press', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Russian Twists', targetSets: 3, targetRepsMin: 15, targetRepsMax: 20, targetRestSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: '531',
    name: '5/3/1-Stil (4 Tage)',
    description: 'Vier Tage, je eine Hauptübung im Fokus, niedrige Wiederholungszahlen bei den Grundübungen.',
    days: [
      {
        name: '5/3/1 – Kniebeuge',
        exercises: [
          { exerciseName: 'Kniebeuge (High-Bar)', targetSets: 5, targetRepsMin: 3, targetRepsMax: 5, targetRestSeconds: 240 },
          { exerciseName: 'Beinpresse 45°', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Beinbeuger sitzend', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetRestSeconds: 90 },
          { exerciseName: 'Plank', targetSets: 3, targetRepsMin: 30, targetRepsMax: 45, targetRestSeconds: 60 },
        ],
      },
      {
        name: '5/3/1 – Bankdrücken',
        exercises: [
          { exerciseName: 'Bankdrücken Langhantel', targetSets: 5, targetRepsMin: 3, targetRepsMax: 5, targetRestSeconds: 240 },
          { exerciseName: 'Schrägbankdrücken Langhantel', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 120 },
          { exerciseName: 'Rudern am Kabel (enger Griff)', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, targetRestSeconds: 90 },
          { exerciseName: 'Trizepsdrücken am Kabel', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetRestSeconds: 60 },
        ],
      },
      {
        name: '5/3/1 – Kreuzheben',
        exercises: [
          { exerciseName: 'Kreuzheben (konventionell)', targetSets: 5, targetRepsMin: 3, targetRepsMax: 5, targetRestSeconds: 240 },
          { exerciseName: 'Hyperextensions', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetRestSeconds: 90 },
          { exerciseName: 'Klimmzug (breit, Obergriff)', targetSets: 3, targetRepsMin: 6, targetRepsMax: 10, targetRestSeconds: 120 },
          { exerciseName: 'Beinheben hängend', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetRestSeconds: 60 },
        ],
      },
      {
        name: '5/3/1 – Schulterdrücken',
        exercises: [
          { exerciseName: 'Schulterdrücken Langhantel (stehend)', targetSets: 5, targetRepsMin: 3, targetRepsMax: 5, targetRestSeconds: 240 },
          { exerciseName: 'Seitheben Kurzhantel', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, targetRestSeconds: 60 },
          { exerciseName: 'Face Pulls am Kabel', targetSets: 3, targetRepsMin: 15, targetRepsMax: 20, targetRestSeconds: 60 },
          { exerciseName: 'Hammercurls Kurzhantel', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetRestSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'starting-strength',
    name: 'Starting-Strength-Stil (2 Tage, A/B)',
    description: 'Einsteigerprogramm mit zwei alternierenden Workouts, 3×5 auf den Grundübungen.',
    days: [
      {
        name: 'Starting Strength – A',
        exercises: [
          { exerciseName: 'Kniebeuge (High-Bar)', targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, targetRestSeconds: 180 },
          { exerciseName: 'Bankdrücken Langhantel', targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, targetRestSeconds: 180 },
          { exerciseName: 'Kreuzheben (konventionell)', targetSets: 1, targetRepsMin: 5, targetRepsMax: 5, targetRestSeconds: 240 },
        ],
      },
      {
        name: 'Starting Strength – B',
        exercises: [
          { exerciseName: 'Kniebeuge (High-Bar)', targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, targetRestSeconds: 180 },
          { exerciseName: 'Schulterdrücken Langhantel (stehend)', targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, targetRestSeconds: 180 },
          { exerciseName: 'Klimmzug (breit, Obergriff)', targetSets: 3, targetRepsMin: 5, targetRepsMax: 8, targetRestSeconds: 120 },
        ],
      },
    ],
  },
];
