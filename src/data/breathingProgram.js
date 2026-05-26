// Gentle Badass, Breathing Curriculum
// A strict, dictated 13-week (3-month) progression. The user does not select.
// Each week unlocks once the previous week has logged SESSIONS_PER_WEEK sessions.
//
// Schema:
//   phase: "1".."5", groups weeks by training intent
//   title: display name
//   focus: one-line teaching cue
//   inhale: seconds of active inhale
//   holdFull: seconds held with full lungs (omitted for sigh weeks)
//   exhale: seconds of active exhale
//   holdEmpty: seconds held with empty lungs (omitted for sigh weeks)
//   type: "sigh" for double-inhale weeks (adds microInhale field)
//   microInhale: seconds of sharp top-up sip (sigh weeks only)
//   duration: target session length in seconds

export const SESSIONS_PER_WEEK = 5
export const TOTAL_WEEKS = 13

export const phaseInfo = {
  '1': {
    label: 'Phase 1',
    title: 'Awareness & De-escalation',
    description: 'Diaphragm first. Slowing the cadence. Leaning into the parasympathetic by extending the exhale.',
  },
  '2': {
    label: 'Phase 2',
    title: 'CO2 Adaptation & Tactical Down-Regulation',
    description: 'Sitting comfortably with CO2. Pulling the brake on demand with the sigh protocol.',
  },
  '3': {
    label: 'Phase 3',
    title: 'Autonomic Agility & Deep Control',
    description: 'Slow, low respiratory rates. Advanced suspension. The 1:2 ratio without strain.',
  },
  '4': {
    label: 'Phase 4',
    title: 'Refined Mastery',
    description: 'Deepening Phase 3 patterns at slower rates and longer ratios. Sub-five breaths per minute.',
  },
  '5': {
    label: 'Phase 5',
    title: 'Embodied Autonomy',
    description: 'Breath as instinct. Sub-three breaths per minute, full-cycle integration, embodied calm.',
  },
}

