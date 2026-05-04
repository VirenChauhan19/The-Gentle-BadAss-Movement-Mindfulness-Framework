import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import styles from './Onboarding.module.css'

export default function Onboarding() {
  const { saveProfile } = useData()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    fitnessHistory: '',
    path: '',
    commitment: 30
  })

  async function handleComplete() {
    await saveProfile({ ...data, onboardingComplete: true })
    navigate('/')
  }

  const paths = [
    { id: 'rehab', title: 'The Rehab Path', desc: 'Focus on movement quality and pain-free assessments.' },
    { id: 'beginner', title: 'The Beginner Path', desc: 'Gradual Walk-Run intervals focused on soft landings.' },
    { id: 'performance', title: 'The Performance Path', desc: 'Distance scaling (5km to Marathon) optimizing the "hip engine".' }
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome to Gentle BadAss</h1>
        <p className={styles.subtitle}>Step {step} of 3</p>
      </header>

      {step === 1 && (
        <section className={styles.section}>
          <h2 className={styles.stepTitle}>Your Fitness History</h2>
          <p className={styles.stepDesc}>Briefly describe your last 3 months of activity, injuries, or goals.</p>
          <textarea
            className={styles.textarea}
            value={data.fitnessHistory}
            onChange={e => setData({ ...data, fitnessHistory: e.target.value })}
            placeholder="e.g. Occasional walking, recovering from a knee injury..."
          />
          <button
            className={styles.nextBtn}
            disabled={!data.fitnessHistory}
            onClick={() => setStep(2)}
          >
            Next
          </button>
        </section>
      )}

      {step === 2 && (
        <section className={styles.section}>
          <h2 className={styles.stepTitle}>Choose Your Path</h2>
          <p className={styles.stepDesc}>Select the focus that best matches your current state.</p>
          <div className={styles.pathGrid}>
            {paths.map(p => (
              <button
                key={p.id}
                className={styles.pathCard + (data.path === p.id ? ' ' + styles.pathActive : '')}
                onClick={() => setData({ ...data, path: p.id })}
              >
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </button>
            ))}
          </div>
          <div className={styles.btnRow}>
            <button className={styles.backBtn} onClick={() => setStep(1)}>Back</button>
            <button
              className={styles.nextBtn}
              disabled={!data.path}
              onClick={() => setStep(3)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={styles.section}>
          <h2 className={styles.stepTitle}>Your Commitment</h2>
          <p className={styles.stepDesc}>How long is this journey? Choose your transformation window.</p>
          <div className={styles.commitmentRow}>
            <input
              type="range"
              min="30"
              max="270"
              step="30"
              value={data.commitment}
              onChange={e => setData({ ...data, commitment: Number(e.target.value) })}
              className={styles.slider}
            />
            <div className={styles.commitmentValue}>
              <span className={styles.days}>{data.commitment}</span>
              <span className={styles.label}>Days</span>
            </div>
          </div>
          <p className={styles.commitmentLabel}>
            {data.commitment === 30 ? 'A 30-day Reset' : 
             data.commitment === 270 ? 'A 270-day Transformation' : 
             `A ${data.commitment}-day Journey`}
          </p>
          <div className={styles.btnRow}>
            <button className={styles.backBtn} onClick={() => setStep(2)}>Back</button>
            <button className={styles.nextBtn} onClick={handleComplete}>
              Start Journey
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
