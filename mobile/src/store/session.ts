// The demo account. There are no credentials, no server and no real money:
// the account lives on the device and every balance is pretend demo credit.
// Mirrors the web recreation's session.js so both behave the same.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CARDS, CHAT_LATER, PACKS, USERS, cardById, packById, pullsFor, seeded, user, type Pack, type Pull } from '../data';
import { drawBattle } from '../data/battle';
import { money, round2 } from '../lib/format';
import type { Tier } from '../theme';

export const START_BALANCE = 250;
export const SELL_RATE = 0.95; // 5% sell-back fee at the Standard tier
export const DAY = 86400000;
const OPEN_FOR = 15 * 60000; // a posted battle stays listed for 15 minutes

export type VaultItem = {
  uid: string;
  id: string;
  value: number;
  tier: Tier;
  at: number;
  graded: boolean;
  pack: Pack['id'];
};
export type Note = { id: string; title: string; body: string; at: number; read: boolean; href: string };
export type Address = { name: string; line1: string; line2: string; city: string; region: string; zip: string; country: 'US' | 'CA' };
export type Shipment = { id: string; item: VaultItem; address: Address; cost: number; at: number; tracking: string; seen?: number };
export type Battle = {
  id: string;
  pack: Pack['id'];
  each: number;
  lowest?: boolean;
  at: number;
  status: 'open' | 'done' | 'cancelled';
  won?: boolean;
  opponent?: string;
  seed?: number;
};
export type LobbyBattle = { id: string; host: string; record: string; pack: Pack['id']; each: number; ends: number };
export type ChatShare = { card: string; value: number; tier: Tier; pack: Pack['id'] };
export type ChatMsg = { u: string; t: string; at: number; share?: ChatShare; mine?: boolean };
export type Withdrawal = { id: string; amount: number; method: string; at: number };

export type Session = {
  handle: string;
  name: string;
  bio: string;
  color: string;
  provider: 'apple' | 'google' | 'email' | 'guest';
  email?: string;
  balance: number;
  opened: number;
  largest: VaultItem | null;
  streak: number;
  lastCheckIn: number;
  freePacks: number;
  volume: number;
  followers: string[];
  following: string[];
  vault: VaultItem[];
  pulls: VaultItem[];
  shipments: Shipment[];
  withdrawals: Withdrawal[];
  battles: Battle[];
  lobby: LobbyBattle[];
  chat: ChatMsg[];
  chatSeen: number;
  notifications: Note[];
  createdAt: number;
  welcomeUid?: string;
  chatScript: number; // how many scripted chat messages have been posted
};

export type Profile = Pick<Session, 'handle' | 'name' | 'color' | 'provider' | 'email'>;

type Store = { s: Session | null };

export const useSession = create<Store>()(
  persist(() => ({ s: null as Session | null }), {
    name: 'gp.session',
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
    migrate: () => ({ s: null }),
  }),
);

export const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const getS = () => useSession.getState().s;

// Apply a change to a copy of the account and store it.
export function update(fn: (d: Session) => void) {
  const s = getS();
  if (!s) return;
  const d = clone(s);
  fn(d);
  useSession.setState({ s: d });
}

export function fresh(profile: Profile, welcome?: VaultItem | null): Session {
  const now = Date.now();
  const vault: VaultItem[] = [
    { uid: 'v1', id: 'prism-gate', value: 9.37, tier: 'common', at: now - 1.5 * DAY - 3600000 * 11, graded: false, pack: 'starter' },
    { uid: 'v2', id: 'tidal-glass', value: 1.22, tier: 'core', at: now - 1.5 * DAY - 3600000 * 11, graded: false, pack: 'starter' },
  ];
  if (welcome) vault.unshift(welcome);
  return {
    ...profile,
    bio: '',
    balance: START_BALANCE,
    opened: welcome ? 1 : 0,
    largest: welcome ?? null,
    streak: 0,
    lastCheckIn: 0,
    freePacks: 1,
    volume: 10,
    followers: ['orbit_ann', 'pixelmint', 'hexwren'],
    following: ['orbit_ann'],
    vault,
    pulls: welcome ? [welcome] : [],
    shipments: [],
    withdrawals: [],
    battles: [],
    lobby: [{ id: 'l-first', host: 'pixelmint', record: '0–0', pack: 'trainer', each: 10, ends: now + 12 * 60000 + 39000 }],
    chat: [],
    chatSeen: now,
    notifications: [
      {
        id: 'n-welcome',
        title: 'Welcome to the demo',
        body: `You have ${money(START_BALANCE, { compact: true })} of demo credit to open packs and battle with.`,
        at: now,
        read: false,
        href: '/packs',
      },
    ],
    createdAt: now,
    welcomeUid: welcome?.uid,
    chatScript: 0,
  };
}

