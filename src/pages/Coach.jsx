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
const RACE_GOALS  = ['5K Race','10K Race','Half Marathon','Marathon','Base Fitness']
const EXPERIENCE  = [
  { id: 'Beginner',     sub: 'New to running' },
  { id: 'Intermediate', sub: '1–3 years'       },
  { id: 'Advanced',     sub: '3+ years'         },
]
const DAY_OPTS  = [3, 4, 5, 6]
const WEEK_OPTS = [4, 8, 12, 16, 20]
const KM_OPTS   = ['0–20 km', '20–40 km', '40–60 km', '60+ km']

function GoalSetup({ onSave }) {
  const [raceGoal,    setRaceGoal]    = useState('10K Race')
  const [experience,  setExperience]  = useState('Intermediate')
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [currentKm,   setCurrentKm]   = useState('20–40 km')
  const [weeks,       setWeeks]       = useState(12)
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const program = await generateProgram({ raceGoal, experience, daysPerWeek, currentKm, weeks, notes })
      onSave({
        raceGoal, experience, daysPerWeek, currentKm, weeks,
        startDate: new Date().toISOString().split('T')[0],
        overview:          program.overview,
        weekTemplate:      program.weekTemplate,
        progressionNote:   program.progressionNote,
        peakWeeklyVolume:  program.peakWeeklyVolume,
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
            Get a free key at openrouter.ai
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
          <p className={styles.subtitle}>Your coach is designing a personalised {weeks}-week {raceGoal} program…</p>
        </header>
        <div className={styles.generatingWrap}>
          <div className={styles.generatingDots}><span /><span /><span /></div>
          <p className={styles.generatingNote}>Analysing your fitness level, goal, and schedule</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>AI Running Coach</p>
        <h1 className={styles.title}>Build My Program</h1>
        <p className={styles.subtitle}>Answer a few questions and get a full personalised training plan.</p>
      </header>

      <div className={styles.setupForm}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Race Goal</label>
          <div className={styles.pills}>
            {RACE_GOALS.map(g => (
              <button key={g} className={`${styles.pill} ${raceGoal === g ? styles.pillActive : ''}`} onClick={() => setRaceGoal(g)}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Your Experience</label>
          <div className={styles.expRow}>
            {EXPERIENCE.map(e => (
              <button key={e.id} className={`${styles.expCard} ${experience === e.id ? styles.expCardActive : ''}`} onClick={() => setExperience(e.id)}>
                <span className={styles.expTitle}>{e.id}</span>
                <span className={styles.expSub}>{e.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Days / week</label>
            <div className={styles.pills}>
              {DAY_OPTS.map(d => (
                <button key={d} className={`${styles.pill} ${daysPerWeek === d ? styles.pillActive : ''}`} onClick={() => setDaysPerWeek(d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Weeks to race</label>
            <div className={styles.pills}>
              {WEEK_OPTS.map(w => (
                <button key={w} className={`${styles.pill} ${weeks === w ? styles.pillActive : ''}`} onClick={() => setWeeks(w)}>
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Current weekly distance</label>
          <div className={styles.pills}>
            {KM_OPTS.map(k => (
              <button key={k} className={`${styles.pill} ${currentKm === k ? styles.pillActive : ''}`} onClick={() => setCurrentKm(k)}>
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            Anything else? <span className={styles.optLabel}>(optional)</span>
          </label>
          <textarea
            className={styles.notesInput}
            placeholder="Injuries, target finish time, preferred long run day, schedule constraints…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <button className={styles.primaryBtn} onClick={handleGenerate}>
          Generate My Program
        </button>
      </div>
    </div>
  )
}

// ── Program Tab ───────────────────────────────────────────────────────────────
function ProgramTab({ goal, todaySession, todayCheckin, checkins, entries, dayNum, isComplete, onCheckin, onNewGoal }) {
  const weekTemplate = goal.weekTemplate || []

  return (
    <div className={styles.tabContent}>

      {/* Weekly grid */}
      {weekTemplate.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Weekly Structure</p>
          <div className={styles.weekGrid}>
            {weekTemplate.map((s, i) => {
              const st = SESSION_STYLE[s.type] || SESSION_STYLE.rest
              const dayIdx = DAYS_FULL.indexOf(s.day)
              const isToday = s.day === DAYS_FULL[new Date().getDay()]
              return (
                <div
                  key={i}
                  className={`${styles.dayCard} ${isToday ? styles.dayCardToday : ''}`}
                  style={isToday ? { background: st.bg, borderColor: st.border } : {}}
                >
                  <span className={styles.dayShort}>{DAYS_SHORT[dayIdx] ?? s.day.slice(0,3)}</span>
                  <span className={styles.dayDot} style={{ background: st.border }} />
                  <span className={styles.dayLabel} style={{ color: st.color }}>{st.label}</span>
                  <span className={styles.dayDist}>{s.distance || '—'}</span>
                </div>
              )
            })}
          </div>
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
              {['How should I pace my long run?', 'What should I eat before a race?', 'How do I avoid shin splints?', 'When do I know I\'m overtrained?'].map(q => (
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
            <p className={styles.bubbleText}>{msg.content}</p>
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
      'X-Title': 'Gentle BadAss Framework',
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
  const easySessions = daysPerWeek - hardSessions - 1 // -1 for long run
  const restDays     = 7 - daysPerWeek

  const system = `You are an expert running coach. Generate a personalised weekly training template.
Return ONLY valid JSON — no markdown, no explanation, nothing else outside the JSON object.

Required JSON structure:
{
  "overview": "2-3 sentence program philosophy and what the runner will achieve",
  "weekTemplate": [
    {
      "day": "Monday",
      "type": "easy",
      "title": "Easy Recovery Run",
      "distance": "6 km",
      "duration": "35–40 min",
      "pace": "Conversational (able to speak full sentences)",
      "notes": "Detailed session instructions"
    }
  ],
  "progressionNote": "How volume and intensity build across the weeks",
  "peakWeeklyVolume": "XX km"
}

type must be exactly one of: easy, moderate, hard, long, rest, cross

PROGRAM RULES:
- ${daysPerWeek} training days, ${restDays} full rest days
- ${hardSessions} hard/moderate session(s): tempo or intervals (not on days adjacent to long run)
- 1 long run: always Saturday or Sunday
- ${easySessions} easy run(s): truly easy, conversational pace
- Base all distances on current weekly km: ${currentKm}
- For ${raceGoal} at ${experience} level over ${weeks} weeks`

  const raw = await apiCall([
    { role: 'system', content: system },
    { role: 'user',   content: `Build my ${weeks}-week ${raceGoal} plan. I'm ${experience}, currently doing ${currentKm}/week, training ${daysPerWeek} days/week.${notes ? ` Extra info: ${notes}` : ''}` },
  ], 900)

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
  const scores   = entries.slice(0, 5).map(e => `${e.date}: ${computeFeelScore(e.scores || {}).toFixed(1)}/10`).join(', ') || 'none'
  const weekInfo = goal.weekTemplate?.map(s => `${s.day}: ${s.type} ${s.distance || ''}`).join(' | ') || ''
  const recentLog = [...checkins].slice(-3).reverse().map(c => `${c.date}: ${c.status}`).join(', ') || 'none'

  return apiCall([
    { role: 'system', content:
`You are an expert running coach. Answer all running questions clearly and practically.
Runner profile: ${goal.raceGoal} goal, ${goal.experience} level, ${goal.daysPerWeek} days/week, ${goal.weeks}-week program.
Weekly structure: ${weekInfo}
Program overview: ${goal.overview || 'N/A'}
Recent feel scores: ${scores}
Recent sessions: ${recentLog}
Be specific and reference their program where relevant. Max 160 words. No fluff.` },
    ...messages,
  ], 280)
}

function extractJSON(text) {
  try { return JSON.parse(text.trim()) } catch {}
  const block = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (block) { try { return JSON.parse(block[1]) } catch {} }
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj) { try { return JSON.parse(obj[0]) } catch {} }
  throw new Error('Could not read program from AI. Please try generating again.')
}
