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
      return stored ? JSON.parse(stored) : undefined // undefined = check firestore
    } catch {
      return undefined
    }
  })
  const [guestName, setGuestNameState] = useState(
    () => localStorage.getItem(GUEST_NAME_KEY) || null
  )

  useEffect(() => {
    if (user === undefined) return // auth still resolving

    if (!user || !db) {
      setEntries(getLocalEntries())
      setProfileState(null) // No user, no profile
      return
    }

    // Signed in — subscribe to this user's Firestore journal in real-time
    const journalRef = collection(db, 'users', user.uid, 'journal')
    const q = query(journalRef, orderBy('date', 'desc'))
    const unsubJournal = onSnapshot(q, snapshot => {
      setEntries(snapshot.docs.map(d => d.data()))
    })

    // Subscribe to profile
    const profileRef = doc(db, 'users', user.uid, 'config', 'profile')
    const unsubProfile = onSnapshot(profileRef, snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        setProfileState(data)
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data))
      } else {
        setProfileState(null) // Explicitly no profile found
        localStorage.removeItem(PROFILE_KEY)
      }
    })

    return () => {
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

  return (
    <DataContext.Provider value={{ entries, saveEntry, getTodayEntry, guestName, setGuestName, profile, saveProfile, user }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
