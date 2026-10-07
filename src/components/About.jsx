import { motion } from 'framer-motion'
import { about, education } from '../data/content'
import Section, { reveal, stagger } from './Section'
import { CountCard, DescentCard, ExperienceCard, LoopCard, RatingCard } from './AboutCards'

function CardBody({ card }) {
  if (card.type === 'loop') return <LoopCard />
  if (card.type === 'experience') return <ExperienceCard />
  if (card.type === 'descent') return <DescentCard />
  if (card.type === 'rating') return <RatingCard value={card.value} />
  return <CountCard value={card.value} suffix={card.suffix} />
}

export default function About() {
  return (
    <Section id="about" title="About">
      <div className="about">
        <motion.div
          className="about__text"
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {about.paragraphs.map((p, i) => (
            <motion.p key={i} variants={reveal}>
              {p}
            </motion.p>
          ))}

          <motion.div className="edu card" variants={reveal}>
            <div className="edu__top">
              <div>
                <p className="mono edu__label">Education</p>
                <h3>{education.degree}</h3>
                <p className="muted">{education.school}</p>
              </div>
              <div className="edu__meta">
                <span className="chip chip--accent">{education.score}</span>
                <span className="mono muted">{education.period}</span>
              </div>
            </div>
            <div className="chips">
              {education.coursework.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="stats"
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {about.cards.map((card) => (
            <motion.div key={card.type} className={`stat card stat--${card.type}`} variants={reveal} whileHover={{ y: -4 }}>
              <div className="stat__top">
                <CardBody card={card} />
              </div>
              <span className="stat__label">{card.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  )
}
