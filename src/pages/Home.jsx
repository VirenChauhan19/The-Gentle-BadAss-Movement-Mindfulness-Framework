import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import styles from './Home.module.css'

const PROGRAM_AUDIENCES = [
  {
    title: 'Women 35+',
    text: 'For women who have spent years caring for everyone else and now need a system that respects their body.',
  },
  {
    title: 'Older Adults',
    text: 'For people who want strength, confidence, and better daily movement without performative toughness.',
  },
  {
    title: 'Recovering Bodies',
    text: 'For anyone returning from injury, chronic aches, surgery, or a long season away from movement.',
  },
  {
    title: 'Fresh Starters',
    text: 'For beginners who want to run and move without angry landings or punishment-based training.',
  },
  {
    title: 'Chronic Warriors',
    text: 'For people managing chronic disease who need movement as medicine, not another stressor.',
  },
  {
    title: 'Experienced Runners',
    text: 'For runners ready to relearn form, cadence, breath, and control from the ground up.',
  },
]

const PHILOSOPHY = [
  {
    term: 'I',
    text: 'Your identity as a runner: the person who chooses to show up at the right scale today.',
  },
  {
    term: 'MY',
    text: 'Your body and biological engine: maintained, listened to, and respected.',
  },
  {
    term: 'ME',
    text: 'The felt experience of movement: the quiet awareness that appears when breath, posture, and rhythm align.',
  },
]

export default function Home() {
  const { entries, getTodayEntry, profile, user, guestName } = useData()
  const today = getTodayEntry()
  const guestLocked = Boolean(guestName && !user)
  const streak = computeStreak(entries)
  const feelScore = today ? computeFeelScore(today.scores || {}) : null
  const dayOfJourney = entries.length

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.subtitle}>La Ultra: Run &amp; Bee</p>
          <h1 className={styles.title}>Mountains Within</h1>
          <p className={styles.heroCopy}>Distance and toughness are relative. Your mountain is the honest edge of your body today.</p>
          <p className={styles.date}>{dateStr}</p>
        </div>
      </header>

      <section className={styles.cards}>
        <Link to={guestLocked ? '/admin' : '/journal'} className={styles.card + ' ' + styles.cardPrimary + (guestLocked ? ' ' + styles.cardLocked : '')}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Today's Feel</span>
            {guestLocked && <span className={styles.lockBadge}>Locked</span>}
            {feelScore !== null && (
              <span className={styles.score}>{feelScore.toFixed(1)}</span>
            )}
          </div>
          {today ? (
            <p className={styles.cardBody}>Entry logged. Tap to review.</p>
          ) : (
            <p className={styles.cardBody}>How does your body feel today?</p>
          )}
          <span className={styles.cardArrow}>-&gt;</span>
        </Link>

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

        <Link to={guestLocked ? '/admin' : '/library'} className={styles.card + ' ' + styles.cardMove + (guestLocked ? ' ' + styles.cardLocked : '')}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Movement Library</span>
            {guestLocked && <span className={styles.lockBadge}>Locked</span>}
          </div>
          <p className={styles.cardBody}>{guestLocked ? 'Sign in to unlock TPR, quality scoring, and exercise flow.' : 'Functional tests, strength tools, and running drills.'}</p>
          <span className={styles.cardArrow}>-&gt;</span>
        </Link>

        <Link to={guestLocked ? '/admin' : '/history'} className={styles.card + ' ' + styles.cardHistory + (guestLocked ? ' ' + styles.cardLocked : '')}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>History</span>
            {guestLocked && <span className={styles.lockBadge}>Locked</span>}
          </div>
          <p className={styles.cardBody}>{guestLocked ? 'Sign in to view and sync long-term progress.' : 'Track Feel, Move quality, TPR, and clean movement over time.'}</p>
          <span className={styles.cardArrow}>-&gt;</span>
        </Link>
      </section>

      <section className={styles.fitSection}>
        <div className={styles.fitIntro}>
          <p className={styles.sectionKicker}>Who this is for</p>
          <h2 className={styles.fitTitle}>A movement framework for people whose starting line is personal.</h2>
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
            <h2>The I - My - Me Philosophy</h2>
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

      <footer className={styles.footer}>
        <p>By Dr. Rajat Chauhan</p>
        <p className={styles.footerSub}>La Ultra: Run &amp; Bee</p>
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
