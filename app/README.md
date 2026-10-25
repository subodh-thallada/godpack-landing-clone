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
| `/market`    | Market pulse and sales tape; Buy, Auctions, Trade, Selling and Activity tabs; listings at `/market/l/:id`, trades at `/market/t/:id`                       |
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

The app opens **already logged in** to a demo account with **$250 of pretend
credit** and one free pack. It lives only in this browser's localStorage.
**Log out** on your profile keeps you logged out (even after a reload) until
you log back in with **Log in → Use the demo account**. `/packs?signout=1`
and `/packs?demo=1` do the same from the address bar, and **Edit profile →
Reset demo data** starts over.

Everything a logged-in collector can do works:

- **Open packs** — one or several at a time, Safe mode, any tier. The
  pack-opening ceremony reveals your best card (Sell or Keep); several packs
  end on a results sheet with every card, sell-one / sell-all / keep-all.
  Your pulls show up in your Vault, in Recent Hits, in the Feed (tagged You)
  and on your profile.
- **Vault** — auto-sell timers, search / filter / sort, select-and-sell
  tray, Sell all, and card pages (`/slab/:id`) with a confirmed **Sell** and
  a **Ship** form (US $5 / Canada $10).
- **Market** — buy cards other collectors list (search, raw / graded,
  tiers, sort, watchlist), make an offer and take or decline a counter, set
  price alerts, and see each card's price history. Bid in auctions: you set
  a max and the Market bids for you one step at a time; there's Buy now,
  reserves, and bids in the last 30 seconds add time. List cards from your
  Vault at a fixed price or as an auction, alone or as a bundle of up to 6;
  collectors buy them, make offers you can accept / counter / decline, and
  you can cut the price or take a listing down. Trade with any collector
  (up to 4 cards a side, plus cash either way, so 2-for-1 or cards for
  cash); a meter shows how likely they are to say yes, they may counter, and
  they send you trades of their own. Listed and offered cards and cash are
  held until the deal ends; sellers pay a 5% fee. The engine is
  `js/market/engine.js`, shared with the phone app.
- **Shipments** — each shipment moves Requested → Packed → Shipped →
  Delivered over a few minutes, with tracking and notifications.
- **Following** — every @name opens that collector's profile
  (`/profile/:handle`) with Follow / Following, Share and their collection.
  The Following feed shows pulls from everyone you follow, with collectors
  to follow. Followers / Following open the Connections dialog. Someone new
  follows you a little while after you arrive.
- **Battles** — join other collectors' open battles (they expire and new
  ones appear), or post your own (with Lowest wins); an opponent joins a few
  seconds later and the replay plays wherever you are. Cancel refunds. Wins
  put every card in your Vault.
- **Rewards** — open your free pack, daily check-in streak (seven days earns
  another), VIP progress, invite link and code.
- **Notifications** — the bell counts unread items (welcome, big pulls,
  battle results, shipments, new followers); click one to jump to it.
- **Global Chat** — post messages and share pulls from the Feed (share
  button → Share to Global Chat); an unread badge counts new messages while
  the dock is collapsed.
- **Deposit / Withdraw** — Add demo credit, or withdraw an amount by method
  into Recent withdrawals. No real money moves either way.

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
- `css/market.css` — the Market
- `js/market/engine.js` — Market rules (listings, offers, auctions, trades,
  the collectors' side), shared with `mobile/`
- `js/main.js` — router, shell, shared header/footer
- `js/data.js` — demo data
- `js/ui/` — icons, DOM helpers, store block, belt, dialogs, chat dock
- `js/pages/` — one module per route, plus the sign-in screen
- `assets/cards/` — raw card images cropped from the generated slabs
