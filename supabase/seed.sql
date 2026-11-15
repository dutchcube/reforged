-- Reforged: voorbeelddata (4 workouts en 34 afgeronde sessies over ~12 weken).
--
-- Draai dit in de Supabase SQL-editor NA 001, 002 en 003, en nadat je Ã©Ã©n keer
-- bent ingelogd in de app (dan bestaat je account). De data is aan jouw account
-- gekoppeld en volgt de progressieregels van de app: gewichten stijgen na een
-- geslaagde sessie, mislukte sessies tellen mee en na drie keer missen volgt een
-- deload. De gewichten in "Programma's" zijn de stand nÃ¡ de laatste sessie.
--
-- Het script weigert te draaien als je account al workouts of sessies heeft, zodat
-- je nooit per ongeluk dubbele data krijgt. Zie onderaan hoe je alles weer wist.
--
-- Meerdere accounts in het project? Vul hieronder v_email in.

do $seed$
declare
  v_email    text := null;   -- bijv. 'jij@voorbeeld.nl'; leeg = het enige account
  v_user     uuid;
  v_users    int;
  v_ids      jsonb := '{}'::jsonb;
  v_wid      uuid;
  v_sid      uuid;
  v_started  timestamptz;
  w          jsonb;
  s          jsonb;
  v_workouts jsonb := $json$
[
 {
  "key": "push",
  "name": "Push dag",
  "position": 0,
  "exercises": [
   {
    "name": "Bench Press",
    "sets": 5,
    "reps": 5,
    "weight": 70,
    "increment": 2.5,
    "fail_count": 2
   },
   {
    "name": "Overhead Press",
    "sets": 5,
    "reps": 5,
    "weight": 42.5,
    "increment": 2.5,
    "fail_count": 0
   },
   {
    "name": "Triceps Pushdown",
    "sets": 3,
    "reps": 12,
    "weight": 25,
    "increment": 0,
    "fail_count": 0
   }
  ]
 },
 {
  "key": "pull",
  "name": "Pull dag",
  "position": 1,
  "exercises": [
   {
    "name": "Deadlift",
    "sets": 1,
    "reps": 5,
    "weight": 125,
    "increment": 5,
    "fail_count": 0
   },
   {
    "name": "Barbell Row",
    "sets": 5,
    "reps": 5,
    "weight": 67.5,
    "increment": 2.5,
    "fail_count": 0
   },
   {
    "name": "Barbell Curl",
    "sets": 3,
    "reps": 10,
    "weight": 25,
    "increment": 0,
    "fail_count": 0
   }
  ]
 },
 {
  "key": "legs",
  "name": "Beendag",
  "position": 2,
  "exercises": [
   {
    "name": "Squat",
    "sets": 5,
    "reps": 5,
    "weight": 97.5,
    "increment": 2.5,
    "fail_count": 0
   },
   {
    "name": "Lunges",
    "sets": 3,
    "reps": 10,
    "weight": 20,
    "increment": 0,
    "fail_count": 0
   },
   {
    "name": "Calf Raise",
    "sets": 3,
    "reps": 15,
    "weight": 40,
    "increment": 0,
    "fail_count": 0
   }
  ]
 },
 {
  "key": "acc",
  "name": "Accessoires",
  "position": 3,
  "exercises": [
   {
    "name": "Dips",
    "sets": 3,
    "reps": 10,
    "weight": null,
    "increment": 0,
    "fail_count": 0
   },
   {
    "name": "Face Pull",
    "sets": 3,
    "reps": 15,
    "weight": 20,
    "increment": 0,
    "fail_count": 0
   },
   {
    "name": "Hanging Leg Raise",
    "sets": 3,
    "reps": 10,
    "weight": null,
    "increment": 0,
    "fail_count": 0
   }
  ]
 }
]
$json$;
  v_sessions jsonb := $json$
