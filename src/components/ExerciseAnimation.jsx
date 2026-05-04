import { useState } from 'react'
import styles from './ExerciseAnimation.module.css'

const GIF_URLS = {
  squat:             'https://gymvisual.com/img/p/2/4/9/8/4/24984.gif',
  deadlift:          'https://gymvisual.com/img/p/4/1/5/6/1/41561.gif',
  benchPress:        'https://gymvisual.com/img/p/3/3/1/3/8/33138.gif',
  overheadPress:     'https://gymvisual.com/img/p/4/8/2/7/4827.gif',
  cleanToPress:      'https://gymvisual.com/img/p/4/7/5/9/4759.gif',
  bentOverRow:       'https://gymvisual.com/img/p/1/0/6/1/7/10617.gif',
  bicepCurl:         'https://gymvisual.com/img/p/2/1/8/3/5/21835.gif',
  reverseLunge:      'https://gymvisual.com/img/p/6/9/7/7/6977.gif',
  farmersCarry:      'https://gymvisual.com/img/p/3/7/3/4/0/37340.gif',
  suitcaseCarry:     'https://gymvisual.com/img/p/1/2/6/3/9/12639.gif',
  forwardBend:       'https://gymvisual.com/img/p/2/9/6/0/7/29607.gif',
  hipRotation:       'https://gymvisual.com/img/p/5/6/9/5/5695.gif',
  slr:               'https://gymvisual.com/img/p/5/8/7/4/5874.gif',
  proneHipExtension: 'https://gymvisual.com/img/p/1/8/5/3/1/18531.gif',
  sideBend:          'https://gymvisual.com/img/p/2/5/8/2/9/25829.gif',
  sittingSlump:      'https://gymvisual.com/img/p/4/0/3/8/5/40385.gif',
  hopping:           'https://gymvisual.com/img/p/2/4/0/3/5/24035.gif',
  spotJogging:       'https://gymvisual.com/img/p/4/0/0/3/1/40031.gif',
  skipping:          'https://gymvisual.com/img/p/1/8/3/5/2/18352.gif',
}

