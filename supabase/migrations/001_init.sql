-- Workout-app: initieel schema + Row Level Security
-- Plak dit in de Supabase SQL-editor (Dashboard -> SQL Editor -> New query -> Run).

-- ---------------------------------------------------------------- workouts
create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists workouts_user_idx on public.workouts (user_id, position);

-- --------------------------------------------------------------- exercises
create table if not exists public.exercises (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  sets        int  not null default 5 check (sets between 1 and 20),
  reps        int  not null default 5 check (reps between 1 and 100),
  weight      numeric null check (weight is null or weight >= 0),
  position    int  not null default 0
);

create index if not exists exercises_workout_idx on public.exercises (workout_id, position);

-- ---------------------------------------------------------------- sessions
-- Eén voltooide uitvoering van een workout. workout_name/oefeningen worden als
-- snapshot bewaard, zodat historie intact blijft als de workout later wijzigt.
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id    uuid null references public.workouts (id) on delete set null,
  workout_name  text not null,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz not null default now()
);

create index if not exists sessions_user_completed_idx on public.sessions (user_id, completed_at desc);

-- ------------------------------------------------------- session_exercises
create table if not exists public.session_exercises (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_name text not null,
  target_sets   int  not null,
  target_reps   int  not null,
  weight        numeric null,
  reps_done     int[] not null default '{}',   -- bijv. {5,5,5,4,0}
  position      int  not null default 0
);

create index if not exists session_exercises_session_idx on public.session_exercises (session_id, position);

-- --------------------------------------------------------------------- RLS
alter table public.workouts          enable row level security;
alter table public.exercises         enable row level security;
alter table public.sessions          enable row level security;
alter table public.session_exercises enable row level security;

-- Eén policy per tabel: je ziet en wijzigt uitsluitend je eigen rijen.
do $$
declare
  t text;
begin
  foreach t in array array['workouts', 'exercises', 'sessions', 'session_exercises'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format(
      'create policy %I on public.%I
         for all
         to authenticated
         using (user_id = auth.uid())
         with check (user_id = auth.uid())',
      t || '_owner', t
    );
  end loop;
end $$;
