import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Houdt het scherm aan zolang het component leeft en `enabled()` true geeft.
 * De browser laat de vergrendeling los zodra de tab naar de achtergrond gaat;
 * bij terugkomst vragen we hem opnieuw aan. Niet elke browser ondersteunt dit.
 */
export function useWakeLock(enabled: () => boolean) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const held = ref(false)
  let sentinel: WakeLockSentinel | null = null

  async function acquire() {
    if (!supported || sentinel || !enabled() || document.visibilityState !== 'visible') return
    try {
      sentinel = await navigator.wakeLock.request('screen')
      held.value = true
      sentinel.addEventListener('release', () => {
        sentinel = null
        held.value = false
      })
    } catch {
      // Bijv. bij een bijna lege accu weigert de telefoon; dan gaat het scherm gewoon uit.
    }
  }

  async function release() {
    const current = sentinel
    sentinel = null
    held.value = false
    try {
      await current?.release()
    } catch {
      // was al losgelaten
    }
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') void acquire()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    void acquire()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    void release()
  })

  watch(enabled, (on) => (on ? void acquire() : void release()))

  return { supported, held }
}
