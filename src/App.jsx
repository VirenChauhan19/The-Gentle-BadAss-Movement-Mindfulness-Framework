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
import FunctionalTests from './pages/FunctionalTests'
import Admin from './pages/Admin'
import Coach from './pages/Coach'
import Onboarding from './pages/Onboarding'
import Paywall from './pages/Paywall'
import styles from './App.module.css'

const THEME_PRESETS = [
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

  useEffect(() => {
    if (!user || location.pathname === '/onboarding') return

    const needsOnboarding =
      profile === null ||
      (profile && (!profile.onboardingComplete || !profile.sex))

    if (needsOnboarding) {
      // Last-resort check: Firestore writes are fire-and-forget and can fail
      // silently. If localStorage already has a completed profile on this
      // device, honour it and never redirect to onboarding.
      try {
        const local = JSON.parse(localStorage.getItem('gb_profile') || 'null')
        if (local?.onboardingComplete && local?.sex) return
      } catch {}
      navigate('/onboarding')
    }
  }, [user, profile, navigate, location.pathname])

  useEffect(() => {
    const mobileRoutes = ['/', '/journal', '/library', '/functional-tests', '/history', '/profile']
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
  }, [location.pathname, navigate])

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
        <Route path="/history" element={<LockedRoute feature="Progress"><History /></LockedRoute>} />
        <Route path="/functional-tests" element={<LockedRoute feature="Functional Tests"><FunctionalTests /></LockedRoute>} />
        <Route path="/library" element={<LockedRoute feature="Your 90 day plan"><Library /></LockedRoute>} />
        <Route path="/library/:id" element={<LockedRoute feature="Your 90 day plan"><ExerciseDetail /></LockedRoute>} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/profile" element={<Admin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/paywall" element={<Paywall />} />
      </Routes>
    </div>
  )
}

function LockedRoute({ feature, children }) {
  const { user, guestName } = useData()
  const { signInWithGoogle, authError, isConfigured } = useAuth()
  const lockedCopy = {
    Feel: {
      title: 'Sign in to log your Feel',
      intro: 'A two-minute body, energy, soreness, and mood check-in that tunes your day.',
      bullets: ['Save daily scores', 'Spot recovery patterns', 'Connect Feel to your running plan'],
    },
    'Your 90 day plan': {
      title: 'Sign in to unlock your 90 day plan',
      intro: 'Weekly modules, breathing, strength tools, and running drills built around your progress.',
      bullets: ['Unlock one week at a time', 'Use the day plan', 'Keep your exercise history'],
    },
    'Functional Tests': {
      title: 'Sign in to unlock Functional Tests',
      intro: 'Weekly tests help you notice change before you chase volume.',
      bullets: ['Run weekly checks', 'Compare movement quality', 'Track changes over time'],
    },
    Progress: {
      title: 'Sign in to keep your progress',
      intro: 'Your long-term dashboard for training, Feel scores, breathing, and consistency.',
      bullets: ['See trends over time', 'Review completed sessions', 'Sync progress across devices'],
    },
  }[feature] || {
    title: `Sign in to unlock ${feature}`,
    intro: 'Save your progress and keep your training data connected.',
    bullets: ['Save progress', 'Sync across devices', 'Build a long-term record'],
  }

  if (user || !guestName) return children

  return (
    <div className={styles.lockedPage}>
      <section className={styles.lockedPanel} aria-labelledby="locked-title">
        <p className={styles.lockedLabel}>{feature}</p>
        <h1 id="locked-title">{lockedCopy.title}</h1>
        <p>{lockedCopy.intro}</p>
        <ul className={styles.lockedBenefits}>
          {lockedCopy.bullets.map(item => <li key={item}>{item}</li>)}
        </ul>
        {authError && <p className={styles.authError}>{authError}</p>}
        <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')} disabled={!isConfigured}>
          Continue with Google
        </button>
        {!isConfigured && <p className={styles.lockHint}>Firebase is not configured yet, so Google sign-in is unavailable in this environment.</p>}
      </section>
    </div>
  )
}

function SignInGate() {
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
      <section className={styles.signInCard}>
        <p className={styles.signInKicker}>La Ultra: Run &amp; Bee</p>
        <h1 id="signin-title">Start with sign-in</h1>
        <p className={styles.signInCopy}>
          Sign in to unlock Feel, your 90 day plan, Functional Tests, and Progress with saved activity across sessions. Guest mode is view-only for those sections.
        </p>
        {authError && <p className={styles.authError}>{authError}</p>}
        <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')} disabled={!isConfigured}>
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
  const [theme, setTheme] = useState(() => localStorage.getItem('gb_theme') || 'dark')
  const activeTheme = THEME_PRESETS.find(item => item.id === theme) || THEME_PRESETS[0]

  useEffect(() => {
    localStorage.setItem('gb_theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    function handleThemeChange(event) {
      const next = event.detail?.theme
      if (THEME_PRESETS.some(item => item.id === next)) setTheme(next)
    }
    window.addEventListener('gb-theme-change', handleThemeChange)
    return () => window.removeEventListener('gb-theme-change', handleThemeChange)
  }, [])

  useEffect(() => {
    let frame = 0
    function handlePointerMove(event) {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        const x = Math.round((event.clientX / window.innerWidth) * 100)
        const y = Math.round((event.clientY / window.innerHeight) * 100)
        document.documentElement.style.setProperty('--pointer-x', `${x}%`)
        document.documentElement.style.setProperty('--pointer-y', `${y}%`)
        frame = 0
      })
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <AuthProvider>
      <DataProvider>
        <div className={styles.app}>
          <div className={styles.ambientLayer} aria-hidden="true" />
          <a href="#main-content" className={styles.skipLink}>Skip to main content</a>
          <main id="main-content" className={styles.main}>
            <AppRoutes />
          </main>
          <SignInGate />
          <button
            className={styles.themeToggle}
            onClick={() => setTheme(t => THEME_PRESETS[(THEME_PRESETS.findIndex(item => item.id === t) + 1) % THEME_PRESETS.length].id)}
            aria-label={`Current theme: ${activeTheme.label}. Switch theme`}
            title={`Theme: ${activeTheme.label}`}
          >
            <span className={styles.themeIcon} aria-hidden="true">
              <span className={styles.themeSwatch} data-theme-swatch={theme} />
            </span>
          </button>
          <Nav />
          <FloatingChat />
        </div>
      </DataProvider>
    </AuthProvider>
  )
}
