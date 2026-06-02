import { computeFeelScore } from './storage'

const MS_PER_DAY = 86400000
const HARD_TYPES = new Set(['hard', 'moderate', 'long', 'interval', 'tempo', 'speed'])

const STRUCTURAL_BACK_BANNER =
  'Prioritize core stability activation drills pre-run and execute the Soft Kiss silent landing test immediately on stepping out.'
const ASTHMA_BREATHE_OVERRIDE =
  "Maintain strict closed-mouth nasal breathing boundaries throughout today's entire cycle. If forced to mouth-breathe, de-escalate your speed immediately."
const PELVIC_RECOVERY_STRENGTH =
  'Pelvic Alignment & Spine Mobility routine: supine pelvic tilts 2x10, supported bridge 2x10 with breath, side-lying clamshells 2x12/side, cat-cow 2x8, thread-the-needle 5 breaths/side, child’s pose with diaphragmatic breathing 2 min.'
const PELVIC_RECOVERY_TITLE = 'Pelvic Alignment & Spine Mobility routine.'
const LOW_FEEL_ALERT =
  'Your internal sensors are reporting low energy today. We have adjusted your plan to keep your frame safe. Listen to your body.'
const LOW_FEEL_RUN_NOTE =
  'Gentle, silent 20-minute recovery walk focusing entirely on the Soft Kiss landing and slow nasal breathing.'

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
  const bleedingDuration = clampInt(profile.bleedingDuration, 1, 14)
  const legacyPeriodLength = clampInt(profile.periodLength, 1, 14)
  const periodLength = bleedingDuration || legacyPeriodLength || 0
  const explicitCycleLength = clampInt(profile.cycleLength, 15, 90) || 0
  const inferredCycleLength =
    lastPeriod && nextPeriod ? daysBetweenISO(lastPeriod, nextPeriod) : null
  const cycleLength = clampInt(inferredCycleLength, 15, 90) || explicitCycleLength || 28

  // Accept both the new vocabulary (regular / perimenopause / postmenopause)
  // and the legacy strings (no / perimenopause / menopause).
  const rawStatus = profile.menopausalStatus || profile.menopauseStatus || ''
  const menopauseStatus =
    rawStatus === 'postmenopause' ? 'menopause' :
    rawStatus === 'regular' ? 'no' :
    rawStatus

  return {
    lastPeriod,
    nextPeriod,
    periodLength: periodLength || 5,
    cycleLength,
    menopauseStatus,
    sex: (profile.sex === 'woman' || profile.gender === 'woman' || profile.gender === 'female') ? 'woman' : (profile.sex || profile.gender || ''),
  }
}

export function getCycleWindows(profile, startDate, totalDays = 91) {
  const cycle = normalizeCycleProfile(profile)
  if (cycle.sex !== 'woman') return []
  if (cycle.menopauseStatus === 'menopause') return []
  if (!cycle.lastPeriod && !cycle.nextPeriod) return []

  const planStart = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(planStart.getTime())) return []

  const planEnd = addDaysISO(startDate, totalDays - 1)

  // Perimenopause: cycles are irregular, so we never project periods on a fixed
  // monthly cadence. We only mark the single bleeding window the runner actually
  // logged (last period start + bleeding duration) when it overlaps the plan
  // range. The always-on perimenopause support is carried separately by
  // getCycleTrainingSignal, so training is never blanket-downgraded.
  if (cycle.menopauseStatus === 'perimenopause') {
    const periodStart = cycle.lastPeriod
    if (!periodStart) return []
    const periodEnd = addDaysISO(periodStart, cycle.periodLength - 1)
    if (periodEnd < startDate || periodStart > planEnd) return []
    return [{
      start: periodStart,
      end: periodEnd,
      reason: 'period phase',
      irregular: true,
      periodLength: cycle.periodLength,
    }]
  }

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
    // Irregular cycles: never blanket-downgrade. De-escalate only on days that
    // fall inside the bleeding window the runner actually logged; otherwise keep
    // a non-active awareness flag so normal training (incl. impact work) runs.
    const windows = getCycleWindows(cycle, date, 1)
    const active = windows.find(window => date >= window.start && date <= window.end)
    if (active) return { label: 'period phase', reason: 'period phase', active: true, window: active }
    return { label: 'perimenopause context', reason: 'perimenopause context', active: false }
  }
  if (cycle.menopauseStatus === 'menopause') {
    return { label: 'menopause context', reason: 'menopause context', active: true }
  }

  const windows = getCycleWindows(cycle, date, Math.max(1, cycle.cycleLength + cycle.periodLength))
  const active = windows.find(window => date >= window.start && date <= window.end)
  if (active) return { label: 'period phase', reason: 'period phase', active: true, window: active }
  return null
}

