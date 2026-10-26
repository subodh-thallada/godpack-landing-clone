// The shared marketplace engine: buying, offers and counters, selling,
// auctions with proxy bidding, trades of every shape, watchlist and alerts,
// the simulated world, and money staying consistent throughout.
import { describe, expect, it } from '@jest/globals';
import { CARDS, PACKS, USERS, seeded } from '../data';
import { type Account, type Item, type Listing, ME, createMarket, increment, nice, valueOf } from '../market/engine';

// Node's fs and path, without pulling in Node's types for the whole app.
declare const require: (m: string) => {
  readFileSync: (p: string, enc: string) => string;
  join: (...p: string[]) => string;
};
declare const __dirname: string;
const { readFileSync } = require('fs');
const { join } = require('path');

const market = createMarket({
  cards: CARDS,
  users: USERS,
  packs: PACKS,
  href: (t) => (t.type === 'activity' ? '/market' : `/market/${t.type}/${t.id}`),
});
const T0 = 1_800_000_000_000;
const never = () => 0.999; // the world stays still: no random event fires
const always = () => 0; // every random event fires

const item = (uid: string, value: number, id = 'solar-crown'): Item => ({
  uid,
  id,
  value,
  tier: 'hit',
  at: T0,
  graded: false,
  pack: 'starter',
});

function account(
  balance = 1000,
  vault: Item[] = [item('a', 10), item('b', 6, 'tidal-glass'), item('c', 40, 'gilded-comet')],
): Account {
  const s: Account = { handle: 'tester', balance, vault, notifications: [] };
  market.ensure(s, T0, seeded(42));
  return s;
}
const fixed = (s: Account) => market.browse(s, { kind: 'fixed' }, T0)[0];
const auction = (s: Account) => market.browse(s, { kind: 'auction' }, T0)[0];
// Everything that's held: open offers, sent trades' cash and leading bids.
const heldNow = (s: Account) => market.held(s);

describe('shared engine', () => {
  it('is the same file the website runs', () => {
    const web = readFileSync(join(__dirname, '../../../app/js/market/engine.js'), 'utf8');
    const app = readFileSync(join(__dirname, '../market/engine.js'), 'utf8');
    expect(app).toBe(web);
  });

  it('seeds a market on first use', () => {
    const s = account();
    const m = s.market!;
    expect(m.listings.filter((l) => l.kind === 'fixed').length).toBe(16);
    expect(m.listings.filter((l) => l.kind === 'auction').length).toBe(5);
    expect(Object.keys(m.inv)).toHaveLength(USERS.length);
    expect(m.sales).toHaveLength(90);
    expect(m.sales[0].at).toBeGreaterThanOrEqual(m.sales[89].at);
    // Calling again doesn't reseed.
    const first = m.listings[0].id;
    market.ensure(s, T0 + 1, seeded(7));
    expect(s.market!.listings[0].id).toBe(first);
  });

  it('prices and steps', () => {
    expect(increment(4)).toBe(0.5);
    expect(increment(30)).toBe(1);
    expect(increment(150)).toBe(5);
    expect(increment(500)).toBe(10);
    expect(increment(5000)).toBe(25);
    expect(nice(123.4)).toBe(123);
    expect(nice(23.3)).toBe(23.5);
    expect(nice(0.1)).toBe(0.5);
  });
});

describe('buying', () => {
  it('buy now moves cash and the card', () => {
    const s = account();
    const l = fixed(s);
    const r = market.buy(s, l.id, T0, never);
    expect(r.ok).toBe(true);
    expect(s.balance).toBeCloseTo(1000 - l.price, 2);
    expect(s.vault.some((v) => v.id === l.items[0].id && v.at === T0)).toBe(true);
    expect(l.status).toBe('sold');
    expect(s.market!.sales[0].buyer).toBe(ME);
    expect(market.buy(s, l.id, T0, never).ok).toBe(false);
  });

  it('refuses without the funds and says how much is short', () => {
    const s = account(1);
    const l = market.browse(s, { kind: 'fixed', sort: 'Price: high to low' }, T0)[0];
    const r = market.buy(s, l.id, T0, never);
    expect(r).toMatchObject({ ok: false, error: 'funds' });
    expect(r.short).toBeCloseTo(l.price - 1, 2);
    expect(s.balance).toBe(1);
  });

  it('filters and sorts', () => {
    const s = account();
    const graded = market.browse(s, { type: 'graded' }, T0);
    expect(graded.every((l) => l.items.some((it) => it.graded))).toBe(true);
    const asc = market.browse(s, { kind: 'fixed', sort: 'Price: low to high' }, T0);
    expect(asc.map((l) => l.price)).toEqual([...asc.map((l) => l.price)].sort((a, b) => a - b));
    const ending = market.browse(s, { sort: 'Ending soon' }, T0);
    expect(ending[0].kind).toBe('auction');
    const q = market.browse(s, { q: 'solar' }, T0);
    expect(q.every((l) => l.items.some((it) => it.id === 'solar-crown'))).toBe(true);
  });
});

