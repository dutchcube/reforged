import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Zonder .env.local draait de app nog steeds (UI is te bekijken), maar elke
 * data-actie faalt. `isSupabaseConfigured` laat de UI dat netjes melden in
 * plaats van te crashen op een lege URL.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
