import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { EXERCISES, CATEGORIES } from '../data/exercises'
import ExerciseAnimation from '../components/ExerciseAnimation'
import PillarChecklist from '../components/PillarChecklist'
import Metronome from '../components/Metronome'
import { useData } from '../context/DataContext'
import styles from './ExerciseDetail.module.css'

export default function ExerciseDetail() {
  const { id } = useParams()
  const { saveEntry, getTodayEntry } = useData()
  const exercise = EXERCISES.find(e => e.id === id)
  const [pillarsDone, setPillarsDone] = useState(false)
  const [tpr, setTpr] = useState(10) // Default 10s TPR
  const [sessionSaved, setSessionSaved] = useState(false)

  if (!exercise) {
    return (
      <div className={styles.notFound}>
        <p>Exercise not found.</p>
        <Link to="/library">← Back to library</Link>
      </div>
    )
  }

  const cat = CATEGORIES[exercise.category]

  async function handleCompleteSession() {
    const today = getTodayEntry() || { scores: {}, note: '', sessions: [] }
    const sessions = today.sessions || []
    const newSession = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      tpr: tpr,
      completedAt: new Date().toISOString()
    }
    
    await saveEntry({ 
      ...today, 
      sessions: [...sessions, newSession] 
    })
    setSessionSaved(true)
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link to="/library" className={styles.back}>← Back</Link>
        <span className={styles.catBadge} style={{ color: cat.color }}>{cat.label}</span>
      </div>

      {!pillarsDone ? (
        <div className={styles.gate}>
          <PillarChecklist onComplete={() => setPillarsDone(true)} />
        </div>
      ) : (
        <>
          <div className={styles.animSection}>
            <ExerciseAnimation type={exercise.animation} cadence={exercise.cadence} />
          </div>

          <div className={styles.content}>
            <h1 className={styles.name}>{exercise.name}</h1>
            
            <div className={styles.metronomeSection}>
              <Metronome />
            </div>

            <div className={styles.tprTracker}>
              <h2 className={styles.blockLabel}>TPR Mastery (Time Per Rep)</h2>
              <p className={styles.tprDesc}>How slow can you go? Reward control over momentum.</p>
              <div className={styles.tprControl}>
                <input 
                  type="range" 
                  min="2" 
                  max="30" 
                  value={tpr} 
                  onChange={(e) => setTpr(Number(e.target.value))}
                  className={styles.tprSlider}
                />
                <div className={styles.tprDisplay}>
                  <span className={styles.tprValue}>{tpr}</span>
                  <span className={styles.tprUnit}>Seconds</span>
                </div>
              </div>
              <p className={styles.tprTarget}>Target: {exercise.cadence || 'Slow & Controlled'}</p>
            </div>

            <div className={styles.block}>
              <p className={styles.blockLabel}>Purpose</p>
              <p className={styles.blockText}>{exercise.purpose}</p>
            </div>

            <div className={styles.block}>
              <p className={styles.blockLabel}>The Cue</p>
              <blockquote className={styles.cue}>"{exercise.cue}"</blockquote>
            </div>

            <div className={styles.completeSection}>
              <button 
                className={styles.completeBtn + (sessionSaved ? ' ' + styles.saved : '')}
                onClick={handleCompleteSession}
                disabled={sessionSaved}
              >
                {sessionSaved ? 'Session Logged ✓' : 'Complete Session'}
              </button>
              {sessionSaved && (
                <p className={styles.congrats}>
                  Great control! Your TPR of {tpr}s has been recorded. 
                  Don't forget to write your reflection in the Journal.
                </p>
              )}
            </div>

            <div className={styles.block}>
              <p className={styles.blockLabel}>How to do it</p>
              <ol className={styles.steps}>
                {exercise.steps.map((step, i) => (
                  <li key={i} className={styles.step}>{step}</li>
                ))}
              </ol>
            </div>

            {exercise.antiRotationNote && (
              <div className={styles.antiRotation}>
                <div className={styles.antiRotationIcon}>⚠</div>
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
