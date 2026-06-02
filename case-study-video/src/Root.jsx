import React from 'react'
import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

const FPS = 30
const DURATION = 58 * FPS

const palette = {
  charcoal: '#050504',
  black: '#0b0b08',
  paper: '#f8f1df',
  muted: 'rgba(248,241,223,0.74)',
  dim: 'rgba(248,241,223,0.48)',
  gold: '#d6aa23',
  sage: '#9dbb8f',
  blue: '#7ca8c4',
  clay: '#c58567',
  line: 'rgba(248,241,223,0.16)',
  panel: 'rgba(17,17,12,0.78)',
}

const scenes = [
  { id: 'hook', from: 0, dur: 135 },
  { id: 'feel', from: 135, dur: 225 },
  { id: 'adapt', from: 360, dur: 195 },
  { id: 'breathe', from: 555, dur: 225 },
  { id: 'move', from: 780, dur: 255 },
  { id: 'coach', from: 1035, dur: 225 },
  { id: 'history', from: 1260, dur: 195 },
  { id: 'end', from: 1455, dur: 285 },
]

const voiceScenes = [
  { from: 0, dur: 135, file: 'commercial-scenes/01-hook.mp3' },
  { from: 135, dur: 225, file: 'commercial-scenes/02-feel.mp3' },
  { from: 360, dur: 195, file: 'commercial-scenes/03-plan.mp3' },
  { from: 555, dur: 225, file: 'commercial-scenes/04-breathe.mp3' },
  { from: 780, dur: 255, file: 'commercial-scenes/05-move.mp3' },
  { from: 1035, dur: 225, file: 'commercial-scenes/06-running.mp3' },
  { from: 1260, dur: 195, file: 'commercial-scenes/07-progress.mp3' },
  { from: 1455, dur: 285, file: 'commercial-scenes/08-end.mp3' },
]

const features = [
  'Daily Feel check-in',
  'Adaptive running plan',
  '5 BPM breathing timer',
  'Functional tests',
  'Strength tools',
  'Running drills',
  'Pace zones',
  'Context-aware coach',
  'History trends',
  'Offline PWA',
]

export const RemotionRoot = () => (
  <>
    <Composition
      id="CommercialVertical"
      component={Commercial}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ format: 'vertical' }}
    />
    <Composition
      id="CommercialLandscape"
      component={Commercial}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ format: 'landscape' }}
    />
  </>
)

function Commercial({ format }) {
  const frame = useCurrentFrame()
  const isVertical = format === 'vertical'

  return (
    <AbsoluteFill style={{ background: palette.charcoal, color: palette.paper, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', overflow: 'hidden' }}>
      <Atmosphere />
      <Progress frame={frame} />
      {scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.dur} premountFor={24}>
          <Scene scene={scene.id} isVertical={isVertical} />
        </Sequence>
      ))}
      <div style={{
        position: 'absolute',
        left: isVertical ? 70 : 72,
        right: isVertical ? 70 : 'auto',
        bottom: isVertical ? 62 : 46,
        zIndex: 40,
        display: 'flex',
        justifyContent: isVertical ? 'center' : 'flex-start',
        color: palette.dim,
        fontSize: isVertical ? 26 : 22,
        fontWeight: 800,
        letterSpacing: 0,
      }}>
        laultrarunandbee.web.app
      </div>
      {voiceScenes.map((scene) => (
        <Sequence key={scene.file} from={scene.from} durationInFrames={scene.dur}>
          <Audio src={staticFile(scene.file)} volume={0.98} />
        </Sequence>
      ))}
      <Audio
        src={staticFile('soft-portfolio-bed.wav')}
        volume={(f) =>
          interpolate(
            f,
            [0, 120, DURATION - 150, DURATION - 1],
            [0, 0.13, 0.13, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          )
        }
      />
    </AbsoluteFill>
  )
}

function Scene({ scene, isVertical }) {
  if (scene === 'hook') return <Hook isVertical={isVertical} />
  if (scene === 'feel') return <Feel isVertical={isVertical} />
  if (scene === 'adapt') return <Adapt isVertical={isVertical} />
  if (scene === 'breathe') return <Breathe isVertical={isVertical} />
  if (scene === 'move') return <Move isVertical={isVertical} />
  if (scene === 'coach') return <Coach isVertical={isVertical} />
  if (scene === 'history') return <History isVertical={isVertical} />
  return <End isVertical={isVertical} />
}