describe('offers', () => {
  it('a strong offer is accepted and the held cash pays for it', () => {
    const s = account();
    const l = fixed(s);
    const amount = Math.round(l.price * 0.96 * 100) / 100;
    expect(market.offer(s, l.id, amount, T0, never).ok).toBe(true);
    expect(s.balance).toBeCloseTo(1000 - amount, 2);
    expect(heldNow(s)).toBeCloseTo(amount, 2);
    market.tick(s, T0 + 9000, never);
    const o = s.market!.offers[0];
    expect(o.status).toBe('accepted');
    expect(s.balance).toBeCloseTo(1000 - amount, 2);
    expect(heldNow(s)).toBe(0);
    expect(s.vault.some((v) => v.id === l.items[0].id && v.at === T0 + 9000)).toBe(true);
    expect(s.notifications[0].title).toMatch(/Offer accepted/);
  });

  it('a middling offer gets a counter you can take', () => {
    const s = account();
    const l = fixed(s);
    const amount = Math.round(l.price * 0.8 * 100) / 100;
    market.offer(s, l.id, amount, T0, never);
    market.tick(s, T0 + 9000, never);
    const o = s.market!.offers[0];
    expect(o.status).toBe('countered');
    expect(o.counter!).toBeGreaterThan(amount);
    expect(o.counter!).toBeLessThan(l.price);
    expect(s.balance).toBe(1000); // money back while you decide
    expect(market.acceptCounter(s, o.id, T0 + 10000, never).ok).toBe(true);
    expect(s.balance).toBeCloseTo(1000 - o.counter!, 2);
    expect(l.status).toBe('sold');
  });

  it('a lowball offer is declined and refunded; too-low ones are not sent', () => {
    const s = account();
    const l = fixed(s);
    expect(market.offer(s, l.id, l.price * 0.3, T0, never)).toMatchObject({ ok: false, error: 'low' });
    market.offer(s, l.id, Math.round(l.price * 0.55 * 100) / 100, T0, never);
    market.tick(s, T0 + 9000, never);
    expect(s.market!.offers[0].status).toBe('declined');
    expect(s.balance).toBe(1000);
  });

  it('one pending offer per listing, and withdrawing refunds', () => {
    const s = account();
    const l = fixed(s);
    market.offer(s, l.id, l.price * 0.8, T0, never);
    expect(market.offer(s, l.id, l.price * 0.85, T0, never)).toMatchObject({ ok: false, error: 'pending' });
    expect(market.withdrawOffer(s, s.market!.offers[0].id, T0).ok).toBe(true);
    expect(s.balance).toBe(1000);
  });

  it('offers on your listing: accept, or counter within their limit', () => {
    const s = account();
    const r = market.list(s, { uids: ['c'], kind: 'fixed', price: 50 }, T0, never);
    const l = r.listing as Listing;
    const add = (amount: number, max: number) => {
      s.market!.offers.unshift({
        id: 'in' + amount,
        dir: 'in',
        listing: l.id,
        with: 'vesper',
        title: 'Gilded Comet',
        ask: 50,
        amount,
        max,
        at: T0,
        expires: T0 + 60000,
        status: 'pending',
      } as never);
      return 'in' + amount;
    };
    const low = add(30, 44);
    expect(market.respondOffer(s, low, 'counter', 48, T0, never).ok).toBe(true);
    market.tick(s, T0 + 8000, never);
    expect(s.market!.offers.find((o) => o.id === low)!.status).toBe('declined');
    expect(l.status).toBe('active');
    const ok = add(35, 46);
    market.respondOffer(s, ok, 'counter', 45, T0 + 9000, never);
    market.tick(s, T0 + 17000, never);
    expect(l.status).toBe('sold');
    expect(s.balance).toBeCloseTo(1000 + 45 * 0.95, 2);
  });
});

