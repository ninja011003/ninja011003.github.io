import { rgba } from '../theme'

// Sizes a canvas to its CSS box at device pixel ratio and returns a cleared context.
export function prepCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  const W = Math.max(1, Math.round(rect.width * dpr))
  const H = Math.max(1, Math.round(rect.height * dpr))
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W
    canvas.height = H
  }
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)
  return { ctx, w: rect.width, h: rect.height }
}

export const scale = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)

export function niceTicks(min, max, count = 6) {
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  const ticks = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(+v.toFixed(10))
  return ticks
}

export const MONO = '10px "JetBrains Mono", ui-monospace, monospace'

export function drawAxes(ctx, { plot, sx, sy, xTicks, yTicks, pal, xLabel, yLabel, fmt = String }) {
  const { l, t, r, b } = plot
  ctx.save()
  ctx.strokeStyle = rgba(pal.text, 0.35)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(l + 0.5, t)
  ctx.lineTo(l + 0.5, b + 0.5)
  ctx.lineTo(r, b + 0.5)
  ctx.stroke()
  ctx.fillStyle = pal.faint
  ctx.font = MONO
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const v of xTicks) {
    const x = Math.round(sx(v)) + 0.5
    ctx.beginPath()
    ctx.moveTo(x, b)
    ctx.lineTo(x, b + 4)
    ctx.stroke()
    ctx.fillText(fmt(v), x, b + 7)
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const v of yTicks) {
    const y = Math.round(sy(v)) + 0.5
    ctx.beginPath()
    ctx.moveTo(l - 4, y)
    ctx.lineTo(l, y)
    ctx.stroke()
    ctx.fillText(fmt(v), l - 7, y)
  }
  if (xLabel) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(xLabel, (l + r) / 2, b + 22)
  }
  if (yLabel) {
    ctx.translate(l - 38, (t + b) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(yLabel, 0, 0)
  }
  ctx.restore()
}

// Two-class points: class 1 in the accent color, class 0 in the text color.
export function drawPoints(ctx, pts, sx, sy, pal, radius = 4) {
  ctx.lineWidth = 1.5
  ctx.strokeStyle = pal.bg
  for (const p of pts) {
    ctx.beginPath()
    ctx.arc(sx(p.x), sy(p.y), radius, 0, Math.PI * 2)
    ctx.fillStyle = p.c ? pal.accent : pal.text
    ctx.fill()
    ctx.stroke()
  }
}

// Shades a probability field: toward the accent where p > 0.5, toward text where p < 0.5.
export function drawField(ctx, predict, sx, sy, domain, pal, res = 40) {
  const [d0, d1] = domain
  const step = (d1 - d0) / res
  for (let gx = 0; gx < res; gx++) {
    for (let gy = 0; gy < res; gy++) {
      const x = d0 + (gx + 0.5) * step
      const y = d0 + (gy + 0.5) * step
      const p = predict(x, y)
      ctx.fillStyle = p > 0.5 ? rgba(pal.accent, (p - 0.5) * 2 * 0.3) : rgba(pal.text, (0.5 - p) * 2 * 0.1)
      const x0 = sx(d0 + gx * step)
      const y0 = sy(d0 + (gy + 1) * step)
      ctx.fillRect(x0, y0, sx(d0 + (gx + 1) * step) - x0 + 0.5, sy(d0 + gy * step) - y0 + 0.5)
    }
  }
  ctx.strokeStyle = rgba(pal.text, 0.05)
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let k = 0; k <= res; k++) {
    const v = d0 + k * step
    ctx.moveTo(sx(v), sy(d0))
    ctx.lineTo(sx(v), sy(d1))
    ctx.moveTo(sx(d0), sy(v))
    ctx.lineTo(sx(d1), sy(v))
  }
  ctx.stroke()
}
