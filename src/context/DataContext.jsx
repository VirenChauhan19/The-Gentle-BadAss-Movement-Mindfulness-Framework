import { createContext, useContext, useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { useAuth } from './AuthContext'
import {
  getJournalEntries as getLocalEntries,
  saveJournalEntry as saveLocalEntry,
} from '../data/storage'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user } = useAuth()
  // Seed from localStorage immediately so there is no loading flash
  const [entries, setEntries] = useState(() => getLocalEntries())

  useEffect(() => {
    if (user === undefined) return // auth still resolving

    if (!user) {
      setEntries(getLocalEntries())
      return
    }

    // Signed in — subscribe to this user's Firestore journal in real-time
    const journalRef = collection(db, 'users', user.uid, 'journal')
    const q = query(journalRef, orderBy('date', 'desc'))
    const unsub = onSnapshot(q, snapshot => {
      setEntries(snapshot.docs.map(d => d.data()))
    })
    return unsub
  }, [user])

  async function saveEntry(entry) {
    const today = new Date().toISOString().split('T')[0]
    const full = { ...entry, date: today }

    // Always persist to localStorage as offline cache
    saveLocalEntry(entry)

    if (user) {
      const docRef = doc(db, 'users', user.uid, 'journal', today)
      await setDoc(
        docRef,
        { ...full, userId: user.uid, userEmail: user.email, userName: user.displayName },
        { merge: true }
      )
      // Firestore snapshot listener will update entries automatically
    } else {
      // No subscription active — refresh state from localStorage
      setEntries(getLocalEntries())
    }
  }

  function getTodayEntry() {
    const today = new Date().toISOString().split('T')[0]
    return entries.find(e => e.date === today) || null
  }

  return (
    <DataContext.Provider value={{ entries, saveEntry, getTodayEntry, user }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
