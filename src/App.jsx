import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import Nav from './components/Nav'
import FloatingChat from './components/FloatingChat'
import Home from './pages/Home'
import Journal from './pages/Journal'
import History from './pages/History'
import Library from './pages/Library'
import Breathing from './pages/Breathing'
import ExerciseDetail from './pages/ExerciseDetail'
import Admin from './pages/Admin'
import Coach from './pages/Coach'
import Onboarding from './pages/Onboarding'
import styles from './App.module.css'

function AppRoutes() {
  const data = useData()
  const navigate = useNavigate()
  const location = useLocation()

  const user = data?.user
  const profile = data?.profile

  useEffect(() => {
    if (!user || location.pathname === '/onboarding') return

    const needsOnboarding =
      profile === null ||
      (profile && !profile.onboardingComplete)

    if (needsOnboarding) {
      // Last-resort check: Firestore writes are fire-and-forget and can fail
      // silently. If localStorage already has a completed profile on this
      // device, honour it and never redirect to onboarding.
      try {
        const local = JSON.parse(localStorage.getItem('gb_profile') || 'null')
        if (local?.onboardingComplete) return
      } catch {}
      navigate('/onboarding')
    }
  }, [user, profile, navigate, location.pathname])

  // Gate rendering until we know the Auth and Profile status
  // user === undefined means auth is still resolving
  // profile === undefined means we are logged in but still checking Firestore for a profile
  if (user === undefined || (user && profile === undefined)) {
    return <div className={styles.loading}>Initializing...</div>
  }

  return (
    <div className="routeTransition" key={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/journal" element={<LockedRoute feature="Feel"><Journal /></LockedRoute>} />
        <Route path="/breathing" element={<Breathing />} />
        <Route path="/history" element={<LockedRoute feature="History"><History /></LockedRoute>} />
        <Route path="/library" element={<LockedRoute feature="Move"><Library /></LockedRoute>} />
        <Route path="/library/:id" element={<LockedRoute feature="Move"><ExerciseDetail /></LockedRoute>} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </div>
  )
}

function LockedRoute({ feature, children }) {
  const { user, guestName } = useData()
  const { signInWithGoogle, authError, isConfigured } = useAuth()

  if (user || !guestName) return children

  return (
    <div className={styles.lockedPage}>
      <div className={styles.lockedPanel}>
        <p className={styles.lockedLabel}>Member area</p>
        <h1>{feature} is locked in guest mode</h1>
        <p>Guest mode lets you explore the app. Sign in to save Feel records, Move quality metrics, and long-term History.</p>
        {authError && <p className={styles.authError}>{authError}</p>}
        <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')} disabled={!isConfigured}>
          Continue with Google
        </button>
        {!isConfigured && <p className={styles.lockHint}>Firebase is not configured yet, so Google sign-in is unavailable in this environment.</p>}
      </div>
    </div>
  )
}

function SignInGate() {
  const { user, signInWithGoogle, authError, isConfigured } = useAuth()
  const { guestName, setGuestName } = useData()
  const [nameInput, setNameInput] = useState('')
  const [guestOpen, setGuestOpen] = useState(false)

  if (user === undefined) return null
  if (user || guestName) return null

  function continueGuest() {
    const name = nameInput.trim()
    if (!name) return
    setGuestName(name)
  }

  return (
    <div className={styles.signInGate} role="dialog" aria-modal="true" aria-labelledby="signin-title">
      <section className={styles.signInCard}>
        <p className={styles.signInKicker}>La Ultra: Run &amp; Bee</p>
        <h1 id="signin-title">Start with sign-in</h1>
        <p className={styles.signInCopy}>
          Sign in to unlock Feel, Move, and History with saved progress across sessions. Guest mode is view-only for those sections.
        </p>
        {authError && <p className={styles.authError}>{authError}</p>}
        <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')} disabled={!isConfigured}>
          Continue with Google
        </button>
        {!isConfigured && <p className={styles.lockHint}>Firebase is not configured yet, so Google sign-in is unavailable in this environment.</p>}
        <div className={styles.divider}>or</div>
        {!guestOpen ? (
          <button className={styles.guestBtn} onClick={() => setGuestOpen(true)}>
            Continue as Guest
          </button>
        ) : (
          <div className={styles.guestForm}>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') continueGuest() }}
              placeholder="Your first name"
              autoFocus
            />
            <button className={styles.guestBtn} onClick={continueGuest} disabled={!nameInput.trim()}>
              Enter Guest Mode
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('gb_theme') || 'light')

  useEffect(() => {
    localStorage.setItem('gb_theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <AuthProvider>
      <DataProvider>
        <div className={styles.app}>
          <main className={styles.main}>
            <AppRoutes />
          </main>
          <SignInGate />
          <button
            className={styles.themeToggle}
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className={styles.themeIcon} aria-hidden="true">
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </span>
          </button>
          <Nav />
          <FloatingChat />
        </div>
      </DataProvider>
    </AuthProvider>
  )
}
