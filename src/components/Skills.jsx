import { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { skills } from '../data/content'
import Section from './Section'

const ALL = 'All'

export default function Skills() {
  const [filter, setFilter] = useState(ALL)
  const groups = [ALL, ...skills.map((s) => s.group)]
  const items =
    filter === ALL
      ? skills.flatMap((s) => s.items.map((name) => ({ name, group: s.group })))
      : skills.find((s) => s.group === filter).items.map((name) => ({ name, group: filter }))

  return (
    <Section id="skills" title="Skills">
      <LayoutGroup>
        <div className="filters" role="tablist" aria-label="Skill categories">
          {groups.map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={filter === g}
              className={`filter ${filter === g ? 'is-active' : ''}`}
              onClick={() => setFilter(g)}
            >
              {filter === g && (
                <motion.span layoutId="filter-pill" className="filter__pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
              )}
              <span>{g}</span>
            </button>
          ))}
        </div>

        <motion.div layout className="skills">
          <AnimatePresence mode="popLayout">
            {items.map(({ name, group }, i) => (
              <motion.span
                key={name}
                layout
                className="skill"
                data-group={group}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.012 } }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ y: -3 }}
              >
                {name}
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </Section>
  )
}
