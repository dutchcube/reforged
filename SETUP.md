# Setup

Zonder Supabase kun je niet inloggen of data opslaan. Onderstaande stappen doe je zelf:
accounts aanmaken en sleutels invullen kan niet namens jou.

## 0. Node.js installeren

De app heeft [Node.js](https://nodejs.org) 22 of nieuwer nodig. Op Windows:

```
winget install OpenJS.NodeJS.LTS
```

Open daarna een nieuwe terminal in de projectmap en draai `npm install`.

## 1. Supabase-project aanmaken

1. Ga naar [supabase.com](https://supabase.com) → **New project** (gratis tier volstaat).
2. Kies een regio dicht bij je (bijv. Frankfurt) en bewaar het database-wachtwoord.
3. Wachten tot het project klaar is (~2 min).

## 2. Inloggen instellen

Je kunt inloggen met e-mail en wachtwoord, met Google, of allebei.

### E-mail en wachtwoord (snelste weg)

Dit staat in Supabase standaard aan. Na **Account aanmaken** in de app stuurt Supabase een
bevestigingsmail; pas na de klik op de link kun je inloggen. Gebruik je de app alleen zelf,
dan kun je dat uitzetten onder **Authentication → Sign In / Providers → Email → Confirm email**.

### Google (optioneel)

1. In Supabase: **Authentication → Sign In / Providers → Google** → zet hem aan.
   Kopieer de **Callback URL** die Supabase toont (`https://<project>.supabase.co/auth/v1/callback`).
2. Ga naar [Google Cloud Console](https://console.cloud.google.com) → maak een project →
   **APIs & Services → OAuth consent screen**: type **External**, vul app-naam en je eigen e-mail in.
   Voeg jezelf toe als **Test user** (dan hoef je de app niet te laten verifiëren).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs**: plak de callback-URL uit stap 1
   - **Authorized JavaScript origins**: `http://localhost:5173`
4. Kopieer **Client ID** en **Client secret** terug naar Supabase (Google-provider) → **Save**.

### Voor beide

In Supabase **Authentication → URL Configuration**: zet **Site URL** op `http://localhost:5173`
en voeg die ook toe onder **Redirect URLs**.

## 3. Keys in `.env.local`

Maak `.env.local` in de projectmap (staat in `.gitignore`, komt dus niet in git):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

Beide vind je in Supabase onder **Project Settings → API Keys**.
Herstart daarna `npm run dev` — Vite leest env-vars alleen bij het opstarten.

## 4. Database aanmaken

Open in Supabase de **SQL Editor** → **New query** en draai de twee scripts in deze volgorde,
elk in een eigen query (**Run**):

1. [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) — maakt de vier
   tabellen (`workouts`, `exercises`, `sessions`, `session_exercises`) en zet Row Level Security
   aan: elke gebruiker ziet uitsluitend zijn eigen rijen.
2. [`supabase/migrations/002_reforged.sql`](supabase/migrations/002_reforged.sql) — voegt de
   kolommen voor progressie, lichaamsgewicht en notitie toe, plus de functies `save_workout`
   en `finish_session` waarmee de app opslaat.

Had je het oude `workout-app`-project al draaien? Dan volstaat script 2; je data blijft staan.

## Controleren of het werkt

1. `npm run dev` → open <http://localhost:5173> **in je eigen browser**
   (Google-OAuth werkt vaak niet in een embedded browser-pane).
2. Log in → je landt op **Start**.
3. **Programma's → + Nieuw** → naam "Workout A", oefeningen Squat 5×5 100 kg en
   Bench Press 5×5 80 kg → **Opslaan**. Maak ook een "Workout B".
4. **Start → Start workout** → tik set-circles af (de rusttimer start vanzelf) → **Afronden**.
5. Op Start staat onder "Laatst voltooid": `Squat 5×5 · 100kg`, en "Nu aan de beurt" is Workout B.
6. Bij **Programma's** staat Squat in Workout A nu op 102,5 kg.
7. In Supabase → **Table Editor → sessions / session_exercises** staat dezelfde sessie.

Krijg je bij opslaan de melding `Could not find the function public.save_workout`, dan is
script 2 nog niet gedraaid.

## Later: naar productie

Deploy naar Vercel/Netlify (`npm run build`, output `dist/`). Vergeet niet:
- dezelfde env-vars in de hosting-omgeving zetten;
- een rewrite van alle paden naar `index.html` (de app gebruikt nette URL's zonder `#`);
- de productie-URL toevoegen aan Supabase (Site URL + Redirect URLs) en aan Google
  (JavaScript origins);
- de OAuth consent screen publiceren als anderen dan test-users moeten kunnen inloggen.

Op de productie-URL kun je de app op je telefoon installeren via **Delen → Zet op beginscherm**
(iOS) of **Installeren** (Android/Chrome).
