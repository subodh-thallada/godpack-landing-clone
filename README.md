# Godpack landing page and app — recreation

A from-scratch recreation of the godpack.gg landing page and the
app.godpack.gg web app: same layout, type, colours, breakpoints, animations
and interactions. The code and artwork are original (see "What's original"
below). The landing page lives at `/`, the app at `/packs` and its sibling
routes; the landing page's Enter buttons, ribbon cards and footer links lead
into the app. See [app/README.md](app/README.md) for the app and its demo
account.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:4173/ (landing page) or http://localhost:4173/packs
(app). The server applies the same redirects and rewrites as `vercel.json`.

Formatting is handled by Prettier (`.prettierrc.json`):

```bash
npm run format        # rewrite files
npm run format:check  # verify only
```

## What's here

| Path                  | What it does                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`          | Page markup: header, hero carousel, copy, card ribbon, FAQ, footer                                                                     |
| `css/site.css`        | All styles. Mobile first; 768px tablet, 1200px desktop, 1536 / 1728px wider ribbon cards                                               |
| `js/orbit.js`         | Pack carousel: a spring-driven turntable that turns every 2.6 s, supports drag and flick, shows a tap pulse, and opens the demo on tap |
| `js/ribbon.js`        | Card ribbon: a seamless marquee that pauses on hover and supports mouse/touch drag with inertia, horizontal wheel and arrow keys       |
| `js/footer.js`        | Desktop footer wordmark on a canvas: letters rise on first view, a foil light follows the cursor, sparkles rise from the slit          |
| `js/demo.js`          | Pack-opening demo, loaded on first tap: tear the pack, token spin and tier recolour, slab reveal with streaks, arcs, burst and flip    |
| `tools/art/`          | Generators for all the artwork (foil packs, graded slabs, logo, icons, link preview)                                                   |
| `tools/render-art.js` | Renders the generators to `assets/` (`npm run art`)                                                                                    |
| `tools/serve.js`      | Local server; applies the `vercel.json` redirects and rewrites                                                                         |
| `app/`                | The app recreation (`app/index.html`, `app/css/`, `app/js/`, `app/assets/cards/`); see `app/README.md`                                 |

Every animation respects `prefers-reduced-motion`.

## What's original

- **Code.** Everything is written from scratch. The original site's scripts and stylesheet were used only to observe layout values and timing.
- **Artwork.** The booster packs, logo mark, card back and all 13 graded cards are generated procedurally by `tools/art/`. The cards show landscape art with invented names and set labels. There are no Pokémon characters, real card scans, grading-company logos or the Godpack logo.
- **Font.** Hanken Grotesk, self-hosted under the SIL Open Font License (`assets/fonts/OFL.txt`).

## Swapping in your own assets

Images are referenced by path, so licensed art can replace the generated files
at the same sizes:

- packs: `assets/packs/{arena,master,starter,trainer}-{240,480,720,1060}.webp` (1060 × 1484, transparent)
- ribbon cards: `assets/slabs/<id>-400.webp`; the demo uses `<id>-600.webp` (600 × 1005)
- logo: `assets/logo.png` (447 × 159, drawn into a 149 × 53 box)

To regenerate the art after editing a generator: `npm run art` (or `node tools/render-art.js packs|slabs|extras`).

## Link preview video

When the link is shared in Messages, the preview plays `assets/og/og-video.mp4`: the
hexagon mark and wordmark slide apart and a pack opens between them, then the lockup
closes up again in a seamless 6 s loop. `assets/og-image.jpg` is its first frame and
serves as the still preview elsewhere.

Both come from the canvas scene in `tools/og-video/scene.js`. To regenerate them (it
needs Google Chrome installed, for its H.264 encoder):

```bash
npm run og-video
```

Open `tools/og-video/index.html` in Chrome to watch the loop live while editing it.
Messages caches previews per URL, so test a changed preview with a fresh query string
(for example `?v=2`).

## Deploy (Vercel)

It's a static site with no build step. `.vercelignore` uploads only `index.html`,
`css/`, `js/`, `assets/`, `app/` and `vercel.json`. `vercel.json` rewrites the app
routes (`/packs`, `/battles`, `/vault`, `/feed`, `/feed/following`, `/rewards`,
`/ship`, `/add-funds`, `/withdraw`, `/profile`, `/slab/:id`) to
`app/index.html`, redirects `/app` to `/packs`, and sets cache and security
headers.

```bash
vercel deploy
```

The live site is public at https://godpack-landing-clone.vercel.app, and every push
to `main` redeploys it. Pages send `X-Robots-Tag: noindex` so the recreation doesn't
show up in search results next to the real site.

## Note

This is an unofficial recreation for a portfolio, not affiliated with Godpack. The
page keeps Godpack's name, copy and links because it recreates their site, and a
fixed credit label on every page says so.
