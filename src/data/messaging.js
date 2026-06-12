// Two-way member ↔ admin messaging.
//
// Each user has one conversation thread with the coaching team, stored at
// `users/{uid}/messages/{messageId}`. A message is labelled `from: 'user'` or
// `from: 'admin'`, carries read flags for each side, and is append-only text.
// Both the member's Profile page and the admin's per-user view use the same
// MessageThread component, which talks to the helpers below.
//
// Every send also drops a lightweight audit-log event so conversations surface
// in the admin dashboard's live feed and the Google Sheet, just like remarks.

import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy, doc, writeBatch, serverTimestamp,
} from 'firebase/firestore'
import { logActivity, actorFromUser } from './activityLog'

const MAX_LEN = 4000

export function messagesCollection(uid) {
  return collection(db, 'users', uid, 'messages')
}

function preview(text, n = 80) {
  return text.length > n ? `${text.slice(0, n)}…` : text
}

// Live subscription to one user's full thread, oldest → newest.
export function subscribeToThread(uid, onChange, onError) {
  if (!db || !uid) return () => {}
  const q = query(messagesCollection(uid), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    snap => onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => { if (onError) onError(err) }
  )
}

// A signed-in member messages the coaching team.
export async function sendUserMessage({ uid, user, guestName, text }) {
  const body = (text || '').trim()
  if (!db || !uid || !body) return
  await addDoc(messagesCollection(uid), {
    from: 'user',
    authorUid: user?.uid || uid,
    authorName: user?.displayName || guestName || user?.email || 'Member',
    authorEmail: user?.email || '',
    text: body.slice(0, MAX_LEN),
    createdAt: new Date().toISOString(),
    ts: serverTimestamp(),
    readByUser: true,
    readByAdmin: false,
  })
  logActivity({
    actor: actorFromUser(user, 'user', guestName),
    action: 'message.send',
    summary: `messaged the team: "${preview(body)}"`,
    details: { preview: body.slice(0, 120) },
  })
}

// An admin replies into a member's thread.
export async function sendAdminMessage({ uid, adminUser, targetName, text }) {
  const body = (text || '').trim()
  if (!db || !uid || !body) return
  await addDoc(messagesCollection(uid), {
    from: 'admin',
    authorUid: adminUser?.uid || '',
    authorName: adminUser?.displayName || 'Coach',
    authorEmail: adminUser?.email || '',
    text: body.slice(0, MAX_LEN),
    createdAt: new Date().toISOString(),
    ts: serverTimestamp(),
    readByUser: false,
    readByAdmin: true,
  })
  logActivity({
    actor: actorFromUser(adminUser, 'admin'),
    action: 'admin.message.send',
    targetUid: uid,
    targetName,
    summary: `messaged ${targetName || 'a member'}: "${preview(body)}"`,
    details: { preview: body.slice(0, 120) },
  })
}

// Mark the OTHER party's messages as read. side='admin' clears user-sent
// messages (an admin opened the thread); side='user' clears admin-sent ones.
export async function markThreadRead({ uid, messages, side }) {
  if (!db || !uid || !messages?.length) return
  const otherFrom = side === 'admin' ? 'user' : 'admin'
  const field = side === 'admin' ? 'readByAdmin' : 'readByUser'
  const unread = messages.filter(m => m.from === otherFrom && !m[field] && m.id)
  if (!unread.length) return
  const batch = writeBatch(db)
  unread.forEach(m => batch.update(doc(db, 'users', uid, 'messages', m.id), { [field]: true }))
  await batch.commit().catch(() => {})
}

// How many of the other party's messages are still unread for `side`.
export function countUnread(messages, side) {
  const otherFrom = side === 'admin' ? 'user' : 'admin'
  const field = side === 'admin' ? 'readByAdmin' : 'readByUser'
  return (messages || []).filter(m => m.from === otherFrom && !m[field]).length
}
