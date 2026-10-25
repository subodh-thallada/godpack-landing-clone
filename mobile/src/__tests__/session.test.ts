import { beforeEach, describe, expect, it } from '@jest/globals';
import { PACKS, packById } from '../data';
import {
  DAY,
  SELL_RATE,
  START_BALANCE,
  autoSell,
  cancelBattle,
  checkIn,
  checkShipments,
  checkedInToday,
  currentStreak,
  deposit,
  fresh,
  getS,
  joinLobby,
  markRead,
  matchBattle,
  nextVip,
  openPacks,
  portfolioSeries,
  postBattle,
  postScriptedChat,
  sell,
  ship,
  signIn,
  signOut,
  startOfDay,
  toggleFollow,
  update,
  useSession,
  vaultValue,
  welcomePull,
  withdraw,
} from '../store/session';

const profile = { handle: 'tester', name: 'Tester', color: '#7954ed', provider: 'guest' as const };
const s = () => getS()!;
const address = { name: 'A B', line1: '1 Main St', line2: '', city: 'Town', region: 'CA', zip: '94105', country: 'US' as const };

beforeEach(() => signIn(profile));

describe('account', () => {
  it('starts with demo credit, two cards, a free pack and a welcome note', () => {
    expect(s().balance).toBe(START_BALANCE);
    expect(s().vault).toHaveLength(2);
    expect(s().freePacks).toBe(1);
    expect(s().notifications[0].read).toBe(false);
  });

  it('keeps the welcome pull from onboarding', () => {
    const w = welcomePull(42);
    signIn(profile, w);
    expect(s().vault[0].uid).toBe(w.uid);
    expect(s().pulls).toHaveLength(1);
    expect(s().largest?.uid).toBe(w.uid);
    expect(s().welcomeUid).toBe(w.uid);
  });

  it('welcome pulls are always a hit or chase from a Starter pack', () => {
    for (let seed = 1; seed < 200; seed++) {
      const w = welcomePull(seed);
      expect(['hit', 'chase']).toContain(w.tier);
      expect(w.pack).toBe('starter');
      expect(w.value).toBeGreaterThanOrEqual(1.51);
    }
  });

  it('signs out', () => {
    signOut();
    expect(getS()).toBeNull();
  });

  it('update() does not mutate the previous state object', () => {
    const before = s();
    update((d) => {
      d.balance = 1;
    });
    expect(before.balance).toBe(START_BALANCE);
    expect(s().balance).toBe(1);
  });
});

describe('packs', () => {
  it('charges the price per pack, adds pulls to the vault and history', () => {
    const pack = packById('trainer');
    const pulls = openPacks(pack, 3);
    expect(pulls).toHaveLength(3);
    expect(s().balance).toBeCloseTo(START_BALANCE - 30, 2);
    expect(s().volume).toBe(10 + 30);
    expect(s().opened).toBe(3);
    expect(s().vault.slice(0, 3).map((v) => v.uid)).toEqual(pulls.map((p) => p.uid));
    expect(pulls.every((p) => !p.graded)).toBe(true);
  });

  it('graded packs pull slabs', () => {
    expect(openPacks(packById('arena'), 1)[0].graded).toBe(true);
  });

  it('a free pack costs nothing and uses up the free pack', () => {
    openPacks(PACKS[0], 1, { free: true });
    expect(s().balance).toBe(START_BALANCE);
    expect(s().freePacks).toBe(0);
    expect(s().volume).toBe(10);
  });

  it('selling pays 95% and removes the cards', () => {
    const [a, b] = s().vault;
    const got = sell([a.uid, b.uid]);
    expect(got).toBeCloseTo((a.value + b.value) * SELL_RATE, 2);
    expect(s().vault).toHaveLength(0);
    expect(s().balance).toBeCloseTo(START_BALANCE + got, 2);
  });

  it('vault value sums the cards', () => {
    expect(vaultValue(s())).toBeCloseTo(9.37 + 1.22, 2);
  });
});

describe('shipping', () => {
  it('charges shipping and moves the card into a shipment', () => {
    const item = s().vault[0];
    const sh = ship(item.uid, address)!;
    expect(sh.cost).toBe(5);
    expect(s().balance).toBe(START_BALANCE - 5);
    expect(s().vault.find((v) => v.uid === item.uid)).toBeUndefined();
    expect(s().shipments[0].tracking).toMatch(/^DEMO\d{9}$/);
  });

  it('Canada costs $10', () => {
    expect(ship(s().vault[0].uid, { ...address, country: 'CA' })!.cost).toBe(10);
  });

  it('notes every stage it passed, even if the app was closed through them', () => {
    const sh = ship(s().vault[0].uid, address)!;
    update((d) => {
      d.shipments[0].at = Date.now() - 46000 * 3;
    });
    checkShipments();
    checkShipments();
    const titles = s().notifications.map((n) => n.title);
    expect(titles.filter((t) => /was delivered/.test(t))).toHaveLength(1);
    expect(s().shipments[0].id).toBe(sh.id);
  });
});

