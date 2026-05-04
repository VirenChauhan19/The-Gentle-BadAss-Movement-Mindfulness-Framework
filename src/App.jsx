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
import Onboarding from './pages/Onboarding'
import styles from './App.module.css'

function AppRoutes() {
  const { profile, user } = useData()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // If user is logged in but profile is missing/incomplete, force onboarding
    // except if they are already on the onboarding page
    if (user && profile !== undefined) {
      if (!profile?.onboardingComplete && location.pathname !== '/onboarding') {
        navigate('/onboarding')
      }
    }
  }, [user, profile, navigate, location.pathname])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/history" element={<History />} />
      <Route path="/library" element={<Library />} />
      <Route path="/library/:id" element={<ExerciseDetail />} />
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