describe('selling', () => {
  it('listing takes the card out of the vault; taking it down puts it back', () => {
    const s = account();
    const r = market.list(s, { uids: ['a', 'b'], kind: 'fixed', price: 15 }, T0, never);
    expect(r.ok).toBe(true);
    expect(s.vault.map((v) => v.uid)).toEqual(['c']);
    const l = r.listing as Listing;
    expect(l.items).toHaveLength(2); // a bundle
    expect(market.editPrice(s, l.id, 14, T0).ok).toBe(true);
    expect(l.price).toBe(14);
    expect(market.cancel(s, l.id, T0).ok).toBe(true);
    expect(s.vault.map((v) => v.uid).sort()).toEqual(['a', 'b', 'c']);
  });

  it('collectors buy fairly priced listings, minus the 5% fee', () => {
    const s = account();
    market.list(s, { uids: ['c'], kind: 'fixed', price: 38 }, T0, never);
    market.tick(s, T0 + 16000, always);
    const l = s.market!.listings.find((x) => x.mine)!;
    expect(l.status).toBe('sold');
    expect(s.balance).toBeCloseTo(1000 + 38 * 0.95, 2);
    expect(s.market!.history.some((h) => h.kind === 'sold')).toBe(true);
  });

  it('validates listings', () => {
    const s = account();
    expect(market.list(s, { uids: ['nope'], price: 5 }, T0).ok).toBe(false);
    expect(market.list(s, { uids: ['a'], price: 0 }, T0).ok).toBe(false);
    expect(market.list(s, { uids: ['a'], kind: 'auction', start: 5, duration: '9y' }, T0).ok).toBe(false);
    expect(market.list(s, { uids: ['a'], kind: 'auction', start: 5, reserve: 4 }, T0).ok).toBe(false);
    expect(market.list(s, { uids: ['a'], kind: 'auction', start: 5, buyNow: 5 }, T0).ok).toBe(false);
  });
});

describe('auctions', () => {
  function npcLed(s: Account, max = 20, price = 10) {
    const a = auction(s);
    Object.assign(a, {
      top: { by: 'vesper', max },
      price,
      start: 5,
      buyNow: null,
      ends: T0 + 10 * 60000,
      bids: [{ by: 'vesper', amount: price, at: T0 }],
    });
    return a;
  }

  it('proxy bidding: a lower max is beaten at once, a higher one leads one step above', () => {
    const s = account();
    const a = npcLed(s);
    const lose = market.bid(s, a.id, 15, T0, never);
    expect(lose).toMatchObject({ ok: true, leading: false });
    expect(a.price).toBe(16);
    expect(s.balance).toBe(1000);
    const win = market.bid(s, a.id, 25, T0, never);
    expect(win).toMatchObject({ ok: true, leading: true });
    expect(a.price).toBe(21);
    expect(a.top).toEqual({ by: ME, max: 25 });
    expect(s.balance).toBe(975);
    expect(heldNow(s)).toBe(25);
    // Raising your own max holds the difference and doesn't move the price.
    expect(market.bid(s, a.id, 30, T0, never).ok).toBe(true);
    expect(a.price).toBe(21);
    expect(s.balance).toBe(970);
  });

  it('rejects bids under the next step', () => {
    const s = account();
    const a = npcLed(s);
    expect(market.bid(s, a.id, 10.5, T0, never)).toMatchObject({ ok: false, error: 'amount', min: 11 });
  });

  it('a late bid pushes the end out', () => {
    const s = account();
    const a = npcLed(s);
    a.ends = T0 + 5000;
    market.bid(s, a.id, 40, T0, never);
    expect(a.ends).toBe(T0 + 30000);
  });

  it('winning delivers the card and refunds the rest of your max', () => {
    const s = account();
    const a = npcLed(s);
    market.bid(s, a.id, 25, T0, never);
    a.ends = T0 + 1000;
    const ev = market.tick(s, T0 + 2000, never);
    expect(a.status).toBe('sold');
    expect(s.balance).toBeCloseTo(1000 - 21, 2);
    expect(heldNow(s)).toBe(0);
    expect(s.vault.some((v) => v.id === a.items[0].id)).toBe(true);
    expect(ev.some((e) => e.title.startsWith('You won'))).toBe(true);
  });

  it('being outbid by a collector returns your hold', () => {
    const s = account();
    const a = auction(s);
    Object.assign(a, { top: null, price: 5, start: 5, cap: 1000, buyNow: null, ends: T0 + 10 * 60000, bids: [] });
    market.bid(s, a.id, 6, T0, never);
    expect(s.balance).toBe(994);
    // At a fixed 0.5 a collector bids within the minute with a max of ~90% of
    // their 1,000 ceiling, well over yours.
    market.tick(s, T0 + 60000, () => 0.5);
    expect(a.top!.by).not.toBe(ME);
    expect(s.balance).toBe(1000);
    expect(s.notifications.some((n) => n.title.startsWith('Outbid'))).toBe(true);
  });

  it('buy now ends the auction', () => {
    const s = account();
    const a = auction(s);
    Object.assign(a, { top: null, price: 5, start: 5, buyNow: 30, bids: [] });
    expect(market.bid(s, a.id, 31, T0, never)).toMatchObject({ ok: false, error: 'buyNow' });
    expect(market.buy(s, a.id, T0, never).ok).toBe(true);
    expect(a.status).toBe('sold');
    expect(s.balance).toBe(970);
  });

  it('your auction: sold over the reserve, returned under it', () => {
    const s = account();
    const sold = market.list(s, { uids: ['c'], kind: 'auction', start: 10, duration: '2m', reserve: 20 }, T0, never)
      .listing as Listing;
    Object.assign(sold, { top: { by: 'sundial', max: 30 }, price: 24 });
    const unsold = market.list(s, { uids: ['a'], kind: 'auction', start: 2, duration: '2m', reserve: 9 }, T0, never)
      .listing as Listing;
    Object.assign(unsold, { top: { by: 'sundial', max: 5 }, price: 5 });
    expect(market.cancel(s, sold.id, T0).ok).toBe(false); // has bids
    market.tick(s, T0 + 3 * 60000, never);
    expect(sold.status).toBe('sold');
    expect(unsold.status).toBe('ended');
    expect(s.balance).toBeCloseTo(1000 + 24 * 0.95, 2);
    expect(s.vault.some((v) => v.uid === 'a')).toBe(true);
  });
});

