// End-to-end test of the mobile app's web build at iPhone size: onboarding
// (every step and both side paths), the tour, and every feature. Saves a
// screenshot per step to e2e/screenshots and fails on any page error.
//
//   npx expo export -p web && node tools/serve-dist.js 4180 &
//   BASE=http://localhost:4180 node e2e/app.e2e.js
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:4180';
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png') && !/^(market|frame)-/.test(f)) fs.unlinkSync(path.join(OUT, f));

let fails = 0;
let shot = 0;
const ok = (name, cond, extra = '') => {
  if (!cond) fails++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};

async function newPage(browser) {
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    deviceScaleFactor: 2,
    ...(process.env.VIDEO ? { recordVideo: { dir: path.join(__dirname, 'video'), size: { width: 390, height: 664 } } } : null),
  });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push('pageerror ' + e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errors.push('console ' + m.text());
  });
  p.on('response', (r) => {
    if (r.status() >= 400) p.errors.push(`http ${r.status()} ${r.url()}`);
  });
  return p;
}

// Tabs keep their screens (and headers) mounted, so only match what's on screen.
const id = (p, testId) => p.locator(`[data-testid="${testId}"]:visible`).first();
const all = (p, testId) => p.locator(`[data-testid="${testId}"]:visible`);
const tap = async (p, testId) => {
  await id(p, testId).click();
  await p.waitForTimeout(350);
};
const visible = async (p, testId, timeout = 4000) =>
  id(p, testId)
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
// Whitespace is collapsed: Pip's lines arrive a word at a time, one element each.
const text = async (p, testId) => (await id(p, testId).innerText()).replace(/\s+/g, ' ').trim();
const money = (s) => parseFloat(s.replace(/[^\d.-]/g, ''));
// Lists render in batches with staggered entrances; wait for them to settle.
async function until(fn, timeout = 5000) {
  const end = Date.now() + timeout;
  for (;;) {
    if (await fn()) return true;
    if (Date.now() > end) return false;
    await new Promise((r) => setTimeout(r, 150));
  }
}
const snap = async (p, name) => {
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, `${String(++shot).padStart(2, '0')}-${name}.png`) });
};
const state = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('gp.session') || 'null')?.state?.s ?? null);

// Drive the website's pack-opening ceremony: Open pack, tap the slab to
// reveal it, then press one of its buttons. Returns the revealed value.
async function ceremony(p, action, name) {
  await p.locator('.pd-btn').waitFor({ state: 'visible', timeout: 15000 });
  if (name) await snap(p, `${name}-sealed`);
  await p.locator('.pd-btn').click();
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline && !(await p.locator('.pd-card[data-landed="true"]').count())) {
    await p
      .locator('.pd-flip')
      .click({ force: true, timeout: 800 })
      .catch(() => {});
    await p.waitForTimeout(350);
  }
  await p.locator('.pd-chrome-actions[data-on="true"]').waitFor({ timeout: 10000 });
  // The card that flew out of the pack must stay hidden over the slab even
  // if the browser forgets its finished fade (as iOS Safari can).
  const token = await p.evaluate(() => {
    const t = document.querySelector('.pd-token');
    t.getAnimations().forEach((a) => a.cancel());
    const cs = getComputedStyle(t);
    return cs.visibility === 'hidden' || cs.opacity === '0';
  });
  ok('the revealed card is not covered by the pack token', token);
  const value = (await p.locator('.pd-value').innerText()).trim();
  if (name) await snap(p, `${name}-revealed`);
  if (action) {
    await p.locator('.pd-cta', { hasText: action }).click();
    await p.waitForTimeout(700);
  }
  return value;
}

