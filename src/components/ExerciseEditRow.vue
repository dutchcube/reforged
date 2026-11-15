<script setup lang="ts">
import { computed } from 'vue'
import { defaultIncrement } from '@/lib/progression'
import type { ExerciseDraft } from '@/lib/types'

const props = defineProps<{
  exercise: ExerciseDraft
  index: number
  total: number
}>()

const emit = defineEmits<{
  move: [delta: number]
  remove: []
}>()

/** Toont welke stap gekozen wordt als het veld leeg blijft. */
const incrementHint = computed(() => String(defaultIncrement(props.exercise.name)).replace('.', ','))
</script>

<template>
  <div class="card space-y-3 p-3">
    <div class="flex items-center gap-2">
      <input
        v-model="exercise.name"
        class="input"
        placeholder="Oefening (bijv. Squat)"
        aria-label="Naam van de oefening"
        maxlength="60"
      />
      <div class="flex shrink-0 items-center">
        <button
          type="button"
          class="rounded px-2 py-1 text-ink-400 transition hover:text-ink-100 disabled:opacity-25"
          :disabled="index === 0"
          aria-label="Omhoog"
          @click="emit('move', -1)"
        >
          ▲
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-ink-400 transition hover:text-ink-100 disabled:opacity-25"
          :disabled="index === total - 1"
          aria-label="Omlaag"
          @click="emit('move', 1)"
        >
          ▼
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-danger-500 transition hover:bg-danger-500/10"
          aria-label="Oefening verwijderen"
          @click="emit('remove')"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2">
      <label>
        <span class="mb-1 block text-xs text-ink-400">Sets</span>
        <input
          v-model.number="exercise.sets"
          type="number"
          inputmode="numeric"
          min="1"
          max="20"
          class="input tabular"
        />
      </label>
      <label>
        <span class="mb-1 block text-xs text-ink-400">Reps</span>
        <input
          v-model.number="exercise.reps"
          type="number"
          inputmode="numeric"
          min="1"
          max="100"
          class="input tabular"
        />
      </label>
      <label>
        <span class="mb-1 block text-xs text-ink-400">Kg</span>
        <input
          v-model.number="exercise.weight"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.5"
          placeholder="—"
          class="input tabular"
        />
      </label>
      <label>
        <span class="mb-1 block text-xs text-ink-400">Stap kg</span>
        <input
          v-model.number="exercise.increment"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.5"
          :placeholder="incrementHint"
          class="input tabular"
          aria-label="Stap in kg na een geslaagde sessie"
        />
      </label>
    </div>
  </div>
</template>
