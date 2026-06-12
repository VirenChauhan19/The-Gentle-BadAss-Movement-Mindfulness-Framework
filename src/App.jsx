import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import Nav from './components/Nav'
import FloatingChat from './components/FloatingChat'
import WelcomeTransition from './components/WelcomeTransition'
const AuroraBackground = lazy(() => import('./components/AuroraBackground'))
import Home from './pages/Home'
import Journal from './pages/Journal'
import History from './pages/History'
import Library from './pages/Library'
import Breathing from './pages/Breathing'
import Reminder from './pages/Reminder'
import ExerciseDetail from './pages/ExerciseDetail'
import FunctionalTests from './pages/FunctionalTests'
import Admin from './pages/Admin'
import Messages from './pages/Messages'
import Coach from './pages/Coach'
import Onboarding from './pages/Onboarding'
import Paywall from './pages/Paywall'
import styles from './App.module.css'

const THEME_PRESETS = [
  { id: 'laultra',  label: 'La Ultra' },
  { id: 'dark',     label: 'Dark'     },
  { id: 'ember',    label: 'Ember'    },
  { id: 'ocean',    label: 'Ocean'    },
  { id: 'forest',   label: 'Forest'   },
  { id: 'violet',   label: 'Violet'   },
  { id: 'rose',     label: 'Rose'     },
  { id: 'midnight', label: 'Midnight' },
  { id: 'light',    label: 'Light'    },
]

