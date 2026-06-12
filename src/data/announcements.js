// One-to-many announcements.
//
// Unlike the 1:1 message threads, an announcement is a single global document
// every member reads. The admin posts one (no fan-out, no group), and it shows
// up in each member's Announcements tab as a read-only notice. Unread state is
// tracked per-device via localStorage (a timestamp of the newest seen item),
// since announcements are one-way and don't need per-user server flags.

import { db } from '../firebase'
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore'
import { logActivity, actorFromUser } from './activityLog'

const MAX_LEN = 4000
const READ_KEY = 'gb_announcements_read'

export function announcementsCollection() {
  return collection(db, 'announcements')
}

function preview(text, n = 80) {
  return text.length > n ? `${text.slice(0, n)}…` : text
}

// Live feed of announcements, newest first.
export function subscribeToAnnouncements(onChange, onError) {
  if (!db) return () => {}
  const q = query(announcementsCollection(), orderBy('createdAt', 'desc'), limit(100))
  return onSnapshot(
    q,
    snap => onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => { if (onError) onError(err) }
  )
}

// Admin posts a single announcement that reaches everyone.
export async function postAnnouncement({ adminUser, text }) {
  const body = (text || '').trim()
  if (!db || !body) return null
  const ref = await addDoc(announcementsCollection(), {
    text: body.slice(0, MAX_LEN),
    authorName: adminUser?.displayName || 'Coach',
    authorEmail: adminUser?.email || '',
    authorUid: adminUser?.uid || '',
    createdAt: new Date().toISOString(),
    ts: serverTimestamp(),
  })
  logActivity({
    actor: actorFromUser(adminUser, 'admin'),
    action: 'admin.announcement.post',
    summary: `posted an announcement: "${preview(body)}"`,
    details: { preview: body.slice(0, 120) },
  })
  return ref.id
}

export async function deleteAnnouncement(id) {
  if (!db || !id) return
  await deleteDoc(doc(db, 'announcements', id))
}

// ── Per-device read tracking ──────────────────────────────────────────────────
export function getAnnouncementsLastRead() {
  try { return localStorage.getItem(READ_KEY) || '' } catch { return '' }
}

export function setAnnouncementsLastRead(iso) {
  try { localStorage.setItem(READ_KEY, iso || new Date().toISOString()) } catch {}
}

// How many announcements are newer than the last one this device has seen.
export function countUnreadAnnouncements(list, lastRead) {
  if (!list?.length) return 0
  const seen = lastRead || ''
  return list.filter(a => (a.createdAt || '') > seen).length
}
