<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { formatClock } from '@/lib/format'

const PRESETS = [90, 180, 300] // 1:30, 3:00, 5:00

const duration = ref(180) // standaard 3 min
const remaining = ref(0)
const running = ref(false)
let handle: number | undefined
// Eindtijd i.p.v. per-tick aftellen: setInterval loopt achter als de tab slaapt.
let endsAt = 0

const progress = computed(() => (duration.value ? remaining.value / duration.value : 0))

function tick() {
  remaining.value = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
  if (remaining.value <= 0) {
    stop()
    alertDone()
  }
}

function alertDone() {
  navigator.vibrate?.([120, 60, 120])
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => ctx.close()
  } catch {
    // Geluid is een extraatje; browsers die het blokkeren mogen niet crashen.
  }
}

function start() {
  endsAt = Date.now() + duration.value * 1000
  remaining.value = duration.value
  running.value = true
  handle = window.setInterval(tick, 250)
}

function stop() {
  running.value = false
  if (handle) window.clearInterval(handle)
  handle = undefined
}

function addSeconds(delta: number) {
  endsAt += delta * 1000
  tick()
}

function setDuration(seconds: number) {
  duration.value = seconds
  if (running.value) start()
}

onUnmounted(stop)
</script>

<template>
  <div class="card p-3">
    <!-- Rust nog niet gestart: presets + startknop -->
    <div v-if="!running" class="flex items-center gap-2">
      <div class="flex gap-1.5">
        <button
          v-for="p in PRESETS"
          :key="p"
          type="button"
          class="tabular rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
          :class="
            duration === p ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:bg-ink-700'
          "
          @click="setDuration(p)"
        >
          {{ formatClock(p) }}
        </button>
      </div>
      <button type="button" class="btn-ghost ml-auto py-2" @click="start">Start rust</button>
    </div>

    <!-- Lopende timer -->
    <div v-else class="space-y-2">
      <div class="flex items-center gap-3">
        <p class="tabular font-display text-3xl font-bold text-volt-500">
          {{ formatClock(remaining) }}
        </p>
        <div class="ml-auto flex gap-1.5">
          <button type="button" class="btn-ghost px-3 py-2 text-xs" @click="addSeconds(30)">
            +30s
          </button>
          <button type="button" class="btn-ghost px-3 py-2 text-xs" @click="stop">Stop</button>
        </div>
      </div>
      <div class="h-1 overflow-hidden rounded-full bg-ink-600">
        <div
          class="h-full rounded-full bg-volt-500 transition-[width] duration-200 ease-linear"
          :style="{ width: `${progress * 100}%` }"
        />
      </div>
    </div>
  </div>
</template>
