import { computeFeelScore } from './storage'

const MS_PER_DAY = 86400000
const HARD_TYPES = new Set(['hard', 'moderate', 'long', 'interval', 'tempo', 'speed'])

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function addDaysISO(startDate, offset) {
  const d = new Date(`${startDate}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

export function daysBetweenISO(from, to) {
  const a = new Date(`${from}T00:00:00`)
  const b = new Date(`${to}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  return Math.floor((b - a) / MS_PER_DAY)
}

export function normalizeCycleProfile(profile = {}) {
  const lastPeriod = profile.lastPeriod || ''
  const nextPeriod = profile.nextPeriod || ''
  const periodLength = clampInt(profile.periodLength, 1, 14) || 0
  const explicitCycleLength = clampInt(profile.cycleLength, 15, 90) || 0
  const inferredCycleLength =
    lastPeriod && nextPeriod ? daysBetweenISO(lastPeriod, nextPeriod) : null
  const cycleLength = clampInt(inferredCycleLength, 15, 90) || explicitCycleLength || 28

  return {
    lastPeriod,
    nextPeriod,
    periodLength: periodLength || 5,
    cycleLength,
    menopauseStatus: profile.menopauseStatus || '',
    sex: profile.sex || profile.gender || '',
  }
}

export function getCycleWindows(profile, startDate, totalDays = 91) {
  const cycle = normalizeCycleProfile(profile)
  if (cycle.sex !== 'woman') return []
  if (cycle.menopauseStatus === 'menopause') return []
  if (!cycle.lastPeriod && !cycle.nextPeriod) return []

  const planStart = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(planStart.getTime())) return []

  const windows = []
  let periodStart = cycle.lastPeriod || cycle.nextPeriod
  if (!periodStart) return windows

  let offsetToPlanStart = daysBetweenISO(periodStart, startDate)
  while (offsetToPlanStart !== null && offsetToPlanStart >= cycle.cycleLength) {
    periodStart = addDaysISO(periodStart, cycle.cycleLength)
    offsetToPlanStart = daysBetweenISO(periodStart, startDate)
  }
  while (offsetToPlanStart !== null && offsetToPlanStart <= -cycle.cycleLength) {
    periodStart = addDaysISO(periodStart, -cycle.cycleLength)
    offsetToPlanStart = daysBetweenISO(periodStart, startDate)
  }

  const planEnd = addDaysISO(startDate, totalDays - 1)
  while (periodStart <= planEnd) {
    const periodEnd = addDaysISO(periodStart, cycle.periodLength - 1)
    if (periodEnd >= startDate) {
      windows.push({
        start: periodStart,
        end: periodEnd,
        reason: 'period phase',
        cycleLength: cycle.cycleLength,
        periodLength: cycle.periodLength,
      })
    }
    periodStart = addDaysISO(periodStart, cycle.cycleLength)
  }

  return windows
}

export function getCycleTrainingSignal(profile, date = todayISO()) {
  const cycle = normalizeCycleProfile(profile)
  if (cycle.sex !== 'woman') return null
  if (cycle.menopauseStatus === 'perimenopause') {
    return { label: 'perimenopause context', reason: 'perimenopause context', active: true }
  }
  if (cycle.menopauseStatus === 'menopause') {
    return { label: 'menopause context', reason: 'menopause context', active: true }
  }

  const windows = getCycleWindows(cycle, date, Math.max(1, cycle.cycleLength + cycle.periodLength))
  const active = windows.find(window => date >= window.start && date <= window.end)
  if (active) return { label: 'period phase', reason: 'period phase', active: true, window: active }
  return null
}

export function adaptSessionForCycle(session, signal) {
  if (!session || !signal?.active) return session
  if (session.cycleAdjustment?.original) return session
  if (session.type === 'rest') {
    return {
      ...session,
      cycleFlag: true,
      notes: `${session.notes || 'Full rest or an easy walk.'} Cycle context is active: keep this genuinely restorative.`,
    }
  }
  return {
    ...session,
    type: 'easy',
    title: 'Low-Intensity Aerobic - Cycle adjusted',
    purpose: 'Deliberate de-escalation during the active period window.',
    distance: 'Reduce planned volume by 30-50%',
    duration: '20-35 min',
    pace: 'Soft, conversational, nasal-breathing effort only.',
    notes: 'Period window is active. Replace intervals, tempo, hills, long-run pressure, or pace targets with a gentle low-intensity run/walk. Focus on Soft Kiss landing, slow nasal breathing, and stopping before form degrades.',
    strength: 'Optional only: 8-10 min easy mobility and activation. No high-intensity strength.',
    cycleFlag: true,
    cycleAdjustment: {
      reason: signal.reason || signal.label || 'cycle context',
      original: session,
    },
  }
}

