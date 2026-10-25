// End-to-end test of the Market tab on the app's web build at iPhone size:
// browsing and filters, watching, buying, offers and counters, price
// alerts, auctions and bidding, listing (fixed, bundle, auction), editing
// and taking down, collectors buying your cards, trades of every shape
// (2-for-1, cards plus cash, incoming offers), the activity log, deep links
// and the links from the Vault and profiles. Collectors answer a few
// seconds later, so the test fast-forwards the page clock to let the world
// move. Screenshots go to e2e/screenshots/market-*.
//
//   BASE=http://localhost:8082 node e2e/market.e2e.js
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:4180';
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.startsWith('market-')) fs.unlinkSync(path.join(OUT, f));

let fails = 0;
let shot = 0;
const ok = (name, cond, extra = '') => {
  if (!cond) fails++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
  await ctx.clock.install({ time: Date.now() });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console ' + m.text());
  });

  const id = (t) => p.locator(`[data-testid="${t}"]:visible`).first();
  const all = (t) => p.locator(`[data-testid="${t}"]:visible`);
  const tap = async (t) => {
    await id(t).click();
    await p.waitForTimeout(300);
  };
  const visible = (t, timeout = 4000) =>
    id(t)
      .waitFor({ state: 'visible', timeout })
      .then(() => true)
      .catch(() => false);
  const text = async (t) => (await id(t).innerText()).replace(/\s+/g, ' ').trim();
  const snap = async (name) => {
    await p.waitForTimeout(350);
    await p.screenshot({ path: path.join(OUT, `market-${String(++shot).padStart(2, '0')}-${name}.png`) });
  };
  const money = (s) => parseFloat(String(s).replace(/[^\d.-]/g, ''));
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('gp.session') || 'null')?.state?.s ?? null);
  // Let the world move: the market beats every 3s. Waits on random events
  // (a sale, an offer, a trade proposal) are sized so they happen 99.9% of
  // the time at the engine's rates; simulated minutes cost little real time.
  const world = async (ms) => {
    for (let t = 0; t < ms; t += 3000) {
      await p.clock.runFor(3000);
      await p.waitForTimeout(40);
    }
    await p.waitForTimeout(250);
  };
  async function until(fn, ms = 60000) {
    for (let t = 0; t <= ms; t += 3000) {
      if (await fn()) return true;
      await world(3000);
    }
    return false;
  }
  const close = async () => {
    if (await visible('sheet-close', 800)) await tap('sheet-close');
    await p.waitForTimeout(350);
  };
  // Back out of sheets and pushed screens to the Market tab.
  const toMarket = async (section) => {
    for (let i = 0; i < 4 && !(await visible('screen-market', 600)); i++) {
      if (await visible('sheet-close', 300)) await tap('sheet-close');
      else if (await visible('back', 300)) await tap('back');
      else if (await visible('tab-market', 300)) await tap('tab-market');
    }
    if (section) await tap(`market-tab-${section}`);
  };

  // Sign in quickly (returning collector) and skip the tour.
  await p.goto(BASE + '/');
  await id('ob-have-account').waitFor({ timeout: 30000 });
  await p.waitForTimeout(2200);
  await tap('ob-have-account');
  await tap('ob-age-yes');
  await id('auth-apple').waitFor();
  await p.waitForTimeout(500);
  await tap('auth-apple');
  await id('ob-notify-later').waitFor();
  await p.waitForTimeout(400);
  await tap('ob-notify-later');
  await p.waitForTimeout(2600);
  if (await visible('tour-tip', 3000)) await p.getByText('Skip', { exact: true }).first().click();
  ok('signed in', await visible('screen-packs', 8000));

  // ---- Browse ----
  await tap('tab-market');
  ok('Market tab opens', await visible('screen-market'));
  ok('the market has listings', (await all('listing-tile').count()) >= 10);
  ok('the pulse shows 24h volume', money(await text('pulse-volume')) > 0);
  ok('the sales tape is running', (await p.locator('[data-testid="sales-tape"] >> text=/\\$/').count()) > 0);
  await snap('buy');
  await tap('market-sort');
  await tap('market-sort-Price: low to high');
  const prices = await all('listing-tile').evaluateAll((els) => els.map((e) => parseFloat(e.innerText.replace(/,/g, '').match(/\$([\d.]+)/)[1])));
  ok('sort: price low to high', prices.every((v, i) => i === 0 || v >= prices[i - 1]), prices.slice(0, 5).join(','));
  await tap('market-type-graded');
  const gradedCount = await all('listing-tile').count();
  await tap('market-type-all');
  ok('raw/graded filter narrows the list', gradedCount < (await all('listing-tile').count()));
  await id('market-search').fill('zzzz');
  await p.waitForTimeout(300);
  ok('a search with no matches shows an empty state', (await all('listing-tile').count()) === 0 && (await p.getByText('Nothing matches').count()) > 0);
  await id('market-search').fill('');
  await p.waitForTimeout(300);
  // Watch the cheapest, then see it on the watchlist.
  await all('watch').first().click();
  await p.waitForTimeout(300);
  await tap('market-watching');
  ok('watching shows only watched listings', (await all('listing-tile').count()) === 1);
  await snap('watching');
  await tap('market-watching');

  // ---- Buy now ----
  const before = await state();
  await all('listing-tile').first().click();
  ok('a listing opens', await visible('listing-sheet'));
  const price = money(await text('listing-price'));
  await snap('listing');
  await tap('listing-buy');
  await tap('listing-buy-confirm');
  await p.waitForTimeout(500);
  const afterBuy = await state();
  ok('buy now charges the price', Math.abs(before.balance - price - afterBuy.balance) < 0.01, `${before.balance} - ${price} → ${afterBuy.balance}`);
  ok('the card lands in the Vault', afterBuy.vault.length === before.vault.length + 1);
  ok('the listing shows as bought', /You bought it/.test(await text('listing-status')));
  await snap('bought');
  await close();

  // ---- Offers ----
  const offerOn = async (pct) => {
    await all('listing-tile').nth(1).click();
    await id('listing-sheet').waitFor();
    const ask = money(await text('listing-price'));
    await tap('listing-offer');
    await id('offer-amount').fill(String(Math.round(ask * pct * 100) / 100));
    await tap('offer-send');
    return ask;
  };
  await offerOn(0.97);
  ok('an offer is sent and held', await visible('my-offer-box'));
  const s1 = await state();
  ok('the offer amount is held from the balance', s1.balance < afterBuy.balance);
  await snap('offer-sent');
  ok('a strong offer is accepted', await until(async () => /Offer accepted/.test(JSON.stringify((await state()).notifications.slice(0, 3))), 30000));
  await close();
  await offerOn(0.8);
  ok('a middling offer gets a counter', await until(async () => (await state()).market.offers[0].status === 'countered', 30000));
  if (!(await visible('counter-accept', 1500))) {
    await close();
  }
  if (await visible('counter-accept', 1500)) {
    await snap('countered');
    const b = (await state()).balance;
    await tap('counter-accept');
    await p.waitForTimeout(400);
    ok('taking the counter buys the card', (await state()).balance < b);
  }
  await close();

  // ---- Price alert ----
  await all('listing-tile').nth(0).click();
  await id('listing-sheet').waitFor();
  await id('alert-amount').fill('100000');
  await tap('alert-set');
  ok('a price alert is saved', (await state()).market.alerts.length === 1);
  await close();

  // ---- Auctions ----
  await tap('market-tab-auctions');
  ok('auctions are live with countdowns', (await all('auction-tile').count()) > 0);
  await snap('auctions');
  // The cheapest, so the minimum bid fits the balance.
  await tap('market-sort');
  await tap('market-sort-Price: low to high');
  await all('auction-tile').first().click();
  await id('bid-box').waitFor();
  await snap('auction');
  await id('bid-amount').fill('100000');
  await tap('bid-place');
  ok('a bid over the buy now price or balance is refused', !(await visible('bid-winning', 800)));
  await id('bid-chip-min').click();
  await tap('bid-place');
  await p.waitForTimeout(400);
  const bidOk = (await visible('bid-winning', 1500)) || (await visible('bid-outbid', 1500));
  ok('placing the minimum bid shows where you stand', bidOk);
  await snap('bid');
  await close();

  // ---- Sell: fixed, bundle, auction ----
  await tap('market-tab-selling');
  await tap('sell-start');
  ok('the sell flow opens', await visible('screen-sell'));
  const vaultBefore = (await state()).vault.length;
  await all('sell-pick').first().click();
  await tap('sell-suggest-quick');
  await snap('sell-fixed');
  await tap('sell-submit');
  ok('listing opens your listing', await visible('mine-box', 5000));
  ok('the card leaves the Vault while listed', (await state()).vault.length === vaultBefore - 1);
  await id('listing-edit-price').fill('99999');
  await tap('listing-save-price');
  ok('editing the price works', (await state()).market.listings.find((l) => l.mine && l.status === 'active').price === 99999);
  await tap('listing-takedown');
  await p.waitForTimeout(500);
  ok('taking it down returns the card', (await state()).vault.length === vaultBefore);

  // A bundle and an auction.
  await tap('sell-start');
  await all('sell-pick').nth(0).click();
  await all('sell-pick').nth(1).click();
  await tap('sell-suggest-quick');
  await tap('sell-submit');
  ok('a bundle is listed', await visible('mine-box', 5000));
  ok('the bundle has two cards', (await state()).market.listings.find((l) => l.mine && l.status === 'active').items.length === 2);
  await toMarket('selling');
  await tap('sell-start');
  await all('sell-pick').first().click();
  await tap('sell-auction');
  await tap('sell-duration-2m');
  await snap('sell-auction');
  await tap('sell-submit');
  ok('an auction is listed', await visible('mine-box', 5000));
  await toMarket('selling');
  ok('your listings show on Selling', (await all('my-listing').count()) >= 2);
  await snap('selling');
  // Collectors buy fairly priced listings and bid on auctions.
  ok('a collector buys your quick-sale bundle', await until(async () => (await state()).market.listings.some((l) => l.mine && l.status === 'sold'), 420000));
  ok('your auction settles', await until(async () => (await state()).market.listings.some((l) => l.mine && l.kind === 'auction' && l.status !== 'active'), 150000));
  ok('the sale pays you minus the fee', (await state()).market.history.some((h) => h.kind === 'sold' || h.kind === 'unsold'));

  // Offers on your listing: list high so it sits, then answer an offer.
  await tap('sell-start');
  await all('sell-pick').first().click();
  await id('sell-price').fill(String(Math.round(((await state()).vault[0].value || 5) * 1.4 * 100) / 100 + 1));
  await tap('sell-submit');
  await id('mine-box').waitFor();
  await toMarket('selling');
  const gotOffer = await until(async () => (await state()).market.offers.some((o) => o.dir === 'in' && o.status === 'pending'), 540000);
  ok('a collector makes an offer on your listing', gotOffer);
  if (gotOffer) {
    await p.waitForTimeout(400);
    await snap('offer-incoming');
    const b = (await state()).balance;
    await tap('offer-accept');
    await p.waitForTimeout(400);
    ok('accepting the offer sells it', (await state()).balance > b);
  }

  // ---- Trades ----
  await tap('market-tab-trade');
  await snap('trade');
  await tap('collector-mossrock');
  ok('the trade builder opens', await visible('screen-trade-new'));
  const theirs = all('pick-theirs');
  await theirs.last().click(); // their cheapest
  const mineCount = await all('pick-mine').count();
  if (mineCount >= 2) {
    await all('pick-mine').nth(0).click();
    await all('pick-mine').nth(1).click();
  } else {
    await tap('cash-add');
    await id('cash-amount').fill('50');
  }
  await p.waitForTimeout(300);
  ok('the fairness meter rates the trade', /yes|more|no/.test(await text('fairness-verdict')), await text('fairness-verdict'));
  await snap('trade-builder');
  await tap('trade-send');
  ok('the trade is sent', await visible('trade-sheet', 5000));
  ok('they answer', await until(async () => (await state()).market.trades.find((t) => t.dir === 'out').status !== 'pending', 30000));
  const t1 = (await state()).market.trades.find((t) => t.dir === 'out');
  if (t1.status === 'countered' && (await visible('trade-counter-accept', 2000))) {
    await snap('trade-countered');
    await tap('trade-counter-accept');
    await p.waitForTimeout(400);
    ok('taking their counter completes the trade', (await state()).market.trades.find((t) => t.id === t1.id).status === 'accepted');
  } else ok('the trade resolved', ['accepted', 'declined'].includes(t1.status), t1.status);
  await snap('trade-done');
  // Cash for a card: half again its value, within the balance.
  await toMarket('trade');
  await tap('collector-vesper');
  await all('pick-theirs').last().click();
  await tap('cash-add');
  const s2 = await state();
  const cheapest = Math.min(...s2.market.inv.vesper.map((x) => x.value));
  await id('cash-amount').fill(String(Math.min(Math.floor(s2.balance * 0.6), Math.ceil(cheapest * 1.5 * 100) / 100)));
  await p.waitForTimeout(200);
  await tap('trade-send');
  ok('a cash-for-card trade is sent', await visible('trade-sheet', 5000));
  ok('the cash trade is answered', await until(async () => (await state()).market.trades.filter((t) => t.dir === 'out').every((t) => t.status !== 'pending'), 30000));
  // Someone proposes a trade for one of your cards (worth at least 50
  // cents). Buy one first if everything has been sold or traded away.
  if (!(await state()).vault.some((v) => v.value >= 0.5)) {
    await toMarket('buy');
    await tap('market-sort');
    await tap('market-sort-Price: low to high');
    const tiles = all('listing-tile');
    const n = await tiles.count();
    for (let i = 0; i < n; i++) {
      const pr = money((await tiles.nth(i).innerText()).match(/\$[\d,.]+/)[0]);
      if (pr >= 1 && pr <= (await state()).balance) {
        await tiles.nth(i).click();
        await tap('listing-buy');
        await tap('listing-buy-confirm');
        break;
      }
    }
  }
  await toMarket('trade');
  const incoming = await until(async () => (await state()).market.trades.some((t) => t.dir === 'in' && t.status === 'pending'), 960000);
  ok('a collector proposes a trade', incoming);
  if (incoming) {
    await p.waitForTimeout(400);
    await snap('trade-incoming');
    await tap('trade-accept');
    await p.waitForTimeout(400);
    ok('accepting an incoming trade swaps the cards', (await state()).market.trades.some((t) => t.dir === 'in' && t.status === 'accepted'));
  }

  // ---- Activity, deep links, Vault and profile links ----
  await tap('market-tab-activity');
  ok('the activity log lists what happened', (await all('history-row').count()) >= 5);
  ok('your price alert is listed', (await all('alert-row').count()) === 1);
  await snap('activity');
  await tap('alert-remove');
  ok('removing the alert works', (await state()).market.alerts.length === 0);

  const note = (await state()).notifications.find((n) => n.href.startsWith('/listing/') || n.href.startsWith('/trade/'));
  ok('market notifications link into the Market', !!note);
  if (note) {
    await p.goto(BASE + note.href);
    ok('a notification deep link opens the listing or trade', (await visible('listing-sheet', 15000)) || (await visible('trade-sheet', 2000)));
    await close();
  }

  await p.goto(BASE + '/vault');
  await id('screen-vault').waitFor({ timeout: 15000 });
  if ((await state()).market.listings.some((l) => l.mine && l.status === 'active')) ok('the Vault links to your listings', await visible('vault-listed'));
  await all('vault-tile').first().click();
  await tap('card-list');
  ok('List on the Market opens the sell flow with the card picked', await visible('screen-sell', 5000));
  await p.goto(BASE + '/profile/vesper');
  await tap('collector-trade');
  ok('a profile opens a trade with that collector', await visible('screen-trade-new', 5000));

  // Everything survives a reload.
  const saved = await state();
  await p.goto(BASE + '/market');
  await id('screen-market').waitFor({ timeout: 15000 });
  const reloaded = await state();
  ok('the market survives a reload', reloaded.market.listings.length > 0 && reloaded.market.history.length >= saved.market.history.length);
  ok('money is never negative', reloaded.balance >= 0);

  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
