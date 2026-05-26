import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import styles from './WelcomeTransition.module.css'

// How long the greeting holds before it begins to dissolve. Long enough to
// land as a moment, short enough to never feel like a wall between sign-in and
// the app. We also wait for the profile to resolve before leaving, so a slow
// Firestore reply hides behind the welcome instead of behind a bare spinner.
const MIN_VISIBLE_MS = 2000
const FADE_OUT_MS = 560

function firstNameOf(...candidates) {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim().split(/\s+/)[0]
    }
  }
  return ''
}

function timeGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Welcome back'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function WelcomeTransition() {
  const { user, justSignedIn, clearJustSignedIn } = useAuth()
  const { profile, guestName, guestJustJoined, clearGuestJustJoined } = useData()

  const isGuest = guestJustJoined && !user
  const active = justSignedIn || isGuest

  const [leaving, setLeaving] = useState(false)
  const mountedAt = useRef(0)

  // Snapshot identity once, the instant the transition activates. Reading it
  // live would let it flicker as Firestore patches the profile underneath.
  const snapshot = useRef(null)
  if (active && !snapshot.current) {
    snapshot.current = {
      name: firstNameOf(user?.displayName, guestName, profile?.name),
      photo: user?.photoURL || '',
    }
  }

  useEffect(() => {
    if (!active) return
    mountedAt.current = performance.now()
    setLeaving(false)
  }, [active])

  // Profile === undefined means Firestore is still resolving for a signed-in
  // user; hold the welcome until we know where to send them. Guests have no
  // profile fetch, so they only wait out the minimum.
  const profileReady = isGuest ? true : profile !== undefined

  useEffect(() => {
    if (!active || !profileReady) return
    const elapsed = performance.now() - mountedAt.current
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)

    const leaveTimer = setTimeout(() => setLeaving(true), wait)
    const doneTimer = setTimeout(() => {
      snapshot.current = null
      if (justSignedIn) clearJustSignedIn()
      if (guestJustJoined) clearGuestJustJoined()
    }, wait + FADE_OUT_MS)

    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(doneTimer)
    }
  }, [active, profileReady, justSignedIn, guestJustJoined, clearJustSignedIn, clearGuestJustJoined])

  if (!active) return null

  const { name, photo } = snapshot.current || { name: '', photo: '' }

  // A returning runner already finished onboarding; a fresh sign-in (or guest)
  // is just starting out. Tailor the second line so it never feels generic.
  const returning = !isGuest && !!profile?.onboardingComplete
  const headline = returning
    ? (name ? `${timeGreeting()}, ${name}` : timeGreeting())
    : (name ? `Welcome, ${name}` : 'Welcome')
  const subline = returning
    ? 'Your journey is right where you left it.'
    : "Let's shape your journey together."

  const initial = name ? name[0].toUpperCase() : '·'

  return (
    <div
      className={`${styles.overlay} ${leaving ? styles.leaving : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.avatarWrap}>
          <span className={styles.avatarRing} aria-hidden="true" />
          {photo ? (
            <img className={styles.avatar} src={photo} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className={styles.avatarFallback} aria-hidden="true">{initial}</span>
          )}
        </div>
        <p className={styles.kicker}>La Ultra: Run &amp; Bee</p>
        <h1 key={headline} className={styles.headline}>{headline}</h1>
        <p key={subline} className={styles.subline}>{subline}</p>
        <span className={styles.spinner} aria-hidden="true" />
      </div>
    </div>
  )
}