async function onboarding(p) {
  await p.goto(BASE + '/');
  ok('first launch opens onboarding', await visible(p, 'ob-step-welcome', 20000));
  ok('the logo intro plays first', (await p.locator('[data-testid="intro"]').count()) > 0);
  await p.locator('[data-testid="intro"]').waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});
  ok('the intro hands over to the welcome', (await p.locator('[data-testid="intro"]').count()) === 0);
  await p.waitForTimeout(900);
  ok('Pip introduces the pack', (await text(p, 'pip-says')).startsWith("Hi, I'm Pip"));
  await snap(p, 'welcome');
  await tap(p, 'ob-start');

  ok('age check shown', await visible(p, 'ob-step-age'));
  ok('progress counter starts at 1', (await text(p, 'ob-count')).startsWith('1/'));
  await p.waitForTimeout(500);
  await snap(p, 'age');
  await tap(p, 'ob-age-yes');

  ok('goals shown', await visible(p, 'ob-step-goals'));
  ok('continue disabled before a pick', (await text(p, 'ob-continue')).includes('Pick at least one'));
  await tap(p, 'opt-grails');
  await tap(p, 'opt-battle');
  ok('picks are counted', (await text(p, 'ob-picked')) === '2 picked');
  await p.waitForTimeout(700);
  ok('Pip reacts to a pick', (await text(p, 'pip-says')).includes('Battles'));
  await snap(p, 'goals');
  await tap(p, 'ob-continue');

  ok('format shown', await visible(p, 'ob-step-format'));
  await p.waitForTimeout(400);
  await snap(p, 'format');
  await tap(p, 'opt-both');
  ok('format moves on after the pack flips', await visible(p, 'ob-step-spend', 3000));

  await p.waitForTimeout(400);
  const box = await id(p, 'spend-slider').boundingBox();
  // Drag the thumb across the track, then settle on $10–50.
  await p.mouse.move(box.x + 15, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, { steps: 12 });
  await p.mouse.up();
  await p.waitForTimeout(500);
  ok('dragging the slider recommends a pack', /Master|Arena|Trainer/.test(await text(p, 'ob-spend-pack')));
  await tap(p, 'opt-mid');
  await p.waitForTimeout(500);
  ok('recommendation follows the answers (both + $10–50 → Arena)', (await text(p, 'ob-spend-pack')).startsWith('Arena'));
  await snap(p, 'spend');
  await tap(p, 'ob-continue');

  ok('experience shown', await visible(p, 'ob-step-experience'));
  await tap(p, 'opt-casual');
  await p.waitForTimeout(500);
  await snap(p, 'experience');
  ok('experience moves on to the sealed pack', await visible(p, 'ob-step-seal', 4000));
  ok('sealed pack is the recommendation', (await text(p, 'ob-recommended-name')) === 'Arena');
  await id(p, 'ob-safe').click();
  await p.waitForTimeout(700);
  await snap(p, 'seal');
  await tap(p, 'ob-continue');

  ok('welcome pack opens with the website ceremony', await visible(p, 'welcome-reveal', 6000));
  const value = await ceremony(p, 'Claim it', 'welcome-pack');
  ok('welcome pack reveals a value', /^\$\d/.test(value), value);

  ok('the card stays on stage for sign-in', await visible(p, 'ob-step-claim', 6000));
  ok('sign-up opens as a sheet over the scene', await visible(p, 'ob-sheet', 3000));
  ok('the pulled card stays in view above it', await visible(p, 'ob-card'));
  await p.waitForTimeout(900);
  ok('Pip quotes the value', (await text(p, 'pip-says')).includes(value));
  ok('Apple sign-in offered', await visible(p, 'auth-apple'));
  ok('Google sign-in offered', await visible(p, 'auth-google'));
  const apple = await id(p, 'auth-apple').boundingBox();
  const google = await id(p, 'auth-google').boundingBox();
  ok('Apple and Google sit side by side', Math.abs(apple.y - google.y) < 2 && apple.x < google.x);
  await snap(p, 'claim');
  await tap(p, 'auth-email');

  const disabled = async (t) => (await id(p, t).getAttribute('aria-disabled')) === 'true';
  ok('email gets its own step', await visible(p, 'ob-step-email'));
  ok('the card becomes the step icon', await visible(p, 'ob-card'));
  ok('send is disabled until there is an email', await disabled('ob-send-code'));
  await id(p, 'ob-email').fill('not-an-email');
  ok('a bad email keeps send disabled', await disabled('ob-send-code'));
  await id(p, 'ob-email').fill('collector@example.com');
  ok('a valid email enables send', !(await disabled('ob-send-code')));
  await p.waitForTimeout(300);
  await snap(p, 'email');
  await tap(p, 'ob-send-code');

  ok('code step shown', await visible(p, 'ob-step-code', 3000));
  ok('the code arrives as a banner', await visible(p, 'ob-code-banner', 4000));
  const code = (await text(p, 'ob-code-value')).replace(/\D/g, '');
  ok('the banner shows a 6-digit code', /^\d{6}$/.test(code), code);
  await p.waitForTimeout(400);
  await snap(p, 'code');
  await id(p, 'ob-code').fill(code === '000000' ? '111111' : '000000');
  ok('a wrong code is rejected', await visible(p, 'ob-code-error', 3000));
  await snap(p, 'code-wrong');
  await tap(p, 'ob-code-banner');
  ok('tapping the banner fills the code in', (await id(p, 'ob-code').inputValue()) === code);

  ok('collector name step shown', await visible(p, 'ob-step-name', 4000));
  ok('name suggested from the email', (await id(p, 'ob-handle').inputValue()) === 'collector');
  ok('your avatar previews live', (await text(p, 'ob-avatar')).startsWith('C'));
  await id(p, 'ob-handle').fill('orbit_ann');
  ok('taken names are rejected', (await p.getByText('That name is taken').count()) > 0);
  await id(p, 'ob-handle').fill('demo_collector');
  await tap(p, 'ob-color-26b5a8');
  await p.waitForTimeout(300);
  ok('the avatar is tagged with your name', (await text(p, 'ob-owner')) === '@demo_collector');
  await snap(p, 'name');

  // Relaunching mid-way keeps the sign-in.
  await p.reload();
  ok('relaunch resumes at the name step', await visible(p, 'ob-step-name', 15000));
  ok('relaunch keeps the email sign-in', (await text(p, 'ob-signed-with')).includes('collector@example.com'));
  await id(p, 'ob-handle').fill('demo_collector');
  await tap(p, 'ob-continue');

  ok('notification primer shown', await visible(p, 'ob-step-notify'));
  ok('a lock-screen preview shows what to expect', await visible(p, 'ob-phone', 3000));
  await p.waitForTimeout(2300);
  await snap(p, 'notify');
  await id(p, 'ob-notify-later').click();
  // The stage opens into the app while the card drops into the Vault.
  ok('the stage opens into the app', await visible(p, 'curtain', 3000));
  await p.waitForTimeout(380);
  await p.screenshot({ path: path.join(OUT, `${String(++shot).padStart(2, '0')}-opening-1.png`) });
  await p.waitForTimeout(280);
  await p.screenshot({ path: path.join(OUT, `${String(++shot).padStart(2, '0')}-opening-2.png`) });
  await p.waitForTimeout(280);
  await p.screenshot({ path: path.join(OUT, `${String(++shot).padStart(2, '0')}-opening-3.png`) });
}

