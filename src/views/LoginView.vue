<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
    <div class="space-y-3">
      <div
        class="mx-auto grid size-16 place-items-center rounded-2xl bg-volt-500 font-display text-3xl font-bold text-ink-900"
      >
        ⏱
      </div>
      <h1 class="text-3xl font-bold">Reps</h1>
      <p class="text-sm text-ink-400">Tik je sets af. Meer niet.</p>
    </div>

    <button type="button" class="btn-primary w-full max-w-xs" @click="auth.signInWithGoogle()">
      Doorgaan met Google
    </button>

    <p v-if="auth.error" class="text-sm text-danger-500">{{ auth.error }}</p>
  </main>
</template>
