import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import styles from './Nav.module.css'

const links = [
  { to: '/', label: 'Home', shortLabel: 'Home', icon: HomeIcon },
  { to: '/journal', label: 'Feel', shortLabel: 'Feel', icon: JournalIcon, lockedForGuest: true },
  { to: '/library', label: 'Your Plan', shortLabel: 'Plan', icon: LibraryIcon, lockedForGuest: true },
  { to: '/functional-tests', label: 'Functional Tests', shortLabel: 'Tests', icon: TestIcon, lockedForGuest: true, hiddenOnMobile: true },
  { to: '/history', label: 'Progress', shortLabel: 'Progress', icon: HistoryIcon, lockedForGuest: true },
  { to: '/profile', label: 'Profile', shortLabel: 'Me', icon: ProfileIcon },
]

export default function Nav() {
  const { user, guestName } = useData()
  const location = useLocation()
  const navRef = useRef(null)
  const guestLocked = Boolean(guestName && !user)

  useEffect(() => {
    const active = navRef.current?.querySelector(`.${styles.active}`)
    active?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [location.pathname])

  function tapFeedback() {
    if (navigator.vibrate && window.innerWidth <= 767) navigator.vibrate(6)
  }

  return (
    <nav className={styles.nav} ref={navRef} aria-label="Primary">
      {links.map(({ to, label, shortLabel, icon: Icon, lockedForGuest, hiddenOnMobile }) => {
        const locked = guestLocked && lockedForGuest
        return (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          title={locked ? `${label}: sign in to unlock` : label}
          onClick={tapFeedback}
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ''} ${locked ? styles.locked : ''} ${hiddenOnMobile ? styles.hiddenOnMobile : ''}`
          }
        >
          <Icon />
          <span className={styles.fullLabel}>{label}</span>
          <span className={styles.shortLabel}>{shortLabel || label}</span>
          {locked && <span className={styles.lockDot} aria-label="Sign in to unlock"><LockIcon /></span>}
        </NavLink>
      )})}
    </nav>
  )
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function JournalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function TestIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l2 2 4-5" />
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function CoachIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 3.5-2.5 6.5-6 7.4V18h2a1 1 0 0 1 0 2h-2v2a1 1 0 0 1-2 0v-2H9a1 1 0 0 1 0-2h2v-1.6C7.5 15.5 5 12.5 5 9a7 7 0 0 1 7-7z" />
      <path d="M9.5 9.5 11 11l3.5-3.5" />
    </svg>
  )
}

function ProfileIcon() {
  const { user } = useAuth()
  if (user?.photoURL) {
    return <img src={user.photoURL} alt="avatar" className={styles.navAvatar} referrerPolicy="no-referrer" />
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
    </svg>
  )
}
