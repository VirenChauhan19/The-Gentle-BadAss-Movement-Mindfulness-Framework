import { useRef, useState, useCallback } from 'react'
import styles from './PillarVideoCard.module.css'

export default function PillarVideoCard({ title, subtitle, url }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }, [])

  const toggleMute = useCallback((e) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }, [])

  return (
    <div className={styles.card} onClick={toggle}>
      <video
        ref={videoRef}
        src={url}
        className={styles.video}
        loop
        muted
        playsInline
        preload="metadata"
      />
      <div className={`${styles.overlay} ${playing ? styles.hidden : ''}`}>
        <div className={styles.playBtn}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <button className={styles.muteBtn} onClick={toggleMute}>
        {muted
          ? <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l1.99 2 1.27-1.27L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>
          : <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        }
      </button>
      <div className={styles.label}>
        <span className={styles.labelTitle}>{title}</span>
        <span className={styles.labelSub}>{subtitle}</span>
      </div>
    </div>
  )
}
