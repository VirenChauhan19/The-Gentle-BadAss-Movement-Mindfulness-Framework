import { useState, useEffect, useRef, useMemo } from 'react'
import { useData } from '../context/DataContext'
import PlanTabs from '../components/PlanTabs'
import { computeFeelScore } from '../data/storage'
import {
  adaptSessionForFeel as adaptSessionForFeelState,
  applyCycleAdaptationToPlan,
  getCycleTrainingSignal as getCycleSignal,
} from '../data/trainingAdaptation'
import styles from './Coach.module.css'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
// One week per generation call. Small chunks generate in parallel (fast) and
// stay well under the model's output limit (no truncated / invalid JSON).
const PLAN_CHUNK_SIZE = 7
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

const AUDIO_CUE_PROFILES = [
  {
    id: 'spoken',
    label: 'Spoken prompts',
    summary: 'Voice cues for run and walk transitions.',
  },
  {
    id: 'chimes',
    label: 'Distinct chimes',
    summary: 'Bright run tone, warm walk tone.',
  },
  {
    id: 'binaural',
    label: 'Binaural sounds',
    summary: 'Low background tone shifts with each phase.',
  },
]

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

function calculateGoalPace(distanceId, timeInput) {
  const option = BENCHMARK_OPTIONS.find(item => item.id === distanceId)
  const seconds = parseRaceTimeToSeconds(timeInput)
  if (!option || !seconds) return null
  const pacePerKm = seconds / option.km
  return {
    distance: option.label,
    distanceKm: option.km,
    targetTime: timeInput.trim(),
    targetPace: formatPace(pacePerKm),
    targetPaceSeconds: Math.round(pacePerKm),
    summary: `${option.label} target ${timeInput.trim()} (~${formatPace(pacePerKm)})`,
  }
}

function parseLoggedPaceSeconds(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return null
  const match = text.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  const mins = Number(match[1])
  const secs = Number(match[2])
  if (!Number.isFinite(mins) || !Number.isFinite(secs)) return null
  return mins * 60 + secs
}

function parseDistanceKm(distance) {
  const text = String(distance || '').trim().toLowerCase()
  if (!text) return null
  const intervalMatch = text.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(m|km)?/)
  if (intervalMatch) {
    const reps = Number(intervalMatch[1])
    const repDistance = Number(intervalMatch[2])
    const unit = intervalMatch[3] || 'm'
    const km = unit === 'km' ? reps * repDistance : (reps * repDistance) / 1000
    return Number.isFinite(km) ? km : null
  }
  const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*km/)
  if (kmMatch) return Number(kmMatch[1])
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*min/)
  if (minMatch) return null
  const lone = text.match(/(\d+(?:\.\d+)?)/)
  return lone ? Number(lone[1]) : null
}

function scaleNumericField(value, scale, suffix) {
  const text = String(value || '').trim()
  if (!text || !Number.isFinite(scale) || scale <= 0) return text
  return text.replace(/(\d+(?:\.\d+)?)/, (match) => {
    const n = Number(match)
    if (!Number.isFinite(n)) return match
    const scaled = n * scale
    if (suffix === 'km') return scaled < 5 ? scaled.toFixed(1).replace(/\.0$/, '') : Math.round(scaled).toString()
    if (suffix === 'min') return Math.round(scaled).toString()
    return Math.round(scaled).toString()
  })
}

function defaultWeekScale(week) {
  if (week <= 1) return 1
  const cyclePos = (week - 1) % 4
  const cycleIndex = Math.floor((week - 1) / 4)
  const baseGrowth = 1 + 0.08 * cycleIndex
  const offsets = [0, 0.06, 0.12, -0.18]
  return Math.max(0.6, Math.min(1.6, baseGrowth + offsets[cyclePos]))
}

function getWeeklyTarget(weeklyTargets, week) {
  if (!Array.isArray(weeklyTargets) || !weeklyTargets.length) return null
  return weeklyTargets.find(t => Number(t.week) === Number(week))
    || weeklyTargets[Math.min(week - 1, weeklyTargets.length - 1)]
    || null
}

function computeWeekScale(weeklyTargets, week) {
  const baseTarget = getWeeklyTarget(weeklyTargets, 1)
  const target = getWeeklyTarget(weeklyTargets, week)
  if (baseTarget?.totalKm && target?.totalKm) {
    const ratio = Number(target.totalKm) / Number(baseTarget.totalKm)
    if (Number.isFinite(ratio) && ratio > 0) return Math.max(0.5, Math.min(1.8, ratio))
  }
  return defaultWeekScale(week)
}

function isLongRunSession(session) {
  return session?.type === 'long'
}

function getRecentCheckinsWithin(checkins, days) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffISO = cutoff.toISOString().split('T')[0]
  return (checkins || []).filter(c => c.date && c.date >= cutoffISO)
}

