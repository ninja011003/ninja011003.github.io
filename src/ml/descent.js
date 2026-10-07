import { linear } from './datasets'
import { mulberry32 } from './rng'

// Gradient descent on y = m·x + b with MSE loss, using the data's moments so
// the loss and gradient for any (m, b) are O(1).
export function makeDescent(seed) {
  const data = linear(seed)
  const n = data.length
  const mean = (f) => data.reduce((s, p) => s + f(p), 0) / n
  const Ex = mean((p) => p.x)
  const Ey = mean((p) => p.y)
  const Exx = mean((p) => p.x * p.x)
  const Exy = mean((p) => p.x * p.y)
  const Eyy = mean((p) => p.y * p.y)
  const mse = (m, b) => m * m * Exx + b * b + Eyy + 2 * m * b * Ex - 2 * m * Exy - 2 * b * Ey
  const grad = (m, b) => [2 * (m * Exx + b * Ex - Exy), 2 * (m * Ex + b - Ey)]
  const mStar = (Exy - Ex * Ey) / (Exx - Ex * Ex)
  const sim = {
    seed,
    data,
    mse,
    grad,
    minMse: mse(mStar, Ey - mStar * Ex),
    mRange: [-1, 5.5],
    bRange: [-8, 16],
    round: 0,
  }
  restartDescent(sim)
  return sim
}

export function restartDescent(sim) {
  const r = mulberry32(sim.seed * 97 + sim.round)
  // alternate sides of the valley so each run takes a different path
  const start = sim.round % 2 === 0 ? { m: -0.8 + r() * 0.8, b: 11 + r() * 4 } : { m: 4.3 + r() * 0.8, b: -5.5 + r() * 3 }
  sim.round++
  sim.m = start.m
  sim.b = start.b
  sim.history = [{ m: sim.m, b: sim.b, loss: sim.mse(sim.m, sim.b) }]
  sim.view = { m: sim.m, b: sim.b }
}

export function descentStep(sim, lr = 0.012) {
  const [gm, gb] = sim.grad(sim.m, sim.b)
  sim.m -= lr * gm
  sim.b -= lr * gb
  sim.history.push({ m: sim.m, b: sim.b, loss: sim.mse(sim.m, sim.b) })
}

const REWIND_SECONDS = 1.2
const STEP_RATE = 36 // gradient steps per second, independent of frame rate
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

// Advances by dt seconds. Steps run at a fixed rate and `sim.view` is
// interpolated between the last two steps, so motion stays smooth at any
// frame rate. When a run ends, the parameters glide back to a fresh start.
export function advanceDescent(sim, dt, maxSteps = 320, lr = 0.012) {
  if (sim.rewind) {
    const r = sim.rewind
    r.t = Math.min(1, r.t + dt / REWIND_SECONDS)
    const e = ease(r.t)
    sim.m = r.from.m + (r.to.m - r.from.m) * e
    sim.b = r.from.b + (r.to.b - r.from.b) * e
    sim.history = [{ m: sim.m, b: sim.b, loss: sim.mse(sim.m, sim.b) }]
    sim.view = { m: sim.m, b: sim.b }
    if (r.t >= 1) {
      sim.rewind = null
      sim.prev = { m: sim.m, b: sim.b }
      sim.clock = 0
    }
    return
  }
  if (!sim.prev) sim.prev = { m: sim.m, b: sim.b }
  sim.clock = (sim.clock || 0) + dt
  const interval = 1 / STEP_RATE
  while (sim.clock >= interval) {
    sim.clock -= interval
    sim.prev = { m: sim.m, b: sim.b }
    descentStep(sim, lr)
    if (sim.history.length > maxSteps) {
      const from = { m: sim.m, b: sim.b }
      restartDescent(sim)
      sim.rewind = { from, to: { m: sim.m, b: sim.b }, t: 0 }
      sim.m = from.m
      sim.b = from.b
      sim.view = { ...from }
      return
    }
  }
  const a = sim.clock / interval
  sim.view = { m: sim.prev.m + (sim.m - sim.prev.m) * a, b: sim.prev.b + (sim.b - sim.prev.b) * a }
}

// Starts a fresh run immediately (used when a scene comes on screen).
export function freshDescent(sim) {
  restartDescent(sim)
  sim.rewind = null
  sim.prev = { m: sim.m, b: sim.b }
  sim.view = { m: sim.m, b: sim.b }
  sim.clock = 0
}