function layout(isVertical) {
  return {
    padding: isVertical ? '120px 74px 108px' : '92px 96px 82px',
    gridTemplateColumns: isVertical ? '1fr' : '760px 1fr',
    gap: isVertical ? 48 : 86,
  }
}

function Stage({ isVertical, children, visual }) {
  const l = layout(isVertical)
  return (
    <AbsoluteFill style={{ padding: l.padding }}>
      <div style={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: l.gridTemplateColumns,
        gap: l.gap,
        alignItems: 'center',
      }}>
        <div style={{ zIndex: 3 }}>{children}</div>
        <div style={{ justifySelf: 'center', zIndex: 2 }}>{visual}</div>
      </div>
    </AbsoluteFill>
  )
}

function Copy({ eyebrow, title, body, isVertical, chips = [] }) {
  const enter = useEntrance()
  return (
    <div style={{ ...enter }}>
      <div style={{
        color: palette.dim,
        fontSize: isVertical ? 28 : 22,
        fontWeight: 950,
        letterSpacing: 4,
        textTransform: 'uppercase',
        marginBottom: 18,
      }}>
        {eyebrow}
      </div>
      <h1 style={{
        margin: 0,
        fontFamily: 'Georgia, serif',
        fontSize: isVertical ? 86 : 78,
        lineHeight: 0.98,
        letterSpacing: 0,
        maxWidth: isVertical ? 920 : 760,
      }}>
        {title}
      </h1>
      <p style={{
        margin: '28px 0 0',
        color: palette.muted,
        fontSize: isVertical ? 34 : 29,
        lineHeight: 1.32,
        fontWeight: 680,
        maxWidth: isVertical ? 900 : 720,
      }}>
        {body}
      </p>
      {chips.length > 0 && <ChipGrid items={chips} isVertical={isVertical} />}
    </div>
  )
}

function Hook({ isVertical }) {
  const frame = useCurrentFrame()
  return (
    <Stage
      isVertical={isVertical}
      visual={<Phone type="home" isVertical={isVertical} lift={Math.sin(frame / 28) * 10} />}
    >
      <Copy
        eyebrow="Meet the app"
        title="La Ultra: Run & Bee"
        body="A movement and mindfulness app by Dr. Rajat Chauhan for runners who want to train the engine without fighting the body."
        chips={['Feel', 'Breathe', 'Move', 'Coach']}
        isVertical={isVertical}
      />
    </Stage>
  )
}

function Feel({ isVertical }) {
  return (
    <Stage
      isVertical={isVertical}
      visual={<Phone type="feel" isVertical={isVertical} />}
    >
      <Copy
        eyebrow="Start with Feel"
        title="Two minutes before the shoes go on."
        body="Rate real signals across body, mind, and movement. The app turns that check-in into a daily Feel Score you can understand."
        chips={['Body', 'Mind', 'Movement', 'Reflection']}
        isVertical={isVertical}
      />
    </Stage>
  )
}

function Adapt({ isVertical }) {
  return (
    <Stage
      isVertical={isVertical}
      visual={<Phone type="plan" isVertical={isVertical} />}
    >
      <Copy
        eyebrow="Your plan adapts"
        title="The plan bends before the body breaks."
        body="When Feel is low, the day can shift from intensity to recovery, mobility, or nasal-only easy work."
        chips={['Readiness', 'Recovery', 'Daily plan']}
        isVertical={isVertical}
      />
    </Stage>
  )
}

function Breathe({ isVertical }) {
  const frame = useCurrentFrame()
  return (
    <Stage
      isVertical={isVertical}
      visual={<Phone type="breathe" isVertical={isVertical} pulse={0.78 + Math.sin(frame / 20) * 0.1} />}
    >
      <Copy
        eyebrow="Breathe"
        title="Settle the system first."
        body="The 5 BPM breathing practice uses a calm orb and metronome to slow the rhythm before training starts."
        chips={['5 BPM', 'Orb timer', 'Metronome']}
        isVertical={isVertical}
      />
    </Stage>
  )
}

