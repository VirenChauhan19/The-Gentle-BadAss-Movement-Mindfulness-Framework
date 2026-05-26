import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PillarChecklist from '../components/PillarChecklist'
import styles from './Reminder.module.css'

const PRINCIPLES = [
  ['The Hip Engine', 'Hips are the engine. Knees follow; they never lead.'],
  ['The Stable Pillar', 'The lumbar spine stays quiet while hips and shoulders move around it.'],
  ['Core as the Bridge', 'The core connects upper and lower body so power does not leak.'],
]

export function todayKey() {
  return new Date().toISOString().split('T')[0]
}

// The Reminder gate is cleared for the day once the five pillars are ticked.
// We reuse the existing gb_pillars_ready flag so the rest of the Plan flow
// (and any per-day "ready" checks) stay in step.
export function isReminderDone() {
  try {
    return localStorage.getItem('gb_pillars_ready') === todayKey()
  } catch {
    return false
  }
}

export default function Reminder() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem('gb_pillars_ready', todayKey())
    } catch {}
    // Let the page settle out before handing over to Breathe so the move
    // reads as one continuous gesture rather than a hard cut.
    setLeaving(true)
    setTimeout(() => navigate('/breathing'), 360)
  }, [navigate])

  return (
    <div className={`${styles.page} ${leaving ? styles.leaving : ''}`}>
      <header className={styles.header}>
        <p className={styles.label}>Before you begin</p>
        <h1 className={styles.title}>A quiet reminder</h1>
        <p className={styles.subtitle}>
          Settle into these five pillars and three principles. Tick all five and we&apos;ll
          carry you straight into Breathe.
        </p>
      </header>

      <section className={styles.checklist}>
        <PillarChecklist onComplete={handleComplete} autoAdvance />
      </section>

      <section className={styles.principles}>
        <p className={styles.principlesTitle}>The Three Principles</p>
        <div className={styles.principlesGrid}>
          {PRINCIPLES.map(([title, text]) => (
            <article key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
