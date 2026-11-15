export interface Exercise {
  id: string
  workout_id: string
  user_id: string
  name: string
  sets: number
  reps: number
  weight: number | null
  /** Stap waarmee het gewicht stijgt na een geslaagde sessie (kg). */
  increment: number
  /** Aantal mislukte sessies op rij op het huidige gewicht. */
  fail_count: number
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
  position: number
}

export interface Session {
  id: string
  user_id: string
  workout_id: string | null
  workout_name: string
  started_at: string
  completed_at: string
  body_weight: number | null
  note: string | null
  session_exercises?: SessionExercise[]
}

/**
 * Nieuwe/bewerkte oefening in WorkoutEditView. `id` ontbreekt zolang hij nog
 * niet bestaat; `increment` leeg (null) betekent: kies de standaardstap.
 */
export interface ExerciseDraft {
  id?: string
  name: string
  sets: number
  reps: number
  weight: number | null
  increment: number | null
}
