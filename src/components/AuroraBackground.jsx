import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/*
 * AuroraBackground — a WebGL "energetic aurora / flow" backdrop.
 *
 *  • Flowing aurora ribbons (domain-warped simplex noise shader)
 *  • A particle field that drifts upward and accelerates with scroll velocity
 *  • Pointer + device-tilt parallax for a genuine sense of 3D depth
 *  • Colours are pulled live from the app's CSS theme variables, so it
 *    re-skins itself for every theme (dark / ember / ocean / forest / …).
 *
 * It sits behind all UI (position: fixed, z-index 0 inside .app) and never
 * captures pointer events. Honours prefers-reduced-motion by rendering a
 * single static frame.
 */

// ── Shared, mutable input state (updated by listeners, read in the render loop)
const input = {
  scrollVel: 0,   // decaying scroll velocity
  pointerX: 0,    // -1 … 1
  pointerY: 0,    // -1 … 1
  tiltX: 0,       // device orientation, normalised
  tiltY: 0,
}

// ── GLSL: Ashima 3D simplex noise (public domain) ────────────────────────────
const SIMPLEX = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

const AURORA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

const AURORA_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec2  uPointer;
  uniform vec3  uBase;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform float uIntensity;
  uniform float uAspect;
  ${SIMPLEX}

  // One flowing aurora ribbon at vertical position pos with given width.
  // ys raises the vertical noise frequency on tall (portrait) screens so the
  // ribbons read as proportional flow instead of stretched, smeared bands.
  // On landscape (uAspect >= 1) ys is 1.0, so desktop is unchanged.
  float ribbon(vec2 uv, float pos, float width, float t){
    float ys = max(1.0, 1.0 / uAspect);
    float warp = snoise(vec3(uv.x * 1.6, uv.y * 0.8 * ys + t * 0.05, t * 0.12)) * 0.32;
    float wave = snoise(vec3(uv.x * 2.4 + t * 0.18, t * 0.22, 4.0)) * 0.18;
    float d = uv.y - pos - warp - wave;
    float band = smoothstep(width, 0.0, abs(d));
    // vertical streaks within the ribbon for that shimmering curtain look
    float streak = 0.6 + 0.4 * snoise(vec3(uv.x * 14.0, uv.y * 3.0 * ys - t * 0.6, t * 0.3));
    return band * streak;
  }

  void main(){
    vec2 uv = vUv;
    uv.x += uPointer.x * 0.04;
    uv.y += uPointer.y * 0.03;
    float t = uTime + uScroll * 0.9;

    // subtle vertical depth gradient on the base colour
    vec3 col = mix(uBase * 0.82, uBase * 1.06, uv.y);

    float r1 = ribbon(uv, 0.32 + sin(t * 0.10) * 0.05, 0.26, t);
    float r2 = ribbon(uv, 0.58 + sin(t * 0.13 + 1.7) * 0.06, 0.20, t * 1.15 + 10.0);
    float r3 = ribbon(uv, 0.78 + sin(t * 0.08 + 3.1) * 0.04, 0.16, t * 0.85 + 22.0);

    col += uColorA * r1 * 0.85 * uIntensity;
    col += uColorB * r2 * 0.95 * uIntensity;
    col += uColorC * r3 * 0.75 * uIntensity;

    // soft glow lift where ribbons overlap
    float glow = (r1 + r2 + r3);
    col += mix(uColorA, uColorB, uv.x) * glow * glow * 0.10 * uIntensity;

    // gentle vignette so edges fall into depth
    float vig = smoothstep(1.25, 0.25, distance(vUv, vec2(0.5)));
    col *= 0.86 + 0.14 * vig;

    gl_FragColor = vec4(col, 1.0);
  }
