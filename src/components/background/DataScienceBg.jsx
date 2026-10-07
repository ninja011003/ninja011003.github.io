import { useRef } from 'react'
import { rgba } from '../../theme'
import { gaussian, mulberry32 } from '../../ml/rng'
import { MONO } from '../../ml/plot'
import { Layer, useScene } from './PlotScenes'

// Background scene for the hero: one set of data points travels through a
// whole data science workflow. Each point eases toward a per-stage target,
// staggered by index, so every transition is a smooth ripple.

const STAGES = [
  { key: 'collect', dur: 2.6 },
  { key: 'clean', dur: 4.8 },
  { key: 'explore', dur: 2.8 },
  { key: 'features', dur: 2.2 },
  { key: 'model', dur: 3.4 },
  { key: 'evaluate', dur: 2.6 },
  { key: 'insight', dur: 2.6 },
]
const DISSOLVE = 1
const CYCLE = STAGES.reduce((s, st) => s + st.dur, 0) + DISSOLVE
const STAGGER = 0.55
const TABLE_COLS = 16
const BINS = 14
const KMEANS_EVERY = 0.55
// data cleaning sub-phases (seconds into the clean stage)
const SCAN_END = 1.9
const FIX_END = 3.5

function makeData(seed) {
  const r = mulberry32(seed * 101 + 7)
  const centers = [
    [-1.1, -0.7],
    [1.05, -0.45],
    [0.05, 1.0],
  ]
  const pts = []
  for (let i = 0; i < 150; i++) {
    const c = i % 3
    pts.push({ x: centers[c][0] + gaussian(r) * 0.38, y: centers[c][1] + gaussian(r) * 0.38, c, outlier: false, missing: false })
  }
  while (pts.filter((p) => p.outlier).length < 9) {
    const x = (r() * 2 - 1) * 4.6
    const y = (r() * 2 - 1) * 3.6
    if (Math.abs(x) > 3.2 || Math.abs(y) > 2.9) pts.push({ x, y, c: -1, outlier: true, missing: false })
  }
  // shuffle so the table looks like raw records
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[pts[i], pts[j]] = [pts[j], pts[i]]
  }
  let m = 0
  for (const p of pts) if (!p.outlier && m < 12 && r() < 0.12) (p.missing = true), m++

  // duplicates: exact copies of existing records inserted elsewhere in the table
  const base = pts.filter((p) => !p.outlier && !p.missing)
  for (let k = 0; k < 6; k++) {
    const o = base[Math.floor(r() * base.length)]
    pts.splice(Math.floor(r() * pts.length), 0, { x: o.x, y: o.y, c: o.c, outlier: false, missing: false, dup: true, orig: o })
  }
  pts.forEach((p, i) => {
    p.id = i
    p.kind = p.outlier ? 'outlier' : p.dup ? 'dup' : p.missing ? 'missing' : 'ok'
  })
  // label one record of each fault type while cleaning: each on its own row,
  // in the left half of the table so the label has room to its right
  const usedRows = new Set()
  for (const kind of ['missing', 'outlier', 'dup']) {
    const p = pts.find((q, i) => q.kind === kind && i % TABLE_COLS < TABLE_COLS / 2 && !usedRows.has(Math.floor(i / TABLE_COLS)))
    if (p) {
      p.tagged = true
      usedRows.add(Math.floor(pts.indexOf(p) / TABLE_COLS))
    }
  }

  const kept = pts.filter((p) => !p.outlier && !p.dup)
  const mean = (f) => kept.reduce((s, p) => s + f(p), 0) / kept.length
  const mx = mean((p) => p.x)
  const my = mean((p) => p.y)
  const sx = Math.sqrt(mean((p) => (p.x - mx) ** 2))
  const sy = Math.sqrt(mean((p) => (p.y - my) ** 2))
  kept.forEach((p, k) => {
    p.k = k
    p.zx = (p.x - mx) / sx
    p.zy = (p.y - my) / sy
  })
  for (const p of pts) if (p.outlier) p.z = Math.max(Math.abs(p.x - mx) / sx, Math.abs(p.y - my) / sy)
  const faults = { missing: m, outlier: pts.filter((p) => p.outlier).length, dup: 6 }

  // histogram stacks
  const bin = (x) => Math.max(0, Math.min(BINS - 1, Math.floor(((x - mx) / sx + 2.6) / (5.2 / BINS))))
  const counts = new Array(BINS).fill(0)
  for (const p of kept) {
    p.bin = bin(p.x)
    p.stack = counts[p.bin]++
  }

  // k-means init from three spread-out points
  const cent = [kept[0], kept[Math.floor(kept.length / 3)], kept[Math.floor((2 * kept.length) / 3)]].map((p) => ({ x: p.zx, y: p.zy }))

  // insight: a rising trend with a little noise
  const order = kept.slice().sort((a, b) => a.zx - b.zx)
  order.forEach((p, i) => {
    p.trendI = i
    p.trendY = i / order.length + gaussian(r) * 0.035 + Math.sin(i / 9) * 0.03
  })

  return { pts, kept, faults, mx, sx, counts, maxCount: Math.max(...counts), cent, centView: cent.map((c) => ({ ...c })), assign: null, iter: 0, lastIter: 0 }
}

