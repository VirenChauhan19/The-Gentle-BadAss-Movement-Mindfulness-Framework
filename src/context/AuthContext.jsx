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

// Popups don't work in installed PWAs (standalone display mode) and are flaky
// in mobile/in-app browsers, so we prefer a full-page redirect there.
function shouldUseRedirect() {
  if (typeof window === 'undefined') return false
  try {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone === true
    const mobile = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent || '')
    return Boolean(standalone || mobile)
  } catch {
    return false
  }
}

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

    // Popup sign-in is unreliable in installed PWAs and most mobile browsers:
    // the popup either gets blocked or can't hand its result back, so the user
    // lands straight back on the sign-in screen. In those environments use a
    // full-page redirect, which getRedirectResult() picks up on return.
    const wantsRedirect = method === 'redirect' || (method !== 'popup' && shouldUseRedirect())

    if (wantsRedirect) {
      try {
        await signInWithRedirect(auth, googleProvider)
      } catch (err) {
        setAuthError(err.message)
        console.error('Redirect sign-in error:', err)
      }
      return
    }

    try {
      const result = await signInWithPopup(auth, googleProvider)
      setUser(result.user)
      setJustSignedIn(true)
    } catch (err) {
      // Popup blocked, dismissed by the browser, or unsupported here: fall back
      // to redirect rather than stranding the user on the sign-in page.
      const redirectFallbackCodes = [
        'auth/popup-blocked',
        'auth/cancelled-popup-request',
        'auth/operation-not-supported-in-this-environment',
        'auth/web-storage-unsupported',
        'auth/internal-error',
      ]
      if (redirectFallbackCodes.includes(err.code)) {
        try {
          await signInWithRedirect(auth, googleProvider)
          return
        } catch (redirectErr) {
          setAuthError(redirectErr.message)
          console.error('Redirect fallback error:', redirectErr)
          return
        }
      }
      // auth/popup-closed-by-user means the user closed it deliberately, leave
      // them on the sign-in screen without an error.
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message)
        console.error('Sign-in error:', err)
      }
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
