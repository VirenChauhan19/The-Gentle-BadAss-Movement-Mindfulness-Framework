import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import Metronome from '../components/Metronome'
import {
  breathingProgram,
  buildPhaseSequence,
  cycleSecondsFor,
  deriveCurrentWeek,
  getWeekConfig,
  isSighWeek,
  phaseInfo,
  SESSIONS_PER_WEEK,
  tallyWeekSessions,
  TOTAL_WEEKS,
} from '../data/breathingProgram'
import styles from './Breathing.module.css'

export default function Breathing() {
  const { entries, getTodayEntry, saveEntry } = useData()

  const weekTally = useMemo(() => tallyWeekSessions(entries), [entries])
  const currentWeek = useMemo(() => deriveCurrentWeek(weekTally), [weekTally])
  const weekConfig = getWeekConfig(currentWeek)
  const sessionsThisWeek = weekTally[currentWeek] || 0
  const allComplete =
    currentWeek === TOTAL_WEEKS && (weekTally[TOTAL_WEEKS] || 0) >= SESSIONS_PER_WEEK

  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [saved, setSaved] = useState(false)
  const [justUnlocked, setJustUnlocked] = useState(false)

  const phases = useMemo(() => buildPhaseSequence(weekConfig), [weekConfig])
  const cycleSeconds = useMemo(() => cycleSecondsFor(weekConfig), [weekConfig])
  const phaseState = getPhaseState(phases, elapsed)
  const phase = phaseState.label
  const phaseSecond = phaseState.second
  const phaseTotal = phaseState.total
  const cycles = cycleSeconds > 0 ? Math.floor(elapsed / cycleSeconds) : 0
  const progress = phaseState.progress
  const breathsPerMinute = cycleSeconds > 0 ? Math.round((600 / cycleSeconds)) / 10 : 0
  const breathCue = phaseState.cue || 'Settle in. The orb will lead you.'

  useEffect(() => {
    if (!running || cycleSeconds <= 0) return
    const id = window.setInterval(() => setElapsed(v => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [running, cycleSeconds])

  useEffect(() => {
    setElapsed(0)
    setRunning(false)
    setSaved(false)
    setJustUnlocked(false)
  }, [currentWeek])

  async function saveBreathSession() {
    if (elapsed < cycleSeconds || saved) return
    const today = getTodayEntry() || { scores: {}, note: '', sessions: [] }
    const willUnlock = sessionsThisWeek + 1 >= SESSIONS_PER_WEEK && currentWeek < TOTAL_WEEKS

    await saveEntry({
      ...today,
      sessions: [
        ...(today.sessions || []),
        {
          type: 'breathing',
          exerciseName: 'Breathe',
          weekNumber: currentWeek,
          weekTitle: weekConfig.title,
          phase: weekConfig.phase,
          exerciseKind: isSighWeek(weekConfig) ? 'sigh' : 'standard',
          durationSeconds: elapsed,
          cycles,
          inhale: weekConfig.inhale,
          holdFull: weekConfig.holdFull ?? 0,
          exhale: weekConfig.exhale,
          holdEmpty: weekConfig.holdEmpty ?? 0,
          microInhale: weekConfig.microInhale ?? 0,
          completedAt: new Date().toISOString(),
        },
      ],
    })
    setSaved(true)
    setRunning(false)
    setJustUnlocked(willUnlock)
  }

  function toggleRunning() {
    if (cycleSeconds <= 0) return
    setRunning(v => !v)
  }

  function resetTimer() {
    setRunning(false)
    setElapsed(0)
    setSaved(false)
  }

  const phaseMeta = phaseInfo[weekConfig.phase]
  const sighThisWeek = isSighWeek(weekConfig)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Daily Foundation</p>
        <h1 className={styles.title}>Breathe</h1>
        <p className={styles.subtitle}>
          One curriculum. One breath at a time. The orb dictates the cadence — your feet land
          softly on their own timing, completely independent of the breath.
        </p>
      </header>

      <section className={styles.practice}>
        <ProgressCard
          weekNumber={currentWeek}
          weekConfig={weekConfig}
          phaseMeta={phaseMeta}
          sessionsThisWeek={sessionsThisWeek}
          allComplete={allComplete}
          justUnlocked={justUnlocked}
          breathsPerMinute={breathsPerMinute}
        />

        <div className={styles.breathCard}>
          <div
            className={`${styles.orbWrap} ${running ? styles.orbWrapActive : ''}`}
          >
            <div
              className={`${styles.orb} ${running ? styles.orbActive : ''}`}
              style={{ transform: `scale(${0.72 + progress * 0.34})` }}
            />
            <div className={styles.phaseText}>
              <span>{phase}</span>
              <strong>{phaseSecond}</strong>
              <small>{phaseTotal > 0 ? `of ${phaseTotal}` : 'tap start'}</small>
              <p>{breathCue}</p>
            </div>
          </div>

          <div className={`${styles.phaseTrail} ${sighThisWeek ? styles.phaseTrailSigh : ''}`} aria-label="Breath rhythm">
            {phases.map(item => (
              <div
                key={item.id}
                className={item.label === phase ? styles.phaseActive : ''}
                style={{ '--phase-size': `${Math.max(12, item.seconds)}` }}
              >
                <span>{item.label}</span>
                <strong>{item.seconds}s</strong>
              </div>
            ))}
          </div>

          <div className={styles.stats}>
            <div>
              <span>{cycles}</span>
              <p>cycles</p>
            </div>
            <div>
              <span>{formatTime(elapsed)}</span>
              <p>time</p>
            </div>
            <div>
              <span>{breathsPerMinute || '—'}</span>
              <p>br/min</p>
            </div>
            <div>
              <span>{phaseState.nextLabel}</span>
              <p>next</p>
            </div>
          </div>

          <div className={styles.controls}>
            <button onClick={toggleRunning} disabled={cycleSeconds <= 0}>
              {running ? 'Pause' : 'Start'}
            </button>
            <button onClick={resetTimer} className={styles.secondaryBtn}>
              Reset
            </button>
          </div>

          <button
            className={styles.saveBtn}
            onClick={saveBreathSession}
            disabled={elapsed < cycleSeconds || saved}
          >
            {saved ? 'Session saved' : elapsed < cycleSeconds ? 'Save after one full cycle' : 'Log this session'}
          </button>
        </div>

        <Metronome playing={running} onPlayingChange={setRunning} fixedBpm={60} compact />

        <Curriculum currentWeek={currentWeek} weekTally={weekTally} />
      </section>
    </div>
  )
}

function ProgressCard({
  weekNumber,
  weekConfig,
  phaseMeta,
  sessionsThisWeek,
  allComplete,
  justUnlocked,
  breathsPerMinute,
}) {
  const cappedSessions = Math.min(sessionsThisWeek, SESSIONS_PER_WEEK)
  const remaining = Math.max(0, SESSIONS_PER_WEEK - cappedSessions)

  return (
    <div className={styles.progressCard}>
      <p className={styles.weekKicker}>
        {phaseMeta?.label || `Phase ${weekConfig.phase}`} · Week {weekNumber} of {TOTAL_WEEKS}
      </p>
      <h2 className={styles.weekTitle}>{weekConfig.title}</h2>
      <p className={styles.weekFocus}>{weekConfig.focus}</p>

      <div className={styles.weekRatios}>
        <RatioPill label="Inhale" seconds={weekConfig.inhale} />
        {isSighWeek(weekConfig)
          ? <RatioPill label="Sip" seconds={weekConfig.microInhale} accent />
          : <RatioPill label="Hold" seconds={weekConfig.holdFull || 0} muted={!weekConfig.holdFull} />}
        <RatioPill label={isSighWeek(weekConfig) ? 'Sigh' : 'Exhale'} seconds={weekConfig.exhale} />
        {!isSighWeek(weekConfig) && (
          <RatioPill label="Hold" seconds={weekConfig.holdEmpty || 0} muted={!weekConfig.holdEmpty} />
        )}
        {breathsPerMinute > 0 && (
          <RatioPill label="Rate" value={`${breathsPerMinute} br/min`} muted />
        )}
      </div>

      <div className={styles.dayDots} role="img" aria-label={`${cappedSessions} of ${SESSIONS_PER_WEEK} sessions completed this week`}>
        {Array.from({ length: SESSIONS_PER_WEEK }, (_, i) => (
          <span key={i} className={i < cappedSessions ? styles.dayDotFilled : styles.dayDotEmpty} />
        ))}
        <p className={styles.dayDotsLabel}>
          {allComplete
            ? 'Curriculum complete. Stay here as long as you like.'
            : justUnlocked
              ? 'Week complete — next week unlocked.'
              : `Day ${cappedSessions} of ${SESSIONS_PER_WEEK} this week · ${remaining} to unlock next`}
        </p>
      </div>
    </div>
  )
}

function RatioPill({ label, seconds, value, muted, accent }) {
  const display = value != null ? value : `${seconds}s`
  return (
    <div className={`${styles.ratioPill} ${muted ? styles.ratioPillMuted : ''} ${accent ? styles.ratioPillAccent : ''}`}>
      <span>{label}</span>
      <strong>{display}</strong>
    </div>
  )
}

function Curriculum({ currentWeek, weekTally }) {
  const byPhase = useMemo(() => {
    const groups = {}
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      const cfg = breathingProgram[w]
      if (!cfg) continue
      if (!groups[cfg.phase]) groups[cfg.phase] = []
      groups[cfg.phase].push({ week: w, cfg })
    }
    return groups
  }, [])

  return (
    <div className={styles.curriculum}>
      <header className={styles.curriculumHeader}>
        <p className={styles.curriculumKicker}>The path</p>
        <h2 className={styles.curriculumTitle}>3 months. Extending to 6 and 9.</h2>
        <p className={styles.curriculumSub}>
          Log {SESSIONS_PER_WEEK} sessions to unlock the next week. Future weeks stay blurred until then.
        </p>
      </header>

      {Object.keys(byPhase).sort().map(phaseId => {
        const meta = phaseInfo[phaseId]
        return (
          <div key={phaseId} className={styles.phaseGroup}>
            <div className={styles.phaseHeader}>
              <span className={styles.phaseHeaderLabel}>{meta?.label || `Phase ${phaseId}`}</span>
              <h3>{meta?.title}</h3>
              <p>{meta?.description}</p>
            </div>
            <ol className={styles.weekList}>
              {byPhase[phaseId].map(({ week, cfg }) => {
                const count = weekTally[week] || 0
                const done = count >= SESSIONS_PER_WEEK
                const isCurrent = week === currentWeek
                const isLocked = week > currentWeek
                const stateClass = done
                  ? styles.weekRowDone
                  : isCurrent
                    ? styles.weekRowCurrent
                    : isLocked
                      ? styles.weekRowLocked
                      : ''
                return (
                  <li key={week} className={`${styles.weekRow} ${stateClass}`} aria-current={isCurrent ? 'step' : undefined}>
                    <span className={styles.weekRowBadge}>
                      {done ? '✓' : isLocked ? '🔒' : week}
                    </span>
                    <div className={styles.weekRowBody}>
                      <p className={styles.weekRowKicker}>Week {week}{cfg.type === 'sigh' ? ' · Sigh' : ''}</p>
                      <strong>{cfg.title}</strong>
                    </div>
                    <span className={styles.weekRowStatus}>
                      {done
                        ? 'Complete'
                        : isCurrent
                          ? `${count}/${SESSIONS_PER_WEEK}`
                          : isLocked
                            ? 'Locked'
                            : `${count}/${SESSIONS_PER_WEEK}`}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
    </div>
  )
}

function getPhaseState(phases, elapsed) {
  if (!phases.length) {
    return { label: 'Settle', second: 0, total: 0, progress: 0, nextLabel: 'Start', cue: '' }
  }

  const cycleSeconds = phases.reduce((sum, item) => sum + item.seconds, 0)
  let position = elapsed % cycleSeconds

  for (let idx = 0; idx < phases.length; idx++) {
    const item = phases[idx]
    if (position < item.seconds) {
      const second = position + 1
      const pct = item.seconds > 0 ? second / item.seconds : 0
      return {
        label: item.label,
        second,
        total: item.seconds,
        progress: item.progressStart + (item.progressEnd - item.progressStart) * pct,
        nextLabel: phases[(idx + 1) % phases.length].label,
        cue: item.cue,
      }
    }
    position -= item.seconds
  }

  const fallback = phases[0]
  return {
    label: fallback.label,
    second: 1,
    total: fallback.seconds,
    progress: fallback.progressStart,
    nextLabel: fallback.label,
    cue: fallback.cue,
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}
