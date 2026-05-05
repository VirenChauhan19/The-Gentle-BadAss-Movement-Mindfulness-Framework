import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JOURNAL_FACTORS, CATEGORIES } from '../data/journalFactors'
import { computeFeelScore } from '../data/storage'
import { useData } from '../context/DataContext'
import styles from './Journal.module.css'

export default function Journal() {
  const { getTodayEntry, saveEntry } = useData()
  const existing = getTodayEntry()
  const [scores, setScores] = useState(() => pickCurrentFactors(existing?.scores || {}))
  const [scoreNotes, setScoreNotes] = useState(() => pickCurrentFactors(existing?.scoreNotes || {}))
  const [note, setNote] = useState(existing?.note || '')
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  const feelScore = computeFeelScore(scores)
  const answered = Object.keys(scores).length
  const total = JOURNAL_FACTORS.length
  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0

  function handleScore(id, val) {
    setScores(prev => ({ ...prev, [id]: Number(val) }))
    setSaved(false)
  }

  function handleScoreNote(id, val) {
    setScoreNotes(prev => ({ ...prev, [id]: val }))
    setSaved(false)
  }

  async function handleSave() {
    await saveEntry({ scores, scoreNotes, note })
    setSaved(true)
    setTimeout(() => navigate('/library'), 650)
  }

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Feel Module</p>
        <h1 className={styles.title}>{dateStr}</h1>
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${(answered / total) * 100}%` }} />
        </div>
        <p className={styles.progressText}>
          {answered} of {total} factors. Feel score: <strong>{feelScore.toFixed(1)}</strong>
        </p>
      </header>

      <div className={styles.factors}>
        {JOURNAL_FACTORS.map((factor, index) => (
          <FactorSlider
            key={factor.id}
            factor={factor}
            index={index}
            value={scores[factor.id]}
            note={scoreNotes[factor.id] || ''}
            onChange={val => handleScore(factor.id, val)}
            onNoteChange={val => handleScoreNote(factor.id, val)}
          />
        ))}
      </div>

      <div className={styles.noteSection}>
        <label className={styles.noteLabel} htmlFor="daily-note">
          Reflection <span className={styles.optional}>(Optional)</span>
        </label>
        <p className={styles.noteHelp}>
          Optional personal diary. Longer reflections can reveal patterns, but this should never become a chore.
        </p>
        <textarea
          id="daily-note"
          className={styles.note}
          placeholder="Write 50+ words if it helps: what happened, what you noticed, and what your body may be asking for."
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
          {saved ? 'Saved' : 'Submit Feel and Start Move'}
        </button>
      </div>
    </div>
  )
}

function FactorSlider({ factor, index, value, note, onChange, onNoteChange }) {
  const hasValue = value !== undefined
  const currentValue = hasValue ? value : 5
  const needsWhy = hasValue && (value <= 2 || value >= 9)
  const cat = CATEGORIES[factor.category]
  const status =
    !hasValue ? 'Tap or drag' :
    value <= 3 ? 'Needs care' :
    value <= 6 ? 'Steady' :
    value <= 8 ? 'Good' :
    'Strong'

  return (
    <div className={styles.factor}>
      <div className={styles.factorTop}>
        <span className={styles.factorIndex}>{String(index + 1).padStart(2, '0')}</span>
        <div className={styles.factorInfo}>
          <span className={styles.factorCat} style={{ color: cat.color }}>{cat.label}</span>
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
      {needsWhy && (
        <label className={styles.whyPrompt}>
          <span>{value <= 2 ? 'Low signal' : 'High signal'}: what is the why?</span>
          <input
            type="text"
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Add the context in one line."
          />
        </label>
      )}
    </div>
  )
}

function scoreColor(value) {
  if (value <= 3) return '#ba5f45'
  if (value <= 6) return '#c38b3f'
  if (value <= 8) return '#637f5f'
  return '#42697d'
}

function pickCurrentFactors(values) {
  const allowed = new Set(JOURNAL_FACTORS.map(f => f.id))
  return Object.fromEntries(Object.entries(values).filter(([id]) => allowed.has(id)))
}
