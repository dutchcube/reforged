# Setup

De app draait al lokaal (`npm run dev`), maar zonder Supabase kun je niet inloggen of data opslaan.
Onderstaande vier stappen moet je zelf doen — accounts aanmaken en OAuth-consent instellen kan ik niet namens jou.

## 1. Supabase-project aanmaken

1. Ga naar [supabase.com](https://supabase.com) → **New project** (gratis tier volstaat).
2. Kies een regio dicht bij je (bijv. Frankfurt) en bewaar het database-wachtwoord.
3. Wachten tot het project klaar is (~2 min).

## 2. Google OAuth koppelen

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
5. In Supabase **Authentication → URL Configuration**: zet **Site URL** op `http://localhost:5173`
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

Open in Supabase de **SQL Editor** → **New query** → plak de volledige inhoud van
[`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) → **Run**.

Dit maakt de vier tabellen (`workouts`, `exercises`, `sessions`, `session_exercises`) en zet
Row Level Security aan: elke gebruiker ziet uitsluitend zijn eigen rijen.

## Controleren of het werkt

1. `npm run dev` → open <http://localhost:5173> **in je eigen browser**
   (Google-OAuth werkt vaak niet in een embedded browser-pane).
2. Inloggen met Google → je landt op Home.
3. **+ Nieuwe workout** → naam "Workout A", oefeningen Squat 5×5 100kg, Bench Press 5×5 80kg → Opslaan.
4. Tik de workout aan → tik set-circles af → **Finish**.
5. Op Home verschijnt onder "Laatst voltooid": `Squat: 5/5/5/5/5 · 100kg`.
6. In Supabase → **Table Editor → sessions / session_exercises** staat dezelfde rij.

## Later: naar productie

Deploy naar Vercel/Netlify (`npm run build`, output `dist/`). Vergeet niet:
- dezelfde env-vars in de hosting-omgeving zetten;
- de productie-URL toevoegen aan Supabase (Site URL + Redirect URLs) en aan Google
  (JavaScript origins);
- de OAuth consent screen publiceren als anderen dan test-users moeten kunnen inloggen.
