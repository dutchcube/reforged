<script setup lang="ts">
import { computed } from 'vue'
import { durationMinutes, formatDay, formatReps, formatWeight } from '@/lib/format'
import type { Session } from '@/lib/types'

const props = defineProps<{
  session: Session
  /** Toon duur, lichaamsgewicht, notitie en de verwijderknop (Historie). */
  detailed?: boolean
}>()

const emit = defineEmits<{ remove: [] }>()

const meta = computed(() => {
  const parts = [`${durationMinutes(props.session.started_at, props.session.completed_at)} min`]
  if (props.session.body_weight !== null) {
    parts.push(`lichaamsgewicht ${formatWeight(props.session.body_weight)}`)
  }
  return parts.join(' · ')
})
</script>

<template>
  <article class="card p-4">
    <header class="mb-2 flex items-baseline justify-between gap-3">
      <h3 class="truncate font-semibold">{{ session.workout_name }}</h3>
      <p class="shrink-0 text-xs text-ink-400">{{ formatDay(session.completed_at) }}</p>
    </header>

    <ul class="space-y-1">
      <li
        v-for="se in session.session_exercises ?? []"
        :key="se.id"
        class="flex justify-between gap-3 text-sm"
      >
        <span class="truncate text-ink-400">{{ se.exercise_name }}</span>
        <span class="tabular shrink-0">
          {{ formatReps(se.reps_done, se.target_reps) }}
          <span v-if="se.weight !== null" class="text-ink-400">· {{ formatWeight(se.weight) }}</span>
        </span>
      </li>
    </ul>

    <template v-if="detailed">
      <p v-if="session.note" class="mt-3 rounded-lg bg-ink-700 px-3 py-2 text-sm whitespace-pre-line">
        {{ session.note }}
      </p>
      <footer class="mt-3 flex items-center justify-between gap-3 border-t border-ink-600/60 pt-3">
        <p class="tabular text-xs text-ink-400">{{ meta }}</p>
        <button
          type="button"
          class="shrink-0 text-xs text-danger-500 hover:underline"
          @click="emit('remove')"
        >
          Verwijder
        </button>
      </footer>
    </template>
  </article>
</template>
