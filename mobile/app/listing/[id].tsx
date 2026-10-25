// One listing: buy it now, make an offer (and take a counter), bid on an
// auction, watch it, set a price alert, and see the card's recent sale
// prices. Your own listings: change the price, take it down, answer offers.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Badge, Countdown, ItemsArt, SellerRow, Sparkline } from '../../src/components/Market';
import { Icon } from '../../src/components/Icon';
import { Button, Chip, Field, Press, Sheet } from '../../src/components/ui';
import { cardById } from '../../src/data';
import { money, plural, since } from '../../src/lib/format';
import { success, tap, warn } from '../../src/lib/haptics';
import { fadeIn, scaleIn } from '../../src/lib/motion';
import { toast } from '../../src/lib/toast';
import { FEE, type Listing, ME, type Result, increment, nice } from '../../src/market/engine';
import { act, ensureMarket, market, useMarket } from '../../src/store/market';
import { colors, radius, tierColor, type } from '../../src/theme';

const why = (r: Result, verb: string) =>
  r.error === 'funds' ? `Add ${money(r.short ?? 0)} to ${verb}` : r.error === 'gone' ? 'This listing is no longer available' : r.error === 'low' ? `Offers start at ${money(r.min ?? 0)}` : r.error === 'pending' ? 'You already have an offer waiting on this' : r.error === 'amount' && r.min ? `The next bid is at least ${money(r.min)}` : r.error === 'buyNow' ? 'That’s over the Buy now price — use Buy now' : 'Check the amount and try again';

export default function ListingSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => ensureMarket(), []);
  const { a, m } = useMarket();
  const l = a && m ? m.listings.find((x) => x.id === id) : null;
  if (!a || !m || !l) {
    return (
      <Sheet title="Listing">
        <Text style={type.body}>This listing is no longer available.</Text>
        <Button label="Back to the Market" onPress={() => (router.canGoBack() ? router.back() : router.replace('/market'))} />
      </Sheet>
    );
  }
  return <Detail l={l} />;
}

