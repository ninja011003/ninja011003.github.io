import { motion } from 'framer-motion'

export const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const stagger = (gap = 0.08) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap } },
})

export default function Section({ id, title, children, className = '' }) {
  return (
    <section id={id} className={`section ${className}`}>
      <div className="container">
        <motion.h2
          className="section__title"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {title}
        </motion.h2>
        {children}
      </div>
    </section>
  )
}
