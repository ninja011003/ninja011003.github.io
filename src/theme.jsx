import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Theme presets. Every color on the site (including the 3D scene) comes from
// these values. Each theme is black/white with one accent color: `accent` is
// used for buttons, highlights and the network's signals; `accent2` is the
// neutral grey for the network's nodes and edges.
export const THEMES = {
  dark: {
    label: 'Dark',
    light: false,
    bg: '#0a0a0a',
    surface: '#111111',
    surface2: '#171717',
    border: 'rgba(255, 255, 255, 0.09)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
    text: '#ededed',
    muted: '#a1a1a1',
    faint: '#666666',
    accent: '#5b8cff',
    accent2: '#8a8a8a',
    onAccent: '#0a0a0a',
  },
  light: {
    label: 'Light',
    light: true,
    bg: '#ffffff',
    surface: '#fafafa',
    surface2: '#ffffff',
    border: 'rgba(0, 0, 0, 0.08)',
    borderStrong: 'rgba(0, 0, 0, 0.16)',
    text: '#0a0a0a',
    muted: '#525252',
    faint: '#8a8a8a',
    accent: '#1f4fd1',
    accent2: '#a3a3a3',
    onAccent: '#ffffff',
  },
  // No stylesheets, no 3D: the page as plain HTML.
  bare: { label: 'Bare HTML', bare: true },
}

const STORAGE_KEY = 'portfolio-theme'
const DEFAULT_THEME = 'dark'

const CSS_VARS = {
  bg: '--bg',
  surface: '--surface',
  surface2: '--surface-2',
  border: '--border',
  borderStrong: '--border-strong',
  text: '--text',
  muted: '--muted',
  faint: '--faint',
  accent: '--accent',
  accent2: '--accent-2',
  onAccent: '--on-accent',
}

function loadInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && THEMES[saved]) return saved
  } catch {
    /* storage unavailable — fall through to default */
  }
  return DEFAULT_THEME
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [id, setId] = useState(loadInitial)
  const theme = THEMES[id]

  useEffect(() => {
    const root = document.documentElement
    for (const sheet of document.styleSheets) sheet.disabled = !!theme.bare
    if (!theme.bare) {
      for (const [key, cssVar] of Object.entries(CSS_VARS)) root.style.setProperty(cssVar, theme[key])
      root.style.colorScheme = theme.light ? 'light' : 'dark'
    } else {
      root.style.colorScheme = 'light'
    }
    root.dataset.theme = id
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [id, theme])

  const value = useMemo(() => ({ id, theme, setTheme: setId }), [id, theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

// Colors for canvas/SVG drawing. (Bare mode renders BareSite, which draws nothing.)
export function usePalette() {
  return useTheme().theme
}

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
