import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EXERCISES, CATEGORIES } from '../data/exercises'
import styles from './Library.module.css'

const PILLARS = ['Smile', 'Tall Puppet', 'Relaxed Fists', 'Uncurl Toes', 'Breathe']
const PRINCIPLES = [
  ['The Hip Engine', 'Hips are the engine. Knees follow; they never lead.'],
  ['The Stable Pillar', 'The lumbar spine stays quiet while hips and shoulders move around it.'],
  ['Core as the Bridge', 'The core connects upper and lower body so power does not leak.'],
]

export default function Library() {
  const [activeCategory, setActiveCategory] = useState('functional')
  const filtered = EXERCISES.filter(e => e.category === activeCategory)

  const stats = useMemo(() => {
    const total = EXERCISES.length
    const withVideo = EXERCISES.filter(e => e.video).length
    const inCategory = filtered.length
    const categoryWithVideo = filtered.filter(e => e.video).length
    return { total, withVideo, inCategory, categoryWithVideo }
  }, [filtered])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Movement Library</p>
        <h1 className={styles.title}>Learn to Feel</h1>
        <p className={styles.subtitle}>Slow, clinical movement practice built around quality before quantity.</p>
      </header>

      <section className={styles.pillarBanner}>
        <p>5 Pillars</p>
        <div>
          {PILLARS.map(pillar => <span key={pillar}>{pillar}</span>)}
        </div>
      </section>

      <section className={styles.weeklyModule}>
        <div className={styles.weeklyIcon}>7</div>
        <div className={styles.weeklyCopy}>
          <p className={styles.weeklyLabel}>Weekly Module</p>
          <h2>Functional Tests</h2>
          <p>Use Slump, Hip Rotation, Straight Leg Raise, and other tests once a week to notice change. Daily work stays focused on breath, quality movement, and control.</p>
        </div>
        <button onClick={() => setActiveCategory('functional')}>Open weekly tests</button>
      </section>

      <div className={styles.filters}>
        {Object.entries(CATEGORIES).map(([id, cat]) => (
          <button
            key={id}
            className={styles.filter + (activeCategory === id ? ' ' + styles.filterActive : '')}
            onClick={() => setActiveCategory(id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

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

      <div className={styles.grid} key={activeCategory}>
        {filtered.map((exercise, i) => (
          <ExerciseCard key={exercise.id} exercise={exercise} index={i} />
        ))}
      </div>
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
