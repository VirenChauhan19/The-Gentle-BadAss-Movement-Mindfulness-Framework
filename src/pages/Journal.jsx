import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JOURNAL_FACTORS, CATEGORIES } from '../data/journalFactors'
import { computeFeelScore } from '../data/storage'
import { useData } from '../context/DataContext'
import styles from './Journal.module.css'

const FEEL_EMOJIS = ['😞', '😕', '🙁', '😐', '🙂', '😊', '😃', '😄', '😁', '🤩']

const REFLECTION_PROMPTS = [
  'What my body needed',
  'Something I noticed',
  'A small win today',
]

const CATEGORY_ORDER = ['body', 'mind', 'movement']
const CATEGORY_META = {
  body:     { label: 'Body',     hint: 'How the body feels today.' },
  mind:     { label: 'Mind',     hint: 'Your mental and emotional weather.' },
  movement: { label: 'Movement', hint: 'Today’s relationship to movement.' },
}

function useIsMobile() {
  const get = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(max-width: 767px)').matches
  const [v, setV] = useState(get)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(max-width: 767px)')
    const handler = e => setV(e.matches)
    if (mql.addEventListener) mql.addEventListener('change', handler)
    else mql.addListener(handler)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler)
      else mql.removeListener(handler)
    }
  }, [])
  return v
}

export default function Journal() {
  const { getTodayEntry, saveEntry, coachData, updateCoachGoal, profile, saveProfile } = useData()
  const existing = getTodayEntry()
  const [scores, setScores] = useState(() => pickCurrentFactors(existing?.scores || {}))
  const [scoreNotes, setScoreNotes] = useState(() => pickCurrentFactors(existing?.scoreNotes || {}))
  const [note, setNote] = useState(existing?.note || '')
  const [cycle, setCycle] = useState(() => ({
    lastPeriod: existing?.cycle?.lastPeriod || profile?.lastPeriod || '',
    periodLength: existing?.cycle?.periodLength || profile?.periodLength || '',
    cycleLength: existing?.cycle?.cycleLength || profile?.cycleLength || '',
    menopauseStatus: existing?.cycle?.menopauseStatus || profile?.menopauseStatus || '',
  }))
  const [cycleOpen, setCycleOpen] = useState(() =>
    Boolean(cycle.lastPeriod || cycle.periodLength || cycle.cycleLength || cycle.menopauseStatus)
  )
  const [saved, setSaved] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const feelScore = computeFeelScore(scores)
  const answered = Object.keys(scores).length
  const total = JOURNAL_FACTORS.length
  const allAnswered = answered === total
  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0

  const grouped = useMemo(() => {
    const out = {}
    for (const id of CATEGORY_ORDER) {
      out[id] = JOURNAL_FACTORS.filter(f => f.category === id)
    }
    return out
  }, [])
  const displayOrder = useMemo(
    () => CATEGORY_ORDER.flatMap(c => grouped[c]),
    [grouped]
  )
  const mobileDisplayOrder = JOURNAL_FACTORS

  function handleScore(id, val) {
    setScores(prev => ({ ...prev, [id]: Number(val) }))
    setSaved(false)
    setSubmitError('')
  }

  function handleScoreNote(id, val) {
    setScoreNotes(prev => ({ ...prev, [id]: val }))
    setSaved(false)
  }

  async function handleSave() {
    if (!allAnswered) {
      setSubmitError('Capture every Feel signal before saving.')
      return
    }
    const cycleData = profile?.sex === 'woman' ? cycle : null
    const feelAdjustment = adjustTodayRunningPlan(coachData?.goal, scores, cycleData)
    if (feelAdjustment?.goal) updateCoachGoal(feelAdjustment.goal)
    if (cycleData && saveProfile) saveProfile(cycleData)
    await saveEntry({
      scores,
      scoreNotes,
      note,
      cycle: cycleData,
      runningAdjustment: feelAdjustment?.summary || null,
    })
    setSaved(true)
    setTimeout(() => navigate('/library'), 700)
  }

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const status = statusWord(feelScore, answered)
  const tone = scoreTone(answered ? feelScore : 5)

  const sharedProps = {
    profile, scores, scoreNotes, note, cycle, cycleOpen,
    saved, submitError, feelScore, answered, total, allAnswered,
    status, tone, dateStr, displayOrder, mobileDisplayOrder, grouped, wordCount,
    handleScore, handleScoreNote, setNote, setCycle, setCycleOpen, setSaved,
    handleSave,
  }

  if (isMobile) return <JournalMobile {...sharedProps} />
  return <JournalDesktop {...sharedProps} />
}

