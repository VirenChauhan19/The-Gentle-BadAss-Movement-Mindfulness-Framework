import styles from './AuroraBackground.module.css'

/*
 * AuroraBackground, a simple, clean gradient backdrop.
 *
 * A soft base wash with a couple of gentle theme-coloured glows. It pulls its
 * colours straight from the app's CSS theme variables, so it re-skins itself
 * for every theme (dark / ember / ocean / forest / …) with zero JS work.
 *
 * The `app` variant sits fixed behind the whole UI (z-index -1); the `overlay`
 * variant fills its positioned parent (e.g. the sign-in gate) so a card can sit
 * above it. It never captures pointer events.
 */

export default function AuroraBackground({ variant = 'app' }) {
  const isOverlay = variant === 'overlay'
  return (
    <div
      aria-hidden="true"
      className={`${styles.bg} ${isOverlay ? styles.overlay : styles.app}`}
    />
  )
}
