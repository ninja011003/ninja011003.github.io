# Niranjan S — Portfolio

Vite + React, Three.js (via @react-three/fiber) and Framer Motion.

## Run

Requires Node 18+ (`.nvmrc` pins 22).

```bash
nvm use && npm install && npm run dev
```

`npm run build` outputs a static site to `dist/` — deploy it anywhere (Vercel, Netlify, GitHub Pages).

## Customising

| What | Where |
| --- | --- |
| All text, links, experience, projects, skills | `src/data/content.js` |
| Themes (Dark, Light, Bare HTML) and the accent color | `THEMES` in `src/theme.jsx` |
| Background ML scenes, one per section (data science pipeline, loss surface, network, decision boundary, sigmoid, regression) | `SCENES` in `src/components/background/BackgroundStage.jsx`; models in `src/ml/` |
| Layout, spacing, fonts | `src/styles.css` (tokens at the top) |

Visitors can switch themes from the button in the nav and their choice is remembered. "Bare HTML" turns off every stylesheet and the 3D scene, leaving the plain document.

The résumé download in the Contact section serves `public/niranjan_resume.pdf`. To update it, replace that file (the copy in the project root is not used by the site).