/**
 * Onboarding precompute. The instant a profile is submitted we derive the full
 * personalisation context, body-mass structural loading, the menstrual-cycle
 * calendar, health-history buffers, and the mental-stress buffer, in one pure,
 * synchronous pass. Persisting this on the profile means plan generation can
 * read a ready answer instead of ever showing the runner a "thinking" step.
 * For typical inputs this returns in well under a frame.
 */
export function buildAdaptationContext(profile = {}) {
  const startDate = todayISO()

  // Body-mass structural loading: heavier frames earn a gentler impact ceiling,
  // lighter frames a touch more headroom. Centred on ~75 kg, clamped both ways.
  const weight = Number(profile.weightKg)
  const structuralLoadFactor = Number.isFinite(weight) && weight > 0
    ? Math.max(0.8, Math.min(1.15, 75 / weight))
    : 1

  // Menstrual-cycle calendar: pre-resolve the upcoming period windows so the
  // plan can de-escalate those days without recomputing on every render.
  const cycle = normalizeCycleProfile(profile)
  const cycleWindows = getCycleWindows(profile, startDate, 91)

  // Health-history protective flags, the single source the plan layer reads.
  const structuralFlags = {
    lowerBackPain: Boolean(profile.lowerBackPain),
    kneePain: Boolean(profile.kneePain),
    anklePain: Boolean(profile.anklePain),
    plantarFasciaIssues: Boolean(profile.plantarFasciaIssues),
    asthma: Boolean(profile.asthma),
    hypertension: Boolean(profile.hypertension),
    diabetes: Boolean(profile.diabetes),
    pcos: Boolean(profile.pcos),
  }

  // Mental-stress buffer: a low emotional baseline trims weeks 1-3 volume so
  // the nervous system has space to stabilise. Mirrors the plan-time reducer.
  const baseline = Number(profile.mentalBaseline)
  const mentalStressBuffer = Number.isFinite(baseline) && baseline <= 4
    ? { active: true, scale: 0.85, weeks: [1, 2, 3], baseline }
    : { active: false }

  return {
    builtAt: new Date().toISOString(),
    startDate,
    structuralLoadFactor,
    cycle: { ...cycle, windows: cycleWindows },
    structuralFlags,
    mentalStressBuffer,
  }
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
    notes: `${LOW_FEEL_ALERT} (Feel ${feelScore.toFixed(1)}/10; ${reasonText}.) ${LOW_FEEL_RUN_NOTE}`,
    strength: 'Skip intensity today. Optional 6-8 min easy mobility only.',
    alertCard: LOW_FEEL_ALERT,
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

/**
 * Average score across the three primary subjective FEEL dimensions
 * called out by the framework: Sleep, Nutrition, Energy.
 */
export function computeSubjectiveFeelAverage(scores = {}) {
  const picks = ['sleep', 'nutrition', 'energy']
    .map(k => Number(scores[k]))
    .filter(Number.isFinite)
  if (!picks.length) return null
  return picks.reduce((a, b) => a + b, 0) / picks.length
}

/**
 * Structural-leak protective buffers from the onboarding profile:
 * - Lower back pain → mandatory banner on running blocks.
 * - Asthma / flagged cardiorespiratory markers → nasal-only breathing override.
 */
export function applyStructuralBuffers(session, profile = {}) {
  if (!session) return session
  const isRunning = session.type && session.type !== 'rest'
  let next = session

  const lowerBack = profile.lowerBackPain
    || (Array.isArray(profile.jointPain) && profile.jointPain.includes('Lower Back Pain'))
  if (lowerBack && isRunning) {
    next = {
      ...next,
      safetyBanner: STRUCTURAL_BACK_BANNER,
      notes: prependBanner(next.notes, STRUCTURAL_BACK_BANNER),
      structuralAdjustment: { ...(next.structuralAdjustment || {}), lowerBackPain: true },
    }
  }

  const asthma = profile.asthma
    || (Array.isArray(profile.conditions) && profile.conditions.includes('Asthma'))
  const cardiorespFlag = profile.cardiorespiratoryFlag || asthma
  if (cardiorespFlag) {
    next = {
      ...next,
      breathe: ASTHMA_BREATHE_OVERRIDE,
      structuralAdjustment: { ...(next.structuralAdjustment || {}), asthma: Boolean(asthma) },
    }
  }

  return next
}

/**
 * Cycle Sync override layer: if the runner logs cramping or cycle-related
 * fatigue at 6 or higher, swap heavy lower-body / core strength work for the
 * Pelvic Alignment & Spine Mobility recovery circuit.
 */
export function applyCycleMetricsAdjustment(session, cycleMetrics) {
  if (!session || !cycleMetrics) return session
  const cramp = Number(cycleMetrics.cramping) || 0
  const fatigue = Number(cycleMetrics.fatigue) || 0
  const bleeding = cycleMetrics.phase === 'bleeding'

  if (cramp < 6 && fatigue < 6 && !bleeding) return session

  const next = { ...session }
  if (cramp >= 6 || fatigue >= 6) {
    next.strengthTitle = PELVIC_RECOVERY_TITLE
    next.strength = PELVIC_RECOVERY_STRENGTH
    next.cycleMetricsAdjustment = {
      reason: cramp >= 6 ? 'high cramping' : 'high cycle fatigue',
      cramping: cramp,
      fatigue,
    }
  }
  if (bleeding) {
    next.cycleMetricsAdjustment = {
      ...(next.cycleMetricsAdjustment || {}),
      phase: 'bleeding',
    }
  }
  return next
}

/**
 * Mental-health stress buffer. If the onboarding baseline (0-10) was 4 or
 * below, reduce planned run volume by 15% during weeks 1-3 so the nervous
 * system has space to stabilise.
 */
export function applyMentalBaselineVolumeReduction(plan, profile = {}) {
  if (!Array.isArray(plan) || !plan.length) return plan
  const baseline = Number(profile.mentalBaseline)
  if (!Number.isFinite(baseline) || baseline > 4) return plan
  const SCALE = 0.85

  return plan.map(day => {
    const week = Number(day.week) || 1
    if (week > 3) return day
    if (!day.type || day.type === 'rest') return day
    if (day.mentalBaselineAdjustment) return day
    return {
      ...day,
      distance: scaleVolume(day.distance, SCALE, 'km'),
      duration: scaleVolume(day.duration, SCALE, 'min'),
      notes: appendNote(
        day.notes,
        'Volume reduced by 15% (weeks 1-3) to give your nervous system space to stabilise.',
      ),
      mentalBaselineAdjustment: { scale: SCALE, baseline, week },
    }
  })
}

function prependBanner(text, banner) {
  const body = (text || '').trim()
  return body ? `${banner}\n\n${body}` : banner
}

function appendNote(text, addition) {
  const body = (text || '').trim()
  return body ? `${body} ${addition}` : addition
}

function scaleVolume(value, scale, suffix) {
  const text = String(value || '').trim()
  if (!text || !Number.isFinite(scale) || scale <= 0) return text
  return text.replace(/(\d+(?:\.\d+)?)/g, match => {
    const n = Number(match)
    if (!Number.isFinite(n)) return match
    const scaled = n * scale
    if (suffix === 'km') return scaled < 5 ? scaled.toFixed(1).replace(/\.0$/, '') : Math.round(scaled).toString()
    if (suffix === 'min') return Math.round(scaled).toString()
    return Math.round(scaled).toString()
  })
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

export function applyTodayFeelOverrideToGoal(goal, scores, profile = null, options = {}) {
  if (!goal || !Array.isArray(goal.plan)) return null
  const date = todayISO()
  const feelScore = computeFeelScore(scores || {})
  const subjectiveAvg = computeSubjectiveFeelAverage(scores || {})
  const triggerScore = subjectiveAvg != null ? Math.min(subjectiveAvg, feelScore) : feelScore

  // 1. Cycle calendar layer (period window) applied to the whole plan.
  // 4. Mental-baseline volume reduction layer applied to weeks 1-3.
  let plan = applyCycleAdaptationToPlan(goal.plan, profile)
  plan = applyMentalBaselineVolumeReduction(plan, profile || {})

  const index = plan.findIndex(day => day.date === date)
  if (index < 0) return null

  const reasons = getFeelOverrideReasons(scores)
  const base = plan[index].feelAdjustment?.original || plan[index]

  // 1. Low-FEEL recovery override (uses avg of Sleep, Nutrition, Energy when
  //    available; falls back to the full Feel composite).
  let todaySession = triggerScore <= 7
    ? buildFeelOverrideSession(base, triggerScore, reasons)
    : adaptSessionForCycle(base, getCycleTrainingSignal(profile, date))

  // 2. Cycle Sync (today's journal phase + cramping/fatigue sliders).
  todaySession = applyCycleMetricsAdjustment(todaySession, options.cycleMetrics)

  // 3. Structural buffers (lower back, asthma) applied last so banners
  //    persist on top of any earlier override.
  todaySession = applyStructuralBuffers(todaySession, profile || {})

  const nextPlan = plan.map((day, i) => i === index ? todaySession : applyStructuralBuffers(day, profile || {}))
  const summary = triggerScore <= 7 ? LOW_FEEL_ALERT : null

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
