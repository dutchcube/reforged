-- Reforged: offline afgeronde sessies veilig kunnen nasturen.
-- Draai dit NA 002_reforged.sql in de Supabase SQL-editor. Het script is herhaalbaar.
--
-- finish_session accepteert nu twee extra velden:
--   id           = id die de app zelf kiest. Komt dezelfde sessie twee keer binnen
--                  (wankele verbinding), dan wordt hij maar één keer opgeslagen.
--   completed_at = het moment waarop je de workout echt afrondde, ook als hij
--                  pas later wordt verstuurd.
-- Ontbreken ze, dan werkt de functie zoals voorheen.

create or replace function public.finish_session(p_session jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id        uuid := coalesce((p_session->>'id')::uuid, gen_random_uuid());
  v_workout   uuid;
  v_exercises jsonb := coalesce(p_session->'exercises', '[]'::jsonb);
begin
  -- Al opgeslagen bij een eerdere poging: niets dubbel doen, ook de progressie niet.
  if exists (select 1 from public.sessions s where s.id = v_id) then
    return v_id;
  end if;

  -- De workout kan intussen verwijderd zijn; dan blijft de sessie zonder koppeling bestaan.
  select w.id into v_workout
    from public.workouts w
   where w.id = (p_session->>'workout_id')::uuid;

  insert into public.sessions (id, workout_id, workout_name, started_at, completed_at, body_weight, note)
  values (
    v_id,
    v_workout,
    p_session->>'workout_name',
    (p_session->>'started_at')::timestamptz,
    -- nooit in de toekomst, ook niet als de klok van de telefoon verkeerd staat
    least(coalesce((p_session->>'completed_at')::timestamptz, now()), now()),
    (p_session->>'body_weight')::numeric,
    nullif(btrim(p_session->>'note'), '')
  );

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

grant execute on function public.finish_session(jsonb) to authenticated;

notify pgrst, 'reload schema';