function Detail({ l }: { l: Listing }) {
  const { width: W, height: H } = useWindowDimensions();
  const { a, m } = useMarket();
  const auction = l.kind === 'auction';
  const live = l.status === 'active';
  const value = l.items.reduce((s, it) => s + it.value, 0);
  const first = l.items[0];
  const card = cardById(first.id);
  const stats = market.cardStats(a!, first.id, first.graded, first.tier);
  const watched = m!.watch.includes(l.id);
  const artW = Math.min(W * 0.46, H * 0.26 * 0.72, 210);
  const chartW = Math.min(W, 560) - 40 - 2;
  const title = l.items.length > 1 ? `Bundle · ${l.items.length} cards` : card.name;

  return (
    <Sheet title={title} testID="listing-sheet">
      <Animated.View entering={scaleIn} style={{ alignItems: 'center', paddingVertical: 4 }}>
        <ItemsArt items={l.items} width={artW} large />
      </Animated.View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={styles.price} testID="listing-price">
          {money(l.price)}
        </Text>
        <Text style={type.small}>
          {auction ? (l.top ? `Current bid · ${plural(l.bids?.length ?? 0, 'bid')}` : 'Starting bid · no bids yet') : `Market value ${money(value)}`}
          {!auction && l.dropped ? ` · was ${money(l.dropped)}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {!live ? <Badge label={l.status === 'sold' ? (l.buyer === ME ? `You bought it · ${money(l.soldFor!)}` : `Sold · ${money(l.soldFor!)}`) : l.status === 'ended' ? 'Ended' : 'Taken down'} tone={l.status === 'sold' ? 'money' : 'muted'} testID="listing-status" /> : null}
          {live && auction ? <Countdown ends={l.ends!} testID="listing-countdown" /> : null}
          {live && !auction && market.dealOf(l) >= 0.05 ? <Badge label={`${Math.round(market.dealOf(l) * 100)}% under value`} tone="money" /> : null}
          {live && auction && l.top?.by === ME ? <Badge label="You're winning" tone="money" testID="bid-winning" /> : null}
          {live && auction && l.top && l.top.by !== ME && l.myMax ? <Badge label="Outbid" tone="danger" testID="bid-outbid" /> : null}
          {auction && l.mine && l.reserve != null ? <Badge label={l.top && l.price >= l.reserve ? 'Reserve met' : 'Reserve not met'} tone={l.top && l.price >= l.reserve ? 'money' : 'gold'} /> : null}
          {auction && l.buyNow ? <Badge label={`Buy now ${money(l.buyNow)}`} tone="accent" /> : null}
        </View>
      </View>

      {l.items.length > 1 ? (
        <View style={styles.box}>
          {l.items.map((it) => (
            <View key={it.uid} style={styles.line}>
              <View style={[styles.dot, { backgroundColor: tierColor[it.tier] }]} />
              <Text style={[styles.lineName, { flex: 1 }]}>{cardById(it.id).name}</Text>
              <Text style={styles.lineValue}>{money(it.value)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[type.small, { textAlign: 'center' }]}>
          {first.graded ? `Graded · ${card.grade}` : 'Raw · NM'} · {card.set}
        </Text>
      )}

      {l.mine ? <Mine l={l} /> : live ? auction ? <BidBox l={l} /> : <BuyBox l={l} /> : null}

      <View style={styles.box}>
        {l.mine ? (
          <Text style={styles.boxTitle}>Your listing · {plural(l.watchers, 'watcher')}</Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SellerRow handle={l.seller} size={26} />
            <Text style={type.small}>· {plural(market.collector(l.seller).sales, 'sale')}</Text>
          </View>
        )}
        {!l.mine ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label={watched ? 'Watching' : 'Watch'}
              icon={watched ? 'heartOn' : 'heart'}
              variant="secondary"
              size="sm"
              onPress={() => {
                tap();
                const on = act((d) => market.toggleWatch(d, l.id));
                toast(on ? 'Watching — you’ll hear about price drops and the end' : 'Removed from your watchlist');
              }}
              style={{ flex: 1 }}
              testID="listing-watch"
            />
            <Button label={`Trade with @${l.seller}`} icon="trade" variant="secondary" size="sm" onPress={() => router.push({ pathname: '/trade/new', params: { with: l.seller } })} style={{ flex: 1 }} testID="listing-trade" />
          </View>
        ) : null}
      </View>

      <View style={styles.box}>
        <Text style={styles.boxTitle}>
          {card.name} · {first.graded ? 'graded' : 'raw'} {first.tier} · recent sales
        </Text>
        <Sparkline series={stats.series} width={chartW - 28} />
        <View style={styles.statsRow}>
          <Stat label="Floor" value={stats.floor != null ? money(stats.floor) : '—'} />
          <Stat label="Last sale" value={stats.last != null ? money(stats.last) : '—'} />
          <Stat label="7-day avg" value={stats.avg != null ? money(stats.avg) : '—'} />
          <Stat label="Sales 24h" value={String(stats.count24)} />
        </View>
        {!l.mine ? <AlertBox card={first.id} graded={first.graded} suggest={nice((stats.floor ?? l.price) * 0.9)} /> : null}
      </View>

      {auction && l.bids?.length ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Bids</Text>
          {l.bids.slice(0, 8).map((b, i) => (
            <View key={i} style={styles.line} testID="bid-row">
              <Icon name="gavel" size={14} color={b.by === ME ? colors.money : colors.muted} />
              <Text style={[styles.lineName, { flex: 1 }]}>{b.by === ME ? 'You' : `@${b.by}`}</Text>
              <Text style={type.small}>{since(b.at)}</Text>
              <Text style={styles.lineValue}>{money(b.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flex: 1, minWidth: 64 }}>
    <Text style={type.caps}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

// Buy now, or make an offer and see how it went.
function BuyBox({ l }: { l: Listing }) {
  const { a, m } = useMarket();
  const [confirm, setConfirm] = useState(false);
  const [offering, setOffering] = useState(false);
  const [amount, setAmount] = useState(String(nice(l.price * 0.9)));
  const mine = m!.offers.find((o) => o.listing === l.id && o.dir === 'out' && (o.status === 'pending' || o.status === 'countered'));
  const buy = () => {
    const r = act((d) => market.buy(d, l.id));
    if (!r.ok) {
      warn();
      return toast(why(r, 'buy it'), 'warn');
    }
    success();
    toast(`${market.titleOf(l.items)} is in your Vault`, 'good');
  };
  const send = () => {
    const r = act((d) => market.offer(d, l.id, parseFloat(amount)));
    if (!r.ok) {
      warn();
      return toast(why(r, 'make this offer'), 'warn');
    }
    tap();
    setOffering(false);
    toast(`Offer sent to @${l.seller}`);
  };
  if (mine) {
    return (
      <Animated.View entering={fadeIn} style={[styles.box, { borderColor: colors.accentSoft }]} testID="my-offer-box">
        {mine.status === 'pending' ? (
          <>
            <Text style={styles.boxTitle}>Your offer: {money(mine.amount)}</Text>
            <Text style={type.small}>Waiting for @{l.seller}. The money is held until they answer.</Text>
            <Button label="Withdraw offer" variant="secondary" size="sm" onPress={() => act((d) => market.withdrawOffer(d, mine.id))} testID="offer-withdraw" />
          </>
        ) : (
          <>
            <Text style={styles.boxTitle}>@{l.seller} countered: {money(mine.counter!)}</Text>
            <Text style={type.small}>You offered {money(mine.amount)}. Take it before it expires.</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Decline" variant="secondary" size="sm" onPress={() => act((d) => market.withdrawOffer(d, mine.id))} style={{ flex: 1 }} testID="counter-decline" />
              <Button
                label={`Take ${money(mine.counter!)}`}
                size="sm"
                onPress={() => {
                  const r = act((d) => market.acceptCounter(d, mine.id));
                  if (!r.ok) return toast(why(r, 'take the counter'), 'warn');
                  success();
                  toast(`${mine.title} is in your Vault`, 'good');
                }}
                style={{ flex: 1.4 }}
                testID="counter-accept"
              />
            </View>
          </>
        )}
      </Animated.View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {confirm ? (
        <Animated.View entering={fadeIn} style={[styles.box, { gap: 10 }]}>
          <Text style={type.body}>
            Buy for <Text style={{ fontWeight: '800', color: colors.text }}>{money(l.price)}</Text>? Your balance after: {money((a?.balance ?? 0) - l.price)}.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Cancel" variant="secondary" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
            <Button label={`Buy for ${money(l.price)}`} onPress={buy} style={{ flex: 1.4 }} testID="listing-buy-confirm" />
          </View>
        </Animated.View>
      ) : (
        <Button label={`Buy now · ${money(l.price)}`} variant="buy" onPress={() => setConfirm(true)} testID="listing-buy" />
      )}
      {offering ? (
        <Animated.View entering={fadeIn} style={[styles.box, { gap: 10 }]} testID="offer-box">
          <Text style={styles.boxTitle}>Make an offer</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[0.8, 0.9, 0.95].map((k) => (
              <Chip key={k} label={`${Math.round(k * 100)}% · ${money(nice(l.price * k), { compact: true })}`} on={parseFloat(amount) === nice(l.price * k)} onPress={() => setAmount(String(nice(l.price * k)))} testID={`offer-chip-${Math.round(k * 100)}`} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Field value={amount} onChangeText={setAmount} keyboardType="decimal-pad" accessibilityLabel="Offer amount" style={{ flex: 1 }} testID="offer-amount" />
            <Button label="Send offer" onPress={send} style={{ minHeight: 46 }} testID="offer-send" />
          </View>
          <Text style={type.small}>The amount is held until @{l.seller} answers — usually within a few seconds. They may accept, counter or pass.</Text>
        </Animated.View>
      ) : (
        <Button label="Make an offer" icon="send" variant="secondary" onPress={() => setOffering(true)} testID="listing-offer" />
      )}
    </View>
  );
}

// Proxy bidding: set the most you'd pay; you only pay one step over the
// next-highest bid.
function BidBox({ l }: { l: Listing }) {
  const { a } = useMarket();
  const min = l.top?.by === ME ? Math.round((l.top.max + increment(l.top.max)) * 100) / 100 : market.minBid(l);
  const [amount, setAmount] = useState(String(min));
  // When someone else bids, the minimum moves up; keep what you typed unless
  // it's now too low.
  useEffect(() => setAmount((v) => ((parseFloat(v) || 0) >= min ? v : String(min))), [min]);
  const place = (max = parseFloat(amount)) => {
    const r = act((d) => market.bid(d, l.id, max));
    if (!r.ok) {
      warn();
      return toast(why(r, 'bid that much'), 'warn');
    }
    if (r.leading) {
      success();
      toast(`You're winning at ${money(r.price as number ?? l.price)}`, 'good');
    } else {
      warn();
      toast('Outbid straight away — someone’s max is higher', 'warn');
    }
  };
  return (
    <View style={[styles.box, { gap: 10 }]} testID="bid-box">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.boxTitle}>{l.top?.by === ME ? `Your max: ${money(l.top.max)}` : `Next bid: ${money(min)} or more`}</Text>
        {l.myMax && l.top?.by === ME ? <Text style={[type.small, { color: colors.money }]}>Held {money(l.hold ?? 0)}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Chip label={`${money(min, { compact: true })}`} on={parseFloat(amount) === min} onPress={() => setAmount(String(min))} testID="bid-chip-min" />
        <Chip label={`+3 steps · ${money(Math.round((min + 2 * increment(min)) * 100) / 100, { compact: true })}`} onPress={() => setAmount(String(Math.round((min + 2 * increment(min)) * 100) / 100))} testID="bid-chip-3" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Field value={amount} onChangeText={setAmount} keyboardType="decimal-pad" accessibilityLabel="Your maximum bid" style={{ flex: 1 }} testID="bid-amount" />
        <Button label={l.top?.by === ME ? 'Raise max' : 'Place bid'} icon="gavel" onPress={() => place()} style={{ minHeight: 46 }} testID="bid-place" />
      </View>
      <Text style={type.small}>Set the most you'd pay. We bid for you one step at a time, and you only pay one step over the next-highest bid. Your max is held until you're outbid or it ends. Bids in the last 30 seconds add time.</Text>
      {l.buyNow && l.price < l.buyNow ? (
        <Button
          label={`Buy now · ${money(l.buyNow)}`}
          variant="secondary"
          onPress={() => {
            const r = act((d) => market.buy(d, l.id));
            if (!r.ok) return toast(why(r, 'buy it now'), 'warn');
            success();
            toast(`${market.titleOf(l.items)} is in your Vault`, 'good');
          }}
          testID="bid-buynow"
        />
      ) : null}
      {a && a.balance < min ? <Text style={[type.small, { color: colors.gold }]}>Your balance is {money(a.balance)}.</Text> : null}
    </View>
  );
}