/* ─────────────────────────────────────────────────────
   DESKTOP / TABLET: existing categorized layout
   ───────────────────────────────────────────────────── */
function JournalDesktop({
  profile, scores, scoreNotes, note, cycle, cycleOpen,
  saved, submitError, feelScore, answered, total, allAnswered,
  status, tone, dateStr, displayOrder, grouped, wordCount,
  handleScore, handleScoreNote, setNote, setCycle, setCycleOpen, setSaved,
  handleSave,
}) {
  function jumpToCategory(id) {
    const el = document.getElementById(`feel-cat-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-tone={tone}>
        <div className={styles.heroLabel}>
          <span>Feel</span>
          <span className={styles.heroDate}>{dateStr}</span>
        </div>

        <div className={styles.gaugeWrap}>
          <FeelGauge
            factors={displayOrder}
            scores={scores}
            feelScore={answered ? feelScore : 0}
          />
          <div className={styles.gaugeCore}>
            <span className={styles.gaugeNumber}>
              {answered ? feelScore.toFixed(1) : '–'}
            </span>
            <span className={styles.gaugeStatus}>{status}</span>
            <span className={styles.gaugeMeta}>{answered}/{total} captured</span>
          </div>
        </div>

        <p className={styles.heroIntro}>
          {answered === 0
            ? 'Take a breath. Read each prompt, and let your body answer first.'
            : allAnswered
              ? 'You captured all 14. Save when you’re ready.'
              : `Keep going. ${total - answered} signal${total - answered === 1 ? '' : 's'} left.`}
        </p>

        <div className={styles.catNav} role="tablist" aria-label="Feel categories">
          {CATEGORY_ORDER.map(catId => {
            const cat = CATEGORIES[catId]
            const factors = grouped[catId]
            const done = factors.filter(f => scores[f.id] !== undefined).length
            const complete = done === factors.length
            return (
              <button
                key={catId}
                type="button"
                className={styles.catNavBtn}
                style={{ '--cat-color': cat.color }}
                onClick={() => jumpToCategory(catId)}
                aria-label={`${cat.label}: ${done} of ${factors.length} captured`}
                data-complete={complete}
              >
                <span className={styles.catNavRing} aria-hidden="true">
                  <span style={{ '--cat-fill': `${(done / factors.length) * 100}%` }} />
                </span>
                <span className={styles.catNavLabel}>{cat.label}</span>
                <span className={styles.catNavCount}>{done}/{factors.length}</span>
              </button>
            )
          })}
        </div>
      </header>

      {profile?.sex === 'woman' && (
        <CycleSection
          cycle={cycle}
          setCycle={setCycle}
          cycleOpen={cycleOpen}
          setCycleOpen={setCycleOpen}
          setSaved={setSaved}
          variant="desktop"
        />
      )}

      <main className={styles.factors}>
        {CATEGORY_ORDER.map(catId => {
          const cat = CATEGORIES[catId]
          const meta = CATEGORY_META[catId]
          const factors = grouped[catId]
          const done = factors.filter(f => scores[f.id] !== undefined).length
          return (
            <section
              key={catId}
              id={`feel-cat-${catId}`}
              className={styles.catSection}
              style={{ '--cat-color': cat.color }}
              data-complete={done === factors.length}
            >
              <header className={styles.catHeader}>
                <div className={styles.catHeaderText}>
                  <span className={styles.catBadge}>{meta.label}</span>
                  <p className={styles.catHint}>{meta.hint}</p>
                </div>
                <div className={styles.catProgress} aria-hidden="true">
                  <span className={styles.catProgressNum}>
                    {done}<small>/{factors.length}</small>
                  </span>
                  <div className={styles.catProgressBar}>
                    <span style={{ width: `${(done / factors.length) * 100}%` }} />
                  </div>
                </div>
              </header>
              <div className={styles.catGrid}>
                {factors.map(factor => (
                  <FactorCard
                    key={factor.id}
                    factor={factor}
                    index={JOURNAL_FACTORS.findIndex(f => f.id === factor.id) + 1}
                    value={scores[factor.id]}
                    note={scoreNotes[factor.id] || ''}
                    onChange={val => handleScore(factor.id, val)}
                    onNoteChange={val => handleScoreNote(factor.id, val)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </main>

      <ReflectionBlock note={note} setNote={setNote} setSaved={setSaved} wordCount={wordCount} />

      <div className={styles.saveBar} data-tone={tone}>
        <div className={styles.saveScore}>
          <span className={styles.saveScoreNum}>
            {answered ? feelScore.toFixed(1) : '–'}
          </span>
          <div className={styles.saveScoreText}>
            <span className={styles.saveScoreStatus}>{status}</span>
            <span className={styles.saveScoreMeta}>{answered}/{total} captured</span>
          </div>
        </div>
        <button
          className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
          onClick={handleSave}
          disabled={!allAnswered}
        >
          {saved
            ? '✓ Saved'
            : allAnswered
              ? 'Save & open Move'
              : `${total - answered} more`}
        </button>
        {submitError && <p className={styles.saveError}>{submitError}</p>}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   MOBILE: card-stack flow
   ───────────────────────────────────────────────────── */
function JournalMobile(props) {
  const {
    profile, scores, scoreNotes, note, cycle, cycleOpen,
    saved, submitError, feelScore, answered, total, allAnswered,
    status, tone, dateStr, mobileDisplayOrder, wordCount,
    handleScore, handleScoreNote, setNote, setCycle, setCycleOpen, setSaved,
    handleSave,
  } = props

  const displayOrder = mobileDisplayOrder
  const initialUnanswered = displayOrder.findIndex(f => scores[f.id] === undefined)
  const [step, setStep] = useState(() => (allAnswered ? 'reflection' : 'factors'))
  const [activeIdx, setActiveIdx] = useState(() => (initialUnanswered >= 0 ? initialUnanswered : 0))
  const [direction, setDirection] = useState('forward')

  const activeFactor = displayOrder[activeIdx]
  const activeValue = scores[activeFactor.id]
  const activeNote = scoreNotes[activeFactor.id] || ''

  function next() {
    setDirection('forward')
    if (activeIdx + 1 >= total) {
      setStep('reflection')
      window.scrollTo({ top: 0 })
    } else {
      setActiveIdx(i => i + 1)
    }
  }

  function prev() {
    setDirection('backward')
    if (activeIdx > 0) setActiveIdx(i => i - 1)
  }

  function jumpTo(idx) {
    setDirection(idx > activeIdx ? 'forward' : 'backward')
    setStep('factors')
    setActiveIdx(idx)
  }

  if (step === 'reflection') {
    return (
      <MobileReflectionScreen
        profile={profile}
        scores={scores}
        scoreNotes={scoreNotes}
        note={note}
        cycle={cycle}
        cycleOpen={cycleOpen}
        saved={saved}
        submitError={submitError}
        feelScore={feelScore}
        answered={answered}
        total={total}
        allAnswered={allAnswered}
        status={status}
        tone={tone}
        dateStr={dateStr}
        displayOrder={displayOrder}
        wordCount={wordCount}
        setNote={setNote}
        setCycle={setCycle}
        setCycleOpen={setCycleOpen}
        setSaved={setSaved}
        handleSave={handleSave}
        onBackToFactors={() => {
          setDirection('backward')
          setActiveIdx(total - 1)
          setStep('factors')
        }}
      />
    )
  }

  return (
    <div className={styles.mPage}>
      <header className={styles.mHead}>
        <div className={styles.mHeadText}>
          <p className={styles.mHeadKicker}>Feel</p>
          <p className={styles.mHeadDate}>{dateStr}</p>
        </div>
        <div className={styles.mHeadScore} data-tone={tone}>
          <span className={styles.mHeadScoreNum}>{answered ? feelScore.toFixed(1) : '–'}</span>
          <span className={styles.mHeadScoreLabel}>{status}</span>
        </div>
      </header>

      <div className={styles.mDots} role="tablist" aria-label="Feel progress">
        {displayOrder.map((f, i) => {
          const isAnswered = scores[f.id] !== undefined
          const isActive = i === activeIdx
          const cat = CATEGORIES[f.category]
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${styles.mDot} ${isActive ? styles.mDotActive : ''} ${isAnswered ? styles.mDotFilled : ''}`}
              style={{ '--dot-color': isAnswered ? scoreColor(scores[f.id]) : cat.color }}
              onClick={() => jumpTo(i)}
              aria-label={`${f.label}: ${isAnswered ? `scored ${scores[f.id]}` : 'not scored'}`}
            />
          )
        })}
      </div>

      <MobileFactorScreen
        key={activeIdx}
        direction={direction}
        factor={activeFactor}
        index={activeIdx + 1}
        total={total}
        value={activeValue}
        note={activeNote}
        onChange={v => handleScore(activeFactor.id, v)}
        onNoteChange={v => handleScoreNote(activeFactor.id, v)}
        onSwipeNext={() => { if (activeValue !== undefined) next() }}
        onSwipePrev={() => { if (activeIdx > 0) prev() }}
      />

      <footer className={styles.mFlowFoot}>
        <button
          type="button"
          className={styles.mFlowNav}
          onClick={prev}
          disabled={activeIdx === 0}
          aria-label="Previous factor"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          className={`${styles.mFlowContinue} ${activeValue !== undefined ? styles.mFlowReady : ''}`}
          onClick={next}
          disabled={activeValue === undefined}
        >
          {activeIdx + 1 >= total ? 'To reflection' : 'Continue'}
          <span aria-hidden="true" className={styles.mFlowArrow}>→</span>
        </button>
      </footer>
    </div>
  )
}

