import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { EXERCISES, CATEGORIES } from '../data/exercises'
import ExerciseAnimation from '../components/ExerciseAnimation'
import PillarChecklist from '../components/PillarChecklist'
import Metronome from '../components/Metronome'
import { useData } from '../context/DataContext'
import styles from './ExerciseDetail.module.css'

const PILLARS = ['Smile', 'Tall Puppet', 'Relaxed Fists & Shoulders', 'Uncurl Toes', 'Breathe Slow & Long']

function getPerformedExercises() {
  try {
    return JSON.parse(localStorage.getItem('gb_performed_exercises') || '[]')
  } catch {
    return []
  }
}

export default function ExerciseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { saveEntry, getTodayEntry } = useData()
  const exercise = EXERCISES.find(e => e.id === id)
  const [pillarsDone, setPillarsDone] = useState(() => localStorage.getItem('gb_pillars_ready') === new Date().toISOString().split('T')[0])
  const [tpr, setTpr] = useState(10)
  const [qualityScore, setQualityScore] = useState(7)
  const [sessionState, setSessionState] = useState('idle')
  const [metronomePlaying, setMetronomePlaying] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(() => !getPerformedExercises().includes(id))
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoMuted, setVideoMuted] = useState(true)
  const [videoProgress, setVideoProgress] = useState(0)
  const videoRef = useRef(null)
  const hideControlsTimer = useRef(null)
  const [controlsVisible, setControlsVisible] = useState(true)

  // Reset video state whenever the exercise changes
  useEffect(() => {
    const v = videoRef.current
    if (v) { v.pause(); v.currentTime = 0 }
    setVideoPlaying(false)
    setVideoMuted(true)
    setVideoProgress(0)
    setControlsVisible(true)
  }, [id])

  // Auto-hide controls after 3s when playing
  const resetHideTimer = useCallback(() => {
    clearTimeout(hideControlsTimer.current)
    setControlsVisible(true)
    hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [])

  const toggleVideo = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setVideoPlaying(true)
      resetHideTimer()
    } else {
      v.pause()
      setVideoPlaying(false)
      clearTimeout(hideControlsTimer.current)
      setControlsVisible(true)
    }
  }, [resetHideTimer])

  const handleTimeUpdate = useCallback((e) => {
    const v = e.currentTarget
    if (v.duration) setVideoProgress((v.currentTime / v.duration) * 100)
  }, [])

  const toggleMute = useCallback((e) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setVideoMuted(v.muted)
  }, [])

  if (!exercise) {
    return (
      <div className={styles.notFound}>
        <p>Exercise not found.</p>
        <Link to="/library">Back to library</Link>
      </div>
    )
  }

  const cat = CATEGORIES[exercise.category]
  const categoryExercises = EXERCISES.filter(e => e.category === exercise.category)
  const exerciseIndex = categoryExercises.findIndex(e => e.id === exercise.id)
  const nextExercise = categoryExercises[(exerciseIndex + 1) % categoryExercises.length]
  const metronomeProps = exercise.category === 'strength'
    ? { fixedBpm: 60 }
    : exercise.category === 'running'
      ? { allowedBpms: [160, 170, 180, 190] }
      : { fixedBpm: 60 }

  function handlePillarsComplete() {
    localStorage.setItem('gb_pillars_ready', new Date().toISOString().split('T')[0])
    setPillarsDone(true)
  }

  function handleStart() {
    setSessionState('active')
    setMetronomePlaying(true)
  }

  async function handleEndSession(status) {
    setMetronomePlaying(false)
    const today = getTodayEntry() || { scores: {}, note: '', sessions: [] }
    const sessions = today.sessions || []
    const newSession = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      status,
      tpr,
      qualityScore: status === 'missed' ? null : qualityScore,
      completedAt: new Date().toISOString(),
    }

    await saveEntry({
      ...today,
      sessions: [...sessions, newSession],
    })

    const performed = getPerformedExercises()
    localStorage.setItem('gb_performed_exercises', JSON.stringify([...new Set([...performed, exercise.id])]))
    setSessionState(status)
    setDetailsOpen(false)
    window.setTimeout(goNext, 450)
  }

  function goNext() {
    navigate(nextExercise ? `/library/${nextExercise.id}` : '/library')
  }

  return (
    <div className={styles.page}>
      <section className={styles.pillarBanner}>
        <p className={styles.pillarTitle}>5 Pillars</p>
        <div className={styles.pillarChips}>
          {PILLARS.map(pillar => <span key={pillar}>{pillar}</span>)}
        </div>
      </section>

      <div className={styles.topBar}>
        <button className={styles.back} onClick={goNext}>Next</button>
        <span className={styles.catBadge} style={{ color: cat.color }}>{cat.label}</span>
      </div>

      {!pillarsDone ? (
        <div className={styles.gate}>
          <PillarChecklist onComplete={handlePillarsComplete} />
        </div>
      ) : (
        <>
          {exercise.video ? (
            <div className={styles.videoSection}>
              <div
                className={styles.videoWrap}
                onClick={toggleVideo}
                onMouseMove={videoPlaying ? resetHideTimer : undefined}
              >
                <video
                  ref={videoRef}
                  src={exercise.video}
                  className={styles.videoEl}
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  onTimeUpdate={handleTimeUpdate}
                />

                {/* Centre play/pause button */}
                <div className={`${styles.videoCenterBtn} ${videoPlaying ? styles.videoCenterBtnPlaying : ''}`}>
                  <div className={styles.playRing}>
                    {videoPlaying
                      ? <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      : <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M8 5v14l11-7z"/></svg>
                    }
                  </div>
                  {!videoPlaying && <div className={styles.playPulse} />}
                </div>

                {/* Bottom controls bar */}
                <div className={`${styles.videoControls} ${videoPlaying && !controlsVisible ? styles.videoControlsHidden : ''}`}>
                  <div className={styles.videoProgressBar} onClick={e => e.stopPropagation()}>
                    <div className={styles.videoProgressFill} style={{ width: `${videoProgress}%` }} />
                    <div className={styles.videoProgressThumb} style={{ left: `${videoProgress}%` }} />
                  </div>
                  <div className={styles.videoBottom}>
                    <div className={styles.videoMeta}>
                      <span className={styles.videoMetaCat} style={{ color: cat.color }}>{cat.label}</span>
                      <span className={styles.videoMetaName}>{exercise.name}</span>
                    </div>
                    <button className={styles.videoMuteBtn} onClick={toggleMute} title={videoMuted ? 'Unmute' : 'Mute'}>
                      {videoMuted
                        ? <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l1.99 2 1.27-1.27L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>
                        : <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.animSection}>
              <ExerciseAnimation type={exercise.animation} cadence={exercise.cadence} />
            </div>
          )}

          <div className={styles.content}>
            <div className={styles.exerciseHeader}>
              <div>
                <p className={styles.blockLabel}>Current Movement</p>
                <h1 className={styles.name}>{exercise.name}</h1>
              </div>
              <span className={styles.sequenceBadge}>{exerciseIndex + 1} / {categoryExercises.length}</span>
            </div>

            <div className={styles.metronomeSection}>
              <Metronome playing={metronomePlaying} onPlayingChange={setMetronomePlaying} {...metronomeProps} />
            </div>

            <div className={styles.workflowCard}>
              <p className={styles.blockLabel}>Control Loop</p>
              <div className={styles.workflowBtns}>
                <button className={styles.startBtn} onClick={handleStart} disabled={sessionState === 'active'}>
                  {sessionState === 'active' ? 'Running' : 'Start'}
                </button>
                <button className={styles.stopBtn} onClick={() => handleEndSession('completed')} disabled={sessionState !== 'active'}>
                  Complete
                </button>
                <button className={styles.missedBtn} onClick={() => handleEndSession('missed')} disabled={sessionState !== 'active'}>
                  Missed
                </button>
              </div>
              {sessionState !== 'idle' && sessionState !== 'active' && (
                <div className={styles.nextWrap}>
                  <p>{sessionState === 'missed' ? 'Logged as missed.' : `Saved: ${tpr}s TPR, quality ${qualityScore}/10.`}</p>
                  <button className={styles.nextBtn} onClick={goNext}>Next: {nextExercise?.name || 'Library'}</button>
                </div>
              )}
            </div>

            <div className={styles.tprTracker}>
              <h2 className={styles.blockLabel}>Quality Metrics</h2>
              <p className={styles.tprDesc}>Capture control and form. TPR rewards patience; quality rewards clean movement.</p>
              <div className={styles.metricRow}>
                <label>
                  <span>TPR</span>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={tpr}
                    onChange={e => setTpr(Number(e.target.value))}
                    className={styles.tprSlider}
                  />
                </label>
                <div className={styles.tprDisplay}>
                  <span className={styles.tprValue}>{tpr}</span>
                  <span className={styles.tprUnit}>sec / rep</span>
                </div>
              </div>
              <div className={styles.metricRow}>
                <label>
                  <span>Quality</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={qualityScore}
                    onChange={e => setQualityScore(Number(e.target.value))}
                    className={styles.tprSlider}
                  />
                </label>
                <div className={styles.tprDisplay}>
                  <span className={styles.tprValue}>{qualityScore}</span>
                  <span className={styles.tprUnit}>/ 10</span>
                </div>
              </div>
              <p className={styles.tprTarget}>Target: {exercise.cadence || 'Slow & Controlled'}</p>
            </div>

            <details className={styles.detailPanel} open={detailsOpen} onToggle={e => setDetailsOpen(e.currentTarget.open)}>
              <summary>{detailsOpen ? 'Full Details' : 'Review Details'}</summary>
              <div className={styles.detailContent}>
                <div className={styles.block}>
                  <p className={styles.blockLabel}>Purpose</p>
                  <p className={styles.blockText}>{exercise.purpose}</p>
                </div>
                <div className={styles.block}>
                  <p className={styles.blockLabel}>The Cue</p>
                  <blockquote className={styles.cue}>"{exercise.cue}"</blockquote>
                </div>
                <div className={styles.block}>
                  <p className={styles.blockLabel}>How to do it</p>
                  <ol className={styles.steps}>
                    {exercise.steps.map((step, i) => <li key={i} className={styles.step}>{step}</li>)}
                  </ol>
                </div>
              </div>
            </details>

            {exercise.antiRotationNote && (
              <div className={styles.antiRotation}>
                <div className={styles.antiRotationIcon}>!</div>
                <div>
                  <p className={styles.antiRotationLabel}>Anti-Rotation Check</p>
                  <p className={styles.antiRotationText}>{exercise.antiRotationNote}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
