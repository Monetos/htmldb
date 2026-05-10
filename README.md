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

## Roadmap-Status

- [x] **Phase 0** – Setup, Schema, leere Navigation
- [ ] **Phase 1** – Workout-Logging + Übungsbibliothek
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
