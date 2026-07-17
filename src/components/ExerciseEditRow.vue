<script setup lang="ts">
import type { ExerciseDraft } from '@/lib/types'

defineProps<{
  exercise: ExerciseDraft
  index: number
  total: number
}>()

const emit = defineEmits<{
  move: [delta: number]
  remove: []
}>()
</script>

<template>
  <div class="card space-y-3 p-3">
    <div class="flex items-center gap-2">
      <input
        v-model="exercise.name"
        class="input"
        placeholder="Oefening (bijv. Squat)"
        aria-label="Naam van de oefening"
      />
      <div class="flex shrink-0 flex-col">
        <button
          type="button"
          class="rounded px-2 text-ink-400 transition hover:text-ink-100 disabled:opacity-25"
          :disabled="index === 0"
          aria-label="Omhoog"
          @click="emit('move', -1)"
        >
          ▲
        </button>
        <button
          type="button"
          class="rounded px-2 text-ink-400 transition hover:text-ink-100 disabled:opacity-25"
          :disabled="index === total - 1"
          aria-label="Omlaag"
          @click="emit('move', 1)"
        >
          ▼
        </button>
      </div>
    </div>

    <div class="flex items-end gap-2">
      <label class="flex-1">
        <span class="mb-1 block text-xs text-ink-400">Sets</span>
        <input v-model.number="exercise.sets" type="number" min="1" max="20" class="input tabular" />
      </label>
      <label class="flex-1">
        <span class="mb-1 block text-xs text-ink-400">Reps</span>
        <input v-model.number="exercise.reps" type="number" min="1" max="100" class="input tabular" />
      </label>
      <label class="flex-1">
        <span class="mb-1 block text-xs text-ink-400">Gewicht (kg)</span>
        <input
          v-model.number="exercise.weight"
          type="number"
          min="0"
          step="0.5"
          placeholder="—"
          class="input tabular"
        />
      </label>
      <button
        type="button"
        class="btn-danger shrink-0 px-3 py-2 text-xs"
        aria-label="Oefening verwijderen"
        @click="emit('remove')"
      >
        ✕
      </button>
    </div>
  </div>
</template>