export const breathingProgram = {
  // ── Phase 1: Awareness & De-escalation (Weeks 1–4) ─────────────────────
  1:  { phase: '1', title: 'The Diaphragmatic Awakening', focus: 'Purely structural. Diaphragm active, chest quiet.', duration: 300, inhale: 4, holdFull: 0, exhale: 4, holdEmpty: 0 },
  2:  { phase: '1', title: 'The Resonant Cadence',         focus: "Slowing down to the nervous system's natural balancing frequency.", duration: 300, inhale: 5, holdFull: 0, exhale: 5, holdEmpty: 0 },
  3:  { phase: '1', title: 'The Gentle Elongation',        focus: 'Extending the exhale slightly to lean into parasympathetic dominance.', duration: 300, inhale: 4, holdFull: 0, exhale: 6, holdEmpty: 0 },
  4:  { phase: '1', title: 'The Passive Pause',            focus: 'Introducing a brief moment of absolute stillness before the next loop.', duration: 300, inhale: 4, holdFull: 0, exhale: 4, holdEmpty: 2 },

  // ── Phase 2: CO2 Adaptation & Tactical Down-Regulation (Weeks 5–8) ─────
  5:  { phase: '2', title: 'The Balanced Box',             focus: 'Developing mental calm and physical stillness under equal breath ratios.', duration: 420, inhale: 4, holdFull: 4, exhale: 4, holdEmpty: 4 },
  6:  { phase: '2', title: 'The Deepening Outflow',        focus: 'Progressively widening the gap between inhalation and exhalation.', duration: 420, inhale: 4, holdFull: 0, exhale: 8, holdEmpty: 0 },
  7:  { phase: '2', title: 'The Asymmetric Hold',          focus: 'Getting comfortable sitting with empty lungs to calm brain alarm triggers.', duration: 420, inhale: 4, holdFull: 0, exhale: 4, holdEmpty: 6 },
  8:  { phase: '2', title: 'The Tactical Recovery (Sigh Protocol, Baseline)', focus: 'Rapid down-regulation. Double inhale to dump CO2 and trigger immediate relaxation.', duration: 300, type: 'sigh', inhale: 4, microInhale: 1, exhale: 8 },

  // ── Phase 3: Autonomic Agility & Deep Control (Weeks 9–13) ─────────────
  9:  { phase: '3', title: 'The Slow Cadence',             focus: 'Lowering the respiratory rate significantly while maintaining absolute ease.', duration: 600, inhale: 6, holdFull: 0, exhale: 6, holdEmpty: 0 },
  10: { phase: '3', title: 'The Advanced Box',             focus: 'Managing longer states of suspension without creating physical tension.', duration: 600, inhale: 5, holdFull: 5, exhale: 5, holdEmpty: 5 },
  11: { phase: '3', title: 'The Tactical Recovery (Sigh Protocol, Advanced)', focus: 'Deep-tier down-regulation and maximum lung compliance.', duration: 300, type: 'sigh', inhale: 6, microInhale: 1, exhale: 10 },
  12: { phase: '3', title: 'The Threshold Elongation',     focus: 'Pushing the limits of the 1:2 ratio smoothly and without strain.', duration: 600, inhale: 5, holdFull: 0, exhale: 10, holdEmpty: 0 },
  13: { phase: '3', title: 'The Gentle Badass Integration', focus: 'Absolute autonomy. The culminative test of letting the breath slow down naturally.', duration: 600, inhale: 6, holdFull: 0, exhale: 8, holdEmpty: 4 },

  // ── Phase 4: Refined Mastery (Weeks 14–26) ─────────────────────────────
  14: { phase: '4', title: 'The Settled Foundation',       focus: 'Re-anchoring Phase 3 mastery at a deliberately slower pace.', duration: 600, inhale: 5, holdFull: 0, exhale: 10, holdEmpty: 0 },
  15: { phase: '4', title: 'The Quiet Bottom',             focus: 'Extending equanimity at empty lungs without tension.', duration: 600, inhale: 4, holdFull: 0, exhale: 4, holdEmpty: 8 },
  16: { phase: '4', title: 'The Top-Held Threshold',       focus: 'Holding lung suspension comfortably under a wider 1:2 ratio.', duration: 600, inhale: 5, holdFull: 5, exhale: 10, holdEmpty: 0 },
  17: { phase: '4', title: 'The Senior Box',               focus: 'Six-second equilibrium across all four phases.', duration: 600, inhale: 6, holdFull: 6, exhale: 6, holdEmpty: 6 },
  18: { phase: '4', title: 'The Triangle Integration',     focus: 'Inhale, full exhale, brief bottom settle, a balanced triad.', duration: 600, inhale: 5, holdFull: 0, exhale: 10, holdEmpty: 5 },
  19: { phase: '4', title: 'The Refined Sigh',             focus: 'Sigh protocol settled into a slower, smoother base cadence.', duration: 300, type: 'sigh', inhale: 6, microInhale: 1, exhale: 14 },
  20: { phase: '4', title: 'The Wide Wave',                focus: 'Equal seven-count breathing for full diaphragm engagement.', duration: 600, inhale: 7, holdFull: 0, exhale: 7, holdEmpty: 0 },
  21: { phase: '4', title: 'The Deep Outflow',             focus: 'Sub-five breaths per minute on a clean 1:2 ratio.', duration: 600, inhale: 6, holdFull: 0, exhale: 12, holdEmpty: 0 },
  22: { phase: '4', title: 'The Patrician Box',            focus: 'Seven-count box for deep, motionless stillness.', duration: 600, inhale: 7, holdFull: 7, exhale: 7, holdEmpty: 7 },
  23: { phase: '4', title: 'The Full Cycle',               focus: 'All four phases active and balanced, the full diamond.', duration: 600, inhale: 5, holdFull: 5, exhale: 10, holdEmpty: 5 },
  24: { phase: '4', title: "The Master's Sigh",            focus: 'Maximum sigh ratio for absolute, immediate down-regulation.', duration: 300, type: 'sigh', inhale: 7, microInhale: 1, exhale: 14 },
  25: { phase: '4', title: 'The Embodied 1:2',             focus: 'Long, smooth 1:2 with a confident bottom settle.', duration: 600, inhale: 6, holdFull: 0, exhale: 12, holdEmpty: 4 },
  26: { phase: '4', title: 'The Refined Integration',      focus: 'Phase 4 capstone, the longest, quietest, most settled cycle so far.', duration: 600, inhale: 6, holdFull: 0, exhale: 14, holdEmpty: 4 },

  // ── Phase 5: Embodied Autonomy (Weeks 27–39) ───────────────────────────
  27: { phase: '5', title: 'The Edge of Rest',             focus: 'Sliding below four breaths per minute without effort.', duration: 600, inhale: 8, holdFull: 0, exhale: 8, holdEmpty: 0 },
  28: { phase: '5', title: 'The Tidal Long-Form',          focus: 'Eight-count inhale, sixteen-count exhale, total surrender.', duration: 600, inhale: 8, holdFull: 0, exhale: 16, holdEmpty: 0 },
  29: { phase: '5', title: 'The Master Box',               focus: 'Eight-second equilibrium across all phases.', duration: 600, inhale: 8, holdFull: 8, exhale: 8, holdEmpty: 8 },
  30: { phase: '5', title: 'The Quiet Floor',              focus: 'Long bottom hold for deep CO2 equanimity.', duration: 600, inhale: 6, holdFull: 0, exhale: 6, holdEmpty: 10 },
  31: { phase: '5', title: 'The Embodied Sigh',            focus: 'Maximum sigh expansion. For any storm, anytime.', duration: 300, type: 'sigh', inhale: 8, microInhale: 1, exhale: 16 },
  32: { phase: '5', title: 'The Threshold Diamond',        focus: 'Asymmetric box weighted toward exhale and bottom hold.', duration: 600, inhale: 6, holdFull: 4, exhale: 12, holdEmpty: 6 },
  33: { phase: '5', title: 'The Stretched Equanimity',     focus: 'Ten-count cadence with no holds, pure rhythm.', duration: 600, inhale: 10, holdFull: 0, exhale: 10, holdEmpty: 0 },
  34: { phase: '5', title: 'The Subtle Suspension',        focus: 'Long equal holds at full and empty lungs.', duration: 600, inhale: 6, holdFull: 10, exhale: 10, holdEmpty: 6 },
  35: { phase: '5', title: 'The Master Outflow',           focus: 'Pushing the 1:2 ratio to its smooth physiological edge.', duration: 600, inhale: 8, holdFull: 0, exhale: 16, holdEmpty: 0 },
  36: { phase: '5', title: 'The Patrician Mastery',        focus: 'The nine-count box, for the very settled practitioner.', duration: 600, inhale: 9, holdFull: 9, exhale: 9, holdEmpty: 9 },
  37: { phase: '5', title: 'The Whisper Cycle',            focus: 'Sub-three breaths per minute, all four phases active.', duration: 600, inhale: 8, holdFull: 6, exhale: 14, holdEmpty: 6 },
  38: { phase: '5', title: 'The Tactical Mastery Sigh',    focus: 'The most refined sigh, for instant absolute calm.', duration: 300, type: 'sigh', inhale: 9, microInhale: 1, exhale: 18 },
  39: { phase: '5', title: 'The Gentle Badass Embodied',   focus: 'Breath as instinct. The practitioner is the practice.', duration: 600, inhale: 8, holdFull: 0, exhale: 16, holdEmpty: 6 },
}

