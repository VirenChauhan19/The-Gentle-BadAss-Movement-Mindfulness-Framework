import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { buildAdaptationContext } from '../data/trainingAdaptation'
import styles from './Onboarding.module.css'

// Submission timing. Saves that resolve faster than this never paint a loading
// state — the runner lands straight on the dashboard. Slower (network/DB) saves
// reveal the Mentor transition, held for a minimum so phrases never flash.
const REVEAL_AFTER_MS = 500
const MIN_TRANSITION_MS = 1400

// Mentor-voiced phrases. No "AI", "Processing", "Calculating", or "Generating".
const TRANSITION_PHRASES = [
  'Reading the baseline of your Chariot...',
  'Structuring your 13-week biological framework...',
  'Aligning your breath and movement map...',
]

function MentorTransition() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(
      () => setIndex(i => (i + 1) % TRANSITION_PHRASES.length),
      600,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.transition} role="status" aria-live="polite">
      <div className={styles.transitionGlow} aria-hidden="true" />
      <p key={index} className={styles.transitionLine}>
        {TRANSITION_PHRASES[index]}
      </p>
    </div>
  )
}

const paths = [
  {
    id: 'rehab',
    icon: 'R',
    title: 'The Rehab Path',
    desc: 'Movement quality and pain-free assessments. Gentle, intentional, restorative.',
  },
  {
    id: 'beginner',
    icon: 'B',
    title: 'The Beginner Path',
    desc: 'Gradual Walk-Run intervals with a focus on soft landings and cadence.',
  },
  {
    id: 'performance',
    icon: 'P',
    title: 'The Performance Path',
    desc: 'Distance scaling from 5 km to marathon, optimising the hip engine.',
  },
]

const PLANS = {
  30:  { label: '30-Day Reset',          desc: 'A focused month to reset your movement habits.',         price: 499  },
  60:  { label: '60-Day Foundation',     desc: 'Build a real movement foundation.',                      price: 799  },
  90:  { label: '90-Day Transformation', desc: 'Three months of consistent progress.',                   price: 1199 },
  120: { label: '120-Day Deep Dive',     desc: 'A full season of intentional movement.',                 price: 1499 },
  150: { label: '150-Day Journey',       desc: 'Half a year of building strength.',                      price: 1699 },
  180: { label: '180-Day Commitment',    desc: 'Six months of dedicated practice.',                      price: 1999 },
  210: { label: '210-Day Challenge',     desc: 'A serious commitment to change.',                        price: 2299 },
  240: { label: '240-Day Quest',         desc: 'Eight months of sustained effort.',                      price: 2499 },
  270: { label: '270-Day La Ultra',      desc: 'The full La Ultra journey - the ultimate commitment.',   price: 2999 },
}

const HEARD_ABOUT = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'YouTube',
  "Rajat's Patient",
  'Friend referral',
]

const JOINT_PAINS = [
  'Lower Back Pain',
  'Knee Pain',
  'Ankle Pain',
  'Plantar Fascia Issues',
  'None',
]

const CONDITIONS = [
  'Hypertension',
  'Diabetes',
  'Asthma',
  'PCOS / PCOD',
  'None',
]

const DAILY_MOVEMENT = [
  { value: 'sedentary', label: 'Under 5,000 steps / Sedentary' },
  { value: 'moderate',  label: '5,000 - 10,000 steps / Moderately Active' },
  { value: 'active',    label: '10,000+ steps / Active' },
]

const RUNNING_HISTORY = [
  { value: 'never',       label: 'Never' },
  { value: 'recent-gap',  label: 'Yes, but not in the last 6 months' },
  { value: 'active',      label: 'Yes, active within the last 3 months' },
]

const STRENGTH_FREQUENCY = [
  { value: '0',    label: '0 days/week' },
  { value: '1-2',  label: '1-2 days/week' },
  { value: '3+',   label: '3+ days/week' },
]

const TOTAL_STEPS = 5
const STEP_TITLES = {
  1: 'Your Sign Up Details',
  2: 'Your Body',
  3: 'Your History',
  4: 'Choose Your Path',
  5: 'Your Commitment',
}
const STEP_SUBTITLES = {
  1: 'Tell us who you are and what you are committing to.',
  2: 'Biometrics and biological rhythms help us scale loads safely.',
  3: 'A clear picture of past wear lets us protect your structure.',
  4: 'Pick the focus that fits your current state.',
  5: 'Slide to choose your journey length.',
}

