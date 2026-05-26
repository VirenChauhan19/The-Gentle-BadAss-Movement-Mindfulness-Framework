import { useEffect, useRef, useState } from 'react'
import styles from './PillarChecklist.module.css'

const PILLARS = [
  { id: 'smile', label: 'Smile', desc: 'Signal safety to your nervous system.' },
  { id: 'tall', label: 'Tall Puppet', desc: 'String pulling the crown, creating vertical space.' },
  { id: 'relaxed', label: 'Relaxed Fists & Shoulders', desc: 'Remove "anchors" of tension.' },
  { id: 'toes', label: 'Uncurl Toes', desc: 'Neutral, receptive foot strike.' },
  { id: 'breathe', label: 'Breathe Slow & Long', desc: '4-8 second rhythmic baseline.' }
]

export default function PillarChecklist({ onComplete, autoAdvance = false }) {
  const [checked, setChecked] = useState({})
  const advancedRef = useRef(false)

  const allChecked = PILLARS.every(p => checked[p.id])

  // When all five are ticked, glide on to the next step on its own — no extra
  // tap needed. A short beat lets the final check register before we leave.
  useEffect(() => {
    if (!autoAdvance || !allChecked || advancedRef.current) return
    advancedRef.current = true
    const id = setTimeout(() => onComplete?.(), 650)
    return () => clearTimeout(id)
  }, [autoAdvance, allChecked, onComplete])

  function toggle(id) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>The 5 Pillars of La Ultra Readiness</h2>
      <p className={styles.subtitle}>Check off all pillars to begin your session.</p>
      
      <div className={styles.list}>
        {PILLARS.map(p => (
          <button
            key={p.id}
            className={styles.item + (checked[p.id] ? ' ' + styles.checked : '')}
            onClick={() => toggle(p.id)}
          >
            <div className={styles.checkbox}>
              {checked[p.id] && <span className={styles.checkIcon}>✓</span>}
            </div>
            <div className={styles.text}>
              <span className={styles.label}>{p.label}</span>
              <span className={styles.desc}>{p.desc}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        className={styles.startBtn}
        disabled={!allChecked}
        onClick={onComplete}
      >
        {allChecked ? 'Begin Session' : 'Complete All Pillars'}
      </button>
    </div>
  )
}