function computeActuals(checkins) {
  const list = Array.isArray(checkins) ? checkins : []
  const last7 = getRecentCheckinsWithin(list, 7)
  const last28 = getRecentCheckinsWithin(list, 28)
  const sumKm = (arr) => arr.reduce((sum, c) => {
    const km = parseDistanceKm(c.distance)
    return sum + (Number.isFinite(km) ? km : 0)
  }, 0)
  const km7 = sumKm(last7)
  const km28 = sumKm(last28)
  const weeklyKm28 = last28.length ? km28 * (7 / 28) : 0

  const recentRuns = list.filter(c => c.status === 'done' || c.status === 'partial').slice(-10)
  const paceSamples = recentRuns
    .map(c => parseLoggedPaceSeconds(c.pace))
    .filter(Number.isFinite)
  const avgPaceSeconds = paceSamples.length ? paceSamples.reduce((a, b) => a + b, 0) / paceSamples.length : null
  const bestPaceSeconds = paceSamples.length ? Math.min(...paceSamples) : null

  const completed = list.filter(c => c.status === 'done').length
  const partial = list.filter(c => c.status === 'partial').length
  const missed = list.filter(c => c.status === 'missed').length
  const total = completed + partial + missed
  const completionRate = total ? (completed + partial * 0.5) / total : null

  const effortSamples = recentRuns.map(c => Number(c.effort)).filter(Number.isFinite)
  const avgEffort = effortSamples.length ? effortSamples.reduce((a, b) => a + b, 0) / effortSamples.length : null

  return {
    km7,
    km28,
    weeklyKm28,
    runsLast7: last7.length,
    runsLast28: last28.length,
    avgPaceSeconds,
    bestPaceSeconds,
    avgPace: avgPaceSeconds ? formatPace(avgPaceSeconds) : null,
    bestPace: bestPaceSeconds ? formatPace(bestPaceSeconds) : null,
    completionRate,
    avgEffort,
    totalLogged: total,
  }
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
  const weeklyTargets = goal?.weeklyTargets || []
  const startDate = goal.startDate || new Date().toISOString().split('T')[0]
  const totalDays = goal.commitmentDays || ((goal.weeks || 4) * 7)
  const storedPlan = normalizePlan(goal.plan, startDate, totalDays)
  if (storedPlan.length >= totalDays) return storedPlan
  const templatePlan = expandProgramPlan(template, startDate, totalDays, weeklyTargets)
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

function expandProgramPlan(template, startDate, totalDays, weeklyTargets) {
  if (!Array.isArray(template) || !template.length) return []
  return Array.from({ length: totalDays }, (_, i) => {
    const date = addDaysISO(startDate, i)
    const day = DAYS_FULL[new Date(`${date}T00:00:00`).getDay()]
    const session = template.find(s => s.day === day) || template[i % template.length] || {}
    const week = Math.floor(i / 7) + 1
    const scale = computeWeekScale(weeklyTargets, week)
    const target = getWeeklyTarget(weeklyTargets, week)
    const isRunning = session.type && session.type !== 'rest'
    const distanceField = isRunning ? scaleNumericField(session.distance, scale, 'km') : (session.distance || '')
    const durationField = isRunning ? scaleNumericField(session.duration, Math.min(scale, 1.4), 'min') : (session.duration || '')
    const focusNote = target?.qualityFocus
      ? ` Week ${week} focus: ${target.qualityFocus}.`
      : (week > 1 && isRunning ? ` Week ${week}: progressing on week 1 by about ${Math.round((scale - 1) * 100)}%.` : '')
    const composedNotes = session.notes
      ? `${session.notes}${focusNote}`
      : (isRunning ? `Week ${week} ${session.type || 'session'}.${focusNote}` : '')
    return {
      id: `day-${i + 1}`,
      dayNumber: i + 1,
      week,
      date,
      day,
      type: session.type || 'rest',
      title: session.title || 'Rest / Recovery',
      purpose: session.purpose || (target?.qualityFocus && (session.type === 'hard' || session.type === 'long') ? target.qualityFocus : ''),
      distance: distanceField,
      duration: durationField,
      pace: session.pace || '',
      notes: composedNotes,
      crossTraining: session.crossTraining || (session.type === 'cross' ? `${durationField || '30-45 min'} easy cycling, swimming, elliptical, rowing, or brisk incline walk at conversational effort.` : ''),
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
      purpose: item.purpose || '',
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

function getReadinessInsight(entries, todaySession, profile) {
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
    scores.movementJoy <= 4 && 'walk/run joy',
    scores.strengthJoy <= 4 && 'strength joy',
    scores.jointFluidity <= 4 && 'joint stiffness',
    scores.digestiveComfort <= 4 && 'digestive comfort',
    scores.personalStress <= 4 && 'personal stress',
    scores.professionalStress <= 4 && 'professional stress',
  ].filter(Boolean)
  const cycleSignal = getCycleSignal(profile)
  if (cycleSignal) lowSignals.push(cycleSignal.label)

  if (feel <= 7 && hardDay) {
    return {
      tone: 'caution',
      title: 'No high intensity today',
      summary: `Feel is ${feel.toFixed(1)}/10. High-intensity running and strength stay off the plan unless Feel is greater than 7/10.`,
      action: 'Switch to easy aerobic work, mobility, or recovery strength.',
    }
  }

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

function getCycleTrainingSignal(profile) {
  if (profile?.sex !== 'woman') return null
  const status = profile.menopauseStatus
  if (status === 'perimenopause') return { label: 'perimenopause context' }
  if (status === 'menopause') return { label: 'menopause context' }

  const lastPeriod = profile.lastPeriod
  const periodLength = Number(profile.periodLength) || 0
  const cycleLength = Number(profile.cycleLength) || 0
  if (!lastPeriod) return null
  const start = new Date(`${lastPeriod}T00:00:00`)
  if (Number.isNaN(start.getTime())) return null
  const today = new Date()
  const day = Math.floor((new Date(today.toISOString().split('T')[0]) - start) / 86400000) + 1
  if (periodLength && day >= 1 && day <= periodLength) return { label: 'period phase' }
  if (cycleLength && day >= cycleLength - 3 && day <= cycleLength + 1) return { label: 'late-cycle window' }
  return null
}

function getTodayFeel(entries) {
  const today = new Date().toISOString().split('T')[0]
  const entry = entries.find(e => e.date === today)
  return entry ? computeFeelScore(entry.scores || {}) : null
}

function adaptSessionForReadiness(session, entries) {
  if (!session) return session
  const feel = getTodayFeel(entries)
  const highIntensity = ['hard', 'moderate', 'long'].includes(session.type)
  if (feel === null || feel > 7 || !highIntensity) return session
  return {
    ...session,
    type: 'easy',
    title: 'Easy Aerobic - Feel adjusted',
    distance: 'Reduce planned volume by 20-40%',
    duration: '25-40 min',
    pace: 'Conversational only. No high intensity until Feel is 7/10 or higher.',
    strength: 'No high-intensity strength today. Use easy activation and mobility only.',
    notes: `Feel is ${feel.toFixed(1)}/10. Replace high-intensity running or strength with easy aerobic work until Feel crosses 7/10.`,
  }
}

function formatMenopauseStatus(status) {
  if (status === 'perimenopause') return 'Perimenopause'
  if (status === 'menopause') return 'Menopause'
  if (status === 'no') return 'No'
  if (status === 'unsure') return 'Not sure'
  return 'Not set'
}

function formatCycleSummary(profile) {
  const signal = getCycleTrainingSignal(profile)
  if (signal) return `Training is being read with ${signal.label}.`
  if (profile?.lastPeriod) return 'Running readiness uses your period details plus daily Feel.'
  return 'Add period details in Feel so the plan can adjust month to month.'
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

function CoachIntelligenceCard({ goal, actuals, weekTarget, weekIndex, totalWeeks, avgFeel, onRetune, retuning, retuneNotice }) {
  const goalPace = goal?.goalPace
  const observedKm = actuals?.weeklyKm28 ? Math.round(actuals.weeklyKm28) : null
  const storedKm = Number(String(goal?.currentKm || '').match(/[\d.]+/)?.[0]) || null
  const drift = observedKm && storedKm
    ? Math.round(((observedKm - storedKm) / storedKm) * 100)
    : null
  const showRetune = typeof onRetune === 'function' && actuals?.runsLast28 >= 3 && weekIndex < totalWeeks
  const targetKm = weekTarget?.totalKm
  const targetFocus = weekTarget?.qualityFocus || weekTarget?.intensityTier

  return (
    <div className={styles.paceGuideCard}>
      <div>
        <span>What the coach is using</span>
        <p>{goal?.focus || goal?.raceGoal || 'Running plan'}{goalPace ? ` · target ${goalPace.distance} ${goalPace.targetTime}` : ''}</p>
      </div>
      <div className={styles.paceGuideGrid}>
        <p>
          <strong>Goal pace</strong>
          {goalPace ? goalPace.targetPace : 'Set a target time on next setup'}
        </p>
        <p>
          <strong>Your weekly km</strong>
          {observedKm != null
            ? `${observedKm} km (last 28d)${storedKm && drift != null ? ` vs ${storedKm} stored${Math.abs(drift) >= 5 ? ` (${drift > 0 ? '+' : ''}${drift}%)` : ''}` : ''}`
            : 'Log a few runs and the coach will compute it'}
        </p>
        <p>
          <strong>Recent pace</strong>
          {actuals?.avgPace ? `${actuals.avgPace} avg${actuals.bestPace && actuals.bestPace !== actuals.avgPace ? `, best ${actuals.bestPace}` : ''}` : 'No pace data yet'}
        </p>
        <p>
          <strong>Recent feel</strong>
          {avgFeel ? `${avgFeel.toFixed(1)}/10` : 'Not enough Feel logs'}
        </p>
        <p>
          <strong>This week target</strong>
          {targetKm ? `${targetKm} km${targetFocus ? ` · ${targetFocus}` : ''}` : `Week ${weekIndex} of ${totalWeeks}`}
        </p>
        <p>
          <strong>Completion</strong>
          {actuals?.completionRate != null ? `${Math.round(actuals.completionRate * 100)}%` : 'New runner'}
        </p>
      </div>
      {showRetune && (
        <div style={{ display: 'grid', gap: 8 }}>
          <button
            className={styles.primaryBtn}
            onClick={onRetune}
            disabled={retuning}
            style={{ marginTop: 4 }}
          >
            {retuning ? 'Re-tuning…' : 'Re-tune the remaining weeks from my actual training'}
          </button>
          {retuneNotice && <p className={styles.progressionNote} style={{ margin: 0 }}>{retuneNotice}</p>}
        </div>
      )}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Coach({ embedded = false }) {
  const { coachData, saveCoachGoal, updateCoachGoal, saveCoachCheckin, clearCoachGoal, addChatMessage, entries, adminRemarks, profile } = useData()
  const [tab, setTab] = useState('program')
  const [retuning, setRetuning] = useState(false)
  const [retuneNotice, setRetuneNotice] = useState(null)
  const [expandingWeek, setExpandingWeek] = useState(false)
  const expandingWeekRef = useRef(false)

  const goal     = coachData?.goal        || null
  const checkins = coachData?.checkins    || []
  const chat     = coachData?.chatHistory || []

  const actuals = computeActuals(checkins)

  useEffect(() => {
    if (!goal || !updateCoachGoal) return
    if (actuals.runsLast28 < 4) return
    const observed = Math.round(actuals.weeklyKm28)
    if (observed <= 0) return
    const stored = Number(String(goal.currentKm || '').match(/[\d.]+/)?.[0]) || 0
    if (!stored) {
      updateCoachGoal({ ...goal, currentKm: `${observed} km/week`, observedWeeklyKm: observed })
      return
    }
    const drift = Math.abs(observed - stored) / Math.max(1, stored)
    if (drift > 0.2) {
      updateCoachGoal({ ...goal, currentKm: `${observed} km/week`, observedWeeklyKm: observed })
    }
  }, [actuals.runsLast28, actuals.weeklyKm28])

  // Background-generate remaining weeks one at a time after initial 2 are ready
  useEffect(() => {
    if (!goal || !updateCoachGoal) return
    const genWeeks = goal.generatedWeeks
    if (genWeeks === undefined || genWeeks === null) return
    const totalWeeks = Math.ceil((goal.commitmentDays || 90) / 7)
    if (genWeeks >= totalWeeks) return
    if (expandingWeekRef.current) return

    expandingWeekRef.current = true
    setExpandingWeek(true)
    const nextWeekNum = genWeeks + 1

    generateSingleWeek({ goal, weekNum: nextWeekNum })
      .then(rawDays => {
        const dayOffset = (nextWeekNum - 1) * 7
        const newDays = (rawDays || []).map((d, i) => {
          const date = addDaysISO(goal.startDate, dayOffset + i)
          return {
            id: `day-${dayOffset + i + 1}`,
            dayNumber: dayOffset + i + 1,
            week: nextWeekNum,
            date,
            day: DAYS_FULL[new Date(`${date}T00:00:00`).getDay()],
            type: d.type || 'rest',
            title: d.title || 'Rest / Recovery',
            purpose: d.purpose || '',
            distance: d.distance || '',
            duration: d.duration || '',
            pace: d.pace || '',
            notes: d.notes || '',
            crossTraining: d.crossTraining || (d.type === 'cross' ? `${d.duration || '30-45 min'} easy cycling, swimming, elliptical, rowing, or brisk incline walk at conversational effort.` : ''),
            strength: d.strength || DEFAULT_STRENGTH,
            mobility: d.mobility || DEFAULT_MOBILITY,
          }
        })
        const existing = goal.plan || []
        const merged = [
          ...existing.filter(d => (d.dayNumber || 0) <= dayOffset),
          ...newDays,
        ].sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))
        updateCoachGoal({ ...goal, plan: merged, generatedWeeks: nextWeekNum })
      })
      .catch(err => console.warn('Auto-expand week failed:', err))
      .finally(() => {
        expandingWeekRef.current = false
        setExpandingWeek(false)
      })
  }, [goal?.generatedWeeks, goal?.startDate])

  if (!goal) {
    return (
      <>
        {!embedded && <PlanTabs active="coach" />}
        <GoalSetup onSave={saveCoachGoal} profile={profile} defaultCommitment={profile?.commitment || 30} embedded={embedded} />
      </>
    )
  }

  const today      = new Date().toISOString().split('T')[0]
  const now        = new Date()
  const startDate  = new Date(goal.startDate)
  const plan       = applyCycleAdaptationToPlan(getPlan(goal), profile)
  const totalDays  = goal.commitmentDays || plan.length || ((goal.weeks || 12) * 7)
  const dayNum     = Math.floor((now - startDate) / 86400000) + 1
  const remaining  = Math.max(0, totalDays - dayNum + 1)
  const progress   = Math.min(1, (dayNum - 1) / totalDays)
  const isComplete = dayNum > totalDays
  const weekNum    = Math.ceil(dayNum / 7)

  const todayDayName = DAYS_FULL[now.getDay()]
  const rawTodaySession = plan.find(s => s.date === today) || goal.weekTemplate?.find(s => s.day === todayDayName)
  const todaySession = adaptSessionForFeelState(rawTodaySession, entries, profile)
  const todayCheckin = checkins.find(c => c.date === today)

  async function handleRetune() {
    if (retuning || !updateCoachGoal) return
    setRetuning(true)
    setRetuneNotice(null)
    try {
      const remainingDays = Math.max(7, totalDays - dayNum + 1)
      const observedKm = Math.max(1, Math.round(actuals.weeklyKm28 || Number(String(goal.currentKm || '').match(/[\d.]+/)?.[0]) || 30))
      const recentCheckins = [...checkins].slice(-8).reverse()
      const checkinSummary = recentCheckins.map(c => {
        const parts = [c.date, c.status]
        if (c.distance) parts.push(`${c.distance}km`)
        if (c.pace) parts.push(c.pace)
        if (c.effort) parts.push(`RPE${c.effort}`)
        return parts.join(' ')
      }).join(' · ') || 'no recent runs logged'
      const recentFeel = entries.slice(0, 5).map(e => `${e.date}: ${computeFeelScore(e.scores || {}).toFixed(1)}/10`).join(', ') || 'none'
      const prefix = `RE-TUNING from week ${weekNum} of ${Math.ceil(totalDays / 7)}. Recent actual avg: ${observedKm} km/week. ${actuals.avgPace ? `Recent avg pace: ${actuals.avgPace}.` : ''} Recent runs: ${checkinSummary}. Recent feel scores: ${recentFeel}. Build a fresh ${remainingDays}-day continuation that respects what the runner is actually doing.`

      const retuneTotalWeeks = Math.ceil(remainingDays / 7)
      const program = await generateProgram({
        focus: goal.focus || goal.raceGoal,
        experience: goal.experience,
        daysPerWeek: goal.daysPerWeek,
        currentKm: `${observedKm} km/week`,
        weeks: retuneTotalWeeks,
        commitmentDays: remainingDays,
        notes: goal.notes || '',
        paceGuide: goal.paceGuide,
        goalPace: goal.goalPace,
        prefix,
        initialWeeks: retuneTotalWeeks,
        onProgress: (update) => {
          if (update.status === 'active' && update.label) setRetuneNotice(update.label + '…')
          else if (update.status === 'done' && update.key === 'macro') setRetuneNotice('Macrocycle ready, writing weeks…')
        },
      })
      const newStart = today
      const fresh = normalizePlan(program.plan, newStart, remainingDays)
      const weeklyTargets = Array.isArray(program.weeklyTargets) ? program.weeklyTargets : []
      const expanded = expandProgramPlan(program.weekTemplate || [], newStart, remainingDays, weeklyTargets)
      const continuation = Array.from({ length: remainingDays }, (_, i) =>
        fresh[i] || expanded[i] || null
      ).filter(Boolean)

      const past = (goal.plan || []).filter(p => p.date && p.date < today)
      const merged = [
        ...past,
        ...continuation.map((day, i) => ({
          ...day,
          dayNumber: past.length + i + 1,
          week: Math.floor((past.length + i) / 7) + 1,
        })),
      ]

      updateCoachGoal({
        ...goal,
        currentKm: `${observedKm} km/week`,
        observedWeeklyKm: observedKm,
        plan: merged,
        weekTemplate: program.weekTemplate || goal.weekTemplate,
        weeklyTargets: weeklyTargets.length ? weeklyTargets : goal.weeklyTargets,
        progressionNote: program.progressionNote || goal.progressionNote,
        peakWeeklyVolume: program.peakWeeklyVolume || goal.peakWeeklyVolume,
        generatedWeeks: Math.ceil(merged.length / 7),
        lastRetunedAt: new Date().toISOString(),
      })
      setRetuneNotice('Plan re-tuned from your recent training data.')
    } catch (err) {
      setRetuneNotice(`Re-tune failed: ${err.message}`)
    }
    setRetuning(false)
  }

  return (
    <div className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
      {!embedded && <PlanTabs active="coach" />}
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
            actuals={actuals} onRetune={handleRetune} retuning={retuning} retuneNotice={retuneNotice}
            isComplete={isComplete} onCheckin={saveCoachCheckin} onNewGoal={clearCoachGoal}
            adminRemarks={adminRemarks}
            profile={profile}
            expandingWeek={expandingWeek}
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

function GeneratingPlan({ commitmentDays, focus, experience, daysPerWeek, currentKm, benchmarkDistance, benchmarkTime, goalPace, paceGuide, progressStages = [], initialWeeks = 2 }) {
  const totalWeeks = Math.ceil(commitmentDays / 7)
  const generateUpToDays = Math.min(initialWeeks * 7, commitmentDays)
  const expectedChunks = Math.max(1, Math.ceil(generateUpToDays / PLAN_CHUNK_SIZE))
  const totalStages = 1 + expectedChunks
  const [elapsed, setElapsed] = useState(0)
  const [thoughtIndex, setThoughtIndex] = useState(0)
  // Chunks run in parallel, so wall time ≈ macrocycle + slowest week, not the
  // sum. Estimate grows slowly with chunk count to stay honest.
  const expectedSeconds = Math.max(25, Math.min(120, 18 + expectedChunks * 6))

  const renderedStages = (() => {
    const out = []
    const macroStage = progressStages.find(s => s.key === 'macro')
    out.push({
      key: 'macro',
      label: macroStage?.label || `Designing the ${totalWeeks}-week macrocycle blueprint`,
      status: macroStage?.status || (progressStages.length === 0 ? 'active' : 'pending'),
    })
    for (let i = 1; i <= expectedChunks; i++) {
      const stage = progressStages.find(s => s.key === `chunk-${i}`)
      const weeksPerChunk = Math.max(1, Math.round(PLAN_CHUNK_SIZE / 7))
      const startWeek = (i - 1) * weeksPerChunk + 1
      const endWeek = Math.min(totalWeeks, i * weeksPerChunk)
      out.push({
        key: `chunk-${i}`,
        label: stage?.label || `Writing weeks ${startWeek}-${endWeek} workouts`,
        status: stage?.status || 'pending',
      })
    }
    return out
  })()

  const activeStage = renderedStages.find(s => s.status === 'active') || renderedStages[0]
  const thoughtsForStage = (() => {
    if (activeStage.key === 'macro') {
      return [
        `Sketching the ${totalWeeks}-week arc: base → build → peak${commitmentDays >= 56 ? ' → taper' : ''}`,
        `Placing recovery weeks every 3-4 weeks`,
        currentKm ? `Anchoring week 1 at ${currentKm} so there's no spike` : `Anchoring week 1 to your current volume`,
        goalPace ? `Calibrating threshold pace from your ${goalPace.targetTime} ${goalPace.distance} target` : `Calibrating effort zones from your benchmark`,
        `Distributing quality focus: aerobic strides → threshold → race-pace → sharpening`,
        `Setting peak weekly volume`,
      ]
    }
    const chunkNum = Number(activeStage.key.replace('chunk-', '')) || 1
    const startWeek = (chunkNum - 1) * 4 + 1
    const endWeek = Math.min(totalWeeks, chunkNum * 4)
    return [
      `Picking the workout menu for week ${startWeek}: ${chunkNum === 1 ? 'easy aerobic + strides' : 'rotating from prior weeks'}`,
      `Choosing long-run distance for week ${startWeek}`,
      `Setting concrete pace ranges, not vague RPE`,
      goalPace ? `Folding ${goalPace.targetPace} race-pace cruise into week ${Math.min(endWeek, startWeek + 1)}` : `Slotting tempo blocks into the build`,
      `Naming warm-up drills with reps`,
      `Pairing lighter strength on hard run days`,
      `Cross-checking: hard days never adjacent to long run`,
      `Writing day-by-day notes for week ${startWeek} through ${endWeek}`,
    ]
  })()

  useEffect(() => {
    const start = Date.now()
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - start) / 100) / 10), 200)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    setThoughtIndex(0)
    const t = setInterval(() => {
      setThoughtIndex(i => (i + 1) % thoughtsForStage.length)
    }, 2400)
    return () => clearInterval(t)
  }, [activeStage.key])

  const stagesDone = progressStages.filter(s => s.status === 'done').length
  const progress = Math.min(0.96, Math.max(elapsed / expectedSeconds, stagesDone / Math.max(1, totalStages)))

  const inputs = [
    focus && { label: 'Focus', value: focus },
    experience && { label: 'Level', value: experience },
    daysPerWeek && { label: 'Days/week', value: `${daysPerWeek}` },
    currentKm && { label: 'Current', value: currentKm },
    goalPace && { label: 'Goal', value: `${goalPace.distance} · ${goalPace.targetTime}` },
    goalPace && { label: 'Race pace', value: goalPace.targetPace },
    !goalPace && benchmarkDistance && benchmarkTime && { label: 'Benchmark', value: `${benchmarkDistance} ${benchmarkTime}` },
    !goalPace && paceGuide && { label: 'Zone 2', value: paceGuide.zone2 },
    { label: 'Plan length', value: `${commitmentDays} days` },
  ].filter(Boolean)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Running</p>
        <h1 className={styles.title}>Building Your Plan</h1>
        <p className={styles.subtitle}>Macrocycle + {expectedChunks} mesocycle{expectedChunks > 1 ? 's' : ''} for your {commitmentDays}-day {focus || 'running'} program</p>
      </header>
      <div className={styles.genCard}>
        <div className={styles.genRunnerWrap}>
          <svg className={styles.genRunner} width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="38" cy="12" r="4.5" />
            <path d="M22 26 L34 22 L42 30 L50 30" />
            <path d="M34 22 L36 38 L30 50" />
            <path d="M36 38 L46 44" />
            <path d="M30 50 L24 56" />
            <path d="M46 44 L52 50" />
          </svg>
          <div className={styles.genRunnerTrail}>
            <span /><span /><span />
          </div>
        </div>

        <div className={styles.genProgress}>
          <div className={styles.genProgressFill} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className={styles.genElapsed}>{elapsed.toFixed(1)}s · about {expectedSeconds}s expected · {stagesDone}/{totalStages} stages</p>

        <div className={styles.genThinkingBox}>
          <div className={styles.genThinkingDots}><span /><span /><span /></div>
          <p key={`${activeStage.key}-${thoughtIndex}`} className={styles.genThought}>
            {thoughtsForStage[thoughtIndex]}
          </p>
        </div>

        <div className={styles.genInputsBlock}>
          <span className={styles.genSectionLabel}>What the coach is reading</span>
          <div className={styles.genInputs}>
            {inputs.map((item, i) => (
              <div key={item.label} className={styles.genChip} style={{ animationDelay: `${i * 0.08}s` }}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.genStagesBlock}>
          <span className={styles.genSectionLabel}>Building your program</span>
          <ul className={styles.genStages}>
            {renderedStages.map(s => {
              const status = s.status
              return (
                <li key={s.key} className={`${styles.genStage} ${status === 'done' ? styles.genStageDone : ''} ${status === 'active' ? styles.genStageActive : ''}`}>
                  <span className={styles.genStageIcon}>
                    {status === 'done' ? '✓' : status === 'active' ? <span className={styles.genSpinner} /> : status === 'error' ? '!' : ''}
                  </span>
                  <span className={styles.genStageLabel}>{s.label}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

function defaultGoalDistanceFor(focus) {
  if (!focus) return ''
  if (focus === '5K Race') return '5K'
  if (focus === '10K Race') return '10K'
  if (focus === 'Half Marathon') return 'Half Marathon'
  if (focus === 'Ultra' || /marathon/i.test(focus)) return 'Marathon'
  return ''
}

function GoalSetup({ onSave, profile, defaultCommitment = 30, embedded = false }) {
  const [step,        setStep]        = useState(1)
  const [focus,       setFocus]       = useState('')
  const [experience,  setExperience]  = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [currentKm,   setCurrentKm]   = useState('')
  const [benchmarkDistance, setBenchmarkDistance] = useState('')
  const [benchmarkTime, setBenchmarkTime] = useState('')
  const [goalDistance, setGoalDistance] = useState('')
  const [goalTime, setGoalTime] = useState('')
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [progressStages, setProgressStages] = useState([])
  const [error,       setError]       = useState(null)

  function handleProgress(update) {
    setProgressStages(prev => {
      const idx = prev.findIndex(s => s.key === update.key)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], ...update }
        return next
      }
      return [...prev, update]
    })
  }

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  // Every plan is a fixed 90-day program; we never ask the runner for a length.
  const commitmentDays = 90
  const profilePath = profile?.path || 'not set'
  const profileStory = profile?.fitnessHistory || ''
  const paceGuide = calculatePaceGuide(benchmarkDistance, benchmarkTime)
  const goalPace = calculateGoalPace(goalDistance, goalTime)
  const shouldAskBenchmark = experience !== 'Beginner' || /race|marathon|ultra|speed/i.test(focus || '')
  const isRaceFocus = /race|marathon|ultra|speed/i.test(focus || '')

  useEffect(() => {
    if (isRaceFocus && !goalDistance) {
      const suggested = defaultGoalDistanceFor(focus)
      if (suggested) setGoalDistance(suggested)
    }
  }, [focus, isRaceFocus, goalDistance])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const totalDays = commitmentDays
    const weeksNum = Math.max(1, Math.ceil(totalDays / 7))
    const kmStr    = currentKm ? `${currentKm} km/week` : '20–40 km/week'
    const profileNotes = [
      profileStory ? `Onboarding fitness history: ${profileStory}` : null,
      profilePath && profilePath !== 'not set' ? `Onboarding path: ${profilePath}` : null,
      profile?.sex ? `Sex: ${profile.sex}` : null,
      profile?.sex === 'woman' && profile.lastPeriod ? `Last period: ${profile.lastPeriod}` : null,
      profile?.sex === 'woman' && profile.periodLength ? `Period length: ${profile.periodLength} days` : null,
      profile?.sex === 'woman' && profile.cycleLength ? `Cycle length: ${profile.cycleLength} days` : null,
      profile?.sex === 'woman' && profile.menopauseStatus ? `Perimenopause/menopause: ${formatMenopauseStatus(profile.menopauseStatus)}` : null,
      profile?.sex === 'woman' ? 'For women, avoid forcing high intensity when Feel or cycle context suggests lower readiness. Include adaptable notes for period/perimenopause/menopause changes.' : null,
      notes ? `Runner notes: ${notes}` : null,
    ].filter(Boolean).join('\n')
    try {
      setProgressStages([])
      const startDate = new Date().toISOString().split('T')[0]
      const program = await generateProgram({ focus, experience, daysPerWeek, currentKm: kmStr, weeks: weeksNum, commitmentDays: totalDays, notes: profileNotes, paceGuide, goalPace, onProgress: handleProgress, initialWeeks: 2 })
      const plan = normalizePlan(program.plan, startDate, totalDays)
      const weeklyTargets = Array.isArray(program.weeklyTargets) ? program.weeklyTargets : []
      const templatePlan = expandProgramPlan(program.weekTemplate || [], startDate, totalDays, weeklyTargets)
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
      const adaptivePlan = applyCycleAdaptationToPlan(fallbackPlan, profile)
      onSave({
        focus, raceGoal: focus, experience, daysPerWeek, currentKm: kmStr, weeks: weeksNum, commitmentDays: totalDays,
        startDate,
        benchmark: benchmarkDistance && benchmarkTime ? { distance: benchmarkDistance, time: benchmarkTime } : null,
        goalTarget: goalPace ? { distance: goalDistance, time: goalTime } : null,
        goalPace,
        paceGuide,
        overview:         program.overview,
        weekTemplate:     program.weekTemplate || [],
        weeklyTargets,
        plan:             adaptivePlan,
        progressionNote:  program.progressionNote,
        peakWeeklyVolume: program.peakWeeklyVolume,
        generatedWeeks:   2,
      })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (!apiKey) {
    return (
      <div className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
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
      <GeneratingPlan
        commitmentDays={commitmentDays}
        focus={focus}
        experience={experience}
        daysPerWeek={daysPerWeek}
        currentKm={currentKm}
        benchmarkDistance={benchmarkDistance}
        benchmarkTime={benchmarkTime}
        goalPace={goalPace}
        paceGuide={paceGuide}
        progressStages={progressStages}
        initialWeeks={2}
      />
    )
  }

  return (
    <div className={`${styles.wizard} ${embedded ? styles.embeddedWizard : ''}`}>
      {/* Header */}
      <div className={styles.wizardTop}>
        <p className={styles.wizardStepLabel}>Step {step} of {TOTAL_STEPS}</p>
        <h1 className={styles.wizardTitle}>{STEP_TITLES[step - 1]}</h1>
        <p className={styles.wizardSub}>{STEP_SUBS[step - 1]}</p>
        <div className={styles.commitmentRibbon}>
          <span>{commitmentDays}</span>
          <small>day program</small>
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
              {isRaceFocus && (
                <div className={styles.benchmarkCard}>
                  <div>
                    <p className={styles.benchmarkTitle}>Target performance</p>
                    <p className={styles.benchmarkText}>What time are you chasing? The coach builds every workout backwards from this.</p>
                  </div>
                  <div className={styles.benchmarkGrid}>
                    <select
                      className={styles.selectInput}
                      value={goalDistance}
                      onChange={e => setGoalDistance(e.target.value)}
                    >
                      <option value="">Distance</option>
                      {BENCHMARK_OPTIONS.map(option => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                    <input
                      className={styles.numberInput}
                      value={goalTime}
                      onChange={e => setGoalTime(e.target.value)}
                      placeholder="Goal time e.g. 15:59"
                    />
                  </div>
                  {goalPace && (
                    <div className={styles.pacePreview}>
                      <span>Target pace</span>
                      <div className={styles.pacePreviewGrid}>
                        <p><strong>{goalPace.distance}</strong>{goalPace.targetTime}</p>
                        <p><strong>Race pace</strong>{goalPace.targetPace}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
function ProgramTab({ goal, plan = [], todaySession, todayCheckin, checkins, entries, dayNum, actuals, onRetune, retuning, retuneNotice, isComplete, onCheckin, onNewGoal, adminRemarks = [], profile, expandingWeek = false }) {
  const visiblePlan = plan.length ? plan : getPlan(goal)
  const currentDay = Math.max(1, dayNum)
  const currentWeek = Math.max(1, Math.ceil(currentDay / 7))
  const totalWeeks = Math.max(1, Math.ceil(visiblePlan.length / 7))
  const [weekIndex, setWeekIndex] = useState(currentWeek)
  const [selectedDay, setSelectedDay] = useState(null)
  const weekStartDay = (weekIndex - 1) * 7 + 1
  const weekEndDay   = weekIndex * 7
  const nextWeekPlan = visiblePlan
    .filter(s => {
      const dn = s.dayNumber || 0
      return dn >= weekStartDay && dn <= weekEndDay
    })
    .map(s => s.date === todaySession?.date ? todaySession : s)
  const nextSessions = nextWeekPlan
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
  const readinessInsight = getReadinessInsight(entries, todaySession, profile)
  const trendInsight = getTrendInsight(entries, checkins)
  const fallbackActuals = actuals || computeActuals(checkins)
  const recentFeelEntries = entries
    .filter(e => e?.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5)
  const recentFeelScores = recentFeelEntries.map(e => computeFeelScore(e?.scores || {})).filter(n => Number.isFinite(n))
  const avgRecentFeel = recentFeelScores.length ? recentFeelScores.reduce((a, b) => a + b, 0) / recentFeelScores.length : null

  // Days for the visible week
  const weekDays = nextWeekPlan
  const weekStart = weekDays[0]?.date
  const weekEnd = weekDays[weekDays.length - 1]?.date
  const weekKm = weekDays.reduce((sum, d) => {
    const km = parseDistanceKm(d.distance)
    return sum + (Number.isFinite(km) ? km : 0)
  }, 0)
  const weekTarget = getWeeklyTarget(goal?.weeklyTargets, weekIndex)
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
        <CoachIntelligenceCard
          goal={goal}
          actuals={fallbackActuals}
          weekTarget={weekTarget}
          weekIndex={weekIndex}
          totalWeeks={totalWeeks}
          avgFeel={avgRecentFeel}
          onRetune={onRetune}
          retuning={retuning}
          retuneNotice={retuneNotice}
        />
        {profile?.sex === 'woman' && (
          <div className={styles.paceGuideCard}>
            <div>
              <span>Monthly context</span>
              <p>{formatCycleSummary(profile)}</p>
            </div>
            <div className={styles.paceGuideGrid}>
              <p><strong>Last period</strong>{profile.lastPeriod || 'Not set'}</p>
              <p><strong>Period length</strong>{profile.periodLength ? `${profile.periodLength} days` : 'Not set'}</p>
              <p><strong>Cycle length</strong>{profile.cycleLength ? `${profile.cycleLength} days` : 'Not set'}</p>
              <p><strong>Stage</strong>{formatMenopauseStatus(profile.menopauseStatus)}</p>
            </div>
          </div>
        )}
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
            <AdaptationBanners session={todaySession} />
            <div className={styles.todayMetrics}>
              <span>{todaySession.distance || 'No distance'}</span>
              <span>{todaySession.duration || 'Open duration'}</span>
              <span>Day {todaySession.dayNumber || currentDay}</span>
            </div>
            {todaySession.purpose && <p className={styles.todayPurpose}>Why: {todaySession.purpose}</p>}
            {todaySession.pace && <p className={styles.todayPace}>{todaySession.pace}</p>}
            {todaySession.notes && <p className={styles.todayNotes}>{todaySession.notes}</p>}
            <DailyTrainingBlocks session={todaySession} />
            {todaySession.type !== 'rest' && (
              <RunCuePlayer session={todaySession} week={currentWeek} />
            )}
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
        <div className={styles.adminPlanNotice}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          <p>Your coach actively reviews and updates this plan. Check back regularly, your schedule may be adjusted based on your progress.</p>
        </div>
      )}

      {expandingWeek && (() => {
        const genW = goal.generatedWeeks || 0
        const totalW = Math.ceil((goal.commitmentDays || 90) / 7)
        return (
          <div className={styles.buildingNotice}>
            <div className={styles.buildingDot} />
            <p>Building your full plan in the background, week {genW} of {totalW} ready. Keep training, more weeks are on the way.</p>
          </div>
        )
      })()}

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
                <p className={styles.weekRange}>{formatDateShort(weekStart)} to {formatDateShort(weekEnd)}</p>
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
              <span>{weekKm > 0 ? weekKm.toFixed(1) : '-'}</span>
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
                {selectedDay.purpose && <p className={styles.dayDetailPurpose}>Why: {selectedDay.purpose}</p>}
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

function RunCuePlayer({ session, week }) {
  const intervals = useMemo(() => buildRunIntervals(session), [session])
  const [profile, setProfile] = useState(() => localStorage.getItem('gb_run_audio_profile') || 'spoken')
  const [running, setRunning] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(intervals[0]?.seconds || 0)
  const audioRef = useRef({ ctx: null, carrier: null, carrierGain: null, binaural: [], transient: null })
  const timerRef = useRef(null)
  const phaseStartedRef = useRef(0)
  const phaseIndexRef = useRef(0)

  useEffect(() => {
    setRunning(false)
    setPhaseIndex(0)
    phaseIndexRef.current = 0
    setSecondsLeft(intervals[0]?.seconds || 0)
    stopRunAudio(audioRef)
  }, [intervals])

  useEffect(() => {
    localStorage.setItem('gb_run_audio_profile', profile)
    if (running) configureBinaural(audioRef, profile, intervals[phaseIndexRef.current])
  }, [profile, running, intervals])

  useEffect(() => {
    if (!running) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
      return
    }

    timerRef.current = window.setInterval(() => {
      const current = intervals[phaseIndexRef.current] || intervals[0]
      if (!current) return
      const elapsed = Math.floor((performance.now() - phaseStartedRef.current) / 1000)
      const remaining = current.seconds - elapsed
      if (remaining > 0) {
        setSecondsLeft(remaining)
        return
      }

      const nextIndex = (phaseIndexRef.current + 1) % intervals.length
      const next = intervals[nextIndex]
      phaseIndexRef.current = nextIndex
      phaseStartedRef.current = performance.now()
      setPhaseIndex(nextIndex)
      setSecondsLeft(next.seconds)
      triggerRunCue(audioRef, profile, next)
      updateRunMediaSession(session, next, week)
    }, 250)

    return () => window.clearInterval(timerRef.current)
  }, [running, intervals, profile, session, week])

  useEffect(() => () => stopRunAudio(audioRef), [])

  const currentPhase = intervals[phaseIndex] || intervals[0]

  async function startWorkout() {
    if (!currentPhase) return
    await ensureRunAudio(audioRef, profile, currentPhase)
    phaseStartedRef.current = performance.now() - ((currentPhase.seconds - secondsLeft) * 1000)
    setRunning(true)
    triggerRunCue(audioRef, profile, currentPhase)
    updateRunMediaSession(session, currentPhase, week)
  }

  function pauseWorkout() {
    setRunning(false)
    audioRef.current.ctx?.suspend?.()
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused'
  }

  function resetWorkout() {
    setRunning(false)
    phaseIndexRef.current = 0
    setPhaseIndex(0)
    setSecondsLeft(intervals[0]?.seconds || 0)
    stopRunAudio(audioRef)
  }

  return (
    <div className={styles.audioCueCard}>
      <div className={styles.audioCueHeader}>
        <div>
          <span>Audio guidance</span>
          <strong>{currentPhase?.label || 'Workout cues'}</strong>
        </div>
        <p>{formatTime(secondsLeft)}</p>
      </div>

      <div className={styles.audioProfileGrid} aria-label="Audio cue profiles">
        {AUDIO_CUE_PROFILES.map(item => (
          <button
            key={item.id}
            type="button"
            className={profile === item.id ? styles.audioProfileActive : ''}
            onClick={() => setProfile(item.id)}
            disabled={running}
          >
            <strong>{item.label}</strong>
            <span>{item.summary}</span>
          </button>
        ))}
      </div>

      <div className={styles.audioCueControls}>
        <button type="button" onClick={running ? pauseWorkout : startWorkout}>
          {running ? 'Pause cues' : 'Start workout'}
        </button>
        <button type="button" onClick={resetWorkout}>Reset</button>
      </div>
    </div>
  )
}

function buildRunIntervals(session) {
  const text = [session?.title, session?.duration, session?.notes].filter(Boolean).join(' ').toLowerCase()
  const explicit = text.match(/(\d+)\s*(?:min|minute)s?\s*(?:run|jog)[^\d]{0,40}(\d+)\s*(?:min|minute)s?\s*walk/)
    || text.match(/run\s*(\d+)\s*(?:min|minute)s?[^\d]{0,40}walk\s*(\d+)\s*(?:min|minute)s?/)
  const runMinutes = explicit ? Number(explicit[1]) : 2
  const walkMinutes = explicit ? Number(explicit[2]) : 1
  return [
    {
      id: 'run',
      label: 'Run',
      seconds: Math.max(30, runMinutes * 60),
      spoken: 'Time to run. Focus on your Soft Kiss landing and silent feet.',
    },
    {
      id: 'walk',
      label: 'Walk',
      seconds: Math.max(30, walkMinutes * 60),
      spoken: 'Walk. Recover the engine. Bring the breath back to a Slow Cycle.',
    },
  ]
}

async function ensureRunAudio(audioRef, profile, phase) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return
  let ctx = audioRef.current.ctx
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContextCtor()
    audioRef.current.ctx = ctx
  }
  if (ctx.state === 'suspended') await ctx.resume()
  if (!audioRef.current.carrier) {
    const carrier = ctx.createOscillator()
    const gain = ctx.createGain()
    carrier.type = 'sine'
    carrier.frequency.value = 120
    gain.gain.value = 0.0025
    carrier.connect(gain).connect(ctx.destination)
    carrier.start()
    audioRef.current.carrier = carrier
    audioRef.current.carrierGain = gain
  }
  configureBinaural(audioRef, profile, phase)
}

function configureBinaural(audioRef, profile, phase) {
  const ctx = audioRef.current.ctx
  if (!ctx) return
  audioRef.current.binaural.forEach(node => {
    try { node.stop?.() } catch {}
    try { node.disconnect?.() } catch {}
  })
  audioRef.current.binaural = []
  if (profile !== 'binaural') return

  const base = phase?.id === 'run' ? 180 : 140
  const offset = phase?.id === 'run' ? 14 : 7
  ;[-1, 1].forEach((panValue, index) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const pan = ctx.createStereoPanner?.()
    osc.type = 'sine'
    osc.frequency.value = base + (index === 1 ? offset : 0)
    gain.gain.value = 0.01
    if (pan) {
      pan.pan.value = panValue
      osc.connect(gain).connect(pan).connect(ctx.destination)
    } else {
      osc.connect(gain).connect(ctx.destination)
    }
    osc.start()
    audioRef.current.binaural.push(osc, gain, pan)
  })
}

function triggerRunCue(audioRef, profile, phase) {
  if (profile === 'spoken') {
    speakRunCue(phase.spoken)
    return
  }
  playRunTone(audioRef, phase, profile)
}

function speakRunCue(text) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.92
  utterance.pitch = 0.95
  utterance.volume = 0.9
  window.speechSynthesis.speak(utterance)
}

function playRunTone(audioRef, phase, profile) {
  const ctx = audioRef.current.ctx
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const isRun = phase?.id === 'run'
  osc.type = profile === 'binaural' ? 'triangle' : 'sine'
  osc.frequency.setValueAtTime(isRun ? 880 : 392, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(isRun ? 0.18 : 0.12, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (isRun ? 0.42 : 0.72))
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + (isRun ? 0.46 : 0.76))
  audioRef.current.transient = osc

  if (isRun && profile !== 'single') {
    window.setTimeout(() => playRunTone(audioRef, { id: 'run' }, 'single'), 190)
  }
}

function stopRunAudio(audioRef) {
  window.clearInterval(audioRef.current.timer)
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  ;[audioRef.current.carrier, ...audioRef.current.binaural, audioRef.current.transient].forEach(node => {
    try { node?.stop?.() } catch {}
    try { node?.disconnect?.() } catch {}
  })
  try { audioRef.current.ctx?.close?.() } catch {}
  audioRef.current = { ctx: null, carrier: null, carrierGain: null, binaural: [], transient: null }
  if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none'
}

function updateRunMediaSession(session, phase, week) {
  if (!navigator.mediaSession || !window.MediaMetadata) return
  navigator.mediaSession.metadata = new MediaMetadata({
    title: `Current Phase: ${phase?.label?.toUpperCase() || 'RUN'}`,
    artist: 'Run & Bee Trimester',
    album: `Week ${week} Workout`,
  })
  navigator.mediaSession.playbackState = 'playing'
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.round(seconds || 0))
  const mins = Math.floor(safe / 60)
  const secs = String(safe % 60).padStart(2, '0')
  return `${mins}:${secs}`
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

function AdaptationBanners({ session }) {
  if (!session) return null
  const banners = [
    session.alertCard && { tone: 'feel', label: 'Today only', text: session.alertCard },
    session.safetyBanner && { tone: 'safety', label: 'Structural buffer', text: session.safetyBanner },
    session.breathe && { tone: 'breathe', label: 'Breathing override', text: session.breathe },
  ].filter(Boolean)
  if (!banners.length) return null
  return (
    <div className={styles.adaptationBanners}>
      {banners.map(b => (
        <div key={b.tone} className={styles.adaptationBanner} data-tone={b.tone}>
          <span className={styles.adaptationBannerLabel}>{b.label}</span>
          <p>{b.text}</p>
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
async function apiCall(messages, maxTokens = 600, temperature = 0.75) {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!key) throw new Error('OpenRouter API key not configured')
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'anthropic/claude-sonnet-4.5'

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'La Ultra Run & Bee',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    if (res.status === 429) throw new Error('Rate limit reached, wait 30 seconds and try again.')
    throw new Error(e.error?.message || `OpenRouter error ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

function buildSharedCoachingRules({ focus, experience, daysPerWeek, currentKm, paceGuide, goalPace }) {
  const restDays     = 7 - daysPerWeek
  const hardSessions = daysPerWeek >= 5 ? 2 : 1
  const easySessions = Math.max(0, daysPerWeek - hardSessions - 1)
  const raceGoal = focus
  const isTrackEvent = ['800m', '1500m', '3K'].includes(raceGoal)
  const isCompetitive = experience === 'Competitive' || experience === 'Advanced'

  const trackRules = isTrackEvent ? `
TRACK EVENT RULES (${raceGoal}):
- Hard sessions MUST use actual track interval notation such as "6 x 200m", "4 x 400m", "3 x 600m", "4 x 800m".
- Always include recovery, such as "with 90s standing recovery" or "with 200m jog recovery".
- Tempo runs: 1-3 km blocks at comfortably hard effort, not race pace.
- Easy runs can be 20-30 min; shorter is fine for speed recovery.
- For ${raceGoal}: speciality sessions should target controlled race-specific effort only after the runner has built tolerance.
- Distance field for track sessions: use interval notation, not km.` : ''

  const workoutRules = `
HARD WORKOUT QUALITY RULES:
- Every hard workout MUST be a real coach-prescribed session, not a generic "interval day".
- If the runner's daily Feel score is below 7/10, high-intensity running and high-intensity strength must be replaced with easy aerobic work, mobility, or light activation until Feel is 7/10 or higher.
- Pick one purpose per workout from: speed mechanics, speed endurance, aerobic power, threshold/lactate, race rhythm, hills, fartlek, progression, controlled time trial.
- The "purpose" field MUST state that intent in plain English (e.g. "Lactate threshold tolerance", "Race-pace specificity", "Top-end speed mechanics").
- Match the menu to the runner's level, Beginner: relaxed strides, short reps, hills, fartlek; Intermediate: one focused workout/wk; Advanced/Competitive: event-specific reps, threshold support, race-rhythm work.
- Vary the menu across weeks: hill repeats, fartlek, progression runs, threshold blocks, race-pace cruise intervals, broken-tempo, time-trial, never repeat the same menu twice in a 4-week block.
- Every running day's "pace" must be CONCRETE (a min/km range or rep split), not just "easy", only fall back to RPE if no benchmark is available.
- Rep speed must match rep distance. Recovery duration matches the rep purpose (full walk on speed, jog on threshold).`

  const paceRules = isCompetitive
    ? `PACING (Competitive/Advanced allowed relative pace refs):
- Easy: "Conversational, full sentences"
- Tempo: "Comfortably hard, 20-30 min sustainable"
- Intervals: "Race effort, controlled and sharp"
- Long: "Easy conversational, 60-90 s/km slower than tempo"
- MAY reference "10K race effort", "5K pace", "slightly faster than half marathon pace"`
    : `PACING (effort + numbers preferred, never just RPE if a benchmark exists):
- Easy: "Conversational pace, full sentences"
- Moderate: "Comfortably hard, short phrases"
- Hard: "Strong effort, controlled aggression"
- Long: "Easy conversational, prioritise time on feet"`

  const benchmarkPaceRules = paceGuide ? `
BENCHMARK-BASED PACE GUIDE:
- The user provided this benchmark: ${paceGuide.benchmark}.
- Estimated current 5K pace: ${paceGuide.estimated5kPace}.
- Recovery runs: ${paceGuide.recovery}.
- Zone 2 / easy runs: ${paceGuide.zone2}.
- Long runs: ${paceGuide.long}.
- Steady aerobic: ${paceGuide.steady}.
- Tempo / threshold: ${paceGuide.tempo}.
- Intervals: ${paceGuide.intervals}.
- Every running day MUST include the correct calculated pace range in the "pace" field. Do not replace it with vague effort only.
- Still include feel cues next to the pace.` : `
BENCHMARK-BASED PACE GUIDE:
- No benchmark, use effort-based guidance with numerical RPE cues (RPE 5-6/10 etc.).`

  const goalPaceRules = goalPace ? `
GOAL TIME (the runner is chasing this):
- Target: ${goalPace.distance} in ${goalPace.targetTime} (race pace ~${goalPace.targetPace}).
- Build everything backwards from this target.
- Tempo/threshold = race pace + 15-25 s/km.
- Race-pace work = at or near ${goalPace.targetPace}, in chunks (4-6x1km, 3x2km, 6x800m at race pace).
- VO2/intervals = race pace - 5-10 s/km, full recovery, only after base.
- Final 1-2 weeks = taper.` : ''

  return {
    raceGoal, isTrackEvent, isCompetitive,
    daysPerWeek, restDays, hardSessions, easySessions,
    trackRules, workoutRules, paceRules, benchmarkPaceRules, goalPaceRules,
  }
}

async function generateMacrocycle({ focus, experience, daysPerWeek, currentKm, commitmentDays, notes, paceGuide, goalPace, prefix }) {
  const totalWeeks = Math.max(1, Math.ceil(commitmentDays / 7))
  const r = buildSharedCoachingRules({ focus, experience, daysPerWeek, currentKm, paceGuide, goalPace })

  const system = `You are an expert running coach designing the MACROCYCLE blueprint for a ${commitmentDays}-day program. Return ONLY valid JSON.

JSON shape:
{
  "overview": "2-3 sentences of program philosophy. Name the goal time if one exists.",
  "weeklyTargets": [
    { "week": 1, "totalKm": 30, "longRunKm": 8, "qualityFocus": "what the hard session emphasises this week", "intensityTier": "base|build|peak|taper", "phaseGoal": "one-line week intent" }
  ],
  "weekTemplate": [
    { "day": "Monday", "type": "easy|moderate|hard|long|rest|cross", "title": "session theme", "distance": "", "duration": "", "pace": "", "notes": "" }
  ],
  "progressionNote": "How volume and intensity build across the program. Name peak week and recovery weeks.",
  "peakWeeklyVolume": "XX km"
}

MACROCYCLE STRUCTURE RULES:
- Return EXACTLY ${totalWeeks} entries in weeklyTargets, one per week (week 1 through week ${totalWeeks}).
- Periodise into phases: base → build → peak → taper. The intensityTier field must reflect the phase.
- Recovery week every 3-4 weeks: drop totalKm by 15-25%.
- Long-run distance grows in the build phase, drops in recovery weeks and the taper.
- qualityFocus must EVOLVE: early weeks = strides + aerobic; mid weeks = threshold + tempo blocks; late weeks = race-pace specificity; final 1-2 weeks = taper / sharpening.
- weekTemplate is just the 7-day skeleton (which days are run/long/quality/rest/cross). Distances/durations there can be empty, the daily plan is generated separately.
- Base everything on current volume: ${currentKm}. Week 1 totalKm should be at or slightly below ${currentKm}.

Focus: ${r.raceGoal} · Level: ${experience} · ${daysPerWeek} training days · ${r.restDays} rest days
${r.goalPaceRules}
${r.benchmarkPaceRules}
${r.trackRules}`

  const goalLine = goalPace ? ` Goal: ${goalPace.distance} in ${goalPace.targetTime} (race pace ~${goalPace.targetPace}).` : ''
  const prefixLine = prefix ? ` ${prefix}` : ''

  const userMsg = `Design my ${totalWeeks}-week macrocycle for a ${commitmentDays}-day ${r.raceGoal} program. I'm ${experience}, currently doing ${currentKm}, training ${daysPerWeek} days/week.${goalLine}${prefixLine}${notes ? ` Notes: ${notes}` : ''}`

  // Two attempts, second uses a stricter extraction prompt
  for (let attempt = 1; attempt <= 2; attempt++) {
    const messages = attempt === 1
      ? [{ role: 'system', content: system }, { role: 'user', content: userMsg }]
      : [{ role: 'system', content: 'Return ONLY the raw JSON object, no markdown, no extra text.' }, { role: 'user', content: userMsg }]
    const raw = await apiCall(messages, 3500, 0.35)
    try { return extractJSON(raw) } catch (e) {
      if (attempt === 2) throw e
    }
  }
}

async function generateMesocycleChunk({ focus, experience, daysPerWeek, currentKm, notes, paceGuide, goalPace, macro, chunkStart, chunkEnd, chunkTargets, priorTitles }) {
  const r = buildSharedCoachingRules({ focus, experience, daysPerWeek, currentKm, paceGuide, goalPace })
  const chunkDays = chunkEnd - chunkStart + 1
  const startWeek = Math.ceil(chunkStart / 7)
  const endWeek = Math.ceil(chunkEnd / 7)

  const targetsBlock = (chunkTargets || []).map(t =>
    `Week ${t.week}: ${t.totalKm || '?'} km · long run ${t.longRunKm || '?'} km · ${t.intensityTier || 'base'} · focus: ${t.qualityFocus || 'general aerobic'}${t.phaseGoal ? ` (${t.phaseGoal})` : ''}`
  ).join('\n') || 'No specific targets, apply default progression.'

  const priorBlock = priorTitles
    ? `\nPRIOR WORKOUTS (do NOT repeat these, vary the menu):\n${priorTitles}`
    : ''

  const system = `You are an expert running coach writing the daily plan for days ${chunkStart}-${chunkEnd} (weeks ${startWeek}-${endWeek}) of a longer program. Return ONLY valid JSON.

JSON shape:
{
  "plan": [
    {
      "dayNumber": ${chunkStart},
      "week": ${startWeek},
      "type": "easy|moderate|hard|long|rest|cross",
      "title": "Specific session title that names the workout (e.g. '6 x 800m at threshold', 'Hill repeats, 8 x 60s', 'Progression long run')",
      "purpose": "One short sentence: why this workout exists in the plan (e.g. 'Lactate threshold tolerance to support race pace')",
      "distance": "6 km  OR  6 x 400m  OR  45 min",
      "duration": "35-40 min",
      "pace": "Concrete numerical pace range with feel cue (e.g. '5:30-5:45/km, comfortably hard')",
      "notes": "Warm-up: [4 named drills with reps]. Main set: [exact workout, rep splits, recovery]. Cool-down: [2-3 named stretches].",
      "crossTraining": "Cross days only: modality + duration + intensity. Empty otherwise.",
      "strength": "8-20 min: 3-6 movements with sets x reps. Lighter on hard run days.",
      "mobility": "8-15 min: named drills with reps/duration."
    }
  ]
}

THIS CHUNK COVERS:
${targetsBlock}

PROGRAM CONTEXT (DO NOT VIOLATE):
- Overview: ${macro?.overview || 'Build sustainable running fitness.'}
- Macrocycle progression: ${macro?.progressionNote || 'Standard progressive overload with recovery weeks.'}
- Peak target: ${macro?.peakWeeklyVolume || 'TBD'}
- Plan focus: ${r.raceGoal} · Level: ${experience} · ${daysPerWeek} training days/week, ${r.restDays} rest days
- ${r.hardSessions} hard/quality session(s) per week, never adjacent to the long run
- 1 long run on Saturday or Sunday
- ${r.easySessions} easy run(s) at truly conversational effort
${priorBlock}

CHUNK RULES:
- Output EXACTLY ${chunkDays} plan entries, one per day, dayNumber ${chunkStart} through ${chunkEnd}.
- Each week's running distances must roughly add to that week's totalKm (±15%).
- Each week's quality session must reflect its qualityFocus from the targets above.
- Hard workout MENUS must vary across these weeks AND must not repeat the prior workouts listed above. Rotate among: hill repeats, fartlek, progression, threshold cruise, race-pace cruise, broken tempo, time trial, long-run-with-finish.
- Every non-rest day must have title, purpose, distance, duration, pace, notes (warm-up + main + cool-down), strength, mobility.
- Rest days still need strength (light) and mobility fields populated.

${r.goalPaceRules}
${r.benchmarkPaceRules}
${r.paceRules}
${r.workoutRules}
${r.trackRules}`

  // ~520 tokens/day covers the full per-day schema (warm-up/main/cool-down +
  // strength + mobility) with headroom so the JSON is never cut off.
  const tokenBudget = Math.min(5000, Math.max(2400, chunkDays * 520))
  const userMsg = `Write days ${chunkStart}-${chunkEnd} as instructed. Make every workout feel like a real coach wrote it.`

  for (let attempt = 1; attempt <= 2; attempt++) {
    const messages = attempt === 1
      ? [{ role: 'system', content: system }, { role: 'user', content: userMsg }]
      : [{ role: 'system', content: 'Return ONLY the raw JSON object with a "plan" array. No markdown, no extra text.' }, { role: 'user', content: userMsg }]
    const raw = await apiCall(messages, tokenBudget, 0.35)
    try {
      const parsed = extractJSON(raw)
      return Array.isArray(parsed?.plan) ? parsed.plan : []
    } catch (e) {
      if (attempt === 2) throw e
    }
  }
}

// ── Generate a single week (used for auto-expansion and admin) ────────────────
export async function generateSingleWeek({ goal, weekNum }) {
  const chunkStart  = (weekNum - 1) * 7 + 1
  const chunkEnd    = Math.min(weekNum * 7, goal.commitmentDays || 9999)
  const chunkTargets = (goal.weeklyTargets || []).filter(w => Number(w.week) === weekNum)
  const priorTitles  = (goal.plan || []).slice(-14)
    .map(d => `D${d.dayNumber} ${d.type}: ${d.title}`).join(' · ')
  const macro = {
    overview:          goal.overview          || '',
    progressionNote:   goal.progressionNote   || '',
    peakWeeklyVolume:  goal.peakWeeklyVolume  || '',
    weeklyTargets:     goal.weeklyTargets     || [],
    weekTemplate:      goal.weekTemplate      || [],
  }
  return generateMesocycleChunk({
    focus:        goal.focus || goal.raceGoal,
    experience:   goal.experience,
    daysPerWeek:  goal.daysPerWeek,
    currentKm:    goal.currentKm || '30 km/week',
    notes:        '',
    paceGuide:    goal.paceGuide  || null,
    goalPace:     goal.goalPace   || null,
    macro,
    chunkStart, chunkEnd, chunkTargets, priorTitles,
  })
}

async function generateProgram({ focus, experience, daysPerWeek, currentKm, weeks, commitmentDays, notes, paceGuide, goalPace, prefix, onProgress, initialWeeks = 2 }) {
  const totalWeeks = Math.max(1, Math.ceil((commitmentDays || (weeks * 7)) / 7))
  const generateUpToDay = Math.min(initialWeeks * 7, commitmentDays)

  onProgress?.({ key: 'macro', label: `Designing the ${totalWeeks}-week macrocycle blueprint`, status: 'active' })
  const macro = await generateMacrocycle({ focus, experience, daysPerWeek, currentKm, commitmentDays, notes, paceGuide, goalPace, prefix })
  onProgress?.({ key: 'macro', status: 'done' })

  // Build the list of chunks upfront, then generate all in parallel.
  // One week per chunk → small, fast, parallel calls that never truncate.
  const chunkSize = PLAN_CHUNK_SIZE
  const chunks = []
  let cursor = 1
  let chunkNum = 0
  while (cursor <= generateUpToDay) {
    chunkNum++
    const chunkEnd = Math.min(cursor + chunkSize - 1, commitmentDays)
    const startWeek = Math.ceil(cursor / 7)
    const endWeek = Math.ceil(chunkEnd / 7)
    const chunkTargets = (macro.weeklyTargets || []).filter(w => w.week >= startWeek && w.week <= endWeek)
    chunks.push({ chunkNum, chunkStart: cursor, chunkEnd, chunkTargets, startWeek, endWeek })
    cursor = chunkEnd + 1
  }

  // Kick off all chunk generations in parallel for speed
  chunks.forEach(c => {
    onProgress?.({ key: `chunk-${c.chunkNum}`, label: `Writing weeks ${c.startWeek}-${c.endWeek} workouts`, status: 'active' })
  })

  const chunkResults = await Promise.all(
    chunks.map(async c => {
      try {
        const days = await generateMesocycleChunk({
          focus, experience, daysPerWeek, currentKm, notes,
          paceGuide, goalPace, macro,
          chunkStart: c.chunkStart, chunkEnd: c.chunkEnd,
          chunkTargets: c.chunkTargets, priorTitles: '',
        })
        onProgress?.({ key: `chunk-${c.chunkNum}`, status: 'done' })
        return { chunkNum: c.chunkNum, days }
      } catch (err) {
        onProgress?.({ key: `chunk-${c.chunkNum}`, status: 'error', label: `Weeks ${c.startWeek}-${c.endWeek} failed: ${err.message}` })
        throw err
      }
    })
  )

  const allDays = chunkResults
    .sort((a, b) => a.chunkNum - b.chunkNum)
    .flatMap(r => r.days)

  return {
    overview: macro.overview,
    weeklyTargets: macro.weeklyTargets,
    weekTemplate: macro.weekTemplate,
    progressionNote: macro.progressionNote,
    peakWeeklyVolume: macro.peakWeeklyVolume,
    plan: allDays,
  }
}

async function getCheckinReply(goal, checkins, entries, status, note, todaySession) {
  if (!isRunningFitnessQuestion(note)) return COACH_REFUSAL

  const scores  = entries.slice(0, 5).map(e => `${e.date}: ${computeFeelScore(e.scores || {}).toFixed(1)}/10`).join(', ') || 'none'
  const recent  = [...checkins].slice(-5).reverse().map(c => `${c.date}: ${c.status}, ${c.userNote}`).join('\n') || 'none'
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

  const OFF_TOPIC_RULE = `IMPORTANT, SCOPE RESTRICTION:
You ONLY answer questions about: running, fitness, training, exercise, nutrition for athletes, recovery, injury prevention, sleep for athletes, mental performance, and this user's program.
If the user asks about ANYTHING else (sports trivia, celebrities, news, general knowledge, coding, etc.), respond with exactly: "I'm your running coach, I can only help with training, fitness, and your program. What running question can I answer?"
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
    ? `You are an expert running coach. When asked for a plan or schedule, give COMPLETE details for every single day, no summaries, no "similar to above". Never use em dashes in your writing; use commas, colons, or periods instead.

${RUNNING_SCOPE_RULE}

${profile}
${eventRules}

FORMAT each training day exactly like this:
📅 [Day name], [Session type]
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
  if (!text) throw new Error('Empty response from AI. Please try generating again.')
  // Direct parse
  try { return JSON.parse(text.trim()) } catch {}
  // Fenced code block ``` or ```json
  const block = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (block) { try { return JSON.parse(block[1]) } catch {} }
  // Largest {...} or [...] span in the text
  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) { try { return JSON.parse(objMatch[0]) } catch {} }
  const arrMatch = text.match(/\[[\s\S]*\]/)
  if (arrMatch) { try { return JSON.parse(arrMatch[0]) } catch {} }
  // Last-ditch: strip any leading prose before the first { or [
  const stripped = text.replace(/^[\s\S]*?(?=\{|\[)/, '')
  try { return JSON.parse(stripped) } catch {}
  // Salvage a response that was cut off by the token limit: rebuild from the
  // last complete day entry and re-close the JSON so the week is still usable.
  const repaired = repairTruncatedJSON(stripped)
  if (repaired) { try { return JSON.parse(repaired) } catch {} }
  throw new Error('Could not read program from AI, the response was not valid JSON. Please try again.')
}

// Repairs JSON truncated mid-array (e.g. a "plan": [ ... cut off here).
// Trims back to the last balanced array element and closes open braces.
function repairTruncatedJSON(text) {
  if (!text || (!text.includes('"plan"') && !text.trimStart().startsWith('['))) return null
  const lastClose = text.lastIndexOf('}')
  if (lastClose === -1) return null
  let head = text.slice(0, lastClose + 1)
  // Count unclosed [ and { from the start of the kept text.
  let inStr = false, esc = false, braces = 0, brackets = 0
  for (const ch of head) {
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') inStr = !inStr
    if (inStr) continue
    if (ch === '{') braces++
    else if (ch === '}') braces--
    else if (ch === '[') brackets++
    else if (ch === ']') brackets--
  }
  head += ']'.repeat(Math.max(0, brackets)) + '}'.repeat(Math.max(0, braces))
  return head
}
