// Demo data for the clone. Every card, user and message here is invented;
// card art is the procedurally generated set in /app/assets/cards and /assets/slabs.

export const CARDS = [
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

export const cardArt = (id, size) =>
  size === 'small' ? `/app/assets/cards/${id}-200.webp` : `/app/assets/cards/${id}.webp`;
export const slabArt = (id, size) => `/assets/slabs/${id}-${size === 'large' ? 600 : 400}.webp`;

// Pack art: the clone's own foil packs, matched to each tier's colourway.
export const PACKS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 1,
    art: 'trainer',
    mult: 29.1,
    slabs: false,
    range: [0.2, 29.12],
    safeRange: [0.51, 29.12],
    odds: [
      ['common', 0.2, 0.5, 44.6],
      ['common', 0.51, 1, 37.12],
      ['core', 1.01, 1.5, 15.9],
      ['hit', 1.51, 2.5, 1.27],
      ['chase', 2.51, 6.19, 0.83],
      ['grail', 6.2, 29.12, 0.28],
    ],
    safeOdds: [
      ['common', 0.51, 1, 68.87],
      ['core', 1.01, 1.5, 29.27],
      ['hit', 1.51, 2.5, 0.81],
      ['chase', 2.51, 6.19, 0.5],
      ['grail', 6.2, 29.12, 0.55],
    ],
  },
  {
    id: 'trainer',
    name: 'Trainer',
    price: 10,
    art: 'starter',
    mult: 44,
    slabs: false,
    range: [2, 440],
    safeRange: [5, 440],
    odds: [
      ['common', 2, 6, 40.4],
      ['common', 6.01, 10, 33.2],
      ['core', 10.01, 18, 21.6],
      ['hit', 18.01, 40, 3.9],
      ['chase', 40.01, 120, 0.72],
      ['grail', 120.01, 440, 0.18],
    ],
    safeOdds: [
      ['common', 5, 10, 70.1],
      ['core', 10.01, 18, 25.4],
      ['hit', 18.01, 40, 3.6],
      ['chase', 40.01, 120, 0.7],
      ['grail', 120.01, 440, 0.2],
    ],
  },
  {
    id: 'arena',
    name: 'Arena',
    price: 25,
    art: 'arena',
    mult: 65,
    slabs: true,
    range: [6.5, 1626.16],
    safeRange: [12.63, 1626.16],
    odds: [
      ['common', 6.5, 15, 39.8],
      ['common', 15.01, 25, 32.7],
      ['core', 25.01, 45, 22.1],
      ['hit', 45.01, 120, 4.4],
      ['chase', 120.01, 400, 0.8],
      ['grail', 400.01, 1626.16, 0.2],
    ],
    safeOdds: [
      ['common', 12.63, 25, 69.4],
      ['core', 25.01, 45, 26.2],
      ['hit', 45.01, 120, 3.6],
      ['chase', 120.01, 400, 0.6],
      ['grail', 400.01, 1626.16, 0.2],
    ],
  },
  {
    id: 'master',
    name: 'Master',
    price: 100,
    art: 'master',
    mult: 100,
    slabs: true,
    range: [30, 10000],
    safeRange: [50, 10000],
    odds: [
      ['common', 30, 65, 46.2],
      ['common', 66, 100, 22.3],
      ['core', 101, 125, 24.1],
      ['hit', 126, 300, 5.7],
      ['chase', 301, 800, 1.25],
      ['grail', 801, 10000, 0.45],
    ],
    safeOdds: [
      ['common', 50, 65, 42.1],
      ['common', 66, 100, 23.94],
      ['core', 101, 125, 25.45],
      ['hit', 126, 300, 6.63],
      ['chase', 301, 800, 1.43],
      ['grail', 801, 10000, 0.45],
    ],
  },
];

export const packArt = (pack, w = 480) => `/assets/packs/${pack.art}-${w}.webp`;

