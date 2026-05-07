import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JOURNAL_FACTORS, CATEGORIES } from '../data/journalFactors'
import { computeFeelScore } from '../data/storage'
import { useData } from '../context/DataContext'
import styles from './Journal.module.css'

export default function Journal() {
  const { getTodayEntry, saveEntry, coachData, updateCoachGoal } = useData()
  const existing = getTodayEntry()
  const [scores, setScores] = useState(() => pickCurrentFactors(existing?.scores || {}))
  const [scoreNotes, setScoreNotes] = useState(() => pickCurrentFactors(existing?.scoreNotes || {}))
  const [note, setNote] = useState(existing?.note || '')
  const [saved, setSaved] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const navigate = useNavigate()

  const feelScore = computeFeelScore(scores)
  const answered = Object.keys(scores).length
  const total = JOURNAL_FACTORS.length
  const allAnswered = JOURNAL_FACTORS.every(f => scores[f.id] !== undefined)
  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0

  function handleScore(id, val) {
    setScores(prev => ({ ...prev, [id]: Number(val) }))
    setSaved(false)
    setSubmitError('')
  }

  function handleScoreNote(id, val) {
    setScoreNotes(prev => ({ ...prev, [id]: val }))
    setSaved(false)
  }

  async function handleSave() {
    if (!allAnswered) {
      setSubmitError('Complete every Feel slider before submitting.')
      return
    }
    const feelAdjustment = adjustTodayRunningPlan(coachData?.goal, scores)
    if (feelAdjustment?.goal) updateCoachGoal(feelAdjustment.goal)
    await saveEntry({
      scores,
      scoreNotes,
      note,
      runningAdjustment: feelAdjustment?.summary || null,
    })
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
        {!allAnswered && (
          <p className={styles.requiredHint}>All sliders are required before Submit Feel unlocks.</p>
        )}
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
        {submitError && <p className={styles.submitError}>{submitError}</p>}
        <button
          className={styles.saveBtn + (saved ? ' ' + styles.saved : '')}
          onClick={handleSave}
          disabled={!allAnswered}
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
  const tone = scoreTone(currentValue)

  function commitScore(next) {
    const clamped = Math.max(0, Math.min(10, Number(next)))
    if (navigator.vibrate && window.innerWidth <= 767 && clamped !== value) navigator.vibrate(7)
    onChange(clamped)
  }

  function setFromPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    commitScore(Math.round(pct * 10))
  }

  function onMeterKey(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      commitScore(currentValue + 1)
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      commitScore(currentValue - 1)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      commitScore(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      commitScore(10)
    }
  }

  return (
    <div
      className={styles.factor}
      style={{
        '--factor-color': hasValue ? scoreColor(currentValue) : cat.color,
        '--factor-fill': `${currentValue * 10}%`,
        '--bloom-scale': 0.78 + currentValue * 0.04,
      }}
      data-swipe-lock
    >
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
      <div className={styles.mobileBloom}>
        <div className={styles.bloomTop}>
          <button
            type="button"
            className={styles.nudgeBtn}
            onClick={() => commitScore(currentValue - 1)}
            disabled={currentValue <= 0}
            aria-label={`Decrease ${factor.label}`}
          >
            -
          </button>
          <div className={styles.bloomOrb} data-tone={tone}>
            <span>{hasValue ? currentValue : '?'}</span>
            <small>{status}</small>
          </div>
          <button
            type="button"
            className={styles.nudgeBtn}
            onClick={() => commitScore(currentValue + 1)}
            disabled={currentValue >= 10}
            aria-label={`Increase ${factor.label}`}
          >
            +
          </button>
        </div>
        <div
          className={styles.touchMeter}
          role="slider"
          tabIndex={0}
          aria-label={`${factor.label} score`}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={hasValue ? value : currentValue}
          onPointerDown={event => {
            event.currentTarget.setPointerCapture?.(event.pointerId)
            setFromPointer(event)
          }}
          onPointerMove={event => {
            if (event.buttons === 1) setFromPointer(event)
          }}
          onKeyDown={onMeterKey}
        >
          <div className={styles.touchFill} />
          {Array.from({ length: 11 }, (_, score) => (
            <button
              key={score}
              type="button"
              className={`${styles.touchDot} ${hasValue && value === score ? styles.touchDotActive : ''} ${score <= currentValue ? styles.touchDotFilled : ''}`}
              onClick={event => {
                event.stopPropagation()
                commitScore(score)
              }}
              aria-label={`${factor.label} score ${score}`}
            >
              <span>{score}</span>
            </button>
          ))}
        </div>
        <div className={styles.feelWords}>
          <span>Care</span>
          <span>Steady</span>
          <span>Ready</span>
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

function scoreTone(value) {
  if (value <= 3) return 'care'
  if (value <= 6) return 'steady'
  if (value <= 8) return 'ready'
  return 'strong'
}

function pickCurrentFactors(values) {
  const allowed = new Set(JOURNAL_FACTORS.map(f => f.id))
  return Object.fromEntries(Object.entries(values).filter(([id]) => allowed.has(id)))
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function addDaysISO(startDate, offset) {
  const d = new Date(`${startDate}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function fullPlan(goal) {
  if (!goal) return []
  const startDate = goal.startDate || todayISO()
  const totalDays = goal.commitmentDays || ((goal.weeks || 4) * 7)
  const stored = Array.isArray(goal.plan) ? goal.plan : []
  const template = goal.weekTemplate || []
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  return Array.from({ length: totalDays }, (_, i) => {
    const date = addDaysISO(startDate, i)
    if (stored[i]) return {
      ...stored[i],
      id: stored[i].id || `day-${i + 1}`,
      dayNumber: stored[i].dayNumber || i + 1,
      week: stored[i].week || Math.floor(i / 7) + 1,
      date: stored[i].date || date,
      day: stored[i].day || days[new Date(`${date}T00:00:00`).getDay()],
    }
    const day = days[new Date(`${date}T00:00:00`).getDay()]
    const session = template.find(s => s.day === day) || template[i % template.length] || {}
    return {
      ...session,
      id: `day-${i + 1}`,
      dayNumber: i + 1,
      week: Math.floor(i / 7) + 1,
      date,
      day,
      type: session.type || 'rest',
      title: session.title || 'Rest / Recovery',
      distance: session.distance || '',
      duration: session.duration || '10-20 min optional walk',
      pace: session.pace || 'Very easy',
      notes: session.notes || 'Full rest or an easy walk. Keep effort low and prepare for the next planned session.',
    }
  })
}

function adjustTodayRunningPlan(goal, scores) {
  if (!goal) return null
  const date = todayISO()
  const plan = fullPlan(goal)
  const index = plan.findIndex(day => day.date === date)
  if (index < 0) return null

  const base = plan[index].feelAdjustment?.original || plan[index]
  const feelScore = computeFeelScore(scores)
  const reasons = []
  if (scores.sleep <= 4) reasons.push('low sleep')
  if (scores.energy <= 4) reasons.push('low energy')
  if (scores.pain <= 4) reasons.push('pain/niggle')
  if (scores.movementReadiness <= 4) reasons.push('low movement readiness')
  if (scores.jointFluidity <= 4) reasons.push('joint stiffness')
  if (scores.stress <= 4) reasons.push('high stress load')

  const severe = feelScore <= 3.8 || [scores.sleep, scores.energy, scores.pain, scores.movementReadiness].some(v => v <= 2)
  const moderate = severe ? false : (feelScore < 6.2 || reasons.length > 0)

  let adjusted = base
  let level = 'normal'
  if (severe) {
    level = 'recovery'
    adjusted = {
      ...base,
      type: 'rest',
      title: 'Recovery Reset - Feel adjusted',
      distance: '',
      duration: '20-30 min optional walk + mobility',
      pace: 'Very easy. Keep effort at 2-3/10.',
      notes: `Feel check flagged ${reasons.join(', ') || 'low readiness'}. Replace today's workout with easy walking, gentle mobility, and recovery breathing. Resume training when tomorrow's Feel score improves.`,
    }
  } else if (moderate) {
    level = 'deload'
    adjusted = {
      ...base,
      type: base.type === 'rest' ? 'rest' : 'easy',
      title: `${base.type === 'rest' ? 'Recovery Day' : 'Reduced Easy Session'} - Feel adjusted`,
      distance: base.type === 'rest' ? '' : 'Reduce planned volume by 30-50%',
      duration: base.type === 'rest' ? (base.duration || '10-20 min optional walk') : '20-35 min',
      pace: 'Conversational only. Stop if symptoms rise.',
      notes: `Feel check flagged ${reasons.join(', ') || 'moderate readiness'}. Keep this below workout effort today. No intervals, no long run pressure, no chasing pace.`,
    }
  } else if (plan[index].feelAdjustment?.original) {
    adjusted = base
  } else {
    return null
  }

  const nextPlan = plan.map((day, i) => i === index
    ? {
        ...adjusted,
        feelAdjustment: level === 'normal' ? null : {
          date,
          level,
          feelScore: Math.round(feelScore * 10) / 10,
          reasons,
          adjustedAt: new Date().toISOString(),
          original: base,
        },
      }
    : day
  )

  return {
    goal: { ...goal, plan: nextPlan, lastFeelAdjustmentAt: new Date().toISOString() },
    summary: level === 'normal'
      ? 'Today returned to the original running plan.'
      : `Today adjusted to ${level} because of ${reasons.join(', ') || 'low readiness'}.`,
  }
}
