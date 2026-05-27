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
  // True only right after an interactive sign-in (popup success or redirect
  // return), never when onAuthStateChanged simply rehydrates an existing
  // session on page load. The welcome transition keys off this.
  const [justSignedIn, setJustSignedIn] = useState(false)

  useEffect(() => {
    if (!isConfigured) return

    // Handle the redirect result when the user lands back after Google sign-in
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          setUser(result.user)
          setJustSignedIn(true)
        }
      })
      .catch(err => {
        // Only set error if it's not a 'no redirect result' case
        if (err.code !== 'auth/invalid-credential') {
          console.warn('Redirect result error:', err)
        }
      })

    return onAuthStateChanged(auth, setUser)
  }, [])

  async function signInWithGoogle(method) {
    if (!isConfigured) {
      setAuthError('Firebase is not configured yet. Add your Firebase values and restart the app to enable Google sign-in.')
      return
    }
    setAuthError(null)

    // Popup is the primary flow in every environment. It hands the credential
    // back to this window via postMessage, so it works even when authDomain
    // (gentle-badass.firebaseapp.com) differs from the app's serving origin
    // (laultrarunandbee.web.app). signInWithRedirect, by contrast, has to read
    // pending-auth state back from the authDomain origin's storage after the
    // round trip — which browsers now block as cross-site storage, leaving the
    // user stranded back on the sign-in screen with nothing happening. Redirect
    // is only a last resort for the rare context where a popup can't open.
    if (method !== 'redirect') {
      try {
        const result = await signInWithPopup(auth, googleProvider)
        setUser(result.user)
        setJustSignedIn(true)
        return
      } catch (err) {
        // auth/popup-closed-by-user means the user closed it deliberately;
        // leave them on the sign-in screen without an error.
        if (err.code === 'auth/popup-closed-by-user') return

        // Popup blocked, dismissed, or unsupported (e.g. some installed PWAs):
        // fall through to a full-page redirect rather than stranding the user.
        const redirectFallbackCodes = [
          'auth/popup-blocked',
          'auth/cancelled-popup-request',
          'auth/operation-not-supported-in-this-environment',
          'auth/web-storage-unsupported',
          'auth/internal-error',
        ]
        if (!redirectFallbackCodes.includes(err.code)) {
          setAuthError(err.message)
          console.error('Sign-in error:', err)
          return
        }
      }
    }

    try {
      await signInWithRedirect(auth, googleProvider)
    } catch (err) {
      setAuthError(err.message)
      console.error('Redirect sign-in error:', err)
    }
  }

  function clearJustSignedIn() {
    setJustSignedIn(false)
  }

  async function signOutUser() {
    if (!isConfigured) return
    setJustSignedIn(false)
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signOut: signOutUser, isConfigured, authError, justSignedIn, clearJustSignedIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
