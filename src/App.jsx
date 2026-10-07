import { MotionConfig } from 'framer-motion'
import { ThemeProvider, useTheme } from './theme'
import Nav from './components/Nav'
import Hero from './components/Hero'
import About from './components/About'
import Experience from './components/Experience'
import Projects from './components/Projects'
import Skills from './components/Skills'
import Contact from './components/Contact'
import Footer from './components/Footer'
import BackgroundStage from './components/background/BackgroundStage'
import BareSite from './components/BareSite'

function Site() {
  const { theme } = useTheme()
  if (theme.bare) return <BareSite />
  return (
    <MotionConfig reducedMotion="user">
      <BackgroundStage />
      <Nav />
      <main>
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </MotionConfig>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Site />
    </ThemeProvider>
  )
}
