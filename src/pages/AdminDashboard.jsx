import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { exportAdminWorkbook } from '../data/exportWorkbook'
import styles from './AdminDashboard.module.css'

// Friendly labels + colours for each tracked action.
const ACTION_META = {
  'journal.save':         { label: 'Journal logged',     color: '#8b9e7e' },
  'exercise.session':     { label: 'Exercise logged',    color: '#6fae8f' },
  'onboarding.complete':  { label: 'Onboarding done',    color: '#7aa0c8' },
  'profile.update':       { label: 'Profile updated',    color: '#9a86c8' },
  'coach.goal.set':       { label: 'Plan created',       color: '#c89a6a' },
  'coach.goal.update':    { label: 'Plan updated',       color: '#c89a6a' },
  'coach.goal.clear':     { label: 'Plan cleared',       color: '#b08068' },
  'coach.checkin':        { label: 'Run check-in',       color: '#8b9e7e' },
  'data.clear':           { label: 'Cleared own data',   color: '#c87a7a' },
  'admin.profile.update': { label: 'Admin edited profile', color: '#9a86c8' },
  'admin.plan.edit':      { label: 'Admin edited plan',  color: '#c89a6a' },
  'admin.plan.generate':  { label: 'Admin generated week', color: '#c89a6a' },
  'admin.remark.send':    { label: 'Admin sent remark',  color: '#7aa0c8' },
  'admin.remark.delete':  { label: 'Admin deleted remark', color: '#b08068' },
  'admin.journal.delete': { label: 'Admin deleted entry', color: '#c87a7a' },
  'admin.coach.clear':    { label: 'Admin cleared plan', color: '#c87a7a' },
  'admin.user.delete':    { label: 'Admin deleted user', color: '#c85a5a' },
  'admin.access.grant':   { label: 'Admin access granted', color: '#6fae8f' },
  'admin.access.revoke':  { label: 'Admin access revoked', color: '#c87a7a' },
}
const metaFor = action => ACTION_META[action] || { label: action, color: '#9aa0a6' }

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function AdminDashboard({
  activity = [], userList = [], allEntries = [],
  adminList = [], defaultAdmins = [], currentAdminEmail = '', onAddAdmin, onRemoveAdmin,
}) {
  const [roleFilter, setRoleFilter] = useState('all') // all | user | admin
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  }, [])

  const metrics = useMemo(() => {
    const eventsToday = activity.filter(a => (a.isoTs || '').startsWith(today)).length
    const activeUsers = new Set(
      activity.filter(a => a.actorRole === 'user' && (a.isoTs || '') >= weekAgo).map(a => a.actorUid)
    ).size
    const adminEdits = activity.filter(a => a.actorRole === 'admin').length
    return {
      totalUsers: userList.length,
      totalEntries: allEntries.length,
      totalEvents: activity.length,
      eventsToday,
      activeUsers,
      adminEdits,
    }
  }, [activity, userList, allEntries, today, weekAgo])

  // Activity over the last 14 days.
  const dailySeries = useMemo(() => {
    const days = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days.push(d.toISOString().split('T')[0])
    }
    const counts = Object.fromEntries(days.map(d => [d, 0]))
    activity.forEach(a => {
      const day = (a.isoTs || '').slice(0, 10)
      if (day in counts) counts[day] += 1
    })
    return days.map(d => ({ day: d.slice(5), count: counts[d] }))
  }, [activity])

  // Top action types.
  const actionSeries = useMemo(() => {
    const counts = {}
    activity.forEach(a => { counts[a.action] = (counts[a.action] || 0) + 1 })
    return Object.entries(counts)
      .map(([action, count]) => ({ action, count, ...metaFor(action) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [activity])

  const filteredFeed = useMemo(() => {
    const q = search.trim().toLowerCase()
    return activity.filter(a => {
      if (roleFilter !== 'all' && a.actorRole !== roleFilter) return false
      if (!q) return true
      return [a.actorName, a.actorEmail, a.targetName, a.action, a.summary]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    }).slice(0, 200)
  }, [activity, roleFilter, search])

  function handleExport() {
    setExporting(true)
    try {
      exportAdminWorkbook({ userList, allEntries, activity })
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed: ' + (err?.message || err))
    }
    setExporting(false)
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashHeader}>
        <div>
          <h2 className={styles.dashTitle}>Activity Dashboard</h2>
          <p className={styles.dashSub}>Live feed of every change made across the app — by users and admins.</p>
        </div>
        <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting ? 'Exporting…' : 'Export to Excel'}
        </button>
      </div>

      {/* Metric cards */}
      <div className={styles.metricGrid}>
        <Metric label="Total users" value={metrics.totalUsers} />
        <Metric label="Journal entries" value={metrics.totalEntries} />
        <Metric label="Changes tracked" value={metrics.totalEvents} />
        <Metric label="Changes today" value={metrics.eventsToday} accent />
        <Metric label="Active users (7d)" value={metrics.activeUsers} />
        <Metric label="Admin edits" value={metrics.adminEdits} />
      </div>

      {/* Admin access management */}
      <AdminAccessPanel
        adminList={adminList}
        defaultAdmins={defaultAdmins}
        currentAdminEmail={currentAdminEmail}
        onAddAdmin={onAddAdmin}
        onRemoveAdmin={onRemoveAdmin}
      />

      {/* Charts */}
      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Activity — last 14 days</h3>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--ink-faint, #888)' }} interval={1} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-faint, #888)' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#8b9e7e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Top change types</h3>
          {actionSeries.length === 0 ? (
            <p className={styles.empty}>No activity recorded yet.</p>
          ) : (
            <div className={styles.actionList}>
              {actionSeries.map(a => {
                const max = actionSeries[0].count || 1
                return (
                  <div key={a.action} className={styles.actionRow}>
                    <span className={styles.actionLabel}>{a.label}</span>
                    <div className={styles.actionBarTrack}>
                      <div className={styles.actionBarFill} style={{ width: `${(a.count / max) * 100}%`, background: a.color }} />
                    </div>
                    <span className={styles.actionCount}>{a.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Live feed */}
      <div className={styles.feedCard}>
        <div className={styles.feedHeader}>
          <h3 className={styles.chartTitle}>Live change feed</h3>
          <div className={styles.feedTools}>
            <div className={styles.roleTabs}>
              {[['all', 'All'], ['user', 'Users'], ['admin', 'Admin']].map(([id, label]) => (
                <button
                  key={id}
                  className={`${styles.roleTab} ${roleFilter === id ? styles.roleTabActive : ''}`}
                  onClick={() => setRoleFilter(id)}
                >{label}</button>
              ))}
            </div>
            <input
              className={styles.feedSearch}
              type="search"
              placeholder="Search name, action…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredFeed.length === 0 ? (
          <p className={styles.empty}>
            {activity.length === 0
              ? 'No changes recorded yet. As users log feelings and you edit plans, every action will stream in here.'
              : 'No events match this filter.'}
          </p>
        ) : (
          <ul className={styles.feed}>
            {filteredFeed.map(a => {
              const meta = metaFor(a.action)
              return (
                <li key={a.id} className={styles.feedRow}>
                  <span className={styles.feedDot} style={{ background: meta.color }} />
                  <div className={styles.feedBody}>
                    <p className={styles.feedLine}>
                      <strong>{a.actorName}</strong>
                      <span className={`${styles.feedRoleTag} ${a.actorRole === 'admin' ? styles.feedRoleAdmin : ''}`}>{a.actorRole}</span>
                      {' '}{a.summary}
                      {a.targetUid && a.targetUid !== a.actorUid && a.targetName && (
                        <span className={styles.feedTarget}> → {a.targetName}</span>
                      )}
                    </p>
                    <span className={styles.feedTime}>{timeAgo(a.isoTs)} · {a.isoTs?.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div className={`${styles.metric} ${accent ? styles.metricAccent : ''}`}>
      <strong className={styles.metricValue}>{value}</strong>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  )
}

// Manage who has full admin access. Founders ("owners") are permanent; everyone
// else can be added/removed here, which writes to the shared `admins` collection
// that the security rules also read — so app and rules never drift apart.
function AdminAccessPanel({ adminList = [], defaultAdmins = [], currentAdminEmail = '', onAddAdmin, onRemoveAdmin }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingRemove, setPendingRemove] = useState('')

  const owners = defaultAdmins.map(e => String(e).toLowerCase())
  // Dynamic admins, excluding any that duplicate an owner.
  const granted = adminList
    .map(a => String(a.email).toLowerCase())
    .filter(e => !owners.includes(e))
    .sort()

  async function handleAdd() {
    const clean = email.trim().toLowerCase()
    if (!clean) return
    if (owners.includes(clean) || granted.includes(clean)) {
      setError('That email is already an admin.')
      return
    }
    setBusy(true); setError('')
    try {
      await onAddAdmin(clean)
      setEmail('')
    } catch (err) {
      setError(err?.message || 'Could not add admin.')
    }
    setBusy(false)
  }

  async function handleRemove(target) {
    setBusy(true); setError('')
    try {
      await onRemoveAdmin(target)
      setPendingRemove('')
    } catch (err) {
      setError(err?.message || 'Could not remove admin.')
    }
    setBusy(false)
  }

  return (
    <div className={styles.adminAccessCard}>
      <div className={styles.adminAccessHead}>
        <h3 className={styles.chartTitle}>Admin access</h3>
        <span className={styles.adminAccessSub}>Anyone added here gets the full dashboard, activity log, Excel export, and user controls.</span>
      </div>

      <ul className={styles.adminAccessList}>
        {owners.map(e => (
          <li key={e} className={styles.adminAccessRow}>
            <span className={styles.adminAccessAvatar}>{e[0]?.toUpperCase()}</span>
            <span className={styles.adminAccessEmail}>
              {e}
              {e === currentAdminEmail && <span className={styles.adminAccessYou}>you</span>}
            </span>
            <span className={styles.adminAccessOwner}>Owner</span>
          </li>
        ))}
        {granted.map(e => (
          <li key={e} className={styles.adminAccessRow}>
            <span className={styles.adminAccessAvatar}>{e[0]?.toUpperCase()}</span>
            <span className={styles.adminAccessEmail}>
              {e}
              {e === currentAdminEmail && <span className={styles.adminAccessYou}>you</span>}
            </span>
            {pendingRemove === e ? (
              <span className={styles.adminAccessConfirm}>
                <button className={styles.adminAccessRemoveYes} disabled={busy} onClick={() => handleRemove(e)}>
                  {busy ? '…' : 'Remove'}
                </button>
                <button className={styles.adminAccessRemoveNo} disabled={busy} onClick={() => setPendingRemove('')}>Cancel</button>
              </span>
            ) : (
              <button className={styles.adminAccessRemoveBtn} onClick={() => { setError(''); setPendingRemove(e) }}>Remove</button>
            )}
          </li>
        ))}
      </ul>

      <div className={styles.adminAccessAdd}>
        <input
          className={styles.adminAccessInput}
          type="email"
          placeholder="new.admin@email.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          disabled={busy}
        />
        <button className={styles.adminAccessAddBtn} onClick={handleAdd} disabled={busy || !email.trim()}>
          {busy ? 'Adding…' : 'Add admin'}
        </button>
      </div>
      {error && <p className={styles.adminAccessError}>{error}</p>}
      <p className={styles.adminAccessNote}>
        They must sign in with this exact Google account. Owners are permanent and can't be removed.
      </p>
    </div>
  )
}
