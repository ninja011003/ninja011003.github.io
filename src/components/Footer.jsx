import { profile } from '../data/content'
import { ArrowIcon } from './Icons'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__bottom">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <a href="#top" className="footer__top">
          Back to top <ArrowIcon />
        </a>
      </div>
    </footer>
  )
}
