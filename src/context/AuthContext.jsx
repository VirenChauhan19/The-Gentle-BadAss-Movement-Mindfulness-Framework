import { createContext, useContext, useEffect, useState } from 'react'
import { auth, googleProvider, isConfigured } from '../firebase'
import {
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  getRedirectResult,
} from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(isConfigured ? undefined : null)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (!isConfigured) return

    // Handle the redirect result when the user lands back after Google sign-in
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) setUser(result.user)
      })
      .catch(err => {
        setAuthError(err.message)
      })

    return onAuthStateChanged(auth, setUser)
  }, [])

  async function signInWithGoogle() {
    if (!isConfigured) {
      alert('Firebase is not set up yet. Fill in your real values in .env.local and restart the dev server.')
      return
    }
    setAuthError(null)
    await signInWithRedirect(auth, googleProvider)
  }

  async function signOutUser() {
    if (!isConfigured) return
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signOut: signOutUser, isConfigured, authError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
