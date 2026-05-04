import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collectionGroup, onSnapshot, query, orderBy } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import styles from './Admin.module.css'

const ADMIN_EMAIL = 'chauhan.viren08@gmail.com'

export default function Admin() {
  const { user, signInWithGoogle, signOut, authError } = useAuth()
  const { guestName, setGuestName, profile, entries } = useData()
  const [allEntries, setAllEntries] = useState([])
  const [indexError, setIndexError] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [namePending, setNamePending] = useState(false)

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!isAdmin || !db) return

    const q = query(collectionGroup(db, 'journal'), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, snapshot => {
      setAllEntries(snapshot.docs.map(d => ({ ...d.data(), _uid: d.ref.parent.parent.id })))
    }, err => {
      if (err.code === 'failed-precondition') setIndexError(err.message)
    })
    return unsub
  }, [isAdmin])

  if (user === undefined) {
    return <div className={styles.page}><p className={styles.loading}>Loading…</p></div>
  }

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!user && !guestName) {
    if (namePending) {
      return (
        <div className={styles.page}>
          <header className={styles.header}>
            <p className={styles.label}>Profile</p>
            <h1 className={styles.title}>What's your name?</h1>
            <p className={styles.sub}>Just so we can personalise your journal.</p>
          </header>
          <div className={styles.nameForm}>
            <input
              className={styles.nameInput}
              type="text"
              placeholder="Your first name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && nameInput.trim()) setGuestName(nameInput.trim())
              }}
              autoFocus
            />
            <button
              className={styles.primaryBtn}
              onClick={() => { if (nameInput.trim()) setGuestName(nameInput.trim()) }}
              disabled={!nameInput.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.label}>Profile</p>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.sub}>Sync your feel journal across devices.</p>
        </header>
        {authError && <p className={styles.authError}>{authError}</p>}
        <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')}>
          <GoogleIcon />
          Continue with Google
        </button>
        <div className={styles.divider}>or</div>
        <button className={styles.guestBtn} onClick={() => setNamePending(true)}>
          Continue as Guest
        </button>
      </div>
    )
  }

  // ── Signed in as admin ──────────────────────────────────────────────────────
  if (isAdmin) {
    return <AdminView entries={allEntries} indexError={indexError} onSignOut={signOut} />
  }

  // ── User Profile View ──────────────────────────────────────────────────────
  const displayName = user?.displayName || guestName
  const displayEmail = user?.email || 'Guest account'
  const photoURL = user?.photoURL

  return (
    <div className={styles.page}>
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          {photoURL ? (
            <img src={photoURL} alt="avatar" className={styles.largeAvatar} referrerPolicy="no-referrer" />
          ) : (
            <div className={styles.avatarPlaceholder}>{displayName?.[0]}</div>
          )}
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.email}>{displayEmail}</p>
        </div>

        <div className={styles.journeyOverview}>
          <div className={styles.journeyStat}>
            <span className={styles.statLabel}>Current Path</span>
            <span className={styles.statValue}>{profile?.path || 'Not Set'}</span>
          </div>
          <div className={styles.journeyStat}>
            <span className={styles.statLabel}>Commitment</span>
            <span className={styles.statValue}>{profile?.commitment || 30} Days</span>
          </div>
          <div className={styles.journeyStat}>
            <span className={styles.statLabel}>Days Logged</span>
            <span className={styles.statValue}>{entries.length}</span>
          </div>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>Journey Settings</h2>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Daily Reminders</span>
              <span className={styles.settingDesc}>Stay on track with your movement.</span>
            </div>
            <div className={styles.togglePlaceholder}>Coming Soon</div>
          </div>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Data Sync</span>
              <span className={styles.settingDesc}>
                {user ? 'Cloud syncing is active.' : 'Sign in to enable cloud sync.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.accountActions}>
        {!user && (
          <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')}>
            <GoogleIcon />
            Upgrade to Google Sign-In
          </button>
        )}
        <button className={styles.signOutBtn} onClick={user ? signOut : () => setGuestName(null)}>
          {user ? 'Sign Out' : 'Clear Guest Session'}
        </button>
      </div>

      <p className={styles.version}>Gentle BadAss Framework v1.2.0</p>
    </div>
  )
}

function AdminView({ entries, indexError, onSignOut }) {
  const byUser = entries.reduce((acc, e) => {
    const key = e._uid
    if (!acc[key]) acc[key] = { name: e.userName, email: e.userEmail, entries: [] }
    acc[key].entries.push(e)
    return acc
  }, {})
  const totalEntries = entries.length
  const userCount = Object.keys(byUser).length

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.label}>Admin Control Panel</p>
        <h1 className={styles.title}>System Overview</h1>
        <p className={styles.sub}>{userCount} users · {totalEntries} entries</p>
      </header>
      {indexError && (
        <div className={styles.indexWarn}>
          <p>Firestore index needed. Check the browser console for the direct link.</p>
        </div>
      )}
      {userCount === 0 && !indexError && (
        <p className={styles.empty}>Waiting for users to log their first movement…</p>
      )}
      {Object.entries(byUser).map(([uid, { name, email, entries }]) => (
        <UserBlock key={uid} name={name} email={email} entries={entries} />
      ))}
      <button className={styles.signOutBtn} onClick={onSignOut}>Sign out from Admin</button>
    </div>
  )
}

function UserBlock({ name, email, entries }) {
  const avg = entries.length
    ? Math.round(entries.reduce((s, e) => s + computeFeelScore(e.scores || {}), 0) / entries.length * 10) / 10
    : null

  return (
    <div className={styles.userBlock}>
      <div className={styles.userHeader}>
        <div>
          <p className={styles.userName}>{name || 'Anonymous'}</p>
          <p className={styles.userEmail}>{email}</p>
        </div>
        <div className={styles.userStats}>
          <span className={styles.statBig}>{avg ?? '—'}</span>
          <span className={styles.statSmall}>avg feel</span>
        </div>
      </div>
      <div className={styles.entryList}>
        {entries.slice(0, 5).map(e => {
          const score = computeFeelScore(e.scores || {})
          const color = score >= 7 ? '#8b9e7e' : score >= 4 ? '#d9b38a' : '#d98a8a'
          return (
            <div key={e.date} className={styles.entryRow}>
              <span className={styles.entryDate}>{e.date}</span>
              <div className={styles.entryBar}>
                <div className={styles.entryBarFill} style={{ width: `${score * 10}%`, background: color }} />
              </div>
              <span className={styles.entryScore} style={{ color }}>{score.toFixed(1)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
