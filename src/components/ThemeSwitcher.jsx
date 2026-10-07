import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { THEMES, useTheme } from '../theme'

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  className: 'theme__icon',
}

// moon for dark, sun for light, a code tag for the unstyled page
function ThemeIcon({ id }) {
  if (id === 'light') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )
  }
  if (id === 'bare') {
    return (
      <svg {...iconProps}>
        <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
      </svg>
    )
  }
  return (
    <svg {...iconProps}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  )
}

export default function ThemeSwitcher() {
  const { id, theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="theme" ref={ref}>
      <button
        className="theme__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Theme: ${theme.label}. Change theme`}
        aria-expanded={open}
      >
        <ThemeIcon id={id} />
        <span className="theme__label">{theme.bare ? 'Theme' : theme.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="theme__panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <ul className="theme__list">
              {Object.entries(THEMES).map(([key, t]) => (
                <li key={key}>
                  <button
                    className={`theme__option ${id === key ? 'is-active' : ''}`}
                    onClick={() => {
                      setTheme(key)
                      setOpen(false)
                    }}
                    aria-pressed={id === key}
                  >
                    <ThemeIcon id={key} />
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
