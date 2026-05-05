import { useEffect, useState, useMemo } from 'react'
import { db } from '../firebase'
import { collectionGroup, onSnapshot, query, doc, getDoc, setDoc } from 'firebase/firestore'
import { arrayUnion } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { computeFeelScore } from '../data/storage'
import { JOURNAL_FACTORS } from '../data/journalFactors'
import styles from './Admin.module.css'

const ADMIN_EMAIL = 'chauhan.viren08@gmail.com'

const PATH_NAMES = {
  rehab: 'The Rehab Path',
  beginner: 'The Beginner Path',
  performance: 'The Performance Path',
}

const SCORE_COLOR = v =>
  v >= 8 ? '#8b9e7e' : v >= 6 ? '#a0b870' : v >= 4 ? '#d9b38a' : '#d98a8a'

export default function Admin() {
  const { user, signInWithGoogle, signOut, authError } = useAuth()
  const { guestName, setGuestName, profile, entries, clearAllData, adminRemarks } = useData()

  const [adminMode,    setAdminMode]    = useState(false)
  const [allEntries,   setAllEntries]   = useState([])
  const [allUserData,  setAllUserData]  = useState({})
  const [indexError,   setIndexError]   = useState(false)
  const [nameInput,    setNameInput]    = useState('')
  const [namePending,  setNamePending]  = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing,     setClearing]     = useState(false)

  const isAdmin = user?.email === ADMIN_EMAIL

  // Live listener for all users' journal entries (admin only)
  useEffect(() => {
    if (!isAdmin || !db) return
    const unsub = onSnapshot(query(collectionGroup(db, 'journal')), async snapshot => {
      const docs = snapshot.docs
        .map(d => ({ ...d.data(), _uid: d.ref.parent.parent.id }))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      setAllEntries(docs)

      const uids = [...new Set(docs.map(d => d._uid))]
      const pairs = await Promise.all(
        uids.map(uid =>
          Promise.all([
            getDoc(doc(db, 'users', uid, 'config', 'profile')).then(s => s.exists() ? s.data() : null).catch(() => null),
            getDoc(doc(db, 'users', uid, 'config', 'coach')).then(s => s.exists() ? s.data() : null).catch(() => null),
            getDoc(doc(db, 'users', uid, 'config', 'adminRemarks')).then(s => s.exists() ? (s.data().remarks || []) : []).catch(() => []),
          ]).then(([userProfile, coach, remarks]) => [uid, { userProfile, coach, remarks }])
        )
      )
      setAllUserData(Object.fromEntries(pairs))
    }, err => {
      if (err.code === 'failed-precondition') setIndexError(err.message)
    })
    return unsub
  }, [isAdmin])

  if (user === undefined) {
    return <div className={styles.page}><p className={styles.loading}>Loading…</p></div>
  }

  // ── Not signed in ───────────────────────────────────────────────────────────
  if (!user && !guestName) {
    if (namePending) {
      return (
        <div className={styles.page}>
          <header className={styles.header}>
            <p className={styles.label}>Profile</p>
            <h1 className={styles.title}>What's your name?</h1>
            <p className={styles.sub}>Just so we can personalise your journal.</p>
          </header>
          <div className={styles.nameForm}>
            <input
              className={styles.nameInput}
              type="text"
              placeholder="Your first name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) setGuestName(nameInput.trim()) }}
              autoFocus
            />
            <button
              className={styles.primaryBtn}
              onClick={() => { if (nameInput.trim()) setGuestName(nameInput.trim()) }}
              disabled={!nameInput.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.label}>Profile</p>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.sub}>Sync your feel journal across devices.</p>
        </header>
        {authError && <p className={styles.authError}>{authError}</p>}
        <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')}>
          <GoogleIcon /> Continue with Google
        </button>
        <div className={styles.divider}>or</div>
        <button className={styles.guestBtn} onClick={() => setNamePending(true)}>
          Continue as Guest
        </button>
      </div>
    )
  }

  // ── Admin panel mode ────────────────────────────────────────────────────────
  if (isAdmin && adminMode) {
    return (
      <AdminPanel
        allEntries={allEntries}
        allUserData={allUserData}
        indexError={indexError}
        adminUser={user}
        onClose={() => setAdminMode(false)}
        onRemarkSent={(uid, remark) =>
          setAllUserData(prev => ({
            ...prev,
            [uid]: { ...prev[uid], remarks: [...(prev[uid]?.remarks || []), remark] },
          }))
        }
      />
    )
  }

  // ── Profile view (all users incl. admin) ────────────────────────────────────
  const displayName  = user?.displayName || guestName
  const displayEmail = user?.email || 'Guest account'
  const photoURL     = user?.photoURL

  return (
    <div className={styles.page}>

      {isAdmin && (
        <button className={styles.adminModeBtn} onClick={() => setAdminMode(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          Admin Panel
        </button>
      )}

      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          {photoURL
            ? <img src={photoURL} alt="avatar" className={styles.largeAvatar} referrerPolicy="no-referrer" />
            : <div className={styles.avatarPlaceholder}>{displayName?.[0]}</div>
          }
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.email}>{displayEmail}</p>
        </div>
        <div className={styles.journeyStats}>
          <div className={styles.journeyRow}>
            <span className={styles.journeyLabel}>Current Path</span>
            <span className={styles.journeyValue}>{PATH_NAMES[profile?.path] || 'Not set'}</span>
          </div>
          <div className={styles.journeyRow}>
            <span className={styles.journeyLabel}>Commitment</span>
            <span className={styles.journeyValue}>{profile?.commitment || 30} days</span>
          </div>
          <div className={styles.journeyRow}>
            <span className={styles.journeyLabel}>Days Logged</span>
            <span className={styles.journeyValue}>{entries.length}</span>
          </div>
        </div>
      </div>

      {/* Coach remarks visible to the user */}
      {adminRemarks?.length > 0 && (
        <div className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>Coach Remarks</h2>
          <div className={styles.remarksList}>
            {[...adminRemarks].reverse().map(r => (
              <div key={r.id} className={styles.remarkCard}>
                <div className={styles.remarkMeta}>
                  <span className={styles.remarkFrom}>{r.from}</span>
                  <span className={styles.remarkDate}>{r.date}</span>
                </div>
                <p className={styles.remarkText}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>Journey Settings</h2>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Daily Reminders</span>
              <span className={styles.settingDesc}>Stay on track with your movement.</span>
            </div>
            <div className={styles.togglePlaceholder}>Coming Soon</div>
          </div>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Data Sync</span>
              <span className={styles.settingDesc}>
                {user ? 'Cloud syncing is active.' : 'Sign in to enable cloud sync.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.accountActions}>
        {!user && (
          <button className={styles.googleBtn} onClick={() => signInWithGoogle('popup')}>
            <GoogleIcon /> Upgrade to Google Sign-In
          </button>
        )}
        {confirmClear ? (
          <div className={styles.confirmBox}>
            <p className={styles.confirmText}>
              This will permanently delete all your journal entries and profile data. This cannot be undone.
            </p>
            <button
              className={styles.confirmDestructBtn}
              disabled={clearing}
              onClick={async () => {
                setClearing(true)
                await clearAllData()
                setClearing(false)
                setConfirmClear(false)
              }}
            >
              {clearing ? 'Clearing…' : 'Yes, delete everything'}
            </button>
            <button className={styles.confirmCancelBtn} onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        ) : (
          <button className={styles.clearDataBtn} onClick={() => setConfirmClear(true)}>Clear My Data</button>
        )}
        <button className={styles.signOutBtn} onClick={user ? signOut : () => setGuestName(null)}>
          {user ? 'Sign Out' : 'Clear Guest Session'}
        </button>
      </div>

      <p className={styles.version}>Gentle BadAss Framework v1.2.0</p>
    </div>
  )
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({ allEntries, allUserData, indexError, adminUser, onClose, onRemarkSent }) {
  const [selectedUid, setSelectedUid] = useState(null)

  const userMap = useMemo(() => {
    const map = {}
    allEntries.forEach(e => {
      const uid = e._uid
      if (!map[uid]) {
        map[uid] = {
          uid,
          name: e.userName || allUserData[uid]?.userProfile?.displayName || 'Anonymous',
          email: e.userEmail || '',
          entries: [],
        }
      }
      map[uid].entries.push(e)
    })
    // Merge in profile / coach / remarks from allUserData
    Object.entries(allUserData).forEach(([uid, data]) => {
      if (!map[uid]) return
      map[uid].userProfile = data.userProfile
      map[uid].coach       = data.coach
      map[uid].remarks     = data.remarks || []
      // Prefer profile displayName if present
      if (data.userProfile?.displayName) map[uid].name = data.userProfile.displayName
    })
    return map
  }, [allEntries, allUserData])

  const userList = useMemo(() =>
    Object.values(userMap)
      .map(u => ({
        ...u,
        avgScore: u.entries.length
          ? Math.round(u.entries.reduce((s, e) => s + computeFeelScore(e.scores || {}), 0) / u.entries.length * 10) / 10
          : null,
        lastDate: u.entries[0]?.date || null,
      }))
      .sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''))
  , [userMap])

  const selectedUser = selectedUid
    ? userList.find(u => u.uid === selectedUid) || null
    : null

  return (
    <div className={styles.adminPanelPage}>
      {/* Panel header */}
      <div className={styles.adminPanelHeader}>
        <div className={styles.adminPanelHeaderLeft}>
          <button className={styles.backBtn} onClick={onClose}>
            ← Profile
          </button>
          <div>
            <p className={styles.adminPanelLabel}>Admin Control Panel</p>
            <h1 className={styles.adminPanelTitle}>All Users</h1>
          </div>
        </div>
        <div className={styles.adminHeaderStats}>
          <span className={styles.adminStatChip}>{userList.length} users</span>
          <span className={styles.adminStatChip}>{allEntries.length} journal entries</span>
        </div>
      </div>

      {indexError && (
        <div className={styles.indexWarn}>
          Firestore index needed. Check browser console for the setup link.
        </div>
      )}

      <div className={styles.adminLayout}>
        {/* Left: user list */}
        <aside className={styles.userListPanel}>
          {userList.length === 0 && (
            <p className={styles.empty}>No users yet…</p>
          )}
          {userList.map(u => {
            const color = u.avgScore === null ? 'var(--ink-faint)'
              : u.avgScore >= 7 ? '#8b9e7e' : u.avgScore >= 4 ? '#d9b38a' : '#d98a8a'
            return (
              <button
                key={u.uid}
                className={`${styles.userListItem} ${selectedUid === u.uid ? styles.userListItemActive : ''}`}
                onClick={() => setSelectedUid(u.uid)}
              >
                <div className={styles.userListAvatar}>{(u.name || '?')[0].toUpperCase()}</div>
                <div className={styles.userListInfo}>
                  <span className={styles.userListName}>{u.name}</span>
                  <span className={styles.userListEmail}>{u.email}</span>
                  <span className={styles.userListMeta}>
                    {u.entries.length} entries · {u.lastDate || 'no entries'}
                  </span>
                </div>
                <span className={styles.userListScore} style={{ color }}>
                  {u.avgScore !== null ? u.avgScore.toFixed(1) : '—'}
                </span>
              </button>
            )
          })}
        </aside>

        {/* Right: user detail */}
        <main className={styles.userDetailPanel}>
          {!selectedUser ? (
            <div className={styles.noSelection}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.25">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
              </svg>
              <p>Select a user to view their details</p>
            </div>
          ) : (
            <UserDetail
              key={selectedUser.uid}
              user={selectedUser}
              adminUser={adminUser}
              onRemarkSent={remark => onRemarkSent(selectedUser.uid, remark)}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// ── User Detail ───────────────────────────────────────────────────────────────
function UserDetail({ user, adminUser, onRemarkSent }) {
  const [tab,           setTab]           = useState('journal')
  const [remarkText,    setRemarkText]    = useState('')
  const [sending,       setSending]       = useState(false)
  const [remarkError,   setRemarkError]   = useState(null)
  const [expandedEntry, setExpandedEntry] = useState(null)
  const [localRemarks,  setLocalRemarks]  = useState(user.remarks || [])

  const userProfile = user.userProfile
  const coach       = user.coach
  const goal        = coach?.goal
  const checkins    = coach?.checkins || []

  async function sendRemark() {
    if (!remarkText.trim() || sending) return
    setSending(true)
    setRemarkError(null)
    const remark = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      text: remarkText.trim(),
      from: adminUser.displayName || 'Dr. Rajat',
      createdAt: new Date().toISOString(),
    }
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'config', 'adminRemarks'),
        { remarks: arrayUnion(remark) },
        { merge: true }
      )
      setLocalRemarks(prev => [...prev, remark])
      setRemarkText('')
      onRemarkSent(remark)
    } catch (err) {
      setRemarkError('Could not send remark: ' + err.message)
    }
    setSending(false)
  }

  const avgScore = user.avgScore
  const scoreColor = SCORE_COLOR(avgScore || 0)

  return (
    <div className={styles.userDetail}>
      {/* User header */}
      <div className={styles.userDetailHeader}>
        <div className={styles.userDetailAvatarBig}>{(user.name || '?')[0].toUpperCase()}</div>
        <div className={styles.userDetailMeta}>
          <h2 className={styles.userDetailName}>{user.name}</h2>
          <p className={styles.userDetailEmail}>{user.email}</p>
          <div className={styles.userDetailTags}>
            {userProfile?.path && <span className={styles.tag}>{PATH_NAMES[userProfile.path] || userProfile.path}</span>}
            {userProfile?.commitment && <span className={styles.tag}>{userProfile.commitment}-day commitment</span>}
            <span className={styles.tag}>{user.entries.length} entries logged</span>
            {goal && <span className={styles.tagCoach}>Training: {goal.raceGoal}</span>}
          </div>
        </div>
        <div className={styles.userDetailScoreBig}>
          <span className={styles.scoreBigNum} style={{ color: scoreColor }}>
            {avgScore !== null ? avgScore.toFixed(1) : '—'}
          </span>
          <span className={styles.scoreBigLabel}>avg feel</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.detailTabs}>
        {[
          { id: 'journal', label: `Journal (${user.entries.length})` },
          { id: 'coach',   label: goal ? `Coach · ${goal.raceGoal}` : 'Coach' },
          { id: 'remarks', label: `Remarks (${localRemarks.length})` },
        ].map(t => (
          <button
            key={t.id}
            className={`${styles.detailTab} ${tab === t.id ? styles.detailTabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.detailContent}>

        {/* ── Journal Tab ─────────────────────────────────────── */}
        {tab === 'journal' && (
          <div>
            {userProfile?.story && (
              <div className={styles.storyCard}>
                <p className={styles.storyLabel}>Their Story</p>
                <p className={styles.storyText}>{userProfile.story}</p>
              </div>
            )}
            {user.entries.length === 0
              ? <p className={styles.empty}>No journal entries yet.</p>
              : user.entries.map(entry => (
                  <EntryCard
                    key={entry.date}
                    entry={entry}
                    expanded={expandedEntry === entry.date}
                    onToggle={() => setExpandedEntry(p => p === entry.date ? null : entry.date)}
                  />
                ))
            }
          </div>
        )}

        {/* ── Coach Tab ───────────────────────────────────────── */}
        {tab === 'coach' && (
          <div>
            {!goal
              ? <p className={styles.empty}>No training program set up yet.</p>
              : <>
                  <div className={styles.coachGoalCard}>
                    {[
                      ['Goal',         goal.raceGoal],
                      ['Level',        goal.experience],
                      ['Program',      `${goal.weeks} weeks · ${goal.daysPerWeek} days/week`],
                      ['Weekly volume', goal.currentKm],
                      ['Started',      goal.startDate],
                    ].map(([label, val]) => (
                      <div key={label} className={styles.coachGoalRow}>
                        <span className={styles.coachGoalLabel}>{label}</span>
                        <span className={styles.coachGoalValue}>{val || '—'}</span>
                      </div>
                    ))}
                    {goal.overview && (
                      <div className={styles.coachOverview}>
                        <p className={styles.coachGoalLabel}>Overview</p>
                        <p className={styles.coachOverviewText}>{goal.overview}</p>
                      </div>
                    )}
                  </div>

                  <div className={styles.checkinSummaryRow}>
                    <span style={{ color: '#8b9e7e' }}>✓ {checkins.filter(c => c.status === 'done').length} done</span>
                    <span style={{ color: '#d9b38a' }}>↗ {checkins.filter(c => c.status === 'partial').length} partial</span>
                    <span style={{ color: '#d98a8a' }}>✗ {checkins.filter(c => c.status === 'missed').length} missed</span>
                  </div>

                  {checkins.length > 0 && (
                    <div className={styles.runLogFull}>
                      <p className={styles.runLogTitle}>Full Run Log</p>
                      {[...checkins].reverse().map(c => (
                        <div key={c.date} className={styles.runLogRow}>
                          <span className={styles.runLogDate}>{c.date}</span>
                          <span className={styles.runLogStatus}
                            style={{ color: c.status === 'done' ? '#8b9e7e' : c.status === 'partial' ? '#d9b38a' : '#d98a8a' }}>
                            {c.status === 'done' ? '✓' : c.status === 'partial' ? '↗' : '✗'}
                          </span>
                          <span className={styles.runLogNote}>{c.userNote}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
            }
          </div>
        )}

        {/* ── Remarks Tab ─────────────────────────────────────── */}
        {tab === 'remarks' && (
          <div>
            <div className={styles.remarkForm}>
              <p className={styles.remarkFormLabel}>Send a remark to {user.name}</p>
              <textarea
                className={styles.remarkInput}
                placeholder="Write your feedback, encouragement, or advice for this user…"
                value={remarkText}
                onChange={e => setRemarkText(e.target.value)}
                rows={4}
              />
              {remarkError && <p className={styles.errorMsg}>{remarkError}</p>}
              <button
                className={styles.sendRemarkBtn}
                disabled={!remarkText.trim() || sending}
                onClick={sendRemark}
              >
                {sending ? 'Sending…' : 'Send Remark'}
              </button>
            </div>

            {localRemarks.length === 0
              ? <p className={styles.empty}>No remarks sent yet.</p>
              : (
                <div className={styles.remarksHistory}>
                  <p className={styles.remarksHistoryLabel}>Sent remarks</p>
                  {[...localRemarks].reverse().map(r => (
                    <div key={r.id} className={styles.remarkCard}>
                      <div className={styles.remarkMeta}>
                        <span className={styles.remarkFrom}>{r.from}</span>
                        <span className={styles.remarkDate}>{r.date}</span>
                      </div>
                      <p className={styles.remarkText}>{r.text}</p>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ── Entry Card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, expanded, onToggle }) {
  const score = computeFeelScore(entry.scores || {})
  const color = SCORE_COLOR(score)

  return (
    <div className={styles.entryCard} onClick={onToggle}>
      <div className={styles.entryCardTop}>
        <span className={styles.entryCardDate}>{entry.date}</span>
        <div className={styles.entryCardBar}>
          <div className={styles.entryCardBarFill} style={{ width: `${score * 10}%`, background: color }} />
        </div>
        <span className={styles.entryCardScore} style={{ color }}>{score.toFixed(1)}</span>
        <span className={styles.entryCardToggle}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className={styles.entryCardBody}>
          <div className={styles.factorGrid}>
            {JOURNAL_FACTORS.map(f => {
              const val = entry.scores?.[f.id]
              if (val === undefined) return null
              return (
                <div key={f.id} className={styles.factorItem}>
                  <span className={styles.factorIcon}>{f.icon}</span>
                  <div className={styles.factorBarWrap}>
                    <span className={styles.factorName}>{f.label}</span>
                    <div className={styles.factorBar}>
                      <div
                        className={styles.factorBarFill}
                        style={{ width: `${val * 10}%`, background: SCORE_COLOR(val) }}
                      />
                    </div>
                  </div>
                  <span className={styles.factorScore} style={{ color: SCORE_COLOR(val) }}>{val}</span>
                </div>
              )
            })}
          </div>
          {entry.note && (
            <div className={styles.entryNote}>
              <p className={styles.entryNoteLabel}>Reflection</p>
              <p className={styles.entryNoteText}>{entry.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