describe('battles', () => {
  it('posting charges the entry; cancelling refunds it and its volume once', () => {
    const pack = packById('starter');
    const b = postBattle(pack, 3, false);
    expect(s().balance).toBe(START_BALANCE - 3);
    expect(s().volume).toBe(13);
    cancelBattle(b.id);
    cancelBattle(b.id);
    expect(s().balance).toBe(START_BALANCE);
    expect(s().volume).toBe(10);
  });

  it('settles once, when the opponent joins', () => {
    const b = postBattle(packById('starter'), 2, false);
    const before = s().vault.length;
    const match = matchBattle(b.id, () => 0.42);
    expect(match).not.toBeNull();
    const done = s().battles[0];
    expect(done.status).toBe('done');
    expect(done.seed).toBe(match!.seed);
    expect(typeof done.won).toBe('boolean');
    expect(s().vault.length).toBe(before + (done.won ? 4 : 0));
    // A second match (or a stale timer) changes nothing.
    expect(matchBattle(b.id)).toBeNull();
    expect(s().vault.length).toBe(before + (done.won ? 4 : 0));
  });

  it('a cancelled battle can no longer be matched', () => {
    const b = postBattle(packById('starter'), 1, false);
    cancelBattle(b.id);
    expect(matchBattle(b.id)).toBeNull();
  });

  it('joining a lobby battle charges the entry and settles it', () => {
    const lobby = s().lobby[0];
    const joined = joinLobby(lobby.id)!;
    expect(s().balance).toBe(START_BALANCE - joined.pack.price * lobby.each);
    expect(s().lobby).toHaveLength(0);
    expect(s().battles[0]).toMatchObject({ status: 'done', opponent: lobby.host, seed: joined.seed });
  });
});

describe('daily check-in', () => {
  const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();

  it('counts consecutive days and only once a day', () => {
    checkIn(at(1));
    checkIn(at(1, 20));
    expect(s().streak).toBe(1);
    checkIn(at(2, 9));
    expect(s().streak).toBe(2);
    expect(checkedInToday(s(), at(2, 23))).toBe(true);
    expect(checkedInToday(s(), at(3, 0))).toBe(false);
  });

  it('a missed day restarts the streak, and shows as broken before the next check-in', () => {
    checkIn(at(1));
    checkIn(at(2));
    expect(currentStreak(s(), at(3, 9))).toBe(2);
    expect(currentStreak(s(), at(4, 9))).toBe(0);
    checkIn(at(4));
    expect(s().streak).toBe(1);
  });

  it('seven days in a row earns a free pack', () => {
    let earned = false;
    for (let d = 1; d <= 7; d++) earned = checkIn(at(d));
    expect(earned).toBe(true);
    expect(s().streak).toBe(0);
    expect(s().freePacks).toBe(2);
  });

  it('startOfDay is midnight', () => {
    const t = startOfDay(at(5, 15));
    expect(new Date(t).getHours()).toBe(0);
    expect(at(5, 15) - t).toBe(15 * 3600000);
  });
});

describe('money and the rest', () => {
  it('deposit and withdraw move the demo balance and leave notes', () => {
    deposit(100);
    withdraw(40, 'Venmo');
    expect(s().balance).toBe(START_BALANCE + 60);
    expect(s().withdrawals[0]).toMatchObject({ amount: 40, method: 'Venmo' });
    expect(s().notifications[0].title).toBe('Withdrawal requested');
  });

  it('marks notifications read', () => {
    deposit(1);
    markRead();
    expect(s().notifications.every((n) => n.read)).toBe(true);
  });

  it('posts each scripted chat message once per account', () => {
    for (let i = 0; i < 20; i++) postScriptedChat();
    const texts = s().chat.map((m) => m.t);
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts.length).toBeGreaterThan(0);
  });

  it('keeps at most 30 notifications', () => {
    for (let i = 0; i < 40; i++) deposit(1);
    expect(s().notifications).toHaveLength(30);
  });

  it('auto-sells cards left for 7 days', () => {
    update((d) => {
      d.vault[0].at = Date.now() - 8 * DAY;
    });
    const value = s().vault[0].value;
    autoSell();
    expect(s().vault).toHaveLength(1);
    expect(s().balance).toBeCloseTo(START_BALANCE + value * SELL_RATE, 2);
  });

  it('toggles follows', () => {
    expect(toggleFollow('vesper')).toBe(true);
    expect(toggleFollow('vesper')).toBe(false);
    expect(s().following).toEqual(['orbit_ann']);
  });

  it('VIP tiers step up with volume', () => {
    expect(nextVip(10)?.[1]).toBe('VIP 1');
    expect(nextVip(1000)?.[1]).toBe('VIP 2');
    expect(nextVip(300000)).toBeNull();
  });

  it('the portfolio chart ends at cash plus cards', () => {
    for (const r of ['1D', '7D', '1M', '3M', '1Y', 'All'] as const) {
      const pts = portfolioSeries(s(), r);
      expect(pts[pts.length - 1][1]).toBeCloseTo(s().balance + vaultValue(s()), 6);
      expect(pts[0][0]).toBeLessThan(pts[pts.length - 1][0]);
    }
  });

  it('fresh() can be called without a welcome pull', () => {
    const f = fresh(profile);
    expect(f.welcomeUid).toBeUndefined();
    expect(useSession.getState().s).not.toBe(f);
  });
});
