// The marketplace: fixed-price listings and bundles, offers and counter
// offers, auctions with proxy bidding, trades of any shape (1-for-1,
// 2-for-1, cards plus cash either way), a watchlist, price alerts and a
// sales tape that feeds price history. The other side of every deal is one
// of the demo's invented collectors, who answers a few seconds later. It's
// all demo credit.
//
// Shared by the website (app/js/market/engine.js) and the app
// (mobile/src/market/engine.js is an exact copy; a test checks they match).
// It's pure: functions change the account (`s`) in place, and the clock and
// randomness are passed in, so both apps and the tests drive it the same way.
// Cards and cash that are offered, listed or bid are held (taken out of the
// vault or balance) until the deal resolves, then delivered or returned.

export const ME = 'me';
export const FEE = 0.05; // seller's fee on every market sale
export const MIN_OFFER = 0.5; // offers under half the asking price aren't sent
export const SNIPE_MS = 30000; // a bid in the last 30s pushes the end out to 30s
export const COUNTER_TTL = 3 * 60000; // a counter-offer waits 3 minutes
export const INCOMING_TTL = 6 * 60000; // offers and trades from others wait 6 minutes
export const MAX_SIDE = 4; // cards per side of a trade
export const MAX_BUNDLE = 6;
export const DURATIONS = [
  { id: '2m', label: '2 min', ms: 2 * 60000 },
  { id: '5m', label: '5 min', ms: 5 * 60000 },
  { id: '15m', label: '15 min', ms: 15 * 60000 },
  { id: '1h', label: '1 hour', ms: 60 * 60000 },
];
export const SORTS = ['Ending soon', 'Newest', 'Price: low to high', 'Price: high to low', 'Best deal'];

const TIERS = ['common', 'core', 'hit', 'chase', 'grail'];
const HOUR = 3600000;

