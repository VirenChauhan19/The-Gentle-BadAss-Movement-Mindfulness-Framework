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
  const [volume, setVolume] = useState(85)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const beatRef = useRef(0)

  useEffect(() => {
    if (!playing) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
      return
    }

    tick()
    timerRef.current = window.setInterval(tick, 60000 / selectedTempo.bpm)
    return () => window.clearInterval(timerRef.current)
  }, [playing, selectedTempo.bpm, volume])

  async function tick() {
    const nextBeat = (beatRef.current + 1) % 4
    beatRef.current = nextBeat
    setBeat(nextBeat)
    try {
      const ctx = ensureAudio()
      if (ctx.state === 'suspended') await ctx.resume()
      playClick(ctx, nextBeat === 0, volume / 100)
    } catch {}
  }

  async function togglePlaying() {
    if (!playing) {
      try {
        const ctx = ensureAudio()
        if (ctx.state === 'suspended') await ctx.resume()
      } catch {}
    }
    onPlayingChange?.(!playing)
  }

  function selectTempo(tempo) {
    if (fixedBpm) return
    setSelectedTempo(tempo)
    beatRef.current = 0
    setBeat(0)
  }

  function ensureAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!audioRef.current) audioRef.current = new AudioContext()
    return audioRef.current
  }

  function playClick(ctx, accent, volumeLevel) {
    const now = ctx.currentTime
    const peak = Math.max(0.02, volumeLevel) * (accent ? 0.72 : 0.52)

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(accent ? 1320 : 960, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.085)

    const knock = ctx.createOscillator()
    const knockGain = ctx.createGain()
    knock.type = 'triangle'
    knock.frequency.setValueAtTime(accent ? 220 : 180, now)
    knockGain.gain.setValueAtTime(0.0001, now)
    knockGain.gain.exponentialRampToValueAtTime(peak * 0.35, now + 0.004)
    knockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)
    knock.connect(knockGain)
    knockGain.connect(ctx.destination)
    knock.start(now)
    knock.stop(now + 0.05)
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

      <label className={styles.volumeControl}>
        <span>Click volume</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
        />
        <strong>{volume}%</strong>
      </label>

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
