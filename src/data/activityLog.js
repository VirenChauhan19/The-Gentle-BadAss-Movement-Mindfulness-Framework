// Central audit-log writer. Every meaningful change in the app — by a user or by
// an admin — is recorded as an append-only event in the top-level `activity`
// collection. The admin dashboard reads this live, and a Cloud Function mirrors
// it into a live Google Sheet. Logging must NEVER break the action it records,
// so every write is best-effort and swallows its own errors.

import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

// Build the "who did it" half of an event from a Firebase user object.
// Guests (no Firebase auth) get actorUid 'guest' and are skipped by logActivity,
// since Firestore rules require an authenticated uid to write.
export function actorFromUser(user, role = 'user', guestName) {
  return {
    actorUid:   user?.uid || 'guest',
    actorEmail: user?.email || '',
    actorName:  user?.displayName || guestName || user?.email || 'Unknown',
    actorRole:  role, // 'user' | 'admin'
  }
}

/**
 * Record one change.
 * @param {object} e
 * @param {object} e.actor      result of actorFromUser()
 * @param {string} e.action     dotted verb, e.g. 'journal.save', 'admin.plan.edit'
 * @param {string} [e.targetUid]   whose data changed (defaults to the actor)
 * @param {string} [e.targetName]  display name of the target
 * @param {string} [e.summary]     human-readable one-liner for the feed
 * @param {object} [e.details]     optional structured payload (changed fields, counts…)
 */
export async function logActivity({ actor, action, targetUid, targetName, summary, details }) {
  if (!db || !actor || !actor.actorUid || actor.actorUid === 'guest') return
  try {
    await addDoc(collection(db, 'activity'), {
      actorUid:   actor.actorUid,
      actorEmail: actor.actorEmail || '',
      actorName:  actor.actorName || 'Unknown',
      actorRole:  actor.actorRole || 'user',
      action,
      targetUid:  targetUid || actor.actorUid,
      targetName: targetName || actor.actorName || 'Unknown',
      summary:    summary || action,
      details:    details ?? null,
      isoTs:      new Date().toISOString(), // sortable client time (used for ordering/export)
      ts:         serverTimestamp(),        // authoritative server time
    })
  } catch (err) {
    console.warn('[activity] log failed:', err?.message || err)
  }
}
