import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'
import Metronome from '../components/Metronome'
import styles from './Breathing.module.css'

export default function Breathing() {
  const { getTodayEntry, saveEntry } = useData()
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [inhaleSeconds, setInhaleSeconds] = useState(4)
  const [exhaleSeconds, setExhaleSeconds] = useState(8)
  const [saved, setSaved] = useState(false)

  const cycleSeconds = inhaleSeconds + exhaleSeconds
  const cyclePosition = elapsed % cycleSeconds
  const phase = cyclePosition < inhaleSeconds ? 'Inhale' : 'Exhale'
  const phaseSecond = phase === 'Inhale'
    ? cyclePosition + 1
    : cyclePosition - inhaleSeconds + 1
  const phaseTotal = phase === 'Inhale' ? inhaleSeconds : exhaleSeconds
  const cycles = Math.floor(elapsed / cycleSeconds)
  const progress = phase === 'Inhale'
    ? phaseSecond / inhaleSeconds
    : 1 - (phaseSecond / exhaleSeconds)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setElapsed(v => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

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
          exhaleSeconds,
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
        <p className={styles.subtitle}>{inhaleSeconds} seconds inhale. {exhaleSeconds} seconds exhale. The metronome stays fixed at 60 BPM so each click is a true second.</p>
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
              <small>of {phaseTotal}</small>
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
            <label>
              <span>Inhale</span>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={inhaleSeconds}
                onChange={e => { setInhaleSeconds(Number(e.target.value)); setElapsed(0); setSaved(false) }}
                disabled={running}
              />
              <strong>{inhaleSeconds}s</strong>
            </label>
            <label>
              <span>Exhale</span>
              <input
                type="range"
                min="4"
                max="14"
                step="1"
                value={exhaleSeconds}
                onChange={e => { setExhaleSeconds(Number(e.target.value)); setElapsed(0); setSaved(false) }}
                disabled={running}
              />
              <strong>{exhaleSeconds}s</strong>
            </label>
          </div>

          <div className={styles.controls}>
            <button onClick={() => setRunning(v => !v)}>
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

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}
