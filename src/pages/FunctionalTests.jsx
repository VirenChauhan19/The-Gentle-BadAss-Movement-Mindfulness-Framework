import { Link } from 'react-router-dom'
import { EXERCISES, CATEGORIES } from '../data/exercises'
import styles from './Library.module.css'

const TESTS = EXERCISES.filter(exercise => exercise.category === 'functional')

export default function FunctionalTests() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Functional Tests</p>
        <h1 className={styles.title}>Weekly movement checks</h1>
        <p className={styles.subtitle}>
          Use these tests once a week to see what is changing before you add more running volume.
        </p>
      </header>

      <section className={styles.weeklyModule}>
        <div className={styles.weeklyIcon}>7</div>
        <div className={styles.weeklyCopy}>
          <p className={styles.weeklyLabel}>Activated weekly</p>
          <h2>Take the test set</h2>
          <p>Each test opens in its own box with cues, steps, and quality notes.</p>
        </div>
      </section>

      <div className={styles.grid}>
        {TESTS.map((exercise, index) => (
          <Link
            key={exercise.id}
            to={`/library/${exercise.id}`}
            className={styles.card}
            style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
          >
            <div className={styles.cardAccent} style={{ background: CATEGORIES.functional.color }} aria-hidden="true" />
            <div className={styles.cardTop}>
              <div className={styles.cardCat} style={{ color: CATEGORIES.functional.color }}>Weekly test</div>
              {exercise.video && (
                <span className={styles.videoBadge}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><path d="M8 5v14l11-7z"/></svg>
                  Video
                </span>
              )}
            </div>
            <h3 className={styles.cardName}>{exercise.name}</h3>
            <p className={styles.cardPurpose}>{exercise.purpose}</p>
            <div className={styles.cardFooter}>
              <span className={styles.cardOpenLabel}>Open test</span>
              <span className={styles.arrow}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
