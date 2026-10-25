// The marketplace, wired to the demo account. The rules live in the shared
// engine (src/market/engine.js, the same file the website runs); this file
// runs its actions against the stored account and keeps the world moving.
import { CARDS, PACKS, USERS } from '../data';
import { type Account, type Event, type Listing, type MarketState, type Target, createMarket } from '../market/engine';
import { type Session, getS, update, useSession } from './session';

export const href = (t: Target) => (t.type === 'listing' ? `/listing/${t.id}` : t.type === 'trade' ? `/trade/${t.id}` : '/market?tab=activity');

export const market = createMarket({ cards: CARDS, users: USERS, packs: PACKS, href });

// Session and the engine's Account describe the same object.
const acct = (s: Session) => s as unknown as Account;

// Run an engine action on a copy of the account, store it, return the result.
export function act<R>(fn: (s: Account) => R): R {
  let out!: R;
  update((d) => {
    out = fn(acct(d));
  });
  return out;
}

// Older accounts have no market yet; it's added on first use.
export function ensureMarket() {
  const s = getS();
  if (s && !s.market) act((d) => market.ensure(d));
}

// What the screens read. Selectors never change state: the market exists by
// the time they run (ensureMarket is called first).
export const useMarket = () => {
  const s = useSession((x) => x.s);
  return { s, a: s && s.market ? acct(s) : null, m: s?.market as MarketState | undefined };
};

const fingerprint = (s: Session) => JSON.stringify([s.balance, s.vault.length, s.notifications.length, { ...s.market, lastTick: 0 }]);

// One beat of the world (every few seconds). Only stores the account when
// something actually changed, so screens don't re-render for nothing.
export function tickMarket(now = Date.now()): Event[] {
  const s = getS();
  if (!s) return [];
  if (!s.market) ensureMarket();
  const base = getS()!;
  const d = JSON.parse(JSON.stringify(base)) as Session;
  const before = fingerprint(d);
  const ev = market.tick(acct(d), now);
  if (ev.length || fingerprint(d) !== before) useSession.setState({ s: d });
  // Nothing visible happened: just note when we last looked, so the next
  // beat doesn't count this stretch of time twice.
  else if (base.market) base.market.lastTick = now;
  return ev;
}

// Things waiting on you: offers on your listings and trades sent to you.
export function pendingForMe(m?: MarketState) {
  if (!m) return 0;
  return m.offers.filter((o) => o.dir === 'in' && o.status === 'pending').length + m.trades.filter((t) => t.dir === 'in' && t.status === 'pending').length;
}

export const isAuction = (l: Listing) => l.kind === 'auction';

// "2:05", "12s", "1h 04m": a countdown that reads at a glance.
export function left(ms: number) {
  if (ms <= 0) return 'Ended';
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}:${String(sec % 60).padStart(2, '0')}`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
