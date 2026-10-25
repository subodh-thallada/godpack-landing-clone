# Godpack — phone app (unofficial demo)

An iOS and Android app (Expo / React Native) that sits alongside the web
recreation in this repo. It doesn't replace the website: the site keeps
deploying to Vercel from the repo root, and this folder is ignored there.

It has every feature of the web app — packs, battles, the vault (sell and
ship), the feed, chat, rewards, wallet, profiles — plus a first-run
onboarding and an in-app tour. Everything uses demo credit; no real money,
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

## Check it

```bash
npm run typecheck       # TypeScript
npm test                # Jest: store logic, recommendations, auth, tour, sign-in buttons
npm run doctor          # expo-doctor
npm run export:native   # iOS + Android bundles (Hermes), including the ceremony's web bundle
npm run export:web && node tools/serve-dist.js 4180
BASE=http://localhost:4180 node e2e/app.e2e.js   # Playwright, iPhone-sized, screenshots in e2e/screenshots
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
                   wallet, odds, pull, card/[uid], profile/…, chat, settings, …
src/components/    UI kit, header, tab bar + chat dock, store, hits, tour, sign-in
src/dom/           the website's pack-opening ceremony as a DOM component
src/store/         demo account (session) and preferences, persisted on device
src/onboarding/    the onboarding scene: stage, Pip, intro, sign-up sheet, code field, previews
src/lib/           motion tokens, recommendations, tour steps, auth, notifications, navigation
src/dev/           development-only worst-case data (?data=worst)
src/data/          cards, packs and odds, collectors, battle draws
e2e/               Playwright end-to-end test
```
