// Market: buy cards other collectors listed, bid on auctions, trade (any
// shape: 1-for-1, 2-for-1, cards plus cash), sell your own, and follow what
// happened. The other side is the demo's invented collectors; their answers
// arrive a few seconds later. All demo credit.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Badge, Countdown, ListingTile, SellerRow, TradeSide } from '../../src/components/Market';
import { Icon, type IconName } from '../../src/components/Icon';
import { Thumb } from '../../src/components/Thumb';
import { Avatar, Button, Chip, Empty, Field, Panel, Press, SectionHead, ViewHead } from '../../src/components/ui';
import { cardById } from '../../src/data';
import { money, num, plural, since } from '../../src/lib/format';
import { success, warn } from '../../src/lib/haptics';
import { enterBack, reflow, scaleIn } from '../../src/lib/motion';
import { toast } from '../../src/lib/toast';
import { type Listing, type Offer, SORTS } from '../../src/market/engine';
import { act, ensureMarket, market, useMarket } from '../../src/store/market';
import { colors, radius, type } from '../../src/theme';

type Section = 'buy' | 'auctions' | 'trade' | 'selling' | 'activity';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'buy', label: 'Buy' },
  { id: 'auctions', label: 'Auctions' },
  { id: 'trade', label: 'Trade' },
  { id: 'selling', label: 'Selling' },
  { id: 'activity', label: 'Activity' },
];
const TIERS = [
  ['all', 'Any tier'],
  ['core', 'Core'],
  ['hit', 'Hit'],
  ['chase', 'Chase'],
  ['grail', 'Grail'],
] as const;

export default function Market() {
  const params = useLocalSearchParams<{ tab?: Section }>();
  const [tab, setTab] = useState<Section>(params.tab ?? 'buy');
  // A link to a section switches to it, then clears itself so the same link
  // works again later (the tab stays mounted).
  useEffect(() => {
    if (!params.tab) return;
    if (SECTIONS.some((x) => x.id === params.tab)) setTab(params.tab);
    router.setParams({ tab: undefined });
  }, [params.tab]);
  useEffect(() => ensureMarket(), []);
  const { a, m } = useMarket();
  if (!a || !m) return <View style={{ flex: 1 }} testID="screen-market" />;

  const incomingTrades = m.trades.filter((t) => t.dir === 'in' && t.status === 'pending').length;
  const incomingOffers = m.offers.filter((o) => o.dir === 'in' && o.status === 'pending').length;
  const counts: Partial<Record<Section, number>> = { trade: incomingTrades, selling: incomingOffers };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" testID="screen-market">
      <ViewHead title="Market" sub="Buy, sell, bid on and trade cards with other collectors. Demo credit only." />
      <Pulse />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="tablist">
        {SECTIONS.map((x) => (
          <Press
            key={x.id}
            onPress={() => setTab(x.id)}
            haptic
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === x.id }}
            accessibilityLabel={counts[x.id] ? `${x.label}, ${counts[x.id]} waiting` : x.label}
            style={[styles.seg, tab === x.id && styles.segOn]}
            testID={`market-tab-${x.id}`}
          >
            <Text style={[styles.segText, tab === x.id && { color: '#0b0a12' }]}>{x.label}</Text>
            {counts[x.id] ? (
              <View style={styles.segCount}>
                <Text style={styles.segCountText}>{counts[x.id]}</Text>
              </View>
            ) : null}
          </Press>
        ))}
      </ScrollView>
      {tab === 'buy' ? <Browse kind="fixed" /> : null}
      {tab === 'auctions' ? <Browse kind="auction" /> : null}
      {tab === 'trade' ? <Trades /> : null}
      {tab === 'selling' ? <Selling /> : null}
      {tab === 'activity' ? <Activity /> : null}
    </ScrollView>
  );
}

