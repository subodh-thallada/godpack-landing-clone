// Demo data (shared with the web recreation). Every card, collector and
// message is invented; the art is the project's own generated set.
import type { Tier } from '../theme';

export type Card = { id: string; name: string; set: string; grade: string };
export type OddsRow = [Tier, number, number, number]; // tier, low, high, chance %
export type Pack = {
  id: 'starter' | 'trainer' | 'arena' | 'master';
  name: string;
  price: number;
  art: 'starter' | 'trainer' | 'arena' | 'master';
  mult: number;
  slabs: boolean;
  range: [number, number];
  safeRange: [number, number];
  odds: OddsRow[];
  safeOdds: OddsRow[];
};
export type Collector = { handle: string; color: string; vip: number };
export type Pull = {
  uid: string;
  card: Card;
  tier: Tier;
  value: number;
  user: Collector & { self?: boolean };
  minutesAgo: number;
  pack: Pack['id'];
};

export const CARDS: Card[] = [
  { id: 'aurora-peaks', name: 'Aurora Peaks', set: 'Origins Gold Star', grade: 'GEM MT 10' },
  { id: 'solar-crown', name: 'Solar Crown', set: 'Origins Japanese', grade: 'GEM MT 10' },
  { id: 'tidal-glass', name: 'Tidal Glass', set: 'Origins Tideworks', grade: 'GEM MT 10' },
  { id: 'crystal-hollow', name: 'Crystal Hollow', set: 'Origins Japanese', grade: 'GEM MT 10' },
  { id: 'nebula-bloom', name: 'Nebula Bloom', set: 'Origins Starfield', grade: 'GEM MT 10' },
  { id: 'ember-dunes', name: 'Ember Dunes', set: 'Origins Sandglass', grade: 'GEM MT 10' },
  { id: 'moonlit-grove', name: 'Moonlit Grove', set: 'Origins Nightfall', grade: 'GEM MT 10' },
  { id: 'storm-spire', name: 'Storm Spire', set: 'Origins Tempest', grade: 'NM MT 8' },
  { id: 'coral-drift', name: 'Coral Drift', set: 'Origins Deep Blue', grade: 'GEM MT 10' },
  { id: 'frost-halo', name: 'Frost Halo', set: 'Origins Northern', grade: 'GEM MT 10' },
  { id: 'volcanic-heart', name: 'Volcanic Heart', set: 'Origins Firstfire', grade: 'MINT 9' },
  { id: 'prism-gate', name: 'Prism Gate', set: 'Origins Promo', grade: 'GEM MT 10' },
  { id: 'gilded-comet', name: 'Gilded Comet', set: 'Origins Skyward', grade: 'GEM MT 10' },
];

export const cardById = (id: string) => CARDS.find((c) => c.id === id) ?? CARDS[0];

export const PACKS: Pack[] = [
  {
    id: 'starter', name: 'Starter', price: 1, art: 'trainer', mult: 29.1, slabs: false,
    range: [0.2, 29.12], safeRange: [0.51, 29.12],
    odds: [['common', 0.2, 0.5, 44.6], ['common', 0.51, 1, 37.12], ['core', 1.01, 1.5, 15.9], ['hit', 1.51, 2.5, 1.27], ['chase', 2.51, 6.19, 0.83], ['grail', 6.2, 29.12, 0.28]],
    safeOdds: [['common', 0.51, 1, 68.87], ['core', 1.01, 1.5, 29.27], ['hit', 1.51, 2.5, 0.81], ['chase', 2.51, 6.19, 0.5], ['grail', 6.2, 29.12, 0.55]],
  },
  {
    id: 'trainer', name: 'Trainer', price: 10, art: 'starter', mult: 44, slabs: false,
    range: [2, 440], safeRange: [5, 440],
    odds: [['common', 2, 6, 40.4], ['common', 6.01, 10, 33.2], ['core', 10.01, 18, 21.6], ['hit', 18.01, 40, 3.9], ['chase', 40.01, 120, 0.72], ['grail', 120.01, 440, 0.18]],
    safeOdds: [['common', 5, 10, 70.1], ['core', 10.01, 18, 25.4], ['hit', 18.01, 40, 3.6], ['chase', 40.01, 120, 0.7], ['grail', 120.01, 440, 0.2]],
  },
  {
    id: 'arena', name: 'Arena', price: 25, art: 'arena', mult: 65, slabs: true,
    range: [6.5, 1626.16], safeRange: [12.63, 1626.16],
    odds: [['common', 6.5, 15, 39.8], ['common', 15.01, 25, 32.7], ['core', 25.01, 45, 22.1], ['hit', 45.01, 120, 4.4], ['chase', 120.01, 400, 0.8], ['grail', 400.01, 1626.16, 0.2]],
    safeOdds: [['common', 12.63, 25, 69.4], ['core', 25.01, 45, 26.2], ['hit', 45.01, 120, 3.6], ['chase', 120.01, 400, 0.6], ['grail', 400.01, 1626.16, 0.2]],
  },
  {
    id: 'master', name: 'Master', price: 100, art: 'master', mult: 100, slabs: true,
    range: [30, 10000], safeRange: [50, 10000],
    odds: [['common', 30, 65, 46.2], ['common', 66, 100, 22.3], ['core', 101, 125, 24.1], ['hit', 126, 300, 5.7], ['chase', 301, 800, 1.25], ['grail', 801, 10000, 0.45]],
    safeOdds: [['common', 50, 65, 42.1], ['common', 66, 100, 23.94], ['core', 101, 125, 25.45], ['hit', 126, 300, 6.63], ['chase', 301, 800, 1.43], ['grail', 801, 10000, 0.45]],
  },
];