export const round2 = (v) => Math.round(v * 100) / 100;
// Bid steps grow with the price, like any auction house.
export function increment(p) {
  if (p < 10) return 0.5;
  if (p < 50) return 1;
  if (p < 200) return 5;
  if (p < 1000) return 10;
  return 25;
}
// Prices people would actually type.
export function nice(v) {
  if (v >= 100) return Math.round(v);
  if (v >= 20) return Math.round(v * 2) / 2;
  return Math.max(0.5, round2(v));
}
export const valueOf = (items) => round2(items.reduce((a, it) => a + it.value, 0));
const between = (rand, lo, hi) => lo + (hi - lo) * rand();
const pick = (rand, xs) => xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))];
const hash = (str) => str.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function createMarket({ cards, users, packs, href }) {
  const cardById = (id) => cards.find((c) => c.id === id) || cards[0];
  const handles = users.map((u) => u.handle);

  // ---- the collectors on the other side ----

  // Stable per collector: a rating, a sales count and two cards they want
  // (worth a little more to them in a trade).
  function collector(handle) {
    const u = users.find((x) => x.handle === handle) || users[0];
    const h = hash(handle);
    return {
      ...u,
      rating: round2(4.6 + (h % 41) / 100),
      sales: 12 + (h % 480),
      wants: [cards[h % cards.length].id, cards[(h >>> 5) % cards.length].id],
    };
  }

  // ---- state ----

  function nextId(m, prefix, rand) {
    m.seq = (m.seq || 0) + 1;
    return prefix + m.seq.toString(36) + Math.floor(rand() * 1679616).toString(36);
  }

  // A card one of the collectors owns, drawn from a pack's odds.
  function makeItem(m, rand, now, { pack, card } = {}) {
    const p = pack || packs[Math.min(packs.length - 1, Math.floor(Math.pow(rand(), 1.6) * packs.length))];
    const [tier, lo, hi] = p.odds[Math.min(p.odds.length - 1, Math.floor(Math.pow(rand(), 1.9) * p.odds.length))];
    const value = round2(lo + (Math.min(hi, lo * 3) - lo) * Math.pow(rand(), 1.6));
    return {
      uid: nextId(m, 'm', rand),
      id: (card || pick(rand, cards)).id,
      value,
      tier,
      at: now - Math.floor(rand() * 3 * 86400000),
      graded: p.slabs,
      pack: p.id,
    };
  }

  function npcListing(m, rand, now) {
    const seller = pick(rand, handles);
    const bundle = rand() < 0.12;
    const items = bundle ? [makeItem(m, rand, now), makeItem(m, rand, now)] : [makeItem(m, rand, now)];
    const value = valueOf(items);
    return {
      id: nextId(m, 'l', rand),
      kind: 'fixed',
      seller,
      mine: false,
      items,
      price: nice(value * between(rand, bundle ? 0.82 : 0.86, 1.32)),
      at: now,
      status: 'active',
      watchers: Math.floor(rand() * 14),
    };
  }

  function npcAuction(m, rand, now) {
    const item = makeItem(m, rand, now);
    const a = {
      id: nextId(m, 'a', rand),
      kind: 'auction',
      seller: pick(rand, handles),
      mine: false,
      items: [item],
      start: nice(item.value * between(rand, 0.35, 0.65)),
      price: 0,
      buyNow: rand() < 0.5 ? nice(item.value * between(rand, 1.3, 1.6)) : null,
      reserve: null,
      cap: item.value * between(rand, 0.85, 1.35),
      ends: now + Math.floor(between(rand, 3, 14) * 60000),
      top: null,
      bids: [],
      myMax: 0,
      hold: 0,
      at: now,
      status: 'active',
      watchers: Math.floor(rand() * 20),
    };
    a.price = a.start;
    const seed = Math.floor(rand() * 4);
    for (let i = 0; i < seed; i++) npcBid(null, a, rand, now - (seed - i) * 40000, false);
    return a;
  }

  function sale(m, rand, { item, price, buyer, seller, at }) {
    m.sales.unshift({
      id: nextId(m, 's', rand),
      card: item.id,
      graded: item.graded,
      tier: item.tier,
      price: round2(price),
      at,
      buyer,
      seller,
    });
    m.sales = m.sales.slice(0, 160);
  }

  // Lazily adds the market to an account (older accounts don't have one).
  function ensure(s, now = Date.now(), rand = Math.random) {
    if (s.market && s.market.v === 1) return s.market;
    const m = {
      v: 1,
      seq: 0,
      listings: [],
      offers: [],
      trades: [],
      inv: {},
      sales: [],
      watch: [],
      alerts: [],
      history: [],
      seen: {},
      lastTick: now,
    };
    s.market = m;
    handles.forEach((h) => {
      m.inv[h] = Array.from({ length: 5 + Math.floor(rand() * 4) }, () => makeItem(m, rand, now));
    });
    for (let i = 0; i < 16; i++) m.listings.push(npcListing(m, rand, now - Math.floor(rand() * 6 * HOUR)));
    for (let i = 0; i < 5; i++) m.listings.push(npcAuction(m, rand, now));
    // Two days of sales, so every card has some price history.
    for (let i = 0; i < 90; i++) {
      const item = makeItem(m, rand, now);
      sale(m, rand, {
        item,
        price: item.value * between(rand, 0.85, 1.2),
        buyer: pick(rand, handles),
        seller: pick(rand, handles),
        at: now - Math.floor(rand() * 48 * HOUR),
      });
    }
    m.sales.sort((a, b) => b.at - a.at);
    return m;
  }

  // ---- bookkeeping ----

  function notify(s, title, body, target, now) {
    s.notifications.unshift({
      id: nextId(s.market, 'n', Math.random),
      title,
      body,
      href: href(target),
      at: now,
      read: false,
    });
    s.notifications = s.notifications.slice(0, 30);
  }
  function log(m, kind, title, body, target, now, amount = null) {
    m.history.unshift({ id: nextId(m, 'h', Math.random), kind, title, body, target, at: now, amount });
    m.history = m.history.slice(0, 80);
  }
  const titleOf = (items) =>
    items.length ? cardById(items[0].id).name + (items.length > 1 ? ` + ${items.length - 1} more` : '') : 'Cash';
  const fresh = (m, rand, it, now) => ({ ...it, uid: nextId(m, 'v', rand), at: now });
  const credit = (s, amount) => {
    s.balance = round2(s.balance + amount);
  };

  // ---- reading the market ----

  const isLive = (l) => l.status === 'active';
  // The asking price, or an auction's current bid.
  const askOf = (l) => l.price;
  const minBid = (a) => (a.top ? round2(a.price + increment(a.price)) : a.start);
  const dealOf = (l) => {
    const v = valueOf(l.items);
    return v ? (v - askOf(l)) / v : 0;
  };
  const leading = (a) => !!a.top && a.top.by === ME;

  function browse(
    s,
    { q = '', kind = 'all', type = 'all', tier = 'all', sort = 'Ending soon', watching = false, seller = '' } = {},
    now = Date.now(),
  ) {
    const m = ensure(s, now);
    const query = q.trim().toLowerCase();
    let list = m.listings.filter((l) => isLive(l) && !l.mine);
    if (kind !== 'all') list = list.filter((l) => l.kind === kind);
    if (type !== 'all') list = list.filter((l) => l.items.some((it) => (type === 'graded' ? it.graded : !it.graded)));
    if (tier !== 'all') list = list.filter((l) => l.items.some((it) => it.tier === tier));
    if (watching) list = list.filter((l) => m.watch.includes(l.id));
    if (seller) list = list.filter((l) => l.seller === seller);
    if (query)
      list = list.filter(
        (l) =>
          l.seller.includes(query) ||
          l.items.some(
            (it) =>
              cardById(it.id).name.toLowerCase().includes(query) || cardById(it.id).set.toLowerCase().includes(query),
          ),
      );
    const by = {
      'Ending soon': (a, b) =>
        (a.kind === 'auction' ? a.ends : Infinity) - (b.kind === 'auction' ? b.ends : Infinity) || b.at - a.at,
      Newest: (a, b) => b.at - a.at,
      'Price: low to high': (a, b) => askOf(a) - askOf(b),
      'Price: high to low': (a, b) => askOf(b) - askOf(a),
      'Best deal': (a, b) => dealOf(b) - dealOf(a),
    }[sort];
    return by ? list.sort(by) : list;
  }

  const get = (s, id) => (s.market ? s.market.listings.find((l) => l.id === id) : null);
  const mine = (s) => ensure(s).listings.filter((l) => l.mine);

  // What's tied up in open offers, trades and leading bids.
  function held(s) {
    const m = ensure(s);
    return round2(
      m.offers.filter((o) => o.dir === 'out' && o.status === 'pending').reduce((a, o) => a + o.amount, 0) +
        m.trades
          .filter((t) => t.dir === 'out' && (t.status === 'pending' || t.status === 'countered'))
          .reduce((a, t) => a + t.cashGive, 0) +
        m.listings.filter((l) => l.kind === 'auction' && isLive(l) && !l.mine).reduce((a, l) => a + l.hold, 0),
    );
  }

  // Price history for one card, optionally one finish (raw or graded) and
  // one tier: a grail and a common of the same card sell for very different
  // prices, so mixing them makes the numbers meaningless.
  function cardStats(s, cardId, graded, tier = null, now = Date.now()) {
    const m = ensure(s, now);
    const same = (it) =>
      it.id === cardId && (graded == null || it.graded === graded) && (tier == null || it.tier === tier);
    const sales = m.sales.filter((x) => same({ id: x.card, graded: x.graded, tier: x.tier }));
    const live = m.listings.filter((l) => isLive(l) && l.kind === 'fixed' && l.items.length === 1 && same(l.items[0]));
    const recent = sales.filter((x) => now - x.at < 7 * 24 * HOUR);
    return {
      floor: live.length ? Math.min(...live.map((l) => l.price)) : null,
      last: sales.length ? sales[0].price : null,
      avg: recent.length ? round2(recent.reduce((a, x) => a + x.price, 0) / recent.length) : null,
      count24: sales.filter((x) => now - x.at < 24 * HOUR).length,
      listed: live.length,
      series: sales
        .slice(0, 40)
        .map((x) => [x.at, x.price])
        .reverse(),
    };
  }

  function pulse(s, now = Date.now()) {
    const m = ensure(s, now);
    const day = m.sales.filter((x) => now - x.at < 24 * HOUR);
    const counts = {};
    day.forEach((x) => {
      counts[x.card] = (counts[x.card] || 0) + 1;
    });
    const hot = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return {
      volume24: round2(day.reduce((a, x) => a + x.price, 0)),
      sales24: day.length,
      listed: m.listings.filter((l) => isLive(l) && l.kind === 'fixed').length,
      auctions: m.listings.filter((l) => isLive(l) && l.kind === 'auction').length,
      hot: hot ? { card: hot[0], sales: hot[1] } : null,
      tape: m.sales.slice(0, 14),
    };
  }

  // How a trade looks from the other collector's side. `ratio` is what they
  // get over what they give (cards they want count for a bit more).
  function evaluateTrade(s, handle, { give = [], get = [], cashGive = 0, cashGet = 0 }) {
    const m = ensure(s);
    const c = collector(handle);
    const mineItems = give.map((u) => s.vault.find((v) => v.uid === u)).filter(Boolean);
    const theirs = get.map((u) => (m.inv[handle] || []).find((v) => v.uid === u)).filter(Boolean);
    const gain = mineItems.reduce((a, it) => a + it.value * (c.wants.includes(it.id) ? 1.15 : 1), 0) + cashGive;
    const loss = valueOf(theirs) + cashGet;
    const ratio = loss ? gain / loss : gain ? 2 : 0;
    // Collectors want 1.00-1.08 times what they give up (VIP 3+ want 0.03
    // more), so "fair" is a likely yes and "great" a certain one. Under 0.75
    // they decline; in between they counter.
    const sure = c.vip >= 3 ? 1.11 : 1.08;
    return {
      giveValue: round2(valueOf(mineItems) + cashGive),
      getValue: round2(loss),
      ratio,
      verdict:
        !loss || !gain
          ? 'empty'
          : ratio >= sure
            ? 'great'
            : ratio >= 1.04
              ? 'fair'
              : ratio >= 0.75
                ? 'close'
                : 'unlikely',
      // The extra cash that would make it a certain yes.
      short: ratio >= sure ? 0 : Math.ceil((loss * sure - gain) * 100) / 100,
    };
  }

  // ---- buying ----

  function deliver(s, rand, items, now) {
    const got = items.map((it) => fresh(s.market, rand, it, now));
    s.vault = [...got, ...s.vault];
    return got;
  }

  function buy(s, id, now = Date.now(), rand = Math.random) {
    const m = ensure(s, now, rand);
    const l = get(s, id);
    if (!l || !isLive(l) || l.mine || (l.kind === 'auction' && now >= l.ends)) return { ok: false, error: 'gone' };
    const price = l.kind === 'auction' ? l.buyNow : l.price;
    if (!price || (l.kind === 'auction' && l.price >= l.buyNow)) return { ok: false, error: 'gone' };
    const refund = l.kind === 'auction' ? l.hold : 0;
    if (s.balance + refund < price) return { ok: false, error: 'funds', short: round2(price - s.balance - refund) };
    credit(s, refund - price);
    if (l.kind === 'auction') {
      l.hold = 0;
      l.top = { by: ME, max: price };
      l.price = price;
      l.bids.unshift({ by: ME, amount: price, at: now, buyNow: true });
    }
    const got = deliver(s, rand, l.items, now);
    settleSold(m, rand, l, ME, price, now);
    closeOffersOn(s, l, now);
    log(
      m,
      'bought',
      `Bought ${titleOf(l.items)}`,
      `From @${l.seller} for $${price.toFixed(2)}.`,
      { type: 'listing', id: l.id },
      now,
      -price,
    );
    return { ok: true, items: got, price };
  }

  function settleSold(m, rand, l, buyer, price, now) {
    l.status = 'sold';
    l.buyer = buyer;
    l.soldFor = round2(price);
    l.soldAt = now;
    // A bundle's price is split across its cards by value, so each card's
    // price history stays honest.
    const total = valueOf(l.items) || 1;
    l.items.forEach((it) =>
      sale(m, rand, { item: it, price: (price * it.value) / total, buyer, seller: l.mine ? ME : l.seller, at: now }),
    );
    if (buyer !== ME && m.inv[buyer])
      m.inv[buyer] = trimInv(m, buyer, [...l.items.map((it) => ({ ...it })), ...m.inv[buyer]]);
  }

  // A collector keeps their 14 newest cards, plus any card that's part of an
  // open trade (so a trade they offered you can't lose a card).
  function trimInv(m, handle, inv) {
    const promised = new Set(
      m.trades
        .filter((t) => t.with === handle && (t.status === 'pending' || t.status === 'countered'))
        .flatMap((t) => t.get.map((x) => x.uid)),
    );
    return inv.filter((x, i) => i < 14 || promised.has(x.uid));
  }

  // Pending offers on a listing that just closed are returned.
  function closeOffersOn(s, l, now) {
    s.market.offers.forEach((o) => {
      if (o.listing !== l.id || (o.status !== 'pending' && o.status !== 'countered')) return;
      if (o.dir === 'out' && o.status === 'pending') credit(s, o.amount);
      o.status = 'expired';
      o.closedAt = now;
    });
  }

  // ---- offers ----

  function offer(s, id, amount, now = Date.now(), rand = Math.random) {
    const m = ensure(s, now, rand);
    const l = get(s, id);
    amount = round2(amount);
    if (!l || !isLive(l) || l.mine || l.kind !== 'fixed') return { ok: false, error: 'gone' };
    if (!(amount > 0) || amount >= l.price) return { ok: false, error: 'amount' };
    if (amount < l.price * MIN_OFFER) return { ok: false, error: 'low', min: nice(l.price * MIN_OFFER) };
    if (m.offers.some((o) => o.listing === id && o.dir === 'out' && o.status === 'pending'))
      return { ok: false, error: 'pending' };
    if (s.balance < amount) return { ok: false, error: 'funds', short: round2(amount - s.balance) };
    credit(s, -amount);
    const o = {
      id: nextId(m, 'o', rand),
      dir: 'out',
      listing: id,
      with: l.seller,
      title: titleOf(l.items),
      ask: l.price,
      amount,
      at: now,
      respondAt: now + Math.floor(between(rand, 3000, 8000)),
      accept: between(rand, 0.86, 0.95),
      status: 'pending',
    };
    m.offers.unshift(o);
    log(
      m,
      'offer',
      `Offered $${amount.toFixed(2)} for ${o.title}`,
      `@${l.seller} is asking $${l.price.toFixed(2)}.`,
      { type: 'listing', id },
      now,
      -amount,
    );
    return { ok: true, offer: o };
  }

  function withdrawOffer(s, offerId, now = Date.now()) {
    const m = ensure(s, now);
    const o = m.offers.find((x) => x.id === offerId);
    if (!o || o.dir !== 'out' || (o.status !== 'pending' && o.status !== 'countered')) return { ok: false };
    if (o.status === 'pending') credit(s, o.amount);
    o.status = 'withdrawn';
    o.closedAt = now;
    return { ok: true };
  }

  // Take a seller's counter: pay the counter price and the card is yours.
  function acceptCounter(s, offerId, now = Date.now(), rand = Math.random) {
    const m = ensure(s, now, rand);
    const o = m.offers.find((x) => x.id === offerId);
    if (!o || o.dir !== 'out' || o.status !== 'countered') return { ok: false, error: 'gone' };
    const l = get(s, o.listing);
    if (!l || !isLive(l)) {
      o.status = 'expired';
      return { ok: false, error: 'gone' };
    }
    o.counter = Math.min(o.counter, l.price);
    if (s.balance < o.counter) return { ok: false, error: 'funds', short: round2(o.counter - s.balance) };
    credit(s, -o.counter);
    deliver(s, rand, l.items, now);
    settleSold(m, rand, l, ME, o.counter, now);
    o.status = 'accepted';
    o.closedAt = now;
    o.amount = o.counter;
    closeOffersOn(s, l, now);
    log(
      m,
      'bought',
      `Bought ${o.title}`,
      `Took @${l.seller}'s counter of $${o.counter.toFixed(2)}.`,
      { type: 'listing', id: l.id },
      now,
      -o.counter,
    );
    return { ok: true };
  }

  // An offer someone made on one of your listings.
  function respondOffer(s, offerId, action, amount, now = Date.now(), rand = Math.random) {
    const m = ensure(s, now, rand);
    const o = m.offers.find((x) => x.id === offerId);
    if (!o || o.dir !== 'in' || o.status !== 'pending') return { ok: false, error: 'gone' };
    const l = get(s, o.listing);
    if (!l || !isLive(l)) {
      o.status = 'expired';
      return { ok: false, error: 'gone' };
    }
    if (action === 'accept') {
      // If you've cut the price below their offer, they pay the new price.
      o.amount = Math.min(o.amount, l.price);
      sellMine(s, rand, l, o.with, o.amount, now);
      o.status = 'accepted';
      o.closedAt = now;
      return { ok: true };
    }
    if (action === 'decline') {
      o.status = 'declined';
      o.closedAt = now;
      return { ok: true };
    }
    amount = round2(amount);
    if (!(amount > o.amount) || amount > l.price) return { ok: false, error: 'amount' };
    o.status = 'countered';
    o.counter = amount;
    o.respondAt = now + Math.floor(between(rand, 3000, 7000));
    log(
      m,
      'counter',
      `Countered @${o.with} at $${amount.toFixed(2)}`,
      `They offered $${o.amount.toFixed(2)} for ${o.title}.`,
      { type: 'listing', id: l.id },
      now,
    );
    return { ok: true };
  }

  function sellMine(s, rand, l, buyer, price, now) {
    const m = s.market;
    credit(s, price * (1 - FEE));
    settleSold(m, rand, l, buyer, price, now);
    closeOffersOn(s, l, now);
    const net = round2(price * (1 - FEE));
    log(
      m,
      'sold',
      `Sold ${titleOf(l.items)}`,
      `@${buyer} paid $${round2(price).toFixed(2)}. You got $${net.toFixed(2)} after the 5% fee.`,
      { type: 'listing', id: l.id },
      now,
      net,
    );
    return net;
  }

  // ---- selling ----

  function list(
    s,
    { uids, kind = 'fixed', price, start, duration = '5m', reserve = null, buyNow = null },
    now = Date.now(),
    rand = Math.random,
  ) {
    const m = ensure(s, now, rand);
    uids = [...new Set(uids || [])];
    const items = uids.map((u) => s.vault.find((v) => v.uid === u));
    if (!items.length || items.some((x) => !x)) return { ok: false, error: 'items' };
    if (items.length > MAX_BUNDLE) return { ok: false, error: 'bundle' };
    const value = valueOf(items);
    let l;
    if (kind === 'fixed') {
      price = round2(price);
      if (!(price >= 0.5)) return { ok: false, error: 'price' };
      l = {
        id: nextId(m, 'l', rand),
        kind,
        seller: s.handle,
        mine: true,
        items,
        price,
        at: now,
        status: 'active',
        watchers: 0,
      };
    } else {
      start = round2(start);
      const d = DURATIONS.find((x) => x.id === duration);
      if (!(start >= 0.5) || !d) return { ok: false, error: 'price' };
      if (reserve != null && !(reserve >= start)) return { ok: false, error: 'reserve' };
      if (buyNow != null && !(buyNow > start)) return { ok: false, error: 'buyNow' };
      l = {
        id: nextId(m, 'a', rand),
        kind,
        seller: s.handle,
        mine: true,
        items,
        start,
        price: start,
        reserve: reserve != null ? round2(reserve) : null,
        buyNow: buyNow != null ? round2(buyNow) : null,
        cap: value * between(rand, 0.85, 1.3),
        ends: now + d.ms,
        top: null,
        bids: [],
        myMax: 0,
        hold: 0,
        at: now,
        status: 'active',
        watchers: 0,
      };
    }
    s.vault = s.vault.filter((v) => !uids.includes(v.uid));
    m.listings.unshift(l);
    log(
      m,
      'listed',
      `Listed ${titleOf(items)}`,
      kind === 'fixed'
        ? `For $${l.price.toFixed(2)}.`
        : `Auction from $${l.start.toFixed(2)}, ends in ${DURATIONS.find((x) => x.id === duration).label}.`,
      { type: 'listing', id: l.id },
      now,
    );
    return { ok: true, listing: l };
  }

  function editPrice(s, id, price, now = Date.now()) {
    const m = ensure(s, now);
    const l = get(s, id);
    price = round2(price);
    if (!l || !l.mine || !isLive(l) || l.kind !== 'fixed') return { ok: false, error: 'gone' };
    if (!(price >= 0.5)) return { ok: false, error: 'price' };
    const was = l.price;
    l.price = price;
    // Open offers stand; one taken above the new price pays the new price.
    log(
      m,
      'edited',
      `Repriced ${titleOf(l.items)}`,
      `$${was.toFixed(2)} → $${price.toFixed(2)}.`,
      { type: 'listing', id },
      now,
    );
    return { ok: true };
  }

  function cancel(s, id, now = Date.now()) {
    const m = ensure(s, now);
    const l = get(s, id);
    if (!l || !l.mine || !isLive(l)) return { ok: false, error: 'gone' };
    if (l.kind === 'auction' && l.top) return { ok: false, error: 'bids' };
    l.status = 'cancelled';
    l.closedAt = now;
    s.vault = [...l.items, ...s.vault];
    closeOffersOn(s, l, now);
    log(
      m,
      'cancelled',
      `Took down ${titleOf(l.items)}`,
      'The cards are back in your Vault.',
      { type: 'listing', id },
      now,
    );
    return { ok: true };
  }

  // ---- auctions ----

  // Proxy bidding, the way eBay does it: you set the most you'd pay, and the
  // price only rises one step above the next-highest bid.
  function bid(s, id, max, now = Date.now(), rand = Math.random) {
    const m = ensure(s, now, rand);
    const a = get(s, id);
    max = round2(max);
    if (!a || a.kind !== 'auction' || a.mine || !isLive(a) || now >= a.ends) return { ok: false, error: 'gone' };
    if (leading(a)) {
      if (!(max > a.top.max)) return { ok: false, error: 'amount', min: round2(a.top.max + increment(a.top.max)) };
      if (s.balance < max - a.hold) return { ok: false, error: 'funds', short: round2(max - a.hold - s.balance) };
      credit(s, -(max - a.hold));
      a.hold = max;
      a.top.max = max;
      a.myMax = max;
      log(
        m,
        'bid',
        `Raised your max on ${titleOf(a.items)}`,
        `Up to $${max.toFixed(2)}.`,
        { type: 'listing', id },
        now,
      );
      return { ok: true, leading: true };
    }
    const floor = minBid(a);
    if (!(max >= floor)) return { ok: false, error: 'amount', min: floor };
    if (a.buyNow && a.price < a.buyNow && max >= a.buyNow) return { ok: false, error: 'buyNow' };
    if (s.balance < max) return { ok: false, error: 'funds', short: round2(max - s.balance) };
    a.myMax = max;
    if (!a.top) {
      a.top = { by: ME, max };
      a.price = a.start;
    } else if (max > a.top.max) {
      a.price = round2(Math.min(max, a.top.max + increment(a.top.max)));
      a.top = { by: ME, max };
    } else {
      // Their proxy beats you straight away.
      a.bids.unshift({ by: ME, amount: max, at: now });
      a.price = round2(Math.min(a.top.max, max + increment(max)));
      meetReserve(a);
      a.bids.unshift({ by: a.top.by, amount: a.price, at: now });
      snipe(a, now);
      log(
        m,
        'outbid',
        `Outbid on ${titleOf(a.items)}`,
        `@${a.top.by}'s max is higher. Current bid $${a.price.toFixed(2)}.`,
        { type: 'listing', id },
        now,
      );
      return { ok: true, leading: false, price: a.price };
    }
    meetReserve(a);
    credit(s, -max);
    a.hold = max;
    a.bids.unshift({ by: ME, amount: a.price, at: now });
    a.bids = a.bids.slice(0, 30);
    snipe(a, now);
    log(
      m,
      'bid',
      `Bid on ${titleOf(a.items)}`,
      `You're winning at $${a.price.toFixed(2)} (your max $${max.toFixed(2)}).`,
      { type: 'listing', id },
      now,
    );
    return { ok: true, leading: true, price: a.price };
  }

  function snipe(a, now) {
    if (a.ends - now < SNIPE_MS) a.ends = now + SNIPE_MS;
  }

  // A reserve is met as soon as the top bidder's max covers it: the price
  // goes up to the reserve instead of sitting under it.
  function meetReserve(a) {
    if (a.reserve != null && a.top && a.top.max >= a.reserve && a.price < a.reserve) a.price = a.reserve;
  }

  // A collector bids (on anyone's auction, yours included).
  function npcBid(s, a, rand, now, notifyOutbid = true) {
    const others = handles.filter((h) => h !== a.seller && (!a.top || h !== a.top.by));
    const by = pick(rand, others);
    const max = round2(a.cap * between(rand, 0.75, 1.05));
    if (a.buyNow && a.price < a.buyNow && max >= a.buyNow) return s ? { buyNow: true, by } : null;
    const floor = minBid(a);
    if (max < floor) return null;
    let outbid = false;
    if (!a.top) {
      a.top = { by, max };
      a.price = a.start;
    } else if (max > a.top.max) {
      outbid = a.top.by === ME;
      a.price = round2(Math.min(max, a.top.max + increment(a.top.max)));
      a.top = { by, max };
    } else {
      a.price = round2(Math.min(a.top.max, max + increment(max)));
    }
    meetReserve(a);
    a.bids.unshift({ by: a.top.by, amount: a.price, at: now });
    a.bids = a.bids.slice(0, 30);
    snipe(a, now);
    if (outbid && s) {
      credit(s, a.hold);
      a.hold = 0;
      const t = titleOf(a.items);
      log(
        s.market,
        'outbid',
        `Outbid on ${t}`,
        `@${by} bid $${a.price.toFixed(2)}.`,
        { type: 'listing', id: a.id },
        now,
      );
      if (notifyOutbid)
        notify(
          s,
          `You've been outbid on ${t}`,
          `@${by} is now winning at $${a.price.toFixed(2)}. Bid again before it ends.`,
          { type: 'listing', id: a.id },
          now,
        );
      return { outbid: true, by };
    }
    return { outbid: false, by };
  }

  function settleAuction(s, a, rand, now, ev) {
    const m = s.market;
    const t = titleOf(a.items);
    if (a.mine) {
      if (a.top && (a.reserve == null || a.price >= a.reserve)) {
        const net = sellMine(s, rand, a, a.top.by, a.price, now);
        push(
          s,
          ev,
          'good',
          `Auction sold: ${t}`,
          `@${a.top.by} won at $${a.price.toFixed(2)}. You got $${net.toFixed(2)}.`,
          { type: 'listing', id: a.id },
          now,
        );
      } else {
        a.status = 'ended';
        a.closedAt = now;
        s.vault = [...a.items, ...s.vault];
        const why = a.top
          ? `Bidding stopped at $${a.price.toFixed(2)}, under your $${a.reserve.toFixed(2)} reserve.`
          : 'No bids this time.';
        log(
          m,
          'unsold',
          `Auction ended: ${t}`,
          `${why} The cards are back in your Vault.`,
          { type: 'listing', id: a.id },
          now,
        );
        push(
          s,
          ev,
          'info',
          `Auction ended: ${t}`,
          `${why} The cards are back in your Vault.`,
          { type: 'listing', id: a.id },
          now,
        );
      }
      return;
    }
    if (leading(a)) {
      credit(s, a.hold - a.price);
      a.hold = 0;
      deliver(s, rand, a.items, now);
      settleSold(m, rand, a, ME, a.price, now);
      log(
        m,
        'won',
        `Won ${t}`,
        `For $${a.price.toFixed(2)}. It's in your Vault.`,
        { type: 'listing', id: a.id },
        now,
        -a.price,
      );
      push(
        s,
        ev,
        'good',
        `You won ${t}!`,
        `For $${a.price.toFixed(2)}. It's in your Vault.`,
        { type: 'listing', id: a.id },
        now,
      );
      return;
    }
    if (a.hold) {
      credit(s, a.hold);
      a.hold = 0;
    }
    if (a.top) {
      settleSold(m, rand, a, a.top.by, a.price, now);
      if (a.myMax)
        push(
          s,
          ev,
          'warn',
          `Auction lost: ${t}`,
          `@${a.top.by} won at $${a.price.toFixed(2)}.`,
          { type: 'listing', id: a.id },
          now,
        );
    } else {
      a.status = 'ended';
      a.closedAt = now;
    }
  }

  // A collector takes an auction's Buy now price.
  function npcBuyNow(s, a, by, rand, now, ev) {
    const t = titleOf(a.items);
    const target = { type: 'listing', id: a.id };
    const mineBid = leading(a) || !!a.myMax;
    if (a.hold) {
      credit(s, a.hold);
      a.hold = 0;
    }
    a.top = { by, max: a.buyNow };
    a.price = a.buyNow;
    a.bids.unshift({ by, amount: a.buyNow, at: now, buyNow: true });
    if (a.mine) {
      const net = sellMine(s, rand, a, by, a.buyNow, now);
      push(
        s,
        ev,
        'good',
        `Sold with Buy now: ${t}`,
        `@${by} paid $${a.buyNow.toFixed(2)}. You got $${net.toFixed(2)}.`,
        target,
        now,
      );
      return;
    }
    settleSold(s.market, rand, a, by, a.buyNow, now);
    if (mineBid)
      push(s, ev, 'warn', `Auction lost: ${t}`, `@${by} bought it now for $${a.buyNow.toFixed(2)}.`, target, now);
  }

  // ---- trades ----

  // A sent trade from the other collector's side (what they gain over what
  // they give up; cards they want count for 15% more).
  function evaluateFor(t) {
    const c = collector(t.with);
    const gain = t.give.reduce((a, it) => a + it.value * (c.wants.includes(it.id) ? 1.15 : 1), 0) + t.cashGive;
    const loss = valueOf(t.get) + t.cashGet;
    return { gain, loss, ratio: loss ? gain / loss : 2 };
  }

  function proposeTrade(
    s,
    handle,
    { give = [], get = [], cashGive = 0, cashGet = 0, replaces = null },
    now = Date.now(),
    rand = Math.random,
  ) {
    const m = ensure(s, now, rand);
    if (!handles.includes(handle)) return { ok: false, error: 'who' };
    give = [...new Set(give)];
    get = [...new Set(get)];
    cashGive = round2(cashGive || 0);
    cashGet = round2(cashGet || 0);
    const mineItems = give.map((u) => s.vault.find((v) => v.uid === u));
    const theirs = get.map((u) => (m.inv[handle] || []).find((v) => v.uid === u));
    if (mineItems.some((x) => !x) || theirs.some((x) => !x)) return { ok: false, error: 'items' };
    if (mineItems.length > MAX_SIDE || theirs.length > MAX_SIDE) return { ok: false, error: 'size' };
    if (cashGive < 0 || cashGet < 0 || (cashGive && cashGet)) return { ok: false, error: 'cash' };
    if (!mineItems.length && !cashGive) return { ok: false, error: 'give' };
    if (!theirs.length && !cashGet) return { ok: false, error: 'get' };
    if (!mineItems.length && !theirs.length) return { ok: false, error: 'cards' };
    if (s.balance < cashGive) return { ok: false, error: 'funds', short: round2(cashGive - s.balance) };
    credit(s, -cashGive);
    s.vault = s.vault.filter((v) => !give.includes(v.uid));
    const c = collector(handle);
    const t = {
      id: nextId(m, 't', rand),
      dir: 'out',
      with: handle,
      give: mineItems,
      get: theirs.map((x) => ({ ...x })),
      cashGive,
      cashGet,
      at: now,
      respondAt: now + Math.floor(between(rand, 4000, 10000)),
      need: 1 + rand() * 0.08 + (c.vip >= 3 ? 0.03 : 0),
      status: 'pending',
    };
    m.trades.unshift(t);
    if (replaces) {
      const old = m.trades.find((x) => x.id === replaces && x.dir === 'in' && x.status === 'pending');
      if (old) {
        old.status = 'replaced';
        old.closedAt = now;
      }
    }
    log(m, 'trade', `Trade sent to @${handle}`, `${tradeLine(t)}.`, { type: 'trade', id: t.id }, now);
    return { ok: true, trade: t };
  }

  const side = (items, cash) =>
    [items.length ? items.map((it) => cardById(it.id).name).join(' + ') : '', cash ? `$${cash.toFixed(2)}` : '']
      .filter(Boolean)
      .join(' + ') || 'nothing';
  const tradeLine = (t) => `Your ${side(t.give, t.cashGive)} for their ${side(t.get, t.cashGet)}`;

  function cancelTrade(s, id, now = Date.now()) {
    const m = ensure(s, now);
    const t = m.trades.find((x) => x.id === id);
    if (!t || t.dir !== 'out' || (t.status !== 'pending' && t.status !== 'countered')) return { ok: false };
    returnTrade(s, t);
    t.status = 'cancelled';
    t.closedAt = now;
    return { ok: true };
  }

  function returnTrade(s, t) {
    credit(s, t.cashGive);
    s.vault = [...t.give, ...s.vault];
  }

  // Swap: their cards and cash to you, yours to them.
  function completeTrade(s, t, rand, now) {
    const m = s.market;
    const inv = m.inv[t.with] || [];
    const ids = t.get.map((x) => x.uid);
    m.inv[t.with] = trimInv(m, t.with, [...t.give.map((x) => ({ ...x })), ...inv.filter((x) => !ids.includes(x.uid))]);
    deliver(s, rand, t.get, now);
    credit(s, t.cashGet);
    t.status = 'accepted';
    t.closedAt = now;
  }

  function acceptTradeCounter(s, id, now = Date.now(), rand = Math.random) {
    const m = ensure(s, now, rand);
    const t = m.trades.find((x) => x.id === id);
    if (!t || t.dir !== 'out' || t.status !== 'countered') return { ok: false, error: 'gone' };
    const inv = m.inv[t.with] || [];
    if (t.get.some((x) => !inv.find((y) => y.uid === x.uid))) {
      returnTrade(s, t);
      t.status = 'expired';
      return { ok: false, error: 'gone' };
    }
    if (s.balance < t.counter) return { ok: false, error: 'funds', short: round2(t.counter - s.balance) };
    credit(s, -t.counter);
    t.cashGive = round2(t.cashGive + t.counter);
    completeTrade(s, t, rand, now);
    log(m, 'traded', `Traded with @${t.with}`, `${tradeLine(t)}.`, { type: 'trade', id: t.id }, now);
    return { ok: true };
  }

  // A trade someone sent you.
  function respondTrade(s, id, action, now = Date.now(), rand = Math.random) {
    const m = ensure(s, now, rand);
    const t = m.trades.find((x) => x.id === id);
    if (!t || t.dir !== 'in' || t.status !== 'pending') return { ok: false, error: 'gone' };
    if (action === 'decline') {
      t.status = 'declined';
      t.closedAt = now;
      return { ok: true };
    }
    const mineNow = t.give.map((x) => s.vault.find((v) => v.uid === x.uid));
    const inv = m.inv[t.with] || [];
    if (mineNow.some((x) => !x) || t.get.some((x) => !inv.find((y) => y.uid === x.uid))) {
      t.status = 'expired';
      return { ok: false, error: 'gone' };
    }
    s.vault = s.vault.filter((v) => !t.give.some((x) => x.uid === v.uid));
    completeTrade(s, t, rand, now);
    log(m, 'traded', `Traded with @${t.with}`, `${tradeLine(t)}.`, { type: 'trade', id: t.id }, now);
    return { ok: true };
  }

  // Someone asks for one of your cards and offers cards (often two for one)
  // or cards plus cash worth a bit more.
  function npcProposal(s, rand, now) {
    const m = s.market;
    const mineSorted = s.vault.filter((v) => v.value >= 0.5).sort((a, b) => b.value - a.value);
    if (!mineSorted.length) return null;
    const target = pick(rand, mineSorted.slice(0, 5));
    const v = target.value;
    const candidates = handles.filter((h) => !m.trades.some((t) => t.with === h && t.status === 'pending'));
    for (let tries = 0; tries < 4 && candidates.length; tries++) {
      const handle = pick(rand, candidates);
      const inv = (m.inv[handle] || []).slice().sort((a, b) => a.value - b.value);
      let get = null;
      let cashGet = 0;
      for (let i = 0; i < inv.length && !get; i++)
        for (let j = i + 1; j < inv.length && !get; j++) {
          const sum = inv[i].value + inv[j].value;
          if (sum >= v * 1.0 && sum <= v * 1.22) get = [inv[i], inv[j]];
        }
      if (!get) {
        const one = inv.find((x) => x.value >= v * 0.97 && x.value <= v * 1.25);
        if (one) get = [one];
      }
      if (!get) {
        const under = inv.filter((x) => x.value < v).pop();
        if (under) {
          get = [under];
          cashGet = nice(v * between(rand, 1.02, 1.12) - under.value);
        }
      }
      // Nothing close in their collection: they offer cash for it instead.
      if (!get) {
        get = [];
        cashGet = nice(v * between(rand, 1.0, 1.1));
      }
      const t = {
        id: nextId(m, 't', rand),
        dir: 'in',
        with: handle,
        give: [{ ...target }],
        get: get.map((x) => ({ ...x })),
        cashGive: 0,
        cashGet,
        at: now,
        expires: now + INCOMING_TTL,
        status: 'pending',
      };
      m.trades.unshift(t);
      return t;
    }
    return null;
  }

  // ---- watchlist and alerts ----

  function toggleWatch(s, id) {
    const m = ensure(s);
    const on = !m.watch.includes(id);
    m.watch = on ? [id, ...m.watch] : m.watch.filter((x) => x !== id);
    const l = get(s, id);
    if (l) l.watchers = Math.max(0, (l.watchers || 0) + (on ? 1 : -1));
    return on;
  }

  function addAlert(s, { card, graded = null, below }, now = Date.now()) {
    const m = ensure(s, now);
    below = round2(below);
    if (!cards.find((c) => c.id === card) || !(below > 0)) return { ok: false };
    const a = { id: 'al' + now.toString(36) + m.alerts.length, card, graded, below, at: now };
    m.alerts = [a, ...m.alerts.filter((x) => !(x.card === card && x.graded === graded))].slice(0, 12);
    return { ok: true, alert: a };
  }
  function removeAlert(s, id) {
    const m = ensure(s);
    m.alerts = m.alerts.filter((a) => a.id !== id);
  }
  function alertsFor(s, l, now, ev) {
    const m = s.market;
    if (l.kind !== 'fixed') return;
    m.alerts.forEach((al) => {
      const it = l.items[0];
      if (
        l.items.length === 1 &&
        it.id === al.card &&
        (al.graded == null || it.graded === al.graded) &&
        l.price <= al.below
      )
        push(
          s,
          ev,
          'good',
          `Price alert: ${cardById(al.card).name}`,
          `@${l.seller} just listed one for $${l.price.toFixed(2)} (your alert: under $${al.below.toFixed(2)}).`,
          { type: 'listing', id: l.id },
          now,
        );
    });
  }

  function push(s, ev, tone, title, body, target, now) {
    ev.push({ tone, title, body, target });
    notify(s, title, body, target, now);
  }

  // ---- the world moves ----

  // Run every few seconds (and on return to the app). Collectors answer your
  // offers and trades, buy and bid on your listings, make offers, list new
  // cards, cut prices and bid on each other's auctions. Returns what
  // happened that's worth telling you.
  function tick(s, now = Date.now(), rand = Math.random) {
    const m = ensure(s, now, rand);
    const dt = Math.max(0, Math.min(now - (m.lastTick || now), 10 * 60000));
    m.lastTick = now;
    const chance = (perMinute) => rand() < 1 - Math.exp((-perMinute * dt) / 60000);
    const ev = [];

    // Your offers get answered.
    m.offers.forEach((o) => {
      if (o.dir === 'out' && o.status === 'pending' && now >= o.respondAt) {
        const l = get(s, o.listing);
        if (!l || !isLive(l)) {
          credit(s, o.amount);
          o.status = 'expired';
          o.closedAt = now;
          push(
            s,
            ev,
            'warn',
            `Offer returned: ${o.title}`,
            `It sold before @${o.with} answered. Your $${o.amount.toFixed(2)} is back.`,
            { type: 'activity' },
            now,
          );
          return;
        }
        const r = o.amount / l.price;
        if (r >= o.accept) {
          // Never more than the asking price, which may have been cut since.
          const pay = Math.min(o.amount, l.price);
          credit(s, o.amount - pay);
          o.amount = pay;
          deliver(s, rand, l.items, now);
          settleSold(m, rand, l, ME, o.amount, now);
          o.status = 'accepted';
          o.closedAt = now;
          closeOffersOn(s, l, now);
          log(
            m,
            'bought',
            `Bought ${o.title}`,
            `@${o.with} accepted your $${o.amount.toFixed(2)} offer.`,
            { type: 'listing', id: l.id },
            now,
            -o.amount,
          );
          push(
            s,
            ev,
            'good',
            `Offer accepted: ${o.title}`,
            `@${o.with} took $${o.amount.toFixed(2)}. It's in your Vault.`,
            { type: 'listing', id: l.id },
            now,
          );
        } else if (r >= 0.65) {
          credit(s, o.amount);
          o.counter = nice(Math.min(l.price - 0.5, Math.max(o.amount + 0.5, (l.price + o.amount) / 2)));
          o.status = 'countered';
          o.expires = now + COUNTER_TTL;
          push(
            s,
            ev,
            'info',
            `@${o.with} countered: $${o.counter.toFixed(2)}`,
            `For ${o.title}. You offered $${o.amount.toFixed(2)}; your money is back until you accept.`,
            { type: 'listing', id: l.id },
            now,
          );
        } else {
          credit(s, o.amount);
          o.status = 'declined';
          o.closedAt = now;
          push(
            s,
            ev,
            'warn',
            `Offer declined: ${o.title}`,
            `@${o.with} passed on $${o.amount.toFixed(2)}. Your money is back.`,
            { type: 'listing', id: l.id },
            now,
          );
        }
      }
      if (o.dir === 'out' && o.status === 'countered' && now >= o.expires) {
        o.status = 'expired';
        o.closedAt = now;
      }
      // Your counter to their offer gets answered.
      if (o.dir === 'in' && o.status === 'countered' && now >= o.respondAt) {
        const l = get(s, o.listing);
        if (l && isLive(l) && o.counter <= o.max) {
          o.counter = Math.min(o.counter, l.price);
          const net = sellMine(s, rand, l, o.with, o.counter, now);
          o.status = 'accepted';
          o.amount = o.counter;
          push(
            s,
            ev,
            'good',
            `Sold: ${o.title}`,
            `@${o.with} accepted your $${o.counter.toFixed(2)} counter. You got $${net.toFixed(2)}.`,
            { type: 'listing', id: o.listing },
            now,
          );
        } else {
          o.status = 'declined';
          push(
            s,
            ev,
            'warn',
            `@${o.with} passed`,
            `They won't go to $${o.counter.toFixed(2)} for ${o.title}.`,
            { type: 'listing', id: o.listing },
            now,
          );
        }
        o.closedAt = now;
      }
      if (o.dir === 'in' && o.status === 'pending' && now >= o.expires) {
        o.status = 'expired';
        o.closedAt = now;
      }
    });

    // Your trades get answered.
    m.trades.forEach((t) => {
      if (t.dir === 'out' && t.status === 'pending' && now >= t.respondAt) {
        const inv = m.inv[t.with] || [];
        if (t.get.some((x) => !inv.find((y) => y.uid === x.uid))) {
          returnTrade(s, t);
          t.status = 'expired';
          t.closedAt = now;
          return;
        }
        const e = evaluateFor(t);
        if (e.ratio >= t.need) {
          completeTrade(s, t, rand, now);
          log(m, 'traded', `Traded with @${t.with}`, `${tradeLine(t)}.`, { type: 'trade', id: t.id }, now);
          push(
            s,
            ev,
            'good',
            `@${t.with} accepted your trade`,
            `${tradeLine(t)}. The cards are in your Vault.`,
            { type: 'trade', id: t.id },
            now,
          );
        } else if (e.ratio >= 0.75) {
          t.counter = nice(Math.max(0.5, e.loss * t.need - e.gain));
          t.status = 'countered';
          t.expires = now + COUNTER_TTL;
          push(
            s,
            ev,
            'info',
            `@${t.with} countered your trade`,
            `They'll do it if you add $${t.counter.toFixed(2)}.`,
            { type: 'trade', id: t.id },
            now,
          );
        } else {
          returnTrade(s, t);
          t.status = 'declined';
          t.closedAt = now;
          push(
            s,
            ev,
            'warn',
            `@${t.with} declined your trade`,
            'Your cards and cash are back. Try adding a little more.',
            { type: 'trade', id: t.id },
            now,
          );
        }
      }
      if (t.dir === 'out' && t.status === 'countered' && now >= t.expires) {
        returnTrade(s, t);
        t.status = 'expired';
        t.closedAt = now;
      }
      // A trade sent to you lapses when its time is up, or as soon as the card
      // it asks for has left your Vault (sold, listed or traded away).
      if (
        t.dir === 'in' &&
        t.status === 'pending' &&
        (now >= t.expires || t.give.some((x) => !s.vault.find((v) => v.uid === x.uid)))
      ) {
        t.status = 'expired';
        t.closedAt = now;
      }
    });

    // Your listings: someone buys, or makes an offer.
    m.listings.forEach((l) => {
      if (!l.mine || !isLive(l) || l.kind !== 'fixed' || now - l.at < 15000) return;
      const value = valueOf(l.items);
      const ratio = l.price / Math.max(0.01, value);
      const rate = ratio <= 0.95 ? 1.1 : ratio <= 1.1 ? 0.5 : ratio <= 1.25 ? 0.15 : 0.03;
      if (chance(rate)) {
        const buyer = pick(rand, handles);
        const net = sellMine(s, rand, l, buyer, l.price, now);
        push(
          s,
          ev,
          'good',
          `Sold: ${titleOf(l.items)}`,
          `@${buyer} bought it for $${l.price.toFixed(2)}. You got $${net.toFixed(2)}.`,
          { type: 'listing', id: l.id },
          now,
        );
        return;
      }
      const open = m.offers.some(
        (o) => o.listing === l.id && o.dir === 'in' && (o.status === 'pending' || o.status === 'countered'),
      );
      if (!open && chance(0.8)) {
        const from = pick(rand, handles);
        const amount = nice(l.price * between(rand, 0.72, 0.93));
        if (amount >= l.price) return;
        const o = {
          id: nextId(m, 'o', rand),
          dir: 'in',
          listing: l.id,
          with: from,
          title: titleOf(l.items),
          ask: l.price,
          amount,
          max: round2(Math.max(amount, Math.min(l.price, value * between(rand, 0.95, 1.2)))),
          at: now,
          expires: now + INCOMING_TTL,
          status: 'pending',
        };
        m.offers.unshift(o);
        push(
          s,
          ev,
          'info',
          `New offer: $${amount.toFixed(2)}`,
          `@${from} wants your ${o.title} (listed at $${l.price.toFixed(2)}).`,
          { type: 'listing', id: l.id },
          now,
        );
      }
    });

    // Auctions: bids come in (faster near the end), and they settle.
    m.listings.forEach((a) => {
      if (a.kind !== 'auction' || !isLive(a)) return;
      if (now >= a.ends) {
        settleAuction(s, a, rand, now, ev);
        return;
      }
      const left = a.ends - now;
      if (a.price < a.cap && chance(left < 60000 ? 2.4 : 0.9)) {
        const r = npcBid(s, a, rand, now, false);
        if (r && r.buyNow) {
          npcBuyNow(s, a, r.by, rand, now, ev);
          return;
        }
        if (r && r.outbid)
          push(
            s,
            ev,
            'warn',
            `Outbid on ${titleOf(a.items)}`,
            `@${r.by} is winning at $${a.price.toFixed(2)}. Bid again before it ends.`,
            { type: 'listing', id: a.id },
            now,
          );
        else if (r && a.mine && a.bids.length === 1)
          push(
            s,
            ev,
            'good',
            `First bid on ${titleOf(a.items)}`,
            `@${r.by} bid $${a.price.toFixed(2)}.`,
            { type: 'listing', id: a.id },
            now,
          );
      }
      const key = 'end:' + a.id;
      if (left < 60000 && !m.seen[key] && (a.mine || m.watch.includes(a.id) || leading(a) || a.myMax)) {
        m.seen[key] = 1;
        push(
          s,
          ev,
          'info',
          `Ending soon: ${titleOf(a.items)}`,
          `Under a minute left. Current bid $${a.price.toFixed(2)}.`,
          { type: 'listing', id: a.id },
          now,
        );
      }
    });

    // Someone proposes a trade for one of your cards.
    if (m.trades.filter((t) => t.dir === 'in' && t.status === 'pending').length < 2 && chance(0.45)) {
      const t = npcProposal(s, rand, now);
      if (t)
        push(
          s,
          ev,
          'info',
          `Trade offer from @${t.with}`,
          `They want your ${side(t.give, 0)} for their ${side(t.get, t.cashGet)}.`,
          { type: 'trade', id: t.id },
          now,
        );
    }

    // The rest of the market: cards sell to other people, prices drop, new
    // listings and auctions appear, and sales tick by.
    m.listings.forEach((l) => {
      if (l.mine || !isLive(l) || l.kind !== 'fixed') return;
      if (chance(0.05)) {
        const watched = m.watch.includes(l.id);
        settleSold(
          m,
          rand,
          l,
          pick(
            rand,
            handles.filter((h) => h !== l.seller),
          ),
          l.price,
          now,
        );
        closeOffersOn(s, l, now);
        if (watched)
          push(
            s,
            ev,
            'warn',
            `Sold to someone else: ${titleOf(l.items)}`,
            `It went for $${l.price.toFixed(2)}.`,
            { type: 'listing', id: l.id },
            now,
          );
        return;
      }
      const floor = valueOf(l.items) * 0.78;
      if (now - l.at > 120000 && l.price > floor && chance(0.05)) {
        const was = l.price;
        l.price = nice(Math.max(floor, l.price * between(rand, 0.88, 0.95)));
        if (l.price < was) {
          l.dropped = was;
          if (m.watch.includes(l.id))
            push(
              s,
              ev,
              'good',
              `Price drop: ${titleOf(l.items)}`,
              `@${l.seller} cut it from $${was.toFixed(2)} to $${l.price.toFixed(2)}.`,
              { type: 'listing', id: l.id },
              now,
            );
          alertsFor(s, l, now, ev);
        }
      }
    });
    const liveFixed = m.listings.filter((l) => !l.mine && isLive(l) && l.kind === 'fixed').length;
    if (liveFixed < 18 && chance(liveFixed < 12 ? 3 : 1)) {
      const l = npcListing(m, rand, now);
      m.listings.unshift(l);
      alertsFor(s, l, now, ev);
    }
    const liveAuctions = m.listings.filter((l) => !l.mine && isLive(l) && l.kind === 'auction').length;
    if (liveAuctions < 5 && chance(liveAuctions < 3 ? 2 : 0.5)) m.listings.unshift(npcAuction(m, rand, now));
    if (chance(1.2)) {
      const item = makeItem(m, rand, now);
      sale(m, rand, {
        item,
        price: item.value * between(rand, 0.88, 1.18),
        buyer: pick(rand, handles),
        seller: pick(rand, handles),
        at: now,
      });
    }

    // Keep the stored market small.
    const keepMine = new Set(
      m.listings
        .filter((l) => l.mine && !isLive(l))
        .slice(0, 25)
        .map((l) => l.id),
    );
    m.listings = m.listings.filter(
      (l) =>
        isLive(l) ||
        keepMine.has(l.id) ||
        (l.kind === 'auction' && l.myMax && now - (l.soldAt || l.closedAt || now) < HOUR) ||
        now - (l.soldAt || l.closedAt || now) < 10 * 60000,
    );
    m.offers = m.offers
      .filter((o) => o.status === 'pending' || o.status === 'countered' || now - (o.closedAt || o.at) < 6 * HOUR)
      .slice(0, 40);
    m.trades = m.trades
      .filter((t) => t.status === 'pending' || t.status === 'countered' || now - (t.closedAt || t.at) < 24 * HOUR)
      .slice(0, 40);
    const ids = new Set(m.listings.map((l) => l.id));
    m.watch = m.watch.filter((id) => ids.has(id));
    Object.keys(m.seen).forEach((k) => {
      if (!ids.has(k.split(':')[1])) delete m.seen[k];
    });
    return ev;
  }

  return {
    ensure,
    tick,
    collector,
    titleOf,
    tradeLine,
    // reading
    browse,
    get,
    mine,
    held,
    cardStats,
    pulse,
    evaluateTrade,
    askOf,
    minBid,
    dealOf,
    leading,
    isLive,
    inventory: (s, handle) => ensure(s).inv[handle] || [],
    // buying and offers
    buy,
    offer,
    withdrawOffer,
    acceptCounter,
    respondOffer,
    // selling
    list,
    editPrice,
    cancel,
    // auctions
    bid,
    // trades
    proposeTrade,
    cancelTrade,
    acceptTradeCounter,
    respondTrade,
    // watching
    toggleWatch,
    addAlert,
    removeAlert,
    tiers: TIERS,
  };
}