describe('trades', () => {
  const theirs = (s: Account, handle = 'mossrock') =>
    market
      .inventory(s, handle)
      .slice()
      .sort((a, b) => a.value - b.value);

  // The trade you sent (collectors' offers to you sit alongside it).
  const sent = (s: Account) => s.market!.trades.find((t) => t.dir === 'out')!;

  it('2-for-1: a generous trade is accepted and cards change hands', () => {
    const s = account(1000, [item('a', 50), item('b', 50, 'tidal-glass')]);
    const want = theirs(s)[0];
    const r = market.proposeTrade(s, 'mossrock', { give: ['a', 'b'], get: [want.uid] }, T0, never);
    expect(r.ok).toBe(true);
    expect(s.vault).toHaveLength(0); // held while they think
    market.tick(s, T0 + 11000, never);
    const t = sent(s);
    expect(t.status).toBe('accepted');
    expect(s.vault.map((v) => v.id)).toEqual([want.id]);
    expect(market.inventory(s, 'mossrock').some((x) => x.uid === 'a')).toBe(true);
    expect(market.inventory(s, 'mossrock').some((x) => x.uid === want.uid)).toBe(false);
  });

  it('a short trade gets a cash counter, which completes it', () => {
    const s = account();
    const want = theirs(s).pop()!;
    const mine = item('z', round(want.value * 0.85), 'frost-halo');
    s.vault.unshift(mine);
    market.proposeTrade(s, 'mossrock', { give: ['z'], get: [want.uid] }, T0, never);
    market.tick(s, T0 + 11000, never);
    const t = sent(s);
    expect(t.status).toBe('countered');
    expect(t.counter!).toBeGreaterThan(0);
    const before = s.balance;
    expect(market.acceptTradeCounter(s, t.id, T0 + 12000, never).ok).toBe(true);
    expect(s.balance).toBeCloseTo(before - t.counter!, 2);
    expect(s.vault.some((v) => v.id === want.id)).toBe(true);
  });

  it('a lopsided trade is declined and everything comes back', () => {
    const s = account();
    const want = theirs(s).pop()!;
    s.vault.unshift(item('tiny', 0.5));
    market.proposeTrade(s, 'mossrock', { give: ['tiny'], get: [want.uid], cashGive: 0.5 }, T0, never);
    expect(s.balance).toBe(999.5);
    market.tick(s, T0 + 11000, never);
    expect(sent(s).status).toBe('declined');
    expect(s.balance).toBe(1000);
    expect(s.vault.some((v) => v.uid === 'tiny')).toBe(true);
  });

  it('cash either way: buying a card for cash, or a card for cards plus cash', () => {
    const s = account();
    const want = theirs(s)[0];
    expect(market.proposeTrade(s, 'mossrock', { get: [want.uid], cashGive: want.value * 2 }, T0, never).ok).toBe(true);
    expect(
      market.proposeTrade(s, 'quietfox', { give: ['c'], get: [theirs(s, 'quietfox')[0].uid], cashGet: 5 }, T0, never)
        .ok,
    ).toBe(true);
    market.tick(s, T0 + 11000, never);
    expect(s.market!.trades.filter((t) => t.dir === 'out').every((t) => t.status !== 'pending')).toBe(true);
  });

  it('validates trades', () => {
    const s = account();
    const want = theirs(s)[0];
    expect(market.proposeTrade(s, 'nobody', { give: ['a'], get: [want.uid] }, T0).ok).toBe(false);
    expect(market.proposeTrade(s, 'mossrock', { get: [want.uid] }, T0).error).toBe('give');
    expect(market.proposeTrade(s, 'mossrock', { give: ['a'] }, T0).error).toBe('get');
    expect(
      market.proposeTrade(s, 'mossrock', { give: ['a'], get: [want.uid], cashGive: 1, cashGet: 1 }, T0).error,
    ).toBe('cash');
    expect(market.proposeTrade(s, 'mossrock', { get: [want.uid], cashGive: 5000 }, T0).error).toBe('funds');
    s.vault.push(item('d', 1), item('e', 1));
    expect(market.proposeTrade(s, 'mossrock', { give: ['a', 'b', 'c', 'd', 'e'], get: [want.uid] }, T0).error).toBe(
      'size',
    );
  });

  it('cancelling a sent trade returns cards and cash', () => {
    const s = account();
    const want = theirs(s)[0];
    const t = market.proposeTrade(s, 'mossrock', { give: ['a'], get: [want.uid], cashGive: 3 }, T0, never).trade as {
      id: string;
    };
    expect(market.cancelTrade(s, t.id, T0).ok).toBe(true);
    expect(s.balance).toBe(1000);
    expect(s.vault.some((v) => v.uid === 'a')).toBe(true);
  });

  it('collectors propose trades for your cards, often two for one', () => {
    const s = account(1000, [item('big', 30, 'gilded-comet')]);
    let t = null;
    for (let i = 1; i < 40 && !t; i++) {
      market.tick(s, T0 + i * 60000, seeded(i));
      t = s.market!.trades.find((x) => x.dir === 'in' && x.status === 'pending') ?? null;
    }
    expect(t).not.toBeNull();
    expect(t!.give[0].uid).toBe('big');
    expect(valueOf(t!.get) + t!.cashGet).toBeGreaterThanOrEqual(30 * 0.95);
    expect(market.respondTrade(s, t!.id, 'accept', T0 + 41 * 60000, never).ok).toBe(true);
    expect(s.vault.some((v) => v.uid === 'big')).toBe(false);
    expect(s.vault.length).toBe(t!.get.length);
  });

  it('a trade offer is waiting from the start, and there is always one', () => {
    const s = account();
    const waiting = () => s.market!.trades.filter((t) => t.dir === 'in' && t.status === 'pending');
    expect(waiting()).toHaveLength(1);
    const first = waiting()[0];
    expect(s.vault.some((v) => v.uid === first.give[0].uid)).toBe(true);
    // Answer it, and another collector asks on the next beat.
    expect(market.respondTrade(s, first.id, 'decline', T0 + 1000, never).ok).toBe(true);
    expect(waiting()).toHaveLength(0);
    market.tick(s, T0 + 4000, never);
    expect(waiting()).toHaveLength(1);
    expect(waiting()[0].id).not.toBe(first.id);
    // It lapses after six minutes, and a fresh one takes its place.
    const second = waiting()[0];
    market.tick(s, second.expires! + 1, never);
    expect(waiting()).toHaveLength(1);
    expect(waiting()[0].id).not.toBe(second.id);
  });

  it('collectors ask for small cards too, and for nothing when the Vault is empty', () => {
    const small = account(1000, [item('dust', 0.2)]);
    expect(small.market!.trades.find((t) => t.dir === 'in')!.give[0].uid).toBe('dust');
    const none = account(1000, []);
    expect(none.market!.trades).toHaveLength(0);
    expect(market.tick(none, T0 + 4000, never)).toEqual([]);
  });

  it('rates a proposed trade before you send it', () => {
    const s = account();
    const want = theirs(s)[0];
    expect(market.evaluateTrade(s, 'mossrock', { give: [], get: [want.uid] }).verdict).toBe('empty');
    // The verdicts line up with what collectors accept (1.00-1.08x, +0.03 for VIP 3+).
    const at = (k: number) =>
      market.evaluateTrade(s, 'mossrock', { get: [want.uid], cashGive: Math.round(want.value * k * 100) / 100 });
    expect(at(1.2).verdict).toBe('great');
    expect(at(1.05).verdict).toBe('fair');
    expect(at(0.9).verdict).toBe('close');
    expect(at(0.4).verdict).toBe('unlikely');
    // Adding the suggested cash makes it a certain yes.
    const bad = at(0.4);
    expect(bad.short).toBeGreaterThan(0);
    expect(
      market.evaluateTrade(s, 'mossrock', {
        get: [want.uid],
        cashGive: Math.round(want.value * 0.4 * 100) / 100 + bad.short,
      }).verdict,
    ).toBe('great');
  });
});

