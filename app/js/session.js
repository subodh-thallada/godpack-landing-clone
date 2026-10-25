// Demo account. "Signing in" here only flips a local flag: there are no
// credentials, no server and no real money. Everything lives in
// localStorage so the demo survives a refresh; Log out clears it.
import { store } from './ui/dom.js';
import { CARDS, PACKS, pullsFor, seeded } from './data.js';

const KEY = 'session';
const listeners = new Set();
const DAY = 86400000;

function fresh() {
  const now = Date.now();
  return {
    signedIn: true,
    handle: 'demo',
    name: 'demo',
    color: '#7954ed',
    balance: 0,
    opened: 0,
    largest: null,
    streak: 0,
    lastCheckIn: 0,
    volume: 10,
    followers: 3,
    following: 1,
    vault: [
      { uid: 'v1', id: 'prism-gate', value: 9.37, tier: 'common', at: now - 1.5 * DAY - 3600000 * 11, graded: false },
      { uid: 'v2', id: 'tidal-glass', value: 1.22, tier: 'core', at: now - 1.5 * DAY - 3600000 * 11, graded: false },
    ],
    notifications: [],
  };
}

let state = store.get(KEY, null);

export const session = {
  get signedIn() {
    return !!(state && state.signedIn);
  },
  get state() {
    return state;
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

export const cardOf = (item) => CARDS.find((c) => c.id === item.id) || CARDS[0];
export const vaultValue = () => (state ? state.vault.reduce((s, v) => s + v.value, 0) : 0);

// Unclaimed cards auto-sell 7 days after they are pulled.
export function saleTimer(item) {
  const left = Math.max(0, item.at + 7 * DAY - Date.now());
  const d = Math.floor(left / DAY),
    h = Math.floor((left % DAY) / 3600000);
  return `${d}D ${h}H`;
}

// Draw `count` pulls from a pack and move them into the vault.
export function openPacks(pack, count) {
  const seed = Math.floor(Math.random() * 1e6);
  const pulls = pullsFor(pack, count, seed).map((p, i) => ({
    uid: 'p' + Date.now().toString(36) + i,
    id: p.card.id,
    value: Math.round(p.value * 100) / 100,
    tier: p.tier,
    at: Date.now(),
    graded: pack.slabs,
  }));
  session.update((s) => {
    s.balance = Math.round((s.balance - pack.price * count) * 100) / 100;
    s.opened += count;
    s.volume += pack.price * count;
    s.vault = [...pulls, ...s.vault];
    const best = pulls.reduce((a, b) => (b.value > a.value ? b : a));
    if (!s.largest || best.value > s.largest.value) s.largest = { ...best };
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
    s.balance = Math.round((s.balance + total) * 100) / 100;
  });
  return total;
}

// Portfolio series for the profile chart: a gentle walk that ends at the
// current total (cash + cards). Points are [timestamp, value].
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
  // Card values move rarely: hold flat, with a few small steps up over the
  // range so the series ends at today's total.
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

export { PACKS };
