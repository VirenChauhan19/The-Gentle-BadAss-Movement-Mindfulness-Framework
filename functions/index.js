/**
 * Live Google Sheet mirror.
 *
 * Every time a change is recorded in the `activity` collection (which the app
 * writes on every user/admin edit), this Cloud Function appends a row to a
 * Google Sheet — giving the admin a spreadsheet that updates live with no
 * clicking. The on-demand .xlsx export in the app covers the offline case.
 *
 * Setup (one time) — see the notes at the bottom of this file.
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { setGlobalOptions } = require('firebase-functions/v2')
const { google } = require('googleapis')

setGlobalOptions({
  region: process.env.FUNCTIONS_REGION || 'us-central1',
  maxInstances: 5,
  // Run the function AS this service account. Set it to an account you can see
  // in IAM today (e.g. the Firebase Admin SDK one) so you can share the Sheet
  // with it immediately. If left unset, Functions uses the default compute
  // service account, which only exists after the first deploy.
  serviceAccount: process.env.FUNCTION_SERVICE_ACCOUNT || undefined,
})

const SHEET_ID = process.env.GOOGLE_SHEET_ID
const TAB = process.env.GOOGLE_SHEET_TAB || 'Activity Log'
const HEADER = ['Time', 'Role', 'Actor', 'Actor email', 'Action', 'Target', 'Summary', 'Details']

// Authenticates as the function's own service account (Application Default
// Credentials). Share the target Sheet with that service account's email
// (as Editor) and enable the Google Sheets API on the project.
function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

// Write the header row once, if the sheet's first row is empty.
async function ensureHeader(sheets) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1:H1`,
    })
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

exports.mirrorActivityToSheet = onDocumentCreated('activity/{eventId}', async (event) => {
  if (!SHEET_ID) {
    console.error('GOOGLE_SHEET_ID is not set — skipping. Set it in functions/.env')
    return
  }
  const data = event.data && event.data.data()
  if (!data) return

  const sheets = getSheetsClient()
  await ensureHeader(sheets)

  const row = [
    data.isoTs || new Date().toISOString(),
    data.actorRole || '',
    data.actorName || '',
    data.actorEmail || '',
    data.action || '',
    data.targetName || '',
    data.summary || '',
    data.details ? JSON.stringify(data.details) : '',
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  })
})

/*
 ── One-time setup ───────────────────────────────────────────────────────────
 1. Firebase must be on the Blaze (pay-as-you-go) plan to deploy functions.
 2. Create a Google Sheet. Copy its ID from the URL:
      https://docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit
    Put it in functions/.env as GOOGLE_SHEET_ID=<id>
 3. In Google Cloud Console (same project, "gentle-badass"):
      APIs & Services → enable "Google Sheets API".
 4. Find the function's service account email:
      Cloud Console → IAM, the "Default compute service account"
      (looks like <project-number>-compute@developer.gserviceaccount.com).
    Share the Sheet with that email as "Editor".
 5. Deploy:
      cd functions && npm install && cd ..
      firebase deploy --only functions
 From then on, every change in the app appends a row to the Sheet live.
*/
