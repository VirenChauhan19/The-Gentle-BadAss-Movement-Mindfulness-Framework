import { useState, useEffect, useRef } from 'react'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import styles from './Coach.module.css'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const SESSION_STYLE = {
  easy:     { color: '#5a7054', bg: 'rgba(139,158,126,0.14)', border: '#8b9e7e', label: 'Easy'     },
  moderate: { color: '#907830', bg: 'rgba(217,193,138,0.14)', border: '#d9c18a', label: 'Moderate' },
  hard:     { color: '#a04040', bg: 'rgba(217,138,138,0.14)', border: '#d98a8a', label: 'Hard'     },
  long:     { color: '#4050a0', bg: 'rgba(138,148,217,0.14)', border: '#8a9ad9', label: 'Long'     },
  rest:     { color: '#999',    bg: 'rgba(180,180,180,0.08)', border: '#ccc',    label: 'Rest'     },
  cross:    { color: '#704090', bg: 'rgba(180,138,217,0.14)', border: '#c89ad9', label: 'Cross'    },
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Coach() {
  const { coachData, saveCoachGoal, saveCoachCheckin, clearCoachGoal, addChatMessage, entries } = useData()
  const [tab, setTab] = useState('program')

  const goal     = coachData?.goal        || null
  const checkins = coachData?.checkins    || []
  const chat     = coachData?.chatHistory || []

  if (!goal) return <GoalSetup onSave={saveCoachGoal} />

  const today      = new Date().toISOString().split('T')[0]
  const now        = new Date()
  const startDate  = new Date(goal.startDate)
  const totalDays  = (goal.weeks || 12) * 7
  const dayNum     = Math.floor((now - startDate) / 86400000) + 1
  const remaining  = Math.max(0, totalDays - dayNum + 1)
  const progress   = Math.min(1, (dayNum - 1) / totalDays)
  const isComplete = dayNum > totalDays
  const weekNum    = Math.ceil(dayNum / 7)

  const todayDayName = DAYS_FULL[now.getDay()]
  const todaySession = goal.weekTemplate?.find(s => s.day === todayDayName)
  const todayCheckin = checkins.find(c => c.date === today)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>AI Running Coach</p>
        <h1 className={styles.title}>{goal.raceGoal}</h1>
        <p className={styles.headerSub}>
          {isComplete ? 'Program complete!' : `Week ${weekNum} of ${goal.weeks} · Day ${dayNum}`}
        </p>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className={styles.progressText}>
          {isComplete ? 'You made it.' : `${remaining} day${remaining !== 1 ? 's' : ''} to go`}
        </p>
      </header>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'program' ? styles.tabActive : ''}`} onClick={() => setTab('program')}>
          My Program
        </button>
        <button className={`${styles.tab} ${tab === 'chat' ? styles.tabActive : ''}`} onClick={() => setTab('chat')}>
          Ask Coach
        </button>
      </div>

      {tab === 'program'
        ? <ProgramTab
            goal={goal} todaySession={todaySession} todayCheckin={todayCheckin}
            checkins={checkins} entries={entries} dayNum={dayNum}
            isComplete={isComplete} onCheckin={saveCoachCheckin} onNewGoal={clearCoachGoal}
          />
        : <ChatTab
            history={chat} goal={goal} checkins={checkins}
            entries={entries} onMessage={addChatMessage}
          />
      }
    </div>
  )
}

// ── Goal Setup ────────────────────────────────────────────────────────────────
const RACE_GOALS = [
  { id: '800m',          label: '800m',          icon: '⚡', sub: 'Speed & track'   },
  { id: '1500m',         label: '1500m',         icon: '🏃', sub: 'Middle distance' },
  { id: '3K',            label: '3K',            icon: '🔥', sub: 'Speed endurance' },
  { id: '5K Race',       label: '5K',            icon: '🌱', sub: 'Short road'      },
  { id: '10K Race',      label: '10K',           icon: '💪', sub: 'Road classic'    },
  { id: 'Half Marathon', label: 'Half Marathon', icon: '🏅', sub: '21.1 km'         },
  { id: 'Marathon',      label: 'Marathon',      icon: '🏆', sub: '42.2 km'         },
  { id: 'Ultra',         label: 'Ultra',         icon: '🌄', sub: '50K+'            },
  { id: 'Base Fitness',  label: 'Base Fitness',  icon: '🧘', sub: 'General fitness' },
]

const EXPERIENCE = [
  { id: 'Beginner',     sub: 'New to running', icon: '🌱' },
  { id: 'Intermediate', sub: '1–3 years',      icon: '🚶' },
  { id: 'Advanced',     sub: '3+ years',       icon: '🏃' },
  { id: 'Competitive',  sub: 'Racing to win',  icon: '🏆' },
]

const TOTAL_STEPS = 4
const STEP_TITLES = ['What\'s your goal?', 'Your experience', 'Your training', 'Anything else?']
const STEP_SUBS   = [
  'Pick the race or distance you\'re training for.',
  'Be honest — this shapes every session.',
  'Type any number — no limits here.',
  'Injuries, target time, schedule constraints… (optional)',
]

function GoalSetup({ onSave }) {
  const [step,        setStep]        = useState(1)
  const [raceGoal,    setRaceGoal]    = useState('')
  const [experience,  setExperience]  = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [weeks,       setWeeks]       = useState('')
  const [currentKm,   setCurrentKm]   = useState('')
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const weeksNum = Math.max(1, parseInt(weeks) || 12)
    const kmStr    = currentKm ? `${currentKm} km/week` : '20–40 km/week'
    try {
      const program = await generateProgram({ raceGoal, experience, daysPerWeek, currentKm: kmStr, weeks: weeksNum, notes })
      onSave({
        raceGoal, experience, daysPerWeek, currentKm: kmStr, weeks: weeksNum,
        startDate: new Date().toISOString().split('T')[0],
        overview:         program.overview,
        weekTemplate:     program.weekTemplate,
        progressionNote:  program.progressionNote,
        peakWeeklyVolume: program.peakWeeklyVolume,
      })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (!apiKey) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.label}>AI Running Coach</p>
          <h1 className={styles.title}>Setup Required</h1>
        </header>
        <div className={styles.warnCard}>
          <p className={styles.warnTitle}>OpenRouter API key not configured</p>
          <p className={styles.warnText}>
            Add <code>VITE_OPENROUTER_API_KEY=your-key</code> to <code>.env.local</code> and restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.label}>AI Running Coach</p>
          <h1 className={styles.title}>Building Your Plan</h1>
          <p className={styles.subtitle}>Designing your {weeks}-week {raceGoal} program…</p>
        </header>
        <div className={styles.generatingWrap}>
          <div className={styles.generatingDots}><span /><span /><span /></div>
          <p className={styles.generatingNote}>Analysing your fitness, goal, and schedule</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wizard}>
      {/* Header */}
      <div className={styles.wizardTop}>
        <p className={styles.wizardStepLabel}>Step {step} of {TOTAL_STEPS}</p>
        <h1 className={styles.wizardTitle}>{STEP_TITLES[step - 1]}</h1>
        <p className={styles.wizardSub}>{STEP_SUBS[step - 1]}</p>
        <div className={styles.wizardDots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`${styles.wizardDot} ${step === i + 1 ? styles.wizardDotCurrent : step > i + 1 ? styles.wizardDotDone : ''}`}
            />
          ))}
        </div>
      </div>

      <div className={styles.wizardBody}>

        {/* ── Step 1: Race Goal ── */}
        {step === 1 && (
          <>
            <div className={styles.goalGrid}>
              {RACE_GOALS.map(g => (
                <button
                  key={g.id}
                  className={`${styles.goalCard} ${raceGoal === g.id ? styles.goalCardActive : ''}`}
                  onClick={() => setRaceGoal(g.id)}
                >
                  <span className={styles.goalIcon}>{g.icon}</span>
                  <span className={styles.goalName}>{g.label}</span>
                  <span className={styles.goalSub}>{g.sub}</span>
                </button>
              ))}
            </div>
            <div className={styles.wizardBtns}>
              <button className={styles.wizardNext} disabled={!raceGoal} onClick={() => setStep(2)}>
                Next →
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Experience ── */}
        {step === 2 && (
          <>
            <div className={styles.expGrid}>
              {EXPERIENCE.map(e => (
                <button
                  key={e.id}
                  className={`${styles.expBigCard} ${experience === e.id ? styles.expBigCardActive : ''}`}
                  onClick={() => setExperience(e.id)}
                >
                  <span className={styles.expBigIcon}>{e.icon}</span>
                  <div>
                    <p className={styles.expBigTitle}>{e.id}</p>
                    <p className={styles.expBigSub}>{e.sub}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className={styles.wizardBtns}>
              <button className={styles.wizardNext} disabled={!experience} onClick={() => setStep(3)}>
                Next →
              </button>
              <button className={styles.wizardBack} onClick={() => setStep(1)}>← Back</button>
            </div>
          </>
        )}

        {/* ── Step 3: Training numbers ── */}
        {step === 3 && (
          <>
            <div className={styles.inputsStack}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Days per week <span className={styles.inputSub}>how many days you can train</span>
                </label>
                <div className={styles.stepper}>
                  <button
                    className={styles.stepperBtn}
                    disabled={daysPerWeek <= 1}
                    onClick={() => setDaysPerWeek(d => d - 1)}
                  >−</button>
                  <div className={styles.stepperVal}>
                    {daysPerWeek}
                    <span className={styles.stepperSub}>days</span>
                  </div>
                  <button
                    className={styles.stepperBtn}
                    disabled={daysPerWeek >= 7}
                    onClick={() => setDaysPerWeek(d => d + 1)}
                  >+</button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Weeks until race <span className={styles.inputSub}>type any number</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="104"
                  className={styles.numberInput}
                  value={weeks}
                  onChange={e => setWeeks(e.target.value)}
                  placeholder="e.g. 14"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Current weekly km <span className={styles.inputSub}>your average right now</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className={styles.numberInput}
                  value={currentKm}
                  onChange={e => setCurrentKm(e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>
            </div>
            <div className={styles.wizardBtns}>
              <button
                className={styles.wizardNext}
                disabled={!weeks || !currentKm}
                onClick={() => setStep(4)}
              >
                Next →
              </button>
              <button className={styles.wizardBack} onClick={() => setStep(2)}>← Back</button>
            </div>
          </>
        )}

        {/* ── Step 4: Notes + Generate ── */}
        {step === 4 && (
          <>
            <div className={styles.inputsStack}>
              <textarea
                className={styles.notesInput}
                placeholder="e.g. recovering from knee injury, want sub-45 min 10K, can only run mornings…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={6}
                autoFocus
              />
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <div className={styles.wizardBtns}>
              <button className={styles.wizardNext} onClick={handleGenerate}>
                Generate My Program ✦
              </button>
              <button className={styles.wizardBack} onClick={() => setStep(3)}>← Back</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

// ── Program Tab ───────────────────────────────────────────────────────────────
function ProgramTab({ goal, todaySession, todayCheckin, checkins, entries, dayNum, isComplete, onCheckin, onNewGoal }) {
  const weekTemplate = goal.weekTemplate || []
  const [selectedDay, setSelectedDay] = useState(null)

  function toggleDay(s) {
    setSelectedDay(prev => prev?.day === s.day ? null : s)
  }

  return (
    <div className={styles.tabContent}>

      {/* Weekly grid */}
      {weekTemplate.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Weekly Structure — tap a day</p>
          <div className={styles.weekGrid}>
            {weekTemplate.map((s, i) => {
              const st = SESSION_STYLE[s.type] || SESSION_STYLE.rest
              const dayIdx = DAYS_FULL.indexOf(s.day)
              const isToday = s.day === DAYS_FULL[new Date().getDay()]
              const isSelected = selectedDay?.day === s.day
              return (
                <div
                  key={i}
                  className={`${styles.dayCard} ${isToday ? styles.dayCardToday : ''} ${isSelected ? styles.dayCardSelected : ''}`}
                  style={{ background: (isToday || isSelected) ? st.bg : undefined, borderColor: (isToday || isSelected) ? st.border : undefined }}
                  onClick={() => toggleDay(s)}
                >
                  <span className={styles.dayShort}>{DAYS_SHORT[dayIdx] ?? s.day.slice(0,3)}</span>
                  <span className={styles.dayDot} style={{ background: st.border }} />
                  <span className={styles.dayLabel} style={{ color: st.color }}>{st.label}</span>
                  <span className={styles.dayDist}>{s.distance || '—'}</span>
                </div>
              )
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && (() => {
            const st = SESSION_STYLE[selectedDay.type] || SESSION_STYLE.rest
            return (
              <div className={styles.dayDetail} style={{ borderLeft: `4px solid ${st.border}`, background: st.bg }}>
                <div className={styles.dayDetailTop}>
                  <div>
                    <span className={styles.dayDetailType} style={{ color: st.color }}>{st.label}</span>
                    <span className={styles.dayDetailMeta}>{selectedDay.day} · {selectedDay.distance} · {selectedDay.duration}</span>
                  </div>
                  <button className={styles.dayDetailClose} onClick={() => setSelectedDay(null)}>✕</button>
                </div>
                <p className={styles.dayDetailTitle}>{selectedDay.title}</p>
                {selectedDay.pace && <p className={styles.dayDetailPace}>Pace: {selectedDay.pace}</p>}
                {selectedDay.notes && <p className={styles.dayDetailNotes}>{selectedDay.notes}</p>}
              </div>
            )
          })()}
        </div>
      )}

      {/* Program overview */}
      {goal.overview && (
        <div className={styles.overviewCard}>
          <p className={styles.sectionLabel}>Your Plan</p>
          <p className={styles.overviewText}>{goal.overview}</p>
          {goal.progressionNote && <p className={styles.progressionNote}>{goal.progressionNote}</p>}
          {goal.peakWeeklyVolume && (
            <p className={styles.peakVolume}>Peak weekly volume: <strong>{goal.peakWeeklyVolume}</strong></p>
          )}
        </div>
      )}

      {/* Today's session */}
      {todaySession && !isComplete && (
        <div className={styles.todaySessionCard} style={{
          borderLeft: `4px solid ${SESSION_STYLE[todaySession.type]?.border || '#ccc'}`,
        }}>
          <div className={styles.sessionTop}>
            <span className={styles.sessionType} style={{ color: SESSION_STYLE[todaySession.type]?.color }}>
              {SESSION_STYLE[todaySession.type]?.label || todaySession.type}
            </span>
            <span className={styles.sessionMeta}>{todaySession.distance} · {todaySession.duration}</span>
          </div>
          <p className={styles.sessionTitle}>{todaySession.title}</p>
          {todaySession.pace && <p className={styles.sessionPace}>Pace: {todaySession.pace}</p>}
          {todaySession.notes && <p className={styles.sessionNotes}>{todaySession.notes}</p>}
        </div>
      )}

      {/* Check-in or completion */}
      {isComplete ? (
        <div className={styles.completionCard}>
          <p className={styles.completionMsg}>You finished your {goal.weeks}-week {goal.raceGoal} program. That's the work.</p>
          <button className={styles.primaryBtn} onClick={onNewGoal}>Start a New Program</button>
        </div>
      ) : todayCheckin ? (
        <CheckinDisplay checkin={todayCheckin} />
      ) : (
        <CheckinForm
          goal={goal} checkins={checkins} entries={entries}
          todaySession={todaySession} onSubmit={onCheckin}
        />
      )}

      {/* Run log */}
      {checkins.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Run Log</p>
          {[...checkins].reverse().map(c => <RunLogEntry key={c.date} checkin={c} />)}
        </div>
      )}

      <button className={styles.changeGoalBtn} onClick={onNewGoal}>← Change program</button>
    </div>
  )
}

// ── Already logged today ───────────────────────────────────────────────────────
function CheckinDisplay({ checkin }) {
  return (
    <div className={styles.checkinDisplay}>
      <div className={styles.checkinDisplayTop}>
        <span className={`${styles.statusBadge} ${styles[`status_${checkin.status}`]}`}>
          {checkin.status === 'done' ? '✓ Completed' : checkin.status === 'partial' ? '↗ Partial' : '✗ Missed'}
        </span>
        <span className={styles.loggedLabel}>Today logged</span>
      </div>
      <p className={styles.checkinNote}>{checkin.userNote}</p>
      {checkin.aiReply && (
        <div className={styles.coachReply}>
          <p className={styles.coachLabel}>Coach</p>
          <p className={styles.coachText}>{checkin.aiReply}</p>
        </div>
      )}
    </div>
  )
}

// ── Daily check-in form ───────────────────────────────────────────────────────
function CheckinForm({ goal, checkins, entries, todaySession, onSubmit }) {
  const [status,  setStatus]  = useState(null)
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSubmit() {
    if (!status || !note.trim()) return
    setLoading(true)
    setError(null)
    let aiReply = ''
    try {
      aiReply = await getCheckinReply(goal, checkins, entries, status, note, todaySession)
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    onSubmit({ status, userNote: note.trim(), aiReply })
  }

  return (
    <div className={styles.checkinCard}>
      <p className={styles.checkinPrompt}>Log today's run</p>
      <div className={styles.statusRow}>
        {[
          { id: 'done',    label: '✓ Completed' },
          { id: 'partial', label: '↗ Partial'   },
          { id: 'missed',  label: '✗ Missed'    },
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
        placeholder="Describe your run — distance, pace, how you felt, any notes…"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={4}
        disabled={loading}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <button
        className={styles.primaryBtn}
        onClick={handleSubmit}
        disabled={!status || !note.trim() || loading}
      >
        {loading ? 'Getting coach feedback…' : 'Log Run'}
      </button>
    </div>
  )
}

// ── Run log entry ─────────────────────────────────────────────────────────────
function RunLogEntry({ checkin }) {
  const [open, setOpen] = useState(false)
  const color = checkin.status === 'done' ? '#8b9e7e' : checkin.status === 'partial' ? '#d9b38a' : '#d98a8a'
  const symbol = checkin.status === 'done' ? '✓' : checkin.status === 'partial' ? '↗' : '✗'
  return (
    <div className={styles.logEntry} onClick={() => setOpen(o => !o)}>
      <div className={styles.logTop}>
        <span className={styles.logDate}>{checkin.date}</span>
        <span className={styles.logSymbol} style={{ color }}>{symbol}</span>
      </div>
      {open && (
        <div className={styles.logExpanded}>
          <p className={styles.logNote}>{checkin.userNote}</p>
          {checkin.aiReply && (
            <div className={styles.coachReply} style={{ marginTop: 10 }}>
              <p className={styles.coachLabel}>Coach</p>
              <p className={styles.coachText}>{checkin.aiReply}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab({ history, goal, checkins, entries, onMessage }) {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)
    onMessage({ role: 'user', content: text })
    setLoading(true)
    try {
      const reply = await getChatReply(goal, checkins, entries, [...history, { role: 'user', content: text }])
      onMessage({ role: 'assistant', content: reply })
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className={styles.chatWrap}>
      <div className={styles.chatMessages}>
        {history.length === 0 && !loading && (
          <div className={styles.chatEmpty}>
            <p className={styles.chatEmptyTitle}>Ask your running coach anything</p>
            <div className={styles.suggestions}>
              {[
                'Give me a 3-day running plan for this week',
                'What gym exercises should I do on cross-training days?',
                'How should I pace my long run?',
                'How do I avoid shin splints?',
              ].map(q => (
                <button key={q} className={styles.suggestion} onClick={() => { setInput(q) }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleCoach}`}>
            {msg.role === 'assistant' && <p className={styles.coachLabel}>Coach</p>}
            <p className={styles.bubbleText} style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className={`${styles.bubble} ${styles.bubbleCoach}`}>
            <p className={styles.coachLabel}>Coach</p>
            <div className={styles.typingDots}><span /><span /><span /></div>
          </div>
        )}

        {error && <p className={styles.chatError}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className={styles.chatInputRow}>
        <textarea
          className={styles.chatInput}
          placeholder="Ask your coach…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          rows={2}
          disabled={loading}
        />
        <button className={styles.sendBtn} onClick={send} disabled={!input.trim() || loading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── API Helpers ───────────────────────────────────────────────────────────────
async function apiCall(messages, maxTokens = 600) {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!key) throw new Error('OpenRouter API key not configured')
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'La Ultra Run & Bee',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.75 }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    if (res.status === 429) throw new Error('Rate limit reached — wait 30 seconds and try again. (Free tier limit)')
    throw new Error(e.error?.message || `OpenRouter error ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

async function generateProgram({ raceGoal, experience, daysPerWeek, currentKm, weeks, notes }) {
  const hardSessions = daysPerWeek >= 5 ? 2 : 1
  const easySessions = Math.max(0, daysPerWeek - hardSessions - 1)
  const restDays     = 7 - daysPerWeek

  const isTrackEvent = ['800m', '1500m', '3K'].includes(raceGoal)
  const isCompetitive = experience === 'Competitive' || experience === 'Advanced'

  const trackRules = isTrackEvent ? `
TRACK EVENT RULES (${raceGoal}):
- Hard sessions MUST use actual track interval notation: "6 × 400m", "4 × 800m", "3 × 1200m", "2 × 1500m"
- Always include recovery: "with 90s standing recovery", "with 200m jog recovery"
- Tempo runs: 1–3 km blocks at comfortably hard effort (NOT race pace)
- Easy runs can be 20–30 min — shorter is fine for speed recovery
- Week 1: introduce track conservatively (e.g. 6 × 300m with full recovery)
- Progress reps/volume each week, not intensity
- For ${raceGoal}: speciality sessions should target race-specific effort (e.g. 1500m pace for 800m training)
- Distance field for track sessions: use interval notation ("6 × 400m") not km` : ''

  const paceRules = isCompetitive
    ? `PACING (Competitive/Advanced allowed relative pace refs):
- Easy: "Conversational — full sentences comfortably"
- Tempo: "Comfortably hard — short phrases only, sustainable for 20–30 min"
- Intervals: "Race effort — controlled and sharp"
- Long: "Easy conversational — 60–90 s/km slower than tempo"
- MAY reference "10K race effort", "5K pace", "slightly faster than half marathon pace"`
    : `PACING (effort descriptions only — no min/km numbers):
- Easy: "Conversational pace — full sentences comfortably"
- Moderate: "Comfortably hard — short phrases only"
- Hard: "Strong effort — controlled aggression"
- Long: "Easy conversational — slower than easy days, prioritise time on feet"`

  const system = `You are an expert running coach. Generate a personalised weekly training template.
Return ONLY valid JSON — no markdown, no explanation, no text outside the JSON.

JSON structure:
{
  "overview": "2–3 sentence program philosophy and what the runner will achieve",
  "weekTemplate": [
    {
      "day": "Monday",
      "type": "easy|moderate|hard|long|rest|cross",
      "title": "Session title",
      "distance": "6 km  OR  6 × 400m  OR  45 min",
      "duration": "35–40 min",
      "pace": "effort description",
      "notes": "Warm-up (5 min): [4 dynamic exercises with reps]. Main set: [exact workout]. Cool-down: [2–3 stretches]."
    }
  ],
  "progressionNote": "How volume and intensity build week to week",
  "peakWeeklyVolume": "XX km or total reps"
}

${trackRules}

${paceRules}

SESSION NOTES — every non-rest day must have all three:
1. Warm-up (5 min): 4 specific dynamic exercises with reps/distance (leg swings ×10, hip circles ×10, high knees 20m ×2, dynamic lunges 10m ×2)
2. Main set: exact description with effort cues
3. Cool-down: 2–3 named stretches (quad, hamstring, calf, hip flexor)

PROGRAM STRUCTURE:
- ${daysPerWeek} training days · ${restDays} rest days
- ${hardSessions} hard/quality session(s) — NOT adjacent to long run
- 1 long run on Saturday or Sunday
- ${easySessions} easy run(s) at truly conversational effort
- Cross-training days: specify activity (cycling, swimming, yoga, rowing) with duration
- Base all distances on current volume: ${currentKm}
- Goal: ${raceGoal} · Level: ${experience} · Duration: ${weeks} weeks
- Week 1 must start at or slightly below current volume — no spikes`

  const raw = await apiCall([
    { role: 'system', content: system },
    { role: 'user',   content: `Build my ${weeks}-week ${raceGoal} plan. I'm ${experience} level, currently doing ${currentKm}, training ${daysPerWeek} days/week.${notes ? ` Notes: ${notes}` : ''}` },
  ], 1500)

  return extractJSON(raw)
}