export function signIn(profile: Profile, welcome?: VaultItem | null) {
  useSession.setState({ s: fresh(profile, welcome) });
}
export function signOut() {
  useSession.setState({ s: null });
}
export function resetDemo() {
  const s = getS();
  if (!s) return;
  useSession.setState({ s: fresh({ handle: s.handle, name: s.name, color: s.color, provider: s.provider, email: s.email }) });
}

// ---- derived values ----

export const cardOf = (item: { id: string }) => cardById(item.id);
export const vaultValue = (s: Session | null) => (s ? s.vault.reduce((sum, v) => sum + v.value, 0) : 0);
export const unreadCount = (s: Session | null) => (s ? s.notifications.filter((n) => !n.read).length : 0);
export const isFollowing = (s: Session | null, handle: string) => !!s && s.following.includes(handle);

// Unclaimed cards auto-sell 7 days after they are pulled.
export function saleTimer(item: VaultItem, now = Date.now()) {
  const left = Math.max(0, item.at + 7 * DAY - now);
  return `${Math.floor(left / DAY)}D ${Math.floor((left % DAY) / 3600000)}H`;
}

export function autoSell() {
  const s = getS();
  if (!s) return;
  const due = s.vault.filter((v) => v.at + 7 * DAY <= Date.now());
  if (!due.length) return;
  update((d) => {
    const total = due.reduce((sum, v) => sum + v.value * SELL_RATE, 0);
    d.vault = d.vault.filter((v) => !due.some((x) => x.uid === v.uid));
    d.balance = round2(d.balance + total);
    note(d, `${due.length} card${due.length > 1 ? 's' : ''} auto-sold`, `Unclaimed for 7 days. ${money(total)} added to your balance.`, '/vault');
  });
}

// ---- notifications ----

export function note(d: Session, title: string, body: string, href: string) {
  d.notifications.unshift({ id: uid('n'), title, body, href, at: Date.now(), read: false });
  d.notifications = d.notifications.slice(0, 30);
}

export function markRead(id?: string) {
  update((d) => {
    d.notifications.forEach((n) => {
      if (!id || n.id === id) n.read = true;
    });
  });
}

// ---- packs ----

// A welcome pull for onboarding: a free Starter pack, guaranteed to be a hit
// or better (the screen says so).
export function welcomePull(seed = Math.floor(Math.random() * 1e6)): VaultItem {
  const r = seeded(seed);
  const pack = packById('starter');
  const bands = pack.odds.filter(([t]) => t === 'hit' || t === 'chase');
  const [tier, lo, hi] = bands[r() < 0.8 ? 0 : 1];
  return {
    uid: uid('p'),
    id: CARDS[Math.floor(r() * CARDS.length)].id,
    value: round2(lo + (hi - lo) * Math.pow(r(), 1.6)),
    tier,
    at: Date.now(),
    graded: false,
    pack: 'starter',
  };
}

// Draw `count` pulls from a pack, move them into the vault and record them in
// your pull history. A free pack costs nothing.
export function openPacks(pack: Pack, count: number, { free = false } = {}): VaultItem[] {
  const seed = Math.floor(Math.random() * 1e6);
  const pulls: VaultItem[] = pullsFor(pack, count, seed).map((p) => ({
    uid: uid('p'),
    id: p.card.id,
    value: round2(p.value),
    tier: p.tier,
    at: Date.now(),
    graded: pack.slabs,
    pack: pack.id,
  }));
  update((d) => {
    if (free) d.freePacks = Math.max(0, d.freePacks - count);
    else {
      d.balance = round2(d.balance - pack.price * count);
      d.volume += pack.price * count;
    }
    d.opened += count;
    d.vault = [...pulls, ...d.vault];
    d.pulls = [...pulls, ...d.pulls].slice(0, 60);
    const best = bestOf(pulls);
    if (!d.largest || best.value > d.largest.value) d.largest = { ...best };
    if (best.tier === 'grail' || best.tier === 'chase') {
      note(d, best.tier === 'grail' ? 'Grail pull!' : 'Chase pull!', `${cardOf(best).name} for ${money(best.value)} from a ${pack.name} pack.`, '/vault');
    }
  });
  return pulls;
}