export function applyCycleAdaptationToPlan(plan, profile) {
  if (!Array.isArray(plan) || !plan.length) return plan
  const startDate = plan[0]?.date || todayISO()
  const windows = getCycleWindows(profile, startDate, plan.length)
  if (!windows.length) return plan

  return plan.map(day => {
    const window = windows.find(item => day.date >= item.start && day.date <= item.end)
    return window
      ? adaptSessionForCycle(day.cycleAdjustment?.original || day, { active: true, reason: window.reason, window })
      : day
  })
}

export function buildFeelOverrideSession(session, feelScore, reasons = []) {
  const base = session?.feelAdjustment?.original || session
  const reasonText = reasons.length ? reasons.join(', ') : 'low internal readiness'
  return {
    ...base,
    type: 'easy',
    title: 'Recovery Walk - Feel adjusted',
    purpose: 'Today-only override from your Feel check-in.',
    distance: '',
    duration: '20 min',
    pace: 'Very easy. Keep effort at 2-3/10.',
    notes: `Your internal sensors are reporting low energy today (${feelScore.toFixed(1)}/10; ${reasonText}). We have adjusted your plan to keep your frame safe. Take a gentle, silent 20-minute recovery walk focusing entirely on Soft Kiss landing and slow nasal breathing.`,
    strength: 'Skip intensity today. Optional 6-8 min easy mobility only.',
    feelAdjustment: {
      date: todayISO(),
      level: 'today-override',
      feelScore: Math.round(feelScore * 10) / 10,
      reasons,
      adjustedAt: new Date().toISOString(),
      original: base,
    },
  }
}

export function getFeelOverrideReasons(scores = {}) {
  return [
    scores.sleep <= 4 && 'low sleep',
    scores.energy <= 4 && 'low energy',
    scores.nutrition <= 4 && 'low nutrition',
    scores.movementJoy <= 4 && 'low walk/run joy',
    scores.jointFluidity <= 4 && 'joint stiffness',
    scores.digestiveComfort <= 4 && 'digestive discomfort',
    scores.personalStress <= 4 && 'high personal stress',
    scores.professionalStress <= 4 && 'high professional stress',
  ].filter(Boolean)
}

export function adaptSessionForFeel(session, entries, profile = null) {
  if (!session) return session
  const today = todayISO()
  const entry = (entries || []).find(e => e.date === today)
  if (!entry) return adaptSessionForCycle(session, getCycleTrainingSignal(profile, session.date || today))

  const feelScore = computeFeelScore(entry.scores || {})
  if (feelScore > 7) return adaptSessionForCycle(session, getCycleTrainingSignal(profile, session.date || today))
  const reasons = getFeelOverrideReasons(entry.scores || {})
  return buildFeelOverrideSession(session, feelScore, reasons)
}

export function applyTodayFeelOverrideToGoal(goal, scores, profile = null) {
  if (!goal || !Array.isArray(goal.plan)) return null
  const date = todayISO()
  const feelScore = computeFeelScore(scores || {})
  const plan = applyCycleAdaptationToPlan(goal.plan, profile)
  const index = plan.findIndex(day => day.date === date)
  if (index < 0) return null

  const reasons = getFeelOverrideReasons(scores)
  const base = plan[index].feelAdjustment?.original || plan[index]
  const nextToday = feelScore <= 7
    ? buildFeelOverrideSession(base, feelScore, reasons)
    : adaptSessionForCycle(base, getCycleTrainingSignal(profile, date))

  const nextPlan = plan.map((day, i) => i === index ? nextToday : day)
  const summary = feelScore <= 7
    ? 'Your internal sensors are reporting low energy today. We have adjusted your plan to keep your frame safe. Listen to your body.'
    : null

  return {
    goal: {
      ...goal,
      plan: nextPlan,
      lastFeelAdjustmentAt: new Date().toISOString(),
    },
    summary,
  }
}

function clampInt(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.max(min, Math.min(max, Math.round(n)))
}
