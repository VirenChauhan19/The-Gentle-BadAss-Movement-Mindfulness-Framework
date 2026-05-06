import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import styles from './Paywall.module.css'

// ── Swap this one line with your real key when ready ──────────────────────────
const RAZORPAY_KEY = 'rzp_test_1DP5mmOlF5G5ag'
// ─────────────────────────────────────────────────────────────────────────────

const PLANS = {
  30:  { label: '30-Day Reset',          price: 499  },
  60:  { label: '60-Day Foundation',     price: 799  },
  90:  { label: '90-Day Transformation', price: 1199 },
  120: { label: '120-Day Deep Dive',     price: 1499 },
  150: { label: '150-Day Journey',       price: 1699 },
  180: { label: '180-Day Commitment',    price: 1999 },
  210: { label: '210-Day Challenge',     price: 2299 },
  240: { label: '240-Day Quest',         price: 2499 },
  270: { label: '270-Day La Ultra',      price: 2999 },
}

const FEATURES = [
  'Daily Feel check-ins & body scoring',
  'Full Movement Library — tests, drills, strength',
  'History dashboard & progress charts',
  'AI Coach with personalised training plans',
  'Cloud sync across all your devices',
  'Dr. Rajat Chauhan\'s complete framework',
]

export default function Paywall() {
  const { profile, user, guestName } = useData()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)

  const commitment = profile?.commitment || 90
  const plan = PLANS[commitment] || PLANS[90]
  const displayName = user?.displayName || guestName || 'there'
  const firstName = displayName.split(' ')[0]

  function openCheckout() {
    if (!window.Razorpay) {
      alert('Razorpay could not load. Check your internet connection.')
      return
    }
    setLoading(true)

    const options = {
      key: RAZORPAY_KEY,
      amount: plan.price * 100,           // paise
      currency: 'INR',
      name: 'The Gentle BadAss',
      description: plan.label,
      image: '',
      prefill: {
        name: user?.displayName || guestName || '',
        email: user?.email || '',
      },
      notes: {
        commitment: String(commitment),
      },
      theme: { color: '#3f5f3e' },
      modal: {
        ondismiss: () => setLoading(false),
      },
      handler: () => {
        // In test mode this fires immediately after test payment
        // In live mode: wait for webhook to set profile.paid = true in Firestore
        setLoading(false)
        setPaid(true)
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  if (paid) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>You're in!</h1>
          <p className={styles.successSub}>
            Your {commitment}-day journey starts now, {firstName}.
          </p>
          <button className={styles.ctaBtn} onClick={() => navigate('/')}>
            Go to my dashboard →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.cardHeader}>
          <p className={styles.kicker}>La Ultra · Run &amp; Bee</p>
          <h1 className={styles.headline}>
            Unlock your<br />journey, {firstName}
          </h1>
          <div className={styles.commitBadge}>
            {commitment} days · {plan.label.split('-Day ')[1]}
          </div>
        </div>

        {/* Price */}
        <div className={styles.priceRow}>
          <span className={styles.currency}>₹</span>
          <span className={styles.price}>{plan.price.toLocaleString('en-IN')}</span>
          <div className={styles.priceNote}>
            <span>One-time payment</span>
            <span>No subscription · No renewal</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Features */}
        <ul className={styles.features}>
          {FEATURES.map(f => (
            <li key={f} className={styles.feature}>
              <span className={styles.featureCheck}>✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className={styles.divider} />

        {/* CTA */}
        <button
          className={styles.ctaBtn}
          onClick={openCheckout}
          disabled={loading}
        >
          {loading
            ? 'Opening payment…'
            : `Pay ₹${plan.price.toLocaleString('en-IN')} — UPI · Card · Net Banking`}
        </button>

        <p className={styles.trust}>
          <span>🔒</span> Secured by Razorpay · Indian payments · Instant access
        </p>

        {/* Test mode notice */}
        <div className={styles.testBanner}>
          <strong>Test mode</strong> — use card 4111 1111 1111 1111 · OTP 1234 · or UPI: success@razorpay
        </div>

        <button className={styles.skipBtn} onClick={() => navigate('/')}>
          Continue with limited access →
        </button>

      </div>
    </div>
  )
}