function Move({ isVertical }) {
  return (
    <Stage
      isVertical={isVertical}
      visual={<Phone type="move" isVertical={isVertical} />}
    >
      <Copy
        eyebrow="Move"
        title="Clinical cues in your pocket."
        body="Open functional tests, strength tools, and running drills with precise movement language from the actual framework."
        chips={['Functional tests', 'Strength tools', 'Running drills']}
        isVertical={isVertical}
      />
    </Stage>
  )
}

function Coach({ isVertical }) {
  return (
    <Stage
      isVertical={isVertical}
      visual={<Phone type="coach" isVertical={isVertical} />}
    >
      <Copy
        eyebrow="Running coach"
        title="Plans that know today's context."
        body="Build weekly running plans, calculate pace zones, log check-ins, and ask training questions with recent history in view."
        chips={['Pace zones', 'Weekly plan', 'AI coach']}
        isVertical={isVertical}
      />
    </Stage>
  )
}

function History({ isVertical }) {
  return (
    <Stage
      isVertical={isVertical}
      visual={<Phone type="history" isVertical={isVertical} />}
    >
      <Copy
        eyebrow="History"
        title="Patterns become visible."
        body="Feel, readiness, quality, breathing sessions, and workouts turn into trends you can read without chasing metrics."
        chips={['Feel trends', 'Session log', 'Quality score']}
        isVertical={isVertical}
      />
    </Stage>
  )
}

function End({ isVertical }) {
  const frame = useCurrentFrame()
  const scale = spring({ frame, fps: FPS, config: { damping: 18, stiffness: 100 } })
  return (
    <AbsoluteFill style={{
      padding: isVertical ? '170px 76px 140px' : '120px 120px 90px',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    }}>
      <div style={{ transform: `scale(${scale})`, maxWidth: isVertical ? 900 : 1180 }}>
        <LogoMark size={isVertical ? 170 : 142} />
        <div style={{ marginTop: 42, color: palette.dim, fontSize: isVertical ? 28 : 22, fontWeight: 950, letterSpacing: 5, textTransform: 'uppercase' }}>
          Google sign-in | guest mode | offline PWA
        </div>
        <div style={{ marginTop: 22, fontFamily: 'Georgia, serif', fontSize: isVertical ? 94 : 90, lineHeight: 1, fontWeight: 900 }}>
          Listen first.<br />Then move.
        </div>
        <div style={{ marginTop: 34, color: palette.muted, fontSize: isVertical ? 36 : 31, lineHeight: 1.3, fontWeight: 760 }}>
          Add La Ultra: Run & Bee to your home screen.
        </div>
      </div>
    </AbsoluteFill>
  )
}

function Phone({ type, isVertical, pulse = 0.82, lift = 0 }) {
  const frame = useCurrentFrame()
  const w = isVertical ? 650 : 470
  const h = isVertical ? 1030 : 820
  const rotate = Math.sin(frame / 65) * (isVertical ? 0.6 : 1.2)
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: isVertical ? 62 : 52,
      padding: 18,
      background: 'linear-gradient(145deg, #1c1c16, #040403)',
      border: '1px solid rgba(255,255,255,0.16)',
      boxShadow: '0 42px 110px rgba(0,0,0,0.58)',
      transform: `translateY(${lift}px) rotate(${rotate}deg)`,
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: isVertical ? 44 : 38,
        border: `1px solid ${palette.line}`,
        background: '#080806',
      }}>
        <MiniScreen type={type} pulse={pulse} isVertical={isVertical} />
      </div>
    </div>
  )
}

function MiniScreen({ type, pulse, isVertical }) {
  const active = type === 'feel' ? 'Feel' : type === 'history' ? 'Progress' : type === 'home' ? 'Home' : 'Plan'
  const content =
    type === 'feel' ? <FeelScreen isVertical={isVertical} />
      : type === 'breathe' ? <BreatheScreen pulse={pulse} isVertical={isVertical} />
        : type === 'plan' ? <PlanScreen isVertical={isVertical} />
          : type === 'move' ? <MoveScreen isVertical={isVertical} />
            : type === 'coach' ? <CoachScreen isVertical={isVertical} />
              : type === 'history' ? <HistoryScreen isVertical={isVertical} />
                : <HomeScreen isVertical={isVertical} />

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: '#080806' }}>
      <div style={{ height: '100%', overflow: 'hidden', paddingBottom: isVertical ? 118 : 96 }}>
        {content}
      </div>
      <AppBottomNav active={active} isVertical={isVertical} />
    </div>
  )
}

