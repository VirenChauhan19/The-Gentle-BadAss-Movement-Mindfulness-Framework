import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JOURNAL_FACTORS, CATEGORIES } from '../data/journalFactors'
import { computeFeelScore } from '../data/storage'
import { useData } from '../context/DataContext'
import styles from './Journal.module.css'

export default function Journal() {
  const { getTodayEntry, saveEntry } = useData()
  const existing = getTodayEntry()
  const [scores, setScores] = useState(existing?.scores || {})
  const [note, setNote] = useState(existing?.note || '')
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  const feelScore = computeFeelScore(scores)
  const answered = Object.keys(scores).length
  const total = JOURNAL_FACTORS.length

  function handleScore(id, val) {
    setScores(prev => ({ ...prev, [id]: Number(val) }))
    setSaved(false)
  }

  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0

  async function handleSave() {
    await saveEntry({ scores, note })
    setSaved(true)
    setTimeout(() => navigate('/history'), 800)
  }

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Reflection Gate</p>
        <h1 className={styles.title}>{dateStr}</h1>
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${(answered / total) * 100}%` }} />
        </div>
        <p className={styles.progressText}>{answered} of {total} factors · Feel score: <strong>{feelScore.toFixed(1)}</strong></p>
      </header>

      <div className={styles.factors}>
        {Object.entries(groupByCategory()).map(([catId, factors]) => (
          <section key={catId} className={styles.section}>
            <h2 className={styles.catLabel} style={{ color: CATEGORIES[catId].color }}>
              {CATEGORIES[catId].label}
            </h2>
            {factors.map(factor => (
              <FactorSlider
                key={factor.id}
                factor={factor}
                value={scores[factor.id]}
                onChange={val => handleScore(factor.id, val)}
              />
            ))}
          </section>
        ))}
      </div>

      {/* Optional Reflection Note */}
      <div className={styles.noteSection}>
        <label className={styles.noteLabel} htmlFor="daily-note">Reflection <span className={styles.optional}>(Optional)</span></label>
        <p className={styles.noteHelp}>Shift from data-logging to self-mentoring. How did you move? How was your mood? Any surprises?</p>
        <textarea
          id="daily-note"
          className={styles.note}
          placeholder="Write about your day, your movement, and your mind. This is for your 270-day archive of personal growth."
          value={note}
          onChange={e => { setNote(e.target.value); setSaved(false) }}
          rows={8}
        />
        {wordCount > 0 && (
          <div className={styles.noteFooter}>
            <span className={styles.validCount}>{wordCount} words</span>
          </div>
        )}
      </div>

      <div className={styles.saveSection}>
        <button
          className={styles.saveBtn + (saved ? ' ' + styles.saved : '')}
          onClick={handleSave}
          disabled={answered === 0}
        >
          {saved ? 'Saved ✓' : 'Complete Today\'s Journey'}
        </button>
      </div>
    </div>
  )
}

function FactorSlider({ factor, value, onChange }) {
  const hasValue = value !== undefined
  const currentValue = hasValue ? value : 5
  const status =
    !hasValue ? 'Tap or drag' :
    value <= 3 ? 'Needs care' :
    value <= 6 ? 'Steady' :
    value <= 8 ? 'Good' :
    'Strong'

  return (
    <div className={styles.factor}>
      <div className={styles.factorTop}>
        <span className={styles.factorIcon}>{factor.icon}</span>
        <div className={styles.factorInfo}>
          <span className={styles.factorLabel}>{factor.label}</span>
          <span className={styles.factorQ}>{factor.question}</span>
        </div>
        <div className={styles.valuePill}>
          <span className={styles.factorValue}>{hasValue ? value : '-'}</span>
          <span className={styles.valueText}>{status}</span>
        </div>
      </div>
      <div className={styles.sliderRow}>
        <span className={styles.sliderEdge}>0</span>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={currentValue}
          onChange={e => onChange(e.target.value)}
          className={styles.slider}
          style={{
            '--slider-fill': `${currentValue * 10}%`,
            '--slider-color': hasValue ? scoreColor(currentValue) : 'var(--ink-faint)',
          }}
        />
        <span className={styles.sliderEdge}>10</span>
      </div>
      <div className={styles.scoreRail} aria-label={`Score ${factor.label}`}>
        {Array.from({ length: 11 }, (_, score) => (
          <button
            key={score}
            type="button"
            className={`${styles.scoreChip} ${hasValue && value === score ? styles.scoreChipActive : ''}`}
            onClick={() => onChange(score)}
            style={{ '--chip-color': scoreColor(score) }}
            aria-label={`${factor.label} score ${score}`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className={styles.sliderLabels}>
        <span>Not great</span>
        <span>Okay</span>
        <span>Great</span>
      </div>
    </div>
  )
}

function scoreColor(value) {
  if (value <= 3) return '#ba5f45'
  if (value <= 6) return '#c38b3f'
  if (value <= 8) return '#637f5f'
  return '#42697d'
}

function groupByCategory() {
  const groups = {}
  for (const f of JOURNAL_FACTORS) {
    if (!groups[f.category]) groups[f.category] = []
    groups[f.category].push(f)
  }
  return groups
}