function MobileFactorScreen({
  direction, factor, index, total, value, note,
  onChange, onNoteChange, onSwipeNext, onSwipePrev,
}) {
  const hasValue = value !== undefined
  const cat = CATEGORIES[factor.category]
  const tone = scoreTone(hasValue ? value : 5)
  const needsWhy = hasValue && (value <= 2 || value >= 9)
  const swipeRef = useRef(null)

  function pickScore(n) {
    if (navigator.vibrate) navigator.vibrate(8)
    onChange(n)
  }

  function handleTouchStart(e) {
    if (e.target.closest('button, input, textarea')) {
      swipeRef.current = null
      return
    }
    swipeRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      t: Date.now(),
    }
  }

  function handleTouchEnd(e) {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const dt = Date.now() - start.t
    if (dt > 600 || Math.abs(dy) > 60 || Math.abs(dx) < 80) return
    if (dx < 0) onSwipeNext()
    else onSwipePrev()
  }

  return (
    <article
      className={styles.mCard}
      data-tone={tone}
      data-answered={hasValue}
      data-direction={direction}
      style={{ '--factor-color': hasValue ? scoreColor(value) : cat.color }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-swipe-lock
    >
      <div className={styles.mCardKicker}>
        <span className={styles.mCardCat} style={{ color: cat.color }}>
          {cat.label}
        </span>
        <span className={styles.mCardIdx}>
          {String(index).padStart(2, '0')}<small> / {String(total).padStart(2, '0')}</small>
        </span>
      </div>

      <div className={styles.mEmojiOrb} data-tone={tone}>
        <span className={styles.mEmojiGlyph} aria-hidden="true">
          {hasValue ? FEEL_EMOJIS[value - 1] : '·'}
        </span>
        {hasValue && <span className={styles.mEmojiBadge}>{value}</span>}
      </div>

      <h2 className={styles.mFactorName}>{factor.label}</h2>
      <p className={styles.mFactorQ}>{factor.question}</p>

      <div className={styles.mScoreGrid} role="group" aria-label="Score 1 to 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            className={`${styles.mScoreBtn} ${value === n ? styles.mScoreBtnActive : ''}`}
            style={{ '--btn-color': scoreColor(n) }}
            onClick={() => pickScore(n)}
            aria-label={`Score ${n} of 10`}
          >
            <span className={styles.mScoreEmoji} aria-hidden="true">{FEEL_EMOJIS[n - 1]}</span>
            <span className={styles.mScoreNum}>{n}</span>
          </button>
        ))}
      </div>

      <div className={styles.mScoreLabels}>
        <span>Care</span>
        <span>Steady</span>
        <span>Ready</span>
      </div>

      {needsWhy && (
        <label className={styles.mWhyPrompt}>
          <span>{value <= 2 ? 'Low signal — what’s the why?' : 'High signal — what’s lifting it?'}</span>
          <input
            type="text"
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="One line is enough."
          />
        </label>
      )}
    </article>
  )
}

