import { useEffect, useRef, useState } from 'react'
import styles from './Metronome.module.css'

const TEMPOS = [
  { bpm: 60, purpose: 'Breathing & strength', vibe: 'The true second for breath, holds, and slow lifts.' },
  { bpm: 160, purpose: 'Running drills', vibe: 'Entry cadence for skipping and spot-jogging.' },
  { bpm: 170, purpose: 'Running drills', vibe: 'Soft, quick, quiet contacts.' },
  { bpm: 180, purpose: 'Running drills', vibe: 'Classic efficient cadence target.' },
  { bpm: 190, purpose: 'Running drills', vibe: 'High-turnover drill work.' },
]

export default function Metronome({ playing = false, onPlayingChange, fixedBpm = null, allowedBpms = null }) {
  const availableTempos = fixedBpm
    ? TEMPOS.filter(t => t.bpm === fixedBpm)
    : allowedBpms
      ? TEMPOS.filter(t => allowedBpms.includes(t.bpm))
      : TEMPOS
  const [selectedTempo, setSelectedTempo] = useState(() => availableTempos[0] || TEMPOS[0])
  const [beat, setBeat] = useState(0)
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!playing) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
      return
    }

    tick()
    timerRef.current = window.setInterval(tick, 60000 / selectedTempo.bpm)
    return () => window.clearInterval(timerRef.current)
  }, [playing, selectedTempo.bpm])

  function tick() {
    setBeat(prev => (prev + 1) % 4)
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!audioRef.current) audioRef.current = new AudioContext()
      const ctx = audioRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = beat === 0 ? 980 : 720
      gain.gain.setValueAtTime(0.001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.08)
    } catch {}
  }

  function togglePlaying() {
    onPlayingChange?.(!playing)
  }

  function selectTempo(tempo) {
    if (fixedBpm) return
    setSelectedTempo(tempo)
    setBeat(0)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Metronome Engine</p>
          <h3>{selectedTempo.bpm} BPM</h3>
        </div>
        <div className={`${styles.pulse} ${playing ? styles.pulseActive : ''}`}>
          <span style={{ animationDuration: `${60000 / selectedTempo.bpm}ms` }} />
        </div>
      </div>

      <div className={styles.tempoGrid}>
        {availableTempos.map(t => (
          <button
            key={t.bpm}
            className={styles.tempoBtn + (selectedTempo.bpm === t.bpm ? ' ' + styles.active : '')}
            onClick={() => selectTempo(t)}
          >
            <span className={styles.bpm}>{t.bpm}</span>
            <span className={styles.label}>BPM</span>
          </button>
        ))}
      </div>

      <div className={styles.info}>
        <h4>{selectedTempo.purpose}</h4>
        <p className={styles.vibe}>{selectedTempo.vibe}</p>
      </div>

      <div className={`${styles.metronomeFace} ${playing ? styles.metronomeFaceActive : ''}`}>
        <div className={styles.beatRing} style={{ animationDuration: `${60000 / selectedTempo.bpm}ms` }} />
        <div className={styles.beatNumber}>{beat + 1}</div>
        <div className={styles.beatMarks}>
          {[0, 1, 2, 3].map(mark => (
            <span key={mark} className={beat === mark ? styles.beatMarkActive : ''} />
          ))}
        </div>
      </div>

      <button
        className={styles.playBtn}
        onClick={togglePlaying}
      >
        {playing ? 'Pause Metronome' : 'Start Metronome'}
      </button>
    </div>
  )
}