export function getWeekConfig(week) {
  const clamped = Math.min(Math.max(1, week | 0), TOTAL_WEEKS)
  return breathingProgram[clamped]
}

export function isSighWeek(config) {
  return config?.type === 'sigh'
}

// Cycle seconds for the given config, used for the dashboard rate display.
export function cycleSecondsFor(config) {
  if (!config) return 0
  if (isSighWeek(config)) {
    return (config.inhale || 0) + (config.microInhale || 0) + (config.exhale || 0)
  }
  return (config.inhale || 0) + (config.holdFull || 0) + (config.exhale || 0) + (config.holdEmpty || 0)
}

// Builds the ordered phase list the metronome animates through.
// Sigh weeks expand to three segments: inhale → micro-inhale (sip) → long sigh exhale.
// Returns objects with progressStart/progressEnd in [0,1] driving the orb scale.
export function buildPhaseSequence(config) {
  if (!config) return []
  if (isSighWeek(config)) {
    const segments = [
      { id: 'inhale',       label: 'Inhale', cue: 'Slow breath in low and wide.',          seconds: config.inhale || 0,      progressStart: 0,    progressEnd: 0.85 },
      { id: 'micro-inhale', label: 'Sip',    cue: 'Sharp top-up sip, fill the last bit.', seconds: config.microInhale || 0, progressStart: 0.85, progressEnd: 1 },
      { id: 'exhale',       label: 'Sigh',   cue: 'Long relaxed sigh through the mouth.',  seconds: config.exhale || 0,      progressStart: 1,    progressEnd: 0 },
    ]
    return segments.filter(s => s.seconds > 0)
  }
  const segments = [
    { id: 'inhale',     label: 'Inhale', cue: 'Breathe in slow and deep. Feel your belly expand.', seconds: config.inhale || 0,    progressStart: 0, progressEnd: 1 },
    { id: 'hold-full',  label: 'Hold',   cue: 'Stay relaxed at the top.',          seconds: config.holdFull || 0,  progressStart: 1, progressEnd: 1 },
    { id: 'exhale',     label: 'Exhale', cue: 'Let the air leave slowly. Let your belly soften.',  seconds: config.exhale || 0,    progressStart: 1, progressEnd: 0 },
    { id: 'hold-empty', label: 'Hold',   cue: 'Rest softly at the bottom.',        seconds: config.holdEmpty || 0, progressStart: 0, progressEnd: 0 },
  ]
  return segments.filter(s => s.seconds > 0)
}

// Tallies completed breathing sessions per curriculum week from journal entries.
// Pre-curriculum sessions (no weekNumber) are ignored.
export function tallyWeekSessions(entries) {
  const tally = {}
  for (const entry of entries || []) {
    for (const s of entry.sessions || []) {
      if (s.type !== 'breathing') continue
      const w = s.weekNumber
      if (!Number.isInteger(w) || w < 1 || w > TOTAL_WEEKS) continue
      tally[w] = (tally[w] || 0) + 1
    }
  }
  return tally
}

// Current week = lowest week with fewer than SESSIONS_PER_WEEK completed sessions,
// capped at TOTAL_WEEKS once everything is finished.
export function deriveCurrentWeek(tally) {
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    if ((tally[w] || 0) < SESSIONS_PER_WEEK) return w
  }
  return TOTAL_WEEKS
}