function AppRoutes() {
  const data = useData()
  const navigate = useNavigate()
  const location = useLocation()

  const user = data?.user
  const profile = data?.profile
  const onboardingRequired = data?.onboardingRequired

  useEffect(() => {
    const mobileRoutes = user ? ['/', '/journal', '/library', '/functional-tests', '/history', '/messages', '/profile'] : ['/', '/messages', '/profile']
    let startX = 0
    let startY = 0
    let startTime = 0

    function isEditable(target) {
      return target?.closest?.('input, textarea, select, button, a, [role="button"], [data-swipe-lock]')
    }

    function onTouchStart(event) {
      if (window.innerWidth > 767 || event.touches.length !== 1 || isEditable(event.target)) return
      startX = event.touches[0].clientX
      startY = event.touches[0].clientY
      startTime = Date.now()
    }

    function onTouchEnd(event) {
      if (!startTime || window.innerWidth > 767) return
      const currentIndex = mobileRoutes.indexOf(location.pathname)
      if (currentIndex === -1) return

      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY
      const elapsed = Date.now() - startTime
      startTime = 0

      if (elapsed > 550 || Math.abs(deltaX) < 86 || Math.abs(deltaY) > 62) return
      const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1
      if (nextIndex < 0 || nextIndex >= mobileRoutes.length) return

      if (navigator.vibrate) navigator.vibrate(8)
      navigate(mobileRoutes[nextIndex])
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [location.pathname, navigate, user])

  // Gate rendering until we know the Auth and Profile status
  // user === undefined means auth is still resolving
  // profile === undefined means we are logged in but still checking Firestore for a profile
  if (user === undefined || (user && profile === undefined)) {
    return <div className={styles.loading}>Initializing...</div>
  }

  // Hard onboarding gate: a signed-in account that hasn't finished onboarding
  // gets ONLY the onboarding flow, no matter what URL they're on. Rendering it
  // here (instead of relying on a post-navigation redirect) means there is no
  // other screen or nav mounted to slip out to — Profile, swipe gestures, and
  // the browser Back button can't bypass it. Onboarding itself enforces that
  // every required field is filled before its Next/Start buttons enable.
  if (user && onboardingRequired) {
    return <Onboarding />
  }

  return (
    <div className="routeTransition" key={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<LockedRoute><Onboarding /></LockedRoute>} />
        <Route path="/journal" element={<LockedRoute feature="Feel"><Journal /></LockedRoute>} />
        <Route path="/breathing" element={<LockedRoute feature="Breathe"><Breathing /></LockedRoute>} />
        <Route path="/reminder" element={<LockedRoute feature="Your Plan"><Reminder /></LockedRoute>} />
        <Route path="/history" element={<LockedRoute feature="Progress"><History /></LockedRoute>} />
        <Route path="/functional-tests" element={<LockedRoute feature="Functional Tests"><FunctionalTests /></LockedRoute>} />
        <Route path="/library" element={<LockedRoute feature="Your Plan"><Library /></LockedRoute>} />
        <Route path="/library/:id" element={<LockedRoute feature="Your Plan"><ExerciseDetail /></LockedRoute>} />
        <Route path="/coach" element={<LockedRoute feature="Coach"><Coach /></LockedRoute>} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Admin />} />
        <Route path="/admin" element={<LockedRoute feature="Admin"><Admin /></LockedRoute>} />
        <Route path="/paywall" element={<LockedRoute feature="Paywall"><Paywall /></LockedRoute>} />
      </Routes>
    </div>
  )
}

function LockedRoute({ children }) {
  const { user } = useData()
  if (!user) return <Navigate to="/" replace />
  return children
}

function SignInGate({ theme }) {
  const { user, signInWithGoogle, authError, isConfigured } = useAuth()
  const { guestName, setGuestName } = useData()
  const [nameInput, setNameInput] = useState('')

  if (user === undefined) return null
  if (user || guestName) return null

  function continueGuest() {
    const name = nameInput.trim()
    if (!name) return
    setGuestName(name)
  }

  return (
    <div className={styles.signInGate} role="dialog" aria-modal="true" aria-labelledby="signin-title">
      <Suspense fallback={null}>
        <AuroraBackground theme={theme} variant="overlay" />
      </Suspense>
      <section className={styles.signInCard}>
        <p className={styles.signInKicker}>La Ultra: Run &amp; Bee</p>
        <h1 id="signin-title">Start with sign-in</h1>
        <p className={styles.signInCopy}>
          Sign in to sync Feel, Your Plan, Functional Tests, and Progress across devices. Guest mode saves on this device only.
        </p>
        {authError && <p className={styles.authError}>{authError}</p>}
        <button className={styles.googleBtn} onClick={() => signInWithGoogle()} disabled={!isConfigured}>
          Continue with Google
        </button>
        {!isConfigured && <p className={styles.lockHint}>Firebase is not configured yet, so Google sign-in is unavailable in this environment.</p>}
        <div className={styles.divider}>or</div>
        <div className={styles.guestForm}>
          <label htmlFor="guest-name">First name</label>
          <input
            id="guest-name"
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') continueGuest() }}
            placeholder="e.g. Rajat"
          />
          <p className={styles.guestMicrocopy}>We'll save guest sessions in this browser only.</p>
          <button className={`${styles.guestBtn} ${nameInput.trim() ? styles.guestBtnReady : ''}`} onClick={continueGuest} disabled={!nameInput.trim()}>
            Continue as guest
          </button>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('gb_theme') || 'laultra')
  const [themeOpen, setThemeOpen] = useState(false)
  const activeTheme = THEME_PRESETS.find(item => item.id === theme) || THEME_PRESETS[0]

  useEffect(() => {
    localStorage.setItem('gb_theme', theme)
    document.documentElement.dataset.theme = theme
    // Keep the mobile browser status/address bar in step with the theme,
    // rather than the single static value baked into index.html.
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--cream').trim()
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta && bg) meta.setAttribute('content', bg)
  }, [theme])

  useEffect(() => {
    function handleThemeChange(event) {
      const next = event.detail?.theme
      if (THEME_PRESETS.some(item => item.id === next)) setTheme(next)
    }
    window.addEventListener('gb-theme-change', handleThemeChange)
    return () => window.removeEventListener('gb-theme-change', handleThemeChange)
  }, [])

  return (
    <AuthProvider>
      <DataProvider>
        <div className={styles.app}>
          <Suspense fallback={null}>
            <AuroraBackground theme={theme} />
          </Suspense>
          <main id="main-content" className={styles.main}>
            <AppRoutes />
          </main>
          <SignInGate theme={theme} />
          <WelcomeTransition />
          <div className={styles.themeDock}>
            <button
              className={styles.themeToggle}
              onClick={() => setThemeOpen(open => !open)}
              aria-expanded={themeOpen}
              aria-label={`Current theme: ${activeTheme.label}. Open theme picker`}
              title={`Theme: ${activeTheme.label}`}
            >
              <span className={styles.themeIcon} aria-hidden="true">
                <span className={styles.themeSwatch} data-theme-swatch={theme} />
              </span>
            </button>
            {themeOpen && (
              <div className={styles.themePanel} role="menu" aria-label="Choose theme">
                {THEME_PRESETS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.themeChoice} ${theme === item.id ? styles.themeChoiceActive : ''}`}
                    onClick={() => {
                      setTheme(item.id)
                      setThemeOpen(false)
                    }}
                    role="menuitemradio"
                    aria-checked={theme === item.id}
                  >
                    <span className={styles.themeSwatch} data-theme-swatch={item.id} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Nav />
          <FloatingChat />
        </div>
      </DataProvider>
    </AuthProvider>
  )
}
