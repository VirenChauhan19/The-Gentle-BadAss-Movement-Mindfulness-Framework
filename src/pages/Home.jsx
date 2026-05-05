import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import styles from './Home.module.css'

const PROGRAM_AUDIENCES = [
  {
    title: 'The Recovering',
    text: 'Those coming back from injury or managing chronic aches and pains.',
  },
  {
    title: 'The Chronic Warriors',
    text: 'People managing chronic diseases who need movement as medicine.',
  },
  {
    title: 'The Fresh Starters',
    text: 'Absolute beginners who want to "Run & Bee" without the "Angry Landings".',
  },
  {
    title: 'The Seekers',
    text: 'Advanced runners who realize that after 20 years, they still do not actually know their own movement.',
  },
  {
    title: 'Women',
    text: 'If you have been too busy taking care of everyone else but ignored yourself, now is the time you focus on yourself.',
  },
  {
    title: 'Elderly',
    text: 'Maybe you have retired from work, but that does not mean you need to retire from life. Improve your quality of life by moving better.',
  },
]

const PHILOSOPHY = [
  {
    term: 'I',
    text: 'Your identity as a runner - who chooses to show up.',
  },
  {
    term: 'MY',
    text: 'Your body and biological engine - we are learning to maintain and respect.',
  },
  {
    term: 'ME',
    text: 'The consciousness and experience of movement - the quiet consciousness that emerges when breath, posture, and movement align.',
  },
]

export default function Home() {
  const { entries, getTodayEntry, profile } = useData()
  const today = getTodayEntry()
  const streak = computeStreak(entries)
  const feelScore = today ? computeFeelScore(today.scores || {}) : null
  const dayOfJourney = entries.length

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.subtitle}>La Ultra-The High</p>
          <h1 className={styles.title}>Run &amp; Bee</h1>
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
            <span className={styles.statNum}>{Math.max(0, (profile?.commitment || 270) - dayOfJourney)}</span>
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

      <section className={styles.fitSection}>
        <div className={styles.fitIntro}>
          <p className={styles.sectionKicker}>Who this is for</p>
          <h2 className={styles.fitTitle}>This program is for you if you belong to any one or more categories below.</h2>
        </div>

        <div className={styles.audienceGrid}>
          {PROGRAM_AUDIENCES.map(item => (
            <article key={item.title} className={styles.audienceCard}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <div className={styles.philosophy}>
          <div className={styles.philosophyIntro}>
            <p className={styles.sectionKicker}>Core framework</p>
            <h2>The &quot;I - My - Me&quot; Philosophy</h2>
          </div>
          <div className={styles.philosophyGrid}>
            {PHILOSOPHY.map(item => (
              <article key={item.term} className={styles.philosophyItem}>
                <span>{item.term}</span>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
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
        <p className={styles.footerSub}>La Ultra-The High · Run &amp; Bee</p>
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
