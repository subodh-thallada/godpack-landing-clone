// Demo account. There are no credentials, no server and no real money:
// the account lives in localStorage, the app signs into it automatically
// on the first visit, and Log out keeps you signed out until you log back
// in. Every balance here is pretend demo credit.
import { store } from './ui/dom.js';
import { CARDS, PACKS, USERS, pullsFor, seeded, user } from './data.js';
import { createMarket } from './market/engine.js';

const KEY = 'session';
const VERSION = 3;
const START_BALANCE = 250;
const DAY = 86400000;
const listeners = new Set();

const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const round = (v) => Math.round(v * 100) / 100;

function fresh() {
  const now = Date.now();
  return {
    version: VERSION,
    signedIn: true,
    handle: 'demo',
    name: 'demo',
    bio: '',
    color: '#7954ed',
    balance: START_BALANCE,
    opened: 0,
    largest: null,
    streak: 0,
    lastCheckIn: 0,
    freePacks: 1,
    volume: 10,
    followers: ['orbit_ann', 'pixelmint', 'hexwren'],
    following: ['orbit_ann'],
    vault: [
      {
        uid: 'v1',
        id: 'prism-gate',
        value: 9.37,
        tier: 'common',
        at: now - 1.5 * DAY - 3600000 * 11,
        graded: false,
        pack: 'starter',
      },
      {
        uid: 'v2',
        id: 'tidal-glass',
        value: 1.22,
        tier: 'core',
        at: now - 1.5 * DAY - 3600000 * 11,
        graded: false,
        pack: 'starter',
      },
    ],
    pulls: [],
    shipments: [],
    withdrawals: [],
    battles: [],
    lobby: [
      { id: 'l-first', host: 'pixelmint', record: '0–0', pack: 'trainer', each: 10, ends: now + 12 * 60000 + 39000 },
    ],
    chat: [],
    notifications: [
      {
        id: 'n-welcome',
        title: 'Welcome to the demo',
        body: `You have $${START_BALANCE} of demo credit to open packs and battle with.`,
        at: now,
        read: false,
        href: '/packs',
      },
    ],
  };
}

let state = load();

function load() {
  const saved = store.get(KEY, undefined);
  if (saved === undefined) return null; // decided in boot(): first visit signs in
  if (saved && saved.version !== VERSION) return fresh(); // older demo data: start over
  return saved;
}