async function tour(p) {
  ok('lands on Packs', await visible(p, 'screen-packs', 8000));
  ok('the opening finishes', await until(async () => (await p.locator('[data-testid="curtain"]').count()) === 0, 5000));
  ok('tour starts after the opening', await visible(p, 'tour-tip', 6000));
  const titles = [];
  for (let i = 0; i < 7; i++) {
    await p.waitForTimeout(500);
    titles.push(await text(p, 'tour-title'));
    ok(`tour step ${i + 1} counter`, (await text(p, 'tour-count')).toLowerCase() === `${i + 1} of 7`);
    await snap(p, `tour-${i + 1}`);
    await tap(p, 'tour-next');
  }
  ok('tour covers wallet, packs, battles, market, vault, feed, rewards', titles[0] === 'Your wallet' && titles[1] === 'Open packs here' && /Battle/.test(titles[2]) && /trade/.test(titles[3]) && /Vault/.test(titles[4]) && /Follow/.test(titles[5]) && /free pack|Rewards/.test(titles[6]), titles.join(' | '));
  ok('tour closes after the last step', !(await visible(p, 'tour-tip', 800)));
}

async function packs(p) {
  const s0 = await state(p);
  ok('account created with demo balance', s0 && s0.balance === 250, s0 && String(s0.balance));
  ok('welcome pull saved to the Vault', s0 && s0.vault.length === 3 && !!s0.welcomeUid);
  ok('handle, colour and email from onboarding', s0 && s0.handle === 'demo_collector' && s0.color === '#26b5a8' && s0.email === 'collector@example.com');
  const prefs = await p.evaluate(() => JSON.parse(localStorage.getItem('gp.prefs')).state);
  ok('setup choices are kept (Safe mode was turned on)', prefs.safe === true);
  ok('header shows the balance', money(await text(p, 'balance')) === 250);
  ok('getting-started checklist shown', await visible(p, 'checklist'));
  await snap(p, 'packs');

  await tap(p, 'odds');
  ok('odds sheet opens', await visible(p, 'odds-sheet'));
  ok('odds table has rows', (await all(p, 'odds-row').count()) >= 5);
  await snap(p, 'odds');
  await tap(p, 'odds-safe');
  await tap(p, 'sheet-close');
  ok('odds sheet closes', !(await visible(p, 'odds-sheet', 800)));

  await tap(p, 'tier-trigger');
  ok('pack tier menu opens', await visible(p, 'tier-starter'));
  await snap(p, 'tier-menu');
  await tap(p, 'tier-starter');
  ok('can pick the Starter pack', (await text(p, 'pack-name')) === 'Starter');
  await tap(p, 'qty-plus');
  ok('quantity goes up', (await text(p, 'qty')) === '2');
  await tap(p, 'open-pack');
  ok('ceremony opens', await visible(p, 'ceremony', 6000));
  await ceremony(p, 'See all 2 cards', 'ceremony');
  ok('results show every card', await visible(p, 'results', 6000));
  ok('two result tiles', (await all(p, 'result-tile').count()) === 2);
  await snap(p, 'results');
  const before = (await state(p)).balance;
  await id(p, 'result-sell').click();
  await p.waitForTimeout(400);
  ok('selling from results pays out', (await state(p)).balance > before);
  await tap(p, 'results-done');
  const s1 = await state(p);
  ok('two packs charged and recorded', s1.opened === 3 && s1.volume === 12, `opened ${s1.opened} volume ${s1.volume}`);

  await tap(p, 'qty-minus');
  await tap(p, 'open-pack');
  await ceremony(p, 'Keep');
  ok('single pack kept', (await state(p)).opened === 4 && (await visible(p, 'screen-packs', 6000)));
  ok('checklist ticks off opening a pack', (await text(p, 'checklist-count')).startsWith('1 of'));
}