function kmeansStep(d) {
  const assign = d.kept.map((p) => {
    let best = 0
    let bd = Infinity
    d.cent.forEach((c, k) => {
      const dist = (p.zx - c.x) ** 2 + (p.zy - c.y) ** 2
      if (dist < bd) (bd = dist), (best = k)
    })
    return best
  })
  d.cent = d.cent.map((c, k) => {
    const mem = d.kept.filter((_, i) => assign[i] === k)
    if (!mem.length) return c
    return { x: mem.reduce((s, p) => s + p.zx, 0) / mem.length, y: mem.reduce((s, p) => s + p.zy, 0) / mem.length }
  })
  d.assign = assign
  d.iter++
  // map each cluster to the majority true class, for the confusion matrix
  d.map = [0, 1, 2].map((k) => {
    const votes = [0, 0, 0]
    d.kept.forEach((p, i) => assign[i] === k && votes[p.c]++)
    return votes.indexOf(Math.max(...votes))
  })
}

// Marker shapes for faulty records. `strike` (0–1) draws a line through an
// outlier as it is being removed.
function drawFault(ctx, kind, x, y, r, color, strike) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.3
  if (kind === 'missing') {
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  } else if (kind === 'outlier') {
    const s = r + 1.6
    ctx.beginPath()
    ctx.moveTo(x, y - s)
    ctx.lineTo(x + s, y)
    ctx.lineTo(x, y + s)
    ctx.lineTo(x - s, y)
    ctx.closePath()
    ctx.stroke()
    if (strike > 0) {
      ctx.beginPath()
      ctx.moveTo(x - s - 3, y)
      ctx.lineTo(x - s - 3 + (2 * s + 6) * strike, y)
      ctx.stroke()
    }
  } else if (kind === 'dup') {
    ctx.beginPath()
    ctx.arc(x - 1.6, y - 1.6, r * 0.85, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + 1.6, y + 1.6, r * 0.85, 0, Math.PI * 2)
    ctx.stroke()
  }
}

// Plot area. On wide screens it sits to the right of the hero text, starting a
// fixed gap after wherever that text actually ends, so the two never overlap.
// Without enough room beside the text (phones, narrow windows) there is no
// plot area and the scene draws nothing.
const TEXT_GAP = 56
const MIN_PLOT_WIDTH = 340

// right edge of the rendered hero text (a Range measures the glyphs, not the
// full-width block boxes they sit in)
const range = typeof document !== 'undefined' ? document.createRange() : null
function heroTextRight() {
  let right = 0
  for (const el of document.querySelectorAll('.hero__content > *')) {
    range.selectNodeContents(el)
    right = Math.max(right, range.getBoundingClientRect().right)
  }
  return right
}

function region(w, h) {
  const l = Math.max(w * 0.5, heroTextRight() + TEXT_GAP)
  const r = w * 0.93
  if (w > 900 && r - l >= MIN_PLOT_WIDTH) return { l, r, t: h * 0.2, b: h * 0.74 }
  return null
}