const MENOPAUSE_NEW_TO_LEGACY = {
  regular: 'no',
  perimenopause: 'perimenopause',
  postmenopause: 'menopause',
}
const MENOPAUSE_LEGACY_TO_NEW = {
  no: 'regular',
  perimenopause: 'perimenopause',
  menopause: 'postmenopause',
}

// Map any earlier gender vocabulary to the three options we now expose so a
// returning user lands on a matching <option> instead of an empty select.
function normalizeGender(value) {
  if (!value) return ''
  const v = String(value).toLowerCase()
  if (v === 'woman' || v === 'female') return 'female'
  if (v === 'man' || v === 'male') return 'male'
  if (v === 'prefer-not' || v === 'prefer not to say' || v === 'prefer not') return 'prefer-not'
  return ''
}

function toggleInList(list, value) {
  const set = new Set(list || [])
  if (value === 'None') return set.has('None') ? [] : ['None']
  set.delete('None')
  if (set.has(value)) set.delete(value)
  else set.add(value)
  return Array.from(set)
}

export default function Onboarding() {
  const { saveProfile, profile } = useData()
  const navigate = useNavigate()
  const submittingRef = useRef(false)
  const [transitioning, setTransitioning] = useState(false)
  const [step, setStep] = useState(() => (profile?.onboardingComplete && !profile?.sex ? 2 : 1))
  const [data, setData] = useState({
    name: profile?.name || '',
    age: profile?.age || '',
    ageRange: profile?.ageRange || '',
    gender: normalizeGender(profile?.gender || profile?.sex),
    heightCm: profile?.heightCm || '',
    weightKg: profile?.weightKg || '',
    waistCm: profile?.waistCm || '',
    fitnessHistory: profile?.fitnessHistory || '',
    commitmentStatement: profile?.commitmentStatement || '',
    heardAbout: profile?.heardAbout || '',
    programGoal: profile?.programGoal || '',
    sex: profile?.sex || '',
    menopausalStatus:
      profile?.menopausalStatus ||
      MENOPAUSE_LEGACY_TO_NEW[profile?.menopauseStatus] ||
      '',
    cycleLength: profile?.cycleLength || '',
    bleedingDuration: profile?.bleedingDuration || profile?.periodLength || '',
    lastPeriod: profile?.lastPeriod || '',
    nextPeriod: profile?.nextPeriod || '',
    jointPain: Array.isArray(profile?.jointPain) ? profile.jointPain : [],
    conditions: Array.isArray(profile?.conditions) ? profile.conditions : [],
    mentalBaseline: typeof profile?.mentalBaseline === 'number' ? profile.mentalBaseline : 5,
    mentorNote: profile?.mentorNote || '',
    dailyMovement: profile?.dailyMovement || '',
    runningHistory: profile?.runningHistory || '',
    strengthFrequency: profile?.strengthFrequency || '',
    path: profile?.path || '',
    commitment: profile?.commitment || 90,
  })
  const plan = PLANS[data.commitment] || PLANS[90]
  const isFemale = data.gender === 'female'
  const showCycleFields =
    isFemale && (data.menopausalStatus === 'regular' || data.menopausalStatus === 'perimenopause')

  const storyReady =
    data.name.trim() &&
    data.age &&
    data.gender &&
    data.fitnessHistory.trim() &&
    data.commitmentStatement.trim()
  const bodyReady = data.heightCm && data.weightKg && data.waistCm && (!isFemale || data.menopausalStatus)
  const historyReady =
    data.jointPain.length &&
    data.conditions.length &&
    data.dailyMovement &&
    data.runningHistory &&
    data.strengthFrequency

  async function handleComplete() {
    if (submittingRef.current) return
    submittingRef.current = true

    const resolvedSex = data.sex || (isFemale ? 'woman' : data.gender === 'male' ? 'man' : data.gender)
    const payload = {
      ...data,
      sex: resolvedSex,
      // Legacy aliases so existing systems (training adaptation, Coach) keep working.
      menopauseStatus: MENOPAUSE_NEW_TO_LEGACY[data.menopausalStatus] || '',
      periodLength: data.bleedingDuration,
      // Derived flags for the adaptation engine.
      lowerBackPain: data.jointPain.includes('Lower Back Pain'),
      kneePain: data.jointPain.includes('Knee Pain'),
      anklePain: data.jointPain.includes('Ankle Pain'),
      plantarFasciaIssues: data.jointPain.includes('Plantar Fascia Issues'),
      hypertension: data.conditions.includes('Hypertension'),
      diabetes: data.conditions.includes('Diabetes'),
      asthma: data.conditions.includes('Asthma'),
      pcos: data.conditions.includes('PCOS / PCOD'),
      onboardingComplete: true,
    }

    // 1. Invisible processing: derive the full personalisation context
    //    (body-mass loading, cycle calendar, health buffers, mental-stress
    //    buffer) synchronously, the instant the profile is submitted.
    payload.adaptationContext = buildAdaptationContext(payload)

    // 2. Reveal the Mentor transition only if the save sequence is slow enough
    //    to need one. Sub-500ms saves skip the loading state entirely.
    let revealedAt = 0
    const revealTimer = setTimeout(() => {
      revealedAt = performance.now()
      setTransitioning(true)
    }, REVEAL_AFTER_MS)

    try {
      await saveProfile(payload)
    } catch {
      // saveProfile swallows Firestore errors and updates local state first, so
      // the dashboard renders from cache regardless of network outcome.
    } finally {
      clearTimeout(revealTimer)
    }

    // If the transition became visible, hold it briefly so the phrases land
    // cleanly instead of flickering on a save that finished just after 500ms.
    if (revealedAt) {
      const visibleFor = performance.now() - revealedAt
      if (visibleFor < MIN_TRANSITION_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_TRANSITION_MS - visibleFor))
      }
    }

    // 3. Replace history so Back from the dashboard never re-opens onboarding.
    navigate('/', { replace: true })
  }

  function update(patch) {
    setData(prev => ({ ...prev, ...patch }))
  }

  if (transitioning) return <MentorTransition />

  return (
    <div className={styles.page}>
      <div className={styles.progressBar}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
          <div
            key={n}
            className={styles.progressDot + (step >= n ? ' ' + styles.progressDotActive : '')}
          />
        ))}
        <div className={styles.progressLine}>
          <div
            className={styles.progressLineFill}
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      </div>

      <header className={styles.header}>
        <p className={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</p>
        <h1 className={styles.title}>{STEP_TITLES[step]}</h1>
        <p className={styles.subtitle}>{STEP_SUBTITLES[step]}</p>
      </header>

      {step === 1 && (
        <section className={styles.section}>
          <div className={styles.bodyFields}>
            <label>
              <span>Name</span>
              <input
                type="text"
                value={data.name}
                onChange={e => update({ name: e.target.value })}
                placeholder="Your name"
                autoFocus
              />
            </label>
            <label>
              <span>Age</span>
              <input
                type="number"
                min="13"
                max="100"
                value={data.age}
                onChange={e => update({ age: e.target.value })}
                placeholder="Years"
              />
            </label>
            <label>
              <span>Gender</span>
              <select
                value={data.gender}
                onChange={e => {
                  const gender = e.target.value
                  update({ gender, sex: gender === 'female' ? 'woman' : gender === 'male' ? 'man' : gender })
                }}
              >
                <option value="">Select one</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="prefer-not">Prefer Not to Say</option>
              </select>
            </label>
          </div>
          <textarea
            className={styles.textarea}
            value={data.fitnessHistory}
            onChange={e => update({ fitnessHistory: e.target.value })}
            placeholder="Their story: your journey so far, injuries, life events, work, children, menopause context, and anything else we should know."
          />
          <textarea
            className={styles.textareaSmall}
            value={data.commitmentStatement}
            onChange={e => update({ commitmentStatement: e.target.value })}
            placeholder="Self-commitment: write your own mission statement in your own words."
          />
          <div className={styles.bodyFields}>
            <label>
              <span>How did you hear about us?</span>
              <select
                value={data.heardAbout}
                onChange={e => update({ heardAbout: e.target.value })}
              >
                <option value="">Select one</option>
                {HEARD_ABOUT.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>What are you most looking for from this program?</span>
              <input
                type="text"
                value={data.programGoal}
                onChange={e => update({ programGoal: e.target.value })}
                placeholder="e.g. consistency, pain-free running, strength"
              />
            </label>
          </div>
          <p className={styles.hint}>These details help personalise the plan without making the first check-in clinical.</p>
          <div className={styles.btnStack}>
            <button
              className={styles.primaryBtn}
              disabled={!storyReady}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className={styles.section}>
          <div className={styles.subsection}>
            <h2 className={styles.subsectionTitle}>Basic Biometrics</h2>
            <p className={styles.subsectionDesc}>The Chariot needs its dimensions.</p>
            <div className={styles.bodyFields}>
              <label>
                <span>Height (cm)</span>
                <input
                  type="number"
                  min="100"
                  max="230"
                  value={data.heightCm}
                  onChange={e => update({ heightCm: e.target.value })}
                  placeholder="e.g. 168"
                />
              </label>
              <label>
                <span>Current Body Mass (for structural loading calculation)</span>
                <input
                  type="number"
                  min="30"
                  max="250"
                  step="0.1"
                  value={data.weightKg}
                  onChange={e => update({ weightKg: e.target.value })}
                  placeholder="kg"
                />
              </label>
              <label>
                <span>Waist Circumference (vital marker of metabolic health and core baseline)</span>
                <input
                  type="number"
                  min="40"
                  max="200"
                  step="0.1"
                  value={data.waistCm}
                  onChange={e => update({ waistCm: e.target.value })}
                  placeholder="cm (or inches)"
                />
              </label>
            </div>
          </div>

          {isFemale && (
            <div className={styles.subsection}>
              <h2 className={styles.subsectionTitle}>Biological Rhythms & Menstrual Cycle</h2>
              <p className={styles.subsectionDesc}>
                We use this to keep training aligned with your monthly physiology.
              </p>
              <div className={styles.bodyFields}>
                <label>
                  <span>Menopausal Status</span>
                  <select
                    value={data.menopausalStatus}
                    onChange={e => update({ menopausalStatus: e.target.value })}
                  >
                    <option value="">Select one</option>
                    <option value="regular">Regular Cycles</option>
                    <option value="perimenopause">Perimenopausal</option>
                    <option value="postmenopause">Postmenopausal</option>
                  </select>
                </label>

                {showCycleFields && (
                  <>
                    <label>
                      <span>Average Cycle Length (days)</span>
                      <input
                        type="number"
                        min="15"
                        max="90"
                        value={data.cycleLength || 28}
                        onChange={e => update({ cycleLength: e.target.value })}
                        placeholder="28"
                      />
                    </label>
                    <label>
                      <span>Date of the first day of your last period</span>
                      <input
                        type="date"
                        value={data.lastPeriod}
                        onChange={e => update({ lastPeriod: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Average Duration of Bleeding (days)</span>
                      <input
                        type="number"
                        min="1"
                        max="14"
                        value={data.bleedingDuration || 5}
                        onChange={e => update({ bleedingDuration: e.target.value })}
                        placeholder="5"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          <div className={styles.btnStack}>
            <button
              className={styles.primaryBtn}
              disabled={!bodyReady}
              onClick={() => setStep(3)}
            >
              Next
            </button>
            <button className={styles.backLink} onClick={() => setStep(1)}>Back</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={styles.section}>
          <div className={styles.subsection}>
            <h2 className={styles.subsectionTitle}>Locating Structural Leaks</h2>
            <p className={styles.subsectionDesc}>
              Joint or muscle pain you are currently navigating.
            </p>
            <div className={styles.checkboxGrid}>
              {JOINT_PAINS.map(item => (
                <label
                  key={item}
                  className={`${styles.checkboxItem} ${data.jointPain.includes(item) ? styles.checkboxItemActive : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={data.jointPain.includes(item)}
                    onChange={() => update({ jointPain: toggleInList(data.jointPain, item) })}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.subsection}>
            <h2 className={styles.subsectionTitle}>Metabolic / Cardiovascular Conditions</h2>
            <p className={styles.subsectionDesc}>
              Anything we should respect in your breathing and load progression.
            </p>
            <div className={styles.checkboxGrid}>
              {CONDITIONS.map(item => (
                <label
                  key={item}
                  className={`${styles.checkboxItem} ${data.conditions.includes(item) ? styles.checkboxItemActive : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={data.conditions.includes(item)}
                    onChange={() => update({ conditions: toggleInList(data.conditions, item) })}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.subsection}>
            <h2 className={styles.subsectionTitle}>Mental & Emotional Energy Spectrum</h2>
            <p className={styles.subsectionDesc}>
              Where is your overall mental and emotional baseline right now?
            </p>
            <div className={styles.sliderWrap}>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={data.mentalBaseline}
                onChange={e => update({ mentalBaseline: Number(e.target.value) })}
                className={styles.slider}
              />
              <div className={styles.sliderRangeLabels}>
                <span>0 · Exhausted / Overwhelmed</span>
                <span className={styles.sliderValue}>{data.mentalBaseline}</span>
                <span>10 · Grounded / Resilient</span>
              </div>
            </div>
            <textarea
              className={styles.textareaSmall}
              value={data.mentorNote}
              onChange={e => update({ mentorNote: e.target.value })}
              placeholder="Is there anything else you would like your Mentor to know about your mind or body? (Optional)"
            />
          </div>

          <div className={styles.subsection}>
            <h2 className={styles.subsectionTitle}>Movement & Fitness History</h2>
            <p className={styles.subsectionDesc}>
              Where your body is starting from today.
            </p>
            <div className={styles.bodyFields}>
              <label>
                <span>Average daily movement</span>
                <select
                  value={data.dailyMovement}
                  onChange={e => update({ dailyMovement: e.target.value })}
                >
                  <option value="">Select one</option>
                  {DAILY_MOVEMENT.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <fieldset className={styles.radioFieldset}>
                <legend>Have you ever run before?</legend>
                <div className={styles.radioGroup}>
                  {RUNNING_HISTORY.map(opt => (
                    <label
                      key={opt.value}
                      className={`${styles.radioItem} ${data.runningHistory === opt.value ? styles.radioItemActive : ''}`}
                    >
                      <input
                        type="radio"
                        name="runningHistory"
                        value={opt.value}
                        checked={data.runningHistory === opt.value}
                        onChange={() => update({ runningHistory: opt.value })}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label>
                <span>Current resistance training frequency</span>
                <select
                  value={data.strengthFrequency}
                  onChange={e => update({ strengthFrequency: e.target.value })}
                >
                  <option value="">Select one</option>
                  {STRENGTH_FREQUENCY.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className={styles.btnStack}>
            <button
              className={styles.primaryBtn}
              disabled={!historyReady}
              onClick={() => setStep(4)}
            >
              Next
            </button>
            <button className={styles.backLink} onClick={() => setStep(2)}>Back</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className={styles.section}>
          <div className={styles.pathGrid}>
            {paths.map(p => (
              <button
                key={p.id}
                className={styles.pathCard + (data.path === p.id ? ' ' + styles.pathActive : '')}
                onClick={() => update({ path: p.id })}
              >
                <span className={styles.pathIcon}>{p.icon}</span>
                <div className={styles.pathText}>
                  <span className={styles.pathTitle}>{p.title}</span>
                  <span className={styles.pathDesc}>{p.desc}</span>
                </div>
                <span className={styles.pathCheck}>{data.path === p.id ? '✓' : ''}</span>
              </button>
            ))}
          </div>
          <div className={styles.btnStack}>
            <button
              className={styles.primaryBtn}
              disabled={!data.path}
              onClick={() => setStep(5)}
            >
              Next
            </button>
            <button className={styles.backLink} onClick={() => setStep(3)}>Back</button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className={styles.section}>
          <div className={styles.commitmentCard}>
            <div className={styles.commitDays}>{data.commitment}</div>
            <div className={styles.commitUnit}>days</div>
            <div className={styles.commitLabelText}>{plan.label}</div>
          </div>

          <p className={styles.commitDesc}>{plan.desc}</p>

          <div className={styles.sliderWrap}>
            <input
              type="range"
              min="30"
              max="270"
              step="30"
              value={data.commitment}
              onChange={e => update({ commitment: Number(e.target.value) })}
              className={styles.slider}
            />
            <div className={styles.sliderTicks}>
              <span>30d</span>
              <span>90d</span>
              <span>180d</span>
              <span>270d</span>
            </div>
          </div>

          <div className={styles.btnStack}>
            <button className={styles.startBtn} onClick={handleComplete}>
              Start My Journey
            </button>
            <button className={styles.backLink} onClick={() => setStep(4)}>Back</button>
          </div>
        </section>
      )}
    </div>
  )
}