`

function readThemeColors() {
  const cs = getComputedStyle(document.documentElement)
  const get = (name, fallback) => {
    const v = cs.getPropertyValue(name).trim()
    return new THREE.Color(v || fallback)
  }
  return {
    base:   get('--cream', '#10130f'),
    colorA: get('--sage', '#83a878'),
    colorB: get('--slate', '#7fa9bc'),
    colorC: get('--gold', '#d2a257'),
    light:  get('--sage-dark', '#a8c89f'),
  }
}

function Aurora({ colors, reduced, intensity = 1 }) {
  const matRef = useRef()
  const meshRef = useRef()
  const { viewport } = useThree()

  const uniforms = useMemo(() => ({
    uTime:      { value: 0 },
    uScroll:    { value: 0 },
    uPointer:   { value: new THREE.Vector2(0, 0) },
    uBase:      { value: colors.base.clone() },
    uColorA:    { value: colors.colorA.clone() },
    uColorB:    { value: colors.colorB.clone() },
    uColorC:    { value: colors.colorC.clone() },
    uIntensity: { value: intensity },
    uAspect:    { value: 1 },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-skin (and re-tune intensity) when the theme or variant changes
  useEffect(() => {
    uniforms.uBase.value.copy(colors.base)
    uniforms.uColorA.value.copy(colors.colorA)
    uniforms.uColorB.value.copy(colors.colorB)
    uniforms.uColorC.value.copy(colors.colorC)
    uniforms.uIntensity.value = intensity
    uniforms.uAspect.value = viewport.width / viewport.height
  }, [colors, intensity, uniforms, viewport.width, viewport.height])

  useFrame((state, delta) => {
    const u = matRef.current?.uniforms
    if (!u) return
    if (!reduced) {
      u.uTime.value += delta * 0.5
      u.uScroll.value += input.scrollVel * 0.04
    }
    u.uPointer.value.set(input.pointerX + input.tiltX, input.pointerY + input.tiltY)
  })

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]} position={[0, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={AURORA_VERT}
        fragmentShader={AURORA_FRAG}
        depthWrite={false}
      />
    </mesh>
  )
}

function Particles({ colors, count, reduced }) {
  const pointsRef = useRef()
  const groupRef = useRef()
  const matRef = useRef()
  const { viewport } = useThree()

  const { positions, speeds, sizes, spread } = useMemo(() => {
    const spread = { x: Math.max(viewport.width, 8) * 0.75, y: Math.max(viewport.height, 8) * 0.85 }
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() * 2 - 1) * spread.x
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * spread.y
      positions[i * 3 + 2] = Math.random() * 4 - 1 // depth: -1 … 3
      speeds[i] = 0.15 + Math.random() * 0.5
      sizes[i]  = 0.02 + Math.random() * 0.06
    }
    return { positions, speeds, sizes, spread }
  }, [count, viewport.width, viewport.height])

  const texture = useMemo(() => {
    const s = 64
    const c = document.createElement('canvas')
    c.width = c.height = s
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const tex = new THREE.CanvasTexture(c)
    return tex
  }, [])

  // Recolour particles when the theme changes so no stale tint from the
  // previous theme lingers in the additive point sprites.
  useEffect(() => {
    if (matRef.current) matRef.current.color.copy(colors.light)
  }, [colors])

  useFrame((state, delta) => {
    const grp = groupRef.current
    if (grp) {
      // parallax tilt — particles lean with pointer / device for depth
      const tx = (input.pointerX + input.tiltX)
      const ty = (input.pointerY + input.tiltY)
      grp.rotation.y += ((tx * 0.35) - grp.rotation.y) * 0.05
      grp.rotation.x += ((-ty * 0.30) - grp.rotation.x) * 0.05
      grp.position.x += ((tx * 1.2) - grp.position.x) * 0.04
    }

    if (reduced) return
    const geo = pointsRef.current?.geometry
    if (!geo) return
    const pos = geo.attributes.position.array
    const boost = 1 + Math.min(Math.abs(input.scrollVel) * 6, 9)
    const dir = input.scrollVel >= 0 ? 1 : -1
    for (let i = 0; i < count; i++) {
      const iy = i * 3 + 1
      pos[iy] += speeds[i] * delta * boost * dir
      // gentle horizontal sway
      pos[i * 3] += Math.sin(state.clock.elapsedTime * 0.4 + i) * delta * 0.05
      if (pos[iy] > spread.y) pos[iy] = -spread.y
      else if (pos[iy] < -spread.y) pos[iy] = spread.y
    }
    geo.attributes.position.needsUpdate = true
  })

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
          <bufferAttribute attach="attributes-size" array={sizes} count={count} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          ref={matRef}
          map={texture}
          color={colors.light}
          size={0.16}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

export default function AuroraBackground({ theme, variant = 'app' }) {
  const isOverlay = variant === 'overlay'
  const [colors, setColors] = useState(null)
  const reduced = useMemo(
    () => typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const isMobile = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches,
    []
  )

  // Read theme colours after the CSS variables for `theme` are applied.
  useEffect(() => {
    const id = requestAnimationFrame(() => setColors(readThemeColors()))
    return () => cancelAnimationFrame(id)
  }, [theme])

  // Global interaction listeners — scroll velocity, pointer, device tilt.
  useEffect(() => {
    if (reduced) return
    let lastY = window.scrollY
    let raf = 0

    const onScroll = () => {
      const y = window.scrollY
      input.scrollVel += (y - lastY) * 0.01
      lastY = y
    }
    const onPointer = (e) => {
      input.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      input.pointerY = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    const onOrient = (e) => {
      if (e.gamma == null || e.beta == null) return
      input.tiltX = Math.max(-1, Math.min(1, e.gamma / 45))
      input.tiltY = Math.max(-1, Math.min(1, (e.beta - 45) / 45))
    }
    // decay scroll velocity each frame so motion settles after scrolling stops
    const decay = () => {
      input.scrollVel *= 0.92
      if (Math.abs(input.scrollVel) < 0.0001) input.scrollVel = 0
      raf = requestAnimationFrame(decay)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    if (!isMobile) window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('deviceorientation', onOrient, true)
    raf = requestAnimationFrame(decay)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('deviceorientation', onOrient)
      cancelAnimationFrame(raf)
    }
  }, [reduced, isMobile])

  if (!colors) {
    return <div aria-hidden="true" style={layerStyle(null, isOverlay)} />
  }

  return (
    <div aria-hidden="true" style={layerStyle(colors, isOverlay)}>
      <Canvas
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 5], fov: 60 }}
        frameloop={reduced ? 'demand' : 'always'}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={[colors.base.getStyle()]} key={colors.base.getStyle()} />
        <Aurora colors={colors} reduced={reduced} intensity={isOverlay ? 1.5 : 1} />
        <Particles colors={colors} count={Math.round((isMobile ? 180 : 520) * (isOverlay ? 1.35 : 1))} reduced={reduced} />
      </Canvas>
    </div>
  )
}

// `app` variant sits fixed behind the whole UI (z-index -1); `overlay` fills
// its positioned parent (e.g. the sign-in gate) so the card can sit above it.
function layerStyle(colors, isOverlay) {
  return {
    position: isOverlay ? 'absolute' : 'fixed',
    inset: 0,
    zIndex: isOverlay ? 0 : -1,
    pointerEvents: 'none',
    background: colors ? colors.base.getStyle() : 'var(--cream)',
  }
}
