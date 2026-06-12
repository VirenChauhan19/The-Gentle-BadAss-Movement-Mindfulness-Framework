import { useMemo, useState } from 'react'
import { computeEntryStreak } from '../data/storage'
import styles from './AdminUsersTable.module.css'

// Detailed, sortable directory of every user — the "proper admin view".
// Clicking a row opens the full per-user management screen (Users view).

const PATH_LABELS = { rehab: 'Rehab', beginner: 'Beginner', performance: 'Performance' }
const GENDER_LABELS = {
  female: 'Female', male: 'Male', woman: 'Female', man: 'Male',
  'non-binary': 'Non-binary', 'self-described': 'Self-described', 'prefer-not': 'Undisclosed',
}
const SCORE_COLOR = v =>
  v >= 8 ? '#8b9e7e' : v >= 6 ? '#a0b870' : v >= 4 ? '#d9b38a' : '#d98a8a'

// Colours live in the CSS module so they can adapt to light/dark themes.
const STATUS_META = {
  today:    { label: 'Active today', pill: styles.pillToday    },
  week:     { label: 'This week',    pill: styles.pillWeek     },
  quiet:    { label: 'Quiet',        pill: styles.pillQuiet    },
  inactive: { label: 'Inactive',     pill: styles.pillInactive },
  new:      { label: 'New',          pill: styles.pillNew      },
}

const FILTERS = [
  ['all',        'All'],
  ['active',     'Active 7d'],
  ['inactive',   'Inactive'],
  ['no-plan',    'No plan'],
  ['onboarding', 'Onboarding pending'],
  ['low-feel',   'Low feel'],
]

// Columns: label, sort key, default direction, numeric alignment.
const COLUMNS = [
  ['User',        'name',       'asc'        ],
  ['Status',      'lastActive', 'desc'       ],
  ['Last active', 'lastActive', 'desc'       ],
  ['Joined',      'joined',     'desc'       ],
  ['Path',        'path',       'asc'        ],
  ['Profile',     'demo',       'asc'        ],
  ['Onboarding',  'onboarded',  'desc'       ],
  ['Entries',     'entries',    'desc', true ],
  ['Avg feel',    'avgScore',   'desc', true ],
  ['Streak',      'streak',     'desc', true ],
  ['Exercises',   'exercises',  'desc', true ],
  ['Plan',        'planDays',   'desc'       ],
  ['Check-ins',   'checkins',   'desc', true ],
  ['Remarks',     'remarks',    'desc', true ],
]

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function dayAgoLabel(iso, today) {
  if (!iso) return ''
  if (iso === today) return 'today'
  const diff = Math.round((new Date(today) - new Date(iso)) / 86400000)
  if (diff === 1) return 'yesterday'
  if (diff < 30) return `${diff}d ago`
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
  return `${Math.floor(diff / 365)}y ago`
}