export const bestOf = <T extends { value: number }>(xs: T[]) => xs.reduce((a, b) => (b.value > a.value ? b : a));

export function sell(uids: string[]) {
  let total = 0;
  update((d) => {
    d.vault = d.vault.filter((v) => {
      if (!uids.includes(v.uid)) return true;
      total += v.value * SELL_RATE;
      return false;
    });
    d.balance = round2(d.balance + total);
  });
  return round2(total);
}

// ---- shipping ----

export const SHIP_COST = { US: 5, CA: 10 } as const;
export const STAGES = ['Requested', 'Packed', 'Shipped', 'Delivered'] as const;
const STAGE_MS = 45000; // the demo moves a shipment along every 45 seconds

export function ship(itemUid: string, address: Address): Shipment | null {
  const s = getS();
  const item = s?.vault.find((v) => v.uid === itemUid);
  if (!item) return null;
  const cost = SHIP_COST[address.country] ?? 5;
  const shipment: Shipment = {
    id: uid('s'),
    item: { ...item },
    address,
    cost,
    at: Date.now(),
    tracking: 'DEMO' + Math.floor(100000000 + Math.random() * 899999999),
  };
  update((d) => {
    d.vault = d.vault.filter((v) => v.uid !== itemUid);
    d.balance = round2(d.balance - cost);
    d.shipments.unshift(shipment);
  });
  return shipment;
}

export const shipmentStage = (sh: Shipment, now = Date.now()) => Math.min(STAGES.length - 1, Math.floor((now - sh.at) / STAGE_MS));

// Notify when a shipment ships and when it's delivered.
export function checkShipments() {
  const s = getS();
  if (!s || !s.shipments.some((sh) => shipmentStage(sh) > (sh.seen ?? 0))) return;
  update((d) => {
    d.shipments.forEach((sh) => {
      const stage = shipmentStage(sh);
      const seen = sh.seen ?? 0;
      if (stage <= seen) return;
      sh.seen = stage;
      const name = cardOf(sh.item).name;
      // Each stage gets its note, even if the app was closed while it passed.
      if (seen < 2 && stage >= 2) note(d, `${name} shipped`, `Tracking ${sh.tracking}.`, '/shipments');
      if (seen < 3 && stage >= 3) note(d, `${name} was delivered`, 'Enjoy the card!', '/shipments');
    });
  });
}

// ---- following ----

export function toggleFollow(handle: string) {
  let now = false;
  update((d) => {
    if (d.following.includes(handle)) d.following = d.following.filter((h) => h !== handle);
    else {
      d.following = [handle, ...d.following];
      now = true;
    }
  });
  return now;
}

// Someone new follows you a little while after you arrive.
export function maybeGainFollower() {
  const s = getS();
  if (!s) return null;
  const candidates = USERS.map((u) => u.handle).filter((h) => !s.followers.includes(h));
  if (!candidates.length) return null;
  const h = candidates[Math.floor(Math.random() * candidates.length)];
  update((d) => {
    d.followers = [h, ...d.followers];
    note(d, `@${h} followed you`, 'Their pulls can show up in your Following feed if you follow back.', `/profile/${h}`);
  });
  return h;
}

// ---- battles ----

// Post a battle: pay the entry now; an opponent joins after a few seconds.
export function postBattle(pack: Pack, each: number, lowest: boolean) {
  const b: Battle = { id: uid('b'), pack: pack.id, each, lowest, at: Date.now(), status: 'open' };
  update((d) => {
    d.balance = round2(d.balance - pack.price * each);
    d.volume += pack.price * each;
    d.battles.unshift(b);
  });
  return b;
}

export function cancelBattle(id: string) {
  update((d) => {
    const b = d.battles.find((x) => x.id === id);
    if (!b || b.status !== 'open') return;
    b.status = 'cancelled';
    const entry = packById(b.pack).price * b.each;
    d.balance = round2(d.balance + entry);
    d.volume = Math.max(0, d.volume - entry);
  });
}

