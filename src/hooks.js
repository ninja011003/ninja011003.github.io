import { useEffect, useRef, useState } from 'react'

export function useInView(ref, rootMargin = '120px') {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return inView
}

// Runs `callback(dt, seconds)` every animation frame while `active` is true.
export function useLoop(callback, active) {
  const cb = useRef(callback)
  cb.current = callback
  useEffect(() => {
    if (!active) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      cb.current(dt, now / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])
}
