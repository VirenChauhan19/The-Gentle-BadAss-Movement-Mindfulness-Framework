// 3D Tilt — attaches a single delegated mousemove listener on the document
// and tilts whichever card-like surface the cursor is over by writing
// --tilt-x / --tilt-y CSS variables. The CSS transform composes those vars
// into a rotateX/rotateY on every matched element.
//
// CSS Modules hash class names to e.g. "_feelCard_abc_123", so the substring
// selectors below catch every card across every page without per-file wiring.

const SELECTOR = [
  '[class*="Card_"]',
  '[class*="Tile_"]',
  '[class*="Panel_"]',
  '[class*="Hero_"]',
  '[class*="hero_"]',
  '[class*="dashboard_"]',
  '[class*="Dashboard_"]',
  '[class*="surface_"]',
  '[class*="Surface_"]',
].join(', ')

const MAX_TILT_DEG = 8           // peak rotation at corners
const LIFT_AT_CENTER_PX = 8      // translateZ at center of card
const SETTLE_MS = 480            // ease back to rest

export function init3DTilt() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {}
  // Touch-only devices get the scroll-driven CSS animation instead.
  if (window.matchMedia?.('(hover: none)').matches) return () => {}

  let active = null
  let rafId = 0
  let pending = { x: 0, y: 0, z: 0 }

  function writeVars() {
    if (active) {
      active.style.setProperty('--tilt-x', `${pending.x.toFixed(2)}deg`)
      active.style.setProperty('--tilt-y', `${pending.y.toFixed(2)}deg`)
      active.style.setProperty('--tilt-z', `${pending.z.toFixed(1)}px`)
    }
    rafId = 0
  }

  function clear(el) {
    if (!el) return
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
    el.style.setProperty('--tilt-z', '0px')
    // Briefly mark as settling so CSS can ease back smoothly.
    el.dataset.tiltSettling = '1'
    window.setTimeout(() => {
      if (el) delete el.dataset.tiltSettling
    }, SETTLE_MS)
  }

  function onMove(e) {
    const target = e.target
    if (!target || typeof target.closest !== 'function') return
    const card = target.closest(SELECTOR)
    if (!card) {
      if (active) { clear(active); active = null }
      return
    }
    if (active && active !== card) clear(active)
    active = card

    const rect = card.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    // dx, dy normalized to -1..1 across the card
    const dx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2
    const dy = ((e.clientY - rect.top)  / rect.height - 0.5) * 2

    // Inverse mapping: cursor on the right tilts the right edge AWAY (rotateY negative),
    // cursor on top tilts the top edge TOWARD viewer (rotateX positive).
    pending.x =  dy * MAX_TILT_DEG * -1   // rotateX
    pending.y =  dx * MAX_TILT_DEG         // rotateY
    // Push the card forward in Z proportional to closeness-to-center.
    const radial = Math.max(0, 1 - Math.hypot(dx, dy))
    pending.z = LIFT_AT_CENTER_PX * radial

    if (!rafId) rafId = requestAnimationFrame(writeVars)
  }

  function onLeaveWindow() {
    if (active) { clear(active); active = null }
  }

  document.addEventListener('mousemove', onMove, { passive: true })
  document.addEventListener('mouseleave', onLeaveWindow)
  window.addEventListener('blur', onLeaveWindow)
  // When the cursor leaves a card by entering a non-card area, clear via onMove's
  // closest() returning null — but if it enters a gap between cards quickly we
  // also catch it on the next move.

  return () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseleave', onLeaveWindow)
    window.removeEventListener('blur', onLeaveWindow)
    if (rafId) cancelAnimationFrame(rafId)
    if (active) clear(active)
  }
}
