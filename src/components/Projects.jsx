import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from 'framer-motion'
import { projects } from '../data/content'
import Section from './Section'
import { ArrowIcon, ExternalIcon } from './Icons'

// Projects on a carousel: three cards are visible at a time (centre plus one
// either side). Turning it sends one side card back behind the others while
// the next one comes forward from behind on the opposite side. Works for any
// number of projects.

const n = projects.length
const SPRING = { type: 'spring', stiffness: 170, damping: 26 }

// position of card `index` relative to the centre, wrapped to (-n/2, n/2]
const offsetOf = (index, pos) => {
  let o = (((index - pos) % n) + n) % n
  if (o > n / 2) o -= n
  return o
}
const clamp01 = (x) => Math.min(1, Math.max(0, x))

function ProjectCard({ project, index }) {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const glowX = useTransform(mx, (v) => `${v * 100}%`)
  const glowY = useTransform(my, (v) => `${v * 100}%`)
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${glowX} ${glowY}, color-mix(in srgb, var(--accent) 18%, transparent), transparent 60%)`

  const onMove = (e) => {
    if (e.pointerType === 'touch') return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
  }

  return (
    <article className="project card" onPointerMove={onMove}>
      <motion.div className="project__spotlight" style={{ background: spotlight }} />
      <div className="project__body">
        <header className="project__head">
          <span className="mono project__index">
            {String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
          {project.link && (
            <a href={project.link} target="_blank" rel="noreferrer" className="icon-btn" aria-label={`${project.title} on GitHub`}>
              <ExternalIcon />
            </a>
          )}
        </header>
        <p className="mono project__kicker">{project.kicker}</p>
        <h3 className="project__title">{project.title}</h3>
        <p className="project__desc">{project.description}</p>
        <ul className="project__highlights">
          {project.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <div className="chips">
          {project.tech.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}

function Card({ index, pos, spacing, active, onSelect, children }) {
  // |o| <= 1: on stage (centre or a side). 1 < |o| <= 1.5: sliding back
  // behind the others and fading out. Beyond that: hidden.
  const layout = (p) => {
    const o = offsetOf(index, p)
    const a = Math.abs(o)
    const side = Math.sign(o)
    const back = clamp01(a - 1) * 2 // 0 at the side slot, 1 when fully behind
    return {
      x: side * spacing * (a <= 1 ? a : 1 - back * 0.55),
      z: -Math.min(a, 1) * 180 - back * 160,
      rotateY: -side * Math.min(a, 1) * 32,
      scale: 1 - Math.min(a, 1) * 0.12,
      // side cards stay solid and are darkened; only the card going behind fades out
      opacity: a <= 1 ? 1 : 1 - back,
      brightness: 1 - Math.min(a, 1) * 0.5,
      zIndex: Math.round(100 - a * 10),
    }
  }
  const x = useTransform(pos, (p) => layout(p).x)
  const z = useTransform(pos, (p) => layout(p).z)
  const rotateY = useTransform(pos, (p) => layout(p).rotateY)
  const scale = useTransform(pos, (p) => layout(p).scale)
  const opacity = useTransform(pos, (p) => layout(p).opacity)
  const zIndex = useTransform(pos, (p) => layout(p).zIndex)
  const filter = useTransform(pos, (p) => `brightness(${layout(p).brightness})`)
  const visibility = useTransform(pos, (p) => (Math.abs(offsetOf(index, p)) < 1.5 ? 'visible' : 'hidden'))

  return (
    <motion.div
      className={`wheel__face ${active ? 'is-active' : ''}`}
      style={{ x, z, rotateY, scale, opacity, zIndex, visibility, filter }}
      onClickCapture={(e) => {
        // a click on a side card brings it to the centre instead of following links
        if (!active) {
          e.preventDefault()
          e.stopPropagation()
          onSelect(index)
        }
      }}
      aria-hidden={!active}
    >
      {children}
    </motion.div>
  )
}

export default function Projects() {
  const stage = useRef()
  const faces = useRef([])
  const pos = useMotionValue(0)
  const [active, setActive] = useState(0)
  const [size, setSize] = useState({ width: 380, height: 520, stage: 1100 })
  const drag = useRef(null)
  const justDragged = useRef(false)
  const wheelIdle = useRef()

  // card width follows the container; stage height follows the tallest card
  useLayoutEffect(() => {
    const measure = () => {
      const w = stage.current?.clientWidth ?? 1100
      const width = Math.min(380, Math.max(250, w * 0.8))
      // natural height of each card's content (the card itself is stretched to the stage)
      const bodies = faces.current.filter(Boolean).map((f) => f.querySelector('.project__body'))
      const height = Math.max(...bodies.filter(Boolean).map((b) => b.offsetHeight), 300)
      setSize((s) => (s.width === width && s.height === height && s.stage === w ? s : { width, height, stage: w }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (stage.current) ro.observe(stage.current)
    faces.current.forEach((f) => f?.querySelector('.project__body') && ro.observe(f.querySelector('.project__body')))
    return () => ro.disconnect()
  }, [])

  // side cards sit just inside the container; on narrow screens they peek out from behind
  const spacing = Math.min(size.width * 0.86, Math.max(size.width * 0.3, (size.stage - size.width) / 2 + size.width * 0.3))

  useMotionValueEvent(pos, 'change', (p) => {
    const i = ((Math.round(p) % n) + n) % n
    setActive((a) => (a === i ? a : i))
  })

  const snapTo = (target, velocity = 0) => animate(pos, target, { ...SPRING, velocity })
  const go = (delta) => snapTo(Math.round(pos.get()) + delta)
  const select = (index) => snapTo(pos.get() + offsetOf(index, pos.get()))

  // horizontal trackpad scrolling turns the carousel; vertical scrolling is left to the page
  useEffect(() => {
    const el = stage.current
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      pos.stop()
      pos.set(pos.get() + e.deltaX / 400)
      clearTimeout(wheelIdle.current)
      wheelIdle.current = setTimeout(() => snapTo(Math.round(pos.get())), 140)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const perPx = 1 / (spacing * 1.1)

  return (
    <Section id="projects" title="Projects">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          ref={stage}
          className="wheel"
          style={{ height: size.height + 40 }}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={`Projects, ${active + 1} of ${n}: ${projects[active].title}`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') (e.preventDefault(), go(-1))
            if (e.key === 'ArrowRight') (e.preventDefault(), go(1))
          }}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return
            pos.stop()
            drag.current = { x: e.clientX, p: pos.get(), lastX: e.clientX, lastT: performance.now(), v: 0, moved: false }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            const dx = e.clientX - d.x
            if (!d.moved && Math.abs(dx) > 6) {
              d.moved = true
              e.currentTarget.setPointerCapture(e.pointerId)
            }
            if (!d.moved) return
            const now = performance.now()
            d.v = ((e.clientX - d.lastX) / Math.max(now - d.lastT, 1)) * 1000
            d.lastX = e.clientX
            d.lastT = now
            pos.set(d.p - dx * perPx)
          }}
          onClickCapture={(e) => {
            if (justDragged.current) {
              e.preventDefault()
              e.stopPropagation()
              justDragged.current = false
            }
          }}
          onPointerUp={() => {
            const d = drag.current
            drag.current = null
            if (!d?.moved) return
            justDragged.current = true
            setTimeout(() => (justDragged.current = false), 0)
            // a fast flick carries on to further cards
            const projected = pos.get() - d.v * perPx * 0.25
            snapTo(Math.round(projected), -d.v * perPx)
          }}
          onPointerCancel={() => {
            drag.current = null
            snapTo(Math.round(pos.get()))
          }}
        >
          <div className="wheel__pivot" style={{ width: size.width, height: size.height }}>
            {projects.map((p, i) => (
              <Card key={p.title} index={i} pos={pos} spacing={spacing} active={i === active} onSelect={select}>
                <div ref={(el) => (faces.current[i] = el)}>
                  <ProjectCard project={p} index={i} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="wheel__controls">
          <button className="icon-btn wheel__arrow wheel__arrow--prev" onClick={() => go(-1)} aria-label="Previous project">
            <ArrowIcon />
          </button>
          <div className="wheel__dots" role="tablist" aria-label="Choose a project">
            {projects.map((p, i) => (
              <button
                key={p.title}
                role="tab"
                aria-selected={i === active}
                aria-label={p.title}
                className={`wheel__dot ${i === active ? 'is-active' : ''}`}
                onClick={() => select(i)}
              />
            ))}
          </div>
          <button className="icon-btn wheel__arrow" onClick={() => go(1)} aria-label="Next project">
            <ArrowIcon />
          </button>
          <span className="wheel__hint mono">drag or swipe to turn</span>
        </div>
      </motion.div>
    </Section>
  )
}
