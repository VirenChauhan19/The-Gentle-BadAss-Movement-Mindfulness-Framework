import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import styles from './Onboarding.module.css'

const paths = [
  {
    id: 'rehab',
    icon: '🌱',
    title: 'The Rehab Path',
    desc: 'Movement quality and pain-free assessments. Gentle, intentional, restorative.',
  },
  {
    id: 'beginner',
    icon: '🚶',
    title: 'The Beginner Path',
    desc: 'Gradual Walk-Run intervals with a focus on soft landings and cadence.',
  },
  {
    id: 'performance',
    icon: '🏃',
    title: 'The Performance Path',
    desc: 'Distance scaling from 5 km to marathon, optimising the hip engine.',
  },
]

const commitmentLabels = {
  30: { label: '30-Day Reset', desc: 'A focused month to reset your movement habits.' },
  60: { label: '60-Day Foundation', desc: 'Build a real movement foundation.' },
  90: { label: '90-Day Transformation', desc: 'Three months of consistent progress.' },
  120: { label: '120-Day Deep Dive', desc: 'A full season of intentional movement.' },
  150: { label: '150-Day Journey', desc: 'Half a year of building strength.' },
  180: { label: '180-Day Commitment', desc: 'Six months of dedicated practice.' },
  210: { label: '210-Day Challenge', desc: 'A serious commitment to change.' },
  240: { label: '240-Day Quest', desc: 'Eight months of sustained effort.' },
  270: { label: '270-Day Transformation', desc: 'The full La Ultra journey.' },
}

export default function Onboarding() {
  const { saveProfile } = useData()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState({ fitnessHistory: '', path: '', commitment: 90 })

  async function handleComplete() {
    await saveProfile({ ...data, onboardingComplete: true })
    navigate('/')
  }

  const commitInfo = commitmentLabels[data.commitment] || { label: `${data.commitment}-Day Journey`, desc: '' }

  return (
    <div className={styles.page}>
      {/* Progress bar */}
      <div className={styles.progressBar}>
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className={styles.progressDot + (step >= n ? ' ' + styles.progressDotActive : '')}
          />
        ))}
        <div className={styles.progressLine}>
          <div className={styles.progressLineFill} style={{ width: `${((step - 1) / 2) * 100}%` }} />
        </div>
      </div>

      <header className={styles.header}>
        <p className={styles.stepLabel}>Step {step} of 3</p>
        <h1 className={styles.title}>
          {step === 1 && 'Your Story'}
          {step === 2 && 'Choose Your Path'}
          {step === 3 && 'Your Commitment'}
        </h1>
        <p className={styles.subtitle}>
          {step === 1 && 'Tell us where you are right now.'}
          {step === 2 && 'Pick the focus that fits your current state.'}
          {step === 3 && 'How long are you committing to this journey?'}
        </p>
      </header>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <section className={styles.section}>
          <textarea
            className={styles.textarea}
            value={data.fitnessHistory}
            onChange={e => setData({ ...data, fitnessHistory: e.target.value })}
            placeholder="e.g. Occasional walking, recovering from a knee injury, want to run my first 5 km…"
            autoFocus
          />
          <p className={styles.hint}>A few sentences is enough — this helps personalise your path.</p>
          <div className={styles.btnStack}>
            <button
              className={styles.primaryBtn}
              disabled={!data.fitnessHistory.trim()}
              onClick={() => setStep(2)}
            >
              Next →
            </button>
          </div>
        </section>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
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
              onClick={() => setStep(3)}
            >
              Next →
            </button>
            <button className={styles.backLink} onClick={() => setStep(1)}>← Back</button>
          </div>
        </section>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <section className={styles.section}>
          <div className={styles.commitmentCard}>
            <div className={styles.commitDays}>{data.commitment}</div>
            <div className={styles.commitUnit}>days</div>
            <div className={styles.commitLabelText}>{commitInfo.label}</div>
          </div>
          <p className={styles.commitDesc}>{commitInfo.desc}</p>

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
              <span>30</span>
              <span>90</span>
              <span>180</span>
              <span>270</span>
            </div>
          </div>

          <div className={styles.btnStack}>
            <button className={styles.startBtn} onClick={handleComplete}>
              Start My Journey
            </button>
            <button className={styles.backLink} onClick={() => setStep(2)}>← Back</button>
          </div>
        </section>
      )}
    </div>
  )
}
