import { useState } from 'react'
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
          <div className={styles.animSection}>
            <ExerciseAnimation type={exercise.animation} cadence={exercise.cadence} />
          </div>

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
