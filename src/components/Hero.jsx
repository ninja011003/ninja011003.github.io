import { motion } from 'framer-motion'
import { profile } from '../data/content'
import { GithubIcon, LinkedinIcon, MailIcon, ArrowIcon } from './Icons'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export default function Hero() {
  return (
    <section className="hero" id="top">
      <motion.div className="hero__content container" variants={container} initial="hidden" animate="show">
        <motion.h1 className="hero__title" variants={item}>
          {profile.name}
        </motion.h1>
        <motion.p className="hero__role" variants={item}>
          {profile.role} at <span>{profile.company}</span>
        </motion.p>
        <motion.p className="hero__tagline" variants={item}>
          {profile.tagline}
        </motion.p>
        <motion.div className="hero__cta" variants={item}>
          <a href="#projects" className="btn btn--primary">
            Projects <ArrowIcon />
          </a>
          <a href="#contact" className="btn btn--ghost">
            Contact
          </a>
        </motion.div>
        <motion.div className="hero__social" variants={item}>
          <a href={profile.links.github} target="_blank" rel="noreferrer" aria-label="GitHub">
            <GithubIcon />
          </a>
          <a href={profile.links.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <LinkedinIcon />
          </a>
          <a href={`mailto:${profile.email}`} aria-label="Email">
            <MailIcon />
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}