async function vault(p) {
  await tap(p, 'tab-vault');
  ok('vault tab', await visible(p, 'screen-vault'));
  const n = (await state(p)).vault.length;
  ok('vault lists every card', n >= 3 && (await until(async () => (await all(p, 'vault-tile').count()) === n)), String(n));
  await snap(p, 'vault');
  await tap(p, 'vault-raw');
  await tap(p, 'vault-sort');
  await p.getByText('Value: high to low').first().click();
  await id(p, 'vault-search').fill('zzzz');
  ok('search with no match shows empty state', (await p.getByText('No cards match').count()) > 0);
  await id(p, 'vault-search').fill('');
  await tap(p, 'vault-all');

  await id(p, 'vault-tile').click();
  ok('card sheet opens', await visible(p, 'card-sheet'));
  await snap(p, 'card');
  await tap(p, 'card-ship');
  ok('ship form shown', await visible(p, 'ship-form'));
  await tap(p, 'ship-submit');
  ok('ship form validates', (await p.getByText('Enter a street address').count()) > 0);
  await id(p, 'ship-name').fill('Demo Collector');
  await id(p, 'ship-line1').fill('1 Market Street');
  await id(p, 'ship-city').fill('San Francisco');
  await id(p, 'ship-region').fill('CA');
  await id(p, 'ship-zip').fill('94105');
  await snap(p, 'ship-form');
  const b0 = (await state(p)).balance;
  await tap(p, 'ship-submit');
  const s = await state(p);
  ok('shipment created and $5 charged', s.shipments.length === 1 && Math.abs(b0 - 5 - s.balance) < 0.001);
  ok('shipped card left the Vault', s.vault.length === n - 1);

  await tap(p, 'vault-select');
  ok('sell tray appears', await visible(p, 'sell-tray'));
  await all(p, 'vault-tile').nth(0).click();
  await all(p, 'vault-tile').nth(1).click();
  ok('two selected', (await text(p, 'selected-count')).startsWith('2'));
  await snap(p, 'vault-select');
  await tap(p, 'sell-selected');
  ok('selected cards sold', (await state(p)).vault.length === n - 3);

  await tap(p, 'tab-packs');
  await tap(p, 'wallet');
  await id(p, 'wallet-sheet').getByText('Shipments').click();
  ok('shipments screen', await visible(p, 'screen-shipments', 6000));
  ok('shipment listed', (await all(p, 'shipment').count()) === 1);
  await snap(p, 'shipments');
  await tap(p, 'back');
}