export default function DataScienceBg({ active, weight, pal, reduced }) {
  const data = useRef(null)
  const clock = useRef(0)
  const seed = useRef(1)

  const refs = useScene(
    active,
    weight,
    (ctx, w, h, dt) => {
      if (!data.current) data.current = makeData(seed.current)
      const d = data.current
      if (!reduced) clock.current += dt
      let t = clock.current
      if (t >= CYCLE) {
        clock.current = t = 0
        seed.current++
        data.current = makeData(seed.current)
        return ''
      }

      // which stage, and time inside it
      let stage = STAGES.length
      let st = t
      for (let i = 0, acc = 0; i < STAGES.length; acc += STAGES[i].dur, i++) {
        if (t < acc + STAGES[i].dur) {
          stage = i
          st = t - acc
          break
        }
      }
      const key = stage < STAGES.length ? STAGES[stage].key : 'dissolve'
      const R = region(w, h)
      if (!R) return ' ' // hidden: no room beside the hero text
      const RW = R.r - R.l
      const RH = R.b - R.t
      const n = d.pts.length
      const fadeIn = (x) => Math.min(1, Math.max(0, x))

      // k-means iterations during the model stage
      if (key === 'model' && st > 0.5 && st - d.lastIter >= KMEANS_EVERY) {
        kmeansStep(d)
        d.lastIter = st
      }
      if (key === 'collect') d.lastIter = 0
      if (!d.assign && (key === 'evaluate' || key === 'insight')) kmeansStep(d)
      d.centView.forEach((c, k) => {
        const e = 1 - Math.exp(-dt * 6)
        c.x += (d.cent[k].x - c.x) * e
        c.y += (d.cent[k].y - c.y) * e
      })

      // scales shared by several stages
      const zs = Math.min(RW, RH) / 6.4
      const zcx = (R.l + R.r) / 2
      const zcy = (R.t + R.b) / 2
      const cell = Math.min(RW / TABLE_COLS, RH / Math.ceil(n / TABLE_COLS))
      const tableX0 = R.l + (RW - cell * TABLE_COLS) / 2
      const dot = Math.max(2.2, Math.min(4, cell * 0.28))
      const rows = Math.ceil(n / TABLE_COLS)
      const tableH = cell * rows
      const gridPos = (i) => ({ x: tableX0 + ((i % TABLE_COLS) + 0.5) * cell, y: R.t + (Math.floor(i / TABLE_COLS) + 0.5) * cell })
      const fix = key === 'clean' ? fadeIn((st - SCAN_END) / (FIX_END - SCAN_END)) : key === 'collect' ? 0 : 1
      const scanY = R.t + fadeIn(st / SCAN_END) * tableH

      // confusion matrix geometry
      const cm = Math.min(RW, RH) * 0.86
      const cmX = zcx - cm / 2
      const cmY = zcy - cm / 2
      const cmCell = cm / 3
      const cmCounts = {}

      d.pts.forEach((p, i) => {
        const delay = (i / n) * STAGGER
        let tx
        let ty
        let alpha = 1
        if (key === 'collect') {
          tx = tableX0 + ((i % TABLE_COLS) + 0.5) * cell
          ty = R.t + (Math.floor(i / TABLE_COLS) + 0.5) * cell
          if (p.px === undefined || st < 0.05) {
            p.px = R.r + 60 + (i % TABLE_COLS) * 8
            p.py = ty
          }
          alpha = fadeIn((st - delay * 2.2) / 0.4)
          p.detAt = undefined
        } else if (key === 'clean') {
          const home = gridPos(i)
          // scan: faults are detected as the scan line passes their row
          if (p.kind !== 'ok' && p.detAt === undefined && home.y <= scanY) p.detAt = st
          if (p.outlier) {
            // struck through, then drift out of the table and fade
            tx = home.x + (home.x > (R.l + R.r) / 2 ? 46 : -46) * fix
            ty = home.y + 26 * fix
            alpha = 1 - fadeIn((fix - 0.4) / 0.6)
          } else if (p.dup) {
            // fly onto the original record and merge into it
            tx = fix > 0 ? p.orig.px : home.x
            ty = fix > 0 ? p.orig.py : home.y
            alpha = 1 - fadeIn((fix - 0.55) / 0.45)
          } else if (st < FIX_END) {
            tx = home.x
            ty = home.y
          } else {
            const g = gridPos(p.k)
            tx = g.x
            ty = g.y
          }
        } else if (p.outlier || p.dup) {
          tx = p.px
          ty = p.py
          alpha = 0
        } else if (key === 'explore') {
          const bw = RW / BINS
          const sp = Math.min(dot * 2.4, (RH * 0.92) / d.maxCount)
          tx = R.l + (p.bin + 0.5) * bw
          ty = R.b - (p.stack + 0.5) * sp
        } else if (key === 'features' || key === 'model') {
          tx = zcx + p.zx * zs
          ty = zcy - p.zy * zs
        } else if (key === 'evaluate') {
          const pred = d.map[d.assign[p.k]]
          const id = `${p.c}-${pred}`
          const slot = (cmCounts[id] = (cmCounts[id] ?? -1) + 1)
          const sub = 8
          const sx = cmCell / (sub + 1)
          tx = cmX + pred * cmCell + ((slot % sub) + 1) * sx
          ty = cmY + p.c * cmCell + (Math.floor(slot / sub) + 1) * sx
        } else if (key === 'insight') {
          tx = R.l + (p.trendI / (d.kept.length - 1)) * RW
          ty = R.b - p.trendY * RH * 0.9
        } else {
          tx = p.px
          ty = p.py
          alpha = 1 - fadeIn(st / DISSOLVE)
        }

        if (p.px === undefined) {
          p.px = tx
          p.py = ty
        }
        const local = key === 'collect' ? st - delay * 2.2 : st - delay
        if (local > 0) {
          const e = 1 - Math.exp(-dt * 5.5)
          p.px += (tx - p.px) * e
          p.py += (ty - p.py) * e
        }
        p.alpha = alpha
      })

      // --- stage decorations (drawn under the points) ---
      const deco = (x) => fadeIn(x) * 0.9
      ctx.font = MONO
      ctx.textBaseline = 'bottom'
      if (key === 'collect' || key === 'clean') {
        const a = key === 'collect' ? deco(st / 0.6) : 0.9
        const compacted = key === 'clean' && st >= FIX_END
        const h = compacted ? cell * Math.ceil(d.kept.length / TABLE_COLS) : tableH
        ctx.strokeStyle = rgba(pal.text, 0.1 * a)
        ctx.lineWidth = 1
        ctx.strokeRect(tableX0, R.t, cell * TABLE_COLS, h)
        // faint row rules, like a spreadsheet
        ctx.strokeStyle = rgba(pal.text, 0.04 * a)
        ctx.beginPath()
        for (let k = 1; k < h / cell; k++) {
          ctx.moveTo(tableX0, R.t + k * cell)
          ctx.lineTo(tableX0 + cell * TABLE_COLS, R.t + k * cell)
        }
        ctx.stroke()

        const found = { missing: 0, outlier: 0, dup: 0 }
        for (const p of d.pts) if (p.detAt !== undefined) found[p.kind]++
        const F = d.faults
        let header = `raw records · ${n} rows · unvalidated`
        if (key === 'clean') {
          if (st < SCAN_END) header = `validating · missing ${found.missing} · outliers ${found.outlier} · duplicates ${found.dup}`
          else if (st < FIX_END) header = `fixing · impute ${F.missing} missing · drop ${F.outlier} outliers · merge ${F.dup} duplicates`
          else header = `cleaned · ${d.kept.length} rows · ${F.missing} imputed · ${F.outlier} outliers removed · ${F.dup} duplicates merged`
        }
        ctx.fillStyle = rgba(pal.text, 0.6 * a)
        ctx.fillText(header, tableX0, R.t - 8)

        // scan line sweeping the rows
        if (key === 'clean' && st < SCAN_END + 0.25) {
          const la = 1 - fadeIn((st - SCAN_END) / 0.25)
          const grad = ctx.createLinearGradient(0, scanY - 26, 0, scanY)
          grad.addColorStop(0, rgba(pal.accent, 0))
          grad.addColorStop(1, rgba(pal.accent, 0.18 * la))
          ctx.fillStyle = grad
          ctx.fillRect(tableX0, scanY - 26, cell * TABLE_COLS, 26)
          ctx.strokeStyle = rgba(pal.accent, 0.9 * la)
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(tableX0 - 6, scanY)
          ctx.lineTo(tableX0 + cell * TABLE_COLS + 6, scanY)
          ctx.stroke()
        }

        // legend for the fault markers
        if (!compacted) {
          const ly = R.t + tableH + 16
          let lx = tableX0
          const items = [
            ['missing', 'missing value'],
            ['outlier', 'outlier'],
            ['dup', 'duplicate'],
          ]
          ctx.textBaseline = 'middle'
          for (const [kind, text] of items) {
            drawFault(ctx, kind, lx + 4, ly, 3.2, rgba(pal.text, 0.7 * a), 0)
            ctx.fillStyle = rgba(pal.text, 0.5 * a)
            ctx.fillText(text, lx + 12, ly)
            lx += ctx.measureText(text).width + 30
          }
          ctx.textBaseline = 'bottom'
        }
      }
      if (key === 'explore') {
        const a = deco((st - 0.6) / 0.6)
        ctx.strokeStyle = rgba(pal.text, 0.35 * a)
        ctx.beginPath()
        ctx.moveTo(R.l, R.b + 4)
        ctx.lineTo(R.r, R.b + 4)
        ctx.stroke()
        const meanX = R.l + RW / 2
        ctx.setLineDash([4, 5])
        ctx.strokeStyle = rgba(pal.accent, 0.8 * a)
        ctx.beginPath()
        ctx.moveTo(meanX, R.t)
        ctx.lineTo(meanX, R.b + 4)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = rgba(pal.text, 0.6 * a)
        ctx.fillText(`distribution of x₁ · μ = ${d.mx.toFixed(2)} · σ = ${d.sx.toFixed(2)}`, R.l, R.t - 8)
      }
      if (key === 'features' || key === 'model') {
        const a = deco((key === 'model' ? 1 : st - 0.4) / 0.6)
        ctx.strokeStyle = rgba(pal.text, 0.25 * a)
        ctx.beginPath()
        ctx.moveTo(zcx - zs * 3.2, zcy)
        ctx.lineTo(zcx + zs * 3.2, zcy)
        ctx.moveTo(zcx, zcy - zs * 3.2)
        ctx.lineTo(zcx, zcy + zs * 3.2)
        ctx.stroke()
        ctx.fillStyle = rgba(pal.text, 0.6 * a)
        ctx.fillText(key === 'features' ? 'standardized · z = (x − μ) / σ' : `k-means · k = 3 · iteration ${d.iter}`, zcx - zs * 3.2, zcy - zs * 3.2 - 6)
      }
      if (key === 'evaluate') {
        const a = deco((st - 0.4) / 0.6)
        ctx.strokeStyle = rgba(pal.text, 0.2 * a)
        for (let k = 0; k <= 3; k++) {
          ctx.beginPath()
          ctx.moveTo(cmX + k * cmCell, cmY)
          ctx.lineTo(cmX + k * cmCell, cmY + cm)
          ctx.moveTo(cmX, cmY + k * cmCell)
          ctx.lineTo(cmX + cm, cmY + k * cmCell)
          ctx.stroke()
        }
        const correct = d.kept.filter((p) => d.map[d.assign[p.k]] === p.c).length
        ctx.fillStyle = rgba(pal.text, 0.6 * a)
        ctx.fillText(`confusion matrix · accuracy ${((correct / d.kept.length) * 100).toFixed(1)}%`, cmX, cmY - 8)
      }
      if (key === 'insight') {
        const a = deco((st - 0.5) / 0.7)
        const sorted = d.kept.slice().sort((p, q) => p.trendI - q.trendI)
        ctx.beginPath()
        sorted.forEach((p, i) => (i ? ctx.lineTo(p.px, p.py) : ctx.moveTo(p.px, p.py)))
        ctx.strokeStyle = rgba(pal.accent, 0.9 * a)
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.lineTo(sorted[sorted.length - 1].px, R.b)
        ctx.lineTo(sorted[0].px, R.b)
        ctx.closePath()
        ctx.fillStyle = rgba(pal.accent, 0.08 * a)
        ctx.fill()
        ctx.fillStyle = rgba(pal.text, 0.6 * a)
        ctx.fillText('insight · trend over time', R.l, R.t - 8)
      }

      // --- points ---
      const clusterColor = [pal.accent, pal.text, pal.accent2]
      const tableStage = key === 'collect' || key === 'clean'
      const tags = []
      for (const p of d.pts) {
        if (p.alpha <= 0.01) continue
        const a = p.alpha
        const flagged = key === 'clean' && p.detAt !== undefined
        const faultColor = rgba(flagged ? pal.accent : pal.text, 0.9 * a)
        let color = pal.text
        if (p.k !== undefined && d.assign && (key === 'model' || key === 'evaluate')) color = clusterColor[d.assign[p.k]]
        if (key === 'insight' || (key === 'dissolve' && p.kind !== 'outlier' && p.kind !== 'dup')) color = pal.accent

        if (tableStage && p.kind === 'missing' && fix < 1) {
          // dashed ring that fills in as the value is imputed
          drawFault(ctx, 'missing', p.px, p.py, dot, faultColor, 0)
          if (fix > 0) {
            ctx.beginPath()
            ctx.arc(p.px, p.py, dot * fix, 0, Math.PI * 2)
            ctx.fillStyle = rgba(pal.accent, 0.9 * a)
            ctx.fill()
          }
        } else if (tableStage && (p.kind === 'outlier' || p.kind === 'dup')) {
          drawFault(ctx, p.kind, p.px, p.py, dot, faultColor, p.kind === 'outlier' ? fix : 0)
        } else {
          ctx.beginPath()
          ctx.arc(p.px, p.py, dot, 0, Math.PI * 2)
          ctx.fillStyle = rgba(color, 0.9 * a)
          ctx.fill()
        }

        if (flagged) {
          // detection pulse
          const age = st - p.detAt
          if (age < 0.7) {
            ctx.beginPath()
            ctx.arc(p.px, p.py, dot + 2 + age * 16, 0, Math.PI * 2)
            ctx.strokeStyle = rgba(pal.accent, (1 - age / 0.7) * 0.9 * a)
            ctx.lineWidth = 1.2
            ctx.stroke()
          }
          if (p.tagged) {
            const label =
              p.kind === 'missing' ? (fix > 0 ? 'NaN → imputed with μ' : 'NaN') : p.kind === 'outlier' ? `outlier · z = ${p.z.toFixed(1)}` : `duplicate of #${p.orig.id}`
            tags.push({ label, x: p.px + dot + 7, y: p.py, a: a * fadeIn(age / 0.3) })
          }
        }
      }
      // fault labels go on top of every point
      ctx.textBaseline = 'middle'
      for (const t of tags) {
        const tw = ctx.measureText(t.label).width
        ctx.fillStyle = rgba(pal.bg, 0.9 * t.a)
        ctx.fillRect(t.x - 4, t.y - 8, tw + 8, 16)
        ctx.strokeStyle = rgba(pal.accent, 0.6 * t.a)
        ctx.lineWidth = 1
        ctx.strokeRect(t.x - 4, t.y - 8, tw + 8, 16)
        ctx.fillStyle = rgba(pal.text, 0.95 * t.a)
        ctx.fillText(t.label, t.x, t.y)
      }
      ctx.textBaseline = 'bottom'

      // k-means centroids
      if (key === 'model' && d.assign) {
        d.centView.forEach((c, k) => {
          const x = zcx + c.x * zs
          const y = zcy - c.y * zs
          ctx.strokeStyle = clusterColor[k]
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y, 11, 0, Math.PI * 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x - 5, y)
          ctx.lineTo(x + 5, y)
          ctx.moveTo(x, y - 5)
          ctx.lineTo(x, y + 5)
          ctx.stroke()
        })
      }

      // pipeline strip
      const sy = R.b + 46
      const step = RW / (STAGES.length - 1)
      const progress = Math.min(STAGES.length - 1, stage + (stage < STAGES.length ? st / STAGES[stage].dur : 0))
      ctx.strokeStyle = rgba(pal.text, 0.15)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(R.l, sy)
      ctx.lineTo(R.r, sy)
      ctx.stroke()
      ctx.strokeStyle = pal.accent
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(R.l, sy)
      ctx.lineTo(R.l + progress * step, sy)
      ctx.stroke()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      STAGES.forEach((s, i) => {
        const x = R.l + i * step
        const on = i === stage
        ctx.fillStyle = on ? pal.accent : i < stage ? pal.muted : pal.faint
        ctx.beginPath()
        ctx.arc(x, sy, on ? 4 : 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillText(s.key, x, sy + 10)
      })
      ctx.textAlign = 'left'

      return `data science pipeline · ${stage < STAGES.length ? `${String(stage + 1).padStart(2, '0')} ${key}` : 'restarting'}`
    },
    () => {
      clock.current = 0
      data.current = makeData(++seed.current)
    },
  )
  return <Layer refs={refs} />
}
