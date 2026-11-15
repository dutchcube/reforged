# Reforged — workout tracker

Mobiel-gerichte workout-app geïnspireerd op StrongLifts 5×5. Stel workouts samen, tik je sets
af via set-circles en laat de app het gewicht voor de volgende keer uitrekenen.

Reforged voegt drie eerdere pogingen samen: de basis komt uit `workout-app` (Vue 3 + Supabase),
de schermindeling met tabbalk en historie uit `Easylifts`.

## Wat de app doet

- **Start** — toont de workout die nu aan de beurt is (A → B → A …), met geschatte eindtijd.
- **Programma's** — workouts maken, bewerken, ordenen en verwijderen.
- **Uitvoeren** — set-circles, voortgangsbalk, rusttimer die vanzelf start, gewicht bijstellen,
  tab met opwarmsets, lichaamsgewicht en notitie. Per oefening staat welke schijven er per
  kant op de stang moeten; het scherm blijft aan. Na afloop een samenvatting met nieuwe records.
- **Historie** — alle voltooide sessies, met duur en notitie; per sessie te verwijderen.
- **Voortgang** — per oefening een grafiek van gewicht, geschatte 1RM of volume, met records.
  Daarnaast een overzicht: trainingsdagen, volume per week, lichaamsgewicht en aandachtspunten.
- **Instellingen** — rusttijd, geluid en trillen van de timer, gewicht van de stang, schijven,
  scherm aan houden en export van de historie naar CSV.
- **Progressie** — alle sets gehaald: gewicht + stap (standaard 2,5 kg, deadlift 5 kg).
  Drie sessies op rij niet gehaald: 10% terug. Stap 0 = accessoire-oefening zonder progressie.
- **Offline** — workouts en historie staan ook op het toestel. Een sessie die je zonder bereik
  afrondt, wordt verstuurd zodra je weer online bent.
- **PWA** — installeerbaar op het beginscherm; een lopende sessie overleeft een refresh.

## Stack

Vue 3 (`<script setup>` + TypeScript) · Vite · Pinia · Vue Router · Tailwind CSS v4 ·
Supabase (Postgres + Auth + Row Level Security) · Vitest · vite-plugin-pwa.

## Aan de slag

Je hebt [Node.js](https://nodejs.org) 22 of nieuwer nodig.

```bash
npm install
npm run dev      # http://localhost:5173
```

Voor inloggen en opslaan is een Supabase-project nodig — zie **[SETUP.md](SETUP.md)**.
Zonder `.env.local` start de app wel op en toont hij een waarschuwingsbalk.

```bash
npm test         # unit tests (Vitest)
npm run build    # typecheck (vue-tsc) + productiebuild naar dist/
```

## Hoe de set-circles werken

Per circle, met `target` = geplande reps (bijv. 5):

| Toestand | Tik | Resultaat |
|---|---|---|
| grijs, toont `5` | 1e tik | accentkleur, `5` — set gehaald; de rusttimer start |
| `5` | tik | `4` — minder reps gehaald |
| `4` → `1` | tik | telkens één minder |
| `0` | tik | terug naar grijs (`5`) |

## Structuur

```
src/
├─ lib/          pure logica met tests: setCircle · progression · warmup · schedule ·
│                progress · format — plus supabase-client en types
├─ stores/       auth · workouts · session (actieve sessie) · history · restTimer · settings
├─ router/       routes + auth-guard
├─ views/        Home · Programs · History · Progress · Settings · WorkoutRun · WorkoutEdit · Login
├─ components/   TabBar · SetCircle · ExerciseRunRow · ExerciseEditRow · RestTimer ·
│                WorkoutCard · SessionCard
└─ assets/       main.css — Tailwind-import + @theme design tokens
supabase/migrations/
├─ 001_init.sql       tabellen + RLS-policies
├─ 002_reforged.sql   progressie-kolommen + RPC's save_workout en finish_session
└─ 003_offline.sql    finish_session: offline afgeronde sessies veilig nasturen
```

## Ontwerpkeuzes

- **Sessie leeft lokaal.** Tijdens een workout staat de voortgang in een Pinia-store,
  gespiegeld in `localStorage`. Een haperende verbinding in de sportschool of een refresh
  wist je sets niet; pas bij **Afronden** gaat de sessie naar Supabase. Mislukt dat, dan
  blijft de sessie staan en kun je het opnieuw proberen.
- **Opslaan is atomair.** Een workout opslaan (`save_workout`) en een sessie afronden
  (`finish_session`) lopen elk via één database-functie, dus in één transactie.
- **Progressie wordt in de app berekend** (`src/lib/progression.ts`, met tests) en in dezelfde
  transactie als de sessie weggeschreven.
- **Historie via snapshots.** `sessions`/`session_exercises` bewaren naam, doelen en gewicht
  als kopie, dus het aanpassen of verwijderen van een workout laat je historie intact.
- **Instellingen per toestel.** Rusttijd en stanggewicht staan in `localStorage`.
