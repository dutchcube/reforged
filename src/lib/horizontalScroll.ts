import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

/**
 * Maakt een zijwaarts scrollende rij bruikbaar zonder scrollbalk:
 *  - het muiswiel schuift de rij (verticaal wiel -> zijwaarts);
 *  - met de muis kun je de rij verslepen, zoals met een vinger;
 *  - `atStart` / `atEnd` vertellen of er links of rechts nog meer staat.
 * Op een aanraakscherm verandert er niets: daar swipe je gewoon.
 */
export function useHorizontalScroll(el: Ref<HTMLElement | null>) {
  const atStart = ref(true)
  const atEnd = ref(true)

  let dragStartX = 0
  let dragStartLeft = 0
  let dragging = false
  let moved = false
  let observer: ResizeObserver | undefined

  function update() {
    const node = el.value
    if (!node) return
    const max = node.scrollWidth - node.clientWidth
    atStart.value = node.scrollLeft <= 1
    atEnd.value = node.scrollLeft >= max - 1
  }

  function onWheel(event: WheelEvent) {
    const node = el.value
    // Een zijwaarts gebaar (trackpad) handelt de browser zelf al af.
    if (!node || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
    const max = node.scrollWidth - node.clientWidth
    const next = Math.min(max, Math.max(0, node.scrollLeft + event.deltaY))
    // Aan het eind van de rij scrolt de pagina gewoon verder.
    if (next === node.scrollLeft) return
    event.preventDefault()
    node.scrollLeft = next
  }

  function onPointerDown(event: PointerEvent) {
    const node = el.value
    if (!node || event.pointerType !== 'mouse' || event.button !== 0) return
    dragging = true
    moved = false
    dragStartX = event.clientX
    dragStartLeft = node.scrollLeft
  }

  function onPointerMove(event: PointerEvent) {
    const node = el.value
    if (!node || !dragging) return
    const dx = event.clientX - dragStartX
    if (!moved && Math.abs(dx) < 5) return
    moved = true
    node.scrollLeft = dragStartLeft - dx
  }

  function onPointerUp() {
    dragging = false
  }

  /** Na het verslepen mag de knop onder de muis niet ook nog "aangeklikt" worden. */
  function onClickCapture(event: MouseEvent) {
    if (!moved) return
    moved = false
    event.stopPropagation()
    event.preventDefault()
  }

  function attach(node: HTMLElement) {
    node.addEventListener('scroll', update, { passive: true })
    node.addEventListener('wheel', onWheel, { passive: false })
    node.addEventListener('pointerdown', onPointerDown)
    node.addEventListener('click', onClickCapture, true)
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update)
      observer.observe(node)
    }
    update()
  }

  function detach(node: HTMLElement) {
    node.removeEventListener('scroll', update)
    node.removeEventListener('wheel', onWheel)
    node.removeEventListener('pointerdown', onPointerDown)
    node.removeEventListener('click', onClickCapture, true)
    observer?.disconnect()
    observer = undefined
  }

  // De rij staat vaak achter een v-if en verschijnt pas als de data er is.
  watch(
    el,
    (node, previous) => {
      if (previous) detach(previous)
      if (node) attach(node)
    },
    { flush: 'post' },
  )

  onMounted(() => {
    if (el.value) attach(el.value)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  })

  onBeforeUnmount(() => {
    if (el.value) detach(el.value)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  })

  return { atStart, atEnd, update }
}
