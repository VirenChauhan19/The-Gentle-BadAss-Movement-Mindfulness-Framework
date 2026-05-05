import { useState } from 'react'
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
            style={activeCategory === id ? { background: cat.color, borderColor: cat.color, color: '#fff' } : {}}
            onClick={() => setActiveCategory(id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className={styles.categoryDesc}>{CATEGORIES[activeCategory]?.description}</p>

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

      <div className={styles.grid}>
        {filtered.map(exercise => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </div>
  )
}

function ExerciseCard({ exercise }) {
  const cat = CATEGORIES[exercise.category]
  return (
    <Link to={`/library/${exercise.id}`} className={styles.card}>
      <div className={styles.cardCat} style={{ color: cat.color }}>
        {cat.label}
      </div>
      <h3 className={styles.cardName}>{exercise.name}</h3>
      <p className={styles.cardPurpose}>{exercise.purpose}</p>
      {exercise.cadence && (
        <span className={styles.cadenceBadge}>{exercise.cadence}</span>
      )}
      <span className={styles.arrow}>-&gt;</span>
    </Link>
  )
}
