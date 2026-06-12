/**
 * Full dashboard → Google Sheet mirror.
 *
 * The Activity Log tab (index.js) only carries change events. This module
 * mirrors EVERYTHING the admin dashboard shows into its own tabs of the same
 * spreadsheet: Summary, Users, Journal, Training Plans, Check-ins and Remarks.
 *
 * Any write to a user's journal, profile, coach plan, remarks, or the admin
 * list schedules a rebuild. Rebuilds are debounced with a token in
 * `syncState/dashboard`: every change stamps a fresh token and sleeps; only
 * the holder of the newest token does the rebuild, so a burst of writes (e.g.
 * a guest migration saving 30 entries) costs one Sheets rebuild, not 30.
 *
 * Tabs are created automatically if missing. Values are written RAW so user
 * text can never be interpreted as a formula.
 */

const { google } = require('googleapis')
const admin = require('firebase-admin')

const SHEET_ID = process.env.GOOGLE_SHEET_ID
const ACTIVITY_TAB = process.env.GOOGLE_SHEET_TAB || 'Activity Log'

const TABS = {
  summary: 'Summary',
  users: 'Users',
  journal: 'Journal',
  plans: 'Training Plans',
  checkins: 'Check-ins',
  remarks: 'Remarks',
  messages: 'Messages',
}

const SYNC_STATE_PATH = 'syncState/dashboard'
const SYNC_DEBOUNCE_MS = 15_000

// Mirrors src/data/journalFactors.js (functions can't import frontend modules).
const JOURNAL_FACTORS = [
  ['sleep', 'Sleep Quality'],
  ['nutrition', 'Nutritional Value'],
  ['personalStress', 'Personal Stress'],
  ['professionalStress', 'Professional Stress'],
  ['emotionalBaseline', 'Emotional Baseline'],
  ['energy', 'Energy Levels'],
  ['movementJoy', 'Movement Joy (Walk / Run)'],
  ['strengthJoy', 'Strength Joy'],
  ['breathAwareness', 'Breath Awareness'],
  ['smileFactor', 'The Smile Factor'],
  ['jointFluidity', 'Joint Fluidity'],
  ['digestiveComfort', 'Digestive Comfort'],
  ['curiosityLearning', 'Curiosity / Learning'],
  ['connection', 'Connection'],
]

// Mirrors computeFeelScore in src/data/storage.js.
function computeFeelScore(scores = {}) {
  const vals = Object.values(scores).filter(v => typeof v === 'number')
  if (!vals.length) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
}

