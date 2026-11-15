import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

interface Settings {
  /** Standaard rusttijd tussen sets, in seconden. */
  restSeconds: number
  /** Start de rusttimer vanzelf zodra je een set aftikt. */
  autoStartRest: boolean
  /** Gewicht van de lege stang (kg) — basis voor de opwarmsets. */
  barWeight: number
}

const STORAGE_KEY = 'reforged:settings'
const DEFAULTS: Settings = { restSeconds: 180, autoStartRest: true, barWeight: 20 }

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

/** Voorkeuren per apparaat. Ze staan in localStorage, niet in de database. */
export const useSettingsStore = defineStore('settings', () => {
  const initial = load()
  const restSeconds = ref(initial.restSeconds)
  const autoStartRest = ref(initial.autoStartRest)
  const barWeight = ref(initial.barWeight)

  watch([restSeconds, autoStartRest, barWeight], () => {
    const value: Settings = {
      restSeconds: restSeconds.value,
      autoStartRest: autoStartRest.value,
      // Leeg invoerveld levert '' of NaN op; val dan terug op de standaard.
      barWeight: Number.isFinite(barWeight.value) && barWeight.value > 0 ? barWeight.value : 20,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Opslag vol of geblokkeerd: de instellingen gelden dan alleen deze sessie.
    }
  })

  return { restSeconds, autoStartRest, barWeight }
})