export const session = {
  get signedIn() {
    return !!(state && state.signedIn);
  },
  get state() {
    return state;
  },
  // First visit (nothing stored yet) signs into the demo automatically.
  boot() {
    if (store.get(KEY, undefined) === undefined) {
      state = fresh();
      store.set(KEY, state);
    }
    autoSell();
  },
  signIn() {
    state = fresh();
    save();
  },
  signOut() {
    state = null;
    store.set(KEY, null);
    emit();
  },
  reset() {
    state = fresh();
    save();
  },
  update(fn) {
    if (!state) return;
    fn(state);
    save();
  },
  on(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function save() {
  store.set(KEY, state);
  emit();
}
function emit() {
  listeners.forEach((fn) => fn(state));
}

// ---- derived values ----

export const cardOf = (item) => CARDS.find((c) => c.id === (item.id || (item.card && item.card.id))) || CARDS[0];
export const vaultValue = () => (state ? state.vault.reduce((s, v) => s + v.value, 0) : 0);
export const unread = () => (state ? state.notifications.filter((n) => !n.read).length : 0);
export const isFollowing = (handle) => !!(state && state.following.includes(handle));

// Unclaimed cards auto-sell 7 days after they are pulled.
export function saleTimer(item) {
  const left = Math.max(0, item.at + 7 * DAY - Date.now());
  const d = Math.floor(left / DAY),
    h = Math.floor((left % DAY) / 3600000);
  return `${d}D ${h}H`;
}

function autoSell() {
  if (!state) return;
  const due = state.vault.filter((v) => v.at + 7 * DAY <= Date.now());
  if (!due.length) return;
  const total = due.reduce((s, v) => s + v.value * 0.95, 0);
  state.vault = state.vault.filter((v) => !due.includes(v));
  state.balance = round(state.balance + total);
  notify(
    `${due.length} card${due.length > 1 ? 's' : ''} auto-sold`,
    `Unclaimed for 7 days. ${money(total)} added to your balance.`,
    '/vault',
    false,
  );
  store.set(KEY, state);
}

const money = (v) => '$' + v.toFixed(2);

// ---- notifications ----

export function notify(title, body, href, persist = true) {
  if (!state) return;
  state.notifications.unshift({ id: uid('n'), title, body, href, at: Date.now(), read: false });
  state.notifications = state.notifications.slice(0, 30);
  if (persist) save();
}

export function markRead(id) {
  session.update((s) => {
    s.notifications.forEach((n) => {
      if (!id || n.id === id) n.read = true;
    });
  });
}

// ---- packs ----

// Draw `count` pulls from a pack, move them into the vault and record them
// in your pull history. A free pack costs nothing.
export function openPacks(pack, count, { free = false } = {}) {
  const seed = Math.floor(Math.random() * 1e6);
  const pulls = pullsFor(pack, count, seed).map((p) => ({
    uid: uid('p'),
    id: p.card.id,
    value: round(p.value),
    tier: p.tier,
    at: Date.now(),
    graded: pack.slabs,
    pack: pack.id,
  }));
  session.update((s) => {
    if (free) s.freePacks = Math.max(0, (s.freePacks || 0) - count);
    else {
      s.balance = round(s.balance - pack.price * count);
      s.volume += pack.price * count;
    }
    s.opened += count;
    s.vault = [...pulls, ...s.vault];
    s.pulls = [...pulls, ...s.pulls].slice(0, 60);
    const best = pulls.reduce((a, b) => (b.value > a.value ? b : a));
    if (!s.largest || best.value > s.largest.value) s.largest = { ...best };
    if (best.tier === 'grail' || best.tier === 'chase') {
      notify(
        best.tier === 'grail' ? 'Grail pull!' : 'Chase pull!',
        `${cardOf(best).name} for ${money(best.value)} from a ${pack.name} pack.`,
        '/vault',
        false,
      );
    }
  });
  return pulls;
}

export function sell(uids) {
  let total = 0;
  session.update((s) => {
    s.vault = s.vault.filter((v) => {
      if (!uids.includes(v.uid)) return true;
      total += v.value * 0.95;
      return false;
    });
    s.balance = round(s.balance + total);
  });
  return total;
}

// ---- shipping ----

export const SHIP_COST = { US: 5, CA: 10 };
const STAGES = ['Requested', 'Packed', 'Shipped', 'Delivered'];
const STAGE_MS = 45000; // the demo moves a shipment along every 45 seconds

export function ship(itemUid, address) {
  const item = state && state.vault.find((v) => v.uid === itemUid);
  if (!item) return null;
  const cost = SHIP_COST[address.country] || 5;
  const shipment = {
    id: uid('s'),
    item: { ...item },
    address,
    cost,
    at: Date.now(),
    tracking: 'DEMO' + Math.floor(100000000 + Math.random() * 899999999),
  };
  session.update((s) => {
    s.vault = s.vault.filter((v) => v.uid !== itemUid);
    s.balance = round(s.balance - cost);
    s.shipments.unshift(shipment);
  });
  return shipment;
}

export function shipmentStage(sh) {
  return Math.min(STAGES.length - 1, Math.floor((Date.now() - sh.at) / STAGE_MS));
}
export { STAGES };

// Notify when a shipment ships and when it's delivered.
export function checkShipments() {
  if (!state) return;
  let changed = false;
  state.shipments.forEach((sh) => {
    const stage = shipmentStage(sh);
    const seen = sh.seen || 0;
    if (stage > seen) {
      sh.seen = stage;
      changed = true;
      const name = cardOf(sh.item).name;
      if (stage === 2) notify(`${name} shipped`, `Tracking ${sh.tracking}.`, '/ship', false);
      if (stage === 3) notify(`${name} was delivered`, 'Enjoy the card!', '/ship', false);
    }
  });
  if (changed) save();
}

// ---- following ----

export function toggleFollow(handle) {
  let now = false;
  session.update((s) => {
    if (s.following.includes(handle)) s.following = s.following.filter((h) => h !== handle);
    else {
      s.following = [handle, ...s.following];
      now = true;
    }
  });
  return now;
}

// Someone new follows you a little while after you arrive.
export function maybeGainFollower() {
  if (!state) return;
  const candidates = USERS.map((u) => u.handle).filter((h) => !state.followers.includes(h));
  if (!candidates.length) return;
  const h = candidates[Math.floor(Math.random() * candidates.length)];
  session.update((s) => {
    s.followers = [h, ...s.followers];
    notify(
      `@${h} followed you`,
      'Their pulls can show up in your Following feed if you follow back.',
      `/profile/${h}`,
      false,
    );
  });
}

// ---- battles ----

// Post a battle: pay the entry now; an opponent joins after a few seconds.
export function postBattle(pack, each, lowest) {
  const b = { id: uid('b'), pack: pack.id, each, lowest, at: Date.now(), status: 'open' };
  session.update((s) => {
    s.balance = round(s.balance - pack.price * each);
    s.volume += pack.price * each;
    s.battles.unshift(b);
  });
  return b;
}

export function cancelBattle(id) {
  session.update((s) => {
    const b = s.battles.find((x) => x.id === id);
    if (!b || b.status !== 'open') return;
    const pack = PACKS.find((p) => p.id === b.pack);
    b.status = 'cancelled';
    s.balance = round(s.balance + pack.price * b.each);
  });
}

// Settle a battle replay's outcome: the winner takes every card.
export function settleBattle(id, { won, cards, opponent }) {
  session.update((s) => {
    const b = s.battles.find((x) => x.id === id);
    if (b) {
      b.status = 'done';
      b.won = won;
      b.opponent = opponent;
    }
    if (won) {
      s.vault = [
        ...cards.map((c) => ({
          uid: uid('w'),
          id: c.card.id,
          value: round(c.value),
          tier: c.tier || 'core',
          at: Date.now(),
          graded: c.graded,
          pack: c.pack,
        })),
        ...s.vault,
      ];
    }
    notify(
      won ? 'You won a battle' : 'Battle lost',
      won ? `You beat @${opponent} and took all ${cards.length} cards.` : `@${opponent} took the cards this time.`,
      '/vault',
      false,
    );
  });
}

export const openBattleCount = () => (state ? state.battles.filter((b) => b.status === 'open').length : 0);

// Other collectors' open battles. They expire and new ones get posted.
export const lobbyBattles = () => (state ? state.lobby.filter((b) => b.ends > Date.now()) : []);

export function refreshLobby() {
  if (!state) return;
  const live = state.lobby.filter((b) => b.ends > Date.now());
  const changed = live.length !== state.lobby.length;
  state.lobby = live;
  if (live.length < 2 && Math.random() < 0.5) {
    const host = USERS[Math.floor(Math.random() * USERS.length)].handle;
    const pack = PACKS[Math.floor(Math.random() * 3)];
    state.lobby.push({
      id: uid('l'),
      host,
      record: `${Math.floor(Math.random() * 9)}–${Math.floor(Math.random() * 9)}`,
      pack: pack.id,
      each: 1 + Math.floor(Math.random() * (pack.price > 10 ? 2 : 5)),
      ends: Date.now() + (6 + Math.random() * 9) * 60000,
    });
    save();
  } else if (changed) save();
}

// Take a seat in someone's battle: pay the entry; the replay settles it.
export function joinLobby(id) {
  const b = state && state.lobby.find((x) => x.id === id);
  if (!b) return null;
  const pack = PACKS.find((p) => p.id === b.pack);
  session.update((s) => {
    s.lobby = s.lobby.filter((x) => x.id !== id);
    s.balance = round(s.balance - pack.price * b.each);
    s.volume += pack.price * b.each;
    s.battles.unshift({ id: b.id, pack: b.pack, each: b.each, at: Date.now(), status: 'live', opponent: b.host });
  });
  return { ...b, pack };
}

// ---- money ----

export function deposit(amount) {
  session.update((s) => {
    s.balance = round(s.balance + amount);
  });
}

export function withdraw(amount, method) {
  session.update((s) => {
    s.balance = round(s.balance - amount);
    s.withdrawals.unshift({ id: uid('w'), amount, method, at: Date.now() });
    notify('Withdrawal requested', `${money(amount)} via ${method}. Demo only: nothing is sent.`, '/withdraw', false);
  });
}

// ---- chat ----

export function postChat(message) {
  session.update((s) => {
    s.chat.push({ ...message, at: Date.now() });
    s.chat = s.chat.slice(-30);
  });
}

// ---- profile ----

// Portfolio series for the profile chart: flat with a few small steps up,
// ending at today's total (cash + cards). Points are [timestamp, value].
export function portfolioSeries(range) {
  const spans = {
    '1D': [DAY, 48],
    '7D': [7 * DAY, 56],
    '1M': [30 * DAY, 60],
    '3M': [90 * DAY, 60],
    '1Y': [365 * DAY, 73],
    All: [400 * DAY, 80],
  };
  const [span, n] = spans[range] || spans['1D'];
  const end = (state ? state.balance : 0) + vaultValue();
  const r = seeded(range.length * 97 + Math.round(end * 100));
  const now = Date.now();
  const steps = { '1D': 1, '7D': 2, '1M': 3, '3M': 4, '1Y': 5, All: 6 }[range] || 1;
  const rise = end * ({ '1D': 0.012, '7D': 0.03, '1M': 0.06, '3M': 0.1, '1Y': 0.18, All: 0.22 }[range] || 0.012);
  const at = Array.from({ length: steps }, () => Math.floor((0.25 + r() * 0.7) * n)).sort((a, b) => a - b);
  let v = end - rise;
  const values = [];
  for (let i = 0; i < n; i++) {
    at.forEach((k) => {
      if (k === i) v += rise / steps;
    });
    values.push(i === n - 1 ? end : v);
  }
  return values.map((val, i) => [now - span + (span * i) / (n - 1), val]);
}

export function nextVip(volume) {
  const tiers = [
    [1000, 'VIP 1', 4.75],
    [5000, 'VIP 2', 4.5],
    [10000, 'VIP 3', 4],
    [25000, 'VIP 4', 3.5],
    [50000, 'VIP 5', 3],
    [100000, 'VIP 6', 2.5],
    [250000, 'VIP 7', 1.5],
  ];
  return tiers.find(([t]) => volume < t) || null;
}

// Your own pulls in the shape the feed and hit cards use.
export function myPulls() {
  if (!state) return [];
  const me = { handle: state.handle, color: state.color, vip: 0, self: true };
  return state.pulls.map((p) => ({
    uid: p.uid,
    card: cardOf(p),
    tier: p.tier,
    value: p.value,
    user: me,
    minutesAgo: Math.floor((Date.now() - p.at) / 60000),
    pack: p.pack,
  }));
}

// ---- marketplace ----

const marketHref = (t) =>
  t.type === 'listing' ? `/market/l/${t.id}` : t.type === 'trade' ? `/market/t/${t.id}` : '/market?tab=activity';

// The shared engine (the app runs an identical copy). Accounts saved before
// the market existed get one the first time it's needed.
export const market = createMarket({ cards: CARDS, users: USERS, packs: PACKS, href: marketHref });

export function marketOf() {
  if (!state) return null;
  if (!state.market) {
    market.ensure(state);
    store.set(KEY, state);
  }
  return state.market;
}

// Runs a market action on the account, saves, and returns the engine's result.
export function marketDo(fn) {
  let out = { ok: false, error: 'signedOut' };
  session.update((s) => {
    market.ensure(s);
    out = fn(s);
  });
  return out;
}

// Offers and trades waiting on you.
export function marketWaiting() {
  const m = state && state.market;
  if (!m) return 0;
  return (
    m.offers.filter((o) => o.dir === 'in' && o.status === 'pending').length +
    m.trades.filter((t) => t.dir === 'in' && t.status === 'pending').length
  );
}

// A cheap summary of what the market views show, so a tick that changed
// nothing visible doesn't make every view repaint.
function marketPrint(s) {
  const m = s.market;
  if (!m) return '';
  const top = (x, k) => (x.length ? x[0][k] : '');
  return [
    s.balance,
    s.vault.length,
    top(s.notifications, 'id'),
    top(m.sales, 'id'),
    top(m.history, 'id'),
    m.watch.length,
    m.alerts.length,
    m.listings.map((l) => `${l.id}${l.status}${l.price}${l.bids ? l.bids.length : ''}${l.ends || ''}`).join(),
    m.offers.map((o) => o.id + o.status).join(),
    m.trades.map((t) => t.id + t.status).join(),
  ].join('|');
}

// The market moves on its own. Saves every tick, but only tells the views
// when something they show changed. Returns what's worth a toast.
export function marketTick(now = Date.now()) {
  if (!state || !state.signedIn) return [];
  const before = marketPrint(state);
  const events = market.tick(state, now);
  if (marketPrint(state) !== before) save();
  else store.set(KEY, state);
  return events;
}

export { PACKS, user };
