import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

interface Settings {
  /** Standaard rusttijd tussen sets, in seconden. */
  restSeconds: number
  /** Start de rusttimer vanzelf zodra je een set aftikt. */
  autoStartRest: boolean
  /** Piepje als de rust voorbij is. */
  timerSound: boolean
  /** Trillen als de rust voorbij is (werkt niet op iPhone). */
  timerVibrate: boolean
  /** Gewicht van de lege stang (kg) — basis voor opwarmsets en schijven. */
  barWeight: number
  /** Toon per oefening welke schijven er per kant op de stang moeten. */
  showPlates: boolean
  /** Houd het scherm aan tijdens een workout. */
  keepAwake: boolean
}

const STORAGE_KEY = 'reforged:settings'
const DEFAULTS: Settings = {
  restSeconds: 180,
  autoStartRest: true,
  timerSound: true,
  timerVibrate: true,
  barWeight: 20,
  showPlates: true,
  keepAwake: true,
}

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
  const timerSound = ref(initial.timerSound)
  const timerVibrate = ref(initial.timerVibrate)
  const barWeight = ref(initial.barWeight)
  const showPlates = ref(initial.showPlates)
  const keepAwake = ref(initial.keepAwake)

  watch([restSeconds, autoStartRest, timerSound, timerVibrate, barWeight, showPlates, keepAwake], () => {
    const value: Settings = {
      restSeconds: restSeconds.value,
      autoStartRest: autoStartRest.value,
      timerSound: timerSound.value,
      timerVibrate: timerVibrate.value,
      // Leeg invoerveld levert '' of NaN op; val dan terug op de standaard.
      barWeight: Number.isFinite(barWeight.value) && barWeight.value > 0 ? barWeight.value : 20,
      showPlates: showPlates.value,
      keepAwake: keepAwake.value,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Opslag vol of geblokkeerd: de instellingen gelden dan alleen deze sessie.
    }
  })

  return { restSeconds, autoStartRest, timerSound, timerVibrate, barWeight, showPlates, keepAwake }
})