function Header({ label, title, sub, isVertical }) {
  return (
    <div style={{ padding: isVertical ? 34 : 28, background: 'linear-gradient(145deg, rgba(214,170,35,0.36), rgba(157,187,143,0.10))' }}>
      <div style={{ color: palette.dim, letterSpacing: 4, fontSize: isVertical ? 18 : 14, textTransform: 'uppercase', fontWeight: 950 }}>{label}</div>
      <div style={{ marginTop: 10, fontFamily: 'Georgia, serif', fontSize: isVertical ? 52 : 38, lineHeight: 1.02, fontWeight: 900 }}>{title}</div>
      {sub && <div style={{ marginTop: 10, color: palette.muted, fontSize: isVertical ? 22 : 17, lineHeight: 1.3, fontWeight: 720 }}>{sub}</div>}
    </div>
  )
}

function AppBottomNav({ active, isVertical }) {
  const items = [
    ['Home', 'home'],
    ['Feel', 'feel'],
    ['Plan', 'plan'],
    ['Progress', 'progress'],
    ['Me', 'me'],
  ]
  return (
    <div style={{
      position: 'absolute',
      left: isVertical ? 18 : 14,
      right: isVertical ? 18 : 14,
      bottom: isVertical ? 18 : 14,
      padding: isVertical ? 8 : 6,
      borderRadius: isVertical ? 22 : 18,
      background: 'rgba(248,241,223,0.94)',
      border: '1px solid rgba(70,68,58,0.22)',
      boxShadow: '0 12px 30px rgba(0,0,0,0.32)',
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 2,
      color: '#27251d',
      zIndex: 10,
    }}>
      {items.map(([label, icon]) => {
        const selected = label === active
        return (
          <div key={label} style={{
            minHeight: isVertical ? 70 : 58,
            display: 'grid',
            placeItems: 'center',
            alignContent: 'center',
            gap: isVertical ? 5 : 3,
            color: selected ? '#17150f' : 'rgba(39,37,29,0.58)',
            fontSize: isVertical ? 16 : 12,
            fontWeight: 850,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}>
            <NavGlyph name={icon} selected={selected} size={isVertical ? 26 : 21} />
            <span>{label}</span>
            {selected && <span style={{ width: 5, height: 5, borderRadius: 99, background: '#5f7f56' }} />}
          </div>
        )
      })}
    </div>
  )
}

function NavGlyph({ name, selected, size }) {
  const stroke = selected ? '#17150f' : 'rgba(39,37,29,0.58)'
  const common = { fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'home') return <svg width={size} height={size} viewBox="0 0 24 24"><path {...common} d="M3.5 10.5 12 4l8.5 6.5v8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" /><path {...common} d="M9.5 20v-6h5v6" /></svg>
  if (name === 'feel') return <svg width={size} height={size} viewBox="0 0 24 24"><path {...common} d="M12 3a9 9 0 1 0 9 9" /><path {...common} d="M12 7v5l3 2" /></svg>
  if (name === 'plan') return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="M12 8v8M8 12h8" /></svg>
  if (name === 'progress') return <svg width={size} height={size} viewBox="0 0 24 24"><path {...common} d="M3 13h4l3-7 4 13 3-6h4" /></svg>
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...common} cx="12" cy="8" r="3.5" /><path {...common} d="M5 20c.8-4 4-6 7-6s6.2 2 7 6" /></svg>
}

