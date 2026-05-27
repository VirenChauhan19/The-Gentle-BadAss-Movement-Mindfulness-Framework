import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import Metronome from '../components/Metronome'
import PlanTabs from '../components/PlanTabs'
import {
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
  const navigate = useNavigate()
  const elapsedRef = useRef(0)

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
  const [remindersOpen, setRemindersOpen] = useState(false)

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
  // One minute is the daily target. Reaching it logs the session, but the timer
  // keeps running so the practice can be done for as long as the runner likes.
  const targetDuration = 60
  const sessionProgress = targetDuration > 0 ? Math.min(1, elapsed / targetDuration) : 0

  useEffect(() => { elapsedRef.current = elapsed }, [elapsed])

  // Single source of truth for the count. A self-correcting timer anchored to a
  // start timestamp keeps every second landing on its real wall-clock boundary,
  // so the orb number and the metronome click (both driven by `elapsed`) stay
  // locked together with no cumulative drift.
  useEffect(() => {
    if (!running || cycleSeconds <= 0) return
    const anchorElapsed = elapsedRef.current
    const anchorTime = performance.now()
    let count = 0
    let timeoutId
    const scheduleNext = () => {
      count += 1
      const delay = Math.max(0, anchorTime + count * 1000 - performance.now())
      timeoutId = window.setTimeout(() => {
        setElapsed(anchorElapsed + count)
        scheduleNext()
      }, delay)
    }
    scheduleNext()
    return () => window.clearTimeout(timeoutId)
  }, [running, cycleSeconds])

  // Reaching the one-minute target logs the session automatically. The timer is
  // not stopped, so the runner can keep breathing for as long as they like.
  useEffect(() => {
    if (targetDuration > 0 && elapsed >= targetDuration && !saved) {
      saveBreathSession()
    }
  }, [elapsed, targetDuration, saved])

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
    setJustUnlocked(willUnlock)
  }

  function toggleRunning() {
    if (cycleSeconds <= 0) return
    setRunning(v => !v)
  }

  function stopPractice() {
    setRunning(false)
    // If the one-minute target was reached but the auto-save hasn't fired yet,
    // log the session so finishing via Stop still counts it. saveEntry writes to
    // localStorage synchronously, so the record survives the navigation below.
    if (elapsed >= targetDuration && !saved) saveBreathSession()
    // Stop ends the practice and moves the runner on to the next step (Mobility),
    // rather than just resetting the timer in place.
    navigate('/library?section=running')
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

  if (remindersOpen) {
    return (
      <div className={styles.page}>
        <div className={styles.reminderView}>
          <button
            type="button"
            className={styles.reminderBack}
            onClick={() => setRemindersOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Breathe
          </button>
          <ReminderPanel
            settings={reminderSettings}
            onChange={setReminderSettings}
            permission={notificationPermission}
            onRequestPermission={requestNotificationPermission}
            notice={reminderNotice}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Daily Foundation</p>
        <h1 className={styles.title}>Breathe</h1>
        <p className={styles.subtitle}>
          Breathing keeps you alive, so it&apos;s kind of important.
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
          {/* Start / Stop sit at the top so the primary action is the first
              thing within reach, the same as the run tab. */}
          <div className={styles.controls}>
            <button onClick={toggleRunning} disabled={cycleSeconds <= 0}>
              {running ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              onClick={stopPractice}
              className={styles.stopBtn}
              disabled={!running && elapsed === 0 && !saved}
            >
              Stop
            </button>
          </div>

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

          {saved ? (
            <>
              <p className={styles.savedHint}>Logged. Tap Stop when you&apos;re finished, or move on.</p>
              <button
                className={styles.saveBtn}
                onClick={() => navigate('/library?section=running')}
              >
                Continue to Mobility
              </button>
            </>
          ) : (
            <button
              className={styles.saveBtn}
              onClick={saveBreathSession}
              disabled={elapsed < targetDuration}
            >
              {elapsed < targetDuration ? `1 minute target · ${formatTime(Math.max(0, targetDuration - elapsed))} left` : 'Log this session'}
            </button>
          )}
        </div>

        <Metronome
          playing={running}
          onPlayingChange={setRunning}
          fixedBpm={60}
          compact
          syncTick={elapsed}
          tempoLabel="Each beat represents a second"
        />

        <button
          type="button"
          className={styles.reminderEditBtn}
          onClick={() => setRemindersOpen(true)}
        >
          <span className={styles.reminderEditLabel}>Hourly Prompts</span>
          <span className={styles.reminderEditAction}>
            {reminderSettings.enabled ? 'On' : 'Off'} · Edit
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        </button>
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

      <div className={styles.dayDots} role="img" aria-label={`${cappedSessions} of ${SESSIONS_PER_WEEK} sessions completed this week`}>
        {Array.from({ length: SESSIONS_PER_WEEK }, (_, i) => (
          <span key={i} className={i < cappedSessions ? styles.dayDotFilled : styles.dayDotEmpty} />
        ))}
      </div>
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
