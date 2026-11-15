<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import WorkoutCard from '@/components/WorkoutCard.vue'
import { useWorkoutsStore } from '@/stores/workouts'

const store = useWorkoutsStore()

onMounted(() => store.fetchWorkouts())
</script>

<template>
  <main class="px-4 pt-6 pb-28">
    <header class="mb-6 flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Programma's</h1>
        <p class="text-xs text-ink-400">Tik een workout aan om te starten.</p>
      </div>
      <RouterLink :to="{ name: 'edit' }" class="btn-primary shrink-0 px-3 py-2">+ Nieuw</RouterLink>
    </header>

    <p v-if="store.error" class="mb-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500">
      {{ store.error }}
    </p>

    <div v-if="store.loading && !store.loaded" class="space-y-3">
      <div v-for="i in 2" :key="i" class="card h-28 animate-pulse opacity-50" />
    </div>

    <div v-else-if="store.workouts.length" class="space-y-3">
      <WorkoutCard v-for="w in store.workouts" :key="w.id" :workout="w" />
      <p class="pt-2 text-center text-xs text-ink-400">
        De workouts wisselen elkaar af in deze volgorde.
      </p>
    </div>

    <div v-else class="card p-8 text-center">
      <p class="font-display text-lg font-semibold">Nog geen workouts</p>
      <p class="mt-1 text-sm text-ink-400">
        Maak bijvoorbeeld Workout A en Workout B; de app wisselt ze vanzelf af.
      </p>
      <RouterLink :to="{ name: 'edit' }" class="btn-primary mt-5 w-full">+ Nieuwe workout</RouterLink>
    </div>
  </main>
</template>