async function battles(p) {
  await tap(p, 'tab-battles');
  ok('battles tab', await visible(p, 'screen-battles'));
  ok('lobby has a battle to join', (await all(p, 'lobby-battle').count()) >= 1);
  await snap(p, 'battles');
  await tap(p, 'tier-trigger');
  await tap(p, 'tier-starter');
  await id(p, 'lowest-toggle').click();
  await tap(p, 'start-battle');
  ok('posted battle waits for an opponent', await visible(p, 'my-battle'));
  await snap(p, 'battle-posted');
  ok('an opponent joins and the replay plays', await visible(p, 'replay', 15000));
  const settled = await state(p);
  ok('battle settles as soon as the opponent joins', settled.battles[0].status === 'done' && typeof settled.battles[0].won === 'boolean');
  ok('replay finishes with a result', await visible(p, 'replay-result', 12000));
  await snap(p, 'replay');
  await tap(p, 'replay-done');

  const b0 = (await state(p)).balance;
  await tap(p, 'join-battle');
  ok('joining opens a replay', await visible(p, 'replay', 5000));
  // Closing early can't lose anything: the battle already settled.
  await tap(p, 'replay-close');
  const s = await state(p);
  ok('joining charged the entry and settled at once', s.balance < b0 + 1000 && s.battles[0].status === 'done');
}

async function feed(p) {
  await tap(p, 'tab-feed');
  ok('feed tab', await visible(p, 'screen-feed'));
  ok('feed has posts', await until(async () => (await all(p, 'post').count()) > 5));
  await snap(p, 'feed');
  await p.locator('[aria-label="Share pull"]:visible').first().click();
  ok('share sheet opens', await visible(p, 'share-sheet'));
  await tap(p, 'share-chat');
  await tap(p, 'feed-tab-Following');
  await tap(p, 'follow-tidewalker');
  ok('follow from suggestions', (await state(p)).following.includes('tidewalker'));
  await snap(p, 'feed-following');
  await tap(p, 'feed-tab-Battles');
  await tap(p, 'replay');
  ok('past battle replays', await visible(p, 'replay-result', 15000));
  await tap(p, 'replay-close');
  await tap(p, 'feed-tab-Leaderboard');
  ok('leaderboard shown', await visible(p, 'feed-leaderboard'));
  await snap(p, 'leaderboard');
  await tap(p, 'chat-dock');
  ok('chat opens from the dock', await visible(p, 'screen-chat'));
  ok('shared pull is in chat', (await all(p, 'my-message').count()) >= 1);
  await id(p, 'chat-input').fill('gm from the e2e test');
  await tap(p, 'chat-send');
  ok('message sent', (await p.getByText('gm from the e2e test').count()) > 0);
  await snap(p, 'chat');
  await tap(p, 'back');
}

