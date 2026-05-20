import { createContext, useContext, useEffect, useState } from 'react'
import { auth, googleProvider, isConfigured } from '../firebase'
import {
  signInWithRedirect,
  signInWithPopup,
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
        // Only set error if it's not a 'no redirect result' case
        if (err.code !== 'auth/invalid-credential') {
          console.warn('Redirect result error:', err)
        }
      })

    return onAuthStateChanged(auth, setUser)
  }, [])

  async function signInWithGoogle(method = 'popup') {
    if (!isConfigured) {
      setAuthError('Firebase is not configured yet. Add your Firebase values and restart the app to enable Google sign-in.')
      return
    }
    setAuthError(null)
    try {
      if (method === 'popup') {
        const result = await signInWithPopup(auth, googleProvider)
        setUser(result.user)
      } else {
        await signInWithRedirect(auth, googleProvider)
      }
    } catch (err) {
      setAuthError(err.message)
      console.error('Sign-in error:', err)
    }
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
