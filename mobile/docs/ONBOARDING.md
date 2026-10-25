# Onboarding and in-app tour — research and design

## What the research says

Sources are mostly practitioner and vendor write-ups, so the numbers are
directional; the patterns are consistent across them.

- **Ask a few questions, and make every answer change something.** Two to five
  personalization questions is the common recommendation; each should visibly
  change what the user sees next. Vendors report personalized flows lifting
  conversion, with the biggest gains on iOS.
  ([Adapty](https://adapty.io/blog/how-to-personalize-onboarding-and-paywalls-in-your-mobile-app/),
  [Iris](https://irisapp.cc/ios-app-onboarding-flow-design-6-patterns-that-reduce-drop-off/),
  [Setgreet](https://www.setgreet.com/blog/mobile-app-onboarding-best-practices))
- **Show progress, starting partly filled.** Progress bars keep people going
  (unfinished-task effect), and starting the bar slightly filled ("endowed
  progress") helps further.
  ([Eleken](https://www.eleken.co/blog-posts/mobile-app-onboarding-best-practices))
- **Value before the account.** Let people reach the core moment first, then ask
  for an account when they have something to save; a short "your setup is
  ready" summary after the questions makes the sign-up feel earned.
  ([Apple developer forums](https://developer.apple.com/forums/thread/840281),
  [Adapty](https://adapty.io/blog/markdown/how-to-fix-your-onboarding-flow.md))
- **Offer Apple and Google sign-in.** One-tap social sign-in reduces sign-up
  friction. If an app offers Google sign-in for its primary account, App Store
  guideline 4.8 also requires an equivalent privacy-preserving option, which
  Sign in with Apple satisfies.
  ([Apple forums on 4.8](https://developer.apple.com/forums/thread/765145))
- **Prime before the notification prompt.** iOS shows its permission dialog
  once; a short in-app screen that explains the concrete benefit first, with a
  "Not now", gets higher opt-in and keeps a second chance.
  ([Hurree](https://blog.hurree.co/ios-push-notification-permissions-best-practises),
  [CleverTap](https://docs.clevertap.com/docs/register-for-push))
- **Balance completion against quality.** Practitioners who run hundreds of
  onboarding tests (e.g. Superwall's Jake Mor) stress measuring install →
  key moment and testing onboarding as much as paywalls, but note shorter flows
  can attract lower-quality users — so keep it short *and* meaningful.
  ([thread](https://x.com/jakemor/status/1458169112031551492),
  [post](https://x.com/jakemor/status/2079763622449045923))
- **Tours: short, skippable, one thing at a time.** Three to five steps,
  spotlight a single element, one sentence of copy, visible "2 of 5" and Skip,
  and the option to replay later.
  ([Adobe Spectrum coach marks](https://spectrum.adobe.com/page/coach-mark),
  [UX Planet](https://uxplanet.org/mobile-onboarding-interact-don-t-tell-f0c35da2b2b4))
- **Randomized items must disclose odds before purchase** (App Store 3.1.1).
  ([Fenwick](https://fenwick.com/insights/publications/apple-now-requires-disclosure-of-loot-box-odds))

## The flow we built

One continuous scene rather than a stack of pages: a sealed pack stays on
stage the whole way and reacts to each answer, and Pip (the logo's hexagon,
given a face) comments on what you pick. It borrows patterns from Luma's and
Ahead's onboarding (a lit-up logo intro, orbit rings, sign-up as a sheet over
the scene, an email code step, a big profile avatar, a lock-screen preview for
notifications) in the website's own tokens and components. No payment is
asked for anywhere.

1. **Intro** — the logo lights up in the dark, then drifts down into the
   pack's emblem as the scene fades in and cards fan out onto faint orbit
   rings. About 1.5s, once; a tap skips it.
2. **Welcome** — "Your first pack is waiting", or "Log in" for returning
   collectors.
3. **Age check** — 18+ only, and an under-18 answer is remembered.
4. **Goals** (multi-select) — each pick adds a charm that circles the pack.
5. **Format** — raw cards, graded slabs or both; the pack turns over to the
   matching design.
6. **Comfortable spend** — a slider with momentum and soft ends; the pack
   follows it live. It never asks to pay.
7. **Experience** — decides whether Safe mode starts on (a shield wraps the
   pack).
8. **Sealed** — the recommended pack, with Safe mode and the daily reminder as
   switches.
9. **Tear it open** — the website's own ceremony, flying out of the pack on
   stage. Guaranteed a hit or better, and labelled as such.
10. **Save your pull** — the card you pulled settles at the top, and sign-up
    rises as a sheet over the scene: email first, Apple and Google side by
    side, or skip. The sheet resists a drag rather than dismissing.
11. **Email and code** (if you chose email) — the card becomes the step's icon
    in a soft halo; Send code stays disabled until the address is valid and
    shows a spinner while sending. The six-digit code arrives as a frosted
    banner (it's a demo, so nothing is emailed); tap it to fill the code in.
    A wrong code shakes and clears.
12. **Collector name** — your avatar, live as you type, over a field of the
    logo's sparkles, with the card tucked behind it.
13. **Notifications** — a lock screen where three real-looking alerts arrive
    and stack (the newest is about your card), then Turn on / Not now; the
    system prompt only follows "Turn on".

Then the stage irises open into the app while the card flies down into the
Vault tab, which pops to catch it, and a six-step spotlight tour starts
(skippable, "2 of 6", replayable from Settings).

Progress, answers and the sign-in are saved as you go, so relaunching resumes
where you left off. The progress bar starts partly filled.

## Motion rules

All motion uses the tokens in `src/lib/motion.ts` (from Emil Kowalski's
animation guidance): ease-out for anything entering or leaving, ease-in-out
for things moving on screen, never ease-in; UI motion under 300ms; springs
given as `{ duration, dampingRatio }` with bounce only after a flick (or for
Pip, the one playful thing on screen); nothing grows from `scale(0)`. Drags
project momentum and hand their velocity to the spring, edges rubber-band,
and haptics fire on the same frame as the visual, once per action. Reduced
motion keeps the fades and drops the travel. Tab switches and other
many-times-a-day actions don't animate.
