import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EXERCISES, CATEGORIES } from '../data/exercises'
import styles from './Library.module.css'

const PILLARS = ['Smile', 'Tall Puppet', 'Relaxed Fists', 'Uncurl Toes', 'Breathe']
const PLAN_CATEGORY_ORDER = ['running', 'strength']
const PRINCIPLES = [
  ['The Hip Engine', 'Hips are the engine. Knees follow; they never lead.'],
  ['The Stable Pillar', 'The lumbar spine stays quiet while hips and shoulders move around it.'],
  ['Core as the Bridge', 'The core connects upper and lower body so power does not leak.'],
]

export default function Library() {
  const [activeCategory, setActiveCategory] = useState(null)
  const filtered = activeCategory ? EXERCISES.filter(e => e.category === activeCategory) : []

  const stats = useMemo(() => {
    const inCategory = filtered.length
    const categoryWithVideo = filtered.filter(e => e.video).length
    return { inCategory, categoryWithVideo }
  }, [filtered])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Your Plan</p>
        <h1 className={styles.title}>Weekly modules</h1>
        <p className={styles.subtitle}>Choose Breathe, Mobility, or Strength Tools to begin.</p>
      </header>

      <section className={styles.pillarBanner}>
        <p>5 Pillars</p>
        <div>
          {PILLARS.map(pillar => <span key={pillar}>{pillar}</span>)}
        </div>
      </section>

      <section className={styles.weeklyModule}>
        <div className={styles.weeklyIcon}>90</div>
        <div className={styles.weeklyCopy}>
          <p className={styles.weeklyLabel}>Main course</p>
          <h2>Your Plan</h2>
          <p>Start with Breathe, then open Mobility or Strength Tools when you are ready for the exercise list.</p>
        </div>
      </section>

      <div className={styles.filters}>
        <Link to="/breathing" className={styles.filter}>
          Breathe
        </Link>
        {PLAN_CATEGORY_ORDER.map(id => (
          <button
            key={id}
            className={styles.filter + (activeCategory === id ? ' ' + styles.filterActive : '')}
            onClick={() => setActiveCategory(id)}
          >
            {CATEGORIES[id].label}
          </button>
        ))}
      </div>

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

      {activeCategory === 'running' && (
        <section className={styles.principlesBanner}>
          <p className={styles.principlesTitle}>The Three Principles</p>
          <div className={styles.principlesGrid}>
            {PRINCIPLES.map(([title, text]) => (
              <article key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </article>
            ))}
          </div>
        </section>
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
