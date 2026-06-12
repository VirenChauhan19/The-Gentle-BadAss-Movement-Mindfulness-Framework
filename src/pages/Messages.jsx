import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import MessageThread from '../components/MessageThread'
import styles from './Messages.module.css'

// Member messaging hub. Two segments share one nav tab:
//   • Chat          — the private 1:1 thread with the coach.
//   • Announcements — read-only feed of admin broadcasts.
export default function Messages() {
  const { user, signInWithGoogle, isConfigured } = useAuth()
  const { guestName, announcements = [], unreadAnnouncements = 0, markAnnouncementsRead } = useData()
  const [seg, setSeg] = useState('chat')

  // Clear the announcement badge once the member is looking at that segment.
  useEffect(() => {
    if (seg === 'announcements') markAnnouncementsRead?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seg, announcements.length])

  const onAnnouncements = seg === 'announcements'

  return (
    <div className={styles.page}>
      <header className={styles.chatHeader}>
        <div className={styles.coachAvatar} aria-hidden="true">
          {onAnnouncements ? <MegaphoneIcon /> : <ChatIcon />}
        </div>
        <div className={styles.coachMeta}>
          <h1 className={styles.coachName}>{onAnnouncements ? 'Announcements' : 'Your Coach'}</h1>
          <p className={styles.coachStatus}>
            {!onAnnouncements && <span className={styles.statusDot} />}
            {onAnnouncements ? 'Updates from the La Ultra team' : 'La Ultra · Run & Bee team'}
          </p>
        </div>
      </header>

      {user && (
        <div className={styles.segmented} role="tablist" aria-label="Messages view">
          <button
            role="tab"
            aria-selected={!onAnnouncements}
            className={`${styles.segBtn} ${!onAnnouncements ? styles.segBtnActive : ''}`}
            onClick={() => setSeg('chat')}
          >
            Chat
          </button>
          <button
            role="tab"
            aria-selected={onAnnouncements}
            className={`${styles.segBtn} ${onAnnouncements ? styles.segBtnActive : ''}`}
            onClick={() => setSeg('announcements')}
          >
            Announcements
            {unreadAnnouncements > 0 && (
              <span className={styles.segBadge}>{unreadAnnouncements > 9 ? '9+' : unreadAnnouncements}</span>
            )}
          </button>
        </div>
      )}

      {!user ? (
        <div className={styles.signInWrap}>
          <div className={styles.signInCard}>
            <div className={styles.coachAvatar} aria-hidden="true"><ChatIcon size={26} /></div>
            <h2 className={styles.signInTitle}>Message your coach</h2>
            <p className={styles.signInHint}>
              Sign in with Google to chat with your coach, get personal replies, and see team
              announcements. Guest sessions stay on this device only.
            </p>
            <button
              className={styles.googleBtn}
              onClick={() => signInWithGoogle('popup')}
              disabled={!isConfigured}
            >
              Continue with Google
            </button>
          </div>
        </div>
      ) : onAnnouncements ? (
        <AnnouncementsFeed items={announcements} />
      ) : (
        <MessageThread
          fill
          uid={user.uid}
          role="user"
          selfUser={user}
          guestName={guestName}
          targetName="your coach"
        />
      )}
    </div>
  )
}

function AnnouncementsFeed({ items }) {
  if (!items?.length) {
    return (
      <div className={styles.annEmpty}>
        <MegaphoneIcon size={34} />
        <p>No announcements yet. Team updates and news will show up here.</p>
      </div>
    )
  }
  return (
    <div className={styles.annScroll}>
      {items.map(a => (
        <article key={a.id} className={styles.annCard}>
          <header className={styles.annCardHead}>
            <span className={styles.annFrom}>{a.authorName || 'La Ultra team'}</span>
            <time className={styles.annDate}>{formatAnnDate(a.createdAt)}</time>
          </header>
          <p className={styles.annText}>{a.text}</p>
        </article>
      ))}
    </div>
  )
}

function formatAnnDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `Today · ${time}`
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return `Yesterday · ${time}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function ChatIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function MegaphoneIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  )
}
