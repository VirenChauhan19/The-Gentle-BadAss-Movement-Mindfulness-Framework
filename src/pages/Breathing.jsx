import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'
import Metronome from '../components/Metronome'
import styles from './Breathing.module.css'

export default function Breathing() {
  const { getTodayEntry, saveEntry } = useData()
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
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

  useEffect(() => {
    if (!running || cycleSeconds <= 0) return
    const id = window.setInterval(() => setElapsed(v => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [running, cycleSeconds])

  async function saveBreathSession() {
    const today = getTodayEntry() || { scores: {}, note: '', sessions: [] }
    await saveEntry({
      ...today,
      sessions: [
        ...(today.sessions || []),
        {
          type: 'breathing',
          exerciseId: 'breathing-5bpm',
          exerciseName: '5 BPM Breathing',
          durationSeconds: elapsed,
          cycles,
          inhaleSeconds,
          topHoldSeconds,
          exhaleSeconds,
          bottomHoldSeconds,
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
        <h1 className={styles.title}>5 BPM Breathing</h1>
        <p className={styles.subtitle}>{inhaleSeconds}s inhale. {topHoldSeconds}s hold. {exhaleSeconds}s exhale. {bottomHoldSeconds}s hold. The metronome stays fixed at 60 BPM so each click is a true second.</p>
      </header>

      <section className={styles.practice}>
        <div className={styles.breathCard}>
          <div className={styles.orbWrap}>
            <div
              className={`${styles.orb} ${running ? styles.orbActive : ''}`}
              style={{ transform: `scale(${0.72 + progress * 0.34})` }}
            />
            <div className={styles.phaseText}>
              <span>{phase}</span>
              <strong>{phaseSecond}</strong>
              <small>{phaseTotal > 0 ? `of ${phaseTotal}` : 'set a rhythm'}</small>
            </div>
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
          </div>

          <div className={styles.rhythmControls}>
            <PhaseSlider label="Inhale" value={inhaleSeconds} onChange={setInhaleSeconds} running={running} onReset={() => { setElapsed(0); setSaved(false) }} />
            <PhaseSlider label="Hold" value={topHoldSeconds} onChange={setTopHoldSeconds} running={running} onReset={() => { setElapsed(0); setSaved(false) }} />
            <PhaseSlider label="Exhale" value={exhaleSeconds} onChange={setExhaleSeconds} running={running} onReset={() => { setElapsed(0); setSaved(false) }} />
            <PhaseSlider label="Hold" value={bottomHoldSeconds} onChange={setBottomHoldSeconds} running={running} onReset={() => { setElapsed(0); setSaved(false) }} />
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
            {saved ? 'Saved' : 'Save Breathing Session'}
          </button>
        </div>

        <Metronome playing={running} onPlayingChange={setRunning} fixedBpm={60} />
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
        onChange={e => { onChange(Number(e.target.value)); onReset() }}
        disabled={running}
      />
      <strong>{value}s</strong>
    </label>
  )
}

function getPhaseState(phases, elapsed) {
  if (!phases.length) {
    return { label: 'Set time', second: 0, total: 0, progress: 0 }
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
      }
    }
    position -= item.seconds
  }

  const fallback = phases[0]
  return { label: fallback.label, second: 1, total: fallback.seconds, progress: fallback.progressStart }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}
