const JOURNAL_KEY = 'gb_journal'

export function getJournalEntries() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveJournalEntry(entry) {
  const entries = getJournalEntries()
  const today = new Date().toISOString().split('T')[0]
  const existing = entries.findIndex(e => e.date === today)
  if (existing >= 0) {
    entries[existing] = { ...entries[existing], ...entry, date: today }
  } else {
    entries.push({ ...entry, date: today })
  }
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries))
}

export function getTodayEntry() {
  const today = new Date().toISOString().split('T')[0]
  return getJournalEntries().find(e => e.date === today) || null
}

export function getEntryByDate(date) {
  return getJournalEntries().find(e => e.date === date) || null
}

export function computeFeelScore(scores) {
  const vals = Object.values(scores).filter(v => typeof v === 'number')
  if (!vals.length) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
}

// Consecutive days (ending today) with a journal entry.
export function computeEntryStreak(entries) {
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
