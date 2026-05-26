import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import styles from './Home.module.css'

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
  const guestLocked = !user && !!guestName
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
  const feelLabel = feelScore !== null
    ? feelScore > 7
      ? 'Ready to build'
      : feelScore >= 4.5
        ? 'Keep it measured'
        : 'Recovery first'
    : 'Not checked in'

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <header className={styles.header}>
          <div>
            <p className={styles.subtitle}>La Ultra: Run &amp; Bee</p>
            <h1 className={styles.greeting}>{greeting}</h1>
          </div>
          <p className={styles.date}>{dateStr}</p>
        </header>
        <p className={styles.heroCopy}>
          Train the engine without fighting the body. Check in, choose the right work, and keep the long run honest.
        </p>
      </section>

      <section className={styles.about} aria-label="About this app">
        <p className={styles.aboutKicker}>What is this?</p>
        <p className={styles.aboutText}>
          La Ultra: Run &amp; Bee is your daily companion for movement and mindfulness, built by
          Dr.&nbsp;Rajat Chauhan. Each day you check in on how your body feels, then move through
          Breathe, Mobility, and Strength at your own pace — no metrics to chase, no rings to close.
          It is a quiet practice that helps you feel your own body again. Add it to your home screen
          and it runs like an app, even offline.
        </p>
      </section>

      <section className={styles.todayPanel} aria-label="Today">
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
            <p className={styles.feelLabel}>{feelLabel}</p>
            <p className={styles.feelSub}>
              {today
                ? 'Tap to review or update your check-in.'
                : 'A two-minute check-in tunes your day.'}
            </p>
            {guestLocked && <span className={styles.lockBadge}>Sign in to log</span>}
          </div>
        </Link>

        <div className={styles.metricGrid} aria-label="Journey stats">
          <div className={styles.metric}>
            <span className={styles.metricValue}>{streak}</span>
            <span className={styles.metricLabel}>day streak</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{progressPct}%</span>
            <span className={styles.metricLabel}>complete</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{daysToGo}</span>
            <span className={styles.metricLabel}>days to go</span>
          </div>
        </div>
      </section>

      <section className={styles.progressBlock}>
        <div className={styles.progressTop}>
          <div className={styles.progressLeft}>
            <p className={styles.progressKicker}>Journey</p>
            <p className={styles.progressDays}>
              Day {dayOfJourney} <span>of {commitment}</span>
            </p>
          </div>
          <span className={styles.progressPercent}>{progressPct}%</span>
        </div>
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <p className={styles.progressFoot}>
          {daysToGo} days left in your {commitment}-day commitment
        </p>
      </section>

      <section className={styles.actionGrid}>
        <Link
          to="/library"
          className={styles.action + ' ' + styles.actionPrimary + (guestLocked ? ' ' + styles.actionLocked : '')}
        >
          <span className={styles.actionEyebrow}>Next</span>
          <span className={styles.actionTitle}>Open Today&apos;s Plan</span>
          <span className={styles.actionSub}>Running, mobility, and strength</span>
          {guestLocked && <span className={styles.actionLock}>Locked</span>}
        </Link>
        <Link
          to="/breathing"
          className={styles.action + (guestLocked ? ' ' + styles.actionLocked : '')}
        >
          <span className={styles.actionEyebrow}>Reset</span>
          <span className={styles.actionTitle}>Breathe at 5 BPM</span>
          <span className={styles.actionSub}>Settle before training</span>
          {guestLocked && <span className={styles.actionLock}>Locked</span>}
        </Link>
        <Link
          to="/functional-tests"
          className={styles.action + (guestLocked ? ' ' + styles.actionLocked : '')}
        >
          <span className={styles.actionEyebrow}>Weekly</span>
          <span className={styles.actionTitle}>Take Functional Test</span>
          <span className={styles.actionSub}>Activated weekly</span>
          {guestLocked && <span className={styles.actionLock}>Locked</span>}
        </Link>
        <Link
          to="/history"
          className={styles.action + (guestLocked ? ' ' + styles.actionLocked : '')}
        >
          <span className={styles.actionEyebrow}>Trends</span>
          <span className={styles.actionTitle}>Progress</span>
          <span className={styles.actionSub}>Feel, workouts, and change</span>
          {guestLocked && <span className={styles.actionLock}>Locked</span>}
        </Link>
      </section>

      <section className={styles.historyVisual} aria-label="Recent history">
        <div>
          <p className={styles.historyKicker}>History</p>
          <h2>Recent Feel pattern</h2>
        </div>
        <div className={styles.historyBars}>
          {entries.slice(-7).map(entry => {
            const score = computeFeelScore(entry.scores || {})
            return (
              <span
                key={entry.date}
                className={styles.historyBar}
                style={{ height: `${Math.max(12, score * 10)}%` }}
                title={`${entry.date}: ${score.toFixed(1)}/10`}
              />
            )
          })}
          {entries.length === 0 && <p className={styles.historyEmpty}>Your Feel and workout history will appear here.</p>}
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
