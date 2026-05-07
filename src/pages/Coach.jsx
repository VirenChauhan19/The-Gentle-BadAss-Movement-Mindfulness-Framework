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

const DEFAULT_MOBILITY = '8-12 min: ankle rocks x10/side, hip flexor stretch 45s/side, hamstring floss x10/side, thoracic rotations x8/side, easy breathing 2 min.'
const DEFAULT_STRENGTH = '10-15 min: glute bridges 2x12, calf raises 2x15, dead bug 2x8/side, side plank 2x20s/side.'

const BENCHMARK_OPTIONS = [
  { id: '1 mile', label: '1 mile', km: 1.609 },
  { id: '3K', label: '3K', km: 3 },
  { id: '5K', label: '5K', km: 5 },
  { id: '10K', label: '10K', km: 10 },
  { id: 'Half Marathon', label: 'Half Marathon', km: 21.097 },
  { id: 'Marathon', label: 'Marathon', km: 42.195 },
]

function parseRaceTimeToSeconds(value) {
  const clean = String(value || '').trim()
  if (!clean) return null
  if (!clean.includes(':')) {
    const mins = Number(clean)
    return Number.isFinite(mins) && mins > 0 ? mins * 60 : null
  }
  const parts = clean.split(':').map(part => Number(part))
  if (parts.some(part => !Number.isFinite(part) || part < 0)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

function formatPace(secondsPerKm) {
  const safeSeconds = Math.max(150, Math.round(secondsPerKm || 0))
  const mins = Math.floor(safeSeconds / 60)
  const secs = String(safeSeconds % 60).padStart(2, '0')
  return `${mins}:${secs}/km`
}

function formatPaceRange(fromSeconds, toSeconds) {
  return `${formatPace(fromSeconds)}-${formatPace(toSeconds)}`
}

function calculatePaceGuide(distanceId, timeInput) {
  const option = BENCHMARK_OPTIONS.find(item => item.id === distanceId)
  const seconds = parseRaceTimeToSeconds(timeInput)
  if (!option || !seconds) return null

  const predicted5kSeconds = seconds * Math.pow(5 / option.km, 1.06)
  const fiveKPace = predicted5kSeconds / 5
  const guide = {
    benchmark: `${option.label} in ${timeInput.trim()}`,
    estimated5kPace: formatPace(fiveKPace),
    recovery: formatPaceRange(fiveKPace + 120, fiveKPace + 180),
    zone2: formatPaceRange(fiveKPace + 90, fiveKPace + 150),
    easy: formatPaceRange(fiveKPace + 90, fiveKPace + 150),
    long: formatPaceRange(fiveKPace + 105, fiveKPace + 165),
    steady: formatPaceRange(fiveKPace + 60, fiveKPace + 90),
    tempo: formatPaceRange(fiveKPace + 25, fiveKPace + 45),
    intervals: formatPaceRange(fiveKPace - 10, fiveKPace + 10),
  }
  guide.summary = `Recovery ${guide.recovery}; Zone 2/easy ${guide.zone2}; Long ${guide.long}; Tempo ${guide.tempo}; Intervals around ${guide.intervals}.`
  return guide
}

function addDaysISO(startDate, offset) {
  const d = new Date(`${startDate}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function formatDateShort(iso) {
  if (!iso) return ''
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

function getPlan(goal) {
  if (!goal) return []
  const template = goal?.weekTemplate || []
  const startDate = goal.startDate || new Date().toISOString().split('T')[0]
  const totalDays = goal.commitmentDays || ((goal.weeks || 4) * 7)
  const storedPlan = normalizePlan(goal.plan, startDate, totalDays)
  if (storedPlan.length >= totalDays) return storedPlan
  const templatePlan = expandProgramPlan(template, startDate, totalDays)
  return Array.from({ length: totalDays }, (_, i) => {
    if (storedPlan[i]) return storedPlan[i]
    if (templatePlan[i]) return templatePlan[i]
    const date = addDaysISO(startDate, i)
    return {
      id: `day-${i + 1}`,
      dayNumber: i + 1,
      week: Math.floor(i / 7) + 1,
      date,
      day: DAYS_FULL[new Date(`${date}T00:00:00`).getDay()],
      type: 'rest',
      title: 'Rest / Recovery',
      distance: '',
      duration: '10-20 min optional walk',
      pace: 'Very easy',
      notes: 'Full rest or an easy walk. Keep effort low and prepare for the next planned session.',
      crossTraining: '',
      strength: DEFAULT_STRENGTH,
      mobility: DEFAULT_MOBILITY,
    }
  })
}

function expandProgramPlan(template, startDate, totalDays) {
  if (!Array.isArray(template) || !template.length) return []
  return Array.from({ length: totalDays }, (_, i) => {
    const date = addDaysISO(startDate, i)
    const day = DAYS_FULL[new Date(`${date}T00:00:00`).getDay()]
    const session = template.find(s => s.day === day) || template[i % template.length] || {}
    const week = Math.floor(i / 7) + 1
    return {
      id: `day-${i + 1}`,
      dayNumber: i + 1,
      week,
      date,
      day,
      type: session.type || 'rest',
      title: session.title || 'Rest / Recovery',
      distance: session.distance || '',
      duration: session.duration || '',
      pace: session.pace || '',
      notes: session.notes || '',
      crossTraining: session.crossTraining || (session.type === 'cross' ? `${session.duration || '30-45 min'} easy cycling, swimming, elliptical, rowing, or brisk incline walk at conversational effort.` : ''),
      strength: session.strength || DEFAULT_STRENGTH,
      mobility: session.mobility || DEFAULT_MOBILITY,
    }
  })
}

function normalizePlan(rawPlan, startDate, totalDays) {
  if (!Array.isArray(rawPlan) || !rawPlan.length) return []
  return rawPlan.slice(0, totalDays).map((item, i) => {
    const date = item.date || addDaysISO(startDate, i)
    const day = item.day || DAYS_FULL[new Date(`${date}T00:00:00`).getDay()]
    return {
      id: item.id || `day-${i + 1}`,
      dayNumber: item.dayNumber || i + 1,
      week: item.week || Math.floor(i / 7) + 1,
      date,
      day,
      type: item.type || 'rest',
      title: item.title || 'Rest / Recovery',
      distance: item.distance || '',
      duration: item.duration || '',
      pace: item.pace || '',
      notes: item.notes || '',
      crossTraining: item.crossTraining || (item.type === 'cross' ? `${item.duration || '30-45 min'} easy cycling, swimming, elliptical, rowing, or brisk incline walk at conversational effort.` : ''),
      strength: item.strength || DEFAULT_STRENGTH,
      mobility: item.mobility || DEFAULT_MOBILITY,
    }
  })
}

const COACH_REFUSAL = "I'm your running coach - I can only help with running, fitness, training, recovery, and your program. What running question can I answer?"

const RUNNING_SCOPE_RULE = `IMPORTANT - RUNNING FITNESS SCOPE:
Only answer from the Running fitness coach role. Allowed topics are running, run training, indoor/rainy-day workout alternatives, cross-training, workouts, pacing, strength for runners, mobility, injury prevention, recovery, sleep for training, athlete nutrition, race preparation, and this user's program.
If the user asks about anything else, respond exactly: "${COACH_REFUSAL}"
Do not answer general trivia, celebrities, news, coding, schoolwork, entertainment, or unrelated general knowledge.`

const RUNNING_TOPIC_RE = /(run|running|runner|jog|jogging|race|racing|track|800m|1500m|3k|5k|10k|marathon|ultra|pace|pacing|split|splits|distance|duration|effort|rpe|workout|training|train|fitness|exercise|strength|gym|mobility|stretch|warm[-\s]?up|cool[-\s]?down|interval|tempo|stride|sprint|hill|endurance|aerobic|recovery|injur|shin|knee|ankle|hamstring|calf|quad|glute|sleep|nutrition|protein|carb|hydration|program|plan|schedule|session|easy day|long run|cross[-\s]?train|cross training|indoor|inside|rain|raining|rainy|weather|storm|treadmill|bike|cycling|cycle|swim|swimming|row|rowing|elliptical|stair|yoga|home workout|bodyweight)/i

function isRunningFitnessQuestion(text) {
  return RUNNING_TOPIC_RE.test(text || '')
}

function recentDateCutoff(days = 30) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function getReadinessInsight(entries, todaySession) {
  const today = new Date().toISOString().split('T')[0]
  const todayEntry = entries.find(e => e.date === today)
  const scores = todayEntry?.scores || {}
  const feel = todayEntry ? computeFeelScore(scores) : null
  const sessionType = todaySession?.type || 'rest'
  const hardDay = ['hard', 'long', 'moderate'].includes(sessionType)

  if (feel === null) {
    return {
      tone: 'neutral',
      title: 'Readiness not checked yet',
      summary: todaySession
        ? `Log Feel first, then decide whether to run the full ${SESSION_STYLE[sessionType]?.label || sessionType} session.`
        : 'Log Feel first so the coach can read today more clearly.',
      action: 'Do the two-minute Feel check before training.',
    }
  }

  const lowSignals = [
    scores.sleep <= 4 && 'sleep',
    scores.energy <= 4 && 'energy',
    scores.pain <= 4 && 'pain',
    scores.movementReadiness <= 4 && 'movement readiness',
    scores.stress <= 4 && 'stress',
  ].filter(Boolean)

  if (feel <= 4.2 || (hardDay && lowSignals.length >= 2)) {
    return {
      tone: 'caution',
      title: 'Swap or reduce today',
      summary: `Feel is ${feel.toFixed(1)}/10${lowSignals.length ? ` with low ${lowSignals.join(', ')}` : ''}. A full ${SESSION_STYLE[sessionType]?.label || sessionType} session is not the best bet.`,
      action: 'Cut volume 30-50%, keep it easy, or replace with mobility and walking.',
    }
  }

  if (feel < 6.5 || lowSignals.length) {
    return {
      tone: 'steady',
      title: 'Run, but cap the ambition',
      summary: `Feel is ${feel.toFixed(1)}/10. You can train, but today should stay controlled rather than heroic.`,
      action: hardDay ? 'Keep the workout, but stop if form or breathing degrades.' : 'Stay conversational and finish fresher than you started.',
    }
  }

  return {
    tone: 'ready',
    title: 'Green light for the plan',
    summary: `Feel is ${feel.toFixed(1)}/10. Today supports the planned ${SESSION_STYLE[sessionType]?.label || sessionType} session.`,
    action: 'Execute the warm-up properly and keep the first third patient.',
  }
}

function getTrendInsight(entries, checkins) {
  const cutoff = recentDateCutoff(30)
  const recentEntries = entries.filter(e => e.date >= cutoff)
  const recentCheckins = checkins.filter(c => c.date >= cutoff)
  const completed = recentCheckins.filter(c => c.status === 'done').length
  const partial = recentCheckins.filter(c => c.status === 'partial').length
  const missed = recentCheckins.filter(c => c.status === 'missed').length
  const runDays = completed + partial + missed
  const feelScores = recentEntries.map(e => computeFeelScore(e.scores || {})).filter(Boolean)
  const avgFeel = feelScores.length ? feelScores.reduce((a, b) => a + b, 0) / feelScores.length : null
  const lowSleep = recentEntries.filter(e => e.scores?.sleep <= 4).length
  const lowEnergy = recentEntries.filter(e => e.scores?.energy <= 4).length
  const highEffort = recentCheckins.filter(c => Number(c.effort) >= 8).length
  const breathingSessions = recentEntries.flatMap(e => e.sessions || []).filter(s => s.type === 'breathing').length
  const moveQuality = recentEntries.flatMap(e => e.sessions || []).filter(s => typeof s.qualityScore === 'number')
  const avgQuality = moveQuality.length ? moveQuality.reduce((sum, s) => sum + s.qualityScore, 0) / moveQuality.length : null

  let headline = 'Building the training picture'
  let summary = 'Log a few more Feel checks and runs so the coach can spot stronger 30-day patterns.'
  let action = 'Keep logging runs, Feel, and recovery work.'

  if (runDays >= 4 && missed <= Math.max(1, runDays * 0.25)) {
    headline = 'Your consistency is improving'
    summary = `${completed + partial}/${runDays} planned sessions were completed or partially completed in the last 30 days.`
    action = 'Protect the habit: keep easy days easy and avoid chasing every session.'
  }
  if (lowSleep + lowEnergy >= 4) {
    headline = 'Recovery is limiting the upside'
    summary = `Sleep or energy showed low signals ${lowSleep + lowEnergy} times recently, which can drag down hard days.`
    action = 'Move hard sessions after better sleep when possible.'
  }
  if (highEffort >= 3 && missed >= 2) {
    headline = 'Intensity may be stacking up'
    summary = `${highEffort} recent sessions were RPE 8+ and ${missed} were missed. That pattern often means load is outrunning recovery.`
    action = 'Use one clear hard day, then make the next run easy or cross-training.'
  }
  if (breathingSessions >= 3 && avgFeel && avgFeel >= 6.5) {
    headline = 'Recovery days are working'
    summary = `${breathingSessions} breathing sessions pair with an average Feel of ${avgFeel.toFixed(1)}/10.`
    action = 'Keep breathing on recovery days and before harder workouts.'
  }

  return { headline, summary, action, avgFeel, completed, partial, missed, breathingSessions, avgQuality }
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Coach() {
  const { coachData, saveCoachGoal, saveCoachCheckin, clearCoachGoal, addChatMessage, entries, adminRemarks, profile } = useData()
  const [tab, setTab] = useState('program')

  const goal     = coachData?.goal        || null
  const checkins = coachData?.checkins    || []
  const chat     = coachData?.chatHistory || []

  if (!goal) return <GoalSetup onSave={saveCoachGoal} profile={profile} defaultCommitment={profile?.commitment || 30} />

  const today      = new Date().toISOString().split('T')[0]
  const now        = new Date()
  const startDate  = new Date(goal.startDate)
  const plan       = getPlan(goal)
  const totalDays  = goal.commitmentDays || plan.length || ((goal.weeks || 12) * 7)
  const dayNum     = Math.floor((now - startDate) / 86400000) + 1
  const remaining  = Math.max(0, totalDays - dayNum + 1)
  const progress   = Math.min(1, (dayNum - 1) / totalDays)
  const isComplete = dayNum > totalDays
  const weekNum    = Math.ceil(dayNum / 7)

  const todayDayName = DAYS_FULL[now.getDay()]
  const todaySession = plan.find(s => s.date === today) || goal.weekTemplate?.find(s => s.day === todayDayName)
  const todayCheckin = checkins.find(c => c.date === today)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Running</p>
        <h1 className={styles.title}>{goal.focus || goal.raceGoal}</h1>
        <p className={styles.headerSub}>
          {isComplete ? 'Program complete!' : `Week ${weekNum} · Day ${Math.max(1, dayNum)} of ${totalDays}`}
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
            goal={goal} plan={plan} todaySession={todaySession} todayCheckin={todayCheckin}
            checkins={checkins} entries={entries} dayNum={dayNum}
            isComplete={isComplete} onCheckin={saveCoachCheckin} onNewGoal={clearCoachGoal}
            adminRemarks={adminRemarks}
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
const FOCUS_OPTIONS = [
  { id: 'Start Running', label: 'Start Running', meta: 'Walk-run', sub: 'Build the habit safely' },
  { id: 'Base Fitness', label: 'Base Fitness', meta: 'Aerobic', sub: 'Easy mileage and strength' },
  { id: 'Consistency', label: 'Consistency', meta: 'Routine', sub: 'Steady weekly rhythm' },
  { id: 'Weight Loss Support', label: 'Weight Loss', meta: 'Low impact', sub: 'Low-risk volume' },
  { id: 'Speed & Power', label: 'Speed', meta: 'Strides', sub: 'Mechanics and controlled speed' },
  { id: '5K Race', label: '5K Race', meta: 'Race', sub: 'Specific 5K preparation' },
  { id: '10K Race', label: '10K Race', meta: 'Race', sub: 'Specific 10K preparation' },
  { id: 'Half Marathon', label: 'Half Marathon', meta: '21.1 km', sub: 'Longer endurance build' },
  { id: 'Ultra', label: 'Ultra', meta: 'Trail/long', sub: 'Durability and time on feet' },
]

const EXPERIENCE = [
  { id: 'Beginner',     sub: 'New to running', icon: '🌱' },
  { id: 'Intermediate', sub: '1–3 years',      icon: '🚶' },
  { id: 'Advanced',     sub: '3+ years',       icon: '🏃' },
  { id: 'Competitive',  sub: 'Racing to win',  icon: '🏆' },
]

const TOTAL_STEPS = 4
const STEP_TITLES = ['Pick the mission', 'Runner profile', 'Weekly rhythm', 'Final tuning']
const STEP_SUBS   = [
  'Choose the outcome you want the plan to serve.',
  'Your earlier onboarding context is already included here.',
  'Tell the coach what a normal training week can hold.',
  'Add pace evidence, constraints, and anything the coach should respect.',
]

function formatPath(path) {
  if (!path || path === 'not set') return 'Not set'
  return path.charAt(0).toUpperCase() + path.slice(1)
}

function GoalSetup({ onSave, profile, defaultCommitment = 30 }) {
  const [step,        setStep]        = useState(1)
  const [focus,       setFocus]       = useState('')
  const [experience,  setExperience]  = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [currentKm,   setCurrentKm]   = useState('')
  const [benchmarkDistance, setBenchmarkDistance] = useState('')
  const [benchmarkTime, setBenchmarkTime] = useState('')
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  const commitmentDays = Math.max(7, Number(defaultCommitment) || 30)
  const profilePath = profile?.path || 'not set'
  const profileStory = profile?.fitnessHistory || ''
  const paceGuide = calculatePaceGuide(benchmarkDistance, benchmarkTime)
  const shouldAskBenchmark = experience !== 'Beginner' || /race|marathon|ultra|speed/i.test(focus || '')

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const totalDays = commitmentDays
    const weeksNum = Math.max(1, Math.ceil(totalDays / 7))
    const kmStr    = currentKm ? `${currentKm} km/week` : '20–40 km/week'
    const profileNotes = [
      profileStory ? `Onboarding fitness history: ${profileStory}` : null,
      profilePath && profilePath !== 'not set' ? `Onboarding path: ${profilePath}` : null,
      notes ? `Runner notes: ${notes}` : null,
    ].filter(Boolean).join('\n')
    try {
      const startDate = new Date().toISOString().split('T')[0]
      const program = await generateProgram({ focus, experience, daysPerWeek, currentKm: kmStr, weeks: weeksNum, commitmentDays: totalDays, notes: profileNotes, paceGuide })
      const plan = normalizePlan(program.plan, startDate, totalDays)
      const templatePlan = expandProgramPlan(program.weekTemplate || [], startDate, totalDays)
      const fallbackPlan = Array.from({ length: totalDays }, (_, i) =>
        plan[i] || templatePlan[i] || {
          id: `day-${i + 1}`,
          dayNumber: i + 1,
          week: Math.floor(i / 7) + 1,
          date: addDaysISO(startDate, i),
          day: DAYS_FULL[new Date(`${addDaysISO(startDate, i)}T00:00:00`).getDay()],
          type: 'rest',
          title: 'Rest / Recovery',
          distance: '',
          duration: '10-20 min optional walk',
          pace: 'Very easy',
          notes: 'Full rest or an easy walk. Keep effort low and prepare for the next planned session.',
          crossTraining: '',
          strength: DEFAULT_STRENGTH,
          mobility: DEFAULT_MOBILITY,
        }
      )
      onSave({
        focus, raceGoal: focus, experience, daysPerWeek, currentKm: kmStr, weeks: weeksNum, commitmentDays: totalDays,
        startDate,
        benchmark: benchmarkDistance && benchmarkTime ? { distance: benchmarkDistance, time: benchmarkTime } : null,
        paceGuide,
        overview:         program.overview,
        weekTemplate:     program.weekTemplate || [],
        plan:             fallbackPlan,
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
          <p className={styles.label}>Running</p>
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
          <p className={styles.label}>Running</p>
          <h1 className={styles.title}>Building Your Plan</h1>
          <p className={styles.subtitle}>Designing your {commitmentDays}-day {focus} program…</p>
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
        <div className={styles.commitmentRibbon}>
          <span>{commitmentDays}</span>
          <small>days from onboarding</small>
        </div>
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

        {/* Step 1: Training focus */}
        {step === 1 && (
          <>
            <div className={styles.goalGrid}>
              {FOCUS_OPTIONS.map(g => (
                <button
                  key={g.id}
                  className={`${styles.goalCard} ${focus === g.id ? styles.goalCardActive : ''}`}
                  onClick={() => setFocus(g.id)}
                >
                  <span className={styles.goalMeta}>{g.meta}</span>
                  <span className={styles.goalName}>{g.label}</span>
                  <span className={styles.goalSub}>{g.sub}</span>
                </button>
              ))}
            </div>
            <div className={styles.wizardBtns}>
              <button className={styles.wizardNext} disabled={!focus} onClick={() => setStep(2)}>
                Next →
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Experience ── */}
        {step === 2 && (
          <>
            <div className={styles.profileDeck}>
              <div className={styles.profileTile}>
                <span>Path</span>
                <strong>{formatPath(profilePath)}</strong>
              </div>
              <div className={styles.profileTile}>
                <span>Commitment</span>
                <strong>{commitmentDays} days</strong>
              </div>
              {profileStory && (
                <div className={styles.profileStory}>
                  <span>Your story</span>
                  <p>{profileStory}</p>
                </div>
              )}
            </div>
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
              <div className={styles.planHorizon}>
                <span>Plan horizon</span>
                <strong>{commitmentDays} days</strong>
                <p>This comes from onboarding, so Running will not ask you to choose it again.</p>
              </div>
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
                disabled={!currentKm}
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
              {shouldAskBenchmark && (
                <div className={styles.benchmarkCard}>
                  <div>
                    <p className={styles.benchmarkTitle}>Recent race or time trial</p>
                    <p className={styles.benchmarkText}>Optional, but this lets the plan calculate real recovery, Zone 2, tempo, and interval paces.</p>
                  </div>
                  <div className={styles.benchmarkGrid}>
                    <select
                      className={styles.selectInput}
                      value={benchmarkDistance}
                      onChange={e => setBenchmarkDistance(e.target.value)}
                    >
                      <option value="">Distance</option>
                      {BENCHMARK_OPTIONS.map(option => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                    <input
                      className={styles.numberInput}
                      value={benchmarkTime}
                      onChange={e => setBenchmarkTime(e.target.value)}
                      placeholder="Time e.g. 25:30"
                    />
                  </div>
                  {paceGuide && (
                    <div className={styles.pacePreview}>
                      <span>Calculated paces</span>
                      <div className={styles.pacePreviewGrid}>
                        <p><strong>Recovery</strong>{paceGuide.recovery}</p>
                        <p><strong>Zone 2</strong>{paceGuide.zone2}</p>
                        <p><strong>Long</strong>{paceGuide.long}</p>
                        <p><strong>Tempo</strong>{paceGuide.tempo}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
function ProgramTab({ goal, plan = [], todaySession, todayCheckin, checkins, entries, dayNum, isComplete, onCheckin, onNewGoal, adminRemarks = [] }) {
  const visiblePlan = plan.length ? plan : getPlan(goal)
  const currentDay = Math.max(1, dayNum)
  const currentWeek = Math.max(1, Math.ceil(currentDay / 7))
  const totalWeeks = Math.max(1, Math.ceil(visiblePlan.length / 7))
  const [weekIndex, setWeekIndex] = useState(currentWeek)
  const [selectedDay, setSelectedDay] = useState(null)
  const nextSessions = visiblePlan.filter(s => s.dayNumber >= currentDay).slice(0, 14)
  const trainingDays = visiblePlan.filter(s => s.type !== 'rest').length
  const completedDates = new Set(checkins.map(c => c.date))
  const todayStyle = SESSION_STYLE[todaySession?.type] || SESSION_STYLE.rest
  const remarksByDate = adminRemarks.reduce((map, remark) => {
    const key = remark.runDate || remark.date
    if (!key) return map
    map[key] = [...(map[key] || []), remark]
    return map
  }, {})
  const generalRemarks = adminRemarks.filter(r => !r.runDate)
  const todayRemarks = todaySession?.date ? (remarksByDate[todaySession.date] || []) : []
  const readinessInsight = getReadinessInsight(entries, todaySession)
  const trendInsight = getTrendInsight(entries, checkins)

  // Days for the visible week
  const weekDays = visiblePlan.filter(s => (s.week || Math.ceil((s.dayNumber || 1) / 7)) === weekIndex)
  const weekStart = weekDays[0]?.date
  const weekEnd = weekDays[weekDays.length - 1]?.date
  const weekKm = weekDays.reduce((sum, d) => {
    const match = (d.distance || '').match(/[\d.]+/)
    return sum + (match ? parseFloat(match[0]) : 0)
  }, 0)
  const weekWorkouts = weekDays.filter(d => d.type !== 'rest').length
  const weekLogged = weekDays.filter(d => completedDates.has(d.date)).length
  const isCurrentWeek = weekIndex === currentWeek
  const isPastWeek = weekIndex < currentWeek
  const isFutureWeek = weekIndex > currentWeek

  function toggleDay(s) {
    setSelectedDay(prev => prev?.date === s.date ? null : s)
  }

  function goToPrevWeek() {
    setSelectedDay(null)
    setWeekIndex(w => Math.max(1, w - 1))
  }

  function goToNextWeek() {
    setSelectedDay(null)
    setWeekIndex(w => Math.min(totalWeeks, w + 1))
  }

  function goToCurrentWeek() {
    setSelectedDay(null)
    setWeekIndex(currentWeek)
  }

  return (
    <div className={styles.tabContent}>

      <div className={styles.runningDashboard}>
        <InsightCard
          label="Today readiness"
          title={readinessInsight.title}
          summary={readinessInsight.summary}
          action={readinessInsight.action}
          tone={readinessInsight.tone}
        />
        <TrendIntelligence insight={trendInsight} />
        {goal.paceGuide && (
          <div className={styles.paceGuideCard}>
            <div>
              <span>Personal pace guide</span>
              <p>{goal.paceGuide.benchmark}</p>
            </div>
            <div className={styles.paceGuideGrid}>
              <p><strong>Recovery</strong>{goal.paceGuide.recovery}</p>
              <p><strong>Zone 2</strong>{goal.paceGuide.zone2}</p>
              <p><strong>Long</strong>{goal.paceGuide.long}</p>
              <p><strong>Tempo</strong>{goal.paceGuide.tempo}</p>
            </div>
          </div>
        )}
        {todaySession && !isComplete && (
          <div className={styles.todayHero} style={{ borderColor: todayStyle.border }}>
            <div className={styles.todayHeroTop}>
              <div>
                <p className={styles.sectionLabel}>Today</p>
                <h2>{todaySession.title || todayStyle.label}</h2>
              </div>
              <span className={styles.sessionChip} style={{ color: todayStyle.color, background: todayStyle.bg }}>
                {todayStyle.label}
              </span>
            </div>
            <div className={styles.todayMetrics}>
              <span>{todaySession.distance || 'No distance'}</span>
              <span>{todaySession.duration || 'Open duration'}</span>
              <span>Day {todaySession.dayNumber || currentDay}</span>
            </div>
            {todaySession.pace && <p className={styles.todayPace}>{todaySession.pace}</p>}
            {todaySession.notes && <p className={styles.todayNotes}>{todaySession.notes}</p>}
            <DailyTrainingBlocks session={todaySession} />
            {todayRemarks.length > 0 && <AttachedRemarks remarks={todayRemarks} />}
          </div>
        )}

        <div className={styles.planSummary}>
          <div>
            <span>{visiblePlan.length}</span>
            <p>days mapped</p>
          </div>
          <div>
            <span>{trainingDays}</span>
            <p>workouts</p>
          </div>
          <div>
            <span>{completedDates.size}</span>
            <p>logged</p>
          </div>
        </div>
      </div>

      {visiblePlan.length > 0 && (
        <div className={styles.weekBoard}>
          <div className={styles.weekNav}>
            <button
              className={styles.weekNavBtn}
              onClick={goToPrevWeek}
              disabled={weekIndex <= 1}
              aria-label="Previous week"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div className={styles.weekHeading}>
              <p className={styles.weekKicker}>
                {isCurrentWeek ? 'This week' : isPastWeek ? 'Past week' : 'Upcoming week'}
              </p>
              <h2 className={styles.weekTitle}>Week {weekIndex} <span>of {totalWeeks}</span></h2>
              {weekStart && weekEnd && (
                <p className={styles.weekRange}>{formatDateShort(weekStart)} — {formatDateShort(weekEnd)}</p>
              )}
            </div>
            <button
              className={styles.weekNavBtn}
              onClick={goToNextWeek}
              disabled={weekIndex >= totalWeeks}
              aria-label="Next week"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          {!isCurrentWeek && (
            <button className={styles.jumpToCurrentBtn} onClick={goToCurrentWeek}>
              Jump to current week
            </button>
          )}

          <div className={styles.weekStats}>
            <div>
              <span>{weekWorkouts}</span>
              <p>workouts</p>
            </div>
            <div>
              <span>{weekKm > 0 ? weekKm.toFixed(1) : '—'}</span>
              <p>km planned</p>
            </div>
            <div>
              <span>{weekLogged}<small>/7</small></span>
              <p>logged</p>
            </div>
          </div>

          <div className={styles.weekGrid}>
            {weekDays.map((s, i) => {
              const st = SESSION_STYLE[s.type] || SESSION_STYLE.rest
              const isToday = s.date === new Date().toISOString().split('T')[0]
              const isSelected = selectedDay?.date === s.date
              const isLogged = completedDates.has(s.date)
              const hasRemark = (remarksByDate[s.date] || []).length > 0
              return (
                <button
                  key={s.id || s.date || i}
                  className={`${styles.weekDay} ${isToday ? styles.weekDayToday : ''} ${isSelected ? styles.weekDaySelected : ''} ${isLogged ? styles.weekDayLogged : ''}`}
                  style={{ '--type-color': st.color, '--type-border': st.border, '--type-bg': st.bg }}
                  onClick={() => toggleDay(s)}
                >
                  <div className={styles.weekDayHeader}>
                    <span className={styles.weekDayName}>{s.day?.slice(0, 3) || DAYS_SHORT[i]}</span>
                    <span className={styles.weekDayDate}>{s.date?.slice(8)}</span>
                  </div>
                  <span className={styles.weekDayType}>{isLogged ? '✓ Logged' : st.label}</span>
                  <strong className={styles.weekDayTitle}>{s.title || st.label}</strong>
                  <span className={styles.weekDayMeta}>{s.distance || s.duration || 'Recovery'}</span>
                  {hasRemark && <em className={styles.weekDayRemarkDot}>Coach note</em>}
                  {isToday && <span className={styles.weekDayTodayBadge}>Today</span>}
                </button>
              )
            })}
          </div>

          {selectedDay && (() => {
            const st = SESSION_STYLE[selectedDay.type] || SESSION_STYLE.rest
            return (
              <div className={styles.dayDetail} style={{ borderLeft: `4px solid ${st.border}` }}>
                <div className={styles.dayDetailTop}>
                  <div>
                    <span className={styles.dayDetailType} style={{ color: st.color }}>{st.label}</span>
                    <span className={styles.dayDetailMeta}>Day {selectedDay.dayNumber} · {selectedDay.date} · {selectedDay.distance || selectedDay.duration}</span>
                  </div>
                  <button className={styles.dayDetailClose} onClick={() => setSelectedDay(null)}>✕</button>
                </div>
                <p className={styles.dayDetailTitle}>{selectedDay.title}</p>
                {selectedDay.pace && <p className={styles.dayDetailPace}>Pace: {selectedDay.pace}</p>}
                {selectedDay.notes && <p className={styles.dayDetailNotes}>{selectedDay.notes}</p>}
                <DailyTrainingBlocks session={selectedDay} />
                {(remarksByDate[selectedDay.date] || []).length > 0 && (
                  <AttachedRemarks remarks={remarksByDate[selectedDay.date]} />
                )}
              </div>
            )
          })()}

          <p className={styles.weekProgressText}>
            {goal.commitmentDays || visiblePlan.length} days mapped · {trainingDays} workouts · {completedDates.size} logged
          </p>
        </div>
      )}

      {nextSessions.length > 0 && (
        <div className={styles.upNext}>
          <p className={styles.sectionLabel}>Up next</p>
          {nextSessions.slice(0, 5).map(s => {
            const st = SESSION_STYLE[s.type] || SESSION_STYLE.rest
            return (
              <button key={s.id || s.date} className={styles.upNextRow} onClick={() => setSelectedDay(s)}>
                <span style={{ background: st.border }} />
                <div>
                  <strong>Day {s.dayNumber}: {s.title}</strong>
                  <p>{s.date} · {s.distance || s.duration || SESSION_STYLE[s.type]?.label}</p>
                </div>
              </button>
            )
          })}
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
      {false && todaySession && !isComplete && (
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
          <p className={styles.completionMsg}>You finished your {goal.commitmentDays || visiblePlan.length}-day {goal.focus || goal.raceGoal} program. That's the work.</p>
          <button className={styles.primaryBtn} onClick={onNewGoal}>Start a New Program</button>
        </div>
      ) : todayCheckin ? (
        <CheckinDisplay checkin={todayCheckin} remarks={remarksByDate[todayCheckin.date] || []} />
      ) : (
        <CheckinForm
          goal={goal} checkins={checkins} entries={entries}
          todaySession={todaySession} onSubmit={onCheckin}
        />
      )}

      {generalRemarks.length > 0 && (
        <DailyRemarks remarks={generalRemarks} checkins={checkins} />
      )}

      {/* Run log */}
      {checkins.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Run Log</p>
          {[...checkins].reverse().map(c => <RunLogEntry key={c.date} checkin={c} remarks={remarksByDate[c.date] || []} />)}
        </div>
      )}

      <button className={styles.changeGoalBtn} onClick={onNewGoal}>← Change program</button>
    </div>
  )
}

function DailyRemarks({ remarks, checkins }) {
  const checkinByDate = Object.fromEntries(checkins.map(c => [c.date, c]))
  const sorted = [...remarks].sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''))

  return (
    <div className={styles.dailyRemarks}>
      <p className={styles.sectionLabel}>Daily Remarks</p>
      {sorted.map(r => {
        const run = r.runDate ? checkinByDate[r.runDate] : null
        return (
          <div key={r.id} className={styles.dailyRemarkCard}>
            <div className={styles.dailyRemarkTop}>
              <span>{r.from || 'Coach'}</span>
              <span>{r.runDate || r.date}</span>
            </div>
            {run && (
              <p className={styles.dailyRemarkRun}>
                Run: {run.status} · {run.userNote?.slice(0, 80)}
              </p>
            )}
            <p className={styles.dailyRemarkText}>{r.text}</p>
          </div>
        )
      })}
    </div>
  )
}

function InsightCard({ label, title, summary, action, tone = 'neutral', details }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`${styles.insightCard} ${styles[`insight_${tone}`] || ''}`}>
      <div className={styles.insightTop}>
        <span>{label}</span>
        {details && (
          <button type="button" onClick={() => setOpen(v => !v)}>
            {open ? 'Less' : 'Say more'}
          </button>
        )}
      </div>
      <h3>{title}</h3>
      <p>{summary}</p>
      {action && <strong>{action}</strong>}
      {open && details && (
        <div className={styles.insightDetails}>
          {details.pacing && <p><span>Pacing</span>{details.pacing}</p>}
          {details.effort && <p><span>Effort</span>{details.effort}</p>}
          {details.trainingLoad && <p><span>Load</span>{details.trainingLoad}</p>}
          {details.nextSession && <p><span>Next</span>{details.nextSession}</p>}
        </div>
      )}
    </div>
  )
}

function TrendIntelligence({ insight }) {
  return (
    <div className={styles.trendCard}>
      <div className={styles.trendHeader}>
        <span>30-day intelligence</span>
        {insight.avgFeel && <strong>{insight.avgFeel.toFixed(1)} Feel</strong>}
      </div>
      <h3>{insight.headline}</h3>
      <p>{insight.summary}</p>
      <div className={styles.trendStats}>
        <span>{insight.completed} done</span>
        <span>{insight.partial} partial</span>
        <span>{insight.missed} missed</span>
        <span>{insight.breathingSessions} breath</span>
      </div>
      <strong className={styles.trendAction}>{insight.action}</strong>
    </div>
  )
}

// ── Already logged today ───────────────────────────────────────────────────────
function AttachedRemarks({ remarks }) {
  return (
    <div className={styles.attachedRemarks}>
      {remarks.map(r => (
        <div key={r.id} className={styles.attachedRemark}>
          <div className={styles.dailyRemarkTop}>
            <span>{r.from || 'Coach'}</span>
            <span>{r.runDate || r.date}</span>
          </div>
          <p className={styles.dailyRemarkText}>{r.text}</p>
        </div>
      ))}
    </div>
  )
}

function DailyTrainingBlocks({ session }) {
  const blocks = [
    session.crossTraining && { label: 'Cross-training', text: session.crossTraining },
    session.strength && { label: 'Strength', text: session.strength },
    session.mobility && { label: 'Mobility', text: session.mobility },
  ].filter(Boolean)
  if (!blocks.length) return null

  return (
    <div className={styles.dailyBlocks}>
      {blocks.map(block => (
        <div key={block.label} className={styles.dailyBlock}>
          <span>{block.label}</span>
          <p>{block.text}</p>
        </div>
      ))}
    </div>
  )
}

function CheckinDisplay({ checkin, remarks = [] }) {
  const insight = normalizeInsight(checkin.insight)
  return (
    <div className={styles.checkinDisplay}>
      <div className={styles.checkinDisplayTop}>
        <span className={`${styles.statusBadge} ${styles[`status_${checkin.status}`]}`}>
          {checkin.status === 'done' ? '✓ Completed' : checkin.status === 'partial' ? '↗ Partial' : '✗ Missed'}
        </span>
        <span className={styles.loggedLabel}>Today logged</span>
      </div>
      {(checkin.distance || checkin.duration || checkin.pace || checkin.effort) && (
        <div className={styles.checkinFacts}>
          {checkin.distance && <span>{checkin.distance} km</span>}
          {checkin.duration && <span>{checkin.duration} min</span>}
          {checkin.pace && <span>{checkin.pace}</span>}
          {checkin.effort && <span>RPE {checkin.effort}/10</span>}
        </div>
      )}
      <p className={styles.checkinNote}>{checkin.userNote}</p>
      {remarks.length > 0 && <AttachedRemarks remarks={remarks} />}
      {insight && (
        <InsightCard
          label="Post-session insight"
          title={insight.title}
          summary={insight.summary}
          action={insight.action}
          tone={insight.tone || 'ready'}
          details={insight.details}
        />
      )}
      {checkin.aiReply && (
        <div className={styles.coachReply}>
          <p className={styles.coachLabel}>Running</p>
          <p className={styles.coachText}>{checkin.aiReply}</p>
        </div>
      )}
    </div>
  )
}

// ── Daily check-in form ───────────────────────────────────────────────────────
function CheckinForm({ goal, checkins, entries, todaySession, onSubmit }) {
  const [status,  setStatus]  = useState(null)
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')
  const [pace, setPace] = useState('')
  const [effort, setEffort] = useState('')
  const [surface, setSurface] = useState('')
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const needsRunDetails = status === 'done' || status === 'partial'
  const canSubmit = status && (
    needsRunDetails
      ? distance.trim() && duration.trim() && effort
      : note.trim()
  )

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    const structuredNote = [
      needsRunDetails ? `Distance: ${distance.trim()} km` : null,
      needsRunDetails ? `Duration: ${duration.trim()} min` : null,
      pace.trim() ? `Pace/speed: ${pace.trim()}` : null,
      effort ? `Effort: ${effort}/10` : null,
      surface.trim() ? `Surface: ${surface.trim()}` : null,
      note.trim() ? `Notes: ${note.trim()}` : null,
    ].filter(Boolean).join('\n')
    let aiReply = ''
    let insight = null
    try {
      insight = await getPostSessionInsight(goal, checkins, entries, status, structuredNote, todaySession)
      aiReply = insight?.summary || await getCheckinReply(goal, checkins, entries, status, structuredNote, todaySession)
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    onSubmit({
      status,
      distance: distance.trim(),
      duration: duration.trim(),
      pace: pace.trim(),
      effort,
      surface: surface.trim(),
      userNote: structuredNote,
      aiReply,
      insight,
    })
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
      {needsRunDetails && (
        <div className={styles.runDetailGrid}>
          <label>
            <span>Distance</span>
            <input value={distance} onChange={e => setDistance(e.target.value)} placeholder="e.g. 5.2" inputMode="decimal" disabled={loading} />
          </label>
          <label>
            <span>Duration</span>
            <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 32" inputMode="decimal" disabled={loading} />
          </label>
          <label>
            <span>Pace / speed</span>
            <input value={pace} onChange={e => setPace(e.target.value)} placeholder="e.g. 6:10/km or easy" disabled={loading} />
          </label>
          <label>
            <span>Effort</span>
            <select value={effort} onChange={e => setEffort(e.target.value)} disabled={loading}>
              <option value="">RPE 1-10</option>
              {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}/10</option>)}
            </select>
          </label>
          <label className={styles.fullField}>
            <span>Surface / route</span>
            <input value={surface} onChange={e => setSurface(e.target.value)} placeholder="Road, trail, treadmill, track..." disabled={loading} />
          </label>
        </div>
      )}
      <textarea
        className={styles.checkinInput}
        placeholder={needsRunDetails ? 'How did it feel? Any pain, breathing, energy, or form notes?' : 'Why did you miss it? What should tomorrow account for?'}
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={4}
        disabled={loading}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <button
        className={styles.primaryBtn}
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
      >
        {loading ? 'Getting coach feedback…' : 'Log Run'}
      </button>
    </div>
  )
}

// ── Run log entry ─────────────────────────────────────────────────────────────
function RunLogEntry({ checkin, remarks = [] }) {
  const [open, setOpen] = useState(false)
  const insight = normalizeInsight(checkin.insight)
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
          {(checkin.distance || checkin.duration || checkin.pace || checkin.effort) && (
            <div className={styles.checkinFacts}>
              {checkin.distance && <span>{checkin.distance} km</span>}
              {checkin.duration && <span>{checkin.duration} min</span>}
              {checkin.pace && <span>{checkin.pace}</span>}
              {checkin.effort && <span>RPE {checkin.effort}/10</span>}
            </div>
          )}
          <p className={styles.logNote}>{checkin.userNote}</p>
          {remarks.length > 0 && <AttachedRemarks remarks={remarks} />}
          {insight && (
            <InsightCard
              label="Post-session insight"
              title={insight.title}
              summary={insight.summary}
              action={insight.action}
              tone={insight.tone || 'ready'}
              details={insight.details}
            />
          )}
          {checkin.aiReply && (
            <div className={styles.coachReply} style={{ marginTop: 10 }}>
              <p className={styles.coachLabel}>Running</p>
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
  const recentCheckins = [...(checkins || [])].slice(-6).reverse()
  const latestCheckin = recentCheckins[0]
  const recentEntries = [...(entries || [])]
    .filter(entry => entry?.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5)
  const recentFeelScores = recentEntries
    .map(entry => computeFeelScore(entry))
    .filter(score => typeof score === 'number' && Number.isFinite(score))
  const averageFeel = recentFeelScores.length
    ? recentFeelScores.reduce((sum, score) => sum + score, 0) / recentFeelScores.length
    : null
  const completedRuns = (checkins || []).filter(item => item.status === 'done').length
  const partialRuns = (checkins || []).filter(item => item.status === 'partial').length
  const missedRuns = (checkins || []).filter(item => item.status === 'missed').length
  const planLength = goal?.commitmentDays || ((goal?.weeks || 0) * 7) || getPlan(goal).length || 0
  const chatPrompts = [
    'Read my recent training and tell me what pattern you see.',
    'Should I do the full session today or adjust it?',
    'Explain my last run like a Strava-style coach insight.',
    'What should I change next session based on my recent Feel scores?',
  ]

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
      <section className={styles.chatPanel}>
      <div className={styles.chatMessages}>
        {history.length === 0 && !loading && (
          <div className={styles.chatEmpty}>
            <p className={styles.chatEmptyTitle}>Ask about your running plan</p>
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
            {msg.role === 'assistant' && <p className={styles.coachLabel}>Running</p>}
            <p className={styles.bubbleText} style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className={`${styles.bubble} ${styles.bubbleCoach} ${styles.liveBubble}`}>
            <p className={styles.coachLabel}>Running</p>
            <div className={styles.typingDots}><span /><span /><span /></div>
            <p className={styles.writingStatus}>Coach is writing</p>
          </div>
        )}

        {error && <p className={styles.chatError}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className={styles.chatInputRow}>
        <textarea
          className={styles.chatInput}
          placeholder="Ask about running…"
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
      </section>

      <aside className={styles.chatSide} aria-label="Coach context">
        <div className={styles.coachContextCard}>
          <span className={styles.sideEyebrow}>Live context</span>
          <h3>{goal?.focus || goal?.raceGoal || 'Running plan'}</h3>
          <p>
            {goal?.experience || 'Runner'} level
            {goal?.daysPerWeek ? `, ${goal.daysPerWeek} days/week` : ''}
            {planLength ? `, ${planLength}-day plan` : ''}
          </p>
          <div className={styles.contextGrid}>
            <div>
              <strong>{completedRuns}</strong>
              <span>Done</span>
            </div>
            <div>
              <strong>{partialRuns}</strong>
              <span>Partial</span>
            </div>
            <div>
              <strong>{missedRuns}</strong>
              <span>Missed</span>
            </div>
            <div>
              <strong>{averageFeel ? averageFeel.toFixed(1) : '-'}</strong>
              <span>Feel</span>
            </div>
          </div>
        </div>

        <div className={styles.coachPromptCard}>
          <span className={styles.sideEyebrow}>Ask faster</span>
          {chatPrompts.map(prompt => (
            <button key={prompt} className={styles.sidePrompt} onClick={() => setInput(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        <div className={styles.coachRecentCard}>
          <span className={styles.sideEyebrow}>Recent signal</span>
          {latestCheckin ? (
            <div className={styles.recentSignal}>
              <strong>{latestCheckin.status || 'Logged'}</strong>
              <p>
                {latestCheckin.date || 'Recent'}
                {latestCheckin.distance ? ` - ${latestCheckin.distance} km` : ''}
                {latestCheckin.effort ? ` - RPE ${latestCheckin.effort}` : ''}
              </p>
            </div>
          ) : (
            <p className={styles.sideMuted}>Log a run and the coach will use it here.</p>
          )}
          {recentEntries.length > 0 && (
            <div className={styles.miniList}>
              {recentEntries.slice(0, 3).map(entry => (
                <span key={entry.id || entry.date}>
                  {entry.date}: Feel {computeFeelScore(entry)?.toFixed?.(1) || '-'}
                </span>
              ))}
            </div>
          )}
        </div>
      </aside>
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

async function generateProgram({ focus, experience, daysPerWeek, currentKm, weeks, commitmentDays, notes, paceGuide }) {
  const hardSessions = daysPerWeek >= 5 ? 2 : 1
  const easySessions = Math.max(0, daysPerWeek - hardSessions - 1)
  const restDays     = 7 - daysPerWeek
  const raceGoal = focus

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

  const improvedTrackRules = isTrackEvent ? `
TRACK EVENT RULES (${raceGoal}):
- Hard sessions MUST use actual track interval notation such as "6 x 200m", "4 x 400m", "3 x 600m", "4 x 800m".
- Always include recovery, such as "with 90s standing recovery" or "with 200m jog recovery".
- Tempo runs: 1-3 km blocks at comfortably hard effort, not race pace.
- Easy runs can be 20-30 min; shorter is fine for speed recovery.
- Week 1 must be smooth and easy, especially for Beginner runners: use easy runs, drills, relaxed strides, or short 100m-200m reps. Do not prescribe hard 300m/400m repeats in week 1 for Beginner runners.
- Progress reps/volume each week, not intensity.
- For an 800m goal, beginner and early-plan quality work should prefer 100m-200m reps and relaxed strides before 300m/400m work.
- For an 800m goal, never imply 300m reps should be run in 30 seconds. If giving split guidance, 30 seconds is a fast 200m reference, not a 300m reference.
- For ${raceGoal}: speciality sessions should target controlled race-specific effort only after the runner has built tolerance.
- Distance field for track sessions: use interval notation, not km.` : trackRules

  const workoutRules = `
HARD WORKOUT QUALITY RULES:
- Hard workouts must look like what a coach would actually prescribe for this event and level, not random intervals.
- Choose the workout purpose first: speed mechanics, speed endurance, aerobic power, threshold, race rhythm, hills, or controlled time trial.
- Match the purpose to the runner: Beginner = relaxed strides, short reps, hills, fartlek, and light tempo only after consistency; Intermediate = one focused controlled workout per week; Advanced/Competitive = event-specific reps, threshold support, and race-rhythm work.
- Every hard workout must include target speed guidance in the "pace" field and again inside "notes".
- If the user provided a goal time or recent race/time-trial in notes, convert it to rep targets. Example: goal 800m 2:40 means 200m pace is about 40s and 400m pace is about 80s.
- If no goal time/recent benchmark is provided, do not invent exact seconds. Use a safe range tied to feel, such as "fast but relaxed, about 7-8/10, last rep same speed as first" and ask for a recent 400m/800m/1 mile time.
- Rep speed must match rep distance. Never use a 200m split for a 300m or 400m rep.
- Include recovery long enough to preserve form: short speed reps need full walk/jog recovery; tempo/threshold reps need shorter controlled recovery.`

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

  const benchmarkPaceRules = paceGuide ? `
BENCHMARK-BASED PACE GUIDE:
- The user provided this benchmark: ${paceGuide.benchmark}.
- Estimated current 5K pace: ${paceGuide.estimated5kPace}.
- Recovery runs must use this pace range: ${paceGuide.recovery}.
- Zone 2 and easy runs must use this pace range: ${paceGuide.zone2}.
- Long runs must use this pace range: ${paceGuide.long}.
- Steady aerobic runs should use this pace range: ${paceGuide.steady}.
- Tempo/threshold work should use this pace range: ${paceGuide.tempo}.
- Intervals should use ${paceGuide.intervals} unless the rep distance requires a split conversion.
- Every running day must include the correct calculated pace range in the "pace" field. Do not replace it with vague effort only.
- Still include feel cues next to the pace, because sleep, soreness, heat, hills, and terrain can require adjustment.` : `
BENCHMARK-BASED PACE GUIDE:
- No recent race or time-trial benchmark was provided.
- Do not invent exact min/km numbers. Use effort-based guidance and ask the runner for a recent 1 mile, 5K, 10K, half marathon, or marathon time if they want exact paces.
- Every running day must still have a useful "pace" field, such as conversational Zone 2, relaxed recovery, steady RPE 5-6/10, or controlled tempo RPE 7/10.`

  const system = `You are an expert running coach. Generate a personalised running and fitness plan for the user's full commitment. The user does not need to be training for a race.
Return ONLY valid JSON — no markdown, no explanation, no text outside the JSON.

JSON structure:
{
  "overview": "2–3 sentence program philosophy and what the runner will achieve",
  "plan": [
    {
      "dayNumber": 1,
      "week": 1,
      "type": "easy|moderate|hard|long|rest|cross",
      "title": "Session title",
      "distance": "6 km  OR  6 x 400m  OR  45 min",
      "duration": "35-40 min",
      "pace": "specific effort or speed guidance",
      "notes": "Warm-up, main set, and cool-down details",
      "crossTraining": "For cross days: exact modality, duration, and intensity. Empty string on non-cross days unless useful.",
      "strength": "Daily strength prescription with exercises, sets, reps, and duration",
      "mobility": "Daily mobility prescription with exercises and duration"
    }
  ],
  "weekTemplate": [
    {
      "day": "Monday",
      "type": "easy|moderate|hard|long|rest|cross",
      "title": "Session title",
      "distance": "6 km  OR  6 × 400m  OR  45 min",
      "duration": "35–40 min",
      "pace": "exact target speed guidance for the session; for intervals include rep split guidance or benchmark-based effort",
      "notes": "Warm-up (5 min): [4 dynamic exercises with reps]. Main set: [exact workout including how fast to run each rep and recovery]. Cool-down: [2–3 stretches]."
    }
  ],
  "progressionNote": "How volume and intensity build week to week",
  "peakWeeklyVolume": "XX km or total reps"
}

${improvedTrackRules}

${paceRules}

${benchmarkPaceRules}

${workoutRules}

SESSION NOTES — every non-rest day must have all three:
1. Warm-up (5 min): 4 specific dynamic exercises with reps/distance (leg swings ×10, hip circles ×10, high knees 20m ×2, dynamic lunges 10m ×2)
2. Main set: exact description with effort cues, target rep speed, and recovery. For intervals, state how fast to run each rep.
3. Cool-down: 2–3 named stretches (quad, hamstring, calf, hip flexor)

PROGRAM STRUCTURE:
- The plan is for ${commitmentDays} total days, not only a race build.
- Return one "plan" item for every day from dayNumber 1 through dayNumber ${commitmentDays}. Do not skip rest days.
- If the focus is general fitness, consistency, weight-loss support, or starting running, build a sustainable habit-based plan instead of race preparation.
- Vary the plan across weeks with small progressions and recovery days when appropriate.
- ${daysPerWeek} training days · ${restDays} rest days
- ${hardSessions} hard/quality session(s) — NOT adjacent to long run
- 1 long run on Saturday or Sunday
- ${easySessions} easy run(s) at truly conversational effort
- Cross-training days: specify activity (cycling, swimming, yoga, rowing) with duration
- Every cross-training day must say exactly how long to do it and what intensity to use, e.g. "35-45 min easy cycling, RPE 3-4/10".
- Every single day, including rest days, must include a "strength" field and a "mobility" field.
- Strength should be realistic daily work: 8-20 minutes, 3-6 movements, sets/reps, and adjusted to the day. Hard run days get lighter activation; easy/rest days can carry more strength.
- Mobility should be 8-15 minutes daily with named drills and durations/reps. Include hips, calves/ankles, hamstrings, thoracic spine, and breathing as appropriate.
- Do not hide strength or mobility only inside notes. Use the dedicated JSON fields.
- Base all distances on current volume: ${currentKm}
- Start Running plans should use walk-run intervals, short easy runs, mobility, and rest days before continuous runs.
- Base Fitness and Weight Loss Support plans should prioritise easy effort, time on feet, cross-training, and strength; do not overload hard workouts.
- Race-focus plans can include race-specific work, but only after easy volume and recovery are established.
- Each running session must be realistic for ${currentKm}; avoid sudden distance jumps and make the title match the workout.
- Weekly mileage must progress across the commitment when recovery allows: build most weeks by about 5-10%, include a lighter recovery week every 3-4 weeks, and never increase both intensity and long-run distance sharply in the same week.
- For every week, make the total planned running volume coherent with the individual daily sessions. Later weeks should clearly show increased volume, longer long runs, or slightly more quality work compared with week 1 unless the focus is recovery.
- Put the weekly progression logic into actual day-by-day workouts, not just the overview text.
- Week 1 must be smooth and easy: no volume spikes, no race-effort intervals for beginners, and no hard sessions before the runner has adapted
- Beginner plans must build gradually: week 1 should feel comfortable, weeks 2-4 add small volume or light strides, later weeks can add controlled workouts if recovery is good
- Focus: ${raceGoal} · Level: ${experience} · Duration: ${commitmentDays} days
- Week 1 must start at or slightly below current volume — no spikes`

  const raw = await apiCall([
    { role: 'system', content: system },
    { role: 'user',   content: `Build my full ${commitmentDays}-day ${raceGoal} plan. I'm ${experience} level, currently doing ${currentKm}, training ${daysPerWeek} days/week.${notes ? ` Notes: ${notes}` : ''}` },
  ], Math.min(6000, Math.max(2200, commitmentDays * 90)))

  return extractJSON(raw)
}

async function getCheckinReply(goal, checkins, entries, status, note, todaySession) {
  if (!isRunningFitnessQuestion(note)) return COACH_REFUSAL

  const scores  = entries.slice(0, 5).map(e => `${e.date}: ${computeFeelScore(e.scores || {}).toFixed(1)}/10`).join(', ') || 'none'
  const recent  = [...checkins].slice(-5).reverse().map(c => `${c.date}: ${c.status} — ${c.userNote}`).join('\n') || 'none'
  const session = todaySession ? `Planned: ${todaySession.type} ${todaySession.distance} (${todaySession.duration})` : 'Rest day'

  return apiCall([
    { role: 'system', content:
`You are a dedicated running coach. Direct, warm, specific. Max 120 words.
${RUNNING_SCOPE_RULE}
Runner focus: ${goal.focus || goal.raceGoal}, ${goal.experience}, ${goal.daysPerWeek} days/week, ${goal.commitmentDays || ((goal.weeks || 0) * 7)}-day plan.
Today's plan: ${session}
Recent feel scores: ${scores}
Recent run log:
${recent}
Respond: 1) Acknowledge specifically what they said. 2) One concrete action for tomorrow's session. 3) One brief motivational note. If missed: recovery plan not guilt. If done: validate then push slightly. If partial: focus on improvement.` },
    { role: 'user', content: `Status: ${status}\n\n${note}` },
  ], 220)
}

function normalizeInsight(insight) {
  if (!insight || typeof insight !== 'object') return null
  return {
    title: insight.title || 'Coach insight',
    summary: insight.summary || '',
    action: insight.action || '',
    tone: insight.tone || 'neutral',
    details: insight.details || null,
  }
}

async function getPostSessionInsight(goal, checkins, entries, status, note, todaySession) {
  if (!isRunningFitnessQuestion(note)) {
    return {
      title: 'Logged',
      summary: COACH_REFUSAL,
      action: 'Ask a running-specific question for coaching feedback.',
      tone: 'neutral',
      details: null,
    }
  }

  const recentFeel = entries.slice(0, 10).map(e => `${e.date}: Feel ${computeFeelScore(e.scores || {}).toFixed(1)}/10`).join('\n') || 'none'
  const recentRuns = [...checkins].slice(-8).reverse().map(c => `${c.date}: ${c.status}${c.distance ? `, ${c.distance} km` : ''}${c.duration ? `, ${c.duration} min` : ''}${c.effort ? `, RPE ${c.effort}` : ''}`).join('\n') || 'none'
  const session = todaySession ? `${todaySession.type} - ${todaySession.title}; ${todaySession.distance || ''}; ${todaySession.duration || ''}; pace ${todaySession.pace || 'not specified'}` : 'No planned session'

  const raw = await apiCall([
    { role: 'system', content: `You are a Strava-style running intelligence coach for this app. Return ONLY valid JSON.
Analyze the completed check-in against today's planned session and recent 30-day context.

JSON shape:
{
  "title": "short insight headline",
  "summary": "2 short sentences max: what went well and what the data suggests",
  "action": "one concrete change or recovery cue",
  "tone": "ready|steady|caution|neutral",
  "details": {
    "pacing": "pacing feedback or 'Not enough pace data yet'",
    "effort": "effort interpretation",
    "trainingLoad": "recent load pattern",
    "nextSession": "what to change next session"
  }
}

Be specific. Do not overpraise. If data is missing, say what would improve the insight next time. Keep it practical and under 120 words total.
Today's planned session: ${session}
Recent Feel:
${recentFeel}
Recent runs:
${recentRuns}` },
    { role: 'user', content: `Status: ${status}\n${note}` },
  ], 420)

  try {
    return normalizeInsight(extractJSON(raw))
  } catch {
    return {
      title: 'Coach read',
      summary: raw.slice(0, 280),
      action: 'Use this feedback to adjust the next session.',
      tone: 'neutral',
      details: null,
    }
  }
}

async function getChatReply(goal, checkins, entries, messages) {
  const scores    = entries.slice(0, 5).map(e => `${e.date}: ${computeFeelScore(e.scores || {}).toFixed(1)}/10`).join(', ') || 'none'
  const weekInfo  = goal.weekTemplate?.map(s => `${s.day}: ${s.type} ${s.distance || ''}`).join(' | ') || ''
  const recentLog = [...checkins].slice(-3).reverse().map(c => `${c.date}: ${c.status}`).join(', ') || 'none'

  const lastMsg     = messages[messages.length - 1]?.content?.toLowerCase() || ''
  if (!isRunningFitnessQuestion(lastMsg)) return COACH_REFUSAL

  const isPlanQuery = /(\d+[\s-]*day|week|schedule|plan|program|cross[\s-]?train|gym|workout|session|routine|what.*do|today|tomorrow)/i.test(lastMsg)
  const isPaceQuery = /(pace|split|time|how fast|seconds|secs|target|effort)/i.test(lastMsg)

  const profile = `Runner focus: ${goal.focus || goal.raceGoal} · ${goal.experience} · ${goal.daysPerWeek} days/week · ${goal.commitmentDays || ((goal.weeks || 0) * 7)}-day plan.
Weekly template: ${weekInfo}
Recent feel scores: ${scores}
Recent sessions: ${recentLog}`

  const OFF_TOPIC_RULE = `IMPORTANT — SCOPE RESTRICTION:
You ONLY answer questions about: running, fitness, training, exercise, nutrition for athletes, recovery, injury prevention, sleep for athletes, mental performance, and this user's program.
If the user asks about ANYTHING else (sports trivia, celebrities, news, general knowledge, coding, etc.), respond with exactly: "I'm your running coach — I can only help with training, fitness, and your program. What running question can I answer?"
Never break this rule regardless of how the question is phrased.`

  const eventRules = goal.raceGoal === '800m' ? `
800M COACHING RULES:
- For Beginner runners and early weeks, prefer easy running, drills, strides, and short relaxed 100m-200m reps before 300m/400m repeats.
- If the user asks for an 800m workout without a race time, give a safe beginner-friendly option first: warm-up, drills, 6-8 x 200m relaxed-fast with full recovery, cool-down.
- Do not prescribe 6 x 300m as a default 800m workout.
- Never say 300m should be run in 30 seconds. 30 seconds is a fast 200m split reference. A 300m split must be much slower than the runner's 200m split and should be based on current ability.
- If target time is known, convert it into rep targets: 200m split = 800m goal time / 4, 300m split = 800m goal time x 0.375, 400m split = 800m goal time / 2, then adjust slightly slower for early-season reps.
- If target time is unknown, give effort-based guidance and ask for a recent 400m/800m/1 mile time before exact splits.` : ''

  const systemPrompt = isPlanQuery
    ? `You are an expert running coach. When asked for a plan or schedule, give COMPLETE details for every single day — no summaries, no "similar to above".

${RUNNING_SCOPE_RULE}

${profile}
${eventRules}

FORMAT each training day exactly like this:
📅 [Day name] — [Session type]
• Distance/Duration: [e.g. 5 km / 30 min]
• Target speed: [for intervals, exact split target if goal/recent time is known; otherwise effort + what benchmark is needed]
• Warm-up (5 min): [list 3–4 specific dynamic exercises with reps, e.g. leg swings ×10, hip circles ×10, high knees 20 m ×2]
• Main set: [exactly what to do, how fast to run each rep, and the recovery]
• Cool-down: [2–3 specific stretches]

Session type rules:
- Running day → describe the run type (easy jog, tempo, intervals, long run) with effort cues
- Cross-training → pick ONE activity (cycling, swimming, yoga, rowing) and describe what to do for the full duration
- Gym / Strength → list 5–6 exercises with sets × reps (e.g. goblet squats 3×12, single-leg RDL 3×10 each, glute bridges 3×15, calf raises 3×20, plank 3×30 s, side-lying clams 3×15)
- Rest day → one optional recovery suggestion (foam roll, gentle walk, or full rest)

Easy and recovery days use effort levels. Track interval days must include target rep-speed guidance.
For Beginner week 1 plans, make the first week smooth and easy: no hard workouts, no race-effort reps, no volume spike.
Base distances on their current fitness, not race pace.`
    : `You are an expert running coach. Answer questions about running, fitness, training, and this user's program clearly and practically.

${RUNNING_SCOPE_RULE}

${profile}
${eventRules}
Program overview: ${goal.overview || 'N/A'}
${isPaceQuery ? 'If giving track splits, be realistic by rep distance. For 800m training, 30 seconds can describe a fast 200m, never a normal 300m target. If the runner gives an 800m goal time, calculate 200m = goal / 4, 300m = goal x 0.375, 400m = goal / 2, then adjust for workout purpose. If no goal/recent time exists, give effort-based guidance and ask for one benchmark before exact splits.' : ''}
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
