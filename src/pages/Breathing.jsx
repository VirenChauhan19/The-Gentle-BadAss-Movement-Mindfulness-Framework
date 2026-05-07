import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'
import Metronome from '../components/Metronome'
import styles from './Breathing.module.css'

const RHYTHM_PRESETS = [
  { id: 'reset', label: 'Reset', sub: 'Long exhale', inhale: 4, topHold: 0, exhale: 8, bottomHold: 0 },
  { id: 'box', label: 'Box', sub: 'Even focus', inhale: 4, topHold: 4, exhale: 4, bottomHold: 4 },
  { id: 'calm', label: 'Calm', sub: 'Soft hold', inhale: 4, topHold: 2, exhale: 6, bottomHold: 0 },
  { id: 'sleep', label: 'Sleep', sub: 'Downshift', inhale: 4, topHold: 7, exhale: 8, bottomHold: 0 },
]

const SESSION_LENGTHS = [1, 3, 5]

export default function Breathing() {
  const { getTodayEntry, saveEntry } = useData()
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [activePreset, setActivePreset] = useState('reset')
  const [targetMinutes, setTargetMinutes] = useState(3)
  const [inhaleSeconds, setInhaleSeconds] = useState(4)
  const [topHoldSeconds, setTopHoldSeconds] = useState(0)
  const [exhaleSeconds, setExhaleSeconds] = useState(8)
  const [bottomHoldSeconds, setBottomHoldSeconds] = useState(0)
  const [saved, setSaved] = useState(false)

  const phases = [
    { id: 'inhale', label: 'Inhale', seconds: inhaleSeconds, progressStart: 0, progressEnd: 1 },
    { id: 'top-hold', label: 'Hold', seconds: topHoldSeconds, progressStart: 1, progressEnd: 1 },
    { id: 'exhale', label: 'Exhale', seconds: exhaleSeconds, progressStart: 1, progressEnd: 0 },
    { id: 'bottom-hold', label: 'Hold', seconds: bottomHoldSeconds, progressStart: 0, progressEnd: 0 },
  ].filter(item => item.seconds > 0)
  const cycleSeconds = phases.reduce((sum, item) => sum + item.seconds, 0)
  const phaseState = getPhaseState(phases, elapsed)
  const phase = phaseState.label
  const phaseSecond = phaseState.second
  const phaseTotal = phaseState.total
  const cycles = cycleSeconds > 0 ? Math.floor(elapsed / cycleSeconds) : 0
  const progress = phaseState.progress
  const targetSeconds = targetMinutes * 60
  const sessionPct = targetSeconds > 0 ? Math.min(100, (elapsed / targetSeconds) * 100) : 0
  const nextPhase = phaseState.nextLabel
  const breathCue =
    phase === 'Inhale' ? 'Let the ribs widen.' :
    phase === 'Exhale' ? 'Release slowly.' :
    phase === 'Hold' && progress > 0.5 ? 'Stay soft at the top.' :
    phase === 'Hold' ? 'Rest at the bottom.' :
    'Choose a rhythm.'

  useEffect(() => {
    if (!running || cycleSeconds <= 0) return
    const id = window.setInterval(() => setElapsed(v => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [running, cycleSeconds])

  useEffect(() => {
    if (running && targetSeconds > 0 && elapsed >= targetSeconds) {
      setRunning(false)
    }
  }, [elapsed, running, targetSeconds])

  function choosePreset(preset) {
    if (running) return
    setActivePreset(preset.id)
    setInhaleSeconds(preset.inhale)
    setTopHoldSeconds(preset.topHold)
    setExhaleSeconds(preset.exhale)
    setBottomHoldSeconds(preset.bottomHold)
    setElapsed(0)
    setSaved(false)
    if (navigator.vibrate && window.innerWidth <= 767) navigator.vibrate(8)
  }

  function updateCustom(setter, value) {
    setActivePreset('custom')
    setter(value)
    setElapsed(0)
    setSaved(false)
  }

  async function saveBreathSession() {
    const today = getTodayEntry() || { scores: {}, note: '', sessions: [] }
    await saveEntry({
      ...today,
      sessions: [
        ...(today.sessions || []),
        {
          type: 'breathing',
          exerciseId: 'breathing-5bpm',
          exerciseName: '5 breaths/min breathing',
          durationSeconds: elapsed,
          cycles,
          inhaleSeconds,
          topHoldSeconds,
          exhaleSeconds,
          bottomHoldSeconds,
          targetMinutes,
          completedAt: new Date().toISOString(),
        },
      ],
    })
    setSaved(true)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Daily Foundation</p>
        <h1 className={styles.title}>Breathe</h1>
        <p className={styles.subtitle}>{inhaleSeconds}s inhale. {topHoldSeconds}s hold. {exhaleSeconds}s exhale. {bottomHoldSeconds}s hold. Breathing pace is shown in breaths per minute; the click stays at 60 BPM so every beat is one honest second.</p>
      </header>

      <section className={styles.practice}>
        <div className={styles.breathCard}>
          <div className={styles.presetRail} data-swipe-lock>
            {RHYTHM_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                className={`${styles.presetBtn} ${activePreset === preset.id ? styles.presetActive : ''}`}
                onClick={() => choosePreset(preset)}
                disabled={running}
              >
                <span>{preset.label}</span>
                <small>{preset.sub}</small>
              </button>
            ))}
          </div>

          <div className={styles.sessionRail}>
            {SESSION_LENGTHS.map(minutes => (
              <button
                key={minutes}
                type="button"
                className={targetMinutes === minutes ? styles.sessionActive : ''}
                onClick={() => { setTargetMinutes(minutes); setSaved(false) }}
              >
                {minutes} min
              </button>
            ))}
          </div>

          <div
            className={`${styles.orbWrap} ${running ? styles.orbWrapActive : ''}`}
            style={{ '--session-progress': `${sessionPct}%` }}
          >
            <div className={styles.sessionRing} aria-hidden="true" />
            <div
              className={`${styles.orb} ${running ? styles.orbActive : ''}`}
              style={{ transform: `scale(${0.72 + progress * 0.34})` }}
            />
            <div className={styles.phaseText}>
              <span>{phase}</span>
              <strong>{phaseSecond}</strong>
              <small>{phaseTotal > 0 ? `of ${phaseTotal}` : 'set a rhythm'}</small>
              <p>{breathCue}</p>
            </div>
          </div>

          <div className={styles.phaseTrail} aria-label="Breath rhythm">
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
              <span>{formatTime(Math.max(0, targetSeconds - elapsed))}</span>
              <p>left</p>
            </div>
            <div>
              <span>{nextPhase}</span>
              <p>next</p>
            </div>
          </div>

          <div className={styles.rhythmControls}>
            <p className={styles.controlsTitle}>Fine tune rhythm</p>
            <PhaseSlider label="Inhale" value={inhaleSeconds} onChange={val => updateCustom(setInhaleSeconds, val)} running={running} />
            <PhaseSlider label="Top hold" value={topHoldSeconds} onChange={val => updateCustom(setTopHoldSeconds, val)} running={running} />
            <PhaseSlider label="Exhale" value={exhaleSeconds} onChange={val => updateCustom(setExhaleSeconds, val)} running={running} />
            <PhaseSlider label="Bottom hold" value={bottomHoldSeconds} onChange={val => updateCustom(setBottomHoldSeconds, val)} running={running} />
          </div>

          <div className={styles.controls}>
            <button onClick={() => setRunning(v => cycleSeconds > 0 ? !v : false)} disabled={cycleSeconds <= 0}>
              {running ? 'Pause' : 'Start'}
            </button>
            <button onClick={() => { setRunning(false); setElapsed(0); setSaved(false) }} className={styles.secondaryBtn}>
              Reset
            </button>
          </div>

          <button className={styles.saveBtn} onClick={saveBreathSession} disabled={elapsed < cycleSeconds || saved}>
            {saved ? 'Saved' : elapsed < cycleSeconds ? 'Save after one cycle' : 'Save breathing session'}
          </button>
        </div>

        <Metronome playing={running} onPlayingChange={setRunning} fixedBpm={60} compact />
      </section>
    </div>
  )
}

function PhaseSlider({ label, value, onChange, running, onReset }) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="range"
        min="0"
        max="30"
        step="1"
        value={value}
        onChange={e => { onChange(Number(e.target.value)); onReset?.() }}
        disabled={running}
        aria-label={`${label} seconds`}
        aria-valuemin="0"
        aria-valuemax="30"
        aria-valuenow={value}
        aria-valuetext={`${value} seconds`}
      />
      <strong>{value}s</strong>
    </label>
  )
}

function getPhaseState(phases, elapsed) {
  if (!phases.length) {
    return { label: 'Set time', second: 0, total: 0, progress: 0, nextLabel: 'Start' }
  }

  const cycleSeconds = phases.reduce((sum, item) => sum + item.seconds, 0)
  let position = elapsed % cycleSeconds

  for (const item of phases) {
    if (position < item.seconds) {
      const second = position + 1
      const pct = item.seconds > 0 ? second / item.seconds : 0
      return {
        label: item.label,
        second,
        total: item.seconds,
        progress: item.progressStart + (item.progressEnd - item.progressStart) * pct,
        nextLabel: phases[(phases.indexOf(item) + 1) % phases.length]?.label || item.label,
      }
    }
    position -= item.seconds
  }

  const fallback = phases[0]
  return { label: fallback.label, second: 1, total: fallback.seconds, progress: fallback.progressStart, nextLabel: fallback.label }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}
