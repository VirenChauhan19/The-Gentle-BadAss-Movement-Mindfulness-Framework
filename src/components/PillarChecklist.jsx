import { useState } from 'react'
import styles from './PillarChecklist.module.css'

const PILLARS = [
  { id: 'smile', label: 'Smile', desc: 'Signal safety to your nervous system.' },
  { id: 'tall', label: 'Tall Puppet', desc: 'String pulling the crown, creating vertical space.' },
  { id: 'relaxed', label: 'Relaxed Fists & Shoulders', desc: 'Remove "anchors" of tension.' },
  { id: 'toes', label: 'Uncurl Toes', desc: 'Neutral, receptive foot strike.' },
  { id: 'breathe', label: 'Breathe Slow & Long', desc: '4-8 second rhythmic baseline.' }
]

export default function PillarChecklist({ onComplete }) {
  const [checked, setChecked] = useState({})

  const allChecked = PILLARS.every(p => checked[p.id])

  function toggle(id) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>The 5 Pillars of Gentle Readiness</h2>
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
