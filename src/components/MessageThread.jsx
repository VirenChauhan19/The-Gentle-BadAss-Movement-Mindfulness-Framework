import { useEffect, useMemo, useRef, useState } from 'react'
import {
  subscribeToThread, sendUserMessage, sendAdminMessage, markThreadRead,
} from '../data/messaging'
import styles from './MessageThread.module.css'

// Shared two-way chat thread. The member's Profile page mounts it with
// role="user"; the admin's per-user view mounts it with role="admin". It
// subscribes to the user's thread on its own, auto-marks the other side's
// messages read while open, and posts through the messaging helpers.

function formatStamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return time
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return `Yesterday ${time}`
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`
}

export default function MessageThread({
  uid, role = 'user', selfUser, guestName, targetName, placeholder, fill = false,
}) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  // Grow the composer with its content, up to the CSS max-height.
  function autosize(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }

  useEffect(() => {
    if (!uid) return
    setLoaded(false)
    const unsub = subscribeToThread(
      uid,
      msgs => { setMessages(msgs); setLoaded(true) },
      () => setLoaded(true)
    )
    return unsub
  }, [uid])

  // Clear the other party's unread flags whenever the open thread changes.
  useEffect(() => {
    if (!uid || !messages.length) return
    markThreadRead({ uid, messages, side: role })
  }, [uid, role, messages])

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const isMine = m => (role === 'admin' ? m.from === 'admin' : m.from === 'user')

  const grouped = useMemo(() => {
    // Tag each message with day-break info plus whether it starts/ends a "run"
    // (consecutive messages from the same side), so we can group them tightly,
    // show the author/avatar once, and stamp only the last bubble of a run.
    let lastDay = ''
    return messages.map((m, i) => {
      const day = (m.createdAt || '').slice(0, 10)
      const newDay = day && day !== lastDay
      lastDay = day
      const prev = messages[i - 1]
      const next = messages[i + 1]
      const prevDay = (prev?.createdAt || '').slice(0, 10)
      const firstOfRun = !prev || prev.from !== m.from || (newDay && prevDay !== day)
      const nextNewDay = next && (next.createdAt || '').slice(0, 10) !== day
      const lastOfRun = !next || next.from !== m.from || nextNewDay
      return { ...m, _newDay: newDay, _firstOfRun: firstOfRun, _lastOfRun: lastOfRun }
    })
  }, [messages])

  // The newest message I sent, and whether the other side has read it — drives
  // the single "Seen / Sent" receipt under the latest outbound bubble.
  const lastMine = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (isMine(messages[i])) return messages[i]
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, role])
  const lastMineRead = lastMine && (role === 'admin' ? lastMine.readByUser : lastMine.readByAdmin)

  function avatarInitial(m) {
    const name = m.authorName || (m.from === 'admin' ? 'Coach' : 'Member')
    return name.trim()[0]?.toUpperCase() || (m.from === 'admin' ? 'C' : 'M')
  }

  async function handleSend() {
    const body = text.trim()
    if (!body || sending || !uid) return
    setSending(true); setError('')
    try {
      if (role === 'admin') {
        await sendAdminMessage({ uid, adminUser: selfUser, targetName, text: body })
      } else {
        await sendUserMessage({ uid, user: selfUser, guestName, text: body })
      }
      setText('')
      if (inputRef.current) inputRef.current.style.height = 'auto'
    } catch (err) {
      setError(err?.message || 'Could not send your message. Please try again.')
    }
    setSending(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const otherLabel = role === 'admin' ? (targetName || 'this member') : (targetName || 'your coach')

  return (
    <div className={`${styles.thread} ${fill ? styles.fill : ''}`}>
      <div className={styles.scroll}>
        {!loaded ? (
          <p className={styles.hint}>Loading conversation…</p>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>
              {role === 'admin'
                ? `No messages with ${otherLabel} yet. Say hello — they'll see it in their profile.`
                : 'No messages yet. Send your coach a question, an update, or just say hi.'}
            </p>
          </div>
        ) : (
          <ul className={styles.list}>
            {grouped.map(m => {
              const mine = isMine(m)
              return (
              <li key={m.id}>
                {m._newDay && (
                  <div className={styles.daySep}><span>{formatStamp(m.createdAt).includes('·')
                    ? new Date(m.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
                    : new Date(m.createdAt).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
                )}
                <div className={`${styles.bubbleRow} ${mine ? styles.mine : styles.theirs} ${m._firstOfRun ? styles.runStart : ''}`}>
                  {!mine && (
                    <div className={styles.avatarSlot}>
                      {m._lastOfRun && <span className={styles.msgAvatar}>{avatarInitial(m)}</span>}
                    </div>
                  )}
                  <div className={`${styles.bubble} ${m._lastOfRun ? styles.bubbleTail : ''}`}>
                    {!mine && m._firstOfRun && <span className={styles.author}>{m.authorName || (m.from === 'admin' ? 'Coach' : 'Member')}</span>}
                    <p className={styles.text}>{m.text}</p>
                    {m._lastOfRun && <span className={styles.stamp}>{formatStamp(m.createdAt)}</span>}
                  </div>
                </div>
                {role === 'admin' && lastMine && m.id === lastMine.id && (
                  <div className={`${styles.receipt} ${lastMineRead ? styles.receiptSeen : ''}`}>
                    {lastMineRead ? (
                      <><CheckIcon double /> Seen</>
                    ) : (
                      <><CheckIcon /> Sent</>
                    )}
                  </div>
                )}
              </li>
            )})}
            <li ref={endRef} aria-hidden="true" />
          </ul>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.composer}>
        <textarea
          ref={inputRef}
          className={styles.input}
          rows={1}
          placeholder={placeholder || (role === 'admin' ? `Reply to ${otherLabel}…` : 'Message your coach…')}
          value={text}
          onChange={e => { setText(e.target.value); autosize(e.target) }}
          onKeyDown={onKeyDown}
          disabled={sending || !uid}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={sending || !text.trim() || !uid}
          aria-label="Send message"
        >
          {sending ? (
            <span className={styles.sendingDot} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
      <p className={styles.composerHint}>Enter to send · Shift+Enter for a new line</p>
    </div>
  )
}

// Single or double check mark for the Sent / Seen receipt.
function CheckIcon({ double = false }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {double
        ? <><path d="M1 13l4 4L13 7" /><path d="M9 15l1.5 1.5L21 6" /></>
        : <path d="M4 12l5 5L20 7" />}
    </svg>
  )
}
