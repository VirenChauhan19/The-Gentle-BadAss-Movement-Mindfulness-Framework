// Builds a multi-sheet .xlsx of everything the admin can see and triggers a
// download. This is the "always-current on click" Excel export. (The live,
// auto-updating Google Sheet is handled separately by the Cloud Function.)

import * as XLSX from 'xlsx'
import { computeFeelScore } from './storage'
import { JOURNAL_FACTORS } from './journalFactors'

function autoWidth(rows) {
  // Rough column widths from the longest value in each column.
  if (!rows.length) return []
  const keys = Object.keys(rows[0])
  return keys.map(k => {
    const max = Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length))
    return { wch: Math.min(Math.max(max + 2, 8), 60) }
  })
}

function appendSheet(wb, name, rows) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '—': 'No data' }])
  if (rows.length) ws['!cols'] = autoWidth(rows)
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)) // Excel tab name limit
}

/**
 * @param {object} data
 * @param {Array}  data.userList   merged users (from the admin panel)
 * @param {Array}  data.allEntries every journal entry across all users
 * @param {Array}  data.activity   audit-log events
 */
export function exportAdminWorkbook({ userList = [], allEntries = [], activity = [] }) {
  const wb = XLSX.utils.book_new()
  const today = new Date().toISOString().split('T')[0]

  // ── Summary ──────────────────────────────────────────────────────────────
  const withPlan = userList.filter(u => u.coach?.goal).length
  const totalRemarks = userList.reduce((s, u) => s + (u.remarks?.length || 0), 0)
  appendSheet(wb, 'Summary', [
    { Metric: 'Exported at',          Value: new Date().toLocaleString() },
    { Metric: 'Total users',          Value: userList.length },
    { Metric: 'Users with a plan',    Value: withPlan },
    { Metric: 'Total journal entries', Value: allEntries.length },
    { Metric: 'Total coach remarks',  Value: totalRemarks },
    { Metric: 'Total change events',  Value: activity.length },
  ])

  // ── Users ────────────────────────────────────────────────────────────────
  appendSheet(wb, 'Users', userList.map(u => {
    const p = u.userProfile || {}
    const goal = u.coach?.goal
    return {
      Name:           u.name || '',
      Email:          u.email || '',
      UID:            u.uid,
      Path:           p.path || '',
      Gender:         p.gender || p.sex || '',
      'Age range':    p.ageRange || '',
      'Commitment (days)': p.commitment || '',
      Onboarding:     p.onboardingComplete ? 'Complete' : 'Incomplete',
      'Avg feel':     u.avgScore ?? '',
      Entries:        u.entries?.length || 0,
      'Last entry':   u.lastDate || '',
      'Created':      p.createdAt || '',
      'Last login':   p.lastLoginAt || '',
      'Last updated': p.updatedAt || '',
      Goal:           goal?.focus || goal?.raceGoal || '',
      'Plan days':    goal?.plan?.length || 0,
      Remarks:        u.remarks?.length || 0,
      'Program goal': p.programGoal || '',
      'Heard about':  p.heardAbout || '',
    }
  }))

  // ── Journal entries ──────────────────────────────────────────────────────
  appendSheet(wb, 'Journal', allEntries.map(e => {
    const row = {
      Date:  e.date || '',
      Name:  e.userName || '',
      Email: e.userEmail || '',
      UID:   e._uid || '',
      'Feel score': computeFeelScore(e.scores || {}),
    }
    JOURNAL_FACTORS.forEach(f => { row[f.label] = e.scores?.[f.id] ?? '' })
    row.Note = e.note || ''
    return row
  }))

  // ── Plans (one row per planned day per user) ─────────────────────────────
  const planRows = []
  userList.forEach(u => {
    const plan = u.coach?.goal?.plan || []
    plan.forEach(d => {
      planRows.push({
        Name:     u.name || '',
        Email:    u.email || '',
        'Day #':  d.dayNumber || '',
        Week:     d.week || '',
        Date:     d.date || '',
        Day:      d.day || '',
        Type:     d.type || '',
        Title:    d.title || '',
        Distance: d.distance || '',
        Duration: d.duration || '',
        Pace:     d.pace || '',
        Notes:    d.notes || '',
      })
    })
  })
  appendSheet(wb, 'Plans', planRows)

  // ── Activity / change log ────────────────────────────────────────────────
  appendSheet(wb, 'Activity Log', activity.map(a => ({
    Time:         a.isoTs || '',
    Role:         a.actorRole || '',
    Actor:        a.actorName || '',
    'Actor email': a.actorEmail || '',
    Action:       a.action || '',
    Target:       a.targetName || '',
    Summary:      a.summary || '',
    Details:      a.details ? JSON.stringify(a.details) : '',
  })))

  // ── Remarks ──────────────────────────────────────────────────────────────
  const remarkRows = []
  userList.forEach(u => {
    (u.remarks || []).forEach(r => {
      remarkRows.push({
        To:      u.name || '',
        Email:   u.email || '',
        From:    r.from || '',
        Date:    r.date || '',
        'Run date': r.runDate || '',
        Remark:  r.text || '',
      })
    })
  })
  appendSheet(wb, 'Remarks', remarkRows)

  XLSX.writeFile(wb, `la-ultra-admin-${today}.xlsx`)
}
