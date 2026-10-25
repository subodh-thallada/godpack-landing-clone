// Dev-only data sets for stress-testing the UI (the break-ui pass): the
// worst realistic value each field can hold (or the longest its input
// allows), plus the empty and single-item states. On web in development,
// add ?data=worst (or empty, one) to the URL and flip between them with the
// switch at the bottom of the screen. Production builds never show it.
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CARDS, PACKS, USERS } from '../data';
import { type Session, type VaultItem, useSession } from '../store/session';

export type DataSet = 'demo' | 'worst' | 'empty' | 'one';
const SETS: { id: DataSet; label: string }[] = [
  { id: 'demo', label: 'Demo' },
  { id: 'worst', label: 'Worst case' },
  { id: 'empty', label: 'Empty' },
  { id: 'one', label: 'One' },
];
const DAY = 86400000;

const item = (i: number, now: number, value?: number): VaultItem => {
  const card = CARDS[i % CARDS.length];
  const pack = PACKS[i % PACKS.length];
  return { uid: `w${i}`, id: card.id, value: value ?? Math.round((((i * 7919) % 1234567) / 100 + 0.01) * 100) / 100, tier: (['common', 'core', 'hit', 'chase', 'grail'] as const)[i % 5], at: now - (i % 6) * DAY - 3600000, graded: i % 3 === 0, pack: pack.id };
};

export function fixture(set: DataSet, base: Session): Session {
  const now = Date.now();
  if (set === 'demo') return base;
  if (set === 'empty') {
    return { ...base, balance: 0, opened: 0, largest: null, streak: 0, lastCheckIn: 0, freePacks: 0, volume: 0, followers: [], following: [], vault: [], pulls: [], shipments: [], withdrawals: [], battles: [], lobby: [], chat: [], notifications: [] };
  }
  if (set === 'one') {
    const v = item(1, now, 1);
    return {
      ...base,
      balance: 1,
      opened: 1,
      largest: v,
      streak: 1,
      freePacks: 1,
      volume: 1,
      followers: [USERS[0].handle],
      following: [USERS[1].handle],
      vault: [v],
      pulls: [v],
      shipments: [],
      battles: [{ id: 'b1', pack: 'starter', each: 1, at: now, status: 'open' }],
      lobby: [{ id: 'l1', host: USERS[2].handle, record: '1–0', pack: 'starter', each: 1, ends: now + 60000 }],
      notifications: [{ id: 'n1', title: 'Battle joined', body: '1 person joined your battle.', at: now, read: false, href: '/battles' }],
    };
  }
  // The worst case: every field at its realistic or schema-allowed extreme.
  const vault = Array.from({ length: 1284 }, (_, i) => item(i, now, i === 0 ? 12345.67 : undefined));
  return {
    ...base,
    handle: 'aleksandra_wisni', // 16, the handle limit
    name: 'Aleksandra Wiśniewska-K', // 24, the display-name limit
    bio: 'Collector of holo starters since 1999 — Đặng, Ólafur & 王秀英 trade with me 🦊✨', // under 80
    email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com', // unbounded
    balance: 1234567.89,
    opened: 1284,
    largest: vault[0],
    streak: 365,
    freePacks: 12,
    volume: 98765432.1,
    followers: USERS.map((u) => u.handle),
    following: USERS.map((u) => u.handle),
    vault,
    pulls: vault.slice(0, 200),
    shipments: [
      {
        id: 's1',
        item: vault[3],
        address: { name: 'Christopher Alexander Montgomery III', line1: '1600 Amphitheatre Parkway, Building 43, Floor 2', line2: 'Attn: Receiving Dock B — Suite 2045-A', city: 'Rancho Santa Margarita', region: 'CA', zip: '92688-1234', country: 'US' },
        cost: 1234.5,
        at: now - 2 * DAY,
        tracking: '1Z999AA10123456784999AA10123456784',
      },
    ],
    battles: Array.from({ length: 12 }, (_, i) => ({ id: `wb${i}`, pack: PACKS[i % PACKS.length].id, each: 1000, at: now - i * 60000, status: 'open' as const })),
    lobby: USERS.map((u, i) => ({ id: `wl${i}`, host: u.handle, record: '1,284–999', pack: PACKS[i % PACKS.length].id, each: 1000, ends: now + (i + 1) * 3600000 * 24 })),
    chat: [
      { u: USERS[0].handle, t: 'https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved', at: now - 60000 },
      { u: USERS[1].handle, t: 'Benachrichtigungseinstellungen '.repeat(6).trim(), at: now - 30000 },
      { u: 'aleksandra_wisni', t: 'x'.repeat(200), at: now - 10000, mine: true },
    ],
    chatSeen: now - 120000,
    notifications: Array.from({ length: 23 }, (_, i) => ({
      id: `wn${i}`,
      title: i === 0 ? 'Paramètres de confidentialité et de sécurité mis à jour pour votre compte' : 'Battle joined',
      body: i === 0 ? '@aleksandra_wisni joined your Master battle with 12 packs each — 1,284 cards in play, $12,345,678.90 total.' : `@${USERS[i % USERS.length].handle} joined your battle.`,
      at: now - i * 3600000,
      read: false,
      href: '/battles',
    })),
  };
}

// The switch itself: deliberately plain chrome, not part of the design.
// The real session is stashed (per tab) before the first switch, so "Demo"
// always restores it and the fixtures build on it rather than on each other.
const STASH = 'gp.dev.demo';
function stashed(): Session | null {
  try {
    const raw = sessionStorage.getItem(STASH);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function DataToggle() {
  const [set, setSet] = useState<DataSet | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const q = new URLSearchParams(window.location.search).get('data') as DataSet | null;
    if (q && SETS.some((x) => x.id === q)) setSet(q);
  }, []);
  useEffect(() => {
    if (!set) return;
    const s = useSession.getState().s;
    if (!s) return;
    let base = stashed();
    if (!base) {
      base = s;
      try {
        sessionStorage.setItem(STASH, JSON.stringify(s));
      } catch {
        // Private mode: the switch still works for this page.
      }
    }
    useSession.setState({ s: fixture(set, base) });
    const url = new URL(window.location.href);
    url.searchParams.set('data', set);
    window.history.replaceState(null, '', url);
  }, [set]);
  if (!set) return null;
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.track}>
        {SETS.map((x) => (
          <Pressable key={x.id} onPress={() => setSet(x.id)} style={[styles.seg, x.id === set && styles.on]} accessibilityRole="button" accessibilityState={{ selected: x.id === set }}>
            <Text style={[styles.label, x.id === set && { color: '#111' }]}>{x.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 6, alignItems: 'center', zIndex: 100 },
  track: { flexDirection: 'row', padding: 3, borderRadius: 10, backgroundColor: '#d4d4d8' },
  seg: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  on: { backgroundColor: '#fff' },
  label: { fontFamily: 'system-ui', fontSize: 12, color: '#52525b' },
});
