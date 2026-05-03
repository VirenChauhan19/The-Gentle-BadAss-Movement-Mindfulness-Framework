import { getJournalEntries, computeFeelScore } from '../data/storage'
import { Link } from 'react-router-dom'
import styles from './History.module.css'

export default function History() {
  const entries = getJournalEntries().sort((a, b) => b.date.localeCompare(a.date))

  const scores = entries.map(e => ({
    date: e.date,
    score: computeFeelScore(e.scores || {})
  }))

  const avg = scores.length
    ? Math.round(scores.reduce((s, e) => s + e.score, 0) / scores.length * 10) / 10
    : null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Feel History</p>
        <h1 className={styles.title}>Your Journey</h1>
        {avg !== null && (
          <p className={styles.avgText}>Average feel score: <strong>{avg}</strong> across {entries.length} {entries.length === 1 ? 'day' : 'days'}</p>
        )}
      </header>

      {scores.length > 1 && (
        <div className={styles.chartSection}>
          <p className={styles.chartLabel}>Last {Math.min(scores.length, 30)} days</p>
          <SparkChart scores={scores.slice(0, 30).reverse()} />
        </div>
      )}

      {entries.length === 0 ? (
        <div className={styles.empty}>
          <p>No entries yet.</p>
          <Link to="/journal" className={styles.startLink}>Log today's feel →</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {entries.map(entry => (
            <EntryRow key={entry.date} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

function EntryRow({ entry }) {
  const score = computeFeelScore(entry.scores || {})
  const date = new Date(entry.date)
  const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const scoreColor = score >= 7 ? 'var(--sage)' : score >= 4 ? 'var(--sand)' : 'var(--terracotta)'

  return (
    <div className={styles.row}>
      <div className={styles.rowDate}>{dateStr}</div>
      <div className={styles.rowBar}>
        <div
          className={styles.rowBarFill}
          style={{ width: `${(score / 10) * 100}%`, background: scoreColor }}
        />
      </div>
      <div className={styles.rowScore} style={{ color: scoreColor }}>{score.toFixed(1)}</div>
      {entry.note && (
        <div className={styles.rowNote}>{entry.note}</div>
      )}
    </div>
  )
}

function SparkChart({ scores }) {
  const max = 10
  const w = 320
  const h = 60
  const pad = 8
  const n = scores.length

  const points = scores.map((s, i) => {
    const x = pad + (i / (n - 1)) * (w - pad * 2)
    const y = h - pad - (s.score / max) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')

  const areaPoints = [
    `${pad},${h - pad}`,
    ...scores.map((s, i) => {
      const x = pad + (i / (n - 1)) * (w - pad * 2)
      const y = h - pad - (s.score / max) * (h - pad * 2)
      return `${x},${y}`
    }),
    `${w - pad},${h - pad}`
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.chart}>
      <polygon points={areaPoints} fill="var(--sage)" opacity="0.12" />
      <polyline points={points} fill="none" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {scores.map((s, i) => {
        const x = pad + (i / (n - 1)) * (w - pad * 2)
        const y = h - pad - (s.score / max) * (h - pad * 2)
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--sage)" />
      })}
    </svg>
  )
}
