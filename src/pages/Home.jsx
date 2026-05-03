import { Link } from 'react-router-dom'
import { getTodayEntry, computeFeelScore, getJournalEntries } from '../data/storage'
import styles from './Home.module.css'

export default function Home() {
  const today = getTodayEntry()
  const allEntries = getJournalEntries()
  const streak = computeStreak(allEntries)
  const feelScore = today ? computeFeelScore(today.scores || {}) : null
  const dayOfJourney = allEntries.length

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.subtitle}>The Gentle BadAss</p>
          <h1 className={styles.title}>Movement &<br />Mindfulness</h1>
          <p className={styles.date}>{dateStr}</p>
        </div>
      </header>

      <section className={styles.cards}>
        {/* Today's Feel Card */}
        <Link to="/journal" className={styles.card + ' ' + styles.cardPrimary}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Today's Feel</span>
            {feelScore !== null && (
              <span className={styles.score}>{feelScore.toFixed(1)}</span>
            )}
          </div>
          {today ? (
            <p className={styles.cardBody}>Entry logged. Tap to review.</p>
          ) : (
            <p className={styles.cardBody}>How does your body feel today?</p>
          )}
          <span className={styles.cardArrow}>→</span>
        </Link>

        {/* Journey progress */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{dayOfJourney}</span>
            <span className={styles.statLabel}>Days logged</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>{streak}</span>
            <span className={styles.statLabel}>Day streak</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>{270 - dayOfJourney > 0 ? 270 - dayOfJourney : 0}</span>
            <span className={styles.statLabel}>Days to go</span>
          </div>
        </div>

        {/* Move section */}
        <Link to="/library" className={styles.card + ' ' + styles.cardMove}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Movement Library</span>
          </div>
          <p className={styles.cardBody}>Functional tests · Strength tools · Running drills</p>
          <span className={styles.cardArrow}>→</span>
        </Link>

        {/* History */}
        <Link to="/history" className={styles.card + ' ' + styles.cardHistory}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Feel History</span>
          </div>
          <p className={styles.cardBody}>Track your 30–270 day journey.</p>
          <span className={styles.cardArrow}>→</span>
        </Link>
      </section>

      {/* Principles */}
      <section className={styles.principles}>
        <h2 className={styles.principlesTitle}>The Three Principles</h2>
        <div className={styles.principle}>
          <span className={styles.principleIcon}>🦴</span>
          <div>
            <strong>The Hip Engine</strong>
            <p>Your hips are the engine. Your knees follow — they never lead.</p>
          </div>
        </div>
        <div className={styles.principle}>
          <span className={styles.principleIcon}>🪄</span>
          <div>
            <strong>The Stable Pillar</strong>
            <p>The lumbar spine stays still. Hips and shoulders move around it.</p>
          </div>
        </div>
        <div className={styles.principle}>
          <span className={styles.principleIcon}>🌉</span>
          <div>
            <strong>Core as the Bridge</strong>
            <p>The core connects your upper and lower body. Without it, power leaks.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>By Dr. Rajat Chauhan</p>
        <p className={styles.footerSub}>MoveMint Medicine · Run &amp; Bee</p>
      </footer>
    </div>
  )
}

function computeStreak(entries) {
  if (!entries.length) return 0
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  const today = new Date().toISOString().split('T')[0]
  let cursor = today
  for (const entry of sorted) {
    if (entry.date === cursor) {
      streak++
      const d = new Date(cursor)
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().split('T')[0]
    } else {
      break
    }
  }
  return streak
}
