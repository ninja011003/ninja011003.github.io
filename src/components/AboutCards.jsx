import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'
import { profile } from '../data/content'
import { useInView as useNearView, useLoop } from '../hooks'

const DAY = 86400000
const YEAR = 365.25 * DAY

// --- coffee ⇄ code ---------------------------------------------------------
export function LoopCard() {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setPhase((p) => (p + 1) % 2), 1400)
    return () => clearInterval(id)
  }, [reduced])

  return (
    <div className="loop" aria-label="Coffee to code, repeated">
      <svg viewBox="0 0 40 40" className={`loop__icon ${phase === 0 ? 'is-on' : ''}`} aria-hidden="true">
        <g className="loop__steam">
          <path d="M14 9c-2-2 2-3 0-5" />
          <path d="M20 9c-2-2 2-3 0-5" />
          <path d="M26 9c-2-2 2-3 0-5" />
        </g>
        <path d="M8 14h24v9a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9z" />
        <path d="M32 17h2a4 4 0 0 1 0 8h-2.5" />
      </svg>
      <svg viewBox="0 0 40 24" className="loop__arrows" aria-hidden="true">
        <path d="M6 8h26l-5-5" />
        <path d="M34 16H8l5 5" />
      </svg>
      <svg viewBox="0 0 40 40" className={`loop__icon ${phase === 1 ? 'is-on' : ''}`} aria-hidden="true">
        <path d="M14 11 5 20l9 9" />
        <path d="M26 11l9 9-9 9" />
        <path d="M23 8 17 32" />
      </svg>
    </div>
  )
}

// --- experience, counted live from the career start date -------------------
const pad = (n) => String(n).padStart(2, '0')

export function ExperienceCard() {
  const start = new Date(profile.careerStart).getTime()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const ms = Math.max(0, now - start)
  const years = ms / YEAR
  const days = Math.floor(ms / DAY)
  const rem = ms % DAY
  const h = Math.floor(rem / 3600000)
  const m = Math.floor((rem % 3600000) / 60000)
  const s = Math.floor((rem % 60000) / 1000)
  const since = new Date(start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
    <>
      <span className="stat__value">
        {years.toFixed(1)}
        <small> yrs</small>
      </span>
      <span className="stat__ticker mono" aria-label={`${days} days since ${since}`}>
        {days}d {pad(h)}h {pad(m)}m {pad(s)}s · since {since}
      </span>
    </>
  )
}

// --- problem solving: gradient descent on a parabola ----------------------
const LR = 0.16
const STEP_SECONDS = 0.45
const curveY = (x) => 12 + 34 * (1 - x * x) // bowl: minimum at x = 0 (SVG y grows downward)
const toX = (x) => 60 + x * 52

export function DescentCard() {
  const reduced = useReducedMotion()
  const root = useRef()
  const ball = useRef()
  const trail = useRef()
  const near = useNearView(root, '0px')
  const sim = useRef({ x: -0.95, prev: -0.95, clock: 0, steps: [-0.95], side: 1, hold: 0 })

  useLoop((dt) => {
    const s = sim.current
    if (s.hold > 0) {
      s.hold -= dt
      if (s.hold <= 0) {
        // restart from the other side of the bowl
        s.side *= -1
        s.x = s.prev = 0.95 * s.side * -1
        s.steps = [s.x]
        s.clock = 0
      }
    } else {
      s.clock += dt
      if (s.clock >= STEP_SECONDS) {
        s.clock = 0
        s.prev = s.x
        s.x -= LR * 2 * s.x
        s.steps.push(s.x)
        if (Math.abs(s.x) < 0.01) s.hold = 1.4
      }
    }
    // ease between steps so the ball glides instead of jumping
    const a = s.hold > 0 ? 1 : Math.min(1, s.clock / (STEP_SECONDS * 0.6))
    const e = 1 - (1 - a) ** 3
    const x = s.prev + (s.x - s.prev) * e
    ball.current?.setAttribute('cx', toX(x))
    ball.current?.setAttribute('cy', curveY(x) - 3.5)
    trail.current?.setAttribute('points', s.steps.map((v) => `${toX(v)},${curveY(v) - 3.5}`).join(' '))
  }, near && !reduced)

  const curve = Array.from({ length: 41 }, (_, i) => {
    const x = -1 + i / 20
    return `${toX(x)},${curveY(x)}`
  }).join(' ')

  return (
    <div ref={root} className="descent">
      <span className="stat__value">
        ∇<small> → </small>0
      </span>
      <svg viewBox="0 0 120 50" preserveAspectRatio="xMinYMid meet" className="descent__plot" aria-hidden="true">
        <polyline points={curve} className="descent__curve" />
        <polyline ref={trail} className="descent__trail" />
        <circle ref={ball} cx={toX(-0.95)} cy={curveY(-0.95) - 3.5} r="3.5" className="descent__ball" />
      </svg>
    </div>
  )
}

// --- competitive programming rating with a growth sparkline -----------------
export function RatingCard({ value }) {
  const ref = useRef()
  const inView = useInView(ref, { once: true, margin: '-60px' })
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [inView, value])

  const body = (
    <div className="rating">
      <span className="stat__value" ref={ref}>
        0
      </span>
      <svg viewBox="0 0 120 40" preserveAspectRatio="xMinYMid meet" className={`rating__spark ${inView ? 'is-drawn' : ''}`} aria-hidden="true">
        <polyline points="3,35 20,30 34,32 52,22 66,25 84,14 98,16 116,6" pathLength="1" />
        <circle cx="116" cy="6" r="3" />
      </svg>
    </div>
  )
  return profile.links.codeforces ? (
    <a href={profile.links.codeforces} target="_blank" rel="noreferrer" className="rating__link" aria-label={`Codeforces rating ${value}`}>
      {body}
    </a>
  ) : (
    body
  )
}

// --- plain count-up ---------------------------------------------------------
export function CountCard({ value, suffix = '' }) {
  const ref = useRef()
  const inView = useInView(ref, { once: true, margin: '-60px' })
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v) + suffix
      },
    })
    return () => controls.stop()
  }, [inView, value, suffix])
  return (
    <span className="stat__value" ref={ref}>
      0{suffix}
    </span>
  )
}
