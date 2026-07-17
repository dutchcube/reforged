<script setup lang="ts">
import { computed } from 'vue'
import SetCircle from './SetCircle.vue'
import { formatTarget } from '@/lib/format'
import type { SetValue } from '@/stores/session'

const props = defineProps<{
  name: string
  targetSets: number
  targetReps: number
  weight: number | null
  values: SetValue[]
}>()

const emit = defineEmits<{ tap: [setIndex: number] }>()

/** Alle sets aangetikt én allemaal vol → de rij "glowt". */
const allDone = computed(() => props.values.every((v) => v === props.targetReps))
const anyDone = computed(() => props.values.some((v) => v !== null))
</script>

<template>
  <section
    class="card p-4 transition-colors"
    :class="allDone && 'border-volt-500/50 bg-volt-500/[0.06]'"
  >
    <header class="mb-3 flex items-baseline justify-between gap-3">
      <h2 class="flex items-center gap-2 text-base font-semibold">
        {{ name }}
        <span v-if="allDone" class="text-volt-500" aria-label="Oefening voltooid">✓</span>
      </h2>
      <p class="tabular shrink-0 text-sm text-ink-400">
        {{ formatTarget(targetSets, targetReps, weight) }}
      </p>
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
