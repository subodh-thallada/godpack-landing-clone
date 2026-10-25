// One trade: both sides, where it stands, and what you can do next —
// accept, decline or counter one sent to you; wait on, cancel, or take the
// counter on one you sent.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Badge, Countdown, SellerRow, TradeSide } from '../../src/components/Market';
import { Button, Sheet } from '../../src/components/ui';
import { money, since } from '../../src/lib/format';
import { success, warn } from '../../src/lib/haptics';
import { fadeIn } from '../../src/lib/motion';
import { toast } from '../../src/lib/toast';
import { act, ensureMarket, market, useMarket } from '../../src/store/market';
import { colors, type } from '../../src/theme';

const LABEL = { pending: 'Waiting', countered: 'Countered', accepted: 'Done', declined: 'Declined', cancelled: 'Cancelled', expired: 'Expired', replaced: 'You countered' } as const;
const TONE = { pending: 'accent', countered: 'gold', accepted: 'money', declined: 'danger', cancelled: 'muted', expired: 'muted', replaced: 'muted' } as const;

export default function TradeSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => ensureMarket(), []);
  const { m } = useMarket();
  const t = m?.trades.find((x) => x.id === id);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/market?tab=trade'));
  if (!t) {
    return (
      <Sheet title="Trade">
        <Text style={type.body}>This trade is no longer around.</Text>
        <Button label="Back to trades" onPress={close} />
      </Sheet>
    );
  }
  const incoming = t.dir === 'in';
  const fail = () => {
    warn();
    toast('That trade is no longer available', 'warn');
  };
  return (
    <Sheet title={incoming ? `From @${t.with}` : `To @${t.with}`} testID="trade-sheet">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SellerRow handle={t.with} size={26} />
        <View style={{ flex: 1 }} />
        <Badge label={LABEL[t.status]} tone={TONE[t.status]} testID="trade-status" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TradeSide title="You give" items={t.give} cash={t.cashGive} />
        <TradeSide title="You get" items={t.get} cash={t.cashGet} />
      </View>
      <Text style={type.small}>Sent {since(t.at)}</Text>

      {incoming && t.status === 'pending' ? (
        <Animated.View entering={fadeIn} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[type.small, { flex: 1 }]}>@{t.with} is waiting on you.</Text>
            <Countdown ends={t.expires!} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label="Decline"
              variant="secondary"
              onPress={() => {
                if (!act((d) => market.respondTrade(d, t.id, 'decline')).ok) return fail();
                toast('Trade declined');
                close();
              }}
              style={{ flex: 1 }}
              testID="trade-decline"
            />
            <Button
              label="Accept"
              onPress={() => {
                if (!act((d) => market.respondTrade(d, t.id, 'accept')).ok) return fail();
                success();
                toast('Trade done — the cards are in your Vault', 'good');
              }}
              style={{ flex: 1.4 }}
              testID="trade-accept"
            />
          </View>
          <Button
            label="Counter"
            icon="trade"
            variant="secondary"
            onPress={() => router.replace({ pathname: '/trade/new', params: { with: t.with, give: t.give.map((x) => x.uid).join(','), get: t.get.map((x) => x.uid).join(','), replaces: t.id } })}
            testID="trade-counter"
          />
        </Animated.View>
      ) : null}

      {!incoming && t.status === 'pending' ? (
        <View style={{ gap: 10 }}>
          <Text style={type.body}>Waiting for @{t.with} to answer. Your cards{t.cashGive ? ' and cash are' : ' are'} held until then.</Text>
          <Button
            label="Cancel trade"
            variant="secondary"
            onPress={() => {
              act((d) => market.cancelTrade(d, t.id));
              toast('Trade cancelled — everything is back');
            }}
            testID="trade-cancel"
          />
        </View>
      ) : null}

      {!incoming && t.status === 'countered' ? (
        <Animated.View entering={fadeIn} style={{ gap: 10 }}>
          <Text style={[type.body, { color: colors.gold }]}>@{t.with} will do it if you add {money(t.counter!)}.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="No thanks" variant="secondary" onPress={() => act((d) => market.cancelTrade(d, t.id))} style={{ flex: 1 }} testID="trade-counter-decline" />
            <Button
              label={`Add ${money(t.counter!)}`}
              onPress={() => {
                const r = act((d) => market.acceptTradeCounter(d, t.id));
                if (!r.ok) {
                  warn();
                  return toast(r.error === 'funds' ? `Add ${money(r.short ?? 0)} to your balance first` : 'That trade is no longer available', 'warn');
                }
                success();
                toast('Trade done — the cards are in your Vault', 'good');
              }}
              style={{ flex: 1.4 }}
              testID="trade-counter-accept"
            />
          </View>
          <Countdown ends={t.expires!} />
        </Animated.View>
      ) : null}

      {t.status === 'accepted' ? (
        <View style={{ gap: 10 }}>
          <Text style={type.body}>Done. Their cards are in your Vault.</Text>
          <Button label="Open Vault" variant="secondary" onPress={() => router.navigate('/vault')} testID="trade-open-vault" />
        </View>
      ) : null}
      {t.status === 'declined' && !incoming ? <Text style={type.body}>@{t.with} passed. Everything you offered is back. Try adding a little more.</Text> : null}
    </Sheet>
  );
}