async function rewards(p) {
  await tap(p, 'tab-rewards');
  ok('rewards tab', await visible(p, 'screen-rewards'));
  await snap(p, 'rewards');
  await tap(p, 'check-in');
  ok('check-in starts a streak', (await text(p, 'streak')).startsWith('1-day'));
  ok('check-in button disables', (await id(p, 'check-in').getAttribute('aria-disabled')) === 'true');
  await tap(p, 'open-free');
  ok('free pack opens the ceremony', await visible(p, 'ceremony', 6000));
  await ceremony(p, 'Keep');
  ok('free pack used', (await state(p)).freePacks === 0);
  await p.mouse.wheel(0, 2000);
  await snap(p, 'rewards-checked-in');
}

async function walletAndMore(p) {
  await tap(p, 'wallet');
  ok('wallet sheet', await visible(p, 'wallet-sheet'));
  await snap(p, 'wallet');
  await tap(p, 'wallet-deposit');
  ok('deposit screen', await visible(p, 'screen-deposit'));
  const b0 = (await state(p)).balance;
  await tap(p, 'quick-100');
  await snap(p, 'deposit');
  await tap(p, 'deposit-submit');
  ok('deposit adds demo credit', Math.abs((await state(p)).balance - (b0 + 100)) < 0.001);

  await tap(p, 'wallet');
  await tap(p, 'wallet-withdraw');
  ok('withdraw screen', await visible(p, 'screen-withdraw'));
  await id(p, 'withdraw-amount').fill('20');
  await tap(p, 'withdraw-bank');
  await snap(p, 'withdraw');
  await tap(p, 'withdraw-submit');
  ok('withdrawal recorded', (await state(p)).withdrawals.length === 1);
  await tap(p, 'back');

  await tap(p, 'bell');
  ok('notifications screen', await visible(p, 'screen-notifications'));
  ok('notifications listed', await until(async () => (await all(p, 'notification').count()) >= 3));
  await snap(p, 'notifications');
  await p.locator('[data-testid="notification"]:visible', { hasText: /battle/i }).first().click();
  await p.waitForTimeout(800);
  ok('a notification link switches tabs instead of stacking them', (await visible(p, 'screen-vault')) && (await p.locator('[data-testid="tab-packs"]').count()) === 1);

  await tap(p, 'avatar');
  ok('profile screen', await visible(p, 'screen-profile'));
  ok('portfolio chart', await visible(p, 'portfolio'));
  await tap(p, 'range-7D');
  await snap(p, 'profile');
  await tap(p, 'my-followers');
  ok('connections sheet', await visible(p, 'connections'));
  await tap(p, 'sheet-close');

  await tap(p, 'to-settings');
  ok('settings screen', await visible(p, 'screen-settings'));
  await id(p, 'settings-bio').fill('testing the demo');
  await tap(p, 'settings-save');
  ok('profile saved', (await state(p)).bio === 'testing the demo');
  await tap(p, 'limit-25');
  await snap(p, 'settings');
  await tap(p, 'settings-tour');
  ok('tour replays from Settings', await visible(p, 'tour-tip', 6000));
  await tap(p, 'tour-skip');

  await p.goto(BASE + '/profile/vesper');
  ok('collector profile', await visible(p, 'screen-collector', 15000));
  await tap(p, 'follow-button');
  ok('follow from a profile', (await state(p)).following.includes('vesper'));
  await snap(p, 'collector');

  await p.reload();
  ok('state persists across reloads', (await visible(p, 'screen-collector', 15000)) && (await state(p)).bio === 'testing the demo');

  await p.goto(BASE + '/onboarding');
  ok('a signed-in deep link to onboarding cannot reset the account', (await visible(p, 'screen-packs', 15000)) && (await state(p)).bio === 'testing the demo');

  await p.goto(BASE + '/settings');
  await visible(p, 'screen-settings', 15000);
  await tap(p, 'settings-logout');
  await tap(p, 'settings-confirm-yes');
  ok('log out goes to sign-in', await visible(p, 'screen-signin', 8000));
  await snap(p, 'signin');
  await p.goto(BASE + '/wallet');
  ok('signed out, a deep link to the wallet goes to sign-in', await visible(p, 'screen-signin', 15000));
  await tap(p, 'auth-google');
  ok('logging back in lands on Packs', await visible(p, 'screen-packs', 8000));

  await p.goto(BASE + '/settings');
  await visible(p, 'screen-settings', 15000);
  await tap(p, 'settings-delete');
  await snap(p, 'delete-account');
  await tap(p, 'settings-confirm-yes');
  ok('deleting the account returns to onboarding', await visible(p, 'ob-step-welcome', 8000));
  ok('deleting the account removes it', (await state(p)) === null);
}

