import { createContext, useContext, useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { useAuth } from './AuthContext'
import {
  getJournalEntries as getLocalEntries,
  saveJournalEntry as saveLocalEntry,
} from '../data/storage'

const GUEST_NAME_KEY = 'gb_guest_name'
const PROFILE_KEY = 'gb_profile'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [entries, setEntries] = useState(() => getLocalEntries())
  const [profile, setProfileState] = useState(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      return stored ? JSON.parse(stored) : undefined
    } catch {
      return undefined
    }
  })
  // Tracks whether Firestore has replied at least once for the current user.
  // The App loading gate uses `profile === undefined` to block rendering, so we
  // only expose undefined while this is false.
  const [profileFetched, setProfileFetched] = useState(false)
  const [guestName, setGuestNameState] = useState(
    () => localStorage.getItem(GUEST_NAME_KEY) || null
  )

  useEffect(() => {
    if (user === undefined) return // auth still resolving

    if (!user || !db) {
      setEntries(getLocalEntries())
      setProfileState(null)
      setProfileFetched(true) // No Firestore needed — gate can release
      return
    }

    // Reset fetch flag so the gate re-engages while Firestore loads
    setProfileFetched(false)

    // Safety valve: if Firestore doesn't respond within 4 seconds
    // (e.g. permission denied error without error callback, offline, etc.)
    // release the gate so the app doesn't hang indefinitely.
    const safetyTimeout = setTimeout(() => {
      setProfileFetched(prev => {
        if (!prev) {
          // Still waiting — fall back to null so redirect logic can decide
          setProfileState(p => p === undefined ? null : p)
          return true
        }
        return prev
      })
    }, 4000)

    const journalRef = collection(db, 'users', user.uid, 'journal')
    const q = query(journalRef, orderBy('date', 'desc'))
    const unsubJournal = onSnapshot(q, snapshot => {
      setEntries(snapshot.docs.map(d => d.data()))
    }, () => {}) // ignore journal errors silently

    const profileRef = doc(db, 'users', user.uid, 'config', 'profile')
    const unsubProfile = onSnapshot(profileRef, snapshot => {
      clearTimeout(safetyTimeout)
      if (snapshot.exists()) {
        const data = snapshot.data()
        setProfileState(data)
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data))
      } else {
        setProfileState(null)
        localStorage.removeItem(PROFILE_KEY)
      }
      setProfileFetched(true)
    }, err => {
      // Permission denied or network error — release the gate gracefully
      clearTimeout(safetyTimeout)
      console.warn('Profile fetch error:', err)
      // Try to fall back to localStorage cache; if none, force null so the
      // onboarding redirect can run rather than hanging forever.
      try {
        const stored = localStorage.getItem(PROFILE_KEY)
        setProfileState(stored ? JSON.parse(stored) : null)
      } catch {
        setProfileState(null)
      }
      setProfileFetched(true)
    })

    return () => {
      clearTimeout(safetyTimeout)
      unsubJournal()
      unsubProfile()
    }
  }, [user])

  function setGuestName(name) {
    if (name) {
      localStorage.setItem(GUEST_NAME_KEY, name)
    } else {
      localStorage.removeItem(GUEST_NAME_KEY)
    }
    setGuestNameState(name)
  }

  async function saveProfile(data) {
    const updated = { ...profile, ...data, updatedAt: new Date().toISOString() }
    setProfileState(updated)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))

    if (user && db) {
      const profileRef = doc(db, 'users', user.uid, 'config', 'profile')
      await setDoc(profileRef, updated, { merge: true })
    }
  }

  async function saveEntry(entry) {
    const today = new Date().toISOString().split('T')[0]
    const full = { ...entry, date: today }

    // Always persist to localStorage as offline cache
    saveLocalEntry(entry)

    if (user && db) {
      const docRef = doc(db, 'users', user.uid, 'journal', today)
      await setDoc(
        docRef,
        { ...full, userId: user.uid, userEmail: user.email, userName: user.displayName || guestName },
        { merge: true }
      )
      // Firestore snapshot listener updates entries automatically
    } else {
      setEntries(getLocalEntries())
    }
  }

  function getTodayEntry() {
    const today = new Date().toISOString().split('T')[0]
    return entries.find(e => e.date === today) || null
  }

  // Expose undefined while Firestore hasn't replied yet so App.jsx loading
  // gate holds. Once profileFetched is true, expose the real value (null or object).
  const exposedProfile = (user && !profileFetched) ? undefined : profile

  return (
    <DataContext.Provider value={{ entries, saveEntry, getTodayEntry, guestName, setGuestName, profile: exposedProfile, saveProfile, user }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
