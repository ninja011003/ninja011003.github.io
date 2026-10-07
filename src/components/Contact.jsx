import { useState } from 'react'
import { motion } from 'framer-motion'
import { profile } from '../data/content'
import Section, { reveal, stagger } from './Section'
import { CheckIcon, CopyIcon, DownloadIcon, GithubIcon, LinkedinIcon, MailIcon } from './Icons'

export default function Contact() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${profile.email}`
    }
  }

  return (
    <Section id="contact" title="Contact">
      <motion.div
        className="contact card"
        variants={stagger(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
      >
        <motion.p className="contact__lead" variants={reveal}>
          Email is the quickest way to reach me.
        </motion.p>

        <motion.div className="contact__email" variants={reveal}>
          <a href={`mailto:${profile.email}`} className="contact__address">
            {profile.email}
          </a>
          <button className="icon-btn" onClick={copy} aria-label="Copy email address">
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          <span className={`contact__toast mono ${copied ? 'is-visible' : ''}`} role="status">
            copied
          </span>
        </motion.div>

        <motion.div className="contact__links" variants={reveal}>
          <a href={`mailto:${profile.email}`} className="btn btn--primary">
            <MailIcon /> Email
          </a>
          <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className="btn btn--ghost">
            <LinkedinIcon /> LinkedIn
          </a>
          <a href={profile.links.github} target="_blank" rel="noreferrer" className="btn btn--ghost">
            <GithubIcon /> GitHub
          </a>
        </motion.div>

        {profile.resumeUrl && (
          <motion.a
            variants={reveal}
            href={profile.resumeUrl}
            download={profile.resumeFilename}
            className="contact__resume"
          >
            <span className="contact__resume-icon">
              <DownloadIcon />
            </span>
            <span className="contact__resume-text">
              <b>Download résumé</b>
              <span className="mono">PDF · {profile.resumeFilename}</span>
            </span>
          </motion.a>
        )}
      </motion.div>
    </Section>
  )
}
