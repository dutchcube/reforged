<script setup lang="ts">
import { formatClock } from '@/lib/format'
import { DELOAD_FACTOR, FAILS_BEFORE_DELOAD } from '@/lib/progression'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const REST_OPTIONS = [90, 120, 180, 300]

const auth = useAuthStore()
const settings = useSettingsStore()

const deloadPercent = Math.round((1 - DELOAD_FACTOR) * 100)
</script>

<template>
  <main class="px-4 pt-6 pb-28">
    <header class="mb-6">
      <h1 class="text-2xl font-bold">Instellingen</h1>
      <p class="text-xs text-ink-400">Voorkeuren gelden voor dit toestel.</p>
    </header>

    <section class="card space-y-5 p-4">
      <h2 class="text-xs font-semibold tracking-wide text-ink-400 uppercase">Rusttimer</h2>

      <div>
        <p class="mb-2 text-sm">Standaard rusttijd</p>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="s in REST_OPTIONS"
            :key="s"
            type="button"
            class="tabular rounded-lg border px-2 py-2 text-sm font-semibold transition"
            :class="
              settings.restSeconds === s
                ? 'border-volt-500 bg-volt-500 text-ink-900'
                : 'border-ink-600 text-ink-400 hover:text-ink-100'
            "
            :aria-pressed="settings.restSeconds === s"
            @click="settings.restSeconds = s"
          >
            {{ formatClock(s) }}
          </button>
        </div>
      </div>

      <label class="flex items-center justify-between gap-4">
        <span>
          <span class="block text-sm">Timer vanzelf starten</span>
          <span class="block text-xs text-ink-400">Zodra je een set aftikt.</span>
        </span>
        <input
          v-model="settings.autoStartRest"
          type="checkbox"
          class="size-5 shrink-0 accent-volt-500"
        />
      </label>
    </section>

    <section class="card mt-3 space-y-4 p-4">
      <h2 class="text-xs font-semibold tracking-wide text-ink-400 uppercase">Training</h2>

      <label class="flex items-center justify-between gap-4">
        <span>
          <span class="block text-sm">Gewicht lege stang (kg)</span>
          <span class="block text-xs text-ink-400">Startpunt van de opwarmsets.</span>
        </span>
        <input
          v-model.number="settings.barWeight"
          type="number"
          inputmode="decimal"
          min="1"
          step="0.5"
          class="input tabular w-20 text-right"
        />
      </label>

      <p class="text-xs leading-relaxed text-ink-400">
        Progressie: haal je alle sets, dan gaat het gewicht de volgende keer omhoog met de stap van
        die oefening. Lukt het {{ FAILS_BEFORE_DELOAD }} sessies op rij niet, dan gaat het
        {{ deloadPercent }}% omlaag. De stap stel je per oefening in bij Programma's.
      </p>
    </section>

    <section class="card mt-3 space-y-4 p-4">
      <h2 class="text-xs font-semibold tracking-wide text-ink-400 uppercase">Account</h2>
      <p class="truncate text-sm">{{ auth.user?.email }}</p>
      <button type="button" class="btn-ghost w-full" @click="auth.signOut()">Uitloggen</button>
    </section>
  </main>
</template>
