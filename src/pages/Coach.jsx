import { useState } from 'react'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import styles from './Coach.module.css'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const GOAL_TYPES = [
  { id: 'movement', label: 'Movement' },
  { id: 'mindfulness', label: 'Mindfulness' },
  { id: 'strength', label: 'Strength' },
  { id: 'flexibility', label: 'Flexibility' },
  { id: 'custom', label: 'Custom' },
]

const DAY_OPTIONS = [7, 14, 21, 30, 60, 90]

export default function Coach() {
  const { coachData, saveCoachGoal, saveCoachCheckin, clearCoachGoal, entries } = useData()
  const goal = coachData?.goal || null
  const checkins = coachData?.checkins || []

  if (!goal) return <GoalSetup onSave={saveCoachGoal} />
  return (
    <CoachDashboard
      goal={goal}
      checkins={checkins}
      entries={entries}
      onCheckin={saveCoachCheckin}
      onNewGoal={clearCoachGoal}
    />
  )
}

// ─── Goal Setup ────────────────────────────────────────────────────────────────
function GoalSetup({ onSave }) {
  const [description, setDescription] = useState('')
  const [type, setType] = useState('movement')
  const [targetDays, setTargetDays] = useState(30)

  function handleSubmit() {
    if (!description.trim()) return
    const startDate = new Date().toISOString().split('T')[0]
    onSave({ description: description.trim(), type, targetDays, startDate })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>AI Coach</p>
        <h1 className={styles.title}>Set Your Goal</h1>
        <p className={styles.subtitle}>
          Your coach learns from your daily check-ins and feel scores to guide what you do next.
        </p>
      </header>

      <div className={styles.setupForm}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>What do you want to achieve?</label>
          <textarea
            className={styles.goalInput}
            placeholder="e.g. Build a daily 20-min yoga habit, run 5k without stopping, meditate every morning for a month…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Goal type</label>
          <div className={styles.pills}>
            {GOAL_TYPES.map(g => (
              <button
                key={g.id}
                className={`${styles.pill} ${type === g.id ? styles.pillActive : ''}`}
                onClick={() => setType(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Target duration</label>
          <div className={styles.pills}>
            {DAY_OPTIONS.map(d => (
              <button
                key={d}
                className={`${styles.pill} ${targetDays === d ? styles.pillActive : ''}`}
                onClick={() => setTargetDays(d)}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>

        <button
          className={styles.primaryBtn}
          onClick={handleSubmit}
          disabled={!description.trim()}
        >
          Start Journey
        </button>
      </div>
    </div>
  )
}

// ─── Coach Dashboard ───────────────────────────────────────────────────────────
function CoachDashboard({ goal, checkins, entries, onCheckin, onNewGoal }) {
  const today = new Date().toISOString().split('T')[0]
  const todayCheckin = checkins.find(c => c.date === today)

  const startDate = new Date(goal.startDate)
  const now = new Date()
  const daysElapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1
  const daysRemaining = Math.max(0, goal.targetDays - daysElapsed + 1)
  const progress = Math.min(1, (daysElapsed - 1) / goal.targetDays)
  const isComplete = daysElapsed > goal.targetDays

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>AI Coach</p>
        <h1 className={styles.title}>
          {isComplete ? 'Journey Complete' : `Day ${daysElapsed} of ${goal.targetDays}`}
        </h1>
        <p className={styles.goalTag}>{goal.description}</p>
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className={styles.progressText}>
          {isComplete ? 'You made it.' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
        </p>
      </header>

      {isComplete ? (
        <div className={styles.completionCard}>
          <p className={styles.completionMsg}>
            You completed your {goal.targetDays}-day journey. That took real commitment.
          </p>
          <button className={styles.newGoalBtn} onClick={onNewGoal}>
            Start a New Goal
          </button>
        </div>
      ) : todayCheckin ? (
        <TodayCheckin checkin={todayCheckin} />
      ) : (
        <CheckinForm
          goal={goal}
          checkins={checkins}
          entries={entries}
          onSubmit={onCheckin}
        />
      )}

      {checkins.length > 0 && (
        <div className={styles.historySection}>
          <p className={styles.sectionTitle}>Your Journey</p>
          {[...checkins].reverse().map(c => (
            <HistoryEntry key={c.date} checkin={c} />
          ))}
        </div>
      )}

      {!isComplete && (
        <button className={styles.newGoalLink} onClick={onNewGoal}>
          ← Set a different goal
        </button>
      )}
    </div>
  )
}

// ─── Today already checked in ─────────────────────────────────────────────────
function TodayCheckin({ checkin }) {
  return (
    <div className={styles.todayCard}>
      <div className={styles.todayHeader}>
        <span className={`${styles.statusBadge} ${styles[`status_${checkin.status}`]}`}>
          {checkin.status === 'done' ? '✓ Done' : checkin.status === 'partial' ? '↗ Partial' : '✗ Missed'}
        </span>
        <span className={styles.todayLabel}>Today logged</span>
      </div>
      <p className={styles.todayNote}>{checkin.userNote}</p>
      {checkin.aiReply && (
        <div className={styles.coachReply}>
          <p className={styles.coachLabel}>Your coach</p>
          <p className={styles.coachText}>{checkin.aiReply}</p>
        </div>
      )}
    </div>
  )
}

// ─── Check-in form ─────────────────────────────────────────────────────────────
function CheckinForm({ goal, checkins, entries, onSubmit }) {
  const [status, setStatus] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  if (!apiKey) {
    return (
      <div className={styles.setupWarn}>
        <p className={styles.warnTitle}>OpenRouter API key not set</p>
        <p className={styles.warnText}>
          Add <code>VITE_OPENROUTER_API_KEY=your-key</code> to your <code>.env.local</code> file
          and restart the dev server. Get a free key at openrouter.ai
        </p>
      </div>
    )
  }

  async function handleSubmit() {
    if (!status || !note.trim()) return
    setLoading(true)
    setError(null)

    let aiReply = ''
    try {
      const systemPrompt = buildSystemPrompt(goal, checkins, entries)
      const userMessage = `Status today: ${status}\n\n${note.trim()}`
      aiReply = await callOpenRouter(systemPrompt, userMessage)
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    onSubmit({ status, userNote: note.trim(), aiReply })
    setLoading(false)
  }

  return (
    <div className={styles.checkinCard}>
      <p className={styles.checkinPrompt}>How did today go?</p>
      <div className={styles.statusRow}>
        {[
          { id: 'done', label: '✓ Done' },
          { id: 'partial', label: '↗ Partial' },
          { id: 'missed', label: '✗ Missed' },
        ].map(s => (
          <button
            key={s.id}
            className={`${styles.statusBtn} ${status === s.id ? styles[`statusActive_${s.id}`] : ''}`}
            onClick={() => setStatus(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <textarea
        className={styles.checkinInput}
        placeholder="Tell your coach what happened — what you did, how it felt, any blockers…"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={5}
        disabled={loading}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <button
        className={styles.primaryBtn}
        onClick={handleSubmit}
        disabled={!status || !note.trim() || loading}
      >
        {loading ? 'Your coach is thinking…' : 'Submit Check-in'}
      </button>
    </div>
  )
}

// ─── History entry (collapsible) ───────────────────────────────────────────────
function HistoryEntry({ checkin }) {
  const [open, setOpen] = useState(false)
  const color =
    checkin.status === 'done' ? '#8b9e7e' :
    checkin.status === 'partial' ? '#d9b38a' : '#d98a8a'

  return (
    <div className={styles.historyEntry} onClick={() => setOpen(o => !o)}>
      <div className={styles.historyTop}>
        <span className={styles.historyDate}>{checkin.date}</span>
        <span className={styles.historyStatus} style={{ color }}>
          {checkin.status === 'done' ? '✓' : checkin.status === 'partial' ? '↗' : '✗'}
        </span>
      </div>
      {open && (
        <div className={styles.historyExpanded}>
          <p className={styles.historyNote}>{checkin.userNote}</p>
          {checkin.aiReply && (
            <div className={styles.historyReply}>
              <p className={styles.coachLabel}>Coach</p>
              <p className={styles.historyReplyText}>{checkin.aiReply}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function buildSystemPrompt(goal, checkins, entries) {
  const now = new Date()
  const startDate = new Date(goal.startDate)
  const daysElapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1
  const daysRemaining = Math.max(0, goal.targetDays - daysElapsed + 1)

  const scoreLines = entries.slice(0, 7).length > 0
    ? entries.slice(0, 7).map(e => `  ${e.date}: ${computeFeelScore(e.scores || {}).toFixed(1)}/10`).join('\n')
    : '  No journal data yet'

  const checkinLines = checkins.length > 0
    ? [...checkins].slice(-7).reverse().map(c => `  ${c.date}: ${c.status.toUpperCase()} — "${c.userNote}"`).join('\n')
    : '  No check-ins yet'

  return `You are a dedicated coach in the Gentle BadAss Framework — a movement and mindfulness program. Be direct, warm, and specific. No fluff. Max 130 words.

USER GOAL: ${goal.description}
GOAL TYPE: ${goal.type}
PROGRESS: Day ${daysElapsed} of ${goal.targetDays} (${daysRemaining} days remaining)

RECENT JOURNAL FEEL SCORES (0–10 scale):
${scoreLines}

RECENT CHECK-IN HISTORY (most recent first):
${checkinLines}

Today they are checking in. Respond with:
1. Brief acknowledgment of what they reported (1–2 sentences, be specific)
2. One clear, concrete action for tomorrow
3. One short motivating thought

If they missed: be honest but kind — give a practical recovery plan, not guilt.
If they completed: acknowledge it genuinely, then push slightly further.
If partial: validate the effort, sharpen the focus for next time.`
}

async function callOpenRouter(systemPrompt, userMessage) {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Gentle BadAss Framework',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 220,
      temperature: 0.75,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenRouter error ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || 'No response from coach.'
}
