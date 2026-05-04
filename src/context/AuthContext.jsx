import { createContext, useContext, useEffect, useState } from 'react'
import { auth, googleProvider, isConfigured } from '../firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Skip loading state if Firebase isn't configured
  const [user, setUser] = useState(isConfigured ? undefined : null)

  useEffect(() => {
    if (!isConfigured) return
    return onAuthStateChanged(auth, setUser)
  }, [])

  async function signInWithGoogle() {
    if (!isConfigured) {
      alert('Firebase is not set up yet. Fill in your real values in .env.local and restart the dev server.')
      return
    }
    await signInWithPopup(auth, googleProvider)
  }

  async function signOutUser() {
    if (!isConfigured) return
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signOut: signOutUser, isConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
