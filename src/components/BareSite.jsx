import { about, education, experience, nav, profile, projects, skills } from '../data/content'
import { THEMES, useTheme } from '../theme'

// The "Bare HTML" theme: the same content as plain semantic HTML. No
// stylesheets, icons, canvases or animation, just the document.

const YEAR = 365.25 * 86400000

function cardText(card) {
  if (card.type === 'experience') {
    const years = (Date.now() - new Date(profile.careerStart).getTime()) / YEAR
    const since = new Date(profile.careerStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return `${years.toFixed(1)} years ${card.label}, since ${since}`
  }
  if (card.type === 'rating') return `${card.value}: ${card.label}`
  if (card.type === 'descent') return `How I solve problems: ${card.label}`
  if (card.type === 'count') return `${card.value} ${card.label}`
  return card.label
}

function ThemeSelect() {
  const { id, setTheme } = useTheme()
  return (
    <p>
      <label>
        Theme:{' '}
        <select value={id} onChange={(e) => setTheme(e.target.value)}>
          {Object.entries(THEMES).map(([key, t]) => (
            <option key={key} value={key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
    </p>
  )
}

export default function BareSite() {
  return (
    <>
      <header id="top">
        <ThemeSelect />
        <h1>{profile.name}</h1>
        <p>
          {profile.role} at {profile.company}
        </p>
        <p>{profile.tagline}</p>
        <nav aria-label="Sections">
          <ul>
            {nav.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <hr />

      <main>
        <section id="about">
          <h2>About</h2>
          {about.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <ul>
            {about.cards.map((card) => (
              <li key={card.type}>{cardText(card)}</li>
            ))}
          </ul>
          <h3>Education</h3>
          <p>
            {education.degree}, {education.school} ({education.period}). {education.score}.
          </p>
          <p>Coursework: {education.coursework.join(', ')}.</p>
        </section>
        <hr />

        <section id="experience">
          <h2>Experience</h2>
          {experience.map((job) => (
            <article key={job.role}>
              <h3>
                {job.role}, {job.company}
              </h3>
              <p>
                <em>{job.period}</em>
              </p>
              <ul>
                {job.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
              <p>Tools: {job.tags.join(', ')}.</p>
            </article>
          ))}
        </section>
        <hr />

        <section id="projects">
          <h2>Projects</h2>
          {projects.map((p) => (
            <article key={p.title}>
              <h3>{p.link ? <a href={p.link}>{p.title}</a> : p.title}</h3>
              <p>{p.description}</p>
              <ul>
                {p.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <p>Built with: {p.tech.join(', ')}.</p>
            </article>
          ))}
        </section>
        <hr />

        <section id="skills">
          <h2>Skills</h2>
          <dl>
            {skills.map((g) => (
              <div key={g.group}>
                <dt>
                  <strong>{g.group}</strong>
                </dt>
                <dd>{g.items.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </section>
        <hr />

        <section id="contact">
          <h2>Contact</h2>
          <p>Email is the quickest way to reach me.</p>
          <ul>
            <li>
              Email: <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </li>
            <li>
              LinkedIn: <a href={profile.links.linkedin}>{profile.links.linkedin}</a>
            </li>
            <li>
              GitHub: <a href={profile.links.github}>{profile.links.github}</a>
            </li>
            {profile.links.codeforces && (
              <li>
                Codeforces: <a href={profile.links.codeforces}>{profile.links.codeforces}</a>
              </li>
            )}
          </ul>
          {profile.resumeUrl && (
            <p>
              <a href={profile.resumeUrl} download={profile.resumeFilename}>
                Download résumé (PDF)
              </a>
            </p>
          )}
        </section>
      </main>
      <hr />

      <footer>
        <p>
          © {new Date().getFullYear()} {profile.name}. <a href="#top">Back to top</a>
        </p>
      </footer>
    </>
  )
}