// A battle you posted that has waited long enough for an opponent.
export function dueBattle(now = Date.now()) {
  const s = getS();
  return s?.battles.find((b) => b.status === 'open' && now - b.at > 7000) ?? null;
}

// Settle a battle: draw both sides from its seed; the winner takes every
// card. Runs once, when the opponent joins, so closing the replay early
// can't lose anything.
function resolve(d: Session, b: Battle, opponent: string, seed: number) {
  const pack = packById(b.pack);
  const { A, B, aWins } = drawBattle(seed, pack, b.each, !!b.lowest);
  b.status = 'done';
  b.won = aWins;
  b.opponent = opponent;
  b.seed = seed;
  if (aWins) {
    const won: VaultItem[] = [...A, ...B].map((c) => ({
      uid: uid('w'),
      id: c.card.id,
      value: round2(c.value),
      tier: 'core',
      at: Date.now(),
      graded: pack.slabs,
      pack: pack.id,
    }));
    d.vault = [...won, ...d.vault];
  }
  note(
    d,
    aWins ? 'You won a battle' : 'Battle lost',
    aWins ? `You beat @${opponent} and took all ${b.each * 2} cards.` : `@${opponent} took the cards this time.`,
    '/vault',
  );
}

// An opponent joins one of your open battles.
export function matchBattle(id: string, rand = Math.random) {
  const opponent = USERS[Math.floor(rand() * USERS.length)].handle;
  const seed = Math.floor(rand() * 1e6);
  let matched = false;
  update((d) => {
    const b = d.battles.find((x) => x.id === id);
    if (!b || b.status !== 'open') return;
    resolve(d, b, opponent, seed);
    matched = true;
  });
  return matched ? { opponent, seed } : null;
}

export const openBattles = (s: Session | null) => (s ? s.battles.filter((b) => b.status === 'open') : []);
export const myOpenRows = (s: Session | null) => openBattles(s).map((b) => ({ ...b, ends: b.at + OPEN_FOR }));

// Other collectors' open battles. They expire and new ones get posted.
export const lobbyBattles = (s: Session | null, now = Date.now()) => (s ? s.lobby.filter((b) => b.ends > now) : []);

export function refreshLobby(rand = Math.random) {
  const s = getS();
  if (!s) return;
  const live = s.lobby.filter((b) => b.ends > Date.now());
  const add = live.length < 2 && rand() < 0.5;
  if (!add && live.length === s.lobby.length) return;
  update((d) => {
    d.lobby = live;
    if (!add) return;
    const pack = PACKS[Math.floor(rand() * 3)];
    d.lobby.push({
      id: uid('l'),
      host: USERS[Math.floor(rand() * USERS.length)].handle,
      record: `${Math.floor(rand() * 9)}–${Math.floor(rand() * 9)}`,
      pack: pack.id,
      each: 1 + Math.floor(rand() * (pack.price > 10 ? 2 : 5)),
      ends: Date.now() + (6 + rand() * 9) * 60000,
    });
  });
}

// Take a seat in someone's battle: pay the entry; the replay settles it.
export function joinLobby(id: string) {
  const b = getS()?.lobby.find((x) => x.id === id);
  if (!b) return null;
  const pack = packById(b.pack);
  const seed = Math.floor(Math.random() * 1e6);
  update((d) => {
    d.lobby = d.lobby.filter((x) => x.id !== id);
    d.balance = round2(d.balance - pack.price * b.each);
    d.volume += pack.price * b.each;
    const battle: Battle = { id: b.id, pack: b.pack, each: b.each, at: Date.now(), status: 'open' };
    d.battles.unshift(battle);
    resolve(d, battle, b.host, seed);
  });
  return { ...b, pack, seed };
}

// ---- rewards ----

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const checkedInToday = (s: Session | null, now = Date.now()) => !!s && s.lastCheckIn >= startOfDay(now);
// Midnight at the start of yesterday (safe across daylight-saving changes).
const startOfYesterday = (now: number) => startOfDay(startOfDay(now) - 1);
// The streak as it stands today: a missed day means it's already broken.
export const currentStreak = (s: Session | null, now = Date.now()) => (s && s.lastCheckIn >= startOfYesterday(now) ? s.streak : 0);

