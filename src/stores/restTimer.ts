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

  // Eén AudioContext voor de hele sessie. Hij wordt aangemaakt bij een tik op het
  // scherm (start van de timer); alleen dan mag een telefoon later geluid afspelen.
  let audio: AudioContext | undefined

  function unlockAudio() {
    if (!settings.timerSound) return
    try {
      audio ??= new AudioContext()
      if (audio.state === 'suspended') void audio.resume()
    } catch {
      // Geen geluid beschikbaar: de timer werkt gewoon door.
    }
  }

  /** Twee korte piepjes: goed hoorbaar in een sportschool, niet schel. */
  function beep() {
    if (!audio) return
    for (const offset of [0, 0.28]) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      const t = audio.currentTime + offset
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.2, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + 0.22)
    }
  }

  function alertDone() {
    try {
      if (settings.timerVibrate) navigator.vibrate?.([200, 100, 200])
      if (settings.timerSound) beep()
    } catch {
      // Geluid en trillen zijn een extraatje; een browser die ze blokkeert mag niet crashen.
    }
  }

  /** Start (of herstart) de timer met de gekozen duur. */
  function start() {
    unlockAudio()
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
