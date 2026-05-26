import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase'
import { signOut as fbSignOut } from 'firebase/auth'
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { useAuth } from './AuthContext'
import {
  getJournalEntries as getLocalEntries,
  saveJournalEntry as saveLocalEntry,
} from '../data/storage'

const GUEST_NAME_KEY = 'gb_guest_name'
const PROFILE_KEY    = 'gb_profile'
const COACH_KEY      = 'gb_coach'           // guest fallback
const GUEST_MIGRATION_KEY = 'gb_guest_migrated_uid'
const coachKey = uid => uid ? `gb_coach_${uid}` : COACH_KEY

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
  // Transient: true only the moment a guest first sets their name, so the
  // welcome transition can greet them too. Never persisted.
  const [guestJustJoined, setGuestJustJoined] = useState(false)
  const [coachData, setCoachData] = useState(null) // loaded after auth resolves
  const [adminRemarks, setAdminRemarks] = useState([])

  useEffect(() => {
    if (user === undefined) return // auth still resolving

    if (!user || !db) {
      setEntries(getLocalEntries())
      setProfileState(null)
      setCoachData(null)      // Clear any previous user's coach data
      setProfileFetched(true) // No Firestore needed, gate can release
      return
    }

    setAdminRemarks([]) // clear previous user's remarks

    const profileRef = doc(db, 'users', user.uid, 'config', 'profile')
    const nowIso = new Date().toISOString()
    getDoc(profileRef)
      .then(snap => {
        const isNewProfile = !snap.exists()
        return setDoc(profileRef, {
          userId: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          name: user.displayName || '',
          photoURL: user.photoURL || '',
          provider: 'google',
          lastLoginAt: nowIso,
          ...(isNewProfile ? { onboardingComplete: false, createdAt: nowIso } : {}),
        }, { merge: true })
      })
      .catch(err => console.warn('Login profile sync error:', err))

    // ── Deletion tombstone check ──────────────────────────────────────────────
    // If the admin has tombstoned this user, wipe their local cache and sign out
    // immediately. Stops any further Firestore writes from this client and
    // prevents the localStorage→Firestore profile re-migration below from
    // resurrecting the account.
    let tombstoned = false
    const tombstoneRef = doc(db, 'users', user.uid, 'config', '_deleted')
    const unsubTombstone = onSnapshot(tombstoneRef, snap => {
      if (!snap.exists() || tombstoned) return
      tombstoned = true
      try {
        localStorage.removeItem('gb_journal')
        localStorage.removeItem(PROFILE_KEY)
        localStorage.removeItem(GUEST_NAME_KEY)
        localStorage.removeItem(GUEST_MIGRATION_KEY)
        localStorage.removeItem(coachKey(user.uid))
      } catch {}
      setEntries([])
      setProfileState(null)
      setCoachData(null)
      setAdminRemarks([])
      setGuestNameState(null)
      setProfileFetched(true)
      fbSignOut(auth).catch(() => {})
    }, () => {})

    // Load this user's coach data from Firestore (source of truth) or their local cache
    setCoachData(null) // clear previous user's data immediately
    const userCoachKey = coachKey(user.uid)
    getDoc(doc(db, 'users', user.uid, 'config', 'coach'))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data()
          localStorage.setItem(userCoachKey, JSON.stringify(data))
          setCoachData(data)
        } else {
          try {
            const cached = localStorage.getItem(userCoachKey) || localStorage.getItem(COACH_KEY)
            const parsed = cached ? JSON.parse(cached) : null
            setCoachData(parsed)
            if (parsed && guestName) {
              setDoc(doc(db, 'users', user.uid, 'config', 'coach'), {
                ...parsed,
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || guestName,
                migratedAt: new Date().toISOString(),
              }, { merge: true }).catch(err => console.warn('Coach migration error:', err))
            }
          } catch { setCoachData(null) }
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem(userCoachKey)
          setCoachData(cached ? JSON.parse(cached) : null)
        } catch { setCoachData(null) }
      })

    // Reset profile and fetch flag so the gate re-engages while Firestore loads.
    // Clearing profile to undefined (not null) prevents the stale logout-state
    // (profile=null + profileFetched=true) from briefly exposing null to App.jsx
    // and triggering a spurious onboarding redirect before Firestore replies.
    setProfileState(undefined)
    setProfileFetched(false)

    // Safety valve: if Firestore doesn't respond within 4 seconds
    // (e.g. permission denied error without error callback, offline, etc.)
    // release the gate so the app doesn't hang indefinitely.
    const safetyTimeout = setTimeout(() => {
      setProfileFetched(prev => {
        if (!prev) {
          // Still waiting, fall back to null so redirect logic can decide
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

    try {
      const migratedUid = localStorage.getItem(GUEST_MIGRATION_KEY)
      const localEntries = getLocalEntries()
      if (guestName && migratedUid !== user.uid && localEntries.length) {
        Promise.all(localEntries.map(entry => {
          const date = entry.date || new Date().toISOString().split('T')[0]
          return setDoc(doc(db, 'users', user.uid, 'journal', date), {
            ...entry,
            date,
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName || guestName,
            migratedAt: new Date().toISOString(),
          }, { merge: true })
        }))
          .then(() => localStorage.setItem(GUEST_MIGRATION_KEY, user.uid))
          .catch(err => console.warn('Journal migration error:', err))
      }
    } catch {}

    const unsubProfile = onSnapshot(profileRef, snapshot => {
      clearTimeout(safetyTimeout)
      if (snapshot.exists()) {
        let data = snapshot.data()
        // If Firestore profile is missing onboardingComplete (e.g. old/partial save),
        // recover it from localStorage and repair Firestore so future logins work.
        if (!data.onboardingComplete) {
          try {
            const cached = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
            if (cached?.onboardingComplete) {
              data = { ...data, onboardingComplete: true }
              setDoc(profileRef, { onboardingComplete: true }, { merge: true }).catch(() => {})
            }
          } catch {}
        }
        setProfileState(data)
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data))
      } else {
        // No Firestore profile, check if a complete localStorage profile exists
        // (e.g. user previously used the app as a guest or on another device).
        // If so, migrate it to Firestore so they don't have to redo onboarding.
        // SKIP this entirely if a tombstone is active, re-migrating would
        // resurrect the account the admin just deleted.
        if (tombstoned) {
          setProfileState(null)
          setProfileFetched(true)
          return
        }
        try {
          const cached = localStorage.getItem(PROFILE_KEY)
          if (cached) {
            const cachedProfile = JSON.parse(cached)
            if (cachedProfile?.onboardingComplete) {
              const migrated = { ...cachedProfile, userId: user.uid, migratedAt: new Date().toISOString() }
              setProfileState(migrated)
              localStorage.setItem(PROFILE_KEY, JSON.stringify(migrated))
              setDoc(profileRef, migrated, { merge: true }).catch(err =>
                console.warn('Profile migration error:', err)
              )
              setProfileFetched(true)
              return
            }
          }
        } catch {}
        setProfileState(null)
        // Do NOT remove localStorage here, App.jsx uses it as a fallback.
        // Only clearAllData() should ever wipe localStorage intentionally.
      }
      setProfileFetched(true)
    }, err => {
      // Permission denied or network error, release the gate gracefully
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

    // Fetch admin remarks once (not a live listener, remarks don't change often)
    getDoc(doc(db, 'users', user.uid, 'config', 'adminRemarks'))
      .then(snap => {
        if (snap.exists()) setAdminRemarks(snap.data().remarks || [])
      })
      .catch(() => {})

    return () => {
      clearTimeout(safetyTimeout)
      unsubJournal()
      unsubProfile()
      unsubTombstone()
    }
  }, [user])

  function setGuestName(name) {
    if (name) {
      // Only flag a welcome when a guest is genuinely joining (no prior name),
      // not when an already-named guest gets re-set during data syncs.
      if (!guestName) setGuestJustJoined(true)
      localStorage.setItem(GUEST_NAME_KEY, name)
    } else {
      localStorage.removeItem(GUEST_NAME_KEY)
    }
    setGuestNameState(name)
  }

  function clearGuestJustJoined() {
    setGuestJustJoined(false)
  }

  function saveProfile(data) {
    const updated = { ...profile, ...data, updatedAt: new Date().toISOString() }
    setProfileState(updated)
    setProfileFetched(true)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))

    if (user && db) {
      const profileRef = doc(db, 'users', user.uid, 'config', 'profile')
      return setDoc(profileRef, updated, { merge: true }).catch(err =>
        console.warn('Profile sync error:', err)
      )
    }
    return Promise.resolve()
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

  function syncCoachToFirestore(data) {
    if (user && db) {
      const ref = doc(db, 'users', user.uid, 'config', 'coach')
      setDoc(ref, { ...data, userId: user.uid, userEmail: user.email, userName: user.displayName || guestName }, { merge: true })
        .catch(err => console.warn('Coach sync error:', err))
    }
  }

  function saveCoachGoal(goal) {
    const next = { goal, checkins: [], chatHistory: [] }
    const key = coachKey(user?.uid)
    localStorage.setItem(key, JSON.stringify(next))
    setCoachData(next)
    syncCoachToFirestore(next)
  }

  function updateCoachGoal(goal) {
    const key = coachKey(user?.uid)
    setCoachData(prev => {
      const next = { ...(prev || {}), goal }
      localStorage.setItem(key, JSON.stringify(next))
      syncCoachToFirestore(next)
      return next
    })
  }

  function saveCoachCheckin(checkin) {
    const today = new Date().toISOString().split('T')[0]
    const full = { ...checkin, date: today }
    const key = coachKey(user?.uid)
    setCoachData(prev => {
      const next = {
        ...prev,
        checkins: [...(prev?.checkins || []).filter(c => c.date !== today), full],
      }
      localStorage.setItem(key, JSON.stringify(next))
      syncCoachToFirestore(next)
      return next
    })
  }

  function clearCoachGoal() {
    const key = coachKey(user?.uid)
    localStorage.removeItem(key)
    setCoachData(null)
    if (user && db) {
      deleteDoc(doc(db, 'users', user.uid, 'config', 'coach')).catch(() => {})
    }
  }

  function addChatMessage(message) {
    const key = coachKey(user?.uid)
    setCoachData(prev => {
      const next = {
        ...prev,
        chatHistory: [...(prev?.chatHistory || []), { ...message, timestamp: new Date().toISOString() }],
      }
      localStorage.setItem(key, JSON.stringify(next))
      syncCoachToFirestore(next)
      return next
    })
  }

  async function clearAllData() {
    // Wipe localStorage
    localStorage.removeItem('gb_journal')
    localStorage.removeItem('gb_profile')
    localStorage.removeItem('gb_guest_name')
    localStorage.removeItem(coachKey(user?.uid))
    setCoachData(null)

    // Reset in-memory state immediately
    setEntries([])
    setProfileState(null)
    setGuestNameState(null)
    setProfileFetched(true)

    // Wipe Firestore if signed in
    if (user && db) {
      const journalRef = collection(db, 'users', user.uid, 'journal')
      const snap = await getDocs(journalRef)
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))

      const profileRef = doc(db, 'users', user.uid, 'config', 'profile')
      await deleteDoc(profileRef)
    }
  }

  // Expose undefined while Firestore hasn't replied yet so App.jsx loading
  // gate holds. Once profileFetched is true, expose the real value.
  // If Firestore returned null but localStorage has a complete profile (e.g. Firestore
  // rules blocked the write), use that so the user isn't re-sent to onboarding.
  const exposedProfile = (() => {
    if (user && !profileFetched) return undefined
    if (profile !== null && profile !== undefined) return profile
    if (profile === null) {
      try {
        const raw = localStorage.getItem(PROFILE_KEY)
        const local = raw ? JSON.parse(raw) : null
        if (local?.onboardingComplete) return local
      } catch {}
    }
    return profile
  })()

  return (
    <DataContext.Provider value={{ entries, saveEntry, getTodayEntry, guestName, setGuestName, guestJustJoined, clearGuestJustJoined, profile: exposedProfile, saveProfile, clearAllData, user, coachData, saveCoachGoal, updateCoachGoal, saveCoachCheckin, clearCoachGoal, addChatMessage, adminRemarks }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