async function sidePaths(browser) {
  const p = await newPage(browser);
  await p.goto(BASE + '/');
  await visible(p, 'ob-start', 20000);
  await tap(p, 'ob-have-account');
  await tap(p, 'ob-age-yes');
  ok('returning path skips the questions', await visible(p, 'ob-step-claim'));
  ok('returning path has no skip', (await all(p, 'auth-skip').count()) === 0);
  await tap(p, 'auth-apple');
  ok('returning path asks about notifications', await visible(p, 'ob-step-notify'));
  await tap(p, 'ob-notify-later');
  ok('returning path enters the app', await visible(p, 'screen-packs', 8000));
  const s = await state(p);
  ok('returning account has no welcome pull', s && s.vault.length === 2);
  ok('returning path: no page errors', p.errors.length === 0, p.errors.slice(0, 3).join(' | '));
  await p.context().close();

  const q = await newPage(browser);
  await q.goto(BASE + '/');
  await visible(q, 'ob-start', 20000);
  await tap(q, 'ob-start');
  await tap(q, 'ob-age-no');
  ok('under-18 answer stops onboarding', await visible(q, 'ob-step-too-young'));
  await q.waitForTimeout(800);
  await snap(q, 'too-young');
  await q.reload();
  ok('under-18 answer is remembered', await visible(q, 'ob-step-too-young', 15000));
  ok('under-18 path: no page errors', q.errors.length === 0, q.errors.slice(0, 3).join(' | '));
  await q.context().close();
}

(async () => {
  const browser = await chromium.launch();
  const p = await newPage(browser);
  try {
    await onboarding(p);
    await tour(p);
    await packs(p);
    await vault(p);
    await battles(p);
    await feed(p);
    await rewards(p);
    await walletAndMore(p);
  } catch (e) {
    fails++;
    console.log('FAIL crashed: ' + e.message.split('\n').slice(0, 14).join('\n'));
    await p.screenshot({ path: path.join(OUT, 'crash.png') }).catch(() => {});
  }
  const errors = p.errors.filter((e) => !/push token changes|React DevTools/.test(e));
  ok('main flow: no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await sidePaths(browser);
  await browser.close();
  console.log(`\n${fails ? `${fails} FAILED` : 'ALL PASSED'} · screenshots in ${OUT}`);
  process.exit(fails ? 1 : 0);
})();
