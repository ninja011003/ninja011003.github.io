import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { usePalette, useTheme } from '../../theme'
import DataScienceBg from './DataScienceBg'
import NetworkBg from './NetworkBg'
import { BoundaryBg, LogisticBg, RegressionBg } from './PlotScenes'

const DescentBg = lazy(() => import('./DescentBg'))

// Each background scene belongs to a section. All scenes are fixed to the
// viewport — they never scroll — and exactly one shows at a time: when the
// section under the middle of the viewport changes, the old scene fades out
// completely and the new one fades in where it stands.
const SCENES = [
  { section: 'top', Scene: DataScienceBg },
  { section: 'about', Scene: DescentBg },
  { section: 'experience', Scene: NetworkBg },
  { section: 'projects', Scene: BoundaryBg },
  { section: 'skills', Scene: LogisticBg },
  { section: 'contact', Scene: RegressionBg, toEnd: true },
]

const FADE_SECONDS = 0.4

function sectionUnderMiddle() {
  const mid = window.innerHeight / 2
  let current = 0
  SCENES.forEach(({ section, toEnd }, k) => {
    const el = document.getElementById(section)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top <= mid && (toEnd || r.bottom > mid)) current = k
  })
  return current
}

export default function BackgroundStage() {
  const { theme } = useTheme()
  const pal = usePalette()
  const reduced = useReducedMotion()
  const shown = useRef(new Float32Array(SCENES.length))
  const [active, setActive] = useState(() => SCENES.map(() => false))
  const activeRef = useRef(active)

  useEffect(() => {
    if (theme.bare) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const step = Math.min((now - last) / 1000, 0.05) / FADE_SECONDS
      last = now
      const cur = sectionUnderMiddle()
      const o = shown.current

      let others = 0
      for (let k = 0; k < o.length; k++) {
        if (k === cur) continue
        o[k] = Math.max(0, o[k] - step)
        others = Math.max(others, o[k])
      }
      // the incoming scene waits until every other scene is fully gone
      if (others === 0) o[cur] = Math.min(1, o[cur] + step)

      const next = activeRef.current.map((_, k) => k === cur || o[k] > 0)
      if (next.some((v, k) => v !== activeRef.current[k])) {
        activeRef.current = next
        setActive(next)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [theme.bare])

  if (theme.bare) return null
  // dimming applied on top of each scene's own alpha
  const dim = pal.light ? 0.5 : 0.55
  const ease = (x) => x * x * (3 - 2 * x)

  return (
    <div className="bg-stage" aria-hidden="true">
      {SCENES.map(({ section, Scene }, k) => (
        <Suspense key={section} fallback={null}>
          <Scene active={active[k]} weight={() => ease(shown.current[k]) * dim} pal={pal} reduced={reduced} />
        </Suspense>
      ))}
    </div>
  )
}
