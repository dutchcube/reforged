<script setup lang="ts">
import { computed } from 'vue'
import SetCircle from './SetCircle.vue'
import { formatWeight } from '@/lib/format'
import { PLATE_STEP } from '@/lib/progression'
import type { SetValue } from '@/stores/session'

const props = defineProps<{
  name: string
  targetSets: number
  targetReps: number
  weight: number | null
  values: SetValue[]
}>()

const emit = defineEmits<{
  tap: [setIndex: number]
  adjust: [delta: number]
}>()

/** Alle sets aangetikt én allemaal vol → de rij "glowt". */
const allDone = computed(() => props.values.every((v) => v === props.targetReps))
const anyDone = computed(() => props.values.some((v) => v !== null))
</script>

<template>
  <section
    class="card p-4 transition-colors"
    :class="allDone && 'border-volt-500/50 bg-volt-500/[0.06]'"
  >
    <header class="mb-3 flex items-center justify-between gap-3">
      <h2 class="flex min-w-0 items-center gap-2 text-base font-semibold">
        <span class="truncate">{{ name }}</span>
        <span v-if="allDone" class="text-volt-500" aria-label="Oefening voltooid">✓</span>
      </h2>

      <div class="tabular flex shrink-0 items-center gap-1.5 text-sm text-ink-400">
        <span>{{ targetSets }}×{{ targetReps }}</span>
        <!-- Gewicht bijstellen voor deze sessie, in stappen van 2,5 kg -->
        <template v-if="weight !== null">
          <button
            type="button"
            class="grid size-7 place-items-center rounded-lg border border-ink-600 text-ink-100 transition hover:bg-ink-700 disabled:opacity-30"
            :disabled="weight <= 0"
            :aria-label="`${name}: ${PLATE_STEP} kg lichter`"
            @click="emit('adjust', -PLATE_STEP)"
          >
            −
          </button>
          <span class="min-w-14 text-center font-semibold text-ink-100">{{ formatWeight(weight) }}</span>
          <button
            type="button"
            class="grid size-7 place-items-center rounded-lg border border-ink-600 text-ink-100 transition hover:bg-ink-700"
            :aria-label="`${name}: ${PLATE_STEP} kg zwaarder`"
            @click="emit('adjust', PLATE_STEP)"
          >
            +
          </button>
        </template>
      </div>
    </header>

    <div class="flex flex-wrap gap-2.5">
      <SetCircle
        v-for="(value, i) in values"
        :key="i"
        :value="value"
        :target="targetReps"
        @tap="emit('tap', i)"
      />
    </div>

    <p v-if="anyDone && !allDone" class="mt-3 text-xs text-ink-400">
      Tik nogmaals voor minder reps.
    </p>
  </section>
</template>
