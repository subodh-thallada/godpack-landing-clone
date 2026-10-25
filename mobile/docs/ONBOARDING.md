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

No payment is asked for anywhere in onboarding. It uses the website's
visual language (same tokens and components) rather than a separate
onboarding style.

1. **Welcome** — the three pack designs on the store's soft stage light, one
   line of value, and (on taller phones) a strip of real recent pulls.
   "Already have an account? Log in" jumps straight to sign-in.
2. **Age check** — 18+ only. Answering "under 18" is remembered, so the app
   stays closed rather than letting you tap back and answer again.
3. **Goals** (multi-select) — chase grails, build a collection, battle,
   graded slabs, sell for value. Shapes the recommendation and the tour copy.
4. **Experience** — new, casual or serious. Decides whether Safe mode starts on.
5. **Format** — raw cards, graded slabs or both (shown with real card and
   slab art). Picks Starter/Trainer vs Arena/Master.
6. **Comfortable spend** — a range or "just looking". Sets the recommended
   pack and a daily spending reminder; it never asks to pay.
7. **Building your setup** — a short visible step that applies the
   recommendation.
8. **Your setup is ready** — the recommended pack with its value range, and
   Safe mode and the reminder as switches you can change right there (your
   choices are kept).
9. **Free welcome pack** — the core moment, opened with the website's own
   pack-opening ceremony (guaranteed hit or better, and labelled as such).
10. **Save your pull** — Sign in with Apple (iOS), Google, or email, or skip.
11. **Collector name** — suggested from the sign-in, never one of the demo's
    built-in collectors, with an avatar colour.
12. **Notifications** — a preview of the three kinds of alert, then Turn on /
    Not now (the system prompt only follows "Turn on").

Then a six-step spotlight tour: wallet, packs, battles, vault, feed and
rewards. It shows "2 of 6", Back / Next and Skip, and can be replayed from
Settings.

Every step has a progress bar that starts partly filled, a back button,
large tap targets and haptic feedback. Progress, answers and the sign-in are
saved as you go, so relaunching resumes where you left off.