describe('fixes from review', () => {
  it('a reserve is met as soon as the top max covers it', () => {
    const s = account();
    const a = market.list(s, { uids: ['c'], kind: 'auction', start: 10, duration: '5m', reserve: 30 }, T0, never)
      .listing as Listing;
    a.cap = 1000;
    market.tick(s, T0 + 60000, () => 0.5);
    expect(a.top!.max).toBeGreaterThan(30);
    expect(a.price).toBe(30);
    a.ends = T0 + 61000;
    market.tick(s, T0 + 62000, never);
    expect(a.status).toBe('sold');
  });

  it('an offer taken after a price cut pays the new price', () => {
    const s = account();
    const l = fixed(s);
    const amount = Math.round(l.price * 0.97 * 100) / 100;
    market.offer(s, l.id, amount, T0, never);
    l.price = Math.round(amount * 0.9 * 100) / 100;
    market.tick(s, T0 + 9000, never);
    expect(s.market!.offers[0].status).toBe('accepted');
    expect(s.balance).toBeCloseTo(1000 - l.price, 2);
  });

  it('you can still bid once the price is past Buy now', () => {
    const s = account();
    const a = auction(s);
    Object.assign(a, { top: { by: 'vesper', max: 40 }, price: 35, start: 5, buyNow: 30, ends: T0 + 600000 });
    expect(market.buy(s, a.id, T0, never).ok).toBe(false);
    expect(market.bid(s, a.id, 50, T0, never)).toMatchObject({ ok: true, leading: true });
  });

  it('no Buy now once time is up', () => {
    const s = account();
    const a = auction(s);
    Object.assign(a, { top: null, price: 5, start: 5, buyNow: 30, ends: T0 - 1 });
    expect(market.buy(s, a.id, T0, never)).toMatchObject({ ok: false, error: 'gone' });
  });

  it('a collector whose max reaches Buy now takes it', () => {
    const s = account();
    const a = market.list(s, { uids: ['c'], kind: 'auction', start: 10, duration: '5m', buyNow: 25 }, T0, never)
      .listing as Listing;
    a.cap = 1000;
    market.tick(s, T0 + 60000, () => 0.5);
    expect(a.status).toBe('sold');
    expect(a.soldFor).toBe(25);
    expect(s.balance).toBeCloseTo(1000 + 25 * 0.95, 2);
  });

  it('the same card twice is only listed or traded once', () => {
    const s = account();
    const l = market.list(s, { uids: ['a', 'a'], price: 9 }, T0, never).listing as Listing;
    expect(l.items).toHaveLength(1);
    market.cancel(s, l.id, T0);
    expect(s.vault.filter((v) => v.uid === 'a')).toHaveLength(1);
    const want = market.inventory(s, 'mossrock')[0];
    const t = market.proposeTrade(
      s,
      'mossrock',
      { give: ['a', 'a'], get: [want.uid, want.uid], cashGive: 100 },
      T0,
      never,
    ).trade as { give: Item[]; get: Item[] };
    expect(t.give).toHaveLength(1);
    expect(t.get).toHaveLength(1);
  });

  it('a card a collector offered you stays theirs until the trade closes', () => {
    const s = account(1000, [
      item('big', 30, 'gilded-comet'),
      item('g1', 9),
      item('g2', 9),
      item('g3', 9),
      item('g4', 9),
    ]);
    const m = s.market!;
    m.inv.mossrock = Array.from({ length: 14 }, (_, i) => item('mr' + i, 10 + i));
    const promised = m.inv.mossrock[13];
    m.trades.unshift({
      id: 'tin',
      dir: 'in',
      with: 'mossrock',
      give: [s.vault[0]],
      get: [promised],
      cashGive: 0,
      cashGet: 0,
      at: T0,
      expires: T0 + 600000,
      status: 'pending',
    } as never);
    // Four cards to them pushes their collection past 14, which trims it.
    market.proposeTrade(s, 'mossrock', { give: ['g1', 'g2', 'g3', 'g4'], get: ['mr0'] }, T0, never);
    market.tick(s, T0 + 11000, never);
    expect(m.trades.find((t) => t.dir === 'out')!.status).toBe('accepted');
    expect(market.inventory(s, 'mossrock').some((x) => x.uid === promised.uid)).toBe(true);
    expect(market.respondTrade(s, 'tin', 'accept', T0 + 12000, never).ok).toBe(true);
  });

  it('a countered incoming trade is closed and cleared later', () => {
    const s = account(1000, [item('big', 30, 'gilded-comet')]);
    let t = null;
    for (let i = 1; i < 40 && !t; i++) {
      market.tick(s, T0 + i * 60000, seeded(i));
      t = s.market!.trades.find((x) => x.dir === 'in' && x.status === 'pending') ?? null;
    }
    const want = market.inventory(s, t!.with)[0];
    market.proposeTrade(s, t!.with, { give: ['big'], get: [want.uid], replaces: t!.id }, T0 + 41 * 60000, never);
    expect(s.market!.trades.find((x) => x.id === t!.id)!.status).toBe('replaced');
    market.tick(s, T0 + 30 * 3600000, never);
    expect(s.market!.trades.some((x) => x.id === t!.id)).toBe(false);
  });

  it('a trade asking for a card you no longer have lapses on the next beat', () => {
    const s = account(1000, [item('big', 30, 'gilded-comet'), item('other', 5)]);
    const m = s.market!;
    m.trades.unshift({
      id: 'tin',
      dir: 'in',
      with: 'mossrock',
      give: [s.vault[0]],
      get: [],
      cashGive: 0,
      cashGet: 33,
      at: T0,
      expires: T0 + 600000,
      status: 'pending',
    } as never);
    m.trades.unshift({
      id: 'tin2',
      dir: 'in',
      with: 'sundial',
      give: [s.vault[1]],
      get: [],
      cashGive: 0,
      cashGet: 6,
      at: T0,
      expires: T0 + 600000,
      status: 'pending',
    } as never);
    // You list the card they want.
    expect(market.list(s, { uids: ['big'], kind: 'fixed', price: 40 }, T0 + 1000, never).ok).toBe(true);
    market.tick(s, T0 + 4000, never);
    expect(m.trades.find((t) => t.id === 'tin')!.status).toBe('expired');
    // The other one still stands, and goes through.
    expect(m.trades.find((t) => t.id === 'tin2')!.status).toBe('pending');
    expect(market.respondTrade(s, 'tin2', 'accept', T0 + 5000, never).ok).toBe(true);
  });
});

