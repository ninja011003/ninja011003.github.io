import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { advanceDescent, freshDescent, makeDescent } from '../../ml/descent'

// Background scene for the About section: the MSE loss surface of a linear
// regression, with gradient descent rolling down it.

const SIZE = 5
const SEG = 48
const HEIGHT = 2.4
const MAX_PATH = 600

function textSprite(text, color) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 48
  const ctx = c.getContext('2d')
  ctx.font = '500 26px "JetBrains Mono", monospace'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 24)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Label({ text, color, position }) {
  const tex = useMemo(() => textSprite(text, color), [text, color])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <sprite position={position} scale={[0.8, 0.3, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  )
}

function Surface({ sim, pal, pointer, weight, wrap, caption, reduced }) {
  const group = useRef()
  const ball = useRef()
  const viewport = useThree((s) => s.viewport)

  const { toX, toZ, heightAt } = useMemo(() => {
    const [m0, m1] = sim.mRange
    const [b0, b1] = sim.bRange
    const corners = [sim.mse(m0, b0), sim.mse(m0, b1), sim.mse(m1, b0), sim.mse(m1, b1)]
    // log scale between the minimum and the worst corner, so the valley reads as a bowl
    const lo = Math.log(sim.minMse)
    const hi = Math.log(Math.max(...corners))
    return {
      toX: (m) => ((m - m0) / (m1 - m0) - 0.5) * SIZE,
      toZ: (b) => (0.5 - (b - b0) / (b1 - b0)) * SIZE,
      heightAt: (m, b) => Math.max(0, (Math.log(sim.mse(m, b)) - lo) / (hi - lo)) * HEIGHT,
    }
  }, [sim])

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const low = new THREE.Color(pal.accent)
    const high = new THREE.Color(pal.accent2).lerp(new THREE.Color(pal.bg), 0.35)
    const c = new THREE.Color()
    const [m0, m1] = sim.mRange
    const [b0, b1] = sim.bRange
    for (let i = 0; i < pos.count; i++) {
      const m = m0 + (pos.getX(i) / SIZE + 0.5) * (m1 - m0)
      const b = b0 + (0.5 - pos.getZ(i) / SIZE) * (b1 - b0)
      const h = heightAt(m, b)
      pos.setY(i, h)
      c.copy(low).lerp(high, Math.min(1, (h / HEIGHT) * 1.4))
      c.toArray(colors, i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [sim, pal, heightAt])

  const path = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PATH * 3), 3))
    g.setDrawRange(0, 0)
    return g
  }, [])
  const shadow = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PATH * 3), 3))
    g.setDrawRange(0, 0)
    return g
  }, [])

  useFrame((state, delta) => {
    if (wrap.current) wrap.current.style.opacity = String(weight())
    const t = state.clock.elapsedTime
    if (!reduced) advanceDescent(sim, Math.min(delta, 0.05))
    const hist = sim.history
    const view = sim.view
    // completed steps, then the interpolated current position as the path's tip
    const stride = Math.max(1, Math.ceil(hist.length / (MAX_PATH - 1)))
    const p = path.attributes.position
    const s = shadow.attributes.position
    let n = 0
    for (let k = 0; k < hist.length - 1 && n < MAX_PATH - 1; k += stride, n++) {
      const { m, b } = hist[k]
      p.setXYZ(n, toX(m), heightAt(m, b) + 0.03, toZ(b))
      s.setXYZ(n, toX(m), 0.005, toZ(b))
    }
    p.setXYZ(n, toX(view.m), heightAt(view.m, view.b) + 0.03, toZ(view.b))
    s.setXYZ(n, toX(view.m), 0.005, toZ(view.b))
    n++
    path.setDrawRange(0, n)
    shadow.setDrawRange(0, n)
    p.needsUpdate = true
    s.needsUpdate = true

    if (ball.current) ball.current.position.set(toX(view.m), heightAt(view.m, view.b) + 0.09, toZ(view.b))
    if (group.current) {
      // frame-rate independent easing
      const g = group.current
      const wide = viewport.width > 9
      const target = -0.75 + Math.sin(t * 0.12) * 0.35 + pointer.current.x * 0.25
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target, 2.5, delta)
      g.position.x = THREE.MathUtils.damp(g.position.x, wide ? viewport.width * 0.18 : 0, 3, delta)
      g.scale.setScalar(0.85)
    }
    if (caption.current) {
      caption.current.textContent = `gradient descent · MSE(m, b) · step ${hist.length - 1} · m ${view.m.toFixed(2)} · b ${view.b.toFixed(2)} · loss ${sim.mse(view.m, view.b).toFixed(2)}`
    }
  })

  const half = SIZE / 2
  const axes = useMemo(
    () =>
      new Float32Array([
        -half, 0, half, half + 0.3, 0, half, // m axis
        -half, 0, half, -half, 0, -half - 0.3, // b axis
        -half, 0, half, -half, HEIGHT + 0.4, half, // MSE axis
      ]),
    [half],
  )

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <meshBasicMaterial vertexColors transparent opacity={0.82} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial wireframe color={pal.text} transparent opacity={pal.light ? 0.08 : 0.06} />
      </mesh>
      <gridHelper args={[SIZE, 10, pal.accent2, pal.accent2]} position={[0, 0, 0]}>
        <lineBasicMaterial attach="material" color={pal.accent2} transparent opacity={0.18} />
      </gridHelper>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[axes, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={pal.muted} />
      </lineSegments>
      <Label text="m" color={pal.muted} position={[half + 0.55, 0, half]} />
      <Label text="b" color={pal.muted} position={[-half, 0, -half - 0.55]} />
      <Label text="MSE" color={pal.muted} position={[-half, HEIGHT + 0.65, half]} />
      <line geometry={shadow}>
        <lineBasicMaterial color={pal.text} transparent opacity={0.25} />
      </line>
      <line geometry={path}>
        <lineBasicMaterial color={pal.text} />
      </line>
      <mesh ref={ball}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshBasicMaterial color={pal.text} />
      </mesh>
    </group>
  )
}

export default function DescentBg({ active, weight, pal, reduced }) {
  const wrap = useRef()
  const caption = useRef()
  const pointer = useRef({ x: 0 })
  const sim = useMemo(() => makeDescent(1), [])

  useEffect(() => {
    const onMove = (e) => (pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  useEffect(() => {
    if (active) freshDescent(sim)
    else if (wrap.current) wrap.current.style.opacity = '0'
  }, [active, sim])

  return (
    <div ref={wrap} className="bg-layer" style={{ opacity: 0 }}>
      <Canvas
        camera={{ position: [6.4, 5.2, 6.4], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={active ? 'always' : 'never'}
        onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
      >
        <Surface sim={sim} pal={pal} pointer={pointer} weight={weight} wrap={wrap} caption={caption} reduced={reduced} />
      </Canvas>
      <span ref={caption} className="bg-layer__caption mono" />
    </div>
  )
}
