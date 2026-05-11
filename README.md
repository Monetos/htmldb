# Fitness

Persönliche Single-User-PWA für Krafttraining im Studio, eigene Übungsbibliothek, Progression, Körperdaten und Ernährung. Offline-first, alle Daten bleiben lokal in IndexedDB.

## Setup

```bash
npm install
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen.

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Vite Dev-Server mit HMR |
| `npm run build` | TypeScript-Check + Production-Build nach `dist/` |
| `npm run preview` | Production-Build lokal vorschauen |
| `npm run lint` | ESLint über das Projekt |
| `npm run format` | Prettier-Formatierung |
| `npm run test` | Vitest einmalig (CI-Modus) |
| `npm run test:watch` | Vitest im Watch-Mode für lokale Entwicklung |
| `npm run check` | **Quality-Gate**: Typecheck + Lint + Tests + Build |

## Tech-Stack

- **Vite + React 18 + TypeScript (strict)**
- **Tailwind CSS** (Dark Mode `class`-Strategie)
- **Zustand** für globalen State (kommt mit Phase 1)
- **Dexie.js** für IndexedDB
- **React Router v6**
- **Recharts** (ab Phase 3)
- **date-fns**
- **lucide-react** Icons
- **vite-plugin-pwa** (Workbox, autoUpdate)

## Projektstruktur

```
src/
├── db/                  # Dexie-Schema, Datenbank, Backup
├── features/            # Feature-Slices (workout, exercises, routines, ...)
├── components/          # Wiederverwendbare UI-Bausteine
├── hooks/               # useTheme, useTimer, useWorkout, ...
├── lib/                 # Reine Helfer / Formeln
├── pages/               # Route-Komponenten
├── App.tsx              # Routes + App-Shell
└── main.tsx             # Entry
```

## Datenmodell

Definiert in `src/db/schema.ts`. Tabellen werden in `src/db/database.ts` (Dexie) angelegt:

- `exercises`, `routines`, `workouts`, `sets`
- `bodyMetrics`, `progressPhotos`
- `foods`, `foodLog`, `waterLog`
- `settings` (Singleton mit Tageszielen + Theme)

## Selbst-Test-Strategie

Damit jede Phase mit hoher Zuverlässigkeit landet, läuft vor jedem Commit `npm run check` (Quality-Gate). Drei Ebenen:

1. **Unit-Tests (Vitest)** — reine Logik. Sub-Sekunden-Lauf.
2. **DB- & Komponenten-Tests (Vitest + Testing Library + fake-indexeddb)** — Dexie-Operationen gegen In-Memory-IndexedDB, React-Komponenten gegen jsdom. Aktuell: Singleton-Settings, Schema-Indizes, Bottom-Nav-Routing, Theme-Toggle + Persistenz.
3. **E2E + Screenshots (Playwright)** — kommt mit Phase 3 (Volumen-Heatmap), wo visuelle Verifikation den größten Mehrwert hat.

Test-Fixtures in `src/test/`. Setup wipet IndexedDB-Tabellen zwischen Tests.

## Roadmap-Status

- [x] **Phase 0** – Setup, Schema, leere Navigation
- [x] **Phase 0.5** – Vitest, Testing Library, fake-indexeddb, `npm run check`
- [x] **Phase 1** – Übungsbibliothek (55 Seed-Übungen), aktives Workout-Logging, Satzpausen-Timer, Statistik-Liste, JSON-Backup
- [x] **Phase 2** – Routinen (Editor mit Reorder & Targets, Start aus Routine, Satz-X-von-Y + „Letzter Satz!"-Hint, Reps-Vorbelegung aus Target)
- [x] **Phase 3** – PRs mit "Neuer PR!"-Hint im Training, sortierbare PR-Übersicht, Wochenvolumen-Ampel pro Muskelgruppe (4-Wochen-Mittel), 12-Wochen-Trend, Streak, Trainings-Kalender, Charts pro Übung
- [x] **Phase 4** – Körperdaten (Gewicht, KFA, alle Maße, Notizen) + Verlaufs-Charts (1M/3M/6M/1J/Alle), Fortschrittsfotos mit clientseitiger Kompression auf 1600px, Galerie pro View, Vorher/Nachher-Vergleich
- [ ] **Phase 5** – Ernährung
- [ ] **Phase 2** – Routinen
- [ ] **Phase 3** – Progression + Muskelgruppen-Heatmap
- [ ] **Phase 4** – Körperdaten + Fotos
- [ ] **Phase 5** – Ernährung
- [ ] **Phase 6** – PWA-Feinschliff

## Installation auf Android-Homescreen

Wird in Phase 6 dokumentiert.

## Hinweise

- `legacy/` enthält das ursprüngliche `htmldb`-Projekt aus diesem Repo und wird vom Build ignoriert.
- Datenhoheit: kein Server, kein Login, kein Sync. Manuelle JSON-Backups kommen mit Phase 1.