export default function ExerciseAnimation({ type, cadence }) {
  const [gifFailed, setGifFailed] = useState(false)
  const gifUrl = GIF_URLS[type]
  const Anim = animations[type] || animations.default

  return (
    <div className={styles.wrapper}>
      <div className={styles.stage}>
        {gifUrl && !gifFailed ? (
          <img
            src={gifUrl}
            alt={type}
            className={styles.gif}
            onError={() => setGifFailed(true)}
          />
        ) : (
          <Anim />
        )}
      </div>
      {cadence && (
        <p className={styles.cadenceLabel}>{cadence}</p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Realistic human-body SVG animations.
   Body is a filled silhouette with proper proportions
   (head ≈ 1 unit, body ≈ 7 heads tall). Limbs articulate at
   anatomical joints via CSS transform-origin keyframes.
   viewBox is consistently 200×320.
   ───────────────────────────────────────────────────────────────── */

const FILL = 'var(--ink)'
const HAIR = 'var(--ink)'
const SKIN_HIGHLIGHT = 'var(--cream)'

// Base body parts — used by most figures. Composed via SVG <g>.
function Head({ cx = 100, cy = 38 }) {
  return (
    <g>
      {/* hair cap */}
      <path d={`M ${cx - 16} ${cy - 4} Q ${cx - 16} ${cy - 22} ${cx} ${cy - 24} Q ${cx + 16} ${cy - 22} ${cx + 16} ${cy - 4} L ${cx + 14} ${cy - 10} Q ${cx} ${cy - 16} ${cx - 14} ${cy - 10} Z`} fill={HAIR} />
      {/* face */}
      <ellipse cx={cx} cy={cy} rx="14" ry="17" fill={FILL} />
      {/* neck */}
      <path d={`M ${cx - 6} ${cy + 14} L ${cx - 6} ${cy + 22} L ${cx + 6} ${cy + 22} L ${cx + 6} ${cy + 14} Z`} fill={FILL} />
    </g>
  )
}

// ───────────────────────────────────────────────────────────────
// SQUAT — figure descends, knees bend, hip hinges back
// ───────────────────────────────────────────────────────────────
function SquatAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <g className={styles.squatBody}>
        <Head />
        {/* torso — broad shoulders, taper to waist */}
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        {/* arms forward for balance */}
        <g className={styles.squatArmL}>
          <path d="M 73 68 Q 62 80 58 110 Q 56 130 62 145 L 70 145 Q 72 130 70 110 Q 75 80 78 70 Z" fill={FILL} />
        </g>
        <g className={styles.squatArmR}>
          <path d="M 127 68 Q 138 80 142 110 Q 144 130 138 145 L 130 145 Q 128 130 130 110 Q 125 80 122 70 Z" fill={FILL} />
        </g>
        {/* hip belt */}
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
        {/* LEFT LEG — hip and knee articulated */}
        <g className={styles.squatHipL}>
          {/* thigh */}
          <path d="M 78 138 Q 76 148 78 175 L 92 175 Q 95 148 95 138 Z" fill={FILL} />
          <g className={styles.squatKneeL}>
            {/* calf */}
            <path d="M 80 173 Q 78 200 76 230 L 92 230 Q 95 200 94 173 Z" fill={FILL} />
            {/* foot */}
            <path d="M 70 228 L 96 228 Q 98 232 96 236 L 70 236 Q 68 232 70 228 Z" fill={FILL} />
          </g>
        </g>
        {/* RIGHT LEG */}
        <g className={styles.squatHipR}>
          <path d="M 122 138 Q 124 148 122 175 L 108 175 Q 105 148 105 138 Z" fill={FILL} />
          <g className={styles.squatKneeR}>
            <path d="M 120 173 Q 122 200 124 230 L 108 230 Q 105 200 106 173 Z" fill={FILL} />
            <path d="M 130 228 L 104 228 Q 102 232 104 236 L 130 236 Q 132 232 130 228 Z" fill={FILL} />
          </g>
        </g>
        {/* ground line */}
        <line x1="40" y1="240" x2="160" y2="240" stroke="var(--border)" strokeWidth="1.5" />
      </g>
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// DEADLIFT — hip hinge with flat back, bar travels up
// ───────────────────────────────────────────────────────────────
function DeadliftAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <g className={styles.deadliftHinge}>
        <Head cx="100" cy="38" />
        {/* torso */}
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        {/* arms hanging straight down toward bar */}
        <path d="M 75 68 Q 70 80 70 130 Q 70 165 76 195 L 88 195 Q 86 165 86 130 Q 86 85 80 70 Z" fill={FILL} />
        <path d="M 125 68 Q 130 80 130 130 Q 130 165 124 195 L 112 195 Q 114 165 114 130 Q 114 85 120 70 Z" fill={FILL} />
        {/* hip belt */}
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
        {/* legs — straight, mostly fixed */}
        <path d="M 78 140 Q 76 170 78 230 L 92 230 Q 95 170 95 140 Z" fill={FILL} />
        <path d="M 122 140 Q 124 170 122 230 L 108 230 Q 105 170 105 140 Z" fill={FILL} />
        {/* feet */}
        <path d="M 70 228 L 96 228 Q 98 232 96 236 L 70 236 Q 68 232 70 228 Z" fill={FILL} />
        <path d="M 130 228 L 104 228 Q 102 232 104 236 L 130 236 Q 132 232 130 228 Z" fill={FILL} />
      </g>
      {/* Barbell — moves with hands */}
      <g className={styles.deadliftBar}>
        <rect x="55" y="195" width="90" height="6" rx="3" fill="var(--ink-light)" />
        <circle cx="55" cy="198" r="14" fill="none" stroke="var(--ink-light)" strokeWidth="3" />
        <circle cx="145" cy="198" r="14" fill="none" stroke="var(--ink-light)" strokeWidth="3" />
      </g>
      <line x1="30" y1="240" x2="170" y2="240" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// SUITCASE CARRY — figure walks with weight on one side
// ───────────────────────────────────────────────────────────────
function SuitcaseCarryAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <g className={styles.carryBody}>
        <Head cx="100" cy="38" />
        {/* tall upright torso */}
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        {/* arms — left holding kettlebell, right swings */}
        <path d="M 75 68 Q 68 90 65 130 Q 64 160 68 185 L 80 185 Q 82 160 80 130 Q 80 90 80 70 Z" fill={FILL} />
        <g className={styles.carryArmR}>
          <path d="M 125 68 Q 132 90 135 130 Q 136 160 132 185 L 120 185 Q 118 160 120 130 Q 120 90 120 70 Z" fill={FILL} />
        </g>
        {/* kettlebell */}
        <g transform="translate(0,0)">
          <path d="M 70 188 Q 70 184 75 184 Q 80 184 80 188" fill="none" stroke="var(--ink-light)" strokeWidth="3" />
          <ellipse cx="75" cy="200" rx="14" ry="14" fill="var(--ink-light)" />
        </g>
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
        {/* walking legs */}
        <g className={styles.carryLegL}>
          <path d="M 80 138 Q 78 175 76 230 L 92 230 Q 94 175 95 138 Z" fill={FILL} />
          <path d="M 70 228 L 96 228 Q 98 232 96 236 L 70 236 Q 68 232 70 228 Z" fill={FILL} />
        </g>
        <g className={styles.carryLegR}>
          <path d="M 120 138 Q 122 175 124 230 L 108 230 Q 106 175 105 138 Z" fill={FILL} />
          <path d="M 130 228 L 104 228 Q 102 232 104 236 L 130 236 Q 132 232 130 228 Z" fill={FILL} />
        </g>
      </g>
      <line x1="20" y1="240" x2="180" y2="240" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// FARMER'S CARRY — both hands holding weight
// ───────────────────────────────────────────────────────────────
function FarmersCarryAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <g className={styles.carryBody}>
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        {/* both arms hanging with weights */}
        <path d="M 75 68 Q 68 90 65 130 Q 64 160 68 185 L 80 185 Q 82 160 80 130 Q 80 90 80 70 Z" fill={FILL} />
        <path d="M 125 68 Q 132 90 135 130 Q 136 160 132 185 L 120 185 Q 118 160 120 130 Q 120 90 120 70 Z" fill={FILL} />
        {/* kettlebells in both hands */}
        <ellipse cx="74" cy="200" rx="14" ry="14" fill="var(--ink-light)" />
        <ellipse cx="126" cy="200" rx="14" ry="14" fill="var(--ink-light)" />
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
        <g className={styles.carryLegL}>
          <path d="M 80 138 Q 78 175 76 230 L 92 230 Q 94 175 95 138 Z" fill={FILL} />
          <path d="M 70 228 L 96 228 Q 98 232 96 236 L 70 236 Q 68 232 70 228 Z" fill={FILL} />
        </g>
        <g className={styles.carryLegR}>
          <path d="M 120 138 Q 122 175 124 230 L 108 230 Q 106 175 105 138 Z" fill={FILL} />
          <path d="M 130 228 L 104 228 Q 102 232 104 236 L 130 236 Q 132 232 130 228 Z" fill={FILL} />
        </g>
      </g>
      <line x1="20" y1="240" x2="180" y2="240" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// HOPPING — figure bounces, soft landing
// ───────────────────────────────────────────────────────────────
function HoppingAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <g className={styles.hopBody}>
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        {/* arms slightly out */}
        <path d="M 73 68 Q 60 85 55 115 Q 53 130 58 142 L 68 142 Q 70 128 68 115 Q 75 85 78 70 Z" fill={FILL} />
        <path d="M 127 68 Q 140 85 145 115 Q 147 130 142 142 L 132 142 Q 130 128 132 115 Q 125 85 122 70 Z" fill={FILL} />
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
        {/* legs — one bent landing, one tucked */}
        <g className={styles.hopLegL}>
          <path d="M 80 138 Q 76 165 80 200 L 95 200 Q 96 170 96 138 Z" fill={FILL} />
          <path d="M 80 198 Q 78 215 80 230 L 96 230 Q 98 215 96 198 Z" fill={FILL} />
          <path d="M 70 228 L 100 228 Q 102 232 100 236 L 70 236 Q 68 232 70 228 Z" fill={FILL} />
        </g>
        <g className={styles.hopLegR}>
          <path d="M 120 138 Q 124 165 124 195 L 112 195 Q 108 165 105 138 Z" fill={FILL} />
          <path d="M 122 195 Q 128 200 130 195 L 130 188 Q 124 188 122 192 Z" fill={FILL} />
        </g>
      </g>
      {/* ground */}
      <line x1="30" y1="252" x2="170" y2="252" stroke="var(--border)" strokeWidth="1.5" />
      {/* bounce arrow */}
      <path className={styles.bounceArrow} d="M 100 268 Q 95 280 100 290 M 96 286 L 100 290 L 104 286" fill="none" stroke="var(--sage)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// SPOT JOGGING — figure runs in place, alternating legs
// ───────────────────────────────────────────────────────────────
function SpotJoggingAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      {/* puppet string */}
      <line x1="100" y1="14" x2="100" y2="2" stroke="var(--sand)" strokeWidth="1.5" strokeDasharray="3,2" />
      <g className={styles.jogBody}>
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        {/* arms in running swing */}
        <g className={styles.jogArmL}>
          <path d="M 73 68 Q 60 80 56 105 Q 56 120 62 130 L 70 128 Q 70 118 70 108 Q 78 85 78 72 Z" fill={FILL} />
        </g>
        <g className={styles.jogArmR}>
          <path d="M 127 68 Q 140 80 144 105 Q 144 120 138 130 L 130 128 Q 130 118 130 108 Q 122 85 122 72 Z" fill={FILL} />
        </g>
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
        {/* alternating legs */}
        <g className={styles.jogLegL}>
          <path d="M 82 138 L 75 175 L 92 175 L 95 138 Z" fill={FILL} />
          <path d="M 78 173 L 78 215 L 92 215 L 94 173 Z" fill={FILL} />
          <path d="M 70 213 L 96 213 Q 98 218 96 222 L 70 222 Q 68 218 70 213 Z" fill={FILL} />
        </g>
        <g className={styles.jogLegR}>
          <path d="M 118 138 L 125 175 L 108 175 L 105 138 Z" fill={FILL} />
          <path d="M 122 173 L 122 215 L 108 215 L 106 173 Z" fill={FILL} />
          <path d="M 130 213 L 104 213 Q 102 218 104 222 L 130 222 Q 132 218 130 213 Z" fill={FILL} />
        </g>
      </g>
      <line x1="30" y1="252" x2="170" y2="252" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// FORWARD BEND — hinge from hips, head and torso fold down
// ───────────────────────────────────────────────────────────────
function ForwardBendAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      {/* legs are stationary */}
      <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
      <path d="M 80 138 Q 78 175 76 230 L 92 230 Q 94 175 95 138 Z" fill={FILL} />
      <path d="M 120 138 Q 122 175 124 230 L 108 230 Q 106 175 105 138 Z" fill={FILL} />
      <path d="M 70 228 L 96 228 Q 98 232 96 236 L 70 236 Q 68 232 70 228 Z" fill={FILL} />
      <path d="M 130 228 L 104 228 Q 102 232 104 236 L 130 236 Q 132 232 130 228 Z" fill={FILL} />
      {/* highlight hip-hinge joint */}
      <circle cx="100" cy="140" r="5" fill="none" stroke="var(--terracotta)" strokeWidth="2" className={styles.hipHighlight} />
      {/* upper body folds down */}
      <g className={styles.forwardFold}>
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        {/* arms hanging */}
        <path d="M 75 68 Q 68 95 65 125 L 78 130 Q 80 100 80 70 Z" fill={FILL} />
        <path d="M 125 68 Q 132 95 135 125 L 122 130 Q 120 100 120 70 Z" fill={FILL} />
      </g>
      <line x1="30" y1="240" x2="170" y2="240" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// OVERHEAD PRESS — arms press up, ribs stay down
// ───────────────────────────────────────────────────────────────
function OverheadPressAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <Head cx="100" cy="62" />
      <path d="M 75 86 Q 70 92 70 114 Q 70 139 78 166 L 122 166 Q 130 139 130 114 Q 130 92 125 86 L 115 84 Q 100 80 85 84 Z" fill={FILL} />
      {/* arms — pressing up */}
      <g className={styles.pressArmL}>
        <path d="M 73 92 Q 60 80 50 50 Q 48 40 55 38 L 65 38 Q 70 50 75 80 Q 78 88 78 92 Z" fill={FILL} />
      </g>
      <g className={styles.pressArmR}>
        <path d="M 127 92 Q 140 80 150 50 Q 152 40 145 38 L 135 38 Q 130 50 125 80 Q 122 88 122 92 Z" fill={FILL} />
      </g>
      {/* barbell */}
      <g className={styles.pressBar}>
        <rect x="35" y="34" width="130" height="7" rx="3" fill="var(--ink-light)" />
        <circle cx="40" cy="38" r="13" fill="none" stroke="var(--ink-light)" strokeWidth="3" />
        <circle cx="160" cy="38" r="13" fill="none" stroke="var(--ink-light)" strokeWidth="3" />
      </g>
      {/* core "bridge" highlight */}
      <rect x="80" y="125" width="40" height="30" rx="6" fill="var(--sage-light)" opacity="0.5" />
      <ellipse cx="100" cy="164" rx="26" ry="8" fill={FILL} />
      {/* legs — stable pillar */}
      <path d="M 80 162 Q 78 195 76 250 L 92 250 Q 94 195 95 162 Z" fill={FILL} />
      <path d="M 120 162 Q 122 195 124 250 L 108 250 Q 106 195 105 162 Z" fill={FILL} />
      <path d="M 70 248 L 96 248 Q 98 252 96 256 L 70 256 Q 68 252 70 248 Z" fill={FILL} />
      <path d="M 130 248 L 104 248 Q 102 252 104 256 L 130 256 Q 132 252 130 248 Z" fill={FILL} />
      <line x1="30" y1="260" x2="170" y2="260" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// HIP ROTATION — seated figure, leg rotates internally/externally
// ───────────────────────────────────────────────────────────────
function HipRotationAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <g className={styles.rotateBody}>
        <Head cx="100" cy="50" />
        <path d="M 75 74 Q 70 80 70 100 Q 70 130 78 152 L 122 152 Q 130 130 130 100 Q 130 80 125 74 L 115 72 Q 100 68 85 72 Z" fill={FILL} />
        {/* arms */}
        <path d="M 75 80 L 70 130 L 80 132 L 82 80 Z" fill={FILL} />
        <path d="M 125 80 L 130 130 L 120 132 L 118 80 Z" fill={FILL} />
        <ellipse cx="100" cy="150" rx="26" ry="8" fill={FILL} />
      </g>
      {/* RIGHT leg — rotates */}
      <g className={styles.rotateLeg}>
        <path d="M 100 148 L 90 220 L 108 224 L 118 148 Z" fill={FILL} />
        <path d="M 88 222 L 110 220 Q 116 222 114 230 L 90 230 Q 84 226 88 222 Z" fill={FILL} />
      </g>
      {/* left leg static */}
      <path d="M 100 148 L 110 220 L 92 224 L 82 148 Z" fill={FILL} opacity="0.4" />
      {/* floor */}
      <line x1="20" y1="240" x2="180" y2="240" stroke="var(--border)" strokeWidth="1.5" />
      {/* rotation arrow */}
      <path d="M 130 230 Q 145 215 138 200" fill="none" stroke="var(--terracotta)" strokeWidth="2" strokeLinecap="round" />
      <path d="M 138 200 L 134 204 M 138 200 L 142 204" stroke="var(--terracotta)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// BENCH PRESS — lying down, arms press up
// ───────────────────────────────────────────────────────────────
function BenchPressAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      {/* bench */}
      <rect x="30" y="195" width="140" height="14" rx="3" fill="var(--ink-light)" />
      <rect x="38" y="209" width="6" height="30" fill="var(--ink-light)" />
      <rect x="156" y="209" width="6" height="30" fill="var(--ink-light)" />
      {/* body lying on bench (head at right) */}
      <g transform="rotate(-90, 100, 195)">
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
        <path d="M 80 138 Q 78 175 76 230 L 92 230 Q 94 175 95 138 Z" fill={FILL} />
        <path d="M 120 138 Q 122 175 124 230 L 108 230 Q 106 175 105 138 Z" fill={FILL} />
      </g>
      {/* arms pressing — vertical from chest */}
      <g className={styles.benchArms}>
        <path d="M 78 175 Q 70 145 70 110 L 86 110 Q 88 145 90 175 Z" fill={FILL} />
        <path d="M 122 175 Q 130 145 130 110 L 114 110 Q 112 145 110 175 Z" fill={FILL} />
        <rect x="40" y="100" width="120" height="6" rx="3" fill="var(--ink-light)" />
        <circle cx="45" cy="103" r="12" fill="none" stroke="var(--ink-light)" strokeWidth="3" />
        <circle cx="155" cy="103" r="12" fill="none" stroke="var(--ink-light)" strokeWidth="3" />
      </g>
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// BENT OVER ROW — hinged figure pulling bar to chest
// ───────────────────────────────────────────────────────────────
function BentOverRowAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      {/* legs straight, slightly bent */}
      <ellipse cx="100" cy="180" rx="26" ry="8" fill={FILL} />
      <path d="M 80 178 Q 78 210 76 260 L 92 260 Q 94 210 95 178 Z" fill={FILL} />
      <path d="M 120 178 Q 122 210 124 260 L 108 260 Q 106 210 105 178 Z" fill={FILL} />
      <path d="M 70 258 L 96 258 Q 98 262 96 266 L 70 266 Q 68 262 70 258 Z" fill={FILL} />
      <path d="M 130 258 L 104 258 Q 102 262 104 266 L 130 266 Q 132 262 130 258 Z" fill={FILL} />
      {/* hinged torso (rotated forward) */}
      <g transform="rotate(70, 100, 180)">
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
      </g>
      {/* arms pulling */}
      <g className={styles.rowArms}>
        <path d="M 60 145 Q 50 165 50 195 L 65 195 Q 70 165 75 148 Z" fill={FILL} />
        <path d="M 140 145 Q 150 165 150 195 L 135 195 Q 130 165 125 148 Z" fill={FILL} />
        <rect x="40" y="195" width="120" height="6" rx="3" fill="var(--ink-light)" />
        <circle cx="45" cy="198" r="12" fill="none" stroke="var(--ink-light)" strokeWidth="3" />
        <circle cx="155" cy="198" r="12" fill="none" stroke="var(--ink-light)" strokeWidth="3" />
      </g>
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// REVERSE LUNGE — split stance, back leg drops, front shin vertical
// ───────────────────────────────────────────────────────────────
function ReverseLungeAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <g className={styles.lungeBody}>
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        <path d="M 73 68 Q 65 90 60 130 L 70 145 Q 76 105 80 70 Z" fill={FILL} />
        <path d="M 127 68 Q 135 90 140 130 L 130 145 Q 124 105 120 70 Z" fill={FILL} />
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
      </g>
      {/* front leg — vertical shin */}
      <path d="M 80 138 L 75 200 L 92 200 L 92 138 Z" fill={FILL} />
      <path d="M 78 198 L 78 240 L 92 240 L 94 198 Z" fill={FILL} />
      <path d="M 70 238 L 96 238 Q 98 242 96 246 L 70 246 Q 68 242 70 238 Z" fill={FILL} />
      {/* back leg — knee dropped */}
      <g className={styles.lungeBackLeg}>
        <path d="M 120 138 L 145 175 L 130 185 L 108 142 Z" fill={FILL} />
        <path d="M 138 178 L 158 235 L 142 240 L 125 185 Z" fill={FILL} />
        <path d="M 138 235 L 162 235 Q 165 240 162 244 L 138 244 Q 134 240 138 235 Z" fill={FILL} />
      </g>
      <line x1="30" y1="248" x2="170" y2="248" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// BICEP CURL — elbow flexion, upper arm pinned
// ───────────────────────────────────────────────────────────────
function BicepCurlAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <Head cx="100" cy="38" />
      <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
      {/* upper arms pinned to torso */}
      <path d="M 73 68 Q 68 90 70 125 L 82 125 Q 84 90 80 70 Z" fill={FILL} />
      <path d="M 127 68 Q 132 90 130 125 L 118 125 Q 116 90 120 70 Z" fill={FILL} />
      {/* forearms — rotate at elbow */}
      <g className={styles.curlForearmL}>
        <path d="M 70 122 Q 60 142 58 165 L 72 165 Q 76 142 84 124 Z" fill={FILL} />
        <ellipse cx="65" cy="170" rx="14" ry="14" fill="var(--ink-light)" />
      </g>
      <g className={styles.curlForearmR}>
        <path d="M 130 122 Q 140 142 142 165 L 128 165 Q 124 142 116 124 Z" fill={FILL} />
        <ellipse cx="135" cy="170" rx="14" ry="14" fill="var(--ink-light)" />
      </g>
      <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
      <path d="M 80 138 Q 78 175 76 240 L 92 240 Q 94 175 95 138 Z" fill={FILL} />
      <path d="M 120 138 Q 122 175 124 240 L 108 240 Q 106 175 105 138 Z" fill={FILL} />
      <path d="M 70 238 L 96 238 Q 98 242 96 246 L 70 246 Q 68 242 70 238 Z" fill={FILL} />
      <path d="M 130 238 L 104 238 Q 102 242 104 246 L 130 246 Q 132 242 130 238 Z" fill={FILL} />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// SLR — supine straight leg raise
// ───────────────────────────────────────────────────────────────
function SlrAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      {/* lying figure - rotated 90° */}
      <g transform="rotate(-90, 100, 200) translate(0, 80)">
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
      </g>
      {/* bottom leg — flat on floor */}
      <g transform="translate(0, 0)">
        <path d="M 30 215 L 150 215 L 150 230 L 30 230 Z" fill={FILL} />
      </g>
      {/* lifted leg */}
      <g className={styles.slrLeg}>
        <path d="M 30 200 Q 80 180 130 145 L 145 155 Q 95 195 38 215 Z" fill={FILL} />
      </g>
      {/* floor */}
      <line x1="20" y1="240" x2="180" y2="240" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// PRONE HIP EXTENSION — face down, lift one leg
// ───────────────────────────────────────────────────────────────
function ProneHipExtensionAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <g transform="rotate(90, 100, 180)">
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
      </g>
      {/* still leg flat */}
      <path d="M 60 195 L 165 195 L 165 207 L 60 207 Z" fill={FILL} opacity="0.5" />
      {/* lifted leg */}
      <g className={styles.proneLeg}>
        <path d="M 65 178 L 165 175 L 165 192 L 65 192 Z" fill={FILL} />
      </g>
      <line x1="20" y1="220" x2="180" y2="220" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// SITTING SLUMP — chair seated, posture changing
// ───────────────────────────────────────────────────────────────
function SittingSlumpAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      {/* chair */}
      <rect x="55" y="200" width="90" height="10" fill="var(--ink-light)" />
      <rect x="55" y="208" width="6" height="40" fill="var(--ink-light)" />
      <rect x="139" y="208" width="6" height="40" fill="var(--ink-light)" />
      {/* lower body — sitting */}
      <ellipse cx="100" cy="195" rx="26" ry="8" fill={FILL} />
      <path d="M 80 195 L 80 240 L 96 240 L 100 195 Z" fill={FILL} />
      <path d="M 120 195 L 120 240 L 104 240 L 100 195 Z" fill={FILL} />
      {/* upper body — slumps and straightens */}
      <g className={styles.slumpBody}>
        <Head cx="100" cy="40" />
        <path d="M 75 64 Q 70 70 70 92 Q 70 120 78 145 L 122 145 Q 130 120 130 92 Q 130 70 125 64 L 115 62 Q 100 58 85 62 Z" fill={FILL} />
        <path d="M 75 70 Q 70 100 70 140 L 82 140 Q 84 105 82 70 Z" fill={FILL} />
        <path d="M 125 70 Q 130 100 130 140 L 118 140 Q 116 105 118 70 Z" fill={FILL} />
      </g>
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// SIDE BEND — torso bends laterally, hips stay still
// ───────────────────────────────────────────────────────────────
function SideBendAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      {/* legs static */}
      <ellipse cx="100" cy="180" rx="26" ry="8" fill={FILL} />
      <path d="M 80 178 Q 78 210 76 260 L 92 260 Q 94 210 95 178 Z" fill={FILL} />
      <path d="M 120 178 Q 122 210 124 260 L 108 260 Q 106 210 105 178 Z" fill={FILL} />
      <path d="M 70 258 L 96 258 Q 98 262 96 266 L 70 266 Q 68 262 70 258 Z" fill={FILL} />
      <path d="M 130 258 L 104 258 Q 102 262 104 266 L 130 266 Q 132 262 130 258 Z" fill={FILL} />
      {/* torso bends sideways */}
      <g className={styles.sideBendTorso}>
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 120 78 178 L 122 178 Q 130 120 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        <path d="M 75 68 Q 65 100 60 145 L 72 148 Q 78 105 80 70 Z" fill={FILL} />
        <path d="M 125 68 Q 135 100 140 145 L 128 148 Q 122 105 120 70 Z" fill={FILL} />
      </g>
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// SKIPPING — bigger amplitude jog
// ───────────────────────────────────────────────────────────────
function SkippingAnim() {
  return SpotJoggingAnim()
}

// ───────────────────────────────────────────────────────────────
// CLEAN TO PRESS — uses press animation
// ───────────────────────────────────────────────────────────────
function CleanToPressAnim() {
  return OverheadPressAnim()
}

// ───────────────────────────────────────────────────────────────
// DEFAULT — generic standing figure (breath cycle)
// ───────────────────────────────────────────────────────────────
function DefaultAnim() {
  return (
    <svg viewBox="0 0 200 320" className={styles.svg}>
      <g className={styles.defaultFigure}>
        <Head cx="100" cy="38" />
        <path d="M 75 62 Q 70 68 70 90 Q 70 115 78 142 L 122 142 Q 130 115 130 90 Q 130 68 125 62 L 115 60 Q 100 56 85 60 Z" fill={FILL} />
        <path d="M 75 68 Q 68 95 65 145 L 78 148 Q 80 100 80 70 Z" fill={FILL} />
        <path d="M 125 68 Q 132 95 135 145 L 122 148 Q 120 100 120 70 Z" fill={FILL} />
        <ellipse cx="100" cy="140" rx="26" ry="8" fill={FILL} />
        <path d="M 80 138 Q 78 175 76 240 L 92 240 Q 94 175 95 138 Z" fill={FILL} />
        <path d="M 120 138 Q 122 175 124 240 L 108 240 Q 106 175 105 138 Z" fill={FILL} />
        <path d="M 70 238 L 96 238 Q 98 242 96 246 L 70 246 Q 68 242 70 238 Z" fill={FILL} />
        <path d="M 130 238 L 104 238 Q 102 242 104 246 L 130 246 Q 132 242 130 238 Z" fill={FILL} />
      </g>
    </svg>
  )
}

const animations = {
  squat: SquatAnim,
  deadlift: DeadliftAnim,
  suitcaseCarry: SuitcaseCarryAnim,
  farmersCarry: FarmersCarryAnim,
  cleanToPress: CleanToPressAnim,
  overheadPress: OverheadPressAnim,
  hopping: HoppingAnim,
  spotJogging: SpotJoggingAnim,
  skipping: SkippingAnim,
  forwardBend: ForwardBendAnim,
  hipRotation: HipRotationAnim,
  benchPress: BenchPressAnim,
  bentOverRow: BentOverRowAnim,
  reverseLunge: ReverseLungeAnim,
  bicepCurl: BicepCurlAnim,
  slr: SlrAnim,
  proneHipExtension: ProneHipExtensionAnim,
  sittingSlump: SittingSlumpAnim,
  sideBend: SideBendAnim,
  default: DefaultAnim
}
