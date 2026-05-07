import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import styles from './Home.module.css'
import PillarVideoCard from '../components/PillarVideoCard'

const PILLAR_VIDEOS = [
  {
    title: 'Smile & Relax',
    subtitle: 'Release tension — face first',
    url: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Smile%20-%20Relax%20Ms%20WebApp.mp4?alt=media&token=069005ef-9089-4892-9821-66563788280a',
  },
  {
    title: 'Orange Squeeze',
    subtitle: 'Activate without gripping',
    url: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Orange%20Squeeze%20WebApp.mp4?alt=media&token=b75ed566-013c-4eb1-9aee-6c09aa117465',
  },
]

const DAILY_INTENTIONS = [
  'Move with awareness, not aggression.',
  'Breath before pace. Posture before speed.',
  'The right scale today is honest, not heroic.',
  'Listen to your body. It is not the enemy.',
  'Run quietly. Land softly. Move kindly.',
  'Strength is the absence of unnecessary effort.',
  'Today is a session, not a verdict.',
]

const RING_R = 64
const RING_C = 2 * Math.PI * RING_R

export default function Home() {
  const { entries, getTodayEntry, profile, user, guestName } = useData()
  const today = getTodayEntry()
  const guestLocked = Boolean(guestName && !user)
  const streak = computeStreak(entries)
  const feelScore = today ? computeFeelScore(today.scores || {}) : null
  const dayOfJourney = entries.length
  const commitment = profile?.commitment || 270
  const daysToGo = Math.max(0, commitment - dayOfJourney)
  const progressPct = Math.min(100, Math.round((dayOfJourney / commitment) * 100))

  const rawName = user?.displayName || guestName || profile?.name || ''
  const firstName = rawName.split(' ')[0]
  const hour = new Date().getHours()
  const greetingTime =
    hour < 5 ? 'Hello' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' : 'Good evening'
  const greeting = firstName ? `${greetingTime}, ${firstName}` : greetingTime

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  const intention = DAILY_INTENTIONS[dayOfYear % DAILY_INTENTIONS.length]

  const ringPct = feelScore !== null ? feelScore / 10 : 0
  const ringOffset = RING_C * (1 - ringPct)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.subtitle}>La Ultra: Run &amp; Bee</p>
        <h1 className={styles.greeting}>{greeting}</h1>
        <p className={styles.date}>{dateStr}</p>
      </header>

      <section className={styles.feelHero}>
        <Link
          to="/journal"
          className={styles.feelCard + (guestLocked ? ' ' + styles.feelCardLocked : '')}
        >
          <div className={styles.ring}>
            <svg viewBox="0 0 160 160" className={styles.ringSvg}>
              <defs>
                <linearGradient id="feelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a8c89f" />
                  <stop offset="100%" stopColor="#d7e5d1" />
                </linearGradient>
              </defs>
              <circle
                cx="80"
                cy="80"
                r={RING_R}
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r={RING_R}
                fill="none"
                stroke="url(#feelGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 80 80)"
                className={styles.ringProgress}
              />
            </svg>
            <div className={styles.ringCenter}>
              {feelScore !== null ? (
                <>
                  <span className={styles.ringScore}>{feelScore.toFixed(1)}</span>
                  <span className={styles.ringScoreSlash}>/10</span>
                </>
              ) : (
                <span className={styles.ringCheck}>{guestLocked ? 'Sign in' : 'Check in'} <span aria-hidden="true">-&gt;</span></span>
              )}
            </div>
          </div>
          <div className={styles.feelMeta}>
            <p className={styles.feelKicker}>Today's Feel</p>
            <p className={styles.feelHeading}>
              {today ? 'Logged for today' : 'How does your body feel?'}
            </p>
            <p className={styles.feelSub}>
              {today
                ? 'Tap to review or update your check-in.'
                : 'A two-minute check-in tunes your day.'}
            </p>
            {guestLocked && <span className={styles.lockBadge}>Sign in to log</span>}
          </div>
        </Link>
      </section>

      <section className={styles.progressBlock}>
        <div className={styles.progressTop}>
          <div className={styles.progressLeft}>
            <p className={styles.progressKicker}>Journey</p>
            <p className={styles.progressDays}>
              Day {dayOfJourney} <span>of {commitment}</span>
            </p>
          </div>
          <div className={styles.streakBadge}>
            <span className={styles.streakNum}>{streak}</span>
            <span className={styles.streakLabel}>day streak</span>
          </div>
        </div>
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <p className={styles.progressFoot}>
          {progressPct}% complete · {daysToGo} days to go
        </p>
      </section>

      <section className={styles.actionGrid}>
        <Link
          to="/library"
          className={styles.action + (guestLocked ? ' ' + styles.actionLocked : '')}
        >
          <span className={styles.actionTitle}>Movement Library</span>
          <span className={styles.actionSub}>Tests · drills · strength</span>
          {guestLocked && <span className={styles.actionLock}>Locked</span>}
        </Link>
        <Link
          to="/history"
          className={styles.action + (guestLocked ? ' ' + styles.actionLocked : '')}
        >
          <span className={styles.actionTitle}>History</span>
          <span className={styles.actionSub}>Trends &amp; progress</span>
          {guestLocked && <span className={styles.actionLock}>Locked</span>}
        </Link>
        <Link to="/breathing" className={styles.action}>
          <span className={styles.actionTitle}>Breathing</span>
          <span className={styles.actionSub}>Cadence &amp; ease</span>
        </Link>
        <Link to="/coach" className={styles.action}>
          <span className={styles.actionTitle}>Coach</span>
          <span className={styles.actionSub}>Goals &amp; check-ins</span>
        </Link>
      </section>

      <section className={styles.pillarVideos}>
        <p className={styles.pillarVideosKicker}>5 Pillars · Technique</p>
        <div className={styles.pillarVideosRow}>
          {PILLAR_VIDEOS.map(v => (
            <PillarVideoCard key={v.title} title={v.title} subtitle={v.subtitle} url={v.url} />
          ))}
        </div>
      </section>

      <section className={styles.intention}>
        <p className={styles.intentionKicker}>Today's intention</p>
        <p className={styles.intentionText}>&ldquo;{intention}&rdquo;</p>
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
