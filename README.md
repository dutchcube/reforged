# Reps — workout tracker

Mobiel-gerichte workout-app geïnspireerd op StrongLifts 5x5. Stel workouts samen
(oefeningen met sets × reps en optioneel gewicht), voer ze uit door sets af te tikken
via set-circles, en zie op het startscherm je laatst voltooide sessies terug
(`Squat: 5/5/5/5/5 · 100kg`).

## Stack

Vue 3 (`<script setup>` + TypeScript) · Vite · Pinia · Vue Router · Tailwind CSS v4 ·
Supabase (Postgres + Auth met Google OAuth + Row Level Security).

## Aan de slag

```bash
npm install
npm run dev      # http://localhost:5173
```

Voor inloggen en opslaan is een Supabase-project nodig — zie **[SETUP.md](SETUP.md)**.
Zonder `.env.local` start de app wel op en toont hij een waarschuwingsbalk.

```bash
npm run build    # typecheck (vue-tsc) + productiebuild naar dist/
```

## Hoe de set-circles werken

Per circle, met `target` = geplande reps (bijv. 5):

| Toestand | Tik | Resultaat |
|---|---|---|
| grijs, toont `5` | 1e tik | accentkleur, `5` — set volledig gehaald |
| `5` | tik | `4` — minder reps gehaald |
| `4` → `1` | tik | telkens één minder |
| `0` | tik | terug naar grijs (`5`) |

De logica staat als pure functie in [`src/lib/setCircle.ts`](src/lib/setCircle.ts) (`nextSetValue`),
zodat er later eenvoudig Vitest-tests aan toegevoegd kunnen worden.

## Structuur

```
src/
├─ lib/          supabase-client, types, set-circle-logica, formatters
├─ router/       routes + auth-guard
├─ stores/       auth · workouts (CRUD) · session (actieve uitvoering)
├─ views/        Login · Home · WorkoutRun · WorkoutEdit
├─ components/   SetCircle · ExerciseRunRow · ExerciseEditRow · RestTimer · WorkoutCard
└─ assets/       main.css — Tailwind-import + @theme design tokens
supabase/migrations/001_init.sql   schema + RLS-policies
```

## Ontwerpkeuzes

- **Sessie leeft lokaal.** Tijdens een workout staat de voortgang in een Pinia-store,
  gespiegeld in `localStorage`. Een haperende verbinding in de sportschool of een refresh
  wist je sets niet; pas bij **Finish** gaat de sessie naar Supabase.
- **Historie via snapshots.** `sessions`/`session_exercises` bewaren naam, targets en gewicht
  als kopie, dus het aanpassen of verwijderen van een workout laat je historie intact.
- **Oefeningen worden vervangen bij opslaan** (delete + insert) in plaats van gediffed —
  eenvoudiger, en dankzij de snapshots verliest de historie niets.
