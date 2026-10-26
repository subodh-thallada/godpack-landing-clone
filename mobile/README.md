# Godpack — phone app (unofficial demo)

An iOS and Android app (Expo / React Native) that sits alongside the web
recreation in this repo. It doesn't replace the website: the site keeps
deploying to Vercel from the repo root, and this folder is ignored there.

**Try it:** https://godpack-mobile-demo.vercel.app is the app's web build.
On a phone it opens full screen; on a laptop, desktop or tablet it opens
inside a phone at iPhone size, whatever the window size or zoom. On a real
device it also runs in Expo Go or a development build (see Run it).

It has every feature of the web app — packs, battles, the Market (buy, sell,
auctions, offers and trades), the vault (sell and ship), the feed, chat,
rewards, wallet, profiles — plus a first-run onboarding and an in-app tour. Everything uses demo credit; no real money,
cards or shipping.

## Same design as the website

- **Tokens and components** come straight from the web app's CSS
  (`app/css/app.css`, `app/css/pages.css`): colours, radii, type scale,
  buttons, chips, panels, fields, the wallet pill, the store's stage and
  order panel, hit cards, posts and the vault tiles. See `src/theme.ts`.
- **The pack-opening ceremony is the website's own code.** `src/dom/packdemo.js`
  is the web app's `app/js/ui/ceremony.js`, run through an Expo DOM component
  (`src/dom/Ceremony.tsx`): inline on the web, in a WebView on iOS and
  Android. Its art lives in `public/ceremony/`.
- Same logo, pack art, cards and slabs (original art generated for this
  project).

## Market

A marketplace for the cards in your Vault, shared with the website: the rules
live in one engine, `src/market/engine.js`, an exact copy of the web app's
`app/js/market/engine.js` (a unit test fails if they drift).

- **Buy:** listings from the demo's collectors, with search, raw/graded and
  tier filters, sorting (ending soon, newest, price, best deal), a watchlist,
  bundles, deal and price-drop badges, each card's recent sale prices, and
  price alerts.
- **Offers:** offer under the asking price; the money is held until the
  seller answers (accept, counter or pass). Collectors make offers on your
  listings too: accept, counter or decline.
- **Auctions:** proxy bidding (you set a max; you pay one step over the next
  bid), buy-now prices, a reserve on your own auctions, and bids in the last
  30 seconds add time. Outbid alerts, and the winner's card lands in the Vault.
- **Selling:** list one card or a bundle of up to six at a fixed price
  (with quick-sale / market / patient suggestions, the 5% fee and a "how fast
  will it sell" hint) or as an auction. Edit the price or take it down.
- **Trades:** any shape — 1-for-1, 2-for-1, up to four cards a side, plus
  cash either way — with a meter showing how likely the collector is to say
  yes. They accept, decline or ask for a little cash; they also send you
  trade offers for your cards (often two for one), which you can accept,
  decline or counter. There's always at least one waiting, from the first
  time you open the app.
- **Activity:** everything that happened, with amounts, plus your open offers
  and alerts. Notifications link straight to the listing or trade.

Listed, offered and bid cards and cash are held until the deal resolves. The
other collectors answer within seconds and the market keeps moving (new
listings, price cuts, sales, bids) while the app is open.

## Onboarding and tour

The research and the flow are in [docs/ONBOARDING.md](docs/ONBOARDING.md).
In short: one continuous scene. The logo lights up and drops into a sealed
pack, which reacts to an 18+ check and a few quick questions while Pip, the
logo given a face, comments. You tear it open with the real ceremony, save
the card through a sign-up sheet (email with a six-digit code, Apple, Google,
or skip), pick a collector name with a live avatar, see a lock-screen preview
of notifications, and the stage irises open into the app as the card drops
into your Vault. No payment is asked for anywhere. Then a six-step spotlight
tour, skippable and replayable from Settings.

### Sign-in

- **Apple:** real Sign in with Apple on iOS (Apple's own button). Android
  has no native Apple sign-in, so it isn't offered there; on the web it
  creates a demo account.
- **Google:** real Google sign-in when you set
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
  and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; without them it creates a demo
  account on the device.
- **Email:** demo only. No email is sent; the six-digit code shows up as an
  on-screen banner instead.

## Run it

Expo SDK 58 wants Node 22.13 or newer (it also runs on Node 20 with a
warning).

```bash
npm install
npx expo start          # press i (iOS simulator), a (Android) or w (web)
```

On a phone, install Expo Go and scan the QR code. Sign in with Apple needs
a development build (`npx expo run:ios`) rather than Expo Go.

## Deploy the web build

The web build is its own Vercel project, `godpack-mobile-demo` (the website's
project ignores this folder). `public/vercel.json` is copied into `dist/` on
export: it sends every route to `index.html` and caches the hashed bundles.

On anything that isn't a phone (a mouse or trackpad, or a screen 600px or
more on its short side), `index.html` hands over to `public/phone.html`: a
phone with a 390 x 764 screen, scaled to fit the window, running the app in
an iframe. Inside it the app sees a phone-sized window, so everything that
measures the screen (the tour, sheets, the onboarding) behaves as on a
phone. The address bar follows the app, and the notes beside the phone have
a QR code for opening it on a phone and a Start over button. Phones get the
app full screen, and are asked to turn upright in landscape. `?frame=0`
skips the phone.

```bash
npm run deploy:web     # expo export --platform web, then vercel deploy dist --prod
```

## Check it

```bash
npm run typecheck       # TypeScript
npm test                # Jest: store logic, the market engine, recommendations, auth, tour, sign-in buttons
npm run doctor          # expo-doctor
npm run export:native   # iOS + Android bundles (Hermes), including the ceremony's web bundle
npm run export:web && node tools/serve-dist.js 4180
BASE=http://localhost:4180 node e2e/app.e2e.js     # Playwright, iPhone-sized, screenshots in e2e/screenshots
BASE=http://localhost:4180 node e2e/market.e2e.js  # every Market flow (fast-forwards the page clock)
BASE=http://localhost:4180 node e2e/frame.e2e.js   # the phone frame at 13 window sizes and zooms, tablets, phones
```

The end-to-end test needs Playwright (`npm i -D playwright` and
`npx playwright install chromium`).

To stress-test layouts in development, open any screen on the web with
`?data=worst` (or `empty`, `one`): it swaps in worst-case data (a 16-letter
handle, a long email, a seven-figure balance, 1,284 cards, 23 alerts, an
unbreakable link in chat) and shows a switch to flip between data sets.
Builds never include it.

## Layout

```
app/               screens (expo-router): onboarding, signin, (tabs)/…, open, replay,
                   wallet, odds, pull, card/[uid], listing/[id], trade/…, sell,
                   profile/…, chat, settings, …
src/components/    UI kit, header, tab bar + chat dock, store, hits, tour, sign-in
src/dom/           the website's pack-opening ceremony as a DOM component
src/store/         demo account (session), preferences and the market, persisted on device
src/market/        the marketplace engine, shared with the website (engine.js + types)
src/onboarding/    the onboarding scene: stage, Pip, intro, sign-up sheet, code field, previews
src/lib/           motion tokens, recommendations, tour steps, auth, notifications, navigation
src/dev/           development-only worst-case data (?data=worst)
src/data/          cards, packs and odds, collectors, battle draws
e2e/               Playwright end-to-end tests (the whole app; the Market)
```
