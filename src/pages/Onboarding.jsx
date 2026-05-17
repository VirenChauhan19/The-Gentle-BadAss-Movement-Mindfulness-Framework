import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import styles from './Onboarding.module.css'

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

const AGE_RANGES = [
  '18-24', '25-29', '30-34', '35-39', '40-44', '45-49',
  '50-54', '55-59', '60-64', '65-69', '70+',
]

const HEARD_ABOUT = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'YouTube',
  "Rajat's Patient",
  'Friend referral',
]

export default function Onboarding() {
  const { saveProfile, profile } = useData()
  const navigate = useNavigate()
  const [step, setStep] = useState(() => (profile?.onboardingComplete && !profile?.sex ? 2 : 1))
  const [data, setData] = useState({
    name: profile?.name || '',
    ageRange: profile?.ageRange || '',
    gender: profile?.gender || profile?.sex || '',
    fitnessHistory: profile?.fitnessHistory || '',
    commitmentStatement: profile?.commitmentStatement || '',
    heardAbout: profile?.heardAbout || '',
    programGoal: profile?.programGoal || '',
    sex: profile?.sex || '',
    lastPeriod: profile?.lastPeriod || '',
    nextPeriod: profile?.nextPeriod || '',
    periodLength: profile?.periodLength || '',
    cycleLength: profile?.cycleLength || '',
    menopauseStatus: profile?.menopauseStatus || '',
    path: profile?.path || '',
    commitment: profile?.commitment || 90,
  })
  const plan = PLANS[data.commitment] || PLANS[90]
  const isWoman = data.sex === 'woman'
  const skipBodyStep = data.gender === 'man'
  const storyReady = data.name.trim() && data.ageRange && data.gender && data.fitnessHistory.trim() && data.commitmentStatement.trim()

  async function handleComplete() {
    await saveProfile({ ...data, sex: data.sex || data.gender, onboardingComplete: true })
    navigate('/')
  }

  return (
    <div className={styles.page}>
      <div className={styles.progressBar}>
        {[1, 2, 3, 4].map(n => (
          <div
            key={n}
            className={styles.progressDot + (step >= n ? ' ' + styles.progressDotActive : '')}
          />
        ))}
        <div className={styles.progressLine}>
          <div className={styles.progressLineFill} style={{ width: `${((step - 1) / 3) * 100}%` }} />
        </div>
      </div>

      <header className={styles.header}>
        <p className={styles.stepLabel}>Step {step} of 4</p>
        <h1 className={styles.title}>
          {step === 1 && 'Your Sign Up Details'}
          {step === 2 && 'Your Body'}
          {step === 3 && 'Choose Your Path'}
          {step === 4 && 'Your Commitment'}
        </h1>
        <p className={styles.subtitle}>
          {step === 1 && 'Tell us who you are and what you are committing to.'}
          {step === 2 && 'This helps us adjust training around monthly physiology.'}
          {step === 3 && 'Pick the focus that fits your current state.'}
          {step === 4 && 'Slide to choose your journey length.'}
        </p>
      </header>

      {step === 1 && (
        <section className={styles.section}>
          <div className={styles.bodyFields}>
            <label>
              <span>Name</span>
              <input
                type="text"
                value={data.name}
                onChange={e => setData({ ...data, name: e.target.value })}
                placeholder="Your name"
                autoFocus
              />
            </label>
            <label>
              <span>Age range</span>
              <select
                value={data.ageRange}
                onChange={e => setData({ ...data, ageRange: e.target.value })}
              >
                <option value="">Select one</option>
                {AGE_RANGES.map(range => <option key={range} value={range}>{range}</option>)}
              </select>
            </label>
            <label>
              <span>Gender</span>
              <select
                value={data.gender}
                onChange={e => {
                  const gender = e.target.value
                  setData({ ...data, gender, sex: gender })
                }}
              >
                <option value="">Select one</option>
                <option value="woman">Woman</option>
                <option value="man">Man</option>
                <option value="non-binary">Non-binary</option>
                <option value="self-described">Prefer to self-describe</option>
                <option value="prefer-not">Prefer not to say</option>
              </select>
            </label>
          </div>
          <textarea
            className={styles.textarea}
            value={data.fitnessHistory}
            onChange={e => setData({ ...data, fitnessHistory: e.target.value })}
            placeholder="Their story: your journey so far, injuries, life events, work, children, menopause context, and anything else we should know."
          />
          <textarea
            className={styles.textareaSmall}
            value={data.commitmentStatement}
            onChange={e => setData({ ...data, commitmentStatement: e.target.value })}
            placeholder="Self-commitment: write your own mission statement in your own words."
          />
          <div className={styles.bodyFields}>
            <label>
              <span>How did you hear about us?</span>
              <select
                value={data.heardAbout}
                onChange={e => setData({ ...data, heardAbout: e.target.value })}
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
                onChange={e => setData({ ...data, programGoal: e.target.value })}
                placeholder="e.g. consistency, pain-free running, strength"
              />
            </label>
          </div>
          <p className={styles.hint}>These details help personalise the plan without making the first check-in clinical.</p>
          <div className={styles.btnStack}>
            <button
              className={styles.primaryBtn}
              disabled={!storyReady}
              onClick={() => setStep(skipBodyStep ? 3 : 2)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className={styles.section}>
          <div className={styles.choiceGrid}>
            <button
              type="button"
              className={`${styles.choiceCard} ${data.sex === 'woman' ? styles.choiceCardActive : ''}`}
              onClick={() => setData({ ...data, sex: 'woman', gender: data.gender || 'woman' })}
            >
              Woman
            </button>
            <button
              type="button"
              className={`${styles.choiceCard} ${data.sex === 'man' ? styles.choiceCardActive : ''}`}
              onClick={() => setData({ ...data, sex: 'man', gender: data.gender || 'man' })}
            >
              Man
            </button>
          </div>

          {isWoman && (
            <div className={styles.bodyFields}>
              <label>
                <span>When was your last period?</span>
                <input
                  type="date"
                  value={data.lastPeriod}
                  onChange={e => setData({ ...data, lastPeriod: e.target.value })}
                />
              </label>
              <label>
                <span>When do you expect your next period?</span>
                <input
                  type="date"
                  value={data.nextPeriod}
                  onChange={e => setData({ ...data, nextPeriod: e.target.value })}
                />
              </label>
              <label>
                <span>Average cycle length, if you prefer</span>
                <input
                  type="number"
                  min="15"
                  max="90"
                  value={data.cycleLength}
                  onChange={e => setData({ ...data, cycleLength: e.target.value })}
                  placeholder="e.g. 28 days"
                />
              </label>
              <label>
                <span>Average period duration</span>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={data.periodLength}
                  onChange={e => setData({ ...data, periodLength: e.target.value })}
                  placeholder="e.g. 5 days"
                />
              </label>
              <label>
                <span>Are you in perimenopause or menopause?</span>
                <select
                  value={data.menopauseStatus}
                  onChange={e => setData({ ...data, menopauseStatus: e.target.value })}
                >
                  <option value="">Select one</option>
                  <option value="no">No</option>
                  <option value="perimenopause">Perimenopause</option>
                  <option value="menopause">Menopause</option>
                  <option value="unsure">Not sure</option>
                </select>
              </label>
            </div>
          )}

          <div className={styles.btnStack}>
            <button
              className={styles.primaryBtn}
              disabled={!data.sex}
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
          <div className={styles.pathGrid}>
            {paths.map(p => (
              <button
                key={p.id}
                className={styles.pathCard + (data.path === p.id ? ' ' + styles.pathActive : '')}
                onClick={() => setData({ ...data, path: p.id })}
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
              onClick={() => setStep(4)}
            >
              Next
            </button>
            <button className={styles.backLink} onClick={() => setStep(skipBodyStep ? 1 : 2)}>Back</button>
          </div>
        </section>
      )}

      {step === 4 && (
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
              onChange={e => setData({ ...data, commitment: Number(e.target.value) })}
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
            <button className={styles.backLink} onClick={() => setStep(3)}>Back</button>
          </div>
        </section>
      )}
    </div>
  )
}
