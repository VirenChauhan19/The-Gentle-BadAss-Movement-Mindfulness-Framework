import { useState, useEffect } from 'react'
import styles from './Metronome.module.css'

const TEMPOS = [
  { bpm: 60, label: '60 BPM', purpose: 'Breathing & Slow Strength', vibe: 'Low-fi, Ambient, Calm', query: '60 bpm ambient meditation' },
  { bpm: 175, label: '170-180 BPM', purpose: 'Soft Landing / Cadence', vibe: 'High-energy, Rhythmic, Flow', query: '175 bpm running music' },
  { bpm: 190, label: '190 BPM', purpose: 'High-Efficiency Turnover', vibe: 'Up-tempo, Gentle BadAss Pace', query: '190 bpm running music' }
]

export default function Metronome() {
  const [selectedTempo, setSelectedTempo] = useState(TEMPOS[0])
  const [isPlaying, setIsPlaying] = useState(false)

  const videoId = selectedTempo.bpm === 60 ? '5qap5aO4i9A' : 
                  selectedTempo.bpm === 175 ? 'fW6_63mIsis' : 
                  'hsh_v7869X0' // Placeholder IDs, would ideally be dynamic or curated

  return (
    <div className={styles.container}>
      <div className={styles.tempoGrid}>
        {TEMPOS.map(t => (
          <button
            key={t.bpm}
            className={styles.tempoBtn + (selectedTempo.bpm === t.bpm ? ' ' + styles.active : '')}
            onClick={() => setSelectedTempo(t)}
          >
            <span className={styles.bpm}>{t.bpm}</span>
            <span className={styles.label}>BPM</span>
          </button>
        ))}
      </div>

      <div className={styles.info}>
        <h3>{selectedTempo.purpose}</h3>
        <p className={styles.vibe}>Vibe: {selectedTempo.vibe}</p>
      </div>

      <div className={styles.videoWrapper}>
        <iframe
          width="100%"
          height="200"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&controls=1`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      <button
        className={styles.playBtn}
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? 'Pause Metronome' : 'Start Rhythmic Entrainment'}
      </button>
    </div>
  )
}