// 24h numbers and the latest sales sliding in.
function Pulse() {
  const { a, m } = useMarket();
  const p = useMemo(() => (a ? market.pulse(a) : null), [a]);
  if (!p || !a || !m) return null;
  const held = market.held(a);
  const stat = (label: string, value: string, testID?: string) => (
    <View style={styles.stat}>
      <Text style={type.caps}>{label}</Text>
      <Text style={styles.statValue} testID={testID}>
        {value}
      </Text>
    </View>
  );
  return (
    <Panel style={{ padding: 14, gap: 12 }}>
      <View style={styles.stats}>
        {stat('24h volume', money(p.volume24, { compact: true }), 'pulse-volume')}
        {stat('Sales 24h', num(p.sales24))}
        {stat('Listed', num(p.listed))}
        {stat('Live auctions', num(p.auctions), 'pulse-auctions')}
        {held ? stat('On hold', money(held), 'pulse-held') : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} testID="sales-tape">
        {p.tape.map((x) => (
          <Animated.View key={x.id} entering={enterBack} layout={reflow} style={styles.tape}>
            <Thumb id={x.card} graded={x.graded} tier={x.tier} width={20} glow={false} />
            <View>
              <Text style={styles.tapeName} numberOfLines={1}>
                {cardById(x.card).name}
              </Text>
              <Text style={styles.tapeMeta}>
                {money(x.price)} · {x.buyer === 'me' ? 'you' : `@${x.buyer}`} · {since(x.at)}
              </Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </Panel>
  );
}

function Browse({ kind }: { kind: 'fixed' | 'auction' }) {
  const { width: W } = useWindowDimensions();
  const { a, m } = useMarket();
  const [q, setQ] = useState('');
  const [type_, setType] = useState<'all' | 'raw' | 'graded'>('all');
  const [tier, setTier] = useState<(typeof TIERS)[number][0]>('all');
  const [watching, setWatching] = useState(false);
  const [sort, setSort] = useState(kind === 'auction' ? 'Ending soon' : 'Newest');
  const [menu, setMenu] = useState(false);
  const list = useMemo(() => (a ? market.browse(a, { q, kind, type: type_, tier, sort, watching }) : []), [a, q, kind, type_, tier, sort, watching]);
  const tileW = Math.floor((Math.min(W, 560) - 32 - 12) / 2);
  if (!a || !m) return null;

  return (
    <View style={{ gap: 12 }}>
      <Field value={q} onChangeText={setQ} placeholder="Search cards, sets or @collectors" autoCapitalize="none" autoCorrect={false} accessibilityLabel="Search the market" returnKeyType="search" testID="market-search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="All" on={type_ === 'all'} onPress={() => setType('all')} testID="market-type-all" />
        <Chip label="Raw" on={type_ === 'raw'} onPress={() => setType('raw')} testID="market-type-raw" />
        <Chip label="Graded" on={type_ === 'graded'} onPress={() => setType('graded')} testID="market-type-graded" />
        <Chip label="Watching" icon="heart" on={watching} onPress={() => setWatching((w) => !w)} testID="market-watching" />
        {TIERS.map(([id, label]) => (
          <Chip key={id} label={label} on={tier === id} onPress={() => setTier(id)} testID={`market-tier-${id}`} />
        ))}
      </ScrollView>
      <View>
        <Press onPress={() => setMenu((x) => !x)} style={styles.sort} accessibilityLabel={`Sort: ${sort}`} accessibilityState={{ expanded: menu }} testID="market-sort">
          <Text style={type.caps}>Sort</Text>
          <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }}>{sort}</Text>
          <Text style={styles.count}>{plural(list.length, kind === 'auction' ? 'auction' : 'listing')}</Text>
          <Icon name="chevronDown" size={16} color={colors.muted} />
        </Press>
        {menu ? (
          <Animated.View entering={scaleIn} style={[styles.menu, { transformOrigin: 'top' }]}>
            {SORTS.map((o) => (
              <Press
                key={o}
                onPress={() => {
                  setSort(o);
                  setMenu(false);
                }}
                style={[styles.menuRow, o === sort && { backgroundColor: colors.control }]}
                accessibilityState={{ selected: o === sort }}
                testID={`market-sort-${o}`}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{o}</Text>
              </Press>
            ))}
          </Animated.View>
        ) : null}
      </View>
      {list.length ? (
        <View style={styles.grid}>
          {list.map((l) => (
            <ListingTile key={l.id} l={l} width={tileW} watched={m.watch.includes(l.id)} onPress={() => router.push(`/listing/${l.id}`)} onWatch={() => act((d) => market.toggleWatch(d, l.id))} />
          ))}
        </View>
      ) : (
        <Empty
          icon={watching ? 'heart' : kind === 'auction' ? 'gavel' : 'market'}
          title={watching ? 'Nothing on your watchlist' : 'Nothing matches'}
          body={watching ? 'Tap the heart on any listing to keep an eye on it. You hear about price drops and auctions ending.' : 'Try another search or filter. New listings arrive every few minutes.'}
        />
      )}
    </View>
  );
}

function Trades() {
  const { a, m } = useMarket();
  if (!a || !m) return null;
  const incoming = m.trades.filter((t) => t.dir === 'in' && t.status === 'pending');
  const sent = m.trades.filter((t) => t.dir === 'out' && (t.status === 'pending' || t.status === 'countered'));
  const done = m.trades.filter((t) => t.status !== 'pending' && t.status !== 'countered').slice(0, 6);
  const respond = (id: string, action: 'accept' | 'decline') => {
    const r = act((d) => market.respondTrade(d, id, action));
    if (!r.ok) return toast('That trade is no longer available', 'warn');
    if (action === 'accept') {
      success();
      toast('Trade done — the cards are in your Vault', 'good');
    } else toast('Trade declined');
  };
  return (
    <View style={{ gap: 16 }}>
      <Button label="Start a trade" icon="trade" variant="buy" onPress={() => router.push('/trade/new')} testID="trade-start" />
      <SectionHead icon="trade" title="Offers for your cards" />
      {incoming.length ? (
        incoming.map((t) => (
          <Panel key={t.id} style={{ gap: 12, padding: 14 }} testID="trade-incoming">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SellerRow handle={t.with} size={22} />
              <View style={{ flex: 1 }} />
              <Countdown ends={t.expires!} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TradeSide title="You give" items={t.give} cash={t.cashGive} />
              <TradeSide title="You get" items={t.get} cash={t.cashGet} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Decline" variant="secondary" size="sm" onPress={() => respond(t.id, 'decline')} style={{ flex: 1 }} testID="trade-decline" />
              <Button label="Counter" variant="secondary" size="sm" onPress={() => router.push({ pathname: '/trade/new', params: { with: t.with, give: t.give.map((x) => x.uid).join(','), get: t.get.map((x) => x.uid).join(','), replaces: t.id } })} style={{ flex: 1 }} testID="trade-counter" />
              <Button label="Accept" size="sm" onPress={() => respond(t.id, 'accept')} style={{ flex: 1 }} testID="trade-accept" />
            </View>
          </Panel>
        ))
      ) : (
        <Text style={type.small}>No trade offers right now. Collectors send them for cards they like; they show up here.</Text>
      )}
      <SectionHead icon="send" title="Trades you sent" />
      {sent.length ? sent.map((t) => <TradeRow key={t.id} id={t.id} />) : <Text style={type.small}>Nothing waiting on an answer.</Text>}
      <SectionHead icon="feed" title="Collectors" />
      <Collectors />
      {done.length ? (
        <>
          <SectionHead icon="clock" title="Recent trades" />
          {done.map((t) => (
            <TradeRow key={t.id} id={t.id} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const STATUS: Record<string, { label: string; tone: 'money' | 'gold' | 'danger' | 'accent' | 'muted' }> = {
  pending: { label: 'Waiting', tone: 'accent' },
  countered: { label: 'Countered', tone: 'gold' },
  accepted: { label: 'Done', tone: 'money' },
  declined: { label: 'Declined', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  expired: { label: 'Expired', tone: 'muted' },
  withdrawn: { label: 'Withdrawn', tone: 'muted' },
  replaced: { label: 'You countered', tone: 'muted' },
};

function TradeRow({ id }: { id: string }) {
  const { m } = useMarket();
  const t = m?.trades.find((x) => x.id === id);
  if (!t) return null;
  const st = STATUS[t.status];
  return (
    <Press onPress={() => router.push(`/trade/${t.id}`)} style={styles.row} accessibilityLabel={`Trade with @${t.with}, ${st.label}`} testID="trade-row">
      <Avatar handle={t.with} color={market.collector(t.with).color} size={32} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {t.dir === 'out' ? 'To' : 'From'} @{t.with}
        </Text>
        <Text style={styles.rowSub} numberOfLines={2}>
          {market.tradeLine(t)}
        </Text>
        {t.status === 'countered' && t.dir === 'out' ? <Text style={[styles.rowSub, { color: colors.gold }]}>They'll do it if you add {money(t.counter!)}</Text> : null}
      </View>
      <Badge label={st.label} tone={st.tone} />
    </Press>
  );
}

function Collectors() {
  const { a } = useMarket();
  if (!a) return null;
  return (
    <View style={{ gap: 8 }}>
      {['vesper', 'orbit_ann', 'nightglass', 'mossrock', 'pixelmint', 'sundial', 'tidewalker', 'lumenlark', 'emberkid', 'quietfox', 'coralbay', 'hexwren'].map((h) => {
        const c = market.collector(h);
        const inv = market.inventory(a, h);
        return (
          <Press key={h} onPress={() => router.push({ pathname: '/trade/new', params: { with: h } })} style={styles.row} accessibilityLabel={`Trade with @${h}`} testID={`collector-${h}`}>
            <Avatar handle={h} color={c.color} size={36} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.rowTitle}>@{h}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                ★ {c.rating.toFixed(1)} · {plural(inv.length, 'card')} · wants {cardById(c.wants[0]).name}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.faint} />
          </Press>
        );
      })}
    </View>
  );
}

function Selling() {
  const { a, m } = useMarket();
  const [countering, setCountering] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  if (!a || !m) return null;
  const active = m.listings.filter((l) => l.mine && l.status === 'active');
  const closed = m.listings.filter((l) => l.mine && l.status !== 'active').slice(0, 10);
  const offers = m.offers.filter((o) => o.dir === 'in' && (o.status === 'pending' || o.status === 'countered'));
  const respond = (o: Offer, action: 'accept' | 'decline' | 'counter') => {
    const r = act((d) => market.respondOffer(d, o.id, action, action === 'counter' ? parseFloat(amount) : undefined));
    if (!r.ok) {
      warn();
      return toast(r.error === 'amount' ? `Counter between ${money(o.amount)} and ${money(o.ask)}` : 'That offer is no longer open', 'warn');
    }
    if (action === 'accept') {
      success();
      toast(`Sold for ${money(o.amount)}`, 'good');
    } else if (action === 'counter') toast(`Counter sent to @${o.with}`);
    else toast('Offer declined');
    setCountering(null);
    setAmount('');
  };
  return (
    <View style={{ gap: 16 }}>
      <Button label="List cards" icon="tag" variant="buy" onPress={() => router.push('/sell')} testID="sell-start" />
      {offers.length ? (
        <>
          <SectionHead icon="cash" title="Offers on your listings" />
          {offers.map((o) => (
            <Panel key={o.id} style={{ gap: 10, padding: 14 }} testID="offer-incoming">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SellerRow handle={o.with} size={22} />
                <View style={{ flex: 1 }} />
                {o.status === 'pending' ? <Countdown ends={o.expires!} /> : <Badge label="Your counter sent" tone="gold" />}
              </View>
              <Text style={type.body}>
                <Text style={{ color: colors.money, fontWeight: '800' }}>{money(o.amount)}</Text> for {o.title} (listed at {money(o.ask)})
              </Text>
              {o.status === 'pending' ? (
                countering === o.id ? (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Field value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={money(o.ask)} accessibilityLabel="Counter amount" style={{ flex: 1 }} testID="offer-counter-amount" />
                    <Button label="Send" size="sm" onPress={() => respond(o, 'counter')} style={{ minHeight: 46 }} testID="offer-counter-send" />
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button label="Decline" variant="secondary" size="sm" onPress={() => respond(o, 'decline')} style={{ flex: 1 }} testID="offer-decline" />
                    <Button
                      label="Counter"
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        setCountering(o.id);
                        setAmount(String(Math.round(((o.amount + o.ask) / 2) * 100) / 100));
                      }}
                      style={{ flex: 1 }}
                      testID="offer-counter"
                    />
                    <Button label={`Accept ${money(o.amount, { compact: true })}`} size="sm" onPress={() => respond(o, 'accept')} style={{ flex: 1.3 }} testID="offer-accept" />
                  </View>
                )
              ) : (
                <Text style={type.small}>You countered at {money(o.counter!)}. Waiting for @{o.with}…</Text>
              )}
            </Panel>
          ))}
        </>
      ) : null}
      <SectionHead icon="tag" title="Your listings" />
      {active.length ? active.map((l) => <MyListingRow key={l.id} l={l} offers={m.offers.filter((o) => o.listing === l.id && o.dir === 'in' && o.status === 'pending').length} />) : <Text style={type.small}>Nothing listed. Cards you list leave your Vault until they sell or you take them down.</Text>}
      {closed.length ? (
        <>
          <SectionHead icon="clock" title="Sold & ended" />
          {closed.map((l) => (
            <MyListingRow key={l.id} l={l} offers={0} />
          ))}
        </>
      ) : null}
    </View>
  );
}

function MyListingRow({ l, offers }: { l: Listing; offers: number }) {
  const auction = l.kind === 'auction';
  const status = l.status === 'sold' ? `Sold for ${money(l.soldFor!)} to @${l.buyer}` : l.status === 'ended' ? 'Ended without a sale' : l.status === 'cancelled' ? 'Taken down' : auction ? `${l.top ? `Bid ${money(l.price)}` : `Starts at ${money(l.start!)}`} · ${plural(l.bids?.length ?? 0, 'bid')}` : `${money(l.price)} · ${plural(l.watchers, 'watcher')}${offers ? ` · ${plural(offers, 'offer')}` : ''}`;
  return (
    <Press onPress={() => router.push(`/listing/${l.id}`)} style={styles.row} accessibilityLabel={`${market.titleOf(l.items)}, ${status}`} testID="my-listing">
      <Thumb id={l.items[0].id} graded={l.items[0].graded} tier={l.items[0].tier} width={34} glow={false} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {market.titleOf(l.items)}
        </Text>
        <Text style={[styles.rowSub, l.status === 'sold' && { color: colors.money }]} numberOfLines={1}>
          {status}
        </Text>
      </View>
      {l.status === 'active' && auction ? <Countdown ends={l.ends!} /> : <Badge label={auction ? 'Auction' : l.items.length > 1 ? 'Bundle' : 'Fixed'} tone="muted" />}
    </Press>
  );
}

const KIND_ICON: Record<string, IconName> = { bought: 'cash', sold: 'cash', listed: 'tag', cancelled: 'close', edited: 'pencil', offer: 'send', counter: 'refresh', bid: 'gavel', outbid: 'gavel', won: 'trophy', unsold: 'clock', trade: 'trade', traded: 'trade' };

function Activity() {
  const { a, m } = useMarket();
  if (!a || !m) return null;
  const mineOffers = m.offers.filter((o) => o.dir === 'out').slice(0, 10);
  return (
    <View style={{ gap: 16 }}>
      {mineOffers.length ? (
        <>
          <SectionHead icon="send" title="Your offers" />
          {mineOffers.map((o) => {
            const st = STATUS[o.status];
            return (
              <Press key={o.id} onPress={() => router.push(`/listing/${o.listing}`)} style={styles.row} testID="my-offer">
                <Icon name="send" size={18} color={colors.label2} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {money(o.amount)} for {o.title}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {o.status === 'countered' ? `@${o.with} countered at ${money(o.counter!)}` : `To @${o.with} · asking ${money(o.ask)}`}
                  </Text>
                </View>
                <Badge label={st.label} tone={st.tone} />
              </Press>
            );
          })}
        </>
      ) : null}
      {m.alerts.length ? (
        <>
          <SectionHead icon="bell" title="Price alerts" />
          {m.alerts.map((al) => (
            <View key={al.id} style={styles.row} testID="alert-row">
              <Icon name="bell" size={18} color={colors.gold} />
              <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>
                {cardById(al.card).name} under {money(al.below)}
              </Text>
              <Press onPress={() => act((d) => market.removeAlert(d, al.id))} hitSlop={10} accessibilityLabel="Remove alert" testID="alert-remove">
                <Icon name="close" size={16} color={colors.muted} />
              </Press>
            </View>
          ))}
        </>
      ) : null}
      <SectionHead icon="clock" title="History" />
      {m.history.length ? (
        m.history.slice(0, 40).map((h) => (
          <Press key={h.id} onPress={() => (h.target.type === 'listing' ? router.push(`/listing/${h.target.id}`) : h.target.type === 'trade' ? router.push(`/trade/${h.target.id}`) : null)} style={styles.row} testID="history-row">
            <Icon name={KIND_ICON[h.kind] ?? 'info'} size={18} color={colors.label2} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {h.title}
              </Text>
              <Text style={styles.rowSub} numberOfLines={2}>
                {h.body} · {since(h.at)}
              </Text>
            </View>
            {h.amount ? <Text style={[styles.amount, { color: h.amount > 0 ? colors.money : colors.label2 }]}>{(h.amount > 0 ? '+' : '−') + money(Math.abs(h.amount))}</Text> : null}
          </Press>
        ))
      ) : (
        <Empty icon="market" title="Nothing yet" body="Buys, sales, bids, offers and trades show up here as they happen." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 40, gap: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 14 },
  stat: { flexBasis: '40%', flexGrow: 1 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 2 },
  tape: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  tapeName: { color: colors.label, fontSize: 12, fontWeight: '700', maxWidth: 120 },
  tapeMeta: { color: colors.muted, fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  segOn: { backgroundColor: colors.label, borderColor: colors.label },
  segText: { color: colors.label2, fontSize: 14, fontWeight: '700' },
  segCount: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  segCountText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: radius.field, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  count: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  menu: { marginTop: 6, padding: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.dialogLine, backgroundColor: colors.dialog },
  menuRow: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowSub: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  amount: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