// Check in once a day; seven in a row earns a free pack.
export function checkIn(now = Date.now()) {
  let earned = false;
  update((d) => {
    if (d.lastCheckIn >= startOfDay(now)) return;
    d.streak = d.lastCheckIn >= startOfYesterday(now) ? d.streak + 1 : 1;
    d.lastCheckIn = now;
    if (d.streak >= 7) {
      d.streak = 0;
      d.freePacks += 1;
      earned = true;
    }
  });
  return earned;
}

export function nextVip(volume: number): [number, string, number] | null {
  const tiers: [number, string, number][] = [
    [1000, 'VIP 1', 4.75],
    [5000, 'VIP 2', 4.5],
    [10000, 'VIP 3', 4],
    [25000, 'VIP 4', 3.5],
    [50000, 'VIP 5', 3],
    [100000, 'VIP 6', 2.5],
    [250000, 'VIP 7', 1.5],
  ];
  return tiers.find(([t]) => volume < t) ?? null;
}

// ---- money ----

export function deposit(amount: number) {
  update((d) => {
    d.balance = round2(d.balance + amount);
    note(d, 'Demo credit added', `${money(amount)} is in your balance. No payment was taken.`, '/packs');
  });
}

export function withdraw(amount: number, method: string) {
  update((d) => {
    d.balance = round2(d.balance - amount);
    d.withdrawals.unshift({ id: uid('w'), amount, method, at: Date.now() });
    note(d, 'Withdrawal requested', `${money(amount)} via ${method}. Demo only: nothing is sent.`, '/withdraw');
  });
}

// ---- chat ----

export function postChat(message: Omit<ChatMsg, 'at'>) {
  update((d) => {
    d.chat.push({ ...message, at: Date.now() });
    d.chat = d.chat.slice(-40);
  });
}
// The next scripted message from other collectors, posted once per account.
export function postScriptedChat() {
  const s = getS();
  if (!s || s.chatScript >= CHAT_LATER.length) return;
  update((d) => {
    d.chat.push({ ...CHAT_LATER[d.chatScript], at: Date.now() });
    d.chat = d.chat.slice(-40);
    d.chatScript += 1;
  });
}

export function markChatSeen() {
  update((d) => {
    d.chatSeen = Date.now();
  });
}

// ---- profile ----

export function editProfile(p: { name: string; bio: string; color: string }) {
  update((d) => {
    d.name = p.name;
    d.bio = p.bio;
    d.color = p.color;
  });
}

// Portfolio series for the profile chart: flat with a few small steps up,
// ending at today's total (cash + cards). Points are [timestamp, value].
export const RANGES = ['1D', '7D', '1M', '3M', '1Y', 'All'] as const;
export type Range = (typeof RANGES)[number];
export function portfolioSeries(s: Session | null, range: Range): [number, number][] {
  const spans: Record<Range, [number, number]> = { '1D': [DAY, 48], '7D': [7 * DAY, 56], '1M': [30 * DAY, 60], '3M': [90 * DAY, 60], '1Y': [365 * DAY, 73], All: [400 * DAY, 80] };
  const [span, n] = spans[range];
  const end = (s ? s.balance : 0) + vaultValue(s);
  const r = seeded(range.length * 97 + Math.round(end * 100));
  const now = Date.now();
  const steps = { '1D': 1, '7D': 2, '1M': 3, '3M': 4, '1Y': 5, All: 6 }[range];
  const rise = end * { '1D': 0.012, '7D': 0.03, '1M': 0.06, '3M': 0.1, '1Y': 0.18, All: 0.22 }[range];
  const at = Array.from({ length: steps }, () => Math.floor((0.25 + r() * 0.7) * n)).sort((a, b) => a - b);
  let v = end - rise;
  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    at.forEach((k) => {
      if (k === i) v += rise / steps;
    });
    values.push(i === n - 1 ? end : v);
  }
  return values.map((val, i) => [now - span + (span * i) / (n - 1), val]);
}

// Your own pulls in the shape the feed and hit cards use.
export function myPulls(s: Session | null): Pull[] {
  if (!s) return [];
  const me = { handle: s.handle, color: s.color, vip: 0, self: true };
  return s.pulls.map((p) => ({
    uid: p.uid,
    card: cardOf(p),
    tier: p.tier,
    value: p.value,
    user: me,
    minutesAgo: Math.floor((Date.now() - p.at) / 60000),
    pack: p.pack,
  }));
}

export { user };
