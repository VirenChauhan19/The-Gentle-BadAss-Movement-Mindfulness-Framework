import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import './style.css';

const shots = {
  signin: 'captures/01-signin-gate.png',
  home: 'captures/02-home-top.png',
  about: 'captures/03-home-about.png',
  actions: 'captures/04-home-actions.png',
  footer: 'captures/05-home-footer.png',
  theme: 'captures/06-theme-picker.png',
};

const scenes = [
  {
    from: 0,
    duration: 150,
    shot: shots.home,
    title: 'La Ultra: Run & Bee',
    kicker: 'Daily training, built around awareness',
    align: 'left',
    zoom: [1.04, 1.12],
    pan: ['0%', '-2%'],
  },
  {
    from: 150,
    duration: 240,
    shot: shots.about,
    title: 'A quieter way to train',
    kicker: 'Movement and mindfulness in one web app',
    align: 'right',
    zoom: [1.02, 1.08],
    pan: ['0%', '2%'],
  },
  {
    from: 390,
    duration: 300,
    shot: shots.home,
    title: 'Check in before you push',
    kicker: "Today's Feel, journey stats, and the next best step",
    align: 'left',
    zoom: [1.1, 1.18],
    pan: ['0%', '-5%'],
  },
  {
    from: 690,
    duration: 330,
    shot: shots.actions,
    title: 'Breathe. Move. Build. Track.',
    kicker: 'Plan, breathing, functional tests, and progress',
    align: 'right',
    zoom: [1.04, 1.13],
    pan: ['2%', '-2%'],
  },
  {
    from: 1020,
    duration: 270,
    shot: shots.signin,
    title: 'Sync with Google, or begin as guest',
    kicker: 'Real entry flows from the live app',
    align: 'left',
    zoom: [1.02, 1.08],
    pan: ['0%', '1%'],
  },
  {
    from: 1290,
    duration: 210,
    shot: shots.theme,
    title: 'Designed to feel calm and focused',
    kicker: 'Theme controls, app navigation, and a mobile-ready layout',
    align: 'right',
    zoom: [1.03, 1.1],
    pan: ['1%', '-1%'],
  },
  {
    from: 1500,
    duration: 150,
    special: 'admin',
    title: 'Admin access is real, but not shown here',
    kicker: 'Credentials were unavailable, so no private admin data was captured',
  },
  {
    from: 1650,
    duration: 150,
    shot: shots.footer,
    title: 'laultrarunandbee.web.app',
    kicker: 'Built to connect runners, guidance, and the training experience',
    align: 'center',
    zoom: [1.05, 1.12],
    pan: ['0%', '0%'],
  },
];

const subtitles = [
  [0, 150, 'La Ultra: Run & Bee is a daily companion for runners who want to train with awareness, not pressure.'],
  [150, 390, 'Built by Dr. Rajat Chauhan, the app brings movement and mindfulness into one simple web experience.'],
  [390, 690, 'Start with how your body feels, then let the day scale around the signals that matter.'],
  [690, 1020, "Open the day's plan, reset with breathing, take functional tests, and review progress."],
  [1020, 1290, 'Sign in with Google to sync across devices, or use guest mode on this device.'],
  [1290, 1500, 'The interface stays clean, focused, and ready to live where the runner already is.'],
  [1500, 1650, 'Admin tools exist in the code, but admin footage requires an authenticated admin session.'],
  [1650, 1800, 'Built to connect runners, guidance, and the full training experience in one place.'],
];

export function Promo() {
  const frame = useCurrentFrame();
  const subtitle = subtitles.find(([start, end]) => frame >= start && frame < end)?.[2] || '';

  return (
    <AbsoluteFill className="video">
      <Audio src={staticFile('assets/music.wav')} volume={0.22} />
      {scenes.map(scene => (
        <Sequence key={scene.from} from={scene.from} durationInFrames={scene.duration}>
          {scene.special === 'admin' ? <AdminScene scene={scene} /> : <ImageScene scene={scene} />}
        </Sequence>
      ))}
      <div className="brand-bug">LA ULTRA: RUN & BEE</div>
      <div className="subtitle">{subtitle}</div>
    </AbsoluteFill>
  );
}

function ImageScene({ scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 24, stiffness: 90 } });
  const opacity = interpolate(frame, [0, 16, scene.duration - 18, scene.duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const zoom = interpolate(frame, [0, scene.duration], scene.zoom, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const overlayY = interpolate(entrance, [0, 1], [28, 0]);

  return (
    <AbsoluteFill className="scene" style={{ opacity }}>
      <div className="screenshot-wrap">
        <Img
          src={staticFile(scene.shot)}
          className="screenshot"
          style={{
            transform: `scale(${zoom}) translate(${scene.pan[1]}, 0)`,
          }}
        />
      </div>
      <div className={`copy copy-${scene.align}`} style={{ transform: `translateY(${overlayY}px)` }}>
        <div className="copy-kicker">{scene.kicker}</div>
        <h1>{scene.title}</h1>
      </div>
      <div className="shade" />
    </AbsoluteFill>
  );
}

function AdminScene({ scene }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15, scene.duration - 15, scene.duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rise = interpolate(frame, [0, 25], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill className="admin-scene" style={{ opacity }}>
      <div className="admin-grid" />
      <div className="admin-card" style={{ transform: `translateY(${rise}px)` }}>
        <p>Admin footage</p>
        <h1>{scene.title}</h1>
        <span>{scene.kicker}</span>
      </div>
      <div className="admin-points">
        <span>Users</span>
        <span>Plans</span>
        <span>Messages</span>
        <span>Announcements</span>
        <span>Activity</span>
      </div>
    </AbsoluteFill>
  );
}