// Your own listing: price, take down, offers.
function Mine({ l }: { l: Listing }) {
  const [price, setPrice] = useState(String(l.price));
  const live = l.status === 'active';
  const auction = l.kind === 'auction';
  if (!live) {
    return (
      <View style={styles.box}>
        <Text style={type.body}>
          {l.status === 'sold' ? `Sold to @${l.buyer} for ${money(l.soldFor!)}. You received ${money(l.soldFor! * (1 - FEE))} after the 5% fee.` : l.status === 'ended' ? 'The auction ended without a sale. The cards are back in your Vault.' : 'You took this down. The cards are back in your Vault.'}
        </Text>
      </View>
    );
  }
  const takeDown = () => {
    const r = act((d) => market.cancel(d, l.id));
    if (!r.ok) {
      warn();
      return toast(r.error === 'bids' ? 'An auction with bids can’t be taken down' : 'Couldn’t take it down', 'warn');
    }
    toast('Taken down — the cards are back in your Vault');
    router.canGoBack() ? router.back() : router.replace('/market');
  };
  return (
    <View style={[styles.box, { gap: 10 }]} testID="mine-box">
      {!auction ? (
        <>
          <Text style={styles.boxTitle}>Price</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Field value={price} onChangeText={setPrice} keyboardType="decimal-pad" accessibilityLabel="Listing price" style={{ flex: 1 }} testID="listing-edit-price" />
            <Button
              label="Update"
              size="sm"
              onPress={() => {
                const r = act((d) => market.editPrice(d, l.id, parseFloat(price)));
                if (!r.ok) return toast('Enter a price of at least $0.50', 'warn');
                tap();
                toast(`Price updated to ${money(parseFloat(price))}`);
              }}
              style={{ minHeight: 46 }}
              testID="listing-save-price"
            />
          </View>
          <Text style={type.small}>You receive {money((parseFloat(price) || 0) * (1 - FEE))} after the 5% fee if it sells at this price.</Text>
        </>
      ) : (
        <Text style={type.body}>{l.top ? `Winning bid ${money(l.price)} by @${l.top.by}.` : `No bids yet. Starts at ${money(l.start!)}.`}</Text>
      )}
      <Button label="Take it down" icon="close" variant="danger" onPress={takeDown} disabled={auction && !!l.top} testID="listing-takedown" />
      <Press onPress={() => router.push('/market?tab=selling')} style={{ alignSelf: 'center', padding: 6 }}>
        <Text style={{ color: colors.accentSoft, fontWeight: '600' }}>Offers and other listings</Text>
      </Press>
    </View>
  );
}

