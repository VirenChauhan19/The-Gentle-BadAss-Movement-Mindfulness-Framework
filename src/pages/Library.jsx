import { useMemo } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { EXERCISES, CATEGORIES } from '../data/exercises'
import PlanTabs from '../components/PlanTabs'
import { isReminderDone } from './Reminder'
import Coach from './Coach'
import styles from './Library.module.css'

const PLAN_CATEGORY_ORDER = ['running', 'strength']

export default function Library() {
  const [searchParams] = useSearchParams()
  const requestedSection = searchParams.get('section')

  // Opening Plan fresh (no section) sends the runner through the Reminder
  // page first — the 5 pillars and 3 principles — once per day. After that
  // it lands on Breathe as usual.
  const redirectToReminder = !requestedSection && !isReminderDone()

  const activeSection = ['breathe', 'coach', ...PLAN_CATEGORY_ORDER].includes(requestedSection)
    ? requestedSection
    : 'breathe'
  const activeCategory = PLAN_CATEGORY_ORDER.includes(activeSection) ? activeSection : null
  const filtered = activeCategory ? EXERCISES.filter(e => e.category === activeCategory) : []

  const stats = useMemo(() => {
    const inCategory = filtered.length
    const categoryWithVideo = filtered.filter(e => e.video).length
    return { inCategory, categoryWithVideo }
  }, [filtered])

  if (redirectToReminder) {
    return <Navigate to="/reminder" replace />
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Your Plan</p>
        <h1 className={styles.title}>Weekly modules</h1>
        <p className={styles.subtitle}>Choose Breathe, Running, Mobility, or Strength Tools to begin.</p>
      </header>

      <section className={styles.weeklyModule}>
        <div className={styles.weeklyIcon}>90</div>
        <div className={styles.weeklyCopy}>
          <p className={styles.weeklyLabel}>Main course</p>
          <h2>Your Plan</h2>
          <p>Start with Breathe, build your Running plan, then open Mobility or Strength Tools when you are ready.</p>
        </div>
      </section>

      <PlanTabs active={activeSection} />

      {activeSection === 'breathe' && (
        <section className={styles.breathePanel}>
          <div>
            <p className={styles.breatheLabel}>Breathe</p>
            <h2>5 BPM breathing practice</h2>
            <p>Use this before Mobility or Strength Tools to settle your rhythm and start clean.</p>
          </div>
          <Link to="/breathing" className={styles.breatheButton}>Open breathing timer</Link>
        </section>
      )}

      {activeSection === 'coach' && (
        <section className={styles.runningPanel}>
          <Coach embedded />
        </section>
      )}

      {activeCategory && (
        <div className={styles.categoryHeader}>
          <p className={styles.categoryDesc}>{CATEGORIES[activeCategory]?.description}</p>
          <div className={styles.categoryStats}>
            <span><strong>{stats.inCategory}</strong> exercises</span>
            {stats.categoryWithVideo > 0 && (
              <span className={styles.statsVideoCount}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><path d="M8 5v14l11-7z"/></svg>
                {stats.categoryWithVideo} with video
              </span>
            )}
          </div>
        </div>
      )}

      {activeCategory && (
        <div className={styles.grid} key={activeCategory}>
          {filtered.map((exercise, i) => (
            <ExerciseCard key={exercise.id} exercise={exercise} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function ExerciseCard({ exercise, index = 0 }) {
  const cat = CATEGORIES[exercise.category]
  return (
    <Link
      to={`/library/${exercise.id}`}
      className={styles.card}
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      <div className={styles.cardAccent} style={{ background: cat.color }} aria-hidden="true" />
      <div className={styles.cardTop}>
        <div className={styles.cardCat} style={{ color: cat.color }}>{cat.label}</div>
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
        {exercise.cadence
          ? <span className={styles.cadenceBadge}>{exercise.cadence}</span>
          : <span className={styles.cardOpenLabel}>Tap to begin</span>
        }
        <span className={styles.arrow}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </span>
      </div>
    </Link>
  )
}
