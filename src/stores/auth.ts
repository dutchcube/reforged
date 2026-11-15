import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { removeKey, USER_DATA_KEYS } from '@/lib/storage'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  /** false zolang de eerste getSession() nog loopt — de router-guard wacht hierop. */
  const ready = ref(false)
  const error = ref<string | null>(null)
  /** Mededeling die geen fout is, bijv. "bevestig je e-mailadres". */
  const notice = ref<string | null>(null)

  async function init() {
    if (ready.value) return

    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    ready.value = true

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  }

  async function signInWithGoogle() {
    error.value = null
    notice.value = null
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) error.value = err.message
  }

  async function signInWithPassword(email: string, password: string): Promise<boolean> {
    error.value = null
    notice.value = null
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      error.value =
        err.message === 'Invalid login credentials' ? 'E-mailadres of wachtwoord klopt niet.' : err.message
      return false
    }
    user.value = data.user
    return true
  }

  /** Maakt een account aan. Geeft true terug als je direct bent ingelogd. */
  async function signUp(email: string, password: string): Promise<boolean> {
    error.value = null
    notice.value = null
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (err) {
      error.value = err.message
      return false
    }
    if (!data.session) {
      // Supabase vraagt standaard om bevestiging per e-mail.
      notice.value = 'Account aangemaakt. Open de link in de bevestigingsmail om in te loggen.'
      return false
    }
    user.value = data.user
    return true
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    // Offline-kopieën horen bij dit account; een volgende gebruiker mag ze niet zien.
    USER_DATA_KEYS.forEach(removeKey)
    window.location.assign('/login')
  }

  return { user, ready, error, notice, init, signInWithGoogle, signInWithPassword, signUp, signOut }
})
