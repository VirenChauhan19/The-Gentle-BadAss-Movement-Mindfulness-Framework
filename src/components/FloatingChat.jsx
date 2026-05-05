import { useState, useRef, useEffect } from 'react'
import { useData } from '../context/DataContext'
import styles from './FloatingChat.module.css'

const API_URL   = 'https://openrouter.ai/api/v1/chat/completions'
const chatKey = uid => uid ? `gb_float_chat_${uid}` : 'gb_float_chat'

const QUICK = [
  "I got injured — what now?",
  "It's raining, indoor ideas?",
  "How do I prevent shin splints?",
  "Should I run when tired?",
  "What to eat before a run?",
  "How do I get faster?",
]

export default function FloatingChat() {
  const [open,    setOpen]    = useState(false)
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [unread,  setUnread]  = useState(0)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const { coachData, user } = useData()
  const hasKey = !!import.meta.env.VITE_OPENROUTER_API_KEY

  // Keyed per user so chat history never leaks between accounts
  const key = chatKey(user?.uid)
  const [msgs, setMsgs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
  })

  // Reload history when account switches
  useEffect(() => {
    try { setMsgs(JSON.parse(localStorage.getItem(key) || '[]')) } catch { setMsgs([]) }
    setUnread(0)
  }, [key])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 260)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  function save(list) {
    const trimmed = list.slice(-40)
    setMsgs(trimmed)
    localStorage.setItem(key, JSON.stringify(trimmed))
  }

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || loading || !hasKey) return
    setInput('')
    setError(null)
    const next = [...msgs, { role: 'user', content }]
    save(next)
    setLoading(true)
    try {
      const reply = await callAI(next, coachData)
      const final = [...next, { role: 'assistant', content: reply }]
      save(final)
      if (!open) setUnread(u => u + 1)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* ── Panel ─────────────────────────────────────── */}
      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>

        <div className={styles.panelHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerAvatar}><BotFace /></div>
            <div>
              <p className={styles.headerName}>AI Coach</p>
              <p className={styles.headerSub}><span className={styles.onlineDot} />Ready to help</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            {msgs.length > 0 && (
              <button className={styles.iconBtn} title="Clear chat" onClick={() => save([])}>
                <TrashIcon />
              </button>
            )}
            <button className={styles.iconBtn} onClick={() => setOpen(false)}>
              <XIcon />
            </button>
          </div>
        </div>

        <div className={styles.messages}>
          {msgs.length === 0 ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeAvatar}><BotFace /></div>
              <p className={styles.welcomeText}>
                Hey! I'm your AI running coach. Ask me anything — injuries, indoor training, pacing, nutrition, recovery…
              </p>
              {!hasKey && (
                <p className={styles.noKeyMsg}>
                  API key not configured. Add <code>VITE_OPENROUTER_API_KEY</code> to deploy settings.
                </p>
              )}
              <div className={styles.quickGrid}>
                {QUICK.map(q => (
                  <button
                    key={q}
                    className={styles.quickBtn}
                    onClick={() => send(q)}
                    disabled={!hasKey}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.row} ${m.role === 'user' ? styles.rowUser : styles.rowBot}`}
                >
                  {m.role === 'assistant' && (
                    <div className={styles.msgAvatar}><BotFace /></div>
                  )}
                  <div className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
                    <p>{m.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className={`${styles.row} ${styles.rowBot}`}>
                  <div className={styles.msgAvatar}><BotFace /></div>
                  <div className={`${styles.bubble} ${styles.bubbleBot}`}>
                    <div className={styles.typingDots}><span /><span /><span /></div>
                  </div>
                </div>
              )}

              {error && <p className={styles.errMsg}>{error}</p>}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        <div className={styles.panelFooter}>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder={hasKey ? 'Ask your coach anything…' : 'API key not configured'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={loading || !hasKey}
          />
          <button
            className={styles.sendBtn}
            onClick={() => send()}
            disabled={!input.trim() || loading || !hasKey}
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {/* ── Floating button ───────────────────────────── */}
      <button
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close coach chat' : 'Open coach chat'}
      >
        <div className={styles.fabInner}>
          {open ? <XIcon size={22} /> : <ChatBubbleIcon />}
        </div>
        {!open && <span className={styles.fabRing} />}
        {!open && unread > 0 && (
          <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    </>
  )
}

// ── AI call ────────────────────────────────────────────────────────────────────
async function callAI(history, coachData) {
  const key   = import.meta.env.VITE_OPENROUTER_API_KEY
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'
  const goal  = coachData?.goal

  const ctx = goal
    ? `The user is following a ${goal.weeks}-week ${goal.raceGoal} running program (${goal.experience} level, ${goal.daysPerWeek} training days/week).`
    : 'The user is using a running and mindfulness training app.'

  const system = `You are an expert AI running and fitness coach for La Ultra-The High Run & Bee. ${ctx}

Answer questions about: running training, injury prevention and recovery, indoor workouts for rainy days, pacing, nutrition for runners, strength work, recovery, mindfulness, and general fitness.

Rules: Be direct, warm, and practical. Under 140 words unless the question truly needs more. Skip excessive disclaimers — give real advice like a trusted coach would. If something needs medical care, say so briefly.`

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'La Ultra-The High Run & Bee',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        ...history.slice(-14),
      ],
      max_tokens: 300,
      temperature: 0.72,
    }),
  })

  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    if (res.status === 429) throw new Error('Rate limit reached — wait 30 seconds and try again. (Free tier limit)')
    throw new Error(e.error?.message || `Error ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || 'No response.'
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function BotFace() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="13" rx="3" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
      <path d="M9.5 17.5a3 3 0 0 0 5 0" />
    </svg>
  )
}

function ChatBubbleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="13" y2="14" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function XIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
