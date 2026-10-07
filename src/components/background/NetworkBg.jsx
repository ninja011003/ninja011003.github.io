import { useEffect, useRef } from 'react'
import { rgba } from '../../theme'
import { MLP } from '../../ml/mlp'
import { moons } from '../../ml/datasets'

// Background scene: a network replaying its training on a loop.
// Weights are snapshotted while training up front, and the scene steps through
// them over time. Signals alternate between a forward pass and backprop.

const SIZES = [2, 6, 8, 8, 6, 2]
const EPOCHS = 600
const SNAP_EVERY = 5
const MAX_PARTICLES = 170
const TRAIN_SECONDS = 9.5
const CYCLE_SECONDS = 13
const PHASE_SECONDS = 1.6
const SPAWN_PER_SECOND = 16

const TOTAL_SNAPS = EPOCHS / SNAP_EVERY + 1

// Trained once per page load, in ~6 ms slices on timers. Timers keep firing
// while the page scrolls (idle callbacks don't), and the slices are small
// enough not to drop frames. Snapshots become usable as soon as they exist.
const model = { data: moons(3, 160, 0.12), net: null, snaps: [], epoch: 0, started: false }

function saveSnapshot(loss) {
  const { net } = model
  model.snaps.push({ epoch: model.epoch, loss, W: net.W.map((W) => W.map((row) => row.slice())), b: net.b.map((b) => b.slice()) })
}

function startTraining() {
  if (model.started) return
  model.started = true
  model.net = new MLP(SIZES, 'tanh', 5)
  saveSnapshot(Math.log(2))
  const slice = () => {
    const t0 = performance.now()
    while (model.epoch < EPOCHS && performance.now() - t0 < 6) {
      const { loss } = model.net.step(model.data, 0.3, 0.0005)
      model.epoch++
      if (model.epoch % SNAP_EVERY === 0) saveSnapshot(loss)
    }
    if (model.epoch < EPOCHS) setTimeout(slice, 0)
  }
  setTimeout(slice, 0)
}

const smoothstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

function bezier(e, t) {
  const u = 1 - t
  const xm = (e.x1 + e.x2) / 2
  return [
    u * u * u * e.x1 + 3 * u * u * t * xm + 3 * u * t * t * xm + t * t * t * e.x2,
    u * u * u * e.y1 + 3 * u * u * t * e.y1 + 3 * u * t * t * e.y2 + t * t * t * e.y2,
  ]
}