function computeEntryStreak(entries = []) {
  if (!entries.length) return 0
  const dates = new Set(entries.map(entry => entry.date))
  const cursor = new Date()
  let streak = 0
  while (dates.has(cursor.toISOString().split('T')[0])) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

// Reads every user's profile/coach/remarks + journal entries, mirroring the
// merge the admin panel does client-side. Tombstoned users are excluded.
async function loadDashboardData() {
  const db = admin.firestore()
  const [configSnap, journalSnap, messagesSnap, adminsSnap, activityCount] = await Promise.all([
    db.collectionGroup('config').get(),
    db.collectionGroup('journal').get(),
    db.collectionGroup('messages').get().catch(() => ({ forEach: () => {} })),
    db.collection('admins').get().catch(() => ({ docs: [] })),
    db.collection('activity').count().get().then(s => s.data().count).catch(() => null),
  ])

  const users = new Map()
  const deleted = new Set()
  const ensure = uid => {
    if (!users.has(uid)) users.set(uid, { uid, entries: [], messages: [] })
    return users.get(uid)
  }

  configSnap.forEach(snap => {
    const uid = snap.ref.parent.parent && snap.ref.parent.parent.id
    if (!uid) return
    if (snap.id === '_deleted') { deleted.add(uid); return }
    const user = ensure(uid)
    if (snap.id === 'profile') user.profile = snap.data() || {}
    if (snap.id === 'coach') user.coach = snap.data() || {}
    if (snap.id === 'adminRemarks') user.remarks = (snap.data() || {}).remarks || []
  })

  journalSnap.forEach(snap => {
    const uid = snap.ref.parent.parent && snap.ref.parent.parent.id
    if (!uid) return
    ensure(uid).entries.push(snap.data() || {})
  })

  messagesSnap.forEach(snap => {
    const uid = snap.ref.parent.parent && snap.ref.parent.parent.id
    if (!uid) return
    ensure(uid).messages.push(snap.data() || {})
  })

  deleted.forEach(uid => users.delete(uid))

  const list = [...users.values()].map(user => {
    const profile = user.profile || {}
    user.entries.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    const namedEntry = user.entries.find(e => e.userName)
    const mailEntry = user.entries.find(e => e.userEmail)
    user.name = profile.name || profile.displayName
      || (namedEntry && namedEntry.userName) || (user.coach && user.coach.userName)
      || profile.email || 'Anonymous'
    user.email = profile.email || (mailEntry && mailEntry.userEmail)
      || (user.coach && user.coach.userEmail) || ''
    user.avgScore = user.entries.length
      ? Math.round(user.entries.reduce((s, e) => s + computeFeelScore(e.scores || {}), 0) / user.entries.length * 10) / 10
      : null
    user.lastDate = (user.entries[0] && user.entries[0].date) || null
    user.lastSeenAt = profile.lastLoginAt || profile.updatedAt || profile.createdAt || null
    return user
  })

  // Most recently active first, mirroring the dashboard ordering.
  list.sort((a, b) =>
    String(b.lastDate || b.lastSeenAt || '').localeCompare(String(a.lastDate || a.lastSeenAt || ''))
  )

  return { users: list, admins: adminsSnap.docs.map(d => d.id).sort(), activityCount }
}

function userRow(u) {
  const p = u.profile || {}
  const goal = (u.coach || {}).goal
  const checkins = (u.coach || {}).checkins || []
  const exercises = u.entries.reduce((s, e) => s + ((e.sessions || []).length), 0)
  return [
    u.name, u.email, u.uid,
    p.path || '', p.gender || p.sex || '', p.ageRange || '', p.commitment || '',
    p.onboardingComplete ? 'Complete' : 'Incomplete',
    u.avgScore == null ? '' : u.avgScore,
    u.entries.length,
    computeEntryStreak(u.entries),
    exercises,
    checkins.length,
    checkins.filter(c => c.status === 'done').length,
    u.lastDate || '',
    p.createdAt || '', p.lastLoginAt || '', p.updatedAt || '',
    goal ? (goal.focus || goal.raceGoal || '') : '',
    goal && Array.isArray(goal.plan) ? goal.plan.length : 0,
    goal ? (goal.generatedWeeks || 0) : '',
    (u.remarks || []).length,
    (u.messages || []).length,
    p.programGoal || '',
    p.heardAbout || '',
    p.fitnessHistory || p.story || '',
    p.commitmentStatement || '',
    p.lastPeriod || '', p.nextPeriod || '', p.cycleLength || '', p.periodLength || '',
    p.menopauseStatus || '',
  ]
}

const USERS_HEADER = [
  'Name', 'Email', 'UID',
  'Path', 'Gender', 'Age range', 'Commitment (days)',
  'Onboarding', 'Avg feel', 'Entries', 'Day streak', 'Exercises logged',
  'Check-ins', 'Runs done', 'Last entry', 'Created', 'Last login', 'Last updated',
  'Goal', 'Plan days', 'Generated weeks', 'Remarks', 'Messages',
  'Program goal', 'Heard about', 'Story', 'Self-commitment',
  'Last period', 'Next period', 'Cycle length', 'Period length', 'Menopause status',
]

// Builds the full set of `tab name → 2-D values` the spreadsheet should hold.
function buildTabValues({ users, admins, activityCount }) {
  const journalRows = []
  const planRows = []
  const checkinRows = []
  const remarkRows = []
  const messageRows = []
  let totalCheckins = 0
  let totalEntries = 0
  let totalMessages = 0

  users.forEach(u => {
    u.entries.forEach(e => {
      totalEntries += 1
      const sessions = (e.sessions || [])
        .map(s => s.exerciseName || s.title || s.exerciseId || s.type)
        .filter(Boolean).join(', ')
      journalRows.push([
        e.date || '', u.name, u.email, u.uid,
        computeFeelScore(e.scores || {}),
        ...JOURNAL_FACTORS.map(([id]) =>
          e.scores && typeof e.scores[id] === 'number' ? e.scores[id] : ''),
        e.note || '', sessions, e.runningAdjustment || '',
      ])
    })

    const plan = ((u.coach || {}).goal || {}).plan || []
    plan.forEach(d => {
      planRows.push([
        u.name, u.email, u.uid,
        d.dayNumber || '', d.week || '', d.date || '', d.day || '',
        d.type || '', d.title || '', d.distance || '', d.duration || '', d.pace || '',
        d.notes || '', d.strength || '', d.mobility || '', d.crossTraining || '',
      ])
    })

    const checkins = (u.coach || {}).checkins || []
    totalCheckins += checkins.length
    checkins.forEach(c => {
      checkinRows.push([
        u.name, u.email, u.uid,
        c.date || '', c.status || '', c.userNote || c.note || '', c.actualKm || '',
      ])
    })

    ;(u.remarks || []).forEach(r => {
      remarkRows.push([
        u.name, u.email, u.uid,
        r.from || '', r.date || '', r.runDate || '', r.text || '',
      ])
    })

    ;(u.messages || []).forEach(m => {
      totalMessages += 1
      messageRows.push([
        m.createdAt || '', u.name, u.email, u.uid,
        m.from === 'admin' ? 'Coach → member' : 'Member → coach',
        m.authorName || '', m.text || '',
        m.from === 'admin'
          ? (m.readByUser ? 'read' : 'unread')
          : (m.readByAdmin ? 'read' : 'unread'),
      ])
    })
  })

  journalRows.sort((a, b) => String(b[0]).localeCompare(String(a[0])))
  checkinRows.sort((a, b) => String(b[3]).localeCompare(String(a[3])))
  remarkRows.sort((a, b) => String(b[4]).localeCompare(String(a[4])))
  messageRows.sort((a, b) => String(b[0]).localeCompare(String(a[0])))

  const totalRemarks = remarkRows.length
  const summary = [
    ['Metric', 'Value'],
    ['Last synced', new Date().toISOString()],
    ['Total users', users.length],
    ['Users with a plan', users.filter(u => u.coach && u.coach.goal).length],
    ['Total journal entries', totalEntries],
    ['Total run check-ins', totalCheckins],
    ['Total coach remarks', totalRemarks],
    ['Total messages', totalMessages],
    ['Total change events', activityCount == null ? `see "${ACTIVITY_TAB}" tab` : activityCount],
    ['Admin accounts', admins.join(', ')],
    ['Note', 'This spreadsheet mirrors the admin dashboard automatically. Every tab is rebuilt from Firestore whenever a user or admin changes anything; manual edits here will be overwritten.'],
  ]

  return {
    [TABS.summary]: summary,
    [TABS.users]: [USERS_HEADER, ...users.map(userRow)],
    [TABS.journal]: [
      ['Date', 'Name', 'Email', 'UID', 'Feel score',
        ...JOURNAL_FACTORS.map(([, label]) => label),
        'Note', 'Exercises', 'Running adjustment'],
      ...journalRows,
    ],
    [TABS.plans]: [
      ['Name', 'Email', 'UID', 'Day #', 'Week', 'Date', 'Day', 'Type', 'Title',
        'Distance', 'Duration', 'Pace', 'Notes', 'Strength', 'Mobility', 'Cross-training'],
      ...planRows,
    ],
    [TABS.checkins]: [
      ['Name', 'Email', 'UID', 'Date', 'Status', 'Note', 'Actual km'],
      ...checkinRows,
    ],
    [TABS.remarks]: [
      ['To', 'Email', 'UID', 'From', 'Date', 'Run date', 'Remark'],
      ...remarkRows,
    ],
    [TABS.messages]: [
      ['Time', 'Member', 'Email', 'UID', 'Direction', 'Author', 'Message', 'Status'],
      ...messageRows,
    ],
  }
}

// Creates any missing worksheet tabs so first deploy "just works".
async function ensureTabs(sheets, titles) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets.properties.title',
  })
  const existing = new Set((meta.data.sheets || []).map(s => s.properties.title))
  const missing = titles.filter(t => !existing.has(t))
  if (!missing.length) return
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: missing.map(title => ({ addSheet: { properties: { title } } })) },
  })
}

