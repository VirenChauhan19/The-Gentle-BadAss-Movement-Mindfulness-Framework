import { Link } from 'react-router-dom'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area 
} from 'recharts'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import styles from './History.module.css'

export default function History() {
  const { entries: rawEntries, profile } = useData()
  const entries = [...rawEntries].sort((a, b) => a.date.localeCompare(b.date))
  const displayEntries = [...rawEntries].sort((a, b) => b.date.localeCompare(a.date))

  const chartData = entries.map(e => {
    const sessions = e.sessions || []
    const avgTpr = sessions.length 
      ? sessions.reduce((sum, s) => sum + s.tpr, 0) / sessions.length 
      : null
    
    let shortDate = '—'
    try {
      if (e.date) {
        const d = new Date(e.date)
        if (!isNaN(d.getTime())) {
          shortDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        }
      }
    } catch (err) {
      console.warn('Invalid date in entry:', e.date)
    }

    return {
      date: e.date,
      shortDate,
      score: computeFeelScore(e.scores || {}),
      tpr: avgTpr
    }
  })

  const avg = chartData.length
    ? Math.round(chartData.reduce((s, e) => s + e.score, 0) / chartData.length * 10) / 10
    : null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Quality Dashboard</p>
        <h1 className={styles.title}>Your Journey</h1>
        <p className={styles.commitment}>
          Path: <strong>{profile?.path || 'Rehab'}</strong> · 
          Goal: <strong>{profile?.commitment || 270} Days</strong>
        </p>
        {avg !== null && (
          <p className={avg >= 7 ? styles.highAvg : styles.avgText}>
            Average feel score: <strong>{avg}</strong>
          </p>
        )}
      </header>

      <section className={styles.dashboard}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>TPR Mastery (Rising Line = Quality)</h2>
          <p className={styles.chartDesc}>Tracking Time Per Rep: slower is smoother.</p>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData.filter(d => d.tpr !== null)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="shortDate" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ background: 'var(--paper)', border: '2px solid var(--border)', borderRadius: '1rem' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="tpr" 
                  stroke="var(--ink)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'var(--ink)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Feel Factor Trends</h2>
          <p className={styles.chartDesc}>Goal: Maintain a baseline above 7.0</p>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b9e7e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b9e7e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="shortDate" hide />
                <YAxis hide domain={[0, 10]} />
                <Tooltip 
                   contentStyle={{ background: 'var(--paper)', border: '2px solid var(--border)', borderRadius: '1rem' }}
                />
                <ReferenceLine y={7} stroke="#8b9e7e" strokeDasharray="3 3" label={{ position: 'right', value: '7.0 Target', fill: '#8b9e7e', fontSize: 10 }} />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#8b9e7e" 
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className={styles.list}>
        <h2 className={styles.listTitle}>Reflection Archive</h2>
        {displayEntries.length === 0 ? (
          <div className={styles.empty}>
            <p>No entries yet.</p>
            <Link to="/journal" className={styles.startLink}>Log today's feel →</Link>
          </div>
        ) : (
          displayEntries.map(entry => (
            <EntryRow key={entry.date} entry={entry} />
          ))
        )}
      </div>
    </div>
  )
}

function EntryRow({ entry }) {
  const score = computeFeelScore(entry.scores || {})
  const date = new Date(entry.date)
  const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const scoreColor = score >= 7 ? '#8b9e7e' : score >= 4 ? '#d9b38a' : '#d98a8a'

  return (
    <div className={styles.row}>
      <div className={styles.rowTop}>
        <div className={styles.rowDate}>{dateStr}</div>
        <div className={styles.rowScore} style={{ color: scoreColor }}>{score.toFixed(1)}</div>
      </div>
      {entry.sessions && entry.sessions.length > 0 && (
        <div className={styles.rowSessions}>
          {entry.sessions.map((s, i) => (
            <span key={i} className={styles.sessionBadge}>
              {s.exerciseName}: {s.tpr}s TPR
            </span>
          ))}
        </div>
      )}
      {entry.note && (
        <div className={styles.rowNote}>
          {entry.note.length > 100 ? entry.note.substring(0, 100) + '...' : entry.note}
        </div>
      )}
    </div>
  )
}
