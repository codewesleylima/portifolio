# codewesleylima — engineering console

A personal portfolio built as a **service health console**: every GitHub repository renders as a
service tile with a status strip, last-deploy timestamp, runtime badge and topic labels.

Stack: TanStack Start (React) + Vite, hand-written vanilla CSS with custom properties. No CSS
framework drives the visual identity.

## Run locally

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # static build output in dist/
```

Drop your résumé at `public/wesley-lima-resume.pdf` — the hero CTA links to it.

## How the sync works

The site **never calls the GitHub API from the browser**. It reads `src/data/portfolio.json`,
which is committed to the repo and refreshed by a scheduled GitHub Action.

- `.github/workflows/sync-portfolio.yml` runs daily (`0 6 * * *`), on `workflow_dispatch`, and on
  every push to `main`, using the built-in `GITHUB_TOKEN` (no hardcoded secrets).
- `scripts/sync-github.mjs` issues a single GraphQL request for the viewer's public, non-fork
  repositories ordered by `PUSHED_AT DESC` (first 100) including topics, top 8 languages by size,
  stars, forks, archived flag, primary language, description and homepage.
- Status is derived at build time: `healthy` if pushed within 90 days, `warning` within 365 days,
  `alert` if older or archived.
- The JSON is committed back **only when the content actually changed** (hash comparison ignoring
  `generatedAt`), so there is no empty-commit noise.
- A second job builds the site and deploys it to GitHub Pages via `actions/deploy-pages`.

## Curate from GitHub, no redeploys

Curation is done with repository topics in the GitHub UI:

| Topic                 | Effect                               |
| --------------------- | ------------------------------------ |
| `featured`            | pinned to the top of the registry    |
| `hide-from-portfolio` | excluded from the portfolio entirely |

Add or remove the topic on GitHub; the next sync run updates the site.

## Design system

Palette (CSS custom properties in `src/styles.css`) — color is semantic, never decorative:

| Token        | Value     | Meaning                     |
| ------------ | --------- | --------------------------- |
| `--void`     | `#080A0C` | background                  |
| `--surface`  | `#101418` | tiles, panels               |
| `--phosphor` | `#00FF9C` | healthy, links, focus rings |
| `--alert`    | `#FF2D55` | stale / archived            |
| `--amber`    | `#FFB020` | warning                     |
| `--dim`      | `#6B7A80` | metadata, muted text        |

Type: Chakra Petch (display) + JetBrains Mono (all data and terminal output). Motion: boot
sequence, staggered tile reveal, 120ms glitch on tile hover, ambient pulse on healthy dots — all
fully disabled under `prefers-reduced-motion`.

The mascot is an original ASCII console daemon; no third-party marks or characters are used.