function AlertBox({ card, graded, suggest }: { card: string; graded: boolean; suggest: number }) {
  const { m } = useMarket();
  const existing = m!.alerts.find((x) => x.card === card && x.graded === graded);
  const [below, setBelow] = useState(String(existing?.below ?? suggest));
  return (
    <View style={{ gap: 8 }}>
      <Text style={type.small}>{existing ? `You'll hear when one lists under ${money(existing.below)}.` : 'Get told when one lists under a price.'}</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Field value={below} onChangeText={setBelow} keyboardType="decimal-pad" accessibilityLabel="Alert price" style={{ flex: 1 }} testID="alert-amount" />
        <Button
          label={existing ? 'Update alert' : 'Set alert'}
          icon="bell"
          variant="secondary"
          size="sm"
          onPress={() => {
            const r = act((d) => market.addAlert(d, { card, graded, below: parseFloat(below) }));
            if (!r.ok) return toast('Enter a price', 'warn');
            tap();
            toast(`Alert set: ${cardById(card).name} under ${money(parseFloat(below))}`);
          }}
          style={{ minHeight: 46 }}
          testID="alert-set"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  price: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  box: { gap: 8, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  boxTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 },
  lineName: { color: colors.label, fontSize: 13, fontWeight: '600' },
  lineValue: { color: colors.money, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 2 },
});
