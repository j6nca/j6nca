# CLAUDE.md

## Purpose
Personal profile / portfolio site for j6nca (Jonathan Ng), a DevOps engineer. A static Next.js site exporting a landing page (`Hero`, `Contact`) and a `/resume` page driven by `resume.json`.

## Tech stack
- Next.js 14 (App Router, `output: 'export'` static export)
- React 18, TypeScript 5
- Tailwind CSS 3, PostCSS, Autoprefixer
- Node.js 18.17.0 (see `.tool-versions`)
- ESLint (`next` config)
- Renovate for dependency updates; GitHub Actions for build/deploy and profile metrics

## Commands
- `npm run dev` — start Next.js dev server
- `npm run build` — production build (static export to `out/`)
- `npm run start` — serve the production build
- `npm run lint` — run `next lint`

## Structure
- `src/app/` — Next.js App Router entry (`layout.tsx`, `page.tsx`, `globals.css`)
- `src/app/components/` — `Hero`, `Contact`, `ContactItem` (JSX)
- `src/app/resume/` — `/resume` route, `resume.css`, and `resume.json` (source of truth for resume content)
- `public/` — static assets; `public/resume.json` is a symlink to `src/app/resume/resume.json`
- `.github/workflows/` — `nextjs.yml` (build/deploy), `metrics.yml`, `update_profile_stats.yml`

## Conventions
- Site is statically exported (`next.config.js`: `output: 'export'`, `images.unoptimized: true`) — do not use server-only Next features (no API routes, no `next/image` optimization, no dynamic server rendering).
- Resume content lives in `src/app/resume/resume.json`; the `public/` copy is a symlink, so edit the source file only.
- Components mix `.jsx` (components) and `.tsx` (pages/layout) — match existing style when adding files.
