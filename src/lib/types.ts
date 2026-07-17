export interface Exercise {
  id: string
  workout_id: string
  user_id: string
  name: string
  sets: number
  reps: number
  weight: number | null
  position: number
}

export interface Workout {
  id: string
  user_id: string
  name: string
  position: number
  created_at: string
  exercises?: Exercise[]
}

export interface SessionExercise {
  id: string
  session_id: string
  user_id: string
  exercise_name: string
  target_sets: number
  target_reps: number
  weight: number | null
  reps_done: number[]
}

export interface Session {
  id: string
  user_id: string
  workout_id: string | null
  workout_name: string
  started_at: string
  completed_at: string
  session_exercises?: SessionExercise[]
}

/** Nieuwe/bewerkte oefening in WorkoutEditView; `id` ontbreekt zolang hij nog niet bestaat. */
export interface ExerciseDraft {
  id?: string
  name: string
  sets: number
  reps: number
  weight: number | null
}
