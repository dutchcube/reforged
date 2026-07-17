import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  /** false zolang de eerste getSession() nog loopt — de router-guard wacht hierop. */
  const ready = ref(false)
  const error = ref<string | null>(null)

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
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) error.value = err.message
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
  }

  return { user, ready, error, init, signInWithGoogle, signOut }
})
