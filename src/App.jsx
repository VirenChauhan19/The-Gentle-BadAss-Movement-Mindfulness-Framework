import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import Nav from './components/Nav'
import Home from './pages/Home'
import Journal from './pages/Journal'
import History from './pages/History'
import Library from './pages/Library'
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
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/history" element={<History />} />
      <Route path="/library" element={<Library />} />
      <Route path="/library/:id" element={<ExerciseDetail />} />
      <Route path="/coach" element={<Coach />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <div className={styles.app}>
          <main className={styles.main}>
            <AppRoutes />
          </main>
          <Nav />
        </div>
      </DataProvider>
    </AuthProvider>
  )
}