// Invented collectors. Avatars are colour + initial.
export const USERS = [
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

export const user = (handle) => USERS.find((u) => u.handle === handle) || USERS[0];

// Seeded random so the demo looks the same on every load.
export function seeded(seed) {
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

const TIER_ORDER = ['common', 'core', 'hit', 'chase', 'grail'];
export const tierRank = (t) => TIER_ORDER.indexOf(t);

// A believable stream of pulls for one pack, newest first.
export function pullsFor(pack, count = 14, seed = 7) {
  const r = seeded(seed + pack.price * 31);
  const bands = pack.odds.filter(([t]) => t !== 'common');
  const out = [];
  let minutesAgo = 0;
  for (let i = 0; i < count; i++) {
    const band = bands[Math.min(bands.length - 1, Math.floor(Math.pow(r(), 2.4) * bands.length))];
    const [tier, lo, hi] = band;
    const value = lo + (Math.min(hi, lo * 3) - lo) * Math.pow(r(), 1.8);
    const card = CARDS[Math.floor(r() * CARDS.length)];
    const u = USERS[Math.floor(r() * USERS.length)];
    out.push({
      card,
      tier: i === 0 && pack.price >= 25 ? 'chase' : tier,
      value,
      user: u,
      minutesAgo: Math.floor(minutesAgo),
      pack: pack.id,
    });
    minutesAgo += r() * (pack.price > 10 ? 6 : 1.4);
  }
  return out;
}

// All-time biggest pulls (slabs).
export const TOP_HITS = [
  { card: CARDS[12], value: 2480, user: user('vesper'), pack: 'master', tier: 'grail' },
  { card: CARDS[0], value: 1625.4, user: user('orbit_ann'), pack: 'master', tier: 'grail' },
  { card: CARDS[10], value: 1210, user: user('nightglass'), pack: 'arena', tier: 'grail' },
  { card: CARDS[8], value: 864.2, user: user('sundial'), pack: 'master', tier: 'grail' },
  { card: CARDS[4], value: 702.5, user: user('mossrock'), pack: 'master', tier: 'chase' },
  { card: CARDS[3], value: 655, user: user('lumenlark'), pack: 'arena', tier: 'chase' },
  { card: CARDS[11], value: 512.75, user: user('tidewalker'), pack: 'master', tier: 'chase' },
  { card: CARDS[9], value: 488, user: user('pixelmint'), pack: 'master', tier: 'chase' },
];

export const CHAT = [
  { u: 'orbit_ann', t: 'gilded comet out of a master just now, still shaking', m: 4, reacts: 3 },
  { u: 'tidewalker', t: 'gg! what grade?', m: 4 },
  { u: 'orbit_ann', t: 'gem mint 10 🙏', m: 3, reacts: 5 },
  { u: 'emberkid', t: 'anyone doing trainer battles tonight', m: 3 },
  { u: 'mossrock', t: 'safe mode on starters has been treating me well', m: 2 },
  { u: 'quietfox', t: 'shipping to canada took 6 days for me fwiw', m: 2, reacts: 1 },
  { u: 'hexwren', t: 'daily check-in streak at 6 lets go', m: 1 },
  { u: 'vesper', t: 'welcome in everyone, be kind in chat ✨', m: 0, reacts: 7 },
];

export const CHAT_LATER = [
  { u: 'pixelmint', t: 'just hit a nebula bloom from arena 👀' },
  { u: 'coralbay', t: 'first pack ever, got a frost halo' },
  { u: 'sundial', t: 'lowest wins battles are chaos lol' },
  { u: 'lumenlark', t: 'gm chat' },
  { u: 'nightglass', t: 'odds button is worth reading before you open btw' },
];

export const VIP_LEVELS = [
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
  {
    id: 'crypto',
    name: 'Crypto',
    sub: 'USDC or USDT on Base, Ethereum, Arbitrum or Solana',
    note: 'Crypto-funded balance only',
    fee: '0.5% fee',
    icon: 'globe',
  },
  { id: 'venmo', name: 'Venmo', sub: 'Instant transfer', fee: '0% fee', icon: 'bolt' },
  { id: 'debit', name: 'Debit card', sub: 'Instant transfer to an eligible card', fee: '0% fee', icon: 'card' },
  { id: 'bank', name: 'Bank transfer', sub: 'Standard in same-day ACH', fee: '0% fee', icon: 'bank' },
];

export const money = (v, { compact = false } = {}) => {
  const digits = compact && v >= 100 && Number.isInteger(Math.round(v * 100) / 100) && v % 1 === 0 ? 0 : 2;
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: 2 });
};

export const priceLabel = (v) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });

export function ago(minutes) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  return h === 1 ? '1 hr ago' : `${h} hr ago`;
}
