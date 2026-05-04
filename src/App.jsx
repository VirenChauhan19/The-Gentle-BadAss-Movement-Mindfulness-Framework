import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Nav from './components/Nav'
import Home from './pages/Home'
import Journal from './pages/Journal'
import History from './pages/History'
import Library from './pages/Library'
import ExerciseDetail from './pages/ExerciseDetail'
import Admin from './pages/Admin'
import styles from './App.module.css'

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <div className={styles.app}>
          <main className={styles.main}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/history" element={<History />} />
              <Route path="/library" element={<Library />} />
              <Route path="/library/:id" element={<ExerciseDetail />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
          <Nav />
        </div>
      </DataProvider>
    </AuthProvider>
  )
}