function MobileReflectionScreen({
  profile, scores, scoreNotes, note, cycle, cycleOpen,
  saved, submitError, feelScore, answered, total, allAnswered,
  status, tone, dateStr, displayOrder, wordCount,
  setNote, setCycle, setCycleOpen, setSaved,
  handleSave, onBackToFactors,
}) {
  return (
    <div className={styles.mReflectPage}>
      <header className={styles.mHead}>
        <button
          type="button"
          className={styles.mFlowNav}
          onClick={onBackToFactors}
          aria-label="Back to factors"
          style={{ marginRight: 4 }}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className={styles.mHeadText}>
          <p className={styles.mHeadKicker}>Reflection</p>
          <p className={styles.mHeadDate}>{dateStr}</p>
        </div>
        <div className={styles.mHeadScore} data-tone={tone}>
          <span className={styles.mHeadScoreNum}>{feelScore.toFixed(1)}</span>
          <span className={styles.mHeadScoreLabel}>{status}</span>
        </div>
      </header>

      <section className={styles.mReflectGauge}>
        <div className={styles.mGaugeMini}>
          <FeelGauge factors={displayOrder} scores={scores} feelScore={feelScore} />
          <div className={styles.mGaugeMiniCore}>
            <span>{feelScore.toFixed(1)}</span>
          </div>
        </div>
        <div className={styles.mReflectStatus}>
          <h2>{status}</h2>
          <p>{answered}/{total} captured</p>
        </div>
      </section>

      {profile?.sex === 'woman' && (
        <CycleSection
          cycle={cycle}
          setCycle={setCycle}
          cycleOpen={cycleOpen}
          setCycleOpen={setCycleOpen}
          setSaved={setSaved}
          variant="mobile"
        />
      )}

      <ReflectionBlock note={note} setNote={setNote} setSaved={setSaved} wordCount={wordCount} />

      <div className={styles.mReflectSave}>
        {submitError && <p className={styles.saveError}>{submitError}</p>}
        <button
          className={`${styles.saveBtn} ${styles.mReflectSaveBtn} ${saved ? styles.saved : ''}`}
          onClick={handleSave}
          disabled={!allAnswered}
        >
          {saved ? '✓ Saved' : allAnswered ? 'Save & open Move' : `${total - answered} factors left`}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Shared blocks
   ───────────────────────────────────────────────────── */
function CycleSection({ cycle, setCycle, cycleOpen, setCycleOpen, setSaved }) {
  return (
    <section className={styles.cycleCard}>
      <button
        type="button"
        className={styles.cycleToggle}
        aria-expanded={cycleOpen}
        onClick={() => setCycleOpen(o => !o)}
      >
        <span className={styles.cycleKicker}>Cycle context</span>
        <span className={styles.cycleTitle}>
          {cycleOpen ? 'Hide' : 'Add'} period &amp; cycle info
          <span className={styles.cycleOptional}>optional</span>
        </span>
        <span className={styles.cycleChev} data-open={cycleOpen} aria-hidden="true">›</span>
      </button>
      {cycleOpen && (
        <div className={styles.cycleBody}>
          <p className={styles.cycleHelp}>
            Your running and strength work use this with today’s Feel score.
          </p>
          <div className={styles.cycleGrid}>
            <label>
              <span>Last period</span>
              <input
                type="date"
                value={cycle.lastPeriod}
                onChange={e => { setCycle({ ...cycle, lastPeriod: e.target.value }); setSaved(false) }}
              />
            </label>
            <label>
              <span>Period length (days)</span>
              <input
                type="number" min="1" max="14"
                value={cycle.periodLength}
                onChange={e => { setCycle({ ...cycle, periodLength: e.target.value }); setSaved(false) }}
                placeholder="e.g. 5"
              />
            </label>
            <label>
              <span>Cycle length (days)</span>
              <input
                type="number" min="15" max="90"
                value={cycle.cycleLength}
                onChange={e => { setCycle({ ...cycle, cycleLength: e.target.value }); setSaved(false) }}
                placeholder="e.g. 28"
              />
            </label>
            <label>
              <span>Perimenopause / menopause</span>
              <select
                value={cycle.menopauseStatus}
                onChange={e => { setCycle({ ...cycle, menopauseStatus: e.target.value }); setSaved(false) }}
              >
                <option value="">Select one</option>
                <option value="no">No</option>
                <option value="perimenopause">Perimenopause</option>
                <option value="menopause">Menopause</option>
                <option value="unsure">Not sure</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </section>
  )
}

function ReflectionBlock({ note, setNote, setSaved, wordCount }) {
  return (
    <section className={styles.reflection} aria-labelledby="reflection-heading">
      <header className={styles.reflectionHead}>
        <p className={styles.reflectionKicker}>Today’s reflection</p>
        <h2 id="reflection-heading" className={styles.reflectionTitle}>
          A page for whatever wants out.
        </h2>
        <p className={styles.reflectionTagline}>
          <span>Optional.</span> One line or fifty — patterns surface over time.
        </p>
      </header>

      {!note.trim() && (
        <div className={styles.promptChips} aria-label="Reflection starters">
          {REFLECTION_PROMPTS.map(prompt => (
            <button
              key={prompt}
              type="button"
              className={styles.promptChip}
              onClick={() => {
                setNote(`${prompt}\n\n`)
                setSaved(false)
                requestAnimationFrame(() => {
                  const el = document.getElementById('daily-note')
                  if (el) {
                    el.focus()
                    el.setSelectionRange(el.value.length, el.value.length)
                  }
                })
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className={styles.notebook}>
        <span className={styles.notebookStamp} aria-hidden="true">
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
        <textarea
          id="daily-note"
          className={styles.reflectionField}
          placeholder="Let your hand wander…"
          value={note}
          onChange={e => { setNote(e.target.value); setSaved(false) }}
          rows={6}
        />
        <footer className={styles.notebookFoot}>
          <span className={styles.reflectionHint}>No pressure. Skip if today is busy.</span>
          {wordCount > 0 && (
            <span className={styles.reflectionCount}>
              {wordCount} word{wordCount === 1 ? '' : 's'}
            </span>
          )}
        </footer>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────
   Gauge & desktop FactorCard (unchanged)
   ───────────────────────────────────────────────────── */
function FeelGauge({ factors, scores, feelScore }) {
  const radius = 92
  const circumference = 2 * Math.PI * radius
  const fillLength = (Math.max(0, Math.min(10, feelScore)) / 10) * circumference
  const strokeColor = scoreColor(feelScore || 5)

  return (
    <svg viewBox="0 0 240 240" className={styles.gaugeSvg} aria-hidden="true">
      <defs>
        <radialGradient id="gauge-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
          <stop offset="62%" stopColor={strokeColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="120" cy="120" r="104" fill="url(#gauge-glow)" />

      <circle
        cx="120" cy="120" r={radius}
        fill="none"
        stroke="var(--border-light)"
        strokeWidth="2"
      />

      <circle
        cx="120" cy="120" r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${fillLength} ${circumference}`}
        transform="rotate(-90 120 120)"
        style={{
          opacity: feelScore > 0 ? 1 : 0,
          transition: 'stroke-dasharray 600ms cubic-bezier(0.22, 0.61, 0.36, 1), stroke 280ms ease, opacity 280ms ease',
          filter: `drop-shadow(0 0 12px ${strokeColor}55)`,
        }}
      />

      {factors.map((f, i) => {
        const angle = (i / factors.length) * Math.PI * 2 - Math.PI / 2
        const dotR = 110
        const x = 120 + Math.cos(angle) * dotR
        const y = 120 + Math.sin(angle) * dotR
        const v = scores[f.id]
        const isAnswered = v !== undefined
        const color = isAnswered ? scoreColor(v) : CATEGORIES[f.category].color
        return (
          <circle
            key={f.id}
            cx={x} cy={y}
            r={isAnswered ? 5 : 2.6}
            fill={color}
            opacity={isAnswered ? 1 : 0.36}
            style={{ transition: 'r 220ms cubic-bezier(0.34, 1.56, 0.64, 1), fill 240ms ease, opacity 240ms ease' }}
          />
        )
      })}
    </svg>
  )
}

function FactorCard({ factor, index, value, note, onChange, onNoteChange }) {
  const hasValue = value !== undefined
  const currentValue = hasValue ? value : 5
  const needsWhy = hasValue && (value <= 2 || value >= 9)
  const cat = CATEGORIES[factor.category]
  const status =
    !hasValue ? 'Tap to score' :
    value <= 3 ? 'Needs care' :
    value <= 6 ? 'Steady' :
    value <= 8 ? 'Good' :
    'Strong'
  const tone = scoreTone(currentValue)

  function commitScore(next) {
    const clamped = Math.max(1, Math.min(10, Number(next)))
    if (navigator.vibrate && window.innerWidth <= 767 && clamped !== value) navigator.vibrate(7)
    onChange(clamped)
  }

  function setFromPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    commitScore(1 + Math.round(pct * 9))
  }

  function onMeterKey(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      commitScore(currentValue + 1)
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      commitScore(currentValue - 1)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      commitScore(1)
    }
    if (event.key === 'End') {
      event.preventDefault()
      commitScore(10)
    }
  }

  return (
    <article
      className={styles.factor}
      data-answered={hasValue}
      style={{
        '--factor-color': hasValue ? scoreColor(currentValue) : cat.color,
        '--factor-fill': `${((currentValue - 1) / 9) * 100}%`,
        '--bloom-scale': 0.78 + currentValue * 0.04,
      }}
      data-swipe-lock
    >
      <header className={styles.factorHead}>
        <span className={styles.factorIndex}>{String(index).padStart(2, '0')}</span>
        <div className={styles.factorTitle}>
          <h3>{factor.label}</h3>
          <p>{factor.question}</p>
        </div>
      </header>

      <div className={styles.bloomTop}>
        <button
          type="button"
          className={styles.nudgeBtn}
          onClick={() => commitScore(currentValue - 1)}
          disabled={currentValue <= 1}
          aria-label={`Decrease ${factor.label}`}
        >
          <span aria-hidden="true">−</span>
        </button>
        <div className={styles.bloomOrb} data-tone={tone}>
          <span className={styles.bloomEmoji} aria-hidden="true">
            {hasValue ? FEEL_EMOJIS[currentValue - 1] : '·'}
          </span>
          <small>{hasValue ? `${currentValue} · ${status}` : status}</small>
        </div>
        <button
          type="button"
          className={styles.nudgeBtn}
          onClick={() => commitScore(currentValue + 1)}
          disabled={currentValue >= 10}
          aria-label={`Increase ${factor.label}`}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>

      <div
        className={styles.touchMeter}
        role="slider"
        tabIndex={0}
        aria-label={`${factor.label} score`}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={hasValue ? value : currentValue}
        onPointerDown={event => {
          event.currentTarget.setPointerCapture?.(event.pointerId)
          setFromPointer(event)
        }}
        onPointerMove={event => {
          if (event.buttons === 1) setFromPointer(event)
        }}
        onKeyDown={onMeterKey}
      >
        <div className={styles.touchFill} aria-hidden="true" />
        {Array.from({ length: 10 }, (_, i) => i + 1).map(score => (
          <button
            key={score}
            type="button"
            className={`${styles.touchDot} ${hasValue && value === score ? styles.touchDotActive : ''} ${score <= currentValue ? styles.touchDotFilled : ''}`}
            onClick={event => {
              event.stopPropagation()
              commitScore(score)
            }}
            aria-label={`${factor.label} score ${score}`}
          >
            <span aria-hidden="true">{score}</span>
          </button>
        ))}
      </div>

      <div className={styles.feelWords}>
        <span>Care</span>
        <span>Steady</span>
        <span>Ready</span>
      </div>

      {needsWhy && (
        <label className={styles.whyPrompt}>
          <span>{value <= 2 ? 'Low signal — what is the why?' : 'High signal — what is the why?'}</span>
          <input
            type="text"
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Add the context in one line."
          />
        </label>
      )}
    </article>
  )
}

/* ─────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────── */
function statusWord(score, answered) {
  if (!answered) return 'Awaiting'
  if (score < 3.5) return 'Tender'
  if (score < 5.5) return 'Steady'
  if (score < 7) return 'Open'
  if (score < 8.5) return 'Strong'
  return 'Radiant'
}

function scoreColor(value) {
  if (value <= 3) return '#ba5f45'
  if (value <= 6) return '#c38b3f'
  if (value <= 8) return '#637f5f'
  return '#42697d'
}

function scoreTone(value) {
  if (value <= 3) return 'care'
  if (value <= 6) return 'steady'
  if (value <= 8) return 'ready'
  return 'strong'
}

function pickCurrentFactors(values) {
  const allowed = new Set(JOURNAL_FACTORS.map(f => f.id))
  return Object.fromEntries(Object.entries(values).filter(([id]) => allowed.has(id)))
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function addDaysISO(startDate, offset) {
  const d = new Date(`${startDate}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function fullPlan(goal) {
  if (!goal) return []
  const startDate = goal.startDate || todayISO()
  const totalDays = goal.commitmentDays || ((goal.weeks || 4) * 7)
  const stored = Array.isArray(goal.plan) ? goal.plan : []
  const template = goal.weekTemplate || []
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  return Array.from({ length: totalDays }, (_, i) => {
    const date = addDaysISO(startDate, i)
    if (stored[i]) return {
      ...stored[i],
      id: stored[i].id || `day-${i + 1}`,
      dayNumber: stored[i].dayNumber || i + 1,
      week: stored[i].week || Math.floor(i / 7) + 1,
      date: stored[i].date || date,
      day: stored[i].day || days[new Date(`${date}T00:00:00`).getDay()],
    }
    const day = days[new Date(`${date}T00:00:00`).getDay()]
    const session = template.find(s => s.day === day) || template[i % template.length] || {}
    return {
      ...session,
      id: `day-${i + 1}`,
      dayNumber: i + 1,
      week: Math.floor(i / 7) + 1,
      date,
      day,
      type: session.type || 'rest',
      title: session.title || 'Rest / Recovery',
      distance: session.distance || '',
      duration: session.duration || '10-20 min optional walk',
      pace: session.pace || 'Very easy',
      notes: session.notes || 'Full rest or an easy walk. Keep effort low and prepare for the next planned session.',
    }
  })
}

function adjustTodayRunningPlan(goal, scores, cycleData = null) {
  if (!goal) return null
  const date = todayISO()
  const plan = fullPlan(goal)
  const index = plan.findIndex(day => day.date === date)
  if (index < 0) return null

  const base = plan[index].feelAdjustment?.original || plan[index]
  const feelScore = computeFeelScore(scores)
  const reasons = []
  if (scores.sleep <= 4) reasons.push('low sleep')
  if (scores.energy <= 4) reasons.push('low energy')
  if (scores.movementJoy <= 4) reasons.push('low walk/run joy')
  if (scores.strengthJoy <= 4) reasons.push('low strength joy')
  if (scores.jointFluidity <= 4) reasons.push('joint stiffness')
  if (scores.digestiveComfort <= 4) reasons.push('digestive discomfort')
  if (scores.personalStress <= 4) reasons.push('high personal stress')
  if (scores.professionalStress <= 4) reasons.push('high professional stress')
  const cycleSignal = getCycleTrainingSignal(cycleData)
  if (cycleSignal) reasons.push(cycleSignal.reason)

  const highIntensityLocked = feelScore < 7
  const severe = feelScore <= 3.8 || [
    scores.sleep,
    scores.energy,
    scores.movementJoy,
    scores.strengthJoy,
    scores.jointFluidity,
    scores.digestiveComfort,
  ].some(v => v <= 2)
  const moderate = severe ? false : (feelScore < 6.2 || reasons.length > 0 || (highIntensityLocked && ['hard', 'long', 'moderate'].includes(base.type)))

  let adjusted = base
  let level = 'normal'
  if (severe) {
    level = 'recovery'
    adjusted = {
      ...base,
      type: 'rest',
      title: 'Recovery Reset - Feel adjusted',
      distance: '',
      duration: '20-30 min optional walk + mobility',
      pace: 'Very easy. Keep effort at 2-3/10.',
      notes: `Feel check flagged ${reasons.join(', ') || 'low readiness'}. Replace today's workout with easy walking, gentle mobility, and recovery breathing. Resume training when tomorrow's Feel score improves.`,
    }
  } else if (moderate) {
    level = 'deload'
    adjusted = {
      ...base,
      type: base.type === 'rest' ? 'rest' : 'easy',
      title: `${base.type === 'rest' ? 'Recovery Day' : 'Reduced Easy Session'} - Feel adjusted`,
      distance: base.type === 'rest' ? '' : 'Reduce planned volume by 30-50%',
      duration: base.type === 'rest' ? (base.duration || '10-20 min optional walk') : '20-35 min',
      pace: 'Conversational only. Stop if symptoms rise.',
      strength: 'No high-intensity strength today. Keep 8-12 min easy activation only: glute bridges, dead bug, calf raises, side plank.',
      notes: `Feel check flagged ${reasons.join(', ') || 'moderate readiness'}. Keep this below workout effort today. No intervals, no long run pressure, no chasing pace.`,
    }
  } else if (highIntensityLocked && ['hard', 'long', 'moderate'].includes(base.type)) {
    level = 'intensity-lock'
    adjusted = {
      ...base,
      type: 'easy',
      title: 'Easy Aerobic - Feel adjusted',
      distance: 'Reduce planned volume by 20-40%',
      duration: '25-40 min',
      pace: 'Conversational only. No high intensity until Feel is 7/10 or higher.',
      strength: 'No high-intensity strength today. Use easy activation and mobility only.',
      notes: `Feel is ${feelScore.toFixed(1)}/10. Replace high-intensity running or strength with easy aerobic work until Feel crosses 7/10.`,
    }
  } else if (plan[index].feelAdjustment?.original) {
    adjusted = base
  } else {
    return null
  }

  const nextPlan = plan.map((day, i) => i === index
    ? {
        ...adjusted,
        feelAdjustment: level === 'normal' ? null : {
          date,
          level,
          feelScore: Math.round(feelScore * 10) / 10,
          reasons,
          adjustedAt: new Date().toISOString(),
          original: base,
        },
      }
    : day
  )

  return {
    goal: { ...goal, plan: nextPlan, lastFeelAdjustmentAt: new Date().toISOString() },
    summary: level === 'normal'
      ? 'Today returned to the original running plan.'
      : `Today adjusted to ${level} because of ${reasons.join(', ') || 'low readiness'}.`,
  }
}

function getCycleTrainingSignal(cycleData) {
  if (!cycleData) return null
  const status = cycleData.menopauseStatus
  if (status === 'perimenopause') return { reason: 'perimenopause context' }
  if (status === 'menopause') return { reason: 'menopause context' }

  const lastPeriod = cycleData.lastPeriod
  const periodLength = Number(cycleData.periodLength) || 0
  const cycleLength = Number(cycleData.cycleLength) || 0
  if (!lastPeriod) return null

  const start = new Date(`${lastPeriod}T00:00:00`)
  if (Number.isNaN(start.getTime())) return null
  const today = new Date(`${todayISO()}T00:00:00`)
  const day = Math.floor((today - start) / 86400000) + 1
  if (day >= 1 && periodLength && day <= periodLength) return { reason: 'period phase' }
  if (cycleLength && day >= cycleLength - 3 && day <= cycleLength + 1) return { reason: 'late-cycle / expected period window' }
  return null
}
