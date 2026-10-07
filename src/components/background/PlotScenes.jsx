import { useEffect, useRef } from 'react'
import { rgba } from '../../theme'
import { useLoop } from '../../hooks'
import { MLP } from '../../ml/mlp'
import { blobs, moons } from '../../ml/datasets'
import { advanceDescent, freshDescent, makeDescent } from '../../ml/descent'
import { advanceLogistic, makeLogistic, reinitLogistic, sigmoid } from '../../ml/logistic'
import { drawField, drawPoints, MONO, prepCanvas, scale } from '../../ml/plot'

// Full-viewport 2D background scenes. Each runs only while its section is
// near the viewport and sets its own opacity from the stage's weight.

export function useScene(active, weight, render, onStart) {
  const wrap = useRef()
  useEffect(() => {
    if (active) onStart?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
  const canvas = useRef()
  const caption = useRef()
  useLoop((dt, t) => {
    if (!wrap.current || !canvas.current) return
    const o = weight()
    wrap.current.style.opacity = String(o)
    if (o < 0.005) return
    const { ctx, w, h } = prepCanvas(canvas.current)
    const text = render(ctx, w, h, dt, t)
    if (caption.current && text) caption.current.textContent = text
  }, active)
  useEffect(() => {
    if (!active && wrap.current) wrap.current.style.opacity = '0'
  }, [active])
  return { wrap, canvas, caption }
}

export function Layer({ refs }) {
  return (
    <div ref={refs.wrap} className="bg-layer" style={{ opacity: 0 }}>
      <canvas ref={refs.canvas} />
      <span ref={refs.caption} className="bg-layer__caption mono" />
    </div>
  )
}

// A square data domain scaled to cover the viewport, biased to the right.
function coverScales(w, h, domain) {
  const size = Math.max(w * 0.72, h * 0.9)
  const cx = w > 900 ? w * 0.6 : w / 2
  const cy = h / 2
  return {
    size,
    sx: scale(domain[0], domain[1], cx - size / 2, cx + size / 2),
    sy: scale(domain[0], domain[1], cy + size / 2, cy - size / 2),
  }
}

// --- projects: a neural network's decision boundary forming --------------
const BOUNDARY_DOMAIN = [-1.35, 1.35]
const BOUNDARY_EPOCHS = 500
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

// Trains one epoch per frame; when a run ends, the weights glide to a new
// random initialization so the boundary dissolves smoothly instead of jumping.
function freshBoundary(seed) {
  return { seed, data: moons(seed, 200, 0.1), net: new MLP([2, 6, 6, 2], 'tanh', seed * 7), epoch: 0, loss: Math.log(2), acc: 0.5, rewind: null, clock: 0 }
}

function advanceBoundary(s, dt) {
  if (s.rewind) {
    const r = s.rewind
    r.t = Math.min(1, r.t + dt / 1.5)
    const e = ease(r.t)
    s.net.W.forEach((Wl, l) =>
      Wl.forEach((row, j) => row.forEach((_, i) => (row[i] = r.from.W[l][j][i] + (r.to.W[l][j][i] - r.from.W[l][j][i]) * e))),
    )
    s.net.b.forEach((bl, l) => bl.forEach((_, j) => (bl[j] = r.from.b[l][j] + (r.to.b[l][j] - r.from.b[l][j]) * e)))
    if (r.t >= 1) {
      s.rewind = null
      s.epoch = 0
    }
    return
  }
  s.clock += dt
  while (s.clock >= 1 / 60) {
    s.clock -= 1 / 60
    const r = s.net.step(s.data, 0.3, 0.001)
    s.epoch++
    s.loss = r.loss
    s.acc = r.acc
  }
  if (s.epoch >= BOUNDARY_EPOCHS) {
    s.seed++
    const fresh = new MLP(s.net.sizes, 'tanh', s.seed * 7)
    const copy = (net) => ({ W: net.W.map((Wl) => Wl.map((row) => row.slice())), b: net.b.map((bl) => bl.slice()) })
    s.rewind = { from: copy(s.net), to: copy(fresh), t: 0 }
  }
}

export function BoundaryBg({ active, weight, pal, reduced }) {
  const sim = useRef(null)

  const refs = useScene(active, weight, (ctx, w, h, dt) => {
    if (!sim.current) sim.current = freshBoundary(1)
    const s = sim.current
    if (!reduced) advanceBoundary(s, dt)
    const { size, sx, sy } = coverScales(w, h, BOUNDARY_DOMAIN)
    drawField(ctx, (x, y) => s.net.predict(x, y), sx, sy, BOUNDARY_DOMAIN, pal, Math.round(size / 32))
    drawPoints(ctx, s.data, sx, sy, pal, 5)
    return s.rewind
      ? 'mlp 2-6-6-2 · moons · re-initializing weights'
      : `mlp 2-6-6-2 · moons · epoch ${s.epoch} · loss ${s.loss.toFixed(3)} · acc ${(s.acc * 100).toFixed(0)}%`
  }, () => {
    sim.current = freshBoundary((sim.current?.seed ?? 0) + 1)
  })
  return <Layer refs={refs} />
}

// --- skills: logistic regression on a sigmoid ----------------------------
const Z_RANGE = [-6, 6]

export function LogisticBg({ active, weight, pal, reduced }) {
  const sim = useRef(null)

  const refs = useScene(active, weight, (ctx, w, h, dt) => {
    if (!sim.current) sim.current = makeLogistic(blobs(2, 140, 0.32), 2)
    const s = sim.current
    if (!reduced) advanceLogistic(s, dt)
    const v = s.view

    const l = w * 0.12
    const r = w * 0.88
    const top = h * 0.24
    const bot = h * 0.76
    const sx = scale(Z_RANGE[0], Z_RANGE[1], l, r)
    const sy = scale(0, 1, bot, top)

    ctx.strokeStyle = rgba(pal.text, 0.25)
    ctx.lineWidth = 1
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    for (const v of [0, 0.5, 1]) {
      ctx.moveTo(l, sy(v))
      ctx.lineTo(r, sy(v))
    }
    ctx.moveTo(sx(0), top - 20)
    ctx.lineTo(sx(0), bot + 20)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = pal.faint
    ctx.font = MONO
    ctx.textBaseline = 'bottom'
    ctx.fillText('σ(z) = 1', l, sy(1) - 6)
    ctx.fillText('0.5', l, sy(0.5) - 6)
    ctx.fillText('0', l, sy(0) - 6)

    ctx.beginPath()
    for (let k = 0; k <= 240; k++) {
      const z = Z_RANGE[0] + (k / 240) * (Z_RANGE[1] - Z_RANGE[0])
      if (k === 0) ctx.moveTo(sx(z), sy(sigmoid(z)))
      else ctx.lineTo(sx(z), sy(sigmoid(z)))
    }
    ctx.strokeStyle = pal.accent
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.lineWidth = 1.5
    ctx.strokeStyle = pal.bg
    for (const p of s.data) {
      const z = Math.max(Z_RANGE[0], Math.min(Z_RANGE[1], v.w[0] * p.x + v.w[1] * p.y + v.b))
      ctx.beginPath()
      ctx.arc(sx(z), sy(sigmoid(z)), 5, 0, Math.PI * 2)
      ctx.fillStyle = p.c ? pal.accent : pal.text
      ctx.fill()
      ctx.stroke()
    }
    const sign = (v) => `${v < 0 ? '−' : '+'} ${Math.abs(v).toFixed(2)}`
    return `logistic regression · p = σ(${v.w[0].toFixed(2)}·x₁ ${sign(v.w[1])}·x₂ ${sign(v.b)}) · step ${s.step}`
  }, () => {
    if (sim.current) reinitLogistic(sim.current)
  })
  return <Layer refs={refs} />
}

// --- contact: linear regression fitting by gradient descent --------------
const X_DOMAIN = [-0.5, 10.5]
const Y_DOMAIN = [-4, 34]

export function RegressionBg({ active, weight, pal, reduced }) {
  const sim = useRef(null)

  const refs = useScene(active, weight, (ctx, w, h, dt) => {
    if (!sim.current) sim.current = makeDescent(4)
    const s = sim.current
    if (!reduced) advanceDescent(s, dt)
    const { m, b } = s.view

    const sx = scale(X_DOMAIN[0], X_DOMAIN[1], w * 0.1, w * 0.9)
    const sy = scale(Y_DOMAIN[0], Y_DOMAIN[1], h * 0.82, h * 0.18)

    ctx.strokeStyle = rgba(pal.text, 0.35)
    ctx.setLineDash([3, 4])
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const p of s.data) {
      ctx.moveTo(sx(p.x), sy(p.y))
      ctx.lineTo(sx(p.x), sy(m * p.x + b))
    }
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = pal.accent
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(sx(X_DOMAIN[0]), sy(m * X_DOMAIN[0] + b))
    ctx.lineTo(sx(X_DOMAIN[1]), sy(m * X_DOMAIN[1] + b))
    ctx.stroke()

    ctx.strokeStyle = pal.bg
    ctx.lineWidth = 1.5
    for (const p of s.data) {
      ctx.beginPath()
      ctx.arc(sx(p.x), sy(p.y), 5, 0, Math.PI * 2)
      ctx.fillStyle = pal.text
      ctx.fill()
      ctx.stroke()
    }
    return `linear regression · y = ${m.toFixed(2)}x + ${b.toFixed(2)} · MSE ${s.mse(m, b).toFixed(2)} · step ${s.history.length - 1}`
  }, () => {
    if (sim.current) freshDescent(sim.current)
  })
  return <Layer refs={refs} />
}
