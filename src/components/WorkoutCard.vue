<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatTarget } from '@/lib/format'
import type { Workout } from '@/lib/types'

const props = defineProps<{ workout: Workout }>()

const exercises = computed(() => props.workout.exercises ?? [])
const totalSets = computed(() => exercises.value.reduce((n, e) => n + e.sets, 0))
</script>

<template>
  <!--
    "Stretched link": de titel-link bedekt via ::after de hele kaart, de
    Bewerk-link ligt erboven. Zo is de kaart één tikdoel zonder links te nesten.
  -->
  <article class="card relative p-4 transition hover:border-volt-500/40">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="truncate text-lg font-semibold">
          <RouterLink
            :to="{ name: 'run', params: { workoutId: workout.id } }"
            class="after:absolute after:inset-0 after:rounded-card"
          >
            {{ workout.name }}
          </RouterLink>
        </h2>
        <p class="tabular mt-0.5 text-xs text-ink-400">
          {{ exercises.length }} oefeningen · {{ totalSets }} sets
        </p>
      </div>
      <RouterLink
        :to="{ name: 'edit', params: { workoutId: workout.id } }"
        class="relative z-10 shrink-0 rounded-lg px-2 py-1 text-xs text-ink-400 transition hover:bg-ink-700 hover:text-ink-100"
      >
        Bewerk
      </RouterLink>
    </div>

    <ul v-if="exercises.length" class="mt-3 space-y-1">
      <li
        v-for="e in exercises.slice(0, 4)"
        :key="e.id"
        class="flex justify-between gap-3 text-sm text-ink-400"
      >
        <span class="truncate">{{ e.name }}</span>
        <span class="tabular shrink-0">{{ formatTarget(e.sets, e.reps, e.weight) }}</span>
      </li>
      <li v-if="exercises.length > 4" class="text-xs text-ink-400">
        +{{ exercises.length - 4 }} meer
      </li>
    </ul>
    <p v-else class="mt-3 text-sm text-ink-400">Nog geen oefeningen.</p>
  </article>
</template>
