/**
 * Cloud Functions for La Ultra Run & Bee.
 *
 *  1. mirrorActivityToSheet — appends every audit-log change to a live Google Sheet.
 *  2. aiProxy — server-side proxy for the AI coach. Holds the OpenRouter API key
 *     as a real secret (Secret Manager) so it is NEVER shipped to browsers, and
 *     only serves signed-in users (verifies their Firebase ID token).
 *
 * Setup notes are at the bottom of this file.
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { defineSecret } = require('firebase-functions/params')
const { google } = require('googleapis')
const admin = require('firebase-admin')

if (!admin.apps.length) admin.initializeApp()

setGlobalOptions({
  region: process.env.FUNCTIONS_REGION || 'us-central1',
  maxInstances: 10,
  serviceAccount: process.env.FUNCTION_SERVICE_ACCOUNT || undefined,
})

// ── 1. Live Google Sheet mirror ──────────────────────────────────────────────
const SHEET_ID = process.env.GOOGLE_SHEET_ID
const TAB = process.env.GOOGLE_SHEET_TAB || 'Activity Log'
const HEADER = ['Time', 'Role', 'Actor', 'Actor email', 'Action', 'Target', 'Summary', 'Details']

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function ensureHeader(sheets) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A1:H1` })
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${TAB}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADER] },
      })
    }
  } catch (err) {
    console.warn('ensureHeader skipped:', err?.message || err)
  }
}

function rowFromActivity(data) {
  return [
    data.isoTs || new Date().toISOString(),
    data.actorRole || '',
    data.actorName || '',
    data.actorEmail || '',
    data.action || '',
    data.targetName || '',
    data.summary || '',
    data.details ? JSON.stringify(data.details) : '',
  ]
}

async function appendActivityRow(data) {
  const sheets = getSheetsClient()
  await ensureHeader(sheets)

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowFromActivity(data)] },
  })
}

async function syncAllActivityRowsToSheet() {
  if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not set')

  const sheets = getSheetsClient()
  const snap = await admin.firestore().collection('activity').orderBy('isoTs', 'asc').get()
  const rows = [HEADER]

  snap.forEach(doc => {
    rows.push(rowFromActivity(doc.data() || {}))
  })

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A:H`,
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  })

  return rows.length - 1
}

exports.mirrorActivityToSheet = onDocumentCreated('activity/{eventId}', async (event) => {
  if (!SHEET_ID) {
    console.error('GOOGLE_SHEET_ID is not set — skipping. Set it in functions/.env')
    return
  }
  const data = event.data && event.data.data()
  if (!data) return

  await appendActivityRow(data)
})

// One-off repair command. Create an adminCommands document with:
// { action: 'activitySheet.syncAll' }
// The function rewrites only the configured Activity Log tab from Firestore.
exports.syncActivitySheet = onDocumentCreated('adminCommands/{commandId}', async (event) => {
  const commandRef = event.data && event.data.ref
  const data = event.data && event.data.data()
  if (!data || data.action !== 'activitySheet.syncAll') return

  try {
    await commandRef.set({
      status: 'running',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })

    const mirroredRows = await syncAllActivityRowsToSheet()

    await commandRef.set({
      status: 'completed',
      mirroredRows,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    console.log(`syncActivitySheet completed: ${mirroredRows} activity rows mirrored`)
  } catch (err) {
    await commandRef.set({
      status: 'failed',
      error: err?.message || String(err),
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {})
    console.error('syncActivitySheet failed:', err?.message || err)
    throw err
  }
})

// ── 2. AI coach proxy (keeps the OpenRouter key server-side) ──────────────────
const OPENROUTER_API_KEY = defineSecret('OPENROUTER_API_KEY')
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const ALLOWED_MODELS = new Set(['anthropic/claude-sonnet-4.5'])
const MAX_BODY_BYTES = 100_000
const MAX_MESSAGE_CHARS = 8_000
const MAX_TOTAL_MESSAGE_CHARS = 40_000
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 20
const rateLimitBuckets = new Map()

// Only the app's own origins may call this from a browser.
const CORS_ORIGINS = [
  /^https:\/\/laultrarunandbee\.web\.app$/,
  /^https:\/\/laultrarunandbee\.firebaseapp\.com$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]

function isRateLimited(uid) {
  const now = Date.now()
  const existing = rateLimitBuckets.get(uid) || []
  const recent = existing.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitBuckets.set(uid, recent)
    return true
  }
  recent.push(now)
  rateLimitBuckets.set(uid, recent)
  return false
}

function sanitizeMessages(messages) {
  const trimmed = messages.slice(-30).map(message => {
    const role = ['system', 'user', 'assistant'].includes(message?.role) ? message.role : 'user'
    const content = typeof message?.content === 'string'
      ? message.content.slice(0, MAX_MESSAGE_CHARS)
      : ''
    return { role, content }
  }).filter(message => message.content.trim())

  let totalChars = 0
  const kept = []
  for (let i = trimmed.length - 1; i >= 0; i--) {
    totalChars += trimmed[i].content.length
    if (totalChars > MAX_TOTAL_MESSAGE_CHARS) break
    kept.unshift(trimmed[i])
  }
  return kept
}

exports.aiProxy = onRequest(
  { secrets: [OPENROUTER_API_KEY], cors: CORS_ORIGINS, maxInstances: 10 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const contentLength = Number(req.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) {
      res.status(413).json({ error: 'Request is too large.' })
      return
    }

    // Require a valid Firebase sign-in. This stops anyone from using the proxy
    // (and your credits) just because they found the URL.
    const authz = req.get('Authorization') || ''
    const match = authz.match(/^Bearer (.+)$/)
    if (!match) {
      res.status(401).json({ error: 'Missing sign-in token.' })
      return
    }
    let decoded
    try {
      decoded = await admin.auth().verifyIdToken(match[1])
    } catch {
      res.status(401).json({ error: 'Invalid or expired sign-in. Please sign in again.' })
      return
    }
    if (isRateLimited(decoded.uid)) {
      res.status(429).json({ error: 'Rate limit reached, wait a minute and try again.' })
      return
    }

    const body = req.body || {}
    const messages = Array.isArray(body.messages) ? sanitizeMessages(body.messages) : null
    if (!messages || messages.length === 0) {
      res.status(400).json({ error: 'messages array is required.' })
      return
    }

    // Clamp inputs so a forged request can't run up a huge bill.
    const requestedModel = typeof body.model === 'string' ? body.model : ''
    const payload = {
      model: ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'anthropic/claude-sonnet-4.5',
      messages,
      max_tokens: Math.min(Math.max(parseInt(body.max_tokens, 10) || 600, 1), 4000),
      temperature: typeof body.temperature === 'number'
        ? Math.min(Math.max(body.temperature, 0), 2) : 0.7,
    }

    try {
      const upstream = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY.value()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://laultrarunandbee.web.app',
          'X-Title': 'La Ultra Run & Bee',
        },
        body: JSON.stringify(payload),
      })
      const data = await upstream.json().catch(() => ({}))
      res.status(upstream.status).json(data)
    } catch (err) {
      res.status(502).json({ error: 'Upstream AI request failed: ' + (err?.message || err) })
    }
  }
)

/*
 ── Setup ────────────────────────────────────────────────────────────────────
 AI proxy:
   1. Rotate the OpenRouter key (the old one is public): https://openrouter.ai/keys
   2. Store the NEW key as a server secret (you paste it; it is encrypted in
      Google Secret Manager and never enters the frontend or git):
        firebase functions:secrets:set OPENROUTER_API_KEY
   3. Deploy:  firebase deploy --only functions
 The browser calls the function with the user's Firebase token; the key stays
 on the server.

 Live Sheet: see GOOGLE_SHEET_ID / FUNCTION_SERVICE_ACCOUNT in functions/.env.
*/
