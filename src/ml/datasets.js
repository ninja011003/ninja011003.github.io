import { gaussian, mulberry32 } from './rng'

// Classification sets are centered and scaled to roughly [-1, 1].
function normalize(pts) {
  const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const my = pts.reduce((s, p) => s + p.y, 0) / pts.length
  const m = Math.max(...pts.map((p) => Math.max(Math.abs(p.x - mx), Math.abs(p.y - my))))
  return pts.map((p) => ({ x: (p.x - mx) / m, y: (p.y - my) / m, c: p.c }))
}

export function moons(seed = 1, n = 160, noise = 0.1) {
  const r = mulberry32(seed)
  const pts = []
  for (let i = 0; i < n; i++) {
    const c = i % 2
    const t = r() * Math.PI
    const x = c ? 1 - Math.cos(t) : Math.cos(t)
    const y = c ? 0.5 - Math.sin(t) : Math.sin(t)
    pts.push({ x: x + gaussian(r) * noise, y: y + gaussian(r) * noise, c })
  }
  return normalize(pts)
}

export function circles(seed = 1, n = 160, noise = 0.08) {
  const r = mulberry32(seed)
  const pts = []
  for (let i = 0; i < n; i++) {
    const c = i % 2
    const t = r() * Math.PI * 2
    const rad = c ? 0.35 : 1
    pts.push({ x: Math.cos(t) * rad + gaussian(r) * noise, y: Math.sin(t) * rad + gaussian(r) * noise, c })
  }
  return normalize(pts)
}

export function xor(seed = 1, n = 160) {
  const r = mulberry32(seed)
  const pts = []
  while (pts.length < n) {
    const x = r() * 2 - 1
    const y = r() * 2 - 1
    if (Math.abs(x) < 0.1 || Math.abs(y) < 0.1) continue
    pts.push({ x, y, c: x * y > 0 ? 1 : 0 })
  }
  return normalize(pts)
}

export function blobs(seed = 1, n = 120, spread = 0.3) {
  const r = mulberry32(seed)
  const pts = []
  for (let i = 0; i < n; i++) {
    const c = i % 2
    pts.push({
      x: (c ? 0.45 : -0.45) + gaussian(r) * spread,
      y: (c ? 0.4 : -0.4) + gaussian(r) * spread,
      c,
    })
  }
  return pts
}

// y = 2.2x + 3 with noise, x in [0, 10].
export function linear(seed = 1, n = 50) {
  const r = mulberry32(seed)
  return Array.from({ length: n }, () => {
    const x = r() * 10
    return { x, y: 2.2 * x + 3 + gaussian(r) * 2.4 }
  })
}
