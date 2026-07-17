<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SetValue } from '@/stores/session'

const props = defineProps<{
  value: SetValue
  target: number
}>()

const emit = defineEmits<{ tap: [] }>()

// Korte "pop"-animatie bij elke waardewijziging.
const popping = ref(false)
watch(
  () => props.value,
  () => {
    popping.value = true
    setTimeout(() => (popping.value = false), 180)
  },
)

const done = computed(() => props.value !== null)
const full = computed(() => props.value === props.target)
const label = computed(() => (props.value === null ? props.target : props.value))
</script>

<template>
  <button
    type="button"
    class="tabular grid size-14 place-items-center rounded-full border-2 font-display text-lg
           font-semibold transition-[transform,background-color,border-color,color] duration-150
           active:scale-90"
    :class="[
      done
        ? full
          ? 'border-volt-500 bg-volt-500 text-ink-900 shadow-[0_0_16px_-2px_var(--color-volt-500)]'
          : 'border-volt-600 bg-volt-600/25 text-volt-400'
        : 'border-ink-500 bg-transparent text-ink-400',
      popping && 'scale-110',
    ]"
    :aria-label="done ? `${label} van ${target} reps gehaald` : `Set van ${target} reps, nog niet gedaan`"
    @click="emit('tap')"
  >
    {{ label }}
  </button>
</template>
