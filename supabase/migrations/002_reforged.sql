-- Reforged: progressie, lichaamsgewicht/notitie en atomair opslaan.
-- Draai dit NA 001_init.sql in de Supabase SQL-editor. Het script is herhaalbaar.

-- ------------------------------------------------------------ nieuwe kolommen
-- increment  = stap waarmee het gewicht stijgt na een geslaagde sessie (kg)
-- fail_count = aantal mislukte sessies op rij op het huidige gewicht
alter table public.exercises
  add column if not exists increment  numeric not null default 2.5 check (increment >= 0),
  add column if not exists fail_count int     not null default 0   check (fail_count >= 0);

alter table public.sessions
  add column if not exists body_weight numeric null check (body_weight is null or body_weight > 0),
  add column if not exists note        text    null;

-- --------------------------------------------------------------- save_workout
-- Slaat naam + oefeningen in één transactie op. Bestaande oefeningen houden hun
-- id (en dus hun fail_count); wat niet meer in de lijst staat wordt verwijderd.
-- security invoker: de RLS-policies uit 001 blijven gewoon gelden.
create or replace function public.save_workout(p_id uuid, p_name text, p_exercises jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := p_id;
begin
  if v_id is null then
    insert into public.workouts (name, position)
    values (
      p_name,
      (select coalesce(max(w.position) + 1, 0) from public.workouts w where w.user_id = auth.uid())
    )
    returning id into v_id;
  else
    update public.workouts set name = p_name where id = v_id;
    if not found then
      raise exception 'Workout niet gevonden';
    end if;
  end if;

  delete from public.exercises x
   where x.workout_id = v_id
     and x.id not in (
       select (t.e->>'id')::uuid
         from jsonb_array_elements(p_exercises) as t(e)
        where t.e->>'id' is not null
     );

  update public.exercises x
     set name       = t.e->>'name',
         sets       = (t.e->>'sets')::int,
         reps       = (t.e->>'reps')::int,
         -- handmatig een ander gewicht gekozen: de teller van mislukte sessies begint opnieuw
         fail_count = case
                        when x.weight is distinct from (t.e->>'weight')::numeric then 0
                        else x.fail_count
                      end,
         weight     = (t.e->>'weight')::numeric,
         increment  = coalesce((t.e->>'increment')::numeric, 2.5),
         position   = (t.ord - 1)::int
    from jsonb_array_elements(p_exercises) with ordinality as t(e, ord)
   where x.id = (t.e->>'id')::uuid
     and x.workout_id = v_id;

  insert into public.exercises (workout_id, name, sets, reps, weight, increment, position)
  select v_id,
         t.e->>'name',
         (t.e->>'sets')::int,
         (t.e->>'reps')::int,
         (t.e->>'weight')::numeric,
         coalesce((t.e->>'increment')::numeric, 2.5),
         (t.ord - 1)::int
    from jsonb_array_elements(p_exercises) with ordinality as t(e, ord)
   where t.e->>'id' is null;

  return v_id;
end;
$$;

-- ------------------------------------------------------------- finish_session
-- Bewaart een voltooide sessie met haar oefeningen en past in dezelfde
-- transactie de progressie toe (nieuw gewicht + fail_count per oefening).
-- De client rekent de progressie uit (src/lib/progression.ts, met tests).
create or replace function public.finish_session(p_session jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id        uuid;
  v_workout   uuid;
  v_exercises jsonb := coalesce(p_session->'exercises', '[]'::jsonb);
begin
  -- De workout kan intussen verwijderd zijn; dan blijft de sessie zonder koppeling bestaan.
  select w.id into v_workout
    from public.workouts w
   where w.id = (p_session->>'workout_id')::uuid;

  insert into public.sessions (workout_id, workout_name, started_at, completed_at, body_weight, note)
  values (
    v_workout,
    p_session->>'workout_name',
    (p_session->>'started_at')::timestamptz,
    now(),
    (p_session->>'body_weight')::numeric,
    nullif(btrim(p_session->>'note'), '')
  )
  returning id into v_id;

  insert into public.session_exercises
    (session_id, exercise_name, target_sets, target_reps, weight, reps_done, position)
  select v_id,
         t.e->>'exercise_name',
         (t.e->>'target_sets')::int,
         (t.e->>'target_reps')::int,
         (t.e->>'weight')::numeric,
         array(
           select r.v::int
             from jsonb_array_elements_text(t.e->'reps_done') with ordinality as r(v, i)
            order by r.i
         ),
         (t.ord - 1)::int
    from jsonb_array_elements(v_exercises) with ordinality as t(e, ord);

  update public.exercises x
     set weight     = (t.e->>'next_weight')::numeric,
         fail_count = (t.e->>'next_fail_count')::int
    from jsonb_array_elements(v_exercises) as t(e)
   where x.id = (t.e->>'exercise_id')::uuid
     and t.e->>'next_weight' is not null;

  return v_id;
end;
$$;

grant execute on function public.save_workout(uuid, text, jsonb) to authenticated;
grant execute on function public.finish_session(jsonb) to authenticated;

-- Laat de API de nieuwe kolommen en functies direct zien.
notify pgrst, 'reload schema';
