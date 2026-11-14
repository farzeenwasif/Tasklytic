import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, MeshDistortMaterial, RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

const ACCENT_3D = '#34D399'
const BAR_HEIGHTS = [1.1, 1.8, 1.45, 2.7, 2.1, 0.95]
const PEAK = Math.max(...BAR_HEIGHTS)

/* One bar of the 3D chart: grows in, then gently "breathes" */
function Bar({ index, height, animate }) {
  const ref = useRef()
  const isPeak = height === PEAK
  const x = (index - (BAR_HEIGHTS.length - 1) / 2) * 0.72

  useFrame(({ clock }, delta) => {
    const mesh = ref.current
    if (!mesh) return
    const t = clock.elapsedTime
    // staggered intro, then a slow wave
    const intro = THREE.MathUtils.clamp((t - index * 0.12) / 0.9, 0, 1)
    const eased = 1 - Math.pow(1 - intro, 3)
    const wave = animate ? 1 + Math.sin(t * 0.9 + index * 0.8) * 0.07 : 1
    const target = Math.max(0.001, height * eased * wave)
    mesh.scale.y = THREE.MathUtils.damp(mesh.scale.y, target, 6, delta)
    mesh.position.y = mesh.scale.y / 2 + 0.08
  })

  return (
    <RoundedBox
      ref={ref}
      args={[0.46, 1, 0.46]}
      radius={0.09}
      smoothness={4}
      position={[x, 0.08, 0]}
      scale={[1, animate ? 0.001 : height, 1]}
    >
      <meshStandardMaterial
        color={isPeak ? ACCENT_3D : '#3f3f46'}
        emissive={ACCENT_3D}
        emissiveIntensity={isPeak ? 0.45 : 0}
        roughness={0.35}
        metalness={0.15}
      />
    </RoundedBox>
  )
}

/* Floating "task done" badge: ring + check mark */
function CheckBadge(props) {
  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2} {...props}>
      <group>
        <mesh>
          <torusGeometry args={[0.42, 0.075, 20, 64]} />
          <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.35} roughness={0.3} />
        </mesh>
        {/* check = short stroke + long stroke */}
        <mesh position={[-0.14, -0.06, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.08, 0.22, 0.08]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.086, 0.01, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.08, 0.42, 0.08]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </Float>
  )
}

/* Slowly spinning orbit ring around the chart */
function OrbitRing({ animate }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (animate && ref.current) ref.current.rotation.z += delta * 0.25
  })
  return (
    <group rotation={[Math.PI / 2.3, 0.25, 0]} position={[0, 1.3, 0]}>
      <mesh ref={ref}>
        <torusGeometry args={[3.1, 0.012, 8, 160]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
        {/* small satellite riding the ring */}
        <mesh position={[3.1, 0, 0]}>
          <sphereGeometry args={[0.09, 20, 20]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </mesh>
    </group>
  )
}

function Scene({ animate }) {
  const group = useRef()
  const pointer = useRef({ x: 0, y: 0 })
  const { viewport } = useThree()

  // Follow the mouse across the whole window, not only over the canvas
  useEffect(() => {
    if (!animate) return
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [animate])

  // Shrink the whole composition on narrow canvases (phones)
  const scale = useMemo(() => Math.min(1, viewport.width / 7.2), [viewport.width])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const targetY = -0.5 + pointer.current.x * 0.35
    const targetX = 0.12 + pointer.current.y * 0.15
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3, delta)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3, delta)
  })

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={1.8} />
      <pointLight position={[-3, 2.5, 3]} intensity={18} color="#ffffff" />
      <pointLight position={[3, -1, 2]} intensity={12} color="#a78bfa" />

      <group ref={group} scale={scale} position={[0, -1.35 * scale, 0]} rotation={[0.12, -0.5, 0]}>
        {/* platform */}
        <RoundedBox args={[5, 0.16, 1.7]} radius={0.08} smoothness={4}>
          <meshStandardMaterial color="#1d1d21" roughness={0.6} metalness={0.3} />
        </RoundedBox>
        <mesh position={[0, 0.085, 0.84]}>
          <boxGeometry args={[4.6, 0.012, 0.02]} />
          <meshBasicMaterial color={ACCENT_3D} transparent opacity={0.7} />
        </mesh>

        {BAR_HEIGHTS.map((h, i) => (
          <Bar key={i} index={i} height={h} animate={animate} />
        ))}

        <OrbitRing animate={animate} />

        {/* floating accents in the dashboard's card colours */}
        <CheckBadge position={[2.5, 3.1, 0.4]} />

        <Float speed={1.6} rotationIntensity={0.4} floatIntensity={1.4} position={[-2.6, 2.9, 0.2]}>
          <mesh>
            <sphereGeometry args={[0.5, 48, 48]} />
            <MeshDistortMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={0.25} distort={animate ? 0.4 : 0} speed={2} roughness={0.2} />
          </mesh>
        </Float>

        <Float speed={2.4} rotationIntensity={1.6} floatIntensity={1} position={[2.9, 1.2, 1.1]}>
          <mesh>
            <icosahedronGeometry args={[0.28, 0]} />
            <meshStandardMaterial color="#e4e4e7" roughness={0.35} metalness={0.2} flatShading />
          </mesh>
        </Float>

        <Float speed={2} rotationIntensity={1.2} floatIntensity={1.2} position={[-2.9, 0.9, 1]}>
          <mesh>
            <octahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={0.25} roughness={0.3} flatShading />
          </mesh>
        </Float>
      </group>

      <Sparkles count={70} scale={[10, 6, 4]} size={2} speed={animate ? 0.35 : 0} color="#ffffff" opacity={0.35} />
    </>
  )
}

/**
 * 3D hero: an animated bar chart with floating accents.
 * Lazy-loaded so three.js stays out of the main bundle.
 */
export default function HeroScene({ animate = true }) {
  return (
    <Canvas
      camera={{ position: [0, 1.4, 8], fov: 40 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={animate ? 'always' : 'demand'}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <Scene animate={animate} />
    </Canvas>
  )
}