async function getCheckinReply(goal, checkins, entries, status, note, todaySession) {
  const scores  = entries.slice(0, 5).map(e => `${e.date}: ${computeFeelScore(e.scores || {}).toFixed(1)}/10`).join(', ') || 'none'
  const recent  = [...checkins].slice(-5).reverse().map(c => `${c.date}: ${c.status} — ${c.userNote}`).join('\n') || 'none'
  const session = todaySession ? `Planned: ${todaySession.type} ${todaySession.distance} (${todaySession.duration})` : 'Rest day'

  return apiCall([
    { role: 'system', content:
`You are a dedicated running coach. Direct, warm, specific. Max 120 words.
Runner: ${goal.raceGoal}, ${goal.experience}, ${goal.daysPerWeek} days/week, ${goal.weeks}-week plan.
Today's plan: ${session}
Recent feel scores: ${scores}
Recent run log:
${recent}
Respond: 1) Acknowledge specifically what they said. 2) One concrete action for tomorrow's session. 3) One brief motivational note. If missed: recovery plan not guilt. If done: validate then push slightly. If partial: focus on improvement.` },
    { role: 'user', content: `Status: ${status}\n\n${note}` },
  ], 220)
}

async function getChatReply(goal, checkins, entries, messages) {
  const scores    = entries.slice(0, 5).map(e => `${e.date}: ${computeFeelScore(e.scores || {}).toFixed(1)}/10`).join(', ') || 'none'
  const weekInfo  = goal.weekTemplate?.map(s => `${s.day}: ${s.type} ${s.distance || ''}`).join(' | ') || ''
  const recentLog = [...checkins].slice(-3).reverse().map(c => `${c.date}: ${c.status}`).join(', ') || 'none'

  const lastMsg     = messages[messages.length - 1]?.content?.toLowerCase() || ''
  const isPlanQuery = /(\d+[\s-]*day|week|schedule|plan|program|cross[\s-]?train|gym|workout|session|routine|what.*do|today|tomorrow)/i.test(lastMsg)

  const profile = `Runner: ${goal.raceGoal} goal · ${goal.experience} · ${goal.daysPerWeek} days/week · ${goal.weeks}-week plan.
Weekly template: ${weekInfo}
Recent feel scores: ${scores}
Recent sessions: ${recentLog}`

  const OFF_TOPIC_RULE = `IMPORTANT — SCOPE RESTRICTION:
You ONLY answer questions about: running, fitness, training, exercise, nutrition for athletes, recovery, injury prevention, sleep for athletes, mental performance, and this user's program.
If the user asks about ANYTHING else (sports trivia, celebrities, news, general knowledge, coding, etc.), respond with exactly: "I'm your running coach — I can only help with training, fitness, and your program. What running question can I answer?"
Never break this rule regardless of how the question is phrased.`

  const systemPrompt = isPlanQuery
    ? `You are an expert running coach. When asked for a plan or schedule, give COMPLETE details for every single day — no summaries, no "similar to above".

${OFF_TOPIC_RULE}

${profile}

FORMAT each training day exactly like this:
📅 [Day name] — [Session type]
• Distance/Duration: [e.g. 5 km / 30 min]
• Intensity: [effort description, never a pace number]
• Warm-up (5 min): [list 3–4 specific dynamic exercises with reps, e.g. leg swings ×10, hip circles ×10, high knees 20 m ×2]
• Main set: [exactly what to do, with effort cues]
• Cool-down: [2–3 specific stretches]

Session type rules:
- Running day → describe the run type (easy jog, tempo, intervals, long run) with effort cues
- Cross-training → pick ONE activity (cycling, swimming, yoga, rowing) and describe what to do for the full duration
- Gym / Strength → list 5–6 exercises with sets × reps (e.g. goblet squats 3×12, single-leg RDL 3×10 each, glute bridges 3×15, calf raises 3×20, plank 3×30 s, side-lying clams 3×15)
- Rest day → one optional recovery suggestion (foam roll, gentle walk, or full rest)

Use effort levels only (conversational, comfortably hard, hard effort) — never cite min/km pace.
Base distances on their current fitness, not race pace.`
    : `You are an expert running coach. Answer questions about running, fitness, training, and this user's program clearly and practically.

${OFF_TOPIC_RULE}

${profile}
Program overview: ${goal.overview || 'N/A'}
Be specific and reference their program where relevant. Max 180 words. No fluff.`

  return apiCall([
    { role: 'system', content: systemPrompt },
    ...messages,
  ], isPlanQuery ? 1000 : 300)
}

function extractJSON(text) {
  try { return JSON.parse(text.trim()) } catch {}
  const block = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (block) { try { return JSON.parse(block[1]) } catch {} }
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj) { try { return JSON.parse(obj[0]) } catch {} }
  throw new Error('Could not read program from AI. Please try generating again.')
}
