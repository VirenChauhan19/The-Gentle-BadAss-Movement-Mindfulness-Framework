import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import Metronome from '../components/Metronome'
import PlanTabs from '../components/PlanTabs'
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

const REMINDER_STORAGE_KEY = 'gb_breath_reminders'
const DEFAULT_REMINDER_SETTINGS = {
  enabled: false,
  frequency: 8,
  startTime: '08:00',
  endTime: '20:00',
}

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
  const [sighDuration, setSighDuration] = useState(300)
  const [reminderSettings, setReminderSettings] = useState(() => loadReminderSettings())
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission())
  const [reminderNotice, setReminderNotice] = useState('')

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
  const sighThisWeek = isSighWeek(weekConfig)
  const targetDuration = sighThisWeek ? sighDuration : (weekConfig.duration || cycleSeconds)
  const sessionProgress = targetDuration > 0 ? Math.min(1, elapsed / targetDuration) : 0

  useEffect(() => {
    if (!running || cycleSeconds <= 0) return
    const id = window.setInterval(() => setElapsed(v => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [running, cycleSeconds])

  useEffect(() => {
    if (running && targetDuration > 0 && elapsed >= targetDuration) {
      setRunning(false)
    }
  }, [elapsed, running, targetDuration])

  useEffect(() => {
    setElapsed(0)
    setRunning(false)
    setSaved(false)
    setJustUnlocked(false)
    setSighDuration(300)
  }, [currentWeek])

  useEffect(() => {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminderSettings))
    syncReminderSettings(reminderSettings)
  }, [reminderSettings])

  async function saveBreathSession() {
    if (elapsed < targetDuration || saved) return
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
          targetDurationSeconds: targetDuration,
          cycles,
          inhale: weekConfig.inhale,
          holdFull: weekConfig.holdFull ?? 0,
          exhale: weekConfig.exhale,
          holdEmpty: weekConfig.holdEmpty ?? 0,
          microInhale: weekConfig.microInhale ?? 0,
          reminderSettings: reminderSettings.enabled ? reminderSettings : null,
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

  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      setReminderNotice('This browser does not support notifications.')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      setReminderNotice(permission === 'granted'
        ? 'Notifications are ready for your reminder window.'
        : 'Notifications are still blocked. You can enable them in browser settings.')
    } catch (err) {
      setReminderNotice(err.message || 'Notification permission could not be requested.')
    }
  }

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
      <PlanTabs active="breathe" />

      <section className={styles.practice}>
        <ProgressCard
          weekNumber={currentWeek}
          weekConfig={weekConfig}
          phaseMeta={phaseMeta}
          sessionsThisWeek={sessionsThisWeek}
          allComplete={allComplete}
          justUnlocked={justUnlocked}
          breathsPerMinute={breathsPerMinute}
          targetDuration={targetDuration}
        />

        <div className={styles.breathCard}>
          {sighThisWeek && (
            <div className={styles.sighOptions} aria-label="Sigh protocol duration">
              <button
                type="button"
                className={sighDuration === 180 ? styles.sighOptionActive : ''}
                onClick={() => setSighDuration(180)}
                disabled={running}
              >
                <span>Rapid reset</span>
                <strong>3 min</strong>
              </button>
              <button
                type="button"
                className={sighDuration === 300 ? styles.sighOptionActive : ''}
                onClick={() => setSighDuration(300)}
                disabled={running}
              >
                <span>Daily practice</span>
                <strong>5 min</strong>
              </button>
            </div>
          )}

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
              <span>{formatTime(targetDuration)}</span>
              <p>target</p>
            </div>
            <div>
              <span>{Math.round(sessionProgress * 100)}%</span>
              <p>done</p>
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
            disabled={elapsed < targetDuration || saved}
          >
            {saved ? 'Session saved' : elapsed < targetDuration ? `Save at ${formatTime(targetDuration)}` : 'Log this session'}
          </button>
        </div>

        <Metronome playing={running} onPlayingChange={setRunning} fixedBpm={60} compact />

        <ReminderPanel
          settings={reminderSettings}
          onChange={setReminderSettings}
          permission={notificationPermission}
          onRequestPermission={requestNotificationPermission}
          notice={reminderNotice}
        />

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
  targetDuration,
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
        {targetDuration > 0 && (
          <RatioPill label="Timer" value={formatMinutes(targetDuration)} muted />
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

function ReminderPanel({ settings, onChange, permission, onRequestPermission, notice }) {
  const platform = getPwaPlatformState()
  const nextTimes = getReminderTimes(settings)
  const canAskPermission = platform.canAskPermission && 'Notification' in window
  const permissionLabel = permission === 'granted'
    ? 'Permission granted'
    : permission === 'denied'
      ? 'Permission blocked'
      : 'Permission not set'

  function update(patch) {
    onChange({ ...settings, ...patch })
  }

  return (
    <section className={styles.reminderCard} aria-labelledby="breath-reminder-title">
      <div className={styles.reminderHeader}>
        <div>
          <p className={styles.reminderKicker}>Breathe reminders</p>
          <h2 id="breath-reminder-title">Active-hour prompts</h2>
        </div>
        <label className={styles.reminderToggle}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={e => update({ enabled: e.target.checked })}
          />
          <span>{settings.enabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      <div className={styles.reminderControls}>
        <label>
          <span>Daily count</span>
          <input
            type="range"
            min="5"
            max="12"
            value={settings.frequency}
            onChange={e => update({ frequency: Number(e.target.value) })}
          />
          <strong>{settings.frequency} times</strong>
        </label>
        <label>
          <span>Start</span>
          <input
            type="time"
            value={settings.startTime}
            onChange={e => update({ startTime: e.target.value })}
          />
        </label>
        <label>
          <span>End</span>
          <input
            type="time"
            value={settings.endTime}
            onChange={e => update({ endTime: e.target.value })}
          />
        </label>
      </div>

      {platform.needsInstall && (
        <div className={styles.installGuide}>
          <p className={styles.installGuideTitle}>Install first on iPhone</p>
          <div className={styles.installSteps} aria-label="Install instructions">
            <span>1. Safari Share</span>
            <span>2. Add to Home Screen</span>
            <span>3. Open from icon</span>
          </div>
        </div>
      )}

      <div className={styles.permissionRow}>
        <span>{permissionLabel}</span>
        {permission !== 'granted' && (
          <button type="button" onClick={onRequestPermission} disabled={!canAskPermission}>
            Grant notification permission
          </button>
        )}
      </div>

      {nextTimes.length > 0 && (
        <p className={styles.reminderPreview}>
          Today: {nextTimes.join(', ')}
        </p>
      )}
      <p className={styles.reminderFoot}>
        Each reminder opens a 60-second reset. Installed PWAs can receive push messages through the service worker.
      </p>
      {notice && <p className={styles.reminderNotice}>{notice}</p>}
    </section>
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

function loadReminderSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY) || 'null')
    return {
      ...DEFAULT_REMINDER_SETTINGS,
      ...(saved || {}),
      frequency: clampReminderFrequency(saved?.frequency ?? DEFAULT_REMINDER_SETTINGS.frequency),
    }
  } catch {
    return DEFAULT_REMINDER_SETTINGS
  }
}

function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

function getPwaPlatformState() {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent || '')
  return {
    isIOS,
    standalone,
    needsInstall: isIOS && !standalone,
    canAskPermission: !isIOS || standalone,
  }
}

