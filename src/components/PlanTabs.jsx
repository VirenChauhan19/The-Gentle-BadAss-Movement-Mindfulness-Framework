import { Link } from 'react-router-dom'
import styles from './PlanTabs.module.css'

const PLAN_TABS = [
  { id: 'breathe', label: 'Breathe', to: '/breathing' },
  { id: 'running', label: 'Mobility', to: '/library?section=running' },
  { id: 'strength', label: 'Strength', to: '/library?section=strength' },
  { id: 'coach', label: 'Running', to: '/library?section=coach' },
]

export default function PlanTabs({ active }) {
  return (
    <nav className={styles.tabs} aria-label="Plan sections">
      {PLAN_TABS.map(tab => (
        <Link
          key={tab.id}
          to={tab.to}
          className={`${styles.tab} ${active === tab.id ? styles.tabActive : ''}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
