<script setup lang="ts">
import { formatClock } from '@/lib/format'
import { useRestTimerStore } from '@/stores/restTimer'

const PRESETS = [90, 180, 300] // 1:30, 3:00, 5:00

const timer = useRestTimerStore()
</script>

<template>
  <div class="card p-3">
    <!-- Rust nog niet gestart: presets + startknop -->
    <div v-if="!timer.running" class="flex items-center gap-2">
      <div class="flex gap-1.5">
        <button
          v-for="p in PRESETS"
          :key="p"
          type="button"
          class="tabular rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
          :class="
            timer.duration === p ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:bg-ink-700'
          "
          @click="timer.setDuration(p)"
        >
          {{ formatClock(p) }}
        </button>
      </div>
      <button type="button" class="btn-ghost ml-auto py-2" @click="timer.start()">Start rust</button>
    </div>

    <!-- Lopende timer -->
    <div v-else class="space-y-2">
      <div class="flex items-center gap-3">
        <p class="tabular font-display text-3xl font-bold text-volt-500" aria-live="off">
          {{ formatClock(timer.remaining) }}
        </p>
        <div class="ml-auto flex gap-1.5">
          <button type="button" class="btn-ghost px-3 py-2 text-xs" @click="timer.addSeconds(30)">
            +30s
          </button>
          <button type="button" class="btn-ghost px-3 py-2 text-xs" @click="timer.stop()">Stop</button>
        </div>
      </div>
      <div class="h-1 overflow-hidden rounded-full bg-ink-600">
        <div
          class="h-full rounded-full bg-volt-500 transition-[width] duration-200 ease-linear"
          :style="{ width: `${timer.progress * 100}%` }"
        />
      </div>
    </div>
  </div>
</template>
