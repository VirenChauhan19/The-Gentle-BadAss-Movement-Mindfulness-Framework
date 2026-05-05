import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EXERCISES, CATEGORIES } from '../data/exercises'
import styles from './Library.module.css'

export default function Library() {
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = activeCategory === 'all'
    ? EXERCISES
    : EXERCISES.filter(e => e.category === activeCategory)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Movement Library</p>
        <h1 className={styles.title}>Learn to Feel</h1>
        <p className={styles.subtitle}>Animations built on three principles: Hip Engine · Stable Pillar · Core as Bridge</p>
      </header>

      <section className={styles.weeklyModule}>
        <div>
          <p className={styles.weeklyLabel}>Weekly Module</p>
          <h2>Functional Tests</h2>
          <p>Use Slump, Hip Rotation, Straight Leg Raise, and other tests once a week to notice change. Daily work should focus on breath, quality movement, and control.</p>
        </div>
        <button onClick={() => setActiveCategory('functional')}>Open weekly tests</button>
      </section>

      <div className={styles.filters}>
        <button
          className={styles.filter + (activeCategory === 'all' ? ' ' + styles.filterActive : '')}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
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

      {activeCategory !== 'all' && (
        <p className={styles.categoryDesc}>{CATEGORIES[activeCategory]?.description}</p>
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
      <span className={styles.arrow}>→</span>
    </Link>
  )
}