function ActualPlanTabs({ active, isVertical }) {
  const tabs = ['Breathe', 'Mobility', 'Strength', 'Running']
  return (
    <div style={{
      display: 'flex',
      gap: isVertical ? 10 : 8,
      padding: isVertical ? '20px 24px 0' : '16px 18px 0',
      overflow: 'hidden',
    }}>
      {tabs.map((tab) => {
        const selected = tab === active
        return (
          <div key={tab} style={{
            flexShrink: 0,
            padding: isVertical ? '10px 17px' : '8px 13px',
            borderRadius: isVertical ? 14 : 12,
            border: `1px solid ${selected ? 'transparent' : 'rgba(248,241,223,0.20)'}`,
            background: selected ? 'linear-gradient(135deg, #d6aa23, #9dbb8f)' : 'rgba(248,241,223,0.08)',
            color: selected ? '#14120b' : palette.muted,
            fontSize: isVertical ? 19 : 14,
            fontWeight: 900,
            lineHeight: 1,
          }}>
            {tab}
          </div>
        )
      })}
    </div>
  )
}

function HomeScreen({ isVertical }) {
  return (
    <div>
      <Header label="La Ultra: Run & Bee" title="Good morning" sub="Train the engine without fighting the body." isVertical={isVertical} />
      <div style={{ padding: isVertical ? 32 : 24, display: 'grid', gap: isVertical ? 22 : 16 }}>
        <Metric title="Today's Feel" value="7.4 / 10" tone={palette.sage} isVertical={isVertical} />
        <Metric title="Open Today's Plan" value="Breathe / Mobility / Strength / Running" tone={palette.gold} isVertical={isVertical} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {['12 day streak', '43% complete', '51 days'].map((item) => <Tiny key={item} text={item} isVertical={isVertical} />)}
        </div>
        <ActionRows isVertical={isVertical} />
      </div>
    </div>
  )
}

function FeelScreen({ isVertical }) {
  const frame = useCurrentFrame()
  const rows = ['Sleep', 'Energy', 'Stress', 'Fluidity', 'Breath', 'Movement joy', 'Connection']
  return (
    <div>
      <Header label="Feel" title="How does your body feel?" sub="Ten signals. One honest score." isVertical={isVertical} />
      <div style={{ padding: isVertical ? 32 : 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Ring value={0.74} size={isVertical ? 190 : 150} />
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: isVertical ? 72 : 54, fontWeight: 900 }}>7.4</div>
            <div style={{ color: palette.sage, fontSize: isVertical ? 25 : 18, fontWeight: 900 }}>Keep it measured</div>
          </div>
        </div>
        <div style={{ marginTop: 32, display: 'grid', gap: isVertical ? 17 : 12 }}>
          {rows.map((row, i) => {
            const width = 40 + ((i * 13 + frame / 3) % 48)
            return <SliderLine key={row} label={row} width={width} color={[palette.sage, palette.blue, palette.clay][i % 3]} isVertical={isVertical} />
          })}
        </div>
      </div>
    </div>
  )
}