// Rebuilds every dashboard tab from Firestore in two Sheets API calls
// (batchClear + batchUpdate) and records the result in syncState/dashboard.
async function writeDashboardTabs(reason = 'change') {
  if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not set')

  const sheets = getSheetsClient()
  const data = await loadDashboardData()
  const tabValues = buildTabValues(data)
  const tabNames = Object.values(TABS)

  await ensureTabs(sheets, [...tabNames, ACTIVITY_TAB])

  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: SHEET_ID,
    requestBody: { ranges: tabNames.map(t => `'${t}'`) },
  })

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: tabNames.map(t => ({ range: `'${t}'!A1`, values: tabValues[t] })),
    },
  })

  const counts = {
    users: data.users.length,
    journalEntries: tabValues[TABS.journal].length - 1,
    planDays: tabValues[TABS.plans].length - 1,
    checkins: tabValues[TABS.checkins].length - 1,
    remarks: tabValues[TABS.remarks].length - 1,
    messages: tabValues[TABS.messages].length - 1,
  }

  await admin.firestore().doc(SYNC_STATE_PATH).set({
    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSyncedIso: new Date().toISOString(),
    lastSyncStatus: 'ok',
    lastSyncReason: reason,
    counts,
  }, { merge: true })

  return counts
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Debounced entry point used by the Firestore triggers.
async function requestDashboardSync(reason) {
  if (!SHEET_ID) {
    console.error('GOOGLE_SHEET_ID is not set — skipping dashboard sheet sync. Set it in functions/.env')
    return
  }

  const stateRef = admin.firestore().doc(SYNC_STATE_PATH)
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  await stateRef.set({
    dirtyToken: token,
    dirtyAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  await sleep(SYNC_DEBOUNCE_MS)

  const latest = await stateRef.get()
  if (((latest.data() || {}).dirtyToken) !== token) return // a newer change owns the rebuild

  try {
    const counts = await writeDashboardTabs(reason)
    console.log(`Dashboard sheet synced (${reason}):`, JSON.stringify(counts))
  } catch (err) {
    await stateRef.set({
      lastSyncStatus: 'error',
      lastSyncError: (err && err.message) || String(err),
      lastSyncErrorAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {})
    console.error('Dashboard sheet sync failed:', (err && err.message) || err)
    throw err
  }
}

module.exports = { getSheetsClient, writeDashboardTabs, requestDashboardSync, SHEET_ID, ACTIVITY_TAB }