[
  {"workout":"push","name":"Push dag","days_ago":86,"start_min":1109,"duration_min":49,"body_weight":82.1,"note":"Eerste sessie, vooral op techniek gelet.","exercises":[{"name":"Bench Press","target_sets":5,"target_reps":5,"weight":55,"reps_done":[5,5,5,5,5]},{"name":"Overhead Press","target_sets":5,"target_reps":5,"weight":35,"reps_done":[5,5,5,5,5]},{"name":"Triceps Pushdown","target_sets":3,"target_reps":12,"weight":25,"reps_done":[12,11,11]}]},
  {"workout":"pull","name":"Pull dag","days_ago":83,"start_min":1036,"duration_min":35,"body_weight":82.8,"note":null,"exercises":[{"name":"Deadlift","target_sets":1,"target_reps":5,"weight":90,"reps_done":[5]},{"name":"Barbell Row","target_sets":5,"target_reps":5,"weight":50,"reps_done":[5,5,5,5,5]},{"name":"Barbell Curl","target_sets":3,"target_reps":10,"weight":25,"reps_done":[10,10,10]}]},
  {"workout":"legs","name":"Beendag","days_ago":81,"start_min":1099,"duration_min":31,"body_weight":82,"note":null,"exercises":[{"name":"Squat","target_sets":5,"target_reps":5,"weight":80,"reps_done":[5,5,5,5,5]},{"name":"Lunges","target_sets":3,"target_reps":10,"weight":20,"reps_done":[10,10,10]},{"name":"Calf Raise","target_sets":3,"target_reps":15,"weight":40,"reps_done":[15,15,15]}]},
  {"workout":"acc","name":"Accessoires","days_ago":79,"start_min":1024,"duration_min":23,"body_weight":82.6,"note":null,"exercises":[{"name":"Dips","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]},{"name":"Face Pull","target_sets":3,"target_reps":15,"weight":20,"reps_done":[15,15,14]},{"name":"Hanging Leg Raise","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]}]},
  {"workout":"push","name":"Push dag","days_ago":76,"start_min":1107,"duration_min":45,"body_weight":82.2,"note":null,"exercises":[{"name":"Bench Press","target_sets":5,"target_reps":5,"weight":57.5,"reps_done":[5,5,5,5,5]},{"name":"Overhead Press","target_sets":5,"target_reps":5,"weight":37.5,"reps_done":[5,5,5,5,5]},{"name":"Triceps Pushdown","target_sets":3,"target_reps":12,"weight":25,"reps_done":[12,12,12]}]},
  {"workout":"pull","name":"Pull dag","days_ago":74,"start_min":1063,"duration_min":34,"body_weight":82.4,"note":null,"exercises":[{"name":"Deadlift","target_sets":1,"target_reps":5,"weight":95,"reps_done":[5]},{"name":"Barbell Row","target_sets":5,"target_reps":5,"weight":52.5,"reps_done":[5,5,5,5,5]},{"name":"Barbell Curl","target_sets":3,"target_reps":10,"weight":25,"reps_done":[10,10,10]}]},
  {"workout":"legs","name":"Beendag","days_ago":72,"start_min":1091,"duration_min":34,"body_weight":82.9,"note":"Nieuw record op squat!","exercises":[{"name":"Squat","target_sets":5,"target_reps":5,"weight":82.5,"reps_done":[5,5,5,5,5]},{"name":"Lunges","target_sets":3,"target_reps":10,"weight":20,"reps_done":[10,10,10]},{"name":"Calf Raise","target_sets":3,"target_reps":15,"weight":40,"reps_done":[15,15,15]}]},
  {"workout":"acc","name":"Accessoires","days_ago":69,"start_min":1105,"duration_min":25,"body_weight":null,"note":null,"exercises":[{"name":"Dips","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]},{"name":"Face Pull","target_sets":3,"target_reps":15,"weight":20,"reps_done":[15,15,15]},{"name":"Hanging Leg Raise","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]}]},
  {"workout":"push","name":"Push dag","days_ago":67,"start_min":1028,"duration_min":48,"body_weight":82.6,"note":"Moe, slecht geslapen.","exercises":[{"name":"Bench Press","target_sets":5,"target_reps":5,"weight":60,"reps_done":[5,5,5,5,5]},{"name":"Overhead Press","target_sets":5,"target_reps":5,"weight":40,"reps_done":[5,5,4,2,0]},{"name":"Triceps Pushdown","target_sets":3,"target_reps":12,"weight":25,"reps_done":[12,12,12]}]},
  {"workout":"pull","name":"Pull dag","days_ago":65,"start_min":1040,"duration_min":36,"body_weight":83,"note":"Ging lekker.","exercises":[{"name":"Deadlift","target_sets":1,"target_reps":5,"weight":100,"reps_done":[5]},{"name":"Barbell Row","target_sets":5,"target_reps":5,"weight":55,"reps_done":[5,5,5,5,5]},{"name":"Barbell Curl","target_sets":3,"target_reps":10,"weight":25,"reps_done":[10,10,10]}]},
  {"workout":"legs","name":"Beendag","days_ago":62,"start_min":1077,"duration_min":37,"body_weight":82.8,"note":null,"exercises":[{"name":"Squat","target_sets":5,"target_reps":5,"weight":85,"reps_done":[5,5,5,5,5]},{"name":"Lunges","target_sets":3,"target_reps":10,"weight":20,"reps_done":[10,10,10]},{"name":"Calf Raise","target_sets":3,"target_reps":15,"weight":40,"reps_done":[15,15,15]}]},
  {"workout":"acc","name":"Accessoires","days_ago":60,"start_min":1108,"duration_min":22,"body_weight":82.3,"note":null,"exercises":[{"name":"Dips","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]},{"name":"Face Pull","target_sets":3,"target_reps":15,"weight":20,"reps_done":[15,15,15]},{"name":"Hanging Leg Raise","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,9]}]},
  {"workout":"push","name":"Push dag","days_ago":58,"start_min":1035,"duration_min":43,"body_weight":82.7,"note":null,"exercises":[{"name":"Bench Press","target_sets":5,"target_reps":5,"weight":62.5,"reps_done":[5,5,5,5,5]},{"name":"Overhead Press","target_sets":5,"target_reps":5,"weight":40,"reps_done":[5,5,5,5,5]},{"name":"Triceps Pushdown","target_sets":3,"target_reps":12,"weight":25,"reps_done":[12,12,12]}]},
  {"workout":"pull","name":"Pull dag","days_ago":55,"start_min":1057,"duration_min":29,"body_weight":83.1,"note":null,"exercises":[{"name":"Deadlift","target_sets":1,"target_reps":5,"weight":105,"reps_done":[5]},{"name":"Barbell Row","target_sets":5,"target_reps":5,"weight":57.5,"reps_done":[5,5,5,5,5]},{"name":"Barbell Curl","target_sets":3,"target_reps":10,"weight":25,"reps_done":[10,10,8]}]},
  {"workout":"legs","name":"Beendag","days_ago":53,"start_min":1057,"duration_min":33,"body_weight":82.4,"note":null,"exercises":[{"name":"Squat","target_sets":5,"target_reps":5,"weight":87.5,"reps_done":[5,5,5,5,5]},{"name":"Lunges","target_sets":3,"target_reps":10,"weight":20,"reps_done":[10,10,10]},{"name":"Calf Raise","target_sets":3,"target_reps":15,"weight":40,"reps_done":[15,15,15]}]},
  {"workout":"acc","name":"Accessoires","days_ago":43,"start_min":1020,"duration_min":22,"body_weight":null,"note":"Weer begonnen na een week ziek, rustig aan gedaan.","exercises":[{"name":"Dips","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]},{"name":"Face Pull","target_sets":3,"target_reps":15,"weight":20,"reps_done":[15,15,15]},{"name":"Hanging Leg Raise","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]}]},
  {"workout":"push","name":"Push dag","days_ago":40,"start_min":1036,"duration_min":48,"body_weight":83.3,"note":"Moe, slecht geslapen.","exercises":[{"name":"Bench Press","target_sets":5,"target_reps":5,"weight":65,"reps_done":[5,5,5,5,4]},{"name":"Overhead Press","target_sets":5,"target_reps":5,"weight":42.5,"reps_done":[5,5,5,5,4]},{"name":"Triceps Pushdown","target_sets":3,"target_reps":12,"weight":25,"reps_done":[12,12,12]}]},
  {"workout":"pull","name":"Pull dag","days_ago":38,"start_min":1037,"duration_min":33,"body_weight":null,"note":"Moe, slecht geslapen.","exercises":[{"name":"Deadlift","target_sets":1,"target_reps":5,"weight":110,"reps_done":[3]},{"name":"Barbell Row","target_sets":5,"target_reps":5,"weight":60,"reps_done":[5,5,5,3,1]},{"name":"Barbell Curl","target_sets":3,"target_reps":10,"weight":25,"reps_done":[10,9,9]}]},
  {"workout":"legs","name":"Beendag","days_ago":36,"start_min":1089,"duration_min":33,"body_weight":82.8,"note":"Nieuw record op squat!","exercises":[{"name":"Squat","target_sets":5,"target_reps":5,"weight":90,"reps_done":[5,5,5,5,5]},{"name":"Lunges","target_sets":3,"target_reps":10,"weight":20,"reps_done":[10,10,10]},{"name":"Calf Raise","target_sets":3,"target_reps":15,"weight":40,"reps_done":[15,15,13]}]},
  {"workout":"acc","name":"Accessoires","days_ago":33,"start_min":1029,"duration_min":22,"body_weight":82.7,"note":"Ging lekker.","exercises":[{"name":"Dips","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]},{"name":"Face Pull","target_sets":3,"target_reps":15,"weight":20,"reps_done":[15,15,15]},{"name":"Hanging Leg Raise","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]}]},
  {"workout":"push","name":"Push dag","days_ago":31,"start_min":1085,"duration_min":48,"body_weight":83,"note":"Grip begaf het in de laatste set.","exercises":[{"name":"Bench Press","target_sets":5,"target_reps":5,"weight":65,"reps_done":[5,5,5,5,5]},{"name":"Overhead Press","target_sets":5,"target_reps":5,"weight":42.5,"reps_done":[5,5,5,3,2]},{"name":"Triceps Pushdown","target_sets":3,"target_reps":12,"weight":25,"reps_done":[12,12,12]}]},
  {"workout":"pull","name":"Pull dag","days_ago":29,"start_min":1047,"duration_min":32,"body_weight":83,"note":null,"exercises":[{"name":"Deadlift","target_sets":1,"target_reps":5,"weight":110,"reps_done":[5]},{"name":"Barbell Row","target_sets":5,"target_reps":5,"weight":60,"reps_done":[5,5,5,5,5]},{"name":"Barbell Curl","target_sets":3,"target_reps":10,"weight":25,"reps_done":[10,9,8]}]},
  {"workout":"legs","name":"Beendag","days_ago":26,"start_min":1040,"duration_min":36,"body_weight":83.4,"note":"Grip begaf het in de laatste set.","exercises":[{"name":"Squat","target_sets":5,"target_reps":5,"weight":92.5,"reps_done":[5,5,5,5,3]},{"name":"Lunges","target_sets":3,"target_reps":10,"weight":20,"reps_done":[10,10,10]},{"name":"Calf Raise","target_sets":3,"target_reps":15,"weight":40,"reps_done":[15,15,15]}]},
  {"workout":"acc","name":"Accessoires","days_ago":24,"start_min":1068,"duration_min":26,"body_weight":83.5,"note":"Ging lekker.","exercises":[{"name":"Dips","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,9]},{"name":"Face Pull","target_sets":3,"target_reps":15,"weight":20,"reps_done":[15,15,15]},{"name":"Hanging Leg Raise","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]}]},
  {"workout":"push","name":"Push dag","days_ago":22,"start_min":1087,"duration_min":42,"body_weight":83.3,"note":"Gewicht teruggezet na drie keer missen. Opbouwen maar weer.","exercises":[{"name":"Bench Press","target_sets":5,"target_reps":5,"weight":67.5,"reps_done":[5,5,5,5,5]},{"name":"Overhead Press","target_sets":5,"target_reps":5,"weight":42.5,"reps_done":[5,5,3,2,1]},{"name":"Triceps Pushdown","target_sets":3,"target_reps":12,"weight":25,"reps_done":[12,12,11]}]},
  {"workout":"pull","name":"Pull dag","days_ago":19,"start_min":1079,"duration_min":34,"body_weight":null,"note":"Laatste sets te zwaar.","exercises":[{"name":"Deadlift","target_sets":1,"target_reps":5,"weight":115,"reps_done":[3]},{"name":"Barbell Row","target_sets":5,"target_reps":5,"weight":62.5,"reps_done":[5,5,5,5,4]},{"name":"Barbell Curl","target_sets":3,"target_reps":10,"weight":25,"reps_done":[10,10,10]}]},
  {"workout":"legs","name":"Beendag","days_ago":17,"start_min":1091,"duration_min":38,"body_weight":82.9,"note":"Nieuw record op squat!","exercises":[{"name":"Squat","target_sets":5,"target_reps":5,"weight":92.5,"reps_done":[5,5,5,5,5]},{"name":"Lunges","target_sets":3,"target_reps":10,"weight":20,"reps_done":[10,9,9]},{"name":"Calf Raise","target_sets":3,"target_reps":15,"weight":40,"reps_done":[15,15,13]}]},
  {"workout":"acc","name":"Accessoires","days_ago":15,"start_min":1059,"duration_min":25,"body_weight":null,"note":null,"exercises":[{"name":"Dips","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]},{"name":"Face Pull","target_sets":3,"target_reps":15,"weight":20,"reps_done":[15,15,15]},{"name":"Hanging Leg Raise","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]}]},
  {"workout":"push","name":"Push dag","days_ago":12,"start_min":1091,"duration_min":43,"body_weight":83,"note":"Grip begaf het in de laatste set.","exercises":[{"name":"Bench Press","target_sets":5,"target_reps":5,"weight":70,"reps_done":[5,5,5,5,3]},{"name":"Overhead Press","target_sets":5,"target_reps":5,"weight":37.5,"reps_done":[5,5,5,5,5]},{"name":"Triceps Pushdown","target_sets":3,"target_reps":12,"weight":25,"reps_done":[12,12,12]}]},
  {"workout":"pull","name":"Pull dag","days_ago":10,"start_min":1050,"duration_min":31,"body_weight":83.1,"note":null,"exercises":[{"name":"Deadlift","target_sets":1,"target_reps":5,"weight":115,"reps_done":[5]},{"name":"Barbell Row","target_sets":5,"target_reps":5,"weight":62.5,"reps_done":[5,5,5,5,5]},{"name":"Barbell Curl","target_sets":3,"target_reps":10,"weight":25,"reps_done":[10,10,10]}]},
  {"workout":"legs","name":"Beendag","days_ago":8,"start_min":1079,"duration_min":36,"body_weight":83.4,"note":null,"exercises":[{"name":"Squat","target_sets":5,"target_reps":5,"weight":95,"reps_done":[5,5,5,5,5]},{"name":"Lunges","target_sets":3,"target_reps":10,"weight":20,"reps_done":[10,10,10]},{"name":"Calf Raise","target_sets":3,"target_reps":15,"weight":40,"reps_done":[15,15,15]}]},
  {"workout":"acc","name":"Accessoires","days_ago":5,"start_min":1035,"duration_min":23,"body_weight":83.4,"note":null,"exercises":[{"name":"Dips","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]},{"name":"Face Pull","target_sets":3,"target_reps":15,"weight":20,"reps_done":[15,15,15]},{"name":"Hanging Leg Raise","target_sets":3,"target_reps":10,"weight":null,"reps_done":[10,10,10]}]},
  {"workout":"push","name":"Push dag","days_ago":3,"start_min":1096,"duration_min":44,"body_weight":83.6,"note":"Laatste sets te zwaar.","exercises":[{"name":"Bench Press","target_sets":5,"target_reps":5,"weight":70,"reps_done":[5,5,5,3,2]},{"name":"Overhead Press","target_sets":5,"target_reps":5,"weight":40,"reps_done":[5,5,5,5,5]},{"name":"Triceps Pushdown","target_sets":3,"target_reps":12,"weight":25,"reps_done":[12,12,10]}]},
  {"workout":"pull","name":"Pull dag","days_ago":1,"start_min":1070,"duration_min":31,"body_weight":83.3,"note":null,"exercises":[{"name":"Deadlift","target_sets":1,"target_reps":5,"weight":120,"reps_done":[5]},{"name":"Barbell Row","target_sets":5,"target_reps":5,"weight":65,"reps_done":[5,5,5,5,5]},{"name":"Barbell Curl","target_sets":3,"target_reps":10,"weight":25,"reps_done":[10,10,9]}]}
]
$json$;
begin
  select count(*) into v_users from auth.users where v_email is null or email = v_email;
  if v_users = 0 then
    raise exception 'Geen account gevonden. Log eerst Ã©Ã©n keer in op de app.';
  elsif v_users > 1 then
    raise exception 'Meerdere accounts gevonden. Vul v_email in bovenaan het script.';
  end if;
  select id into v_user from auth.users where v_email is null or email = v_email;

  if exists (select 1 from public.workouts where user_id = v_user)
     or exists (select 1 from public.sessions where user_id = v_user) then
    raise exception 'Dit account heeft al workouts of sessies. Wis die eerst (zie onderaan) of gebruik een leeg account.';
  end if;

  -- workouts met hun oefeningen
  for w in select jsonb_array_elements(v_workouts) loop
    insert into public.workouts (user_id, name, position, created_at)
    values (v_user, w->>'name', (w->>'position')::int, now() - interval '90 days')
    returning id into v_wid;

    v_ids := v_ids || jsonb_build_object(w->>'key', v_wid);

    insert into public.exercises (workout_id, user_id, name, sets, reps, weight, increment, fail_count, position)
    select v_wid, v_user, x.e->>'name', (x.e->>'sets')::int, (x.e->>'reps')::int,
           (x.e->>'weight')::numeric, (x.e->>'increment')::numeric, (x.e->>'fail_count')::int,
           (x.ord - 1)::int
      from jsonb_array_elements(w->'exercises') with ordinality as x(e, ord);
  end loop;

  -- afgeronde sessies; days_ago telt terug vanaf vandaag, zodat de data altijd recent is
  for s in select jsonb_array_elements(v_sessions) loop
    v_started := ((current_date - (s->>'days_ago')::int)::timestamp
                  + make_interval(mins => (s->>'start_min')::int)) at time zone 'Europe/Amsterdam';

    insert into public.sessions (user_id, workout_id, workout_name, started_at, completed_at, body_weight, note)
    values (
      v_user,
      (v_ids->>(s->>'workout'))::uuid,
      s->>'name',
      v_started,
      v_started + make_interval(mins => (s->>'duration_min')::int),
      (s->>'body_weight')::numeric,
      s->>'note'
    )
    returning id into v_sid;

    insert into public.session_exercises
      (session_id, user_id, exercise_name, target_sets, target_reps, weight, reps_done, position)
    select v_sid, v_user, x.e->>'name', (x.e->>'target_sets')::int, (x.e->>'target_reps')::int,
           (x.e->>'weight')::numeric,
           array(
             select t.r::int
               from jsonb_array_elements_text(x.e->'reps_done') with ordinality as t(r, i)
              order by t.i
           ),
           (x.ord - 1)::int
      from jsonb_array_elements(s->'exercises') with ordinality as x(e, ord);
  end loop;

  raise notice 'Klaar: % workouts en % sessies toegevoegd.',
    jsonb_array_length(v_workouts), jsonb_array_length(v_sessions);
end
$seed$;

-- ------------------------------------------------------------------ opruimen
-- Wil je alle data van je account weer weg (workouts, sessies, historie)?
-- Haal de streepjes weg, vul je e-mailadres in en draai alleen deze twee regels:
--
-- delete from public.sessions  where user_id = (select id from auth.users where email = 'jij@voorbeeld.nl');
-- delete from public.workouts  where user_id = (select id from auth.users where email = 'jij@voorbeeld.nl');
