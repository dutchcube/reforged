<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const busy = ref(false)

async function submit() {
  if (busy.value) return
  busy.value = true
  const ok =
    mode.value === 'signin'
      ? await auth.signInWithPassword(email.value.trim(), password.value)
      : await auth.signUp(email.value.trim(), password.value)
  busy.value = false
  if (ok) router.replace({ name: 'home' })
}

function toggleMode() {
  mode.value = mode.value === 'signin' ? 'signup' : 'signin'
  auth.error = null
  auth.notice = null
}
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center gap-7 px-6 py-10">
    <div class="space-y-3 text-center">
      <img src="/favicon.svg" alt="" class="mx-auto size-16 rounded-2xl" />
      <h1 class="text-3xl font-bold">Reforged</h1>
      <p class="text-sm text-ink-400">Tik je sets af. De rest rekent de app uit.</p>
    </div>

    <div class="w-full max-w-xs space-y-4">
      <button type="button" class="btn-primary w-full" @click="auth.signInWithGoogle()">
        Doorgaan met Google
      </button>

      <p class="flex items-center gap-3 text-xs text-ink-400">
        <span class="h-px flex-1 bg-ink-600" />
        of met e-mail
        <span class="h-px flex-1 bg-ink-600" />
      </p>

      <form class="space-y-3" @submit.prevent="submit">
        <label class="block">
          <span class="mb-1 block text-xs text-ink-400">E-mailadres</span>
          <input v-model="email" type="email" class="input" autocomplete="email" required />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-ink-400">Wachtwoord</span>
          <input
            v-model="password"
            type="password"
            class="input"
            minlength="6"
            :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
            required
          />
        </label>
        <button type="submit" class="btn-ghost w-full" :disabled="busy">
          {{ busy ? 'Bezig…' : mode === 'signin' ? 'Inloggen' : 'Account aanmaken' }}
        </button>
      </form>

      <p v-if="auth.error" class="rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500" role="alert">
        {{ auth.error }}
      </p>
      <p v-if="auth.notice" class="rounded-lg bg-volt-500/10 p-3 text-sm text-volt-400" role="status">
        {{ auth.notice }}
      </p>

      <button
        type="button"
        class="w-full text-center text-xs text-ink-400 underline-offset-2 hover:text-ink-100 hover:underline"
        @click="toggleMode"
      >
        {{ mode === 'signin' ? 'Nog geen account? Maak er een aan' : 'Al een account? Log in' }}
      </button>
    </div>
  </main>
</template>
