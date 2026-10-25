// Types for the shared marketplace engine (engine.js, an exact copy of the
// website's app/js/market/engine.js).
import type { Tier } from '../theme';

export type Item = { uid: string; id: string; value: number; tier: Tier; at: number; graded: boolean; pack: string };
export type Bid = { by: string; amount: number; at: number; buyNow?: boolean };
export type Listing = {
  id: string;
  kind: 'fixed' | 'auction';
  seller: string;
  mine: boolean;
  items: Item[];
  price: number;
  at: number;
  status: 'active' | 'sold' | 'cancelled' | 'ended';
  watchers: number;
  buyer?: string;
  soldFor?: number;
  soldAt?: number;
  closedAt?: number;
  dropped?: number;
  // auctions
  start?: number;
  reserve?: number | null;
  buyNow?: number | null;
  cap?: number;
  ends?: number;
  top?: { by: string; max: number } | null;
  bids?: Bid[];
  myMax?: number;
  hold?: number;
};
export type Offer = {
  id: string;
  dir: 'in' | 'out';
  listing: string;
  with: string;
  title: string;
  ask: number;
  amount: number;
  counter?: number;
  at: number;
  respondAt?: number;
  expires?: number;
  closedAt?: number;
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'withdrawn' | 'expired';
};
export type Trade = {
  id: string;
  dir: 'in' | 'out';
  with: string;
  give: Item[];
  get: Item[];
  cashGive: number;
  cashGet: number;
  counter?: number;
  at: number;
  respondAt?: number;
  expires?: number;
  closedAt?: number;
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'cancelled' | 'expired' | 'replaced';
};
export type Sale = { id: string; card: string; graded: boolean; tier: Tier; price: number; at: number; buyer: string; seller: string };
export type Alert = { id: string; card: string; graded: boolean | null; below: number; at: number };
export type Target = { type: 'listing' | 'trade'; id: string } | { type: 'activity' };
export type HistoryEntry = { id: string; kind: string; title: string; body: string; target: Target; at: number; amount: number | null };
export type MarketState = {
  v: 1;
  seq: number;
  listings: Listing[];
  offers: Offer[];
  trades: Trade[];
  inv: Record<string, Item[]>;
  sales: Sale[];
  watch: string[];
  alerts: Alert[];
  history: HistoryEntry[];
  seen: Record<string, number>;
  lastTick: number;
};
export type Note = { id: string; title: string; body: string; href: string; at: number; read: boolean };
// The parts of an account the market reads and changes.
export type Account = { handle: string; balance: number; vault: Item[]; notifications: Note[]; market?: MarketState };
export type Event = { tone: 'good' | 'warn' | 'info'; title: string; body: string; target: Target };
export type Result = { ok: boolean; error?: string; short?: number; min?: number; [k: string]: unknown };
export type Collector = { handle: string; color: string; vip: number; rating: number; sales: number; wants: string[] };
export type Verdict = 'empty' | 'great' | 'fair' | 'close' | 'unlikely';
type Rand = () => number;

export const ME: 'me';
export const FEE: number;
export const MIN_OFFER: number;
export const SNIPE_MS: number;
export const COUNTER_TTL: number;
export const INCOMING_TTL: number;
export const MAX_SIDE: number;
export const MAX_BUNDLE: number;
export const DURATIONS: { id: string; label: string; ms: number }[];
export const SORTS: string[];
export function round2(v: number): number;
export function increment(p: number): number;
export function nice(v: number): number;
export function valueOf(items: Item[]): number;

export type BrowseOptions = { q?: string; kind?: 'all' | 'fixed' | 'auction'; type?: 'all' | 'raw' | 'graded'; tier?: 'all' | Tier; sort?: string; watching?: boolean; seller?: string };
export type ListOptions = { uids: string[]; kind?: 'fixed' | 'auction'; price?: number; start?: number; duration?: string; reserve?: number | null; buyNow?: number | null };
export type TradeOptions = { give?: string[]; get?: string[]; cashGive?: number; cashGet?: number; replaces?: string | null };

export type Market = {
  ensure(s: Account, now?: number, rand?: Rand): MarketState;
  tick(s: Account, now?: number, rand?: Rand): Event[];
  collector(handle: string): Collector;
  titleOf(items: Item[]): string;
  tradeLine(t: Trade): string;
  browse(s: Account, opts?: BrowseOptions, now?: number): Listing[];
  get(s: Account, id: string): Listing | null | undefined;
  mine(s: Account): Listing[];
  held(s: Account): number;
  cardStats(s: Account, cardId: string, graded: boolean | null, tier?: Tier | null, now?: number): { floor: number | null; last: number | null; avg: number | null; count24: number; listed: number; series: [number, number][] };
  pulse(s: Account, now?: number): { volume24: number; sales24: number; listed: number; auctions: number; hot: { card: string; sales: number } | null; tape: Sale[] };
  evaluateTrade(s: Account, handle: string, t: TradeOptions): { giveValue: number; getValue: number; ratio: number; verdict: Verdict; short: number };
  askOf(l: Listing): number;
  minBid(a: Listing): number;
  dealOf(l: Listing): number;
  leading(a: Listing): boolean;
  isLive(l: Listing): boolean;
  inventory(s: Account, handle: string): Item[];
  buy(s: Account, id: string, now?: number, rand?: Rand): Result;
  offer(s: Account, id: string, amount: number, now?: number, rand?: Rand): Result;
  withdrawOffer(s: Account, offerId: string, now?: number): Result;
  acceptCounter(s: Account, offerId: string, now?: number, rand?: Rand): Result;
  respondOffer(s: Account, offerId: string, action: 'accept' | 'decline' | 'counter', amount?: number, now?: number, rand?: Rand): Result;
  list(s: Account, opts: ListOptions, now?: number, rand?: Rand): Result;
  editPrice(s: Account, id: string, price: number, now?: number): Result;
  cancel(s: Account, id: string, now?: number): Result;
  bid(s: Account, id: string, max: number, now?: number, rand?: Rand): Result;
  proposeTrade(s: Account, handle: string, t: TradeOptions, now?: number, rand?: Rand): Result;
  cancelTrade(s: Account, id: string, now?: number): Result;
  acceptTradeCounter(s: Account, id: string, now?: number, rand?: Rand): Result;
  respondTrade(s: Account, id: string, action: 'accept' | 'decline', now?: number, rand?: Rand): Result;
  toggleWatch(s: Account, id: string): boolean;
  addAlert(s: Account, a: { card: string; graded?: boolean | null; below: number }, now?: number): Result;
  removeAlert(s: Account, id: string): void;
  tiers: Tier[];
};

export function createMarket(opts: {
  cards: { id: string; name: string; set: string; grade: string }[];
  users: { handle: string; color: string; vip: number }[];
  packs: { id: string; slabs: boolean; odds: [string, number, number, number][] }[];
  href: (target: Target) => string;
}): Market;