function clampReminderFrequency(value) {
  const next = Number(value)
  if (!Number.isFinite(next)) return DEFAULT_REMINDER_SETTINGS.frequency
  return Math.min(12, Math.max(5, Math.round(next)))
}

function getReminderTimes(settings) {
  if (!settings?.enabled) return []
  const start = timeToMinutes(settings.startTime)
  const end = timeToMinutes(settings.endTime)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return []
  const count = clampReminderFrequency(settings.frequency)
  if (count === 1) return [minutesToTime(start)]
  const step = (end - start) / Math.max(1, count - 1)
  return Array.from({ length: count }, (_, i) => minutesToTime(Math.round(start + step * i)))
}

function timeToMinutes(value) {
  const [hours, mins] = String(value || '').split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return NaN
  return hours * 60 + mins
}

function minutesToTime(total) {
  const hours = Math.floor(total / 60) % 24
  const mins = total % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function syncReminderSettings(settings) {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready
    .then(registration => {
      registration.active?.postMessage({
        type: 'BREATH_REMINDER_SETTINGS',
        settings: {
          ...settings,
          frequency: clampReminderFrequency(settings.frequency),
          notification: {
            title: 'Time to Breathe',
            body: 'Take 60 seconds. Let your breath become Slow, Long, and Deep. Drop the tension.',
            durationSeconds: 60,
          },
        },
      })
    })
    .catch(() => {})
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function formatMinutes(seconds) {
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}
