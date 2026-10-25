# Godpack app — recreation

A from-scratch recreation of app.godpack.gg (the signed-out experience): the
shell, every page reachable from the sidebar, and their interactions and
animations. Code, card art and pack art are original; every collector,
pull and chat message is invented.

## Run it

From the repository root:

```bash
npm start
```

Then open http://localhost:4173/packs. `tools/serve.js` applies the rewrites in
`vercel.json`, so `/vault`, `/feed?tab=leaderboard`, `/slab/<id>` and the rest
work on refresh, exactly as on Vercel. The app's own files live under `/app/`;
it shares the landing page's `/assets/` (packs, slabs, logo, favicon).

## Pages

| Route        | What's there                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/packs`     | Pack stage (step between tiers, foil and tilt follow the pointer, Safe mode), order panel (quantity, tier menu, odds, buy), Recent Hits and Top Hits belts |
| `/battles`   | The same store in battle mode (seats, opponent, Lowest wins) and open battles with tier filters                                                            |
| `/vault`     | Stats, search / filter / sort toolbar, empty state                                                                                                         |
| `/feed`      | All (tier-tinted pull timeline), Following, Battles (with replays), Leaderboard (best pulls / volume, time ranges)                                         |
| `/rewards`   | Flip-able VIP card, tier table, free packs, referral cash, invites, daily check-in                                                                         |
| `/ship`      | Shipments empty state and shipping details with expandable sections                                                                                        |
| `/add-funds` | Amount entry with presets and limits, payment panel                                                                                                        |
| `/withdraw`  | Payout methods                                                                                                                                             |
| `/profile`   | Demo account profile: portfolio chart, pack activity, vaulted cards                                                                                        |

Shared: collapsible sidebar (icon rail under 760px), sliding nav marker,
volume control, draggable Global Chat dock, odds and card-inspector dialogs,
the sign-in screen, toasts, page-enter animations. Respects
`prefers-reduced-motion`.

## Demo account (signed-in pages)

Press **Log in → Use the demo account** (or open `/packs?demo=1`) to see the
signed-in app. The demo account lives only in this browser's localStorage;
**Log out** on the profile clears it (or open `/packs?signout=1`).

Signed in, you get: the notifications bell and glowing wallet pill, sidebar
counts and account button, a Vault with auto-sell timers, select-and-sell
tray and card modal (`/slab/:id`), a joinable battle with a live countdown,
Rewards progress, daily check-ins and invite link/code, the "Shipments"
page, and a **Profile** (`/profile`) with a portfolio chart (range chips,
hover crosshair), pack activity and the vaulted grid. Opening a pack runs
the full pack-opening ceremony and puts the cards in the Vault; Global Chat
lets you post (locally).

The demo starts at $0 like a new account. **Deposit → Add demo credit** adds
pretend balance so pack opening and battles can be tried; no payment is
taken and nothing leaves the browser.

## What's deliberately not real

- **No real accounts or money.** Email, Google and Apple sign-in are inert
  (nothing typed is stored or sent); only the local demo account works.
  Pack opening, selling and battles move pretend demo credit. Real payments,
  withdrawals, shipping and Discord linking show a "not part of this demo"
  note.
- **Odds and prices are demo numbers** in `js/data.js`.

## Layout

- `index.html`
- `css/app.css` — tokens, shell, buttons, dialogs, footer
- `css/pages.css` — per-page styles
- `js/main.js` — router, shell, shared header/footer
- `js/data.js` — demo data
- `js/ui/` — icons, DOM helpers, store block, belt, dialogs, chat dock
- `js/pages/` — one module per route, plus the sign-in screen
- `assets/cards/` — raw card images cropped from the generated slabs
