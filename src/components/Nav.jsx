import { Fragment, useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { nav, profile } from '../data/content'
import ThemeSwitcher from './ThemeSwitcher'
import { useTheme } from '../theme'

export default function Nav() {
  const [active, setActive] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { theme } = useTheme()
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    nav.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      {!theme.bare && <motion.div className="nav__progress" style={{ scaleX: progress }} />}
      <div className="nav__inner container">
        <a href="#top" className="nav__logo" aria-label="Back to top">
          {!theme.bare && (
            <span className="nav__logo-mark" aria-hidden="true">
              {profile.shortName[0]}
            </span>
          )}
          <span className="nav__logo-text">{profile.shortName}</span>
        </a>

        <nav className="nav__links" aria-label="Primary">
          {nav.map(({ id, label }) => (
            <Fragment key={id}>
              {' '}
              <a href={`#${id}`} className={active === id ? 'is-active' : ''}>
                {active === id && (
                  <motion.span
                    layoutId="nav-pill"
                    className="nav__pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span>{label}</span>
              </a>
            </Fragment>
          ))}
        </nav>

        <div className="nav__actions">
          <ThemeSwitcher />
          {!theme.bare && (
            <button
              className={`nav__burger ${open ? 'is-open' : ''}`}
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <span />
              <span />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            className="nav__mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="Mobile"
          >
            {nav.map(({ id, label }, i) => (
              <motion.a
                key={id}
                href={`#${id}`}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.05 * i } }}
              >
                <span className="mono">0{i + 1}</span> {label}
              </motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