describe('watching', () => {
  it('watchlist and price alerts', () => {
    const s = account();
    const l = fixed(s);
    expect(market.toggleWatch(s, l.id)).toBe(true);
    expect(market.browse(s, { watching: true }, T0).map((x) => x.id)).toEqual([l.id]);
    expect(market.toggleWatch(s, l.id)).toBe(false);
    const a = market.addAlert(s, { card: CARDS[2].id, below: 1e6 }, T0);
    expect(a.ok).toBe(true);
    // A fixed 0.2 lists new single cards (CARDS[2]) without selling the rest.
    let fired = false;
    for (let i = 1; i < 20 && !fired; i++)
      fired = market.tick(s, T0 + i * 30000, () => 0.2).some((e) => e.title.startsWith('Price alert'));
    expect(fired).toBe(true);
    market.removeAlert(s, (a.alert as { id: string }).id);
    expect(s.market!.alerts).toHaveLength(0);
  });
});

describe('the world over time', () => {
  it('keeps money and cards consistent through a busy hour', () => {
    const s = account(500, [
      item('a', 10),
      item('b', 6, 'tidal-glass'),
      item('c', 40, 'gilded-comet'),
      item('d', 3, 'coral-drift'),
    ]);
    const rand = seeded(2024);
    let now = T0;
    for (let i = 0; i < 1200; i++) {
      now += 3000;
      // Act like a person now and then.
      if (i % 40 === 5) {
        const l = market.browse(s, { kind: 'fixed', sort: 'Price: low to high' }, now)[0];
        if (l) market.offer(s, l.id, l.price * (0.6 + rand() * 0.35), now, rand);
      }
      if (i % 90 === 10 && s.vault.length)
        market.list(s, { uids: [s.vault[0].uid], price: s.vault[0].value * 1.05 }, now, rand);
      if (i % 70 === 20) {
        const a = market.browse(s, { kind: 'auction' }, now)[0];
        if (a) market.bid(s, a.id, market.minBid(a) + 2, now, rand);
      }
      if (i % 110 === 30 && s.vault.length) {
        const h = USERS[i % USERS.length].handle;
        const want = market.inventory(s, h)[0];
        if (want) market.proposeTrade(s, h, { give: [s.vault[0].uid], get: [want.uid] }, now, rand);
      }
      market.tick(s, now, rand);
      expect(s.balance).toBeGreaterThanOrEqual(0);
    }
    // No card is in two places at once.
    const m = s.market!;
    const uids = [
      ...s.vault.map((v) => v.uid),
      ...m.listings.filter((l) => l.mine && l.status === 'active').flatMap((l) => l.items.map((x) => x.uid)),
      ...m.trades
        .filter((t) => t.dir === 'out' && (t.status === 'pending' || t.status === 'countered'))
        .flatMap((t) => t.give.map((x) => x.uid)),
    ];
    expect(new Set(uids).size).toBe(uids.length);
    // Holds add up.
    const offers = m.offers.filter((o) => o.dir === 'out' && o.status === 'pending').reduce((a, o) => a + o.amount, 0);
    const bids = m.listings
      .filter((l) => l.kind === 'auction' && l.status === 'active' && !l.mine)
      .reduce((a, l) => a + (l.hold ?? 0), 0);
    const trades = m.trades
      .filter((t) => t.dir === 'out' && (t.status === 'pending' || t.status === 'countered'))
      .reduce((a, t) => a + t.cashGive, 0);
    expect(market.held(s)).toBeCloseTo(offers + bids + trades, 2);
    // Leading bids are the only auctions holding money.
    m.listings.filter((l) => l.kind === 'auction' && l.hold).forEach((l) => expect(l.top!.by).toBe(ME));
    expect(s.notifications.length).toBeLessThanOrEqual(30);
    expect(m.history.length).toBeGreaterThan(0);
    expect(new Set(m.history.map((h) => h.id)).size).toBe(m.history.length);
  });

  it('reports market stats', () => {
    const s = account();
    const p = market.pulse(s, T0);
    expect(p.sales24).toBeGreaterThan(0);
    expect(p.listed).toBe(16);
    expect(p.auctions).toBe(5);
    const st = market.cardStats(s, 'solar-crown', null, null, T0);
    expect(st.series.length).toBeGreaterThanOrEqual(0);
    expect(st.series.every(([t], i, xs) => i === 0 || t >= xs[i - 1][0])).toBe(true);
    // Narrowing to one tier only counts that tier's sales.
    const tier = s.market!.sales.find((x) => x.card === 'solar-crown')!.tier;
    const one = market.cardStats(s, 'solar-crown', null, tier, T0);
    expect(one.series.length).toBe(
      s.market!.sales.filter((x) => x.card === 'solar-crown' && x.tier === tier).slice(0, 40).length,
    );
  });
});

function round(v: number) {
  return Math.round(v * 100) / 100;
}