export const packById = (id: string) => PACKS.find((p) => p.id === id) ?? PACKS[0];

export const USERS: Collector[] = [
  { handle: 'nightglass', color: '#7954ed', vip: 3 },
  { handle: 'tidewalker', color: '#2f8fd6', vip: 1 },
  { handle: 'emberkid', color: '#e2603a', vip: 0 },
  { handle: 'mossrock', color: '#3aa36b', vip: 2 },
  { handle: 'quietfox', color: '#d9488f', vip: 0 },
  { handle: 'pixelmint', color: '#26b5a8', vip: 1 },
  { handle: 'orbit_ann', color: '#9b6bff', vip: 4 },
  { handle: 'coralbay', color: '#f08a5d', vip: 0 },
  { handle: 'sundial', color: '#d6a12b', vip: 2 },
  { handle: 'hexwren', color: '#5c6cff', vip: 0 },
  { handle: 'lumenlark', color: '#46b0e8', vip: 1 },
  { handle: 'vesper', color: '#b05cd6', vip: 5 },
];

export const user = (handle: string) => USERS.find((u) => u.handle === handle) ?? USERS[0];

// Seeded random so the demo looks the same on every load.
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const hash = (str: string, mul: number, start: number) =>
  str.split('').reduce((h, c) => (h * mul + c.charCodeAt(0)) >>> 0, start);

const BIOS: Record<string, string> = {
  nightglass: 'chasing gold stars since the first set',
  tidewalker: 'only opens tide packs on full moons',
  emberkid: 'trainer battles every night',
  mossrock: 'safe mode enjoyer',
  quietfox: 'shipping everything to canada',
  pixelmint: 'arena regular',
  orbit_ann: 'grail hunter · gem mint or bust',
  coralbay: 'new here, be nice',
  sundial: 'lowest wins specialist',
  hexwren: 'daily check-in streak: 41',
  lumenlark: 'gm',
  vesper: 'community mod ✨',
};

export function profileOf(handle: string) {
  const u = USERS.find((x) => x.handle === handle);
  if (!u) return null;
  const r = seeded(hash(handle, 31, 7));
  return {
    ...u,
    bio: BIOS[handle] ?? '',
    followers: 4 + Math.floor(r() * 180),
    following: 2 + Math.floor(r() * 90),
    packsOpened: 20 + Math.floor(Math.pow(r(), 0.6) * 4000),
  };
}

// A believable stream of pulls for one pack, newest first.
export function pullsFor(pack: Pack, count = 14, seed = 7): Pull[] {
  const r = seeded(seed + pack.price * 31);
  const bands = pack.odds.filter(([t]) => t !== 'common');
  const out: Pull[] = [];
  let minutesAgo = 0;
  for (let i = 0; i < count; i++) {
    const [tier, lo, hi] = bands[Math.min(bands.length - 1, Math.floor(Math.pow(r(), 2.4) * bands.length))];
    const value = Math.round((lo + (Math.min(hi, lo * 3) - lo) * Math.pow(r(), 1.8)) * 100) / 100;
    const card = CARDS[Math.floor(r() * CARDS.length)];
    const u = USERS[Math.floor(r() * USERS.length)];
    out.push({ uid: `${pack.id}-${seed}-${i}`, card, tier: i === 0 && pack.price >= 25 ? 'chase' : tier, value, user: u, minutesAgo: Math.floor(minutesAgo), pack: pack.id });
    minutesAgo += r() * (pack.price > 10 ? 6 : 1.4);
  }
  return out;
}

