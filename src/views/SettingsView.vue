<script setup lang="ts">
import { ref } from 'vue'
import { downloadCsv, sessionsToCsv } from '@/lib/csv'
import { formatClock } from '@/lib/format'
import { DELOAD_FACTOR, FAILS_BEFORE_DELOAD } from '@/lib/progression'
import { dayKey } from '@/lib/stats'
import { useAuthStore } from '@/stores/auth'
import { useHistoryStore } from '@/stores/history'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'

const REST_OPTIONS = [90, 120, 180, 300]

const auth = useAuthStore()
const settings = useSettingsStore()
const history = useHistoryStore()
const session = useSessionStore()

const deloadPercent = Math.round((1 - DELOAD_FACTOR) * 100)
const appVersion = __APP_VERSION__
const appCommit = __APP_COMMIT__
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator
const canKeepAwake = typeof navigator !== 'undefined' && 'wakeLock' in navigator

const exporting = ref(false)
const exportNote = ref('')

/** Haalt de nieuwste historie op en biedt hem aan als CSV-bestand. */
async function exportCsv() {
  exporting.value = true
  exportNote.value = ''
  await history.fetchSessions()
  exporting.value = false

  if (!history.sessions.length) {
    exportNote.value = history.error ?? 'Er zijn nog geen sessies om te exporteren.'
    return
  }
  downloadCsv(`reforged-${dayKey(new Date())}.csv`, sessionsToCsv(history.sessions))
  const n = history.sessions.length
  exportNote.value =
    `${n} ${n === 1 ? 'sessie' : 'sessies'} geëxporteerd.` +
    (history.offline ? ' Je bent offline: dit is de laatst bekende stand.' : '')
}

async function sync() {
  const sent = await session.flushPending()
  if (sent) await history.fetchSessions()
}

function signOut() {
  if (
    session.pendingCount &&
    !confirm(
      'Er staan nog sessies op dit toestel die niet zijn verstuurd. Als je uitlogt, gaan ze verloren. Toch uitloggen?',
    )
  ) {
    return
  }
  auth.signOut()
}
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

      <label class="flex items-center justify-between gap-4">
        <span>
          <span class="block text-sm">Geluid als de rust voorbij is</span>
          <span class="block text-xs text-ink-400">Twee korte piepjes. Werkt niet in de stille modus.</span>
        </span>
        <input v-model="settings.timerSound" type="checkbox" class="size-5 shrink-0 accent-volt-500" />
      </label>

      <label v-if="canVibrate" class="flex items-center justify-between gap-4">
        <span class="block text-sm">Trillen als de rust voorbij is</span>
        <input
          v-model="settings.timerVibrate"
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
          <span class="block text-xs text-ink-400">Basis voor de opwarmsets en de schijven.</span>
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

      <label class="flex items-center justify-between gap-4">
        <span>
          <span class="block text-sm">Schijven per kant tonen</span>
          <span class="block text-xs text-ink-400">Bij de hoofdoefeningen (stap boven 0).</span>
        </span>
        <input v-model="settings.showPlates" type="checkbox" class="size-5 shrink-0 accent-volt-500" />
      </label>

      <label class="flex items-center justify-between gap-4">
        <span>
          <span class="block text-sm">Scherm aan houden</span>
          <span class="block text-xs text-ink-400">
            {{
              canKeepAwake
                ? 'Tijdens een workout gaat je telefoon niet op slot.'
                : 'Deze browser ondersteunt dit niet.'
            }}
          </span>
        </span>
        <input
          v-model="settings.keepAwake"
          type="checkbox"
          class="size-5 shrink-0 accent-volt-500"
          :disabled="!canKeepAwake"
        />
      </label>

      <p class="text-xs leading-relaxed text-ink-400">
        Progressie: haal je alle sets, dan gaat het gewicht de volgende keer omhoog met de stap van
        die oefening. Lukt het {{ FAILS_BEFORE_DELOAD }} sessies op rij niet, dan gaat het
        {{ deloadPercent }}% omlaag. De stap stel je per oefening in bij Programma's; met stap 0
        verandert het gewicht nooit vanzelf (handig voor accessoire-oefeningen).
      </p>
    </section>

    <section class="card mt-3 space-y-4 p-4">
      <h2 class="text-xs font-semibold tracking-wide text-ink-400 uppercase">Gegevens</h2>

      <div v-if="session.pendingCount" class="space-y-2">
        <p class="text-sm">
          {{ session.pendingCount }}
          {{ session.pendingCount === 1 ? 'sessie wacht' : 'sessies wachten' }} op verbinding.
        </p>
        <button type="button" class="btn-ghost w-full" :disabled="session.syncing" @click="sync">
          {{ session.syncing ? 'Versturen…' : 'Nu versturen' }}
        </button>
        <p v-if="session.error" class="text-xs text-danger-500" role="alert">{{ session.error }}</p>
      </div>

      <div class="space-y-2">
        <button type="button" class="btn-ghost w-full" :disabled="exporting" @click="exportCsv">
          {{ exporting ? 'Bezig…' : 'Historie exporteren (CSV)' }}
        </button>
        <p class="text-xs text-ink-400" role="status">
          {{ exportNote || 'Eén regel per oefening per sessie; te openen in Excel.' }}
        </p>
      </div>
    </section>

    <section class="card mt-3 space-y-4 p-4">
      <h2 class="text-xs font-semibold tracking-wide text-ink-400 uppercase">Account</h2>
      <p class="truncate text-sm">{{ auth.user?.email }}</p>
      <button type="button" class="btn-ghost w-full" @click="signOut">Uitloggen</button>
    </section>

    <p class="tabular mt-6 text-center text-xs text-ink-400">
      Reforged versie {{ appVersion }} · {{ appCommit }}
    </p>
  </main>
</template>
