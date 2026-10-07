import { useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { experience } from '../data/content'
import Section from './Section'

function Role({ job, index }) {
  const [expanded, setExpanded] = useState(index === 0)
  const visible = expanded ? job.points : job.points.slice(0, 2)

  return (
    <motion.article
      className="role"
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className={`role__node ${job.current ? 'is-current' : ''}`} />
      <div className="role__card card">
        <header className="role__head">
          <div>
            <h3>{job.role}</h3>
            <p className="role__company">{job.company}</p>
          </div>
          <span className="mono role__period">
            {job.period}
          </span>
        </header>

        <ul className="role__points">
          <AnimatePresence initial={false}>
            {visible.map((p) => (
              <motion.li
                key={p}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {p}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <footer className="role__foot">
          <div className="chips">
            {job.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
          {job.points.length > 2 && (
            <button className="link-btn mono" onClick={() => setExpanded((e) => !e)}>
              {expanded ? '− show less' : `+ ${job.points.length - 2} more`}
            </button>
          )}
        </footer>
      </div>
    </motion.article>
  )
}

export default function Experience() {
  const ref = useRef()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] })
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <Section id="experience" title="Experience">
      <div ref={ref} className="timeline">
        <div className="timeline__track">
          <motion.div className="timeline__fill" style={{ height }} />
        </div>
        {experience.map((job, i) => (
          <Role key={job.role} job={job} index={i} />
        ))}
      </div>
    </Section>
  )
}