// A collector's own pulls, newest first, deterministic per handle.
export function pullsOf(handle: string, count = 10): Pull[] {
  const r = seeded(hash(handle, 17, 3));
  const u = user(handle);
  const out: Pull[] = [];
  let minutesAgo = Math.floor(r() * 25);
  for (let i = 0; i < count; i++) {
    const pack = PACKS[Math.floor(Math.pow(r(), 1.5) * PACKS.length)];
    const [tier, lo, hi] = pack.odds[Math.min(pack.odds.length - 1, Math.floor(Math.pow(r(), 2.2) * pack.odds.length))];
    const value = Math.round((lo + (Math.min(hi, lo * 3) - lo) * Math.pow(r(), 1.8)) * 100) / 100;
    out.push({ uid: `${handle}-${i}`, card: CARDS[Math.floor(r() * CARDS.length)], tier, value, user: u, minutesAgo, pack: pack.id });
    minutesAgo += 20 + Math.floor(r() * 400);
  }
  return out;
}

// A mixed timeline across all packs, newest first.
export function timeline(): Pull[] {
  return PACKS.flatMap((p, i) => pullsFor(p, 8, 40 + i * 13).map((h) => ({ ...h, minutesAgo: h.minutesAgo * 2 + i })))
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, 30);
}

export const TOP_HITS: Pull[] = [
  { uid: 't1', card: CARDS[12], value: 2480, user: user('vesper'), pack: 'master', tier: 'grail', minutesAgo: 900 },
  { uid: 't2', card: CARDS[0], value: 1625.4, user: user('orbit_ann'), pack: 'master', tier: 'grail', minutesAgo: 1500 },
  { uid: 't3', card: CARDS[10], value: 1210, user: user('nightglass'), pack: 'arena', tier: 'grail', minutesAgo: 2200 },
  { uid: 't4', card: CARDS[8], value: 864.2, user: user('sundial'), pack: 'master', tier: 'grail', minutesAgo: 3000 },
  { uid: 't5', card: CARDS[4], value: 702.5, user: user('mossrock'), pack: 'master', tier: 'chase', minutesAgo: 3500 },
  { uid: 't6', card: CARDS[3], value: 655, user: user('lumenlark'), pack: 'arena', tier: 'chase', minutesAgo: 4100 },
];

export type ChatSeed = { u: string; t: string; m: number; reacts?: number };
export const CHAT: ChatSeed[] = [
  { u: 'vesper', t: 'welcome in everyone, be kind in chat ✨', m: 30, reacts: 7 },
  { u: 'hexwren', t: 'daily check-in streak at 6 lets go', m: 22 },
  { u: 'quietfox', t: 'shipping to canada took 6 days for me fwiw', m: 15, reacts: 1 },
  { u: 'mossrock', t: 'safe mode on starters has been treating me well', m: 11 },
  { u: 'emberkid', t: 'anyone doing trainer battles tonight', m: 7 },
  { u: 'orbit_ann', t: 'gem mint 10 🙏', m: 4, reacts: 5 },
  { u: 'tidewalker', t: 'gg! what grade?', m: 4 },
  { u: 'orbit_ann', t: 'gilded comet out of a master just now, still shaking', m: 3, reacts: 3 },
];
export const CHAT_LATER: { u: string; t: string }[] = [
  { u: 'pixelmint', t: 'just hit a nebula bloom from arena 👀' },
  { u: 'coralbay', t: 'first pack ever, got a frost halo' },
  { u: 'sundial', t: 'lowest wins battles are chaos lol' },
  { u: 'lumenlark', t: 'gm chat' },
  { u: 'nightglass', t: 'odds button is worth reading before you open btw' },
];

export const VIP_LEVELS: [string, number, number][] = [
  ['Standard', 0, 5],
  ['VIP 1', 1000, 4.75],
  ['VIP 2', 5000, 4.5],
  ['VIP 3', 10000, 4],
  ['VIP 4', 25000, 3.5],
  ['VIP 5', 50000, 3],
  ['VIP 6', 100000, 2.5],
  ['VIP 7', 250000, 1.5],
];

export const WITHDRAW_METHODS = [
  { id: 'crypto', name: 'Crypto', fee: '0.5% fee', rate: 0.005, note: 'USDC or USDT · crypto-funded balance only' },
  { id: 'venmo', name: 'Venmo', fee: '3% fee', rate: 0.03, note: 'Instant transfer' },
  { id: 'card', name: 'Debit card', fee: '3% fee', rate: 0.03, note: 'Instant transfer to an eligible card' },
  { id: 'bank', name: 'Bank transfer', fee: '3% fee', rate: 0.03, note: 'Standard or same-day ACH' },
] as const;

// Finished battles anyone can replay.
export function pastBattles() {
  const r = seeded(91);
  return Array.from({ length: 9 }, (_, i) => {
    const pack = PACKS[Math.floor(r() * 3)];
    const each = 1 + Math.floor(r() * 4);
    const a = USERS[Math.floor(r() * USERS.length)];
    let b = USERS[Math.floor(r() * USERS.length)];
    if (b === a) b = USERS[(USERS.indexOf(a) + 3) % USERS.length];
    return { pack, each, a, b, lowest: r() < 0.25, minutes: 20 + i * 7 + Math.floor(r() * 5), seed: 200 + i };
  });
}
