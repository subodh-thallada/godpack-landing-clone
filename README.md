# Godpack landing page and app — recreation

A from-scratch recreation of the godpack.gg landing page and the
app.godpack.gg web app: same layout, type, colours, breakpoints, animations
and interactions. The code and artwork are original (see "What's original"
below). The landing page lives at `/`, the app at `/packs` and its sibling
routes; the landing page's Enter buttons, ribbon cards and footer links lead
into the app. See [app/README.md](app/README.md) for the app and its demo
account.

Both the web app and the phone app in [`mobile/`](mobile/README.md) have a
**Market**: buy cards other collectors list, make offers and take counters,
bid in auctions (proxy bidding, buy now, reserves), list your own cards or
bundles, and trade any way you like (1-for-1, 2-for-1, cards plus cash).
Its rules live in one engine, `app/js/market/engine.js`, which the phone app
runs too (`mobile/src/market/engine.js` is an exact copy, checked by a test).

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

| Path                  | What it does                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`          | Page markup: header with the feature nav, hero carousel and pack names, copy, card ribbon, FAQ, footer                                                                                                             |
| `css/site.css`        | All styles. Mobile first; 768px tablet, 1200px desktop, 1536 / 1728px wider ribbon cards                                                                                                                           |
| `js/orbit.js`         | Pack carousel: a spring-driven turntable of the Pokémon, Baseball and Basketball packs that turns every 2.6 s, supports drag and flick, shows a tap pulse, lights the front pack's name, and opens the demo on tap |
| `js/nav.js`           | Feature menu under 1200px (Packs, Battles, Market, Trade, Vault, Leaderboard, Rewards, each with a line about it); wider screens list them inline                                                                  |
| `js/ribbon.js`        | Card ribbon: a seamless marquee that pauses on hover and supports mouse/touch drag with inertia, horizontal wheel and arrow keys                                                                                   |
| `js/footer.js`        | Desktop footer wordmark on a canvas: letters rise on first view, a foil light follows the cursor, sparkles rise from the slit                                                                                      |
| `js/demo.js`          | Pack-opening demo, loaded on first tap: tear the pack, token spin and tier recolour, slab reveal with streaks, arcs, burst and flip. Each pack opens in its own colours and pulls from its own cards               |
| `tools/art/`          | Generators for all the artwork (foil packs, graded slabs, the baseball and basketball cards in `sports.js`, logo, icons, link preview)                                                                             |
| `tools/render-art.js` | Renders the generators to `assets/` (`npm run art`)                                                                                                                                                                |
| `tools/serve.js`      | Local server; applies the `vercel.json` redirects and rewrites                                                                                                                                                     |
| `app/`                | The app recreation (`app/index.html`, `app/css/`, `app/js/`, `app/assets/cards/`); see `app/README.md`                                                                                                             |

Every animation respects `prefers-reduced-motion`.

## What's original

- **Code.** Everything is written from scratch. The original site's scripts and stylesheet were used only to observe layout values and timing.
- **Artwork.** The booster packs, logo mark, card back and all 23 graded cards are generated procedurally by `tools/art/`. The 13 trading cards show landscape art with invented names and set labels; the 10 baseball and basketball cards show game moments (a grand slam, a buzzer beater) with no players, teams or leagues. The Pokémon pack names its category in plain type with an original lightning emblem. There are no Pokémon characters or logos, real card scans, grading-company logos or the Godpack logo.
- **Font.** Hanken Grotesk, self-hosted under the SIL Open Font License (`assets/fonts/OFL.txt`).

## Swapping in your own assets

Images are referenced by path, so licensed art can replace the generated files
at the same sizes:

- packs: `assets/packs/{pokemon,baseball,basketball}-{240,480,720,1060}.webp` on the landing page, `{arena,master,starter,trainer}` in the app (1060 × 1484, transparent)
- ribbon cards: `assets/slabs/<id>-400.webp`; the demo uses `<id>-600.webp` (600 × 1005)
- logo: `assets/logo.png` (447 × 159, drawn into a 149 × 53 box)

To regenerate the art after editing a generator: `npm run art` (or `node tools/render-art.js packs|slabs|extras`; `PACKS=pokemon` or `SLABS=grand-slam,swish` renders just those).

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
routes (`/packs`, `/battles`, `/market`, `/market/l/:id`, `/market/t/:id`,
`/vault`, `/feed`, `/feed/following`, `/rewards`,
`/ship`, `/add-funds`, `/withdraw`, `/profile`, `/slab/:id`) to
`app/index.html`, redirects `/app` to `/packs`, and sets cache and security
headers.

```bash
vercel deploy
```

The live site is public at https://godpack-landing-clone.vercel.app, and every push
to `main` redeploys it. Pages send `X-Robots-Tag: noindex` so the recreation doesn't
show up in search results next to the real site.

The phone app's web build is a separate Vercel project, live at
https://godpack-mobile-demo.vercel.app. On a phone it opens full screen; on a
laptop it opens inside a phone at iPhone size. It's deployed from `mobile/`
with `npm run deploy:web`; see
[mobile/README.md](mobile/README.md).

## Note

This is an unofficial recreation for a portfolio, not affiliated with Godpack. The
page keeps Godpack's name, copy and links because it recreates their site, and a
fixed credit label on every page says so.