function BreatheScreen({ pulse, isVertical }) {
  return (
    <div>
      <Header label="Breathe" title="5 BPM practice" sub="Settle before training." isVertical={isVertical} />
      <ActualPlanTabs active="Breathe" isVertical={isVertical} />
      <div style={{ padding: isVertical ? 32 : 24, display: 'grid', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ButtonLabel text="Start" active isVertical={isVertical} />
          <ButtonLabel text="Stop" isVertical={isVertical} />
        </div>
        <div style={{ height: isVertical ? 600 : 430, borderRadius: 28, border: `1px solid ${palette.line}`, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.28)' }}>
          <div style={{
            width: isVertical ? 230 : 170,
            height: isVertical ? 230 : 170,
            borderRadius: 999,
            transform: `scale(${pulse})`,
            background: `radial-gradient(circle at 34% 26%, #fff8d8 0 9%, ${palette.gold} 30%, #675105 100%)`,
            boxShadow: '0 0 0 42px rgba(214,170,35,0.06), 0 0 78px rgba(214,170,35,0.45)',
            display: 'grid',
            placeItems: 'center',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: isVertical ? 80 : 58, fontWeight: 900 }}>1</div>
              <div style={{ fontSize: isVertical ? 20 : 16, fontWeight: 900 }}>of 4</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanScreen({ isVertical }) {
  return (
    <div>
      <Header label="Your Plan" title="Today's Plan" sub="Breathe, Mobility, Strength, and Running." isVertical={isVertical} />
      <ActualPlanTabs active="Mobility" isVertical={isVertical} />
      <div style={{ padding: isVertical ? 32 : 24, display: 'grid', gap: isVertical ? 18 : 13 }}>
        {[
          ['Breathe', '5 BPM practice before training', palette.gold],
          ['Mobility', 'Ankle rocks, hip flexor stretch, thoracic rotations', palette.sage],
          ['Running', 'Easy aerobic run, adjusted when Feel is low', palette.blue],
        ].map(([title, value, tone]) => <Metric key={title} title={title} value={value} tone={tone} isVertical={isVertical} />)}
      </div>
    </div>
  )
}

function MoveScreen({ isVertical }) {
  return (
    <div>
      <Header label="Your Plan" title="Move" sub="Functional tests, strength tools, running drills." isVertical={isVertical} />
      <ActualPlanTabs active="Strength" isVertical={isVertical} />
      <div style={{ padding: isVertical ? 32 : 24, display: 'grid', gap: isVertical ? 18 : 13 }}>
        {[
          ['Functional Tests', 'Weekly baseline self-assessments', palette.blue],
          ['Strength Tools', '10-second cadence, lumbar-neutral', palette.sage],
          ['Running Drills', 'Hip-driven and soft landing', palette.gold],
        ].map(([title, value, tone]) => <Metric key={title} title={title} value={value} tone={tone} isVertical={isVertical} />)}
        <CueCloud isVertical={isVertical} />
      </div>
    </div>
  )
}

function CoachScreen({ isVertical }) {
  return (
    <div>
      <Header label="Your Plan" title="Running" sub="Plans, pace zones, and daily check-ins." isVertical={isVertical} />
      <ActualPlanTabs active="Running" isVertical={isVertical} />
      <div style={{ padding: isVertical ? 32 : 24, display: 'grid', gap: 16 }}>
        <Metric title="Benchmark race" value="45:00 10K -> zones" tone={palette.blue} isVertical={isVertical} />
        <Metric title="Today's session" value="Easy aerobic run" tone={palette.sage} isVertical={isVertical} />
        <ButtonLabel text="Start workout" active isVertical={isVertical} />
        <ChatBubble text="How should I adjust if my knee feels stiff?" isVertical={isVertical} />
        <ChatBubble text="Back off intensity, keep nasal breathing, and log pain notes." isVertical={isVertical} response />
      </div>
    </div>
  )
}

function HistoryScreen({ isVertical }) {
  return (
    <div>
      <Header label="History" title="Progress dashboard" sub="Feel, readiness, quality, and sessions." isVertical={isVertical} />
      <div style={{ padding: isVertical ? 32 : 24 }}>
        <div style={{ height: isVertical ? 430 : 310, display: 'flex', alignItems: 'end', gap: 16, borderBottom: `1px solid ${palette.line}`, paddingBottom: 20 }}>
          {[44, 62, 50, 78, 70, 86, 74].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '14px 14px 0 0', background: i % 2 ? palette.gold : palette.sage, boxShadow: '0 0 24px rgba(214,170,35,0.16)' }} />
          ))}
        </div>
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Tiny text="Strongest: Breath" isVertical={isVertical} />
          <Tiny text="Watch: Stress" isVertical={isVertical} />
          <Tiny text="Breathing sessions: 9" isVertical={isVertical} />
          <Tiny text="Workout log: synced" isVertical={isVertical} />
        </div>
      </div>
    </div>
  )
}

function PlanCard({ isVertical }) {
  const frame = useCurrentFrame()
  const items = [
    ['Feel Score', '4.2 / 10', palette.clay],
    ['Original', 'Tempo intervals', palette.blue],
    ['Adjusted', 'Recovery walk + mobility', palette.sage],
    ['Breathing', 'Nasal-only override', palette.gold],
  ]
  return (
    <div style={{
      width: isVertical ? 720 : 650,
      borderRadius: 34,
      padding: isVertical ? 38 : 34,
      background: palette.panel,
      border: `1px solid ${palette.line}`,
      boxShadow: '0 36px 100px rgba(0,0,0,0.52)',
    }}>
      <div style={{ color: palette.dim, fontSize: isVertical ? 24 : 18, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 950 }}>Today's plan</div>
      <div style={{ marginTop: 16, fontFamily: 'Georgia, serif', fontSize: isVertical ? 58 : 50, fontWeight: 900 }}>Recovery first</div>
      <div style={{ marginTop: 28, display: 'grid', gap: 16 }}>
        {items.map(([label, value, tone], i) => {
          const active = Math.sin(frame / 22 + i) > -0.3
          return (
            <div key={label} style={{
              padding: isVertical ? 24 : 20,
              borderRadius: 20,
              background: active ? `${tone}24` : 'rgba(255,255,255,0.055)',
              border: `1px solid ${active ? tone : palette.line}`,
            }}>
              <div style={{ color: palette.dim, fontSize: isVertical ? 20 : 16, fontWeight: 900 }}>{label}</div>
              <div style={{ marginTop: 6, color: palette.paper, fontSize: isVertical ? 30 : 25, fontWeight: 950 }}>{value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionRows({ isVertical }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {['Open Today\'s Plan', 'Breathe at 5 BPM', 'Take Functional Test', 'Progress'].map((item) => (
        <div key={item} style={{ padding: isVertical ? 20 : 16, borderRadius: 16, border: `1px solid ${palette.line}`, color: palette.muted, fontSize: isVertical ? 22 : 17, fontWeight: 900 }}>
          {item}
        </div>
      ))}
    </div>
  )
}

function Metric({ title, value, tone, isVertical }) {
  return (
    <div style={{ padding: isVertical ? 24 : 20, borderRadius: 22, border: `1px solid ${tone}80`, background: 'rgba(255,255,255,0.055)' }}>
      <div style={{ color: palette.dim, letterSpacing: 3, fontSize: isVertical ? 18 : 14, textTransform: 'uppercase', fontWeight: 950 }}>{title}</div>
      <div style={{ marginTop: 8, color: palette.paper, fontSize: isVertical ? 30 : 23, fontWeight: 950, lineHeight: 1.18 }}>{value}</div>
    </div>
  )
}

function Tiny({ text, isVertical }) {
  return (
    <div style={{ padding: isVertical ? 18 : 13, borderRadius: 16, background: 'rgba(255,255,255,0.07)', color: palette.muted, fontSize: isVertical ? 19 : 14, fontWeight: 900, lineHeight: 1.2 }}>
      {text}
    </div>
  )
}

function SliderLine({ label, width, color, isVertical }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: palette.muted, fontSize: isVertical ? 20 : 15, fontWeight: 850 }}>
        <span>{label}</span>
        <span>{Math.round(width / 10)}</span>
      </div>
      <div style={{ marginTop: 7, height: isVertical ? 13 : 10, borderRadius: 99, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', borderRadius: 99, background: color }} />
      </div>
    </div>
  )
}

function ButtonLabel({ text, active = false, isVertical }) {
  return (
    <div style={{
      padding: isVertical ? 22 : 17,
      borderRadius: 17,
      textAlign: 'center',
      fontSize: isVertical ? 24 : 19,
      fontWeight: 950,
      color: active ? '#14120b' : palette.muted,
      background: active ? `linear-gradient(135deg, ${palette.gold}, #f1d375)` : 'rgba(255,255,255,0.07)',
      boxShadow: active ? '0 0 34px rgba(214,170,35,0.32)' : 'none',
    }}>
      {text}
    </div>
  )
}

function ChatBubble({ text, response = false, isVertical }) {
  return (
    <div style={{
      justifySelf: response ? 'start' : 'end',
      maxWidth: '86%',
      padding: isVertical ? 18 : 14,
      borderRadius: response ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
      background: response ? 'rgba(157,187,143,0.18)' : 'rgba(124,168,196,0.18)',
      border: `1px solid ${response ? `${palette.sage}66` : `${palette.blue}66`}`,
      color: palette.muted,
      fontSize: isVertical ? 20 : 15,
      lineHeight: 1.28,
      fontWeight: 800,
    }}>
      {text}
    </div>
  )
}

function CueCloud({ isVertical }) {
  const cues = ['Hips first', 'Stable pillar', 'Soft landing', 'Relaxed fists', 'Core bridge', 'Quiet spine']
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {cues.map((cue, i) => (
        <div key={cue} style={{
          padding: isVertical ? '13px 16px' : '10px 12px',
          borderRadius: 999,
          color: palette.muted,
          border: `1px solid ${[palette.sage, palette.blue, palette.gold][i % 3]}66`,
          background: 'rgba(255,255,255,0.045)',
          fontSize: isVertical ? 18 : 14,
          fontWeight: 900,
        }}>
          {cue}
        </div>
      ))}
    </div>
  )
}

function Ring({ value, size }) {
  const r = size * 0.38
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.sage} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

function LogoMark({ size }) {
  return (
    <div style={{
      margin: '0 auto',
      width: size,
      height: size,
      borderRadius: 42,
      display: 'grid',
      placeItems: 'center',
      background: `linear-gradient(135deg, ${palette.gold}, ${palette.sage})`,
      boxShadow: '0 30px 90px rgba(214,170,35,0.32)',
      color: '#111008',
      fontFamily: 'Georgia, serif',
      fontSize: size * 0.38,
      fontWeight: 900,
    }}>
      L
    </div>
  )
}

function ChipGrid({ items, isVertical }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 34 }}>
      {items.map((item, i) => (
        <div key={item} style={{
          padding: isVertical ? '14px 20px' : '12px 17px',
          borderRadius: 999,
          border: `1px solid ${[palette.gold, palette.sage, palette.blue, palette.clay][i % 4]}66`,
          background: 'rgba(255,255,255,0.055)',
          color: palette.paper,
          fontSize: isVertical ? 22 : 18,
          fontWeight: 900,
        }}>
          {item}
        </div>
      ))}
    </div>
  )
}

function Progress({ frame }) {
  const { width, height } = useVideoConfig()
  const pct = Math.min(1, frame / DURATION)
  const vertical = height > width
  return (
    <div style={{
      position: 'absolute',
      left: vertical ? 70 : 72,
      right: vertical ? 70 : 72,
      top: vertical ? 58 : 38,
      height: 5,
      borderRadius: 999,
      background: 'rgba(255,255,255,0.11)',
      zIndex: 60,
      overflow: 'hidden',
    }}>
      <div style={{ width: `${pct * 100}%`, height: '100%', background: `linear-gradient(90deg, ${palette.gold}, ${palette.sage}, ${palette.blue})`, borderRadius: 999 }} />
    </div>
  )
}

function Atmosphere() {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const t = frame / FPS
  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute',
        inset: -220,
        background: `
          radial-gradient(${width * 0.44}px ${height * 0.20}px at ${24 + Math.sin(t * 0.19) * 4}% ${18 + Math.cos(t * 0.17) * 3}%, rgba(214,170,35,0.50), transparent 72%),
          radial-gradient(${width * 0.34}px ${height * 0.22}px at ${78 + Math.cos(t * 0.15) * 4}% ${30 + Math.sin(t * 0.18) * 3}%, rgba(124,168,196,0.30), transparent 72%),
          radial-gradient(${width * 0.42}px ${height * 0.24}px at ${24 + Math.cos(t * 0.11) * 3}% ${82 + Math.sin(t * 0.12) * 3}%, rgba(157,187,143,0.26), transparent 75%),
          linear-gradient(180deg, #030302 0%, #0d0c08 54%, #030302 100%)`,
        filter: 'blur(16px)',
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.70), transparent 34%, transparent 67%, rgba(0,0,0,0.70))' }} />
      {features.map((feature, i) => {
        const x = ((i * 211 + frame * 0.28) % (width + 240)) - 120
        const y = 120 + ((i * 173) % Math.max(300, height - 260)) + Math.sin(t * 0.6 + i) * 22
        return (
          <div key={feature} style={{
            position: 'absolute',
            left: x,
            top: y,
            padding: '10px 15px',
            borderRadius: 999,
            color: 'rgba(248,241,223,0.18)',
            border: '1px solid rgba(248,241,223,0.08)',
            fontSize: 18,
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}>
            {feature}
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

function useEntrance(delay = 0) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [delay, delay + 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })
  const y = interpolate(frame, [delay, delay + 24], [32, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })
  return { opacity, transform: `translateY(${y}px)` }
}