export default function NetworkBg({ active, weight, pal, reduced }) {
  const wrap = useRef()
  const canvas = useRef()
  const hud = useRef()
  const palRef = useRef(pal)
  palRef.current = pal
  const weightRef = useRef(weight)
  weightRef.current = weight

  // start training at page load, independent of when the section is reached
  useEffect(startTraining, [])

  useEffect(() => {
    if (!active) {
      if (wrap.current) wrap.current.style.opacity = '0'
      return
    }
    const cvs = canvas.current
    const ctx = cvs.getContext('2d')
    const L = SIZES.length - 1
    let layout = null
    let raf
    let elapsed = 0
    let spawnAcc = 0
    let last = performance.now()
    const particles = []
    const flash = SIZES.map((n) => new Float32Array(n))

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      cvs.width = Math.round(w * dpr)
      cvs.height = Math.round(h * dpr)
      cvs.style.width = `${w}px`
      cvs.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const left = w * 0.12
      const right = w * 0.88
      const top = h * 0.22
      const bottom = h * 0.82
      const xs = SIZES.map((_, l) => left + (l * (right - left)) / L)
      const ys = SIZES.map((n) => Array.from({ length: n }, (_, k) => (n === 1 ? (top + bottom) / 2 : top + (k * (bottom - top)) / (n - 1))))
      const edges = []
      const out = SIZES.map((n) => Array.from({ length: n }, () => []))
      const inc = SIZES.map((n) => Array.from({ length: n }, () => []))
      for (let l = 0; l < L; l++) {
        for (let j = 0; j < SIZES[l + 1]; j++) {
          for (let i = 0; i < SIZES[l]; i++) {
            const e = { l, i, j, x1: xs[l], y1: ys[l][i], x2: xs[l + 1], y2: ys[l + 1][j], w: 0, m: 0 }
            out[l][i].push(edges.length)
            inc[l + 1][j].push(edges.length)
            edges.push(e)
          }
        }
      }
      layout = { w, h, xs, ys, edges, out, inc, r: Math.max(4, Math.min(8, w / 160)) }
    }
    resize()
    window.addEventListener('resize', resize)

    // pick the next edge to follow, weighted by |w|
    const pick = (ids) => {
      if (!ids.length) return -1
      let total = 0
      for (const id of ids) total += layout.edges[id].m + 0.2
      let r = Math.random() * total
      for (const id of ids) {
        r -= layout.edges[id].m + 0.2
        if (r <= 0) return id
      }
      return ids[ids.length - 1]
    }

    const spawn = (dir) => {
      if (particles.length >= MAX_PARTICLES) return
      if (dir > 0) {
        const node = Math.floor(Math.random() * SIZES[0])
        const id = pick(layout.out[0][node])
        if (id >= 0) particles.push({ id, t: 0, dir })
      } else {
        const node = Math.floor(Math.random() * SIZES[L])
        const id = pick(layout.inc[L][node])
        if (id >= 0) particles.push({ id, t: 1, dir })
      }
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const P = palRef.current
      const { w, h, edges } = layout
      ctx.clearRect(0, 0, w, h)

      elapsed += dt
      // training replays over the scene's slot; signals alternate between a
      // forward pass and backpropagation on a fixed beat
      const phase = Math.floor(elapsed / PHASE_SECONDS) % 2 === 0 ? 1 : -1

      const opacity = weightRef.current()
      if (wrap.current) wrap.current.style.opacity = String(opacity)
      const vis = 1
      if (!model.snaps.length || opacity <= 0.005) return

      // train, hold the trained network briefly, then smoothly un-train and repeat
      const c = elapsed % CYCLE_SECONDS
      const progress =
        c < TRAIN_SECONDS ? smoothstep(0.4, TRAIN_SECONDS, c) : c < TRAIN_SECONDS + 2 ? 1 : 1 - smoothstep(TRAIN_SECONDS + 2, CYCLE_SECONDS, c)
      const fi = Math.min(progress * (TOTAL_SNAPS - 1), model.snaps.length - 1)
      const s0 = model.snaps[Math.floor(fi)]
      const s1 = model.snaps[Math.min(Math.ceil(fi), model.snaps.length - 1)]
      const f = fi - Math.floor(fi)

      let maxW = 1e-6
      for (const e of edges) {
        const a = s0.W[e.l][e.j][e.i]
        e.w = a + (s1.W[e.l][e.j][e.i] - a) * f
        maxW = Math.max(maxW, Math.abs(e.w))
      }
      for (const e of edges) e.m = Math.abs(e.w) / maxW

      // forward pass of one sample (changes over time) for node activations
      const sample = model.data[Math.floor(elapsed * 1.2) % model.data.length]
      let act = [sample.x, sample.y]
      const acts = [act]
      for (let l = 0; l < L; l++) {
        const next = []
        for (let j = 0; j < SIZES[l + 1]; j++) {
          let z = s0.b[l][j] + (s1.b[l][j] - s0.b[l][j]) * f
          for (let i = 0; i < SIZES[l]; i++) {
            const a = s0.W[l][j][i]
            z += (a + (s1.W[l][j][i] - a) * f) * act[i]
          }
          next.push(Math.tanh(z))
        }
        act = next
        acts.push(act)
      }

      const strength = P.light ? 0.85 : 0.8
      const flashScale = 0.6

      // edges
      ctx.lineCap = 'round'
      for (const e of edges) {
        const xm = (e.x1 + e.x2) / 2
        ctx.beginPath()
        ctx.moveTo(e.x1, e.y1)
        ctx.bezierCurveTo(xm, e.y1, xm, e.y2, e.x2, e.y2)
        ctx.strokeStyle = rgba(e.w > 0 ? P.accent : P.text, (0.04 + e.m * 0.4) * strength)
        ctx.lineWidth = 0.5 + e.m * 2.6
        ctx.stroke()
      }

      // particles
      if (!reduced) {
        spawnAcc += dt * SPAWN_PER_SECOND
        while (spawnAcc >= 1) {
          spawn(phase)
          spawnAcc -= 1
        }
      }
      const speed = 1.5
      ctx.globalCompositeOperation = P.light ? 'source-over' : 'lighter'
      for (let k = particles.length - 1; k >= 0; k--) {
        const p = particles[k]
        const e = edges[p.id]
        p.t += p.dir * dt * speed
        if (p.t >= 1 || p.t <= 0) {
          const layer = p.dir > 0 ? e.l + 1 : e.l
          const node = p.dir > 0 ? e.j : e.i
          flash[layer][node] = Math.min(1, flash[layer][node] + 0.6)
          const nextIds = p.dir > 0 ? layout.out[layer]?.[node] ?? [] : layout.inc[layer]?.[node] ?? []
          const id = layer > 0 && layer < L ? pick(nextIds) : -1
          if (id < 0) {
            particles.splice(k, 1)
            continue
          }
          p.id = id
          p.t = p.dir > 0 ? 0 : 1
          continue
        }
        const [px, py] = bezier(e, p.t)
        const color = p.dir > 0 ? P.accent : P.text
        ctx.beginPath()
        ctx.arc(px, py, 1.6 + e.m * 1.8, 0, Math.PI * 2)
        ctx.fillStyle = rgba(color, 0.85 * vis)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px, py, 5 + e.m * 4, 0, Math.PI * 2)
        ctx.fillStyle = rgba(color, 0.08 * vis)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // nodes
      for (let l = 0; l <= L; l++) {
        for (let k = 0; k < SIZES[l]; k++) {
          const x = layout.xs[l]
          const yy = layout.ys[l][k]
          const a = acts[l][k]
          flash[l][k] *= Math.exp(-dt * 3)
          ctx.beginPath()
          ctx.arc(x, yy, layout.r, 0, Math.PI * 2)
          ctx.fillStyle = P.bg
          ctx.fill()
          ctx.fillStyle = rgba(a >= 0 ? P.accent : P.text, (Math.min(Math.abs(a), 1) * 0.45 + flash[l][k] * 0.5) * vis)
          ctx.fill()
          ctx.strokeStyle = rgba(P.text, (0.18 + flash[l][k] * 0.4 * (0.5 + flashScale)) * vis)
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      if (hud.current) {
        const snap = f < 0.5 ? s0 : s1
        const dir = phase > 0 ? '→ forward pass' : '← backprop'
        hud.current.textContent = `mlp 2-6-8-8-6-2 · epoch ${String(snap.epoch).padStart(3, '0')}/${EPOCHS} · loss ${snap.loss.toFixed(3)} · ${dir}`
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [active, reduced])

  return (
    <div ref={wrap} className="bg-layer" style={{ opacity: 0 }}>
      <canvas ref={canvas} />
      <span ref={hud} className="bg-layer__caption mono" />
    </div>
  )
}
