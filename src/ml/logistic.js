import { gaussian, mulberry32 } from './rng'

export const sigmoid = (z) => 1 / (1 + Math.exp(-z))

export function makeLogistic(data, seed) {
  const r = mulberry32(seed * 31)
  const w = [gaussian(r) * 0.4, gaussian(r) * 0.4]
  const b = gaussian(r) * 0.2
  return { data, rng: r, w, b, step: 0, loss: Math.log(2), view: { w: w.slice(), b } }
}

export function reinitLogistic(sim) {
  sim.w = [gaussian(sim.rng) * 0.4, gaussian(sim.rng) * 0.4]
  sim.b = gaussian(sim.rng) * 0.2
  sim.step = 0
  sim.rewind = null
  sim.clock = 0
  sim.prev = null
  sim.view = { w: sim.w.slice(), b: sim.b }
}

// One mini-batch SGD step on log loss.
export function logisticStep(sim, lr = 0.35, batch = 16) {
  const { data, w, rng } = sim
  let g0 = 0
  let g1 = 0
  let gb = 0
  for (let k = 0; k < batch; k++) {
    const p = data[Math.floor(rng() * data.length)]
    const err = sigmoid(w[0] * p.x + w[1] * p.y + sim.b) - p.c
    g0 += err * p.x
    g1 += err * p.y
    gb += err
  }
  w[0] -= (lr * g0) / batch
  w[1] -= (lr * g1) / batch
  sim.b -= (lr * gb) / batch
  sim.step++
  let loss = 0
  for (const p of data) {
    const q = sigmoid(w[0] * p.x + w[1] * p.y + sim.b)
    loss -= p.c ? Math.log(Math.max(q, 1e-9)) : Math.log(Math.max(1 - q, 1e-9))
  }
  sim.loss = loss / data.length
}

const REWIND_SECONDS = 1
const STEP_SECONDS = 0.04
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

// Advances by dt seconds: mini-batch steps at a fixed rate, with `sim.view`
// interpolated between steps; then a smooth glide to new random weights.
export function advanceLogistic(sim, dt, maxSteps = 200) {
  if (sim.rewind) {
    const r = sim.rewind
    r.t = Math.min(1, r.t + dt / REWIND_SECONDS)
    const e = ease(r.t)
    sim.w = [r.from.w[0] + (r.to.w[0] - r.from.w[0]) * e, r.from.w[1] + (r.to.w[1] - r.from.w[1]) * e]
    sim.b = r.from.b + (r.to.b - r.from.b) * e
    sim.view = { w: sim.w.slice(), b: sim.b }
    if (r.t >= 1) {
      sim.rewind = null
      sim.step = 0
      sim.prev = null
      sim.clock = 0
    }
    return
  }
  if (!sim.prev) sim.prev = { w: sim.w.slice(), b: sim.b }
  sim.clock = (sim.clock || 0) + dt
  while (sim.clock >= STEP_SECONDS) {
    sim.clock -= STEP_SECONDS
    sim.prev = { w: sim.w.slice(), b: sim.b }
    logisticStep(sim)
  }
  const a = sim.clock / STEP_SECONDS
  sim.view = {
    w: [sim.prev.w[0] + (sim.w[0] - sim.prev.w[0]) * a, sim.prev.w[1] + (sim.w[1] - sim.prev.w[1]) * a],
    b: sim.prev.b + (sim.b - sim.prev.b) * a,
  }
  if (sim.step >= maxSteps) {
    const from = { w: sim.w.slice(), b: sim.b }
    reinitLogistic(sim)
    sim.rewind = { from, to: { w: sim.w.slice(), b: sim.b }, t: 0 }
    sim.w = from.w
    sim.b = from.b
    sim.view = { w: from.w.slice(), b: from.b }
  }
}
