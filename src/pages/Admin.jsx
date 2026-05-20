import { useDeferredValue, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { collectionGroup, onSnapshot, query, doc, getDoc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore'
import { arrayUnion } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import { JOURNAL_FACTORS } from '../data/journalFactors'
import { applyCycleAdaptationToPlan, getCycleWindows } from '../data/trainingAdaptation'
import { generateSingleWeek } from './Coach'
import styles from './Admin.module.css'

const DEFAULT_ADMIN_EMAILS = [
  'chauhan.viren08@gmail.com',
  'drrajatchauhan@gmail.com',
]
const ADMIN_EMAILS = [
  ...DEFAULT_ADMIN_EMAILS,
  ...(import.meta.env.VITE_ADMIN_EMAILS || '').split(','),
]
  .map(email => email.trim().toLowerCase())
  .filter(Boolean)

const PATH_NAMES = {
  rehab: 'The Rehab Path',
  beginner: 'The Beginner Path',
  performance: 'The Performance Path',
}

const MENOPAUSE_LABELS = {
  no: 'No',
  perimenopause: 'Perimenopause',
  menopause: 'Menopause',
  unsure: 'Not sure',
}

function buildAdminProfileDraft(user = {}) {
  const profile = user.userProfile || {}
  return {
    name: profile.name || user.name || '',
    displayName: profile.displayName || profile.name || user.name || '',
    email: profile.email || user.email || '',
    ageRange: profile.ageRange || '',
    gender: profile.gender || profile.sex || '',
    sex: profile.sex || profile.gender || '',
    heardAbout: profile.heardAbout || '',
    path: profile.path || '',
    commitment: profile.commitment || '',
    programGoal: profile.programGoal || '',
    fitnessHistory: profile.fitnessHistory || profile.story || '',
    story: profile.story || profile.fitnessHistory || '',
    commitmentStatement: profile.commitmentStatement || '',
    lastPeriod: profile.lastPeriod || '',
    nextPeriod: profile.nextPeriod || '',
    cycleLength: profile.cycleLength || '',
    periodLength: profile.periodLength || '',
    menopauseStatus: profile.menopauseStatus || '',
    onboardingComplete: profile.onboardingComplete ?? true,
    updatedAt: profile.updatedAt || '',
  }
}

const SCORE_COLOR = v =>
  v >= 8 ? '#8b9e7e' : v >= 6 ? '#a0b870' : v >= 4 ? '#d9b38a' : '#d98a8a'

const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const THEME_OPTIONS = [
  { id: 'dark',     label: 'Dark',     description: 'Deep green training cockpit.'     },
  { id: 'ember',    label: 'Ember',    description: 'Red, warm, high-energy mode.'     },
  { id: 'ocean',    label: 'Ocean',    description: 'Cool blue focus mode.'            },
  { id: 'forest',   label: 'Forest',   description: 'Deep forest, alive and grounded.' },
  { id: 'violet',   label: 'Violet',   description: 'Calm purple focus mode.'          },
  { id: 'rose',     label: 'Rose',     description: 'Warm rose, soft and energised.'   },
  { id: 'midnight', label: 'Midnight', description: 'Deep navy for night sessions.'    },
  { id: 'light',    label: 'Light',    description: 'Bright daytime mode.'             },
]

const WORKOUT_PRESETS = [
  { category: 'Easy Run',       icon: '🏃', type: 'easy',     title: 'Easy Run 30 min',          distance: '4–5 km',    duration: '30 min',       pace: 'Conversational (Z1–Z2)',  notes: 'Keep it very easy — full conversation throughout. Focus on form and breathing.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Easy Run',       icon: '🏃', type: 'easy',     title: 'Easy Run 40 min',          distance: '5–7 km',    duration: '40 min',       pace: 'Conversational (Z1–Z2)',  notes: 'Keep it easy. Full conversation pace the entire way. Focus on cadence and form.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Easy Run',       icon: '🏃', type: 'easy',     title: 'Easy Run 50 min',          distance: '7–9 km',    duration: '50 min',       pace: 'Conversational (Z1–Z2)',  notes: 'Steady easy effort. Stay fully aerobic. Walk if needed — keep heart rate low.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Easy Run',       icon: '🏃', type: 'easy',     title: 'Easy Run 60 min',          distance: '9–12 km',   duration: '60 min',       pace: 'Conversational (Z1–Z2)',  notes: 'Build aerobic base. Keep effort fully conversational throughout the session.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Tempo',          icon: '⚡',  type: 'moderate', title: 'Tempo Run 40 min',         distance: '6–8 km',    duration: '40 min',       pace: 'Comfortably hard (Z3)',   notes: '10 min easy warm-up → 20 min at tempo effort → 10 min easy cool-down.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Tempo',          icon: '⚡',  type: 'moderate', title: 'Tempo Run 50 min',         distance: '8–10 km',   duration: '50 min',       pace: 'Comfortably hard (Z3)',   notes: '10 min easy warm-up → 30 min at tempo effort → 10 min easy cool-down.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Tempo',          icon: '⚡',  type: 'moderate', title: 'Progression Run 50 min',   distance: '8–10 km',   duration: '50 min',       pace: 'Easy → Moderate → Tempo', notes: 'First third easy, second third moderate, final third at tempo. Controlled build.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Tempo',          icon: '⚡',  type: 'moderate', title: 'Fartlek 45 min',           distance: '7–9 km',    duration: '45 min',       pace: 'Mixed effort',            notes: '10 min easy → 5×(2 min hard / 2 min easy) → finish easy. Play with effort.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Intervals',      icon: '🔥', type: 'hard',     title: 'Interval Session 45 min',  distance: '7–9 km',    duration: '45 min',       pace: 'Hard (Z4–Z5)',            notes: '10 min warm-up → 6×400m at 5K effort with 90s recovery jog → 10 min cool-down.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Intervals',      icon: '🔥', type: 'hard',     title: 'Interval Session 60 min',  distance: '9–12 km',   duration: '60 min',       pace: 'Hard (Z4–Z5)',            notes: '10 min warm-up → 8×400m at 5K effort with 90s recovery jog → 10 min cool-down.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Intervals',      icon: '🔥', type: 'hard',     title: 'Hill Repeats 50 min',      distance: '7–9 km',    duration: '50 min',       pace: 'Hard (Z4–Z5)',            notes: '15 min warm-up → 8–10×60s hard hill efforts, walk-back recovery → 10 min cool-down.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Intervals',      icon: '🔥', type: 'hard',     title: '1K Repeats 60 min',        distance: '10–13 km',  duration: '60 min',       pace: 'Hard (Z4–Z5)',            notes: '15 min warm-up → 5×1K at 10K pace with 2 min jog recovery → 10 min cool-down.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Long Run',       icon: '🎯', type: 'long',     title: 'Long Run 75 min',          distance: '12–15 km',  duration: '75 min',       pace: 'Easy (Z1–Z2)',            notes: 'Easy long distance. Walk breaks are totally fine. Hydrate every 20 min.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Long Run',       icon: '🎯', type: 'long',     title: 'Long Run 90 min',          distance: '15–18 km',  duration: '90 min',       pace: 'Easy (Z1–Z2)',            notes: 'Long slow distance. Practice race nutrition strategy if training for an event.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Long Run',       icon: '🎯', type: 'long',     title: 'Long Run 120 min',         distance: '18–24 km',  duration: '120 min',      pace: 'Easy (Z1–Z2)',            notes: 'Race-prep long run. Practice full nutrition, pacing, and kit strategy.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Cross Training', icon: '🚴', type: 'cross',    title: 'Cross Training 40 min',    distance: '',          duration: '40 min',       pace: 'Low–moderate effort',     notes: 'Active recovery using non-impact cardio. Keep heart rate in Z1–Z2.', crossTraining: '40 min easy cycling, swimming, elliptical, or rowing at conversational effort.', strength: '', mobility: '' },
  { category: 'Cross Training', icon: '🚴', type: 'cross',    title: 'Cross Training 50 min',    distance: '',          duration: '50 min',       pace: 'Low–moderate effort',     notes: 'Non-impact aerobic session. Stay comfortable and aerobic throughout.', crossTraining: '50 min easy cycling, swimming, elliptical, or rowing. Comfortable throughout.', strength: '', mobility: '' },
  { category: 'Cross Training', icon: '🚴', type: 'cross',    title: 'Cross Training 60 min',    distance: '',          duration: '60 min',       pace: 'Moderate effort',         notes: 'Sustained cross-training with a moderate push in the final 15 minutes.', crossTraining: '60 min cycling, swimming, or elliptical — push to moderate effort for last 15 min.', strength: '', mobility: '' },
  { category: 'Rest',           icon: '😴', type: 'rest',     title: 'Rest Day',                 distance: '',          duration: '—',            pace: '—',                       notes: 'Complete rest. Optional 15–20 min walk if you feel like moving. Sleep, hydrate, recover.', crossTraining: '', strength: '', mobility: '' },
  { category: 'Rest',           icon: '🧘', type: 'rest',     title: 'Active Recovery',          distance: '',          duration: '20–30 min',    pace: 'Very easy',               notes: 'Gentle walk or light yoga only. Keep heart rate very low. This is a recovery day.', crossTraining: '', strength: '', mobility: '' },
]

function planDayTypeColor(type) {
  switch (type) {
    case 'easy':     return { bg: 'rgba(122,148,112,0.16)', color: '#4a7244', border: 'rgba(122,148,112,0.55)' }
    case 'moderate': return { bg: 'rgba(190,155,80,0.16)',  color: '#8a6a20', border: 'rgba(190,155,80,0.55)' }
    case 'hard':     return { bg: 'rgba(186,95,69,0.16)',   color: '#c05040', border: 'rgba(186,95,69,0.55)' }
    case 'long':     return { bg: 'rgba(90,100,160,0.16)',  color: '#5060a8', border: 'rgba(90,100,160,0.55)' }
    case 'cross':    return { bg: 'rgba(60,130,180,0.16)',  color: '#2a7abf', border: 'rgba(60,130,180,0.55)' }
    case 'rest':     return { bg: 'rgba(130,130,130,0.12)', color: '#777',    border: 'rgba(130,130,130,0.35)' }
    default:         return { bg: 'rgba(130,130,130,0.12)', color: '#777',    border: 'rgba(130,130,130,0.35)' }
  }
}

function addDaysISO(startDate, offset) {
  const d = new Date(`${startDate}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function getFullCoachPlan(goal) {
  if (!goal) return []
  const startDate = goal.startDate || new Date().toISOString().split('T')[0]
  const totalDays = goal.commitmentDays || ((goal.weeks || 4) * 7)
  const template = goal.weekTemplate || []
  const storedPlan = Array.isArray(goal.plan) ? goal.plan : []

  return Array.from({ length: totalDays }, (_, i) => {
    if (storedPlan[i]) {
      const date = storedPlan[i].date || addDaysISO(startDate, i)
      return {
        ...storedPlan[i],
        id: storedPlan[i].id || `day-${i + 1}`,
        dayNumber: storedPlan[i].dayNumber || i + 1,
        week: storedPlan[i].week || Math.floor(i / 7) + 1,
        date,
        day: storedPlan[i].day || DAYS_FULL[new Date(`${date}T00:00:00`).getDay()],
      }
    }
    const date = addDaysISO(startDate, i)
    const day = DAYS_FULL[new Date(`${date}T00:00:00`).getDay()]
    const session = template.find(s => s.day === day) || template[i % template.length] || {}
    return {
      ...session,
      id: `day-${i + 1}`,
      dayNumber: i + 1,
      week: Math.floor(i / 7) + 1,
      date,
      day,
      type: session.type || 'rest',
      title: session.title || 'Rest / Recovery',
      distance: session.distance || '',
      duration: session.duration || '10-20 min optional walk',
      pace: session.pace || 'Very easy',
      notes: session.notes || 'Full rest or an easy walk. Keep effort low and prepare for the next planned session.',
      crossTraining: session.crossTraining || (session.type === 'cross' ? `${session.duration || '30-45 min'} easy cycling, swimming, elliptical, rowing, or brisk incline walk at conversational effort.` : ''),
      strength: session.strength || '10-15 min: glute bridges 2x12, calf raises 2x15, dead bug 2x8/side, side plank 2x20s/side.',
      mobility: session.mobility || '8-12 min: ankle rocks x10/side, hip flexor stretch 45s/side, hamstring floss x10/side, thoracic rotations x8/side, easy breathing 2 min.',
    }
  })
}

export default function Admin() {
  const { user, signInWithGoogle, signOut, authError, isConfigured } = useAuth()
  const { guestName, setGuestName, profile, entries, clearAllData, adminRemarks } = useData()
  const navigate = useNavigate()

  const [adminMode,    setAdminMode]    = useState(false)
  const [allEntries,   setAllEntries]   = useState([])
  const [allUserData,  setAllUserData]  = useState({})
  const [indexError,   setIndexError]   = useState(false)
  const [nameInput,    setNameInput]    = useState('')
  const [namePending,  setNamePending]  = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing,     setClearing]     = useState(false)
  const [theme,        setTheme]        = useState(() => localStorage.getItem('gb_theme') || 'dark')

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

  function changeTheme(nextTheme) {
    setTheme(nextTheme)
    localStorage.setItem('gb_theme', nextTheme)
    document.documentElement.dataset.theme = nextTheme
    window.dispatchEvent(new CustomEvent('gb-theme-change', { detail: { theme: nextTheme } }))
  }

  function handleUserDeleted(uid) {
    setAllEntries(prev => prev.filter(e => e._uid !== uid))
    setAllUserData(prev => {
      const next = { ...prev }
      delete next[uid]
      return next
    })
  }

  // Live listener for all users' journal entries (admin only)
  useEffect(() => {
    if (!isAdmin || !db) return
    const unsub = onSnapshot(query(collectionGroup(db, 'journal')), async snapshot => {
      const docs = snapshot.docs
        .map(d => ({ ...d.data(), _uid: d.ref.parent.parent.id }))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      setAllEntries(docs)

      const uids = [...new Set(docs.map(d => d._uid))]
      const pairs = await Promise.all(
        uids.map(uid =>
          Promise.all([
            getDoc(doc(db, 'users', uid, 'config', 'profile')).then(s => s.exists() ? s.data() : null).catch(() => null),
            getDoc(doc(db, 'users', uid, 'config', 'coach')).then(s => s.exists() ? s.data() : null).catch(() => null),
            getDoc(doc(db, 'users', uid, 'config', 'adminRemarks')).then(s => s.exists() ? (s.data().remarks || []) : []).catch(() => []),
          ]).then(([userProfile, coach, remarks]) => [uid, { userProfile, coach, remarks }])
        )
      )
      setAllUserData(prev => ({
        ...prev,
        ...Object.fromEntries(pairs),
      }))
    }, err => {
      if (err.code === 'failed-precondition') setIndexError(err.message)
    })
    return unsub
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin || !db) return
    const unsub = onSnapshot(query(collectionGroup(db, 'config')), snapshot => {
      // Collect uids that have a tombstone — they should NOT appear in the list.
      const deletedUids = new Set(
        snapshot.docs
          .filter(d => d.id === '_deleted')
          .map(d => d.ref.parent.parent?.id)
          .filter(Boolean)
      )
      setAllUserData(prev => {
        const next = { ...prev }
        // Drop any user that has been tombstoned.
        deletedUids.forEach(uid => { delete next[uid] })
        snapshot.docs.forEach(d => {
          const uid = d.ref.parent.parent?.id
          if (!uid || deletedUids.has(uid)) return
          const current = next[uid] || {}
          if (d.id === 'profile') current.userProfile = d.data()
          if (d.id === 'coach') current.coach = d.data()
          if (d.id === 'adminRemarks') current.remarks = d.data().remarks || []
          next[uid] = current
        })
        return next
      })
      setAllEntries(prev => prev.filter(e => !deletedUids.has(e._uid)))
    })
    return unsub
  }, [isAdmin])

  if (user === undefined) {
    return <div className={styles.page}><p className={styles.loading}>Loading…</p></div>
  }

  // ── Not signed in ───────────────────────────────────────────────────────────
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
              onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) setGuestName(nameInput.trim()) }}
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
        <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')} disabled={!isConfigured}>
          <GoogleIcon /> Continue with Google
        </button>
        {!isConfigured && <p className={styles.authError}>Firebase is not configured yet, so Google sign-in is unavailable in this environment.</p>}
        <div className={styles.divider}>or</div>
        <button className={styles.guestBtn} onClick={() => setNamePending(true)}>
          Continue as Guest
        </button>
      </div>
    )
  }

  // ── Admin panel mode ────────────────────────────────────────────────────────
  if (isAdmin && adminMode) {
    return (
      <AdminPanel
        allEntries={allEntries}
        allUserData={allUserData}
        indexError={indexError}
        adminUser={user}
        onClose={() => setAdminMode(false)}
        onUserDeleted={handleUserDeleted}
        onRemarkSent={(uid, remark) =>
          setAllUserData(prev => ({
            ...prev,
            [uid]: { ...prev[uid], remarks: [...(prev[uid]?.remarks || []), remark] },
          }))
        }
        onRemarkDeleted={(uid, remarkId) =>
          setAllUserData(prev => ({
            ...prev,
            [uid]: {
              ...prev[uid],
              remarks: (prev[uid]?.remarks || []).filter(remark => remark.id !== remarkId),
            },
          }))
        }
        onCoachUpdated={(uid, coach) =>
          setAllUserData(prev => ({
            ...prev,
            [uid]: { ...prev[uid], coach },
          }))
        }
        onProfileUpdated={(uid, profile) =>
          setAllUserData(prev => ({
            ...prev,
            [uid]: { ...prev[uid], userProfile: profile },
          }))
        }
      />
    )
  }

  // ── Profile view (all users incl. admin) ────────────────────────────────────
  const displayName  = user?.displayName || guestName
  const displayEmail = user?.email || 'Guest account'
  const photoURL     = user?.photoURL

  return (
    <div className={styles.page}>

      {isAdmin && (
        <button className={styles.adminModeBtn} onClick={() => setAdminMode(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          Admin Panel
        </button>
      )}

      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          {photoURL
            ? <img src={photoURL} alt="avatar" className={styles.largeAvatar} referrerPolicy="no-referrer" />
            : <div className={styles.avatarPlaceholder}>{displayName?.[0]}</div>
          }
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.email}>{displayEmail}</p>
        </div>
        <div className={styles.journeyStats}>
          <div className={styles.journeyRow}>
            <span className={styles.journeyLabel}>Current Path</span>
            <span className={styles.journeyValue}>{PATH_NAMES[profile?.path] || 'Not set'}</span>
          </div>
          <div className={styles.journeyRow}>
            <span className={styles.journeyLabel}>Commitment</span>
            <span className={styles.journeyValue}>{profile?.commitment || 30} days</span>
          </div>
          <div className={styles.journeyRow}>
            <span className={styles.journeyLabel}>Days Logged</span>
            <span className={styles.journeyValue}>{entries.length}</span>
          </div>
        </div>
      </div>

      {/* Coach remarks visible to the user */}
      {adminRemarks?.length > 0 && (
        <div className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>Coach Remarks</h2>
          <div className={styles.remarksList}>
            {[...adminRemarks].reverse().map(r => (
              <div key={r.id} className={styles.remarkCard}>
                <div className={styles.remarkMeta}>
                  <span className={styles.remarkFrom}>{r.from}</span>
                  <span className={styles.remarkDate}>{r.date}</span>
                </div>
                <p className={styles.remarkText}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>Journey Settings</h2>
        <div className={styles.settingsList}>
          <div className={`${styles.settingItem} ${styles.themeSetting}`}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>App Theme</span>
              <span className={styles.settingDesc}>Choose a full color system for the app.</span>
            </div>
            <div className={styles.themeGrid}>
              {THEME_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.themeOption} ${theme === option.id ? styles.themeOptionActive : ''}`}
                  onClick={() => changeTheme(option.id)}
                  title={option.description}
                >
                  <span className={styles.themeOptionSwatch} data-theme-swatch={option.id} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
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

      <div className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>Membership</h2>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Unlock Full Access</span>
              <span className={styles.settingDesc}>One-time payment · {profile?.commitment || 90}-day journey</span>
            </div>
            <button className={styles.paywallPreviewBtn} onClick={() => navigate('/paywall')}>
              View plans
            </button>
          </div>
        </div>
      </div>

      <div className={styles.accountActions}>
        {!user && (
          <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')} disabled={!isConfigured}>
            <GoogleIcon /> Upgrade to Google Sign-In
          </button>
        )}
        {confirmClear ? (
          <div className={styles.confirmBox}>
            <p className={styles.confirmText}>
              This will permanently delete all your journal entries and profile data. This cannot be undone.
            </p>
            <button
              className={styles.confirmDestructBtn}
              disabled={clearing}
              onClick={async () => {
                setClearing(true)
                await clearAllData()
                setClearing(false)
                setConfirmClear(false)
              }}
            >
              {clearing ? 'Clearing…' : 'Yes, delete everything'}
            </button>
            <button className={styles.confirmCancelBtn} onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        ) : (
          <button className={styles.clearDataBtn} onClick={() => setConfirmClear(true)}>Clear My Data</button>
        )}
        <button className={styles.signOutBtn} onClick={user ? signOut : () => setGuestName(null)}>
          {user ? 'Sign Out' : 'Clear Guest Session'}
        </button>
      </div>

      <p className={styles.version}>La Ultra Run &amp; Bee v1.2.0</p>
    </div>
  )
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({ allEntries, allUserData, indexError, adminUser, onClose, onRemarkSent, onRemarkDeleted, onCoachUpdated, onUserDeleted, onProfileUpdated }) {
  const [selectedUid, setSelectedUid] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const deferredSearchText = useDeferredValue(searchText)

  const userMap = useMemo(() => {
    const map = {}
    allEntries.forEach(e => {
      const uid = e._uid
      if (!map[uid]) {
        map[uid] = {
          uid,
          name: e.userName || allUserData[uid]?.userProfile?.name || allUserData[uid]?.userProfile?.displayName || 'Anonymous',
          email: e.userEmail || '',
          entries: [],
        }
      }
      map[uid].entries.push(e)
    })
    // Merge in profile / coach / remarks from allUserData
    Object.entries(allUserData).forEach(([uid, data]) => {
      if (!map[uid]) {
        map[uid] = {
          uid,
          name: data.userProfile?.name || data.userProfile?.displayName || data.coach?.userName || 'Anonymous',
          email: data.coach?.userEmail || data.userProfile?.email || '',
          entries: [],
        }
      }
      map[uid].userProfile = data.userProfile
      map[uid].coach       = data.coach
      map[uid].remarks     = data.remarks || []
      // Prefer profile displayName if present
      if (data.userProfile?.name || data.userProfile?.displayName) map[uid].name = data.userProfile.name || data.userProfile.displayName
    })
    return map
  }, [allEntries, allUserData])

  const userList = useMemo(() =>
    Object.values(userMap)
      .map(u => ({
        ...u,
        avgScore: u.entries.length
          ? Math.round(u.entries.reduce((s, e) => s + computeFeelScore(e.scores || {}), 0) / u.entries.length * 10) / 10
          : null,
        lastDate: u.entries[0]?.date || null,
      }))
      .sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''))
  , [userMap])

  const adminStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const weekAgoDate = new Date()
    weekAgoDate.setDate(weekAgoDate.getDate() - 7)
    const weekAgo = weekAgoDate.toISOString().split('T')[0]
    return {
      totalUsers: userList.length,
      withPlan: userList.filter(u => u.coach?.goal).length,
      recent: userList.filter(u => u.lastDate && u.lastDate >= weekAgo).length,
      checkedToday: userList.filter(u => u.lastDate === today).length,
      lowFeel: userList.filter(u => typeof u.avgScore === 'number' && u.avgScore < 5).length,
    }
  }, [userList])

  const filteredUsers = useMemo(() => {
    const q = deferredSearchText.trim().toLowerCase()
    const weekAgoDate = new Date()
    weekAgoDate.setDate(weekAgoDate.getDate() - 7)
    const weekAgo = weekAgoDate.toISOString().split('T')[0]
    return userList.filter(u => {
      if (userFilter === 'recent' && (!u.lastDate || u.lastDate < weekAgo)) return false
      if (userFilter === 'no-plan' && u.coach?.goal) return false
      if (userFilter === 'low-feel' && (!(typeof u.avgScore === 'number') || u.avgScore >= 5)) return false
      if (userFilter === 'no-entries' && u.entries.length > 0) return false
      if (!q) return true
      const profile = u.userProfile || {}
      return [
        u.name,
        u.email,
        u.uid,
        profile.path,
        profile.programGoal,
        u.coach?.goal?.focus,
        u.coach?.goal?.raceGoal,
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(q))
    })
  }, [deferredSearchText, userFilter, userList])

  const visibleUsers = filteredUsers.slice(0, 120)

  const selectedUser = selectedUid
    ? userList.find(u => u.uid === selectedUid) || null
    : null

  useEffect(() => {
    if (!selectedUid && userList.length) setSelectedUid(userList[0].uid)
  }, [selectedUid, userList])

  function handleUserDeleted(uid) {
    setSelectedUid(null)
    onUserDeleted?.(uid)
  }

  return (
    <div className={styles.adminPanelPage}>
      {/* Panel header */}
      <div className={styles.adminPanelHeader}>
        <div className={styles.adminPanelHeaderLeft}>
          <button className={styles.backBtn} onClick={onClose}>
            ← Profile
          </button>
          <div>
            <p className={styles.adminPanelLabel}>Admin Control Panel</p>
            <h1 className={styles.adminPanelTitle}>Command Center</h1>
          </div>
        </div>
        <div className={styles.adminHeaderStats}>
          <span className={styles.adminStatChip}>{adminStats.totalUsers} users</span>
          <span className={styles.adminStatChip}>{adminStats.withPlan} plans</span>
          <span className={styles.adminStatChip}>{adminStats.checkedToday} checked in today</span>
          <span className={styles.adminStatChip}>{allEntries.length} journal entries</span>
        </div>
      </div>

      {indexError && (
        <div className={styles.indexWarn}>
          Firestore index needed. Check browser console for the setup link.
        </div>
      )}

      <div className={styles.adminLayout}>
        {/* Left: user list */}
        <aside className={styles.userListPanel}>
          <div className={styles.userListTools}>
            <label className={styles.userSearchBox}>
              <span>Search users</span>
              <input
                type="search"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Name, email, goal..."
              />
            </label>
            <div className={styles.userFilterRow} aria-label="Filter users">
              {[
                ['all', `All ${adminStats.totalUsers}`],
                ['recent', `Recent ${adminStats.recent}`],
                ['low-feel', `Low Feel ${adminStats.lowFeel}`],
                ['no-plan', 'No Plan'],
                ['no-entries', 'No Logs'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`${styles.userFilterBtn} ${userFilter === id ? styles.userFilterBtnActive : ''}`}
                  onClick={() => setUserFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className={styles.userListCount}>
              Showing {visibleUsers.length} of {filteredUsers.length}
            </p>
          </div>
          {userList.length === 0 && (
            <p className={styles.empty}>No users yet…</p>
          )}
          {userList.length > 0 && filteredUsers.length === 0 && (
            <p className={styles.empty}>No users match this view.</p>
          )}
          {visibleUsers.map(u => {
            const color = u.avgScore === null ? 'var(--ink-faint)'
              : u.avgScore >= 7 ? '#8b9e7e' : u.avgScore >= 4 ? '#d9b38a' : '#d98a8a'
            return (
              <button
                key={u.uid}
                className={`${styles.userListItem} ${selectedUid === u.uid ? styles.userListItemActive : ''}`}
                onClick={() => setSelectedUid(u.uid)}
              >
                <div className={styles.userListAvatar}>{(u.name || '?')[0].toUpperCase()}</div>
                <div className={styles.userListInfo}>
                  <span className={styles.userListName}>{u.name}</span>
                  <span className={styles.userListEmail}>{u.email}</span>
                  <span className={styles.userListMeta}>
                    {u.entries.length} entries · {u.lastDate || 'no entries'}
                  </span>
                </div>
                <span className={styles.userListScore} style={{ color }}>
                  {u.avgScore !== null ? u.avgScore.toFixed(1) : '—'}
                </span>
              </button>
            )
          })}
          {filteredUsers.length > visibleUsers.length && (
            <p className={styles.userListLimit}>Narrow search to see the remaining {filteredUsers.length - visibleUsers.length} users.</p>
          )}
        </aside>

        {/* Right: user detail */}
        <main className={styles.userDetailPanel}>
          {!selectedUser ? (
            <div className={styles.noSelection}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.25">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
              </svg>
              <p>Select a user to view their details</p>
            </div>
          ) : (
            <UserDetail
              key={selectedUser.uid}
              user={selectedUser}
              adminUser={adminUser}
              onCoachUpdated={coach => onCoachUpdated(selectedUser.uid, coach)}
              onRemarkSent={remark => onRemarkSent(selectedUser.uid, remark)}
              onRemarkDeleted={remarkId => onRemarkDeleted(selectedUser.uid, remarkId)}
              onDeleted={() => handleUserDeleted(selectedUser.uid)}
              onProfileUpdated={profile => onProfileUpdated?.(selectedUser.uid, profile)}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// ── User Detail ───────────────────────────────────────────────────────────────
function UserDetail({ user, adminUser, onRemarkSent, onRemarkDeleted, onCoachUpdated, onDeleted, onProfileUpdated }) {
  const [tab,              setTab]             = useState('overview')
  const [remarkText,       setRemarkText]      = useState('')
  const [remarkRunDate,    setRemarkRunDate]   = useState('')
  const [sending,          setSending]         = useState(false)
  const [remarkError,      setRemarkError]     = useState(null)
  const [remarkDeleteError, setRemarkDeleteError] = useState(null)
  const [pendingRemarkDelete, setPendingRemarkDelete] = useState(null)
  const [deletingRemark,   setDeletingRemark]  = useState(null)
  const [expandedEntry,    setExpandedEntry]   = useState(null)
  const [localRemarks,     setLocalRemarks]    = useState(user.remarks || [])
  const [localEntries,     setLocalEntries]    = useState(user.entries || [])
  const [editingPlan,      setEditingPlan]     = useState(false)
  const [planDraft,        setPlanDraft]       = useState([])
  const [savingPlan,       setSavingPlan]      = useState(false)
  const [planError,        setPlanError]       = useState(null)
  const [pickerAfterIndex, setPickerAfterIndex] = useState(null)
  const [confirmDelete,    setConfirmDelete]   = useState(false)
  const [deleting,         setDeleting]        = useState(false)
  const [deleteError,      setDeleteError]     = useState(null)
  // Profile editing
  const [profileDraft,     setProfileDraft]    = useState(() => buildAdminProfileDraft(user))
  const [profileDirty,     setProfileDirty]    = useState(false)
  const [profileLiveNotice, setProfileLiveNotice] = useState('')
  const [savingProfile,    setSavingProfile]   = useState(false)
  const [profileError,     setProfileError]    = useState(null)
  // Journal entry deletion
  const [deletingEntry,    setDeletingEntry]   = useState(null)
  // Coach goal management
  const [clearingGoal,     setClearingGoal]    = useState(false)
  const [clearGoalError,   setClearGoalError]  = useState(null)
  const [confirmClearGoal, setConfirmClearGoal] = useState(false)
  // Week generation
  const [generatingWeek,   setGeneratingWeek]  = useState(null)
  const [generateWeekError, setGenerateWeekError] = useState(null)

  const userProfile = user.userProfile
  const coach       = user.coach
  const goal        = coach?.goal
  const checkins    = coach?.checkins || []
  const plan        = useMemo(() => applyCycleAdaptationToPlan(getFullCoachPlan(goal), userProfile), [goal, userProfile])
  const insights    = useMemo(() => getUserInsights(user, plan, checkins), [user, plan, checkins])

  useEffect(() => {
    setPlanDraft(plan)
    setEditingPlan(false)
    setPlanError(null)
  }, [user.uid, plan])

  useEffect(() => {
    setLocalEntries(user.entries || [])
    setLocalRemarks(user.remarks || [])
  }, [user.uid, user.entries, user.remarks])

  useEffect(() => {
    const nextDraft = buildAdminProfileDraft(user)
    if (!profileDirty) {
      setProfileDraft(nextDraft)
      setProfileLiveNotice('')
      return
    }
    setProfileLiveNotice('This profile changed from another device. Save your edits or reload the latest details.')
  }, [user.uid, userProfile, user.name, user.email])

  function setProfileField(key, value) {
    setProfileDirty(true)
    setProfileLiveNotice('')
    setProfileDraft(prev => ({ ...buildAdminProfileDraft(user), ...(prev || {}), [key]: value }))
  }

  function reloadProfileDraft() {
    setProfileDraft(buildAdminProfileDraft(user))
    setProfileDirty(false)
    setProfileLiveNotice('')
    setProfileError(null)
  }

  async function sendRemark() {
    if (!remarkText.trim() || sending) return
    setSending(true)
    setRemarkError(null)
    const remark = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      runDate: remarkRunDate || null,
      runLabel: remarkRunDate ? `Run on ${remarkRunDate}` : null,
      text: remarkText.trim(),
      from: adminUser.displayName || 'Dr. Rajat',
      createdAt: new Date().toISOString(),
    }
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'config', 'adminRemarks'),
        { remarks: arrayUnion(remark) },
        { merge: true }
      )
      setLocalRemarks(prev => [...prev, remark])
      setRemarkText('')
      setRemarkRunDate('')
      onRemarkSent(remark)
    } catch (err) {
      setRemarkError('Could not send remark: ' + err.message)
    }
    setSending(false)
  }

  async function deleteRemark(remarkId) {
    if (!remarkId || deletingRemark) return
    setDeletingRemark(remarkId)
    setRemarkDeleteError(null)
    try {
      const nextRemarks = localRemarks.filter(remark => remark.id !== remarkId)
      await setDoc(
        doc(db, 'users', user.uid, 'config', 'adminRemarks'),
        { remarks: nextRemarks },
        { merge: true }
      )
      setLocalRemarks(nextRemarks)
      setPendingRemarkDelete(null)
      onRemarkDeleted?.(remarkId)
    } catch (err) {
      setRemarkDeleteError('Could not delete remark: ' + err.message)
    }
    setDeletingRemark(null)
  }

  async function deleteUserData() {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      // 1. Plant tombstone first so an online client sees it on its next snapshot
      //    tick and signs itself out before we wipe everything.
      await setDoc(doc(db, 'users', user.uid, 'config', '_deleted'), {
        deletedAt: new Date().toISOString(),
        deletedBy: adminUser.email,
      })
      // 2. Delete journal entries
      const journalSnap = await getDocs(collection(db, 'users', user.uid, 'journal'))
      await Promise.all(journalSnap.docs.map(d => deleteDoc(d.ref)))
      // 3. Delete every config doc EXCEPT the tombstone, which we keep so the
      //    deleted user's client can still detect the deletion on next load.
      const configSnap = await getDocs(collection(db, 'users', user.uid, 'config'))
      await Promise.all(
        configSnap.docs
          .filter(d => d.id !== '_deleted')
          .map(d => deleteDoc(d.ref))
      )
      setConfirmDelete(false)
      onDeleted?.()
    } catch (err) {
      setDeleteError('Could not delete user: ' + err.message)
      setDeleting(false)
    }
  }

  async function saveProfile() {
    if (savingProfile || !profileDraft) return
    setSavingProfile(true)
    setProfileError(null)
    try {
      const nextProfile = { ...profileDraft, updatedAt: new Date().toISOString() }
      await setDoc(doc(db, 'users', user.uid, 'config', 'profile'), nextProfile, { merge: true })
      setProfileDraft(nextProfile)
      setProfileDirty(false)
      setProfileLiveNotice('')
      onProfileUpdated?.(nextProfile)
    } catch (err) {
      setProfileError('Could not save profile: ' + err.message)
    }
    setSavingProfile(false)
  }

  async function deleteJournalEntry(date) {
    setDeletingEntry(date)
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'journal', date))
      setLocalEntries(prev => prev.filter(e => e.date !== date))
      if (expandedEntry === date) setExpandedEntry(null)
    } catch (err) {
      console.warn('Could not delete entry:', err)
    }
    setDeletingEntry(null)
  }

  async function clearCoachGoal() {
    if (clearingGoal) return
    setClearingGoal(true)
    setClearGoalError(null)
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'config', 'coach'))
      onCoachUpdated(null)
      setConfirmClearGoal(false)
    } catch (err) {
      setClearGoalError('Could not clear goal: ' + err.message)
    }
    setClearingGoal(false)
  }

  function updatePlanDay(index, field, value) {
    setPlanDraft(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function normalizeDraftOrder(items) {
    const startDate = goal?.startDate || items[0]?.date || new Date().toISOString().split('T')[0]
    return items.map((item, i) => {
      const date = addDaysISO(startDate, i)
      return {
        ...item,
        id: item.id || `day-${i + 1}`,
        dayNumber: i + 1,
        week: Math.floor(i / 7) + 1,
        date,
        day: DAYS_FULL[new Date(`${date}T00:00:00`).getDay()],
      }
    })
  }

  function openPicker(afterIndex) {
    setPickerAfterIndex(afterIndex ?? planDraft.length - 1)
  }

  function addPlanDayWithPreset(preset, afterIndex) {
    const idx = afterIndex ?? planDraft.length - 1
    setPlanDraft(prev => {
      const insertAt = Math.max(0, Math.min(prev.length, idx + 1))
      const nextDay = {
        id: `admin-day-${Date.now()}`,
        type: preset.type || 'easy',
        title: preset.title || 'New workout',
        distance: preset.distance || '',
        duration: preset.duration || '30 min',
        pace: preset.pace || 'Conversational',
        notes: preset.notes || '',
        strength: preset.strength || '',
        mobility: preset.mobility || '',
        crossTraining: preset.crossTraining || '',
      }
      return normalizeDraftOrder([...prev.slice(0, insertAt), nextDay, ...prev.slice(insertAt)])
    })
    setEditingPlan(true)
  }

  function duplicatePlanDay(index) {
    setPlanDraft(prev => {
      const copy = { ...prev[index], id: `admin-day-${Date.now()}`, title: `${prev[index]?.title || 'Workout'} copy` }
      return normalizeDraftOrder([...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)])
    })
    setEditingPlan(true)
  }

  function removePlanDay(index) {
    setPlanDraft(prev => normalizeDraftOrder(prev.filter((_, i) => i !== index)))
    setEditingPlan(true)
  }

  function restPlanDay(index) {
    setPlanDraft(prev => prev.map((item, i) => i === index ? {
      ...item,
      type: 'rest',
      title: 'Rest / Recovery',
      distance: '',
      duration: '10-20 min optional walk',
      pace: 'Very easy',
      notes: 'Full rest or an easy walk. Keep effort low and prepare for the next planned session.',
      crossTraining: '',
    } : item))
    setEditingPlan(true)
  }

  function movePlanDay(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    setPlanDraft(prev => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return normalizeDraftOrder(next)
    })
    setEditingPlan(true)
  }

  async function savePlanEdits() {
    if (!coach?.goal || savingPlan) return
    setSavingPlan(true)
    setPlanError(null)
    const nextCoach = {
      ...coach,
      goal: {
        ...coach.goal,
        plan: normalizeDraftOrder(planDraft),
        commitmentDays: planDraft.length,
        updatedByAdminAt: new Date().toISOString(),
      },
    }
    try {
      await setDoc(doc(db, 'users', user.uid, 'config', 'coach'), nextCoach, { merge: true })
      onCoachUpdated?.(nextCoach)
      setEditingPlan(false)
    } catch (err) {
      setPlanError('Could not save plan: ' + err.message)
    }
    setSavingPlan(false)
  }

  async function adminGenerateWeek(weekNum) {
    if (!coach?.goal || generatingWeek !== null) return
    setGeneratingWeek(weekNum)
    setGenerateWeekError(null)
    try {
      const rawDays = await generateSingleWeek({ goal: coach.goal, weekNum })
      const dayOffset = (weekNum - 1) * 7
      const startDate = coach.goal.startDate
      const newDays = (rawDays || []).map((d, i) => {
        const date = addDaysISO(startDate, dayOffset + i)
        return {
          id: `day-${dayOffset + i + 1}`,
          dayNumber: dayOffset + i + 1,
          week: weekNum,
          date,
          day: DAYS_FULL[new Date(`${date}T00:00:00`).getDay()],
          type: d.type || 'rest',
          title: d.title || 'Rest / Recovery',
          purpose: d.purpose || '',
          distance: d.distance || '',
          duration: d.duration || '',
          pace: d.pace || '',
          notes: d.notes || '',
          crossTraining: d.crossTraining || '',
          strength: d.strength || '',
          mobility: d.mobility || '',
        }
      })
      const existingPlan = coach.goal.plan || []
      const merged = [
        ...existingPlan.filter(d => (d.dayNumber || 0) <= dayOffset),
        ...newDays,
        ...existingPlan.filter(d => (d.dayNumber || 0) > dayOffset + newDays.length),
      ].sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))
      const newGeneratedWeeks = Math.max(coach.goal.generatedWeeks || 0, weekNum)
      const nextCoach = {
        ...coach,
        goal: { ...coach.goal, plan: merged, generatedWeeks: newGeneratedWeeks, updatedByAdminAt: new Date().toISOString() },
      }
      await setDoc(doc(db, 'users', user.uid, 'config', 'coach'), nextCoach, { merge: true })
      onCoachUpdated?.(nextCoach)
      setPlanDraft(merged)
    } catch (err) {
      setGenerateWeekError(`Week ${weekNum} generation failed: ${err.message}`)
    }
    setGeneratingWeek(null)
  }

  const avgScore = user.avgScore
  const scoreColor = SCORE_COLOR(avgScore || 0)

  return (
    <div className={styles.userDetail}>
      {/* Workout picker modal */}
      {pickerAfterIndex !== null && (
        <WorkoutPickerModal
          onPick={preset => {
            addPlanDayWithPreset(preset, pickerAfterIndex)
            setPickerAfterIndex(null)
          }}
          onClose={() => setPickerAfterIndex(null)}
        />
      )}

      {/* User header */}
      <div className={styles.userDetailHeader}>
        <div className={styles.userDetailAvatarBig}>{(user.name || '?')[0].toUpperCase()}</div>
        <div className={styles.userDetailMeta}>
          <h2 className={styles.userDetailName}>{user.name}</h2>
          <p className={styles.userDetailEmail}>{user.email}</p>
          <div className={styles.userDetailTags}>
            {userProfile?.path && <span className={styles.tag}>{PATH_NAMES[userProfile.path] || userProfile.path}</span>}
            {userProfile?.commitment && <span className={styles.tag}>{userProfile.commitment}-day commitment</span>}
            <span className={styles.tag}>{user.entries.length} entries logged</span>
            {goal && <span className={styles.tagCoach}>Running: {goal.focus || goal.raceGoal}</span>}
          </div>
        </div>
        <div className={styles.userDetailScoreBig}>
          <span className={styles.scoreBigNum} style={{ color: scoreColor }}>
            {avgScore !== null ? avgScore.toFixed(1) : '—'}
          </span>
          <span className={styles.scoreBigLabel}>avg feel</span>
          {confirmDelete ? (
            <div className={styles.deleteConfirmInline}>
              {deleteError && <p className={styles.deleteErrorMsg}>{deleteError}</p>}
              <p className={styles.deleteConfirmText}>Delete all data for {user.name}?</p>
              <div className={styles.deleteConfirmActions}>
                <button
                  className={styles.confirmDestructBtn}
                  disabled={deleting}
                  onClick={deleteUserData}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  className={styles.confirmCancelBtn}
                  disabled={deleting}
                  onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.deleteUserBtn} onClick={() => setConfirmDelete(true)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Delete Account
            </button>
          )}
        </div>
      </div>

      <div className={styles.adminBossBar}>
        <div>
          <span className={styles.adminBossKicker}>Admin controls</span>
          <strong>View and change this user&apos;s profile, logs, plan, remarks, and account state.</strong>
        </div>
        <div className={styles.adminBossActions}>
          <button type="button" onClick={() => setTab('profile')}>Edit Profile</button>
          <button type="button" onClick={() => setTab('journal')}>Journal</button>
          <button
            type="button"
            onClick={() => {
              setTab('coach')
              if (goal) setEditingPlan(true)
            }}
          >
            {goal ? 'Edit Plan' : 'View Running'}
          </button>
          <button type="button" onClick={() => setTab('remarks')}>Send Remark</button>
          <button type="button" className={styles.adminBossDanger} onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.detailTabs}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'profile',  label: 'Edit Profile' },
          { id: 'journal',  label: `Journal (${localEntries.length})` },
          { id: 'coach',    label: goal ? `Running · ${goal.focus || goal.raceGoal}` : 'Running' },
          { id: 'remarks',  label: `Remarks (${localRemarks.length})` },
        ].map(t => (
          <button
            key={t.id}
            className={`${styles.detailTab} ${tab === t.id ? styles.detailTabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.detailContent}>
        {tab === 'overview' && (
          <AdminUserOverview
            user={user}
            userProfile={userProfile}
            insights={insights}
            plan={plan}
            checkins={checkins}
          />
        )}

        {/* ── Profile Edit Tab ────────────────────────────────── */}
        {tab === 'profile' && (() => {
          const draft = profileDraft || buildAdminProfileDraft(user)
          const set = setProfileField
          return (
            <div className={styles.profileEditPanel}>
              <p className={styles.profileEditHint}>All known profile details are editable here. Saving writes to Firestore and live-syncs to the user&apos;s app.</p>
              {profileError && <p className={styles.errorMsg}>{profileError}</p>}
              {profileLiveNotice && (
                <div className={styles.profileLiveNotice}>
                  <p>{profileLiveNotice}</p>
                  <button type="button" onClick={reloadProfileDraft}>Reload latest</button>
                </div>
              )}
              <div className={styles.profileEditGrid}>
                {[
                  ['Name',         'name',         'text',   draft.name || ''],
                  ['Display name', 'displayName',  'text',   draft.displayName || ''],
                  ['Email',        'email',        'email',  draft.email || ''],
                  ['Age range',    'ageRange',     'text',   draft.ageRange || ''],
                  ['Heard about',  'heardAbout',   'text',   draft.heardAbout || ''],
                ].map(([label, key, type, val]) => (
                  <label key={key} className={styles.profileEditField}>
                    <span>{label}</span>
                    <input
                      type={type}
                      value={val}
                      onChange={e => set(key, e.target.value)}
                    />
                  </label>
                ))}
                <label className={styles.profileEditField}>
                  <span>Gender</span>
                  <select
                    value={draft.gender || draft.sex || ''}
                    onChange={e => { set('gender', e.target.value); set('sex', e.target.value) }}
                  >
                    <option value="">not set</option>
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="self-described">Self-described</option>
                    <option value="prefer-not">Prefer not to say</option>
                  </select>
                </label>
                <label className={styles.profileEditField}>
                  <span>Path</span>
                  <select value={draft.path || ''} onChange={e => set('path', e.target.value)}>
                    <option value="">— not set —</option>
                    <option value="rehab">The Rehab Path</option>
                    <option value="beginner">The Beginner Path</option>
                    <option value="performance">The Performance Path</option>
                  </select>
                </label>
                <label className={styles.profileEditField}>
                  <span>Commitment (days)</span>
                  <input type="number" value={draft.commitment || ''} onChange={e => set('commitment', Number(e.target.value) || '')} />
                </label>
                <label className={styles.profileEditField}>
                  <span>Onboarding complete</span>
                  <select value={draft.onboardingComplete ? 'yes' : 'no'} onChange={e => set('onboardingComplete', e.target.value === 'yes')}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className={styles.profileEditField}>
                  <span>Last profile update</span>
                  <input type="text" value={draft.updatedAt || ''} readOnly />
                </label>
              </div>
              <div className={styles.profileEditSection}>
                <h3>Cycle and physiology</h3>
                <p>These optional fields drive period-window de-escalation across the Running plan.</p>
                <div className={styles.profileEditGrid}>
                  <label className={styles.profileEditField}>
                    <span>Last period start</span>
                    <input type="date" value={draft.lastPeriod || ''} onChange={e => set('lastPeriod', e.target.value)} />
                  </label>
                  <label className={styles.profileEditField}>
                    <span>Expected next period</span>
                    <input type="date" value={draft.nextPeriod || ''} onChange={e => set('nextPeriod', e.target.value)} />
                  </label>
                  <label className={styles.profileEditField}>
                    <span>Average cycle length</span>
                    <input type="number" min="15" max="90" value={draft.cycleLength || ''} onChange={e => set('cycleLength', e.target.value)} placeholder="28" />
                  </label>
                  <label className={styles.profileEditField}>
                    <span>Average period duration</span>
                    <input type="number" min="1" max="14" value={draft.periodLength || ''} onChange={e => set('periodLength', e.target.value)} placeholder="5" />
                  </label>
                  <label className={styles.profileEditField}>
                    <span>Perimenopause / menopause</span>
                    <select value={draft.menopauseStatus || ''} onChange={e => set('menopauseStatus', e.target.value)}>
                      <option value="">not set</option>
                      <option value="no">No</option>
                      <option value="perimenopause">Perimenopause</option>
                      <option value="menopause">Menopause</option>
                      <option value="unsure">Not sure</option>
                    </select>
                  </label>
                </div>
                <CycleWindowPreview profile={draft} goal={goal} />
              </div>
              <label className={styles.profileEditField} style={{ marginTop: 12 }}>
                <span>Program goal</span>
                <input type="text" value={draft.programGoal || ''} onChange={e => set('programGoal', e.target.value)} />
              </label>
              <label className={styles.profileEditField} style={{ marginTop: 8 }}>
                <span>Their story</span>
                <textarea rows={4} value={draft.fitnessHistory || draft.story || ''} onChange={e => { set('fitnessHistory', e.target.value); set('story', e.target.value) }} />
              </label>
              <label className={styles.profileEditField} style={{ marginTop: 8 }}>
                <span>Self-commitment statement</span>
                <textarea rows={3} value={draft.commitmentStatement || ''} onChange={e => set('commitmentStatement', e.target.value)} />
              </label>
              <div className={styles.profileEditActions}>
                <button
                  type="button"
                  className={styles.cancelPlanBtn}
                  onClick={reloadProfileDraft}
                  disabled={savingProfile || !profileDirty}
                >
                  Reset
                </button>
                <button
                  className={styles.editPlanBtn}
                  onClick={saveProfile}
                  disabled={savingProfile || !profileDirty}
                >
                  {savingProfile ? 'Saving...' : profileDirty ? 'Save Profile' : 'Profile Saved'}
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── Journal Tab ─────────────────────────────────────── */}
        {tab === 'journal' && (
          <div>
            {userProfile?.story && (
              <div className={styles.storyCard}>
                <p className={styles.storyLabel}>Their Story</p>
                <p className={styles.storyText}>{userProfile.story}</p>
              </div>
            )}
            {localEntries.length === 0
              ? <p className={styles.empty}>No journal entries yet.</p>
              : localEntries.map(entry => (
                  <EntryCard
                    key={entry.date}
                    entry={entry}
                    expanded={expandedEntry === entry.date}
                    onToggle={() => setExpandedEntry(p => p === entry.date ? null : entry.date)}
                    onDelete={() => deleteJournalEntry(entry.date)}
                    deleting={deletingEntry === entry.date}
                  />
                ))
            }
          </div>
        )}

        {/* ── Coach Tab ───────────────────────────────────────── */}
        {tab === 'coach' && (
          <div>
            {/* Clear goal */}
            {goal && (
              <div className={styles.clearGoalRow}>
                {confirmClearGoal ? (
                  <>
                    {clearGoalError && <p className={styles.deleteErrorMsg}>{clearGoalError}</p>}
                    <span>Clear all training data for {user.name}?</span>
                    <button className={styles.confirmDestructBtn} disabled={clearingGoal} onClick={clearCoachGoal}>
                      {clearingGoal ? 'Clearing…' : 'Yes, clear'}
                    </button>
                    <button className={styles.confirmCancelBtn} onClick={() => setConfirmClearGoal(false)}>Cancel</button>
                  </>
                ) : (
                  <button className={styles.deleteUserBtn} onClick={() => setConfirmClearGoal(true)}>
                    Clear Training Program
                  </button>
                )}
              </div>
            )}
            {!goal
              ? <p className={styles.empty}>No training program set up yet.</p>
              : <>
                  <div className={styles.coachGoalCard}>
                    {[
                      ['Focus',        goal.focus || goal.raceGoal],
                      ['Level',        goal.experience],
                      ['Program',      `${goal.commitmentDays || ((goal.weeks || 0) * 7)} days · ${goal.daysPerWeek} days/week`],
                      ['Weekly volume', goal.currentKm],
                      ['Started',      goal.startDate],
                    ].map(([label, val]) => (
                      <div key={label} className={styles.coachGoalRow}>
                        <span className={styles.coachGoalLabel}>{label}</span>
                        <span className={styles.coachGoalValue}>{val || '—'}</span>
                      </div>
                    ))}
                    {goal.overview && (
                      <div className={styles.coachOverview}>
                        <p className={styles.coachGoalLabel}>Overview</p>
                        <p className={styles.coachOverviewText}>{goal.overview}</p>
                      </div>
                    )}
                  </div>

                  <div className={styles.checkinSummaryRow}>
                    <span style={{ color: '#8b9e7e' }}>✓ {checkins.filter(c => c.status === 'done').length} done</span>
                    <span style={{ color: '#d9b38a' }}>↗ {checkins.filter(c => c.status === 'partial').length} partial</span>
                    <span style={{ color: '#d98a8a' }}>✗ {checkins.filter(c => c.status === 'missed').length} missed</span>
                  </div>

                  {generateWeekError && <p className={styles.errorMsg}>{generateWeekError}</p>}
                  <AdminPlanEditor
                    plan={plan}
                    planDraft={planDraft}
                    editingPlan={editingPlan}
                    savingPlan={savingPlan}
                    planError={planError}
                    checkins={checkins}
                    onUpdateDay={updatePlanDay}
                    onOpenPicker={openPicker}
                    onDuplicateDay={duplicatePlanDay}
                    onRemoveDay={removePlanDay}
                    onRestDay={restPlanDay}
                    onMoveDay={movePlanDay}
                    onSave={savePlanEdits}
                    onCancel={() => { setPlanDraft(plan); setEditingPlan(false); setPlanError(null) }}
                    onStartEdit={() => setEditingPlan(true)}
                    goal={goal}
                    onGenerateWeek={adminGenerateWeek}
                    generatingWeek={generatingWeek}
                  />

                  {checkins.length > 0 && (
                    <div className={styles.runLogFull}>
                      <p className={styles.runLogTitle}>Full Run Log</p>
                      {[...checkins].reverse().map(c => (
                        <div key={c.date} className={styles.runLogRow}>
                          <span className={styles.runLogDate}>{c.date}</span>
                          <span className={styles.runLogStatus}
                            style={{ color: c.status === 'done' ? '#8b9e7e' : c.status === 'partial' ? '#d9b38a' : '#d98a8a' }}>
                            {c.status === 'done' ? '✓' : c.status === 'partial' ? '↗' : '✗'}
                          </span>
                          <span className={styles.runLogNote}>{c.userNote}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
            }
          </div>
        )}

        {/* ── Remarks Tab ─────────────────────────────────────── */}
        {tab === 'remarks' && (
          <div>
            <div className={styles.remarkForm}>
              <p className={styles.remarkFormLabel}>Send a remark to {user.name}</p>
              {checkins.length > 0 && (
                <select
                  className={styles.remarkSelect}
                  value={remarkRunDate}
                  onChange={e => setRemarkRunDate(e.target.value)}
                >
                  <option value="">General running remark</option>
                  {[...checkins].reverse().map(c => (
                    <option key={c.date} value={c.date}>
                      {c.date} - {c.status} - {c.userNote?.slice(0, 48)}
                    </option>
                  ))}
                </select>
              )}
              <textarea
                className={styles.remarkInput}
                placeholder="Write your feedback, encouragement, or advice for this user…"
                value={remarkText}
                onChange={e => setRemarkText(e.target.value)}
                rows={4}
              />
              {remarkError && <p className={styles.errorMsg}>{remarkError}</p>}
              <button
                className={styles.sendRemarkBtn}
                disabled={!remarkText.trim() || sending}
                onClick={sendRemark}
              >
                {sending ? 'Sending…' : 'Send Remark'}
              </button>
            </div>

            {localRemarks.length === 0
              ? <p className={styles.empty}>No remarks sent yet.</p>
              : (
                <div className={styles.remarksHistory}>
                  <p className={styles.remarksHistoryLabel}>Sent remarks</p>
                  {remarkDeleteError && <p className={styles.errorMsg}>{remarkDeleteError}</p>}
                  {[...localRemarks].reverse().map(r => (
                    <div key={r.id} className={styles.remarkCard}>
                      <div className={styles.remarkCardHead}>
                        <div className={styles.remarkMeta}>
                          <span className={styles.remarkFrom}>{r.from}</span>
                          <span className={styles.remarkDate}>{r.runDate || r.date}</span>
                        </div>
                        {pendingRemarkDelete === r.id ? (
                          <div className={styles.remarkDeleteConfirm}>
                            <span>Delete?</span>
                            <button
                              type="button"
                              className={styles.remarkDeleteYes}
                              disabled={deletingRemark === r.id}
                              onClick={() => deleteRemark(r.id)}
                            >
                              {deletingRemark === r.id ? 'Deleting...' : 'Yes'}
                            </button>
                            <button
                              type="button"
                              className={styles.remarkDeleteNo}
                              disabled={deletingRemark === r.id}
                              onClick={() => setPendingRemarkDelete(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={styles.remarkDeleteBtn}
                            onClick={() => {
                              setRemarkDeleteError(null)
                              setPendingRemarkDelete(r.id)
                            }}
                            aria-label="Delete remark"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      {r.runDate && <p className={styles.remarkRunLink}>Attached to run on {r.runDate}</p>}
                      <p className={styles.remarkText}>{r.text}</p>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  )
}

function getUserInsights(user, plan, checkins) {
  const entries = [...(user.entries || [])].sort((a, b) => b.date.localeCompare(a.date))
  const sessions = entries.flatMap(entry => (entry.sessions || []).map(session => ({
    date: entry.date,
    name: session.exerciseName || session.title || session.exerciseId || session.type || 'Session',
    type: session.type,
    status: session.status || 'completed',
  })))
  const timeline = entries.slice(0, 10).map(entry => {
    const score = computeFeelScore(entry.scores || {})
    const entrySessions = entry.sessions || []
    const runCheckin = checkins.find(c => c.date === entry.date)
    const parts = []
    parts.push(`Feel ${score.toFixed(1)}/10`)
    if (entrySessions.length) parts.push(`${entrySessions.length} exercise${entrySessions.length === 1 ? '' : 's'}`)
    if (runCheckin) parts.push(`run ${runCheckin.status}`)
    return { date: entry.date, score, summary: parts.join(' - ') }
  })

  return {
    streak: computeEntryStreak(entries),
    exerciseCount: sessions.length,
    recentExercises: sessions.slice(0, 8),
    lastEntryDate: entries[0]?.date || null,
    plannedWorkouts: plan.filter(day => day.type !== 'rest').length,
    timeline,
  }
}

function computeEntryStreak(entries) {
  if (!entries.length) return 0
  const dates = new Set(entries.map(entry => entry.date))
  let cursor = new Date()
  let streak = 0
  while (dates.has(cursor.toISOString().split('T')[0])) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function CycleWindowPreview({ profile, goal }) {
  const startDate = goal?.startDate || new Date().toISOString().split('T')[0]
  const totalDays = goal?.commitmentDays || 91
  const windows = getCycleWindows(profile, startDate, totalDays).slice(0, 6)
  const hasCycleData = profile?.lastPeriod || profile?.nextPeriod || profile?.cycleLength || profile?.periodLength || profile?.menopauseStatus

  if (!hasCycleData) {
    return <p className={styles.profileEditNote}>No cycle details entered yet.</p>
  }

  if (!windows.length) {
    return <p className={styles.profileEditNote}>No projected period windows. Check gender, dates, cycle length, or menopause status.</p>
  }

  return (
    <div className={styles.cyclePreview}>
      <span>Projected low-intensity windows</span>
      <div>
        {windows.map(window => (
          <em key={window.start}>{window.start} to {window.end}</em>
        ))}
      </div>
    </div>
  )
}

function AdminUserOverview({ user, userProfile, insights, plan, checkins }) {
  const cycleRows = [
    ['Last period start', userProfile?.lastPeriod],
    ['Expected next period', userProfile?.nextPeriod],
    ['Average cycle length', userProfile?.cycleLength ? `${userProfile.cycleLength} days` : null],
    ['Average period duration', userProfile?.periodLength ? `${userProfile.periodLength} days` : null],
    ['Perimenopause / menopause', MENOPAUSE_LABELS[userProfile?.menopauseStatus] || userProfile?.menopauseStatus],
  ]
  const cycleWindows = plan.length
    ? getCycleWindows(userProfile, plan[0]?.date, plan.length).slice(0, 6)
    : []
  const signupRows = [
    ['Name', userProfile?.name || user.name],
    ['Age range', userProfile?.ageRange],
    ['Gender', userProfile?.gender || userProfile?.sex],
    ['Path', PATH_NAMES[userProfile?.path] || userProfile?.path],
    ['Commitment', userProfile?.commitment ? `${userProfile.commitment} days` : null],
    ['Heard about us', userProfile?.heardAbout],
    ['Program goal', userProfile?.programGoal],
    ['Last updated', userProfile?.updatedAt],
  ]

  return (
    <div className={styles.adminOverview}>
      <section className={styles.overviewMetricGrid}>
        <div className={styles.overviewMetric}><strong>{insights.streak}</strong><span>day streak</span></div>
        <div className={styles.overviewMetric}><strong>{user.entries.length}</strong><span>Feel entries</span></div>
        <div className={styles.overviewMetric}><strong>{insights.exerciseCount}</strong><span>exercises done</span></div>
        <div className={styles.overviewMetric}><strong>{checkins.length}</strong><span>run check-ins</span></div>
      </section>

      <section className={styles.overviewGrid}>
        <div className={styles.overviewCard}>
          <h3>Sign-up Submission</h3>
          <div className={styles.signupRows}>
            {signupRows.filter(([, value]) => value).map(([label, value]) => (
              <div key={label} className={styles.signupRow}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {(userProfile?.fitnessHistory || userProfile?.story) && (
            <div className={styles.longProfileText}>
              <span>Their story</span>
              <p>{userProfile.fitnessHistory || userProfile.story}</p>
            </div>
          )}
          {userProfile?.commitmentStatement && (
            <div className={styles.longProfileText}>
              <span>Self-commitment</span>
              <p>{userProfile.commitmentStatement}</p>
            </div>
          )}
          {(cycleRows.some(([, value]) => value) || cycleWindows.length > 0) && (
            <>
              <h4 className={styles.overviewSubhead}>Cycle context</h4>
              <div className={styles.signupRows}>
                {cycleRows.filter(([, value]) => value).map(([label, value]) => (
                  <div key={label} className={styles.signupRow}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              {cycleWindows.length > 0 && (
                <div className={styles.cycleWindowList}>
                  {cycleWindows.map(window => (
                    <span key={window.start}>{window.start} to {window.end}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.overviewCard}>
          <h3>Activity Snapshot</h3>
          <div className={styles.signupRows}>
            <div className={styles.signupRow}><span>Last Feel</span><strong>{insights.lastEntryDate || 'None yet'}</strong></div>
            <div className={styles.signupRow}><span>Average Feel</span><strong>{user.avgScore !== null ? user.avgScore.toFixed(1) : 'No data'}</strong></div>
            <div className={styles.signupRow}><span>Planned workouts</span><strong>{plan.filter(day => day.type !== 'rest').length}</strong></div>
            <div className={styles.signupRow}><span>Completed runs</span><strong>{checkins.filter(c => c.status === 'done').length}</strong></div>
          </div>
          <h4 className={styles.overviewSubhead}>Recent exercises</h4>
          {insights.recentExercises.length ? (
            <div className={styles.exercisePills}>
              {insights.recentExercises.map((session, index) => (
                <span key={`${session.date}-${session.name}-${index}`}>
                  {session.name} <em>{session.date}</em>
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.overviewEmpty}>No exercise sessions logged yet.</p>
          )}
        </div>
      </section>

      <section className={styles.overviewCard}>
        <h3>Recent Feel and Workout Timeline</h3>
        {insights.timeline.length ? (
          <div className={styles.userTimeline}>
            {insights.timeline.map(item => (
              <div key={item.date} className={styles.timelineRow}>
                <span className={styles.timelineDate}>{item.date}</span>
                <span className={styles.timelineScore}>{item.score !== null ? item.score.toFixed(1) : '-'}</span>
                <p>{item.summary}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.overviewEmpty}>No timeline activity yet.</p>
        )}
      </section>
    </div>
  )
}

// ── Admin Plan Editor (week-grouped) ─────────────────────────────────────────
function AdminPlanEditor({
  plan,
  planDraft,
  editingPlan,
  savingPlan,
  planError,
  checkins,
  onUpdateDay,
  onOpenPicker,
  onDuplicateDay,
  onRemoveDay,
  onRestDay,
  onMoveDay,
  onSave,
  onCancel,
  onStartEdit,
  goal,
  onGenerateWeek,
  generatingWeek,
}) {
  const today = new Date().toISOString().split('T')[0]
  const checkinByDate = useMemo(() => Object.fromEntries(checkins.map(c => [c.date, c])), [checkins])
  const [dragIndex, setDragIndex] = useState(null)

  // Group plan by week
  const weekGroups = useMemo(() => {
    const groups = {}
    planDraft.forEach((day, idx) => {
      const w = day.week || Math.ceil((day.dayNumber || idx + 1) / 7)
      if (!groups[w]) groups[w] = []
      groups[w].push({ day, idx })
    })
    return groups
  }, [planDraft])

  const weekNumbers = Object.keys(weekGroups).map(Number).sort((a, b) => a - b)
  const currentWeek = useMemo(() => {
    const todayItem = planDraft.find(d => d.date === today)
    return todayItem ? (todayItem.week || Math.ceil((todayItem.dayNumber || 1) / 7)) : 1
  }, [planDraft, today])

  const [openWeek, setOpenWeek] = useState(currentWeek)

  // Reset open week when week numbers shift
  useEffect(() => {
    if (openWeek !== null && !weekNumbers.includes(openWeek) && weekNumbers.length) {
      setOpenWeek(currentWeek)
    }
  }, [weekNumbers, openWeek, currentWeek])

  if (!planDraft.length) {
    return (
      <div className={styles.adminPlanPanel}>
        <p className={styles.empty}>No day-by-day plan stored for this user yet.</p>
      </div>
    )
  }

  return (
    <div className={styles.adminPlanPanel}>
      <div className={styles.adminPlanHeader}>
        <div>
          <p className={styles.runLogTitle}>Workout Plan</p>
          <p className={styles.adminPlanSub}>
            {planDraft.length} days · {weekNumbers.length} weeks · current week {currentWeek}
          </p>
        </div>
        <div className={styles.adminPlanActions}>
          {editingPlan && (
            <button className={styles.addWorkoutBtn} onClick={() => onOpenPicker(planDraft.length - 1)}>
              + Add Workout
            </button>
          )}
          {editingPlan && (
            <button className={styles.cancelPlanBtn} onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            className={styles.editPlanBtn}
            onClick={editingPlan ? onSave : onStartEdit}
            disabled={savingPlan}
          >
            {editingPlan ? (savingPlan ? 'Saving...' : 'Save Plan') : 'Edit Plan'}
          </button>
        </div>
      </div>
      {planError && <p className={styles.errorMsg}>{planError}</p>}
      {editingPlan && (
        <p className={styles.adminPlanHint}>
          Drag a workout by the handle to reorder. Click <strong>+ Add Workout</strong> to insert from preset templates. Use <strong>Rest</strong> to convert a day to rest without removing it.
        </p>
      )}

      {(() => {
        const genW = goal?.generatedWeeks
        const totalW = Math.ceil((goal?.commitmentDays || 0) / 7)
        if (!genW || !totalW || genW >= totalW) return null
        return (
          <div className={styles.adminGenProgressBanner}>
            <div className={styles.adminGenProgressDot} />
            <p>
              Plan auto-generating on user's device — <strong>{genW} of {totalW} weeks</strong> ready.
              Ungenerated weeks show template previews. Use <strong>✦ Generate Week</strong> to create AI sessions manually.
            </p>
          </div>
        )
      })()}

      <div className={styles.adminWeekList}>
        {weekNumbers.map(w => {
          const weekItems = weekGroups[w]
          const weekDays = weekItems.map(item => item.day)
          const isOpen = openWeek === w
          const isPast = w < currentWeek
          const isCurrent = w === currentWeek
          const weekKm = weekDays.reduce((sum, d) => {
            const m = (d.distance || '').match(/[\d.]+/)
            return sum + (m ? parseFloat(m[0]) : 0)
          }, 0)
          const workouts = weekDays.filter(d => d.type !== 'rest').length
          const logged = weekDays.filter(d => checkinByDate[d.date]).length
          const isAiGenerated = goal?.generatedWeeks === undefined || goal?.generatedWeeks === null || w <= goal.generatedWeeks
          const isGeneratingThis = generatingWeek === w

          return (
            <div
              key={w}
              className={`${styles.adminWeekGroup} ${isOpen ? styles.adminWeekGroupOpen : ''} ${isPast ? styles.adminWeekGroupPast : ''} ${isCurrent ? styles.adminWeekGroupCurrent : ''}`}
            >
              <div className={styles.adminWeekHeader}>
                <button
                  type="button"
                  className={styles.adminWeekHeaderBtn}
                  onClick={() => setOpenWeek(isOpen ? null : w)}
                >
                  <div className={styles.adminWeekHeaderTitle}>
                    <span className={styles.adminWeekTag}>
                      {isCurrent ? 'Current' : isPast ? 'Past' : 'Future'}
                    </span>
                    <strong>Week {w}</strong>
                    <span className={styles.adminWeekDates}>
                      {weekDays[0]?.date} → {weekDays[weekDays.length - 1]?.date}
                    </span>
                  </div>
                  <div className={styles.adminWeekHeaderStats}>
                    <span>{workouts} workouts</span>
                    {weekKm > 0 && <span>{weekKm.toFixed(1)} km</span>}
                    <span>{logged}/{weekDays.length} logged</span>
                    <span className={styles.adminWeekChevron}>{isOpen ? '▾' : '▸'}</span>
                  </div>
                </button>
                {!isAiGenerated && (
                  <button
                    type="button"
                    className={styles.generateWeekBtn}
                    disabled={generatingWeek !== null}
                    onClick={e => { e.stopPropagation(); onGenerateWeek?.(w) }}
                  >
                    {isGeneratingThis ? 'Generating…' : '✦ Generate Week'}
                  </button>
                )}
              </div>

              {isOpen && (
                <div className={styles.adminWeekBody}>
                  {weekItems.map(({ day, idx }) => {
                    const log = checkinByDate[day.date]
                    const tc = planDayTypeColor(day.type)
                    const logColor = log?.status === 'done' ? { color: '#4a7244', bg: 'rgba(122,148,112,0.14)' }
                      : log?.status === 'partial' ? { color: '#8a6a20', bg: 'rgba(190,155,80,0.14)' }
                      : { color: '#c05040', bg: 'rgba(186,95,69,0.14)' }
                    return (
                      <div
                        key={day.id || day.date || idx}
                        className={`${styles.adminPlanDay} ${editingPlan ? styles.adminPlanDayEditable : ''} ${dragIndex === idx ? styles.adminPlanDayDragging : ''}`}
                        style={{ borderLeftColor: tc.border }}
                        draggable={editingPlan}
                        onDragStart={event => {
                          if (!editingPlan) return
                          setDragIndex(idx)
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', String(idx))
                        }}
                        onDragOver={event => { if (!editingPlan) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
                        onDrop={event => {
                          if (!editingPlan) return
                          event.preventDefault()
                          onMoveDay(Number(event.dataTransfer.getData('text/plain')), idx)
                          setDragIndex(null)
                        }}
                        onDragEnd={() => setDragIndex(null)}
                      >
                        {/* ── Day header row ── */}
                        <div className={styles.adminDayHeader}>
                          <div className={styles.adminDayHeaderLeft}>
                            {editingPlan && <span className={styles.dragHandle} title="Drag to reorder">⠿⠿</span>}
                            <span className={styles.planTypeBadge} style={{ background: tc.bg, color: tc.color }}>
                              {day.type || 'rest'}
                            </span>
                            {day.cycleFlag && <span className={styles.planCycleBadge}>Cycle adjusted</span>}
                            {day.feelAdjustment && <span className={styles.planFeelBadge}>Feel adjusted</span>}
                            <strong className={styles.adminDayNum}>Day {day.dayNumber || idx + 1}</strong>
                            <span className={styles.adminDayMeta}>{day.day} · {day.date || 'Unscheduled'}</span>
                          </div>
                          <div className={styles.adminDayHeaderRight}>
                            {log && (
                              <span className={styles.planLogBadge} style={{ color: logColor.color, background: logColor.bg }}>
                                {log.status === 'done' ? '✓ Done' : log.status === 'partial' ? '↗ Partial' : '✗ Missed'}
                              </span>
                            )}
                            {editingPlan && (
                              <div className={styles.adminPlanRowActions}>
                                <button type="button" onClick={() => onOpenPicker(idx)}>+ After</button>
                                <button type="button" onClick={() => onDuplicateDay(idx)}>Dupe</button>
                                <button type="button" onClick={() => onRestDay(idx)}>Rest</button>
                                <button type="button" className={styles.removeWorkoutBtn} onClick={() => onRemoveDay(idx)}>✕</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Day content ── */}
                        {editingPlan ? (
                          <div className={styles.adminPlanEditGrid}>
                            <select value={day.type || 'rest'} onChange={e => onUpdateDay(idx, 'type', e.target.value)}>
                              {['easy', 'moderate', 'hard', 'long', 'rest', 'cross'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <input value={day.title || ''} onChange={e => onUpdateDay(idx, 'title', e.target.value)} placeholder="Title" />
                            <input value={day.distance || ''} onChange={e => onUpdateDay(idx, 'distance', e.target.value)} placeholder="Distance (e.g. 8–10 km)" />
                            <input value={day.duration || ''} onChange={e => onUpdateDay(idx, 'duration', e.target.value)} placeholder="Duration (e.g. 50 min)" />
                            <input value={day.pace || ''} onChange={e => onUpdateDay(idx, 'pace', e.target.value)} placeholder="Pace / effort" />
                            <input value={day.crossTraining || ''} onChange={e => onUpdateDay(idx, 'crossTraining', e.target.value)} placeholder="Cross-training details" />
                            <textarea value={day.strength || ''} onChange={e => onUpdateDay(idx, 'strength', e.target.value)} placeholder="Strength circuit" rows={2} />
                            <textarea value={day.mobility || ''} onChange={e => onUpdateDay(idx, 'mobility', e.target.value)} placeholder="Mobility routine" rows={2} />
                            <textarea value={day.notes || ''} onChange={e => onUpdateDay(idx, 'notes', e.target.value)} placeholder="Workout notes & instructions" rows={3} />
                            {(day.cycleAdjustment || day.feelAdjustment) && (
                              <div className={styles.planAdjustmentMeta}>
                                {day.cycleAdjustment && <span>Cycle reason: {day.cycleAdjustment.reason || 'period window'}</span>}
                                {day.feelAdjustment && <span>Feel score: {day.feelAdjustment.feelScore}/10</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={styles.adminDayContent}>
                            <h4 className={styles.adminDayTitle}>{day.title || 'Untitled session'}</h4>
                            {(day.distance || day.duration || day.pace) && (
                              <div className={styles.planReadStats}>
                                {day.distance && <div className={styles.planStatChip}><span className={styles.planStatLabel}>Distance</span><span className={styles.planStatValue}>{day.distance}</span></div>}
                                {day.duration && <div className={styles.planStatChip}><span className={styles.planStatLabel}>Duration</span><span className={styles.planStatValue}>{day.duration}</span></div>}
                                {day.pace    && <div className={styles.planStatChip}><span className={styles.planStatLabel}>Pace</span><span className={styles.planStatValue}>{day.pace}</span></div>}
                              </div>
                            )}
                            {day.notes && <p className={styles.planReadNotes}>{day.notes}</p>}
                            {(day.cycleAdjustment || day.feelAdjustment) && (
                              <div className={styles.planAdjustmentMeta}>
                                {day.cycleAdjustment && <span>Cycle reason: {day.cycleAdjustment.reason || 'period window'}</span>}
                                {day.feelAdjustment && <span>Feel score: {day.feelAdjustment.feelScore}/10</span>}
                              </div>
                            )}
                            {(day.crossTraining || day.strength || day.mobility) && (
                              <div className={styles.planReadDetailGrid}>
                                {day.crossTraining && <div className={styles.planReadDetail}><span className={styles.planDetailLabel}>Cross-training</span><p>{day.crossTraining}</p></div>}
                                {day.strength      && <div className={styles.planReadDetail}><span className={styles.planDetailLabel}>Strength</span><p>{day.strength}</p></div>}
                                {day.mobility      && <div className={styles.planReadDetail}><span className={styles.planDetailLabel}>Mobility</span><p>{day.mobility}</p></div>}
                              </div>
                            )}
                            {log?.userNote && (
                              <div className={styles.adminPlanLogNote}>
                                <span className={styles.planDetailLabel}>User log</span>
                                <p>{log.userNote}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {editingPlan && (
                    <button
                      className={styles.addAfterWeekBtn}
                      onClick={() => onOpenPicker(weekItems[weekItems.length - 1]?.idx ?? planDraft.length - 1)}
                    >
                      + Add workout to Week {w}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Workout Picker Modal ──────────────────────────────────────────────────────
function WorkoutPickerModal({ onPick, onClose }) {
  const categories = [...new Set(WORKOUT_PRESETS.map(p => p.category))]
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [selectedIdx, setSelectedIdx] = useState(null)

  const filtered = WORKOUT_PRESETS.filter(p => p.category === activeCategory)
  const selectedPreset = selectedIdx !== null ? filtered[selectedIdx] : null

  function handleCategoryChange(cat) {
    setActiveCategory(cat)
    setSelectedIdx(null)
  }

  return (
    <div className={styles.pickerOverlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.pickerModal}>
        <div className={styles.pickerModalHeader}>
          <h3 className={styles.pickerModalTitle}>Choose a Workout</h3>
          <button className={styles.pickerCloseBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.pickerCategories}>
          {categories.map(cat => {
            const icon = WORKOUT_PRESETS.find(p => p.category === cat)?.icon
            return (
              <button
                key={cat}
                className={`${styles.pickerCategoryBtn} ${activeCategory === cat ? styles.pickerCategoryBtnActive : ''}`}
                onClick={() => handleCategoryChange(cat)}
              >
                {icon} {cat}
              </button>
            )
          })}
        </div>

        <div className={styles.pickerGrid}>
          {filtered.map((preset, i) => {
            const tc = planDayTypeColor(preset.type)
            return (
              <button
                key={i}
                className={`${styles.pickerCard} ${selectedIdx === i ? styles.pickerCardSelected : ''}`}
                onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
              >
                <span
                  className={styles.pickerCardType}
                  style={{ background: tc.bg, color: tc.color }}
                >
                  {preset.type}
                </span>
                <strong>{preset.title}</strong>
                {preset.distance && <span>{preset.distance}</span>}
                <span>{preset.duration}</span>
                <span style={{ color: 'var(--ink-faint)', fontSize: '0.68rem' }}>{preset.pace}</span>
              </button>
            )
          })}
        </div>

        {selectedPreset && (
          <div className={styles.pickerPreview}>
            <p>{selectedPreset.notes}</p>
            {selectedPreset.crossTraining && (
              <p><strong>Cross-training:</strong> {selectedPreset.crossTraining}</p>
            )}
          </div>
        )}

        <div className={styles.pickerActions}>
          <button className={styles.cancelPlanBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.pickerAddBtn}
            disabled={selectedIdx === null}
            onClick={() => {
              if (selectedPreset) {
                onPick(selectedPreset)
              }
            }}
          >
            {selectedIdx === null ? 'Select a workout above' : `Add "${selectedPreset.title}"`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Entry Card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, expanded, onToggle, onDelete, deleting }) {
  const score = computeFeelScore(entry.scores || {})
  const color = SCORE_COLOR(score)

  return (
    <div className={styles.entryCard}>
      <div className={styles.entryCardTop} onClick={onToggle} style={{ cursor: 'pointer' }}>
        <span className={styles.entryCardDate}>{entry.date}</span>
        <div className={styles.entryCardBar}>
          <div className={styles.entryCardBarFill} style={{ width: `${score * 10}%`, background: color }} />
        </div>
        <span className={styles.entryCardScore} style={{ color }}>{score.toFixed(1)}</span>
        {onDelete && (
          <button
            className={styles.entryDeleteBtn}
            disabled={deleting}
            onClick={e => { e.stopPropagation(); onDelete() }}
            title="Delete this entry"
          >
            {deleting ? '…' : '✕'}
          </button>
        )}
        <span className={styles.entryCardToggle}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className={styles.entryCardBody}>
          <div className={styles.factorGrid}>
            {JOURNAL_FACTORS.map(f => {
              const val = entry.scores?.[f.id]
              if (val === undefined) return null
              return (
                <div key={f.id} className={styles.factorItem}>
                  <span className={styles.factorIcon}>{f.icon}</span>
                  <div className={styles.factorBarWrap}>
                    <span className={styles.factorName}>{f.label}</span>
                    <div className={styles.factorBar}>
                      <div
                        className={styles.factorBarFill}
                        style={{ width: `${val * 10}%`, background: SCORE_COLOR(val) }}
                      />
                    </div>
                  </div>
                  <span className={styles.factorScore} style={{ color: SCORE_COLOR(val) }}>{val}</span>
                </div>
              )
            })}
          </div>
          {entry.note && (
            <div className={styles.entryNote}>
              <p className={styles.entryNoteLabel}>Reflection</p>
              <p className={styles.entryNoteText}>{entry.note}</p>
            </div>
          )}
          {entry.cycle && (
            <div className={styles.entryNote}>
              <p className={styles.entryNoteLabel}>Cycle context captured that day</p>
              <div className={styles.entryCycleGrid}>
                {[
                  ['Last period', entry.cycle.lastPeriod],
                  ['Expected next', entry.cycle.nextPeriod],
                  ['Cycle length', entry.cycle.cycleLength ? `${entry.cycle.cycleLength} days` : null],
                  ['Period length', entry.cycle.periodLength ? `${entry.cycle.periodLength} days` : null],
                  ['Menopause status', MENOPAUSE_LABELS[entry.cycle.menopauseStatus] || entry.cycle.menopauseStatus],
                ].filter(([, value]) => value).map(([label, value]) => (
                  <span key={label}><strong>{label}</strong>{value}</span>
                ))}
              </div>
            </div>
          )}
          {entry.runningAdjustment && (
            <div className={styles.entryNote}>
              <p className={styles.entryNoteLabel}>Running adjustment</p>
              <p className={styles.entryNoteText}>{entry.runningAdjustment}</p>
            </div>
          )}
        </div>
      )}
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
