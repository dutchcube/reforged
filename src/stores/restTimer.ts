import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSettingsStore } from './settings'

/**
 * Rusttimer als store, zodat het uitvoerscherm hem kan starten zodra je een
 * set aftikt en de timer blijft lopen als het component opnieuw rendert.
 */
export const useRestTimerStore = defineStore('restTimer', () => {
  const settings = useSettingsStore()

  const duration = ref(settings.restSeconds)
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

  /** Start (of herstart) de timer met de gekozen duur. */
  function start() {
    if (handle) window.clearInterval(handle)
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

  /** Zet de duur terug op de standaard uit Instellingen (begin van een sessie). */
  function reset() {
    stop()
    duration.value = settings.restSeconds
  }

  return { duration, remaining, running, progress, start, stop, addSeconds, setDuration, reset }
})
