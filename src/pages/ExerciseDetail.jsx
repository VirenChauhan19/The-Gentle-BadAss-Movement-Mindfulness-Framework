import { useParams, Link } from 'react-router-dom'
import { EXERCISES, CATEGORIES } from '../data/exercises'
import ExerciseAnimation from '../components/ExerciseAnimation'
import styles from './ExerciseDetail.module.css'

export default function ExerciseDetail() {
  const { id } = useParams()
  const exercise = EXERCISES.find(e => e.id === id)

  if (!exercise) {
    return (
      <div className={styles.notFound}>
        <p>Exercise not found.</p>
        <Link to="/library">← Back to library</Link>
      </div>
    )
  }

  const cat = CATEGORIES[exercise.category]

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link to="/library" className={styles.back}>← Back</Link>
        <span className={styles.catBadge} style={{ color: cat.color }}>{cat.label}</span>
      </div>

      <div className={styles.animSection}>
        <ExerciseAnimation type={exercise.animation} cadence={exercise.cadence} />
      </div>

      <div className={styles.content}>
        <h1 className={styles.name}>{exercise.name}</h1>

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

        {exercise.cadence && (
          <div className={styles.cadenceBlock}>
            <p className={styles.cadenceTitle}>10-Second Cadence</p>
            <p className={styles.cadenceDetail}>{exercise.cadence}</p>
            <p className={styles.cadenceNote}>Control over momentum. Feel every inch of the movement.</p>
          </div>
        )}
      </div>
    </div>
  )
}