export default function AdminUsersTable({ userList = [], onOpenUser }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'lastActive', dir: 'desc' })

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = useMemo(() => isoDaysAgo(7), [])
  const twoWeeksAgo = useMemo(() => isoDaysAgo(14), [])

  const rows = useMemo(() => userList.map(u => {
    const p = u.userProfile || {}
    const goal = u.coach?.goal
    const checkins = u.coach?.checkins || []
    const lastSeenDate = u.lastSeenAt?.slice(0, 10) || null
    const lastActive = [u.lastDate, lastSeenDate].filter(Boolean).sort().pop() || null
    const status = !lastActive ? 'new'
      : lastActive >= today ? 'today'
      : lastActive >= weekAgo ? 'week'
      : lastActive >= twoWeeksAgo ? 'quiet'
      : 'inactive'
    const gender = GENDER_LABELS[p.gender || p.sex] || ''
    const demo = [gender, p.ageRange].filter(Boolean).join(' · ')
    return {
      uid: u.uid,
      name: u.name || 'Anonymous',
      email: u.email || '',
      photoURL: p.photoURL || '',
      status,
      lastActive,
      joined: p.createdAt?.slice(0, 10) || null,
      path: PATH_LABELS[p.path] || p.path || null,
      commitment: p.commitment || null,
      demo: demo || null,
      onboarded: p.onboardingComplete ? 1 : 0,
      hasProfile: !!u.userProfile,
      entries: u.entries.length,
      avgScore: u.avgScore,
      streak: computeEntryStreak(u.entries),
      exercises: u.entries.reduce((s, e) => s + (e.sessions?.length || 0), 0),
      planLabel: goal ? (goal.focus || goal.raceGoal || 'Running plan') : null,
      planDays: goal?.plan?.length || 0,
      checkins: checkins.length,
      checkinsDone: checkins.filter(c => c.status === 'done').length,
      remarks: u.remarks?.length || 0,
      programGoal: p.programGoal || '',
    }
  }), [userList, today, weekAgo, twoWeeksAgo])

  const filterCounts = useMemo(() => ({
    all: rows.length,
    active: rows.filter(r => r.lastActive && r.lastActive >= weekAgo).length,
    inactive: rows.filter(r => !r.lastActive || r.lastActive < twoWeeksAgo).length,
    'no-plan': rows.filter(r => !r.planLabel).length,
    onboarding: rows.filter(r => !r.onboarded).length,
    'low-feel': rows.filter(r => typeof r.avgScore === 'number' && r.avgScore < 5).length,
  }), [rows, weekAgo, twoWeeksAgo])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (filter === 'active' && !(r.lastActive && r.lastActive >= weekAgo)) return false
      if (filter === 'inactive' && r.lastActive && r.lastActive >= twoWeeksAgo) return false
      if (filter === 'no-plan' && r.planLabel) return false
      if (filter === 'onboarding' && r.onboarded) return false
      if (filter === 'low-feel' && !(typeof r.avgScore === 'number' && r.avgScore < 5)) return false
      if (!q) return true
      return [r.name, r.email, r.uid, r.path, r.planLabel, r.programGoal]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    })
  }, [rows, filter, search, weekAgo, twoWeeksAgo])

  const sorted = useMemo(() => {
    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = a[key], bv = b[key]
      if (av == null && bv == null) return 0
      if (av == null) return 1 // missing values sink to the bottom either way
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return cmp * mul
    })
  }, [filtered, sort])

  const visible = sorted.slice(0, 200)

  function handleSort(key, defaultDir) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: defaultDir })
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>User directory</h3>
          <p className={styles.sub}>
            Every account in full detail — profile, feel, training, and coaching state.
            Click a user to open their complete admin view.
          </p>
        </div>
        <input
          className={styles.search}
          type="search"
          placeholder="Search name, email, goal…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.filterRow}>
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.filterChip} ${filter === id ? styles.filterChipActive : ''}`}
            onClick={() => setFilter(id)}
          >
            {label} <span className={styles.filterCount}>{filterCounts[id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty}>
          {rows.length === 0 ? 'No users yet.' : 'No users match this view.'}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {COLUMNS.map(([label, key, defaultDir, numeric]) => {
                  const active = sort.key === key && label !== 'Status'
                  return (
                    <th key={label} className={numeric ? styles.thNum : undefined}>
                      <button
                        type="button"
                        className={`${styles.sortBtn} ${active ? styles.sortBtnActive : ''}`}
                        onClick={() => handleSort(key, defaultDir)}
                      >
                        {label}
                        <span className={styles.sortArrow}>
                          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    </th>
                  )
                })}
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {visible.map(r => {
                const status = STATUS_META[r.status]
                return (
                  <tr key={r.uid} className={styles.row} onClick={() => onOpenUser?.(r.uid)}>
                    <td className={styles.userCell}>
                      {r.photoURL
                        ? <img src={r.photoURL} alt="" className={styles.avatarImg} referrerPolicy="no-referrer" />
                        : <span className={styles.avatar}>{(r.name || '?')[0].toUpperCase()}</span>}
                      <span className={styles.userText}>
                        <strong>{r.name}</strong>
                        <em>{r.email || r.uid.slice(0, 12)}</em>
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusPill} ${status.pill}`}>
                        {status.label}
                      </span>
                    </td>
                    <td title={r.lastActive || ''}>
                      {r.lastActive
                        ? <span className={styles.dateCell}>{r.lastActive}<em>{dayAgoLabel(r.lastActive, today)}</em></span>
                        : '—'}
                    </td>
                    <td>{r.joined || '—'}</td>
                    <td>
                      {r.path
                        ? <span className={styles.dateCell}>{r.path}{r.commitment ? <em>{r.commitment} days</em> : null}</span>
                        : '—'}
                    </td>
                    <td>{r.demo || '—'}</td>
                    <td>
                      {!r.hasProfile
                        ? <span className={styles.mutedTag}>no profile</span>
                        : r.onboarded
                          ? <span className={styles.okTag}>✓ complete</span>
                          : <span className={styles.warnTag}>pending</span>}
                    </td>
                    <td className={styles.numCell}>{r.entries}</td>
                    <td className={styles.numCell}>
                      {r.avgScore !== null
                        ? <strong style={{ color: SCORE_COLOR(r.avgScore) }}>{r.avgScore.toFixed(1)}</strong>
                        : '—'}
                    </td>
                    <td className={styles.numCell}>{r.streak > 0 ? `${r.streak}d` : '—'}</td>
                    <td className={styles.numCell}>{r.exercises}</td>
                    <td className={styles.planCell} title={r.planLabel || ''}>
                      {r.planLabel
                        ? <span className={styles.dateCell}>{r.planLabel}<em>{r.planDays} days built</em></span>
                        : <span className={styles.mutedTag}>none</span>}
                    </td>
                    <td className={styles.numCell}>
                      {r.checkins > 0 ? `${r.checkinsDone}✓ / ${r.checkins}` : '—'}
                    </td>
                    <td className={styles.numCell}>{r.remarks || '—'}</td>
                    <td className={styles.openCell}>
                      <span className={styles.openArrow}>›</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.count}>
        Showing {visible.length} of {filtered.length} user{filtered.length === 1 ? '' : 's'}
        {filtered.length > visible.length ? ' — narrow the search to see the rest' : ''}
      </p>
    </div>
  )
}
