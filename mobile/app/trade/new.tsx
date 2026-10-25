// Build a trade with one collector: pick what you want from their cards and
// what you'll give from yours (up to four each side, so 1-for-1, 2-for-1 or
// any mix), add or ask for cash, and see how likely they are to say yes
// before you send it. A counter to a trade someone sent you opens here too.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FairnessMeter, PickTile, SellerRow, TradeSide } from '../../src/components/Market';
import { Avatar, Button, Chip, Empty, Field, Press, Screen } from '../../src/components/ui';
import { cardById } from '../../src/data';
import { money, plural } from '../../src/lib/format';
import { success, warn } from '../../src/lib/haptics';
import { toast } from '../../src/lib/toast';
import { MAX_SIDE } from '../../src/market/engine';
import { act, ensureMarket, market, useMarket } from '../../src/store/market';
import { colors, radius, type } from '../../src/theme';

const HANDLES = ['vesper', 'orbit_ann', 'nightglass', 'mossrock', 'pixelmint', 'sundial', 'tidewalker', 'lumenlark', 'emberkid', 'quietfox', 'coralbay', 'hexwren'];
const split = (v?: string) => (v ? [...new Set(v.split(',').filter(Boolean))] : []);

export default function NewTrade() {
  const p = useLocalSearchParams<{ with?: string; give?: string; get?: string; replaces?: string }>();
  useEffect(() => ensureMarket(), []);
  const { a } = useMarket();
  const [handle, setHandle] = useState(p.with && HANDLES.includes(p.with) ? p.with : '');
  if (!a) return <Screen title="Trade">{null}</Screen>;
  if (!handle) {
    return (
      <Screen title="Start a trade" testID="screen-trade-new">
        <Text style={type.body}>Pick a collector to see their cards.</Text>
        {HANDLES.map((h) => {
          const c = market.collector(h);
          return (
            <Press key={h} onPress={() => setHandle(h)} style={styles.row} testID={`pick-${h}`}>
              <Avatar handle={h} color={c.color} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>@{h}</Text>
                <Text style={type.small}>
                  ★ {c.rating.toFixed(1)} · {plural(market.inventory(a, h).length, 'card')}
                </Text>
              </View>
            </Press>
          );
        })}
      </Screen>
    );
  }
  return <Builder handle={handle} give0={split(p.give)} get0={split(p.get)} replaces={p.replaces} />;
}

function Builder({ handle, give0, get0, replaces }: { handle: string; give0: string[]; get0: string[]; replaces?: string }) {
  const { width: W } = useWindowDimensions();
  const { a } = useMarket();
  const c = market.collector(handle);
  const theirs = a ? market.inventory(a, handle) : [];
  const mine = a ? a.vault : [];
  const [get, setGet] = useState<string[]>(() => get0.filter((u) => theirs.some((x) => x.uid === u)));
  const [give, setGive] = useState<string[]>(() => give0.filter((u) => mine.some((x) => x.uid === u)));
  const [cashMode, setCashMode] = useState<'none' | 'add' | 'ask'>('none');
  const [cash, setCash] = useState('');
  const amount = cashMode === 'none' ? 0 : Math.max(0, parseFloat(cash) || 0);
  const t = { give, get, cashGive: cashMode === 'add' ? amount : 0, cashGet: cashMode === 'ask' ? amount : 0 };
  const ev = a ? market.evaluateTrade(a, handle, t) : null;
  const tileW = Math.floor((Math.min(W, 560) - 32 - 16) / 3);
  const toggle = (list: string[], set: (v: string[]) => void, uid: string) => set(list.includes(uid) ? list.filter((x) => x !== uid) : list.length >= MAX_SIDE ? list : [...list, uid]);
  if (!a || !ev) return null;
  const items = (uids: string[], from: typeof mine) => uids.map((u) => from.find((x) => x.uid === u)!).filter(Boolean);

  const send = () => {
    const r = act((d) => market.proposeTrade(d, handle, { ...t, replaces: replaces ?? null }));
    if (!r.ok) {
      warn();
      const msg: Record<string, string> = { give: 'Add a card or cash on your side', get: 'Pick something you want, or ask for cash', cash: 'Cash goes one way only', funds: `Add ${money(r.short ?? 0)} to cover the cash`, size: `Up to ${MAX_SIDE} cards a side`, cards: 'A trade needs at least one card' };
      return toast(msg[r.error ?? ''] ?? 'Check the trade and try again', 'warn');
    }
    success();
    toast(`Trade sent — @${handle} usually answers in a few seconds`, 'good');
    router.replace(`/trade/${(r.trade as { id: string }).id}`);
  };

  return (
    <Screen
      title={`Trade with @${handle}`}
      testID="screen-trade-new"
      footer={
        <View style={{ gap: 10 }}>
          <FairnessMeter verdict={ev.verdict} short={ev.short} testID="fairness" />
          <Button label={replaces ? 'Send counter' : 'Send trade'} icon="trade" variant="buy" onPress={send} disabled={ev.verdict === 'empty'} testID="trade-send" />
        </View>
      }
    >
      <View style={styles.head}>
        <SellerRow handle={handle} size={30} />
        <Text style={type.small}>Wants {c.wants.map((w) => cardById(w).name).join(' and ')} (worth a bit more to them)</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TradeSide title="You give" items={items(give, mine)} cash={t.cashGive} testID="side-give" />
        <TradeSide title="You get" items={items(get, theirs)} cash={t.cashGet} testID="side-get" />
      </View>

      <Text style={type.caps}>Their cards · {get.length}/{MAX_SIDE}</Text>
      {theirs.length ? (
        <View style={styles.grid}>
          {theirs
            .slice()
            .sort((x, y) => y.value - x.value)
            .map((it) => (
              <PickTile key={it.uid} it={it} width={tileW} on={get.includes(it.uid)} disabled={get.length >= MAX_SIDE} onPress={() => toggle(get, setGet, it.uid)} testID="pick-theirs" />
            ))}
        </View>
      ) : (
        <Empty icon="vault" title="No cards to trade" body={`@${handle} has nothing tradeable right now.`} />
      )}

      <Text style={type.caps}>Your cards · {give.length}/{MAX_SIDE}</Text>
      {mine.length ? (
        <View style={styles.grid}>
          {mine
            .slice()
            .sort((x, y) => y.value - x.value)
            .slice(0, 30)
            .map((it) => (
              <PickTile key={it.uid} it={it} width={tileW} on={give.includes(it.uid)} disabled={give.length >= MAX_SIDE} onPress={() => toggle(give, setGive, it.uid)} testID="pick-mine" />
            ))}
        </View>
      ) : (
        <Text style={type.small}>Your Vault is empty — you can still offer cash for their cards.</Text>
      )}

      <Text style={type.caps}>Cash</Text>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Chip label="No cash" on={cashMode === 'none'} onPress={() => setCashMode('none')} testID="cash-none" />
        <Chip label="I add cash" on={cashMode === 'add'} onPress={() => setCashMode('add')} testID="cash-add" />
        <Chip label="I ask for cash" on={cashMode === 'ask'} onPress={() => setCashMode('ask')} testID="cash-ask" />
      </View>
      {cashMode !== 'none' ? (
        <View style={{ gap: 6 }}>
          <Field value={cash} onChangeText={setCash} keyboardType="decimal-pad" placeholder="0.00" accessibilityLabel={cashMode === 'add' ? 'Cash you add' : 'Cash you ask for'} testID="cash-amount" />
          {cashMode === 'add' && ev.short ? (
            <Press onPress={() => setCash(String(Math.round(((parseFloat(cash) || 0) + ev.short) * 100) / 100))} style={styles.hint}>
              <Text style={{ color: colors.accentSoft, fontWeight: '600', fontSize: 13 }}>Add {money(ev.short)} to make it likely</Text>
            </Press>
          ) : null}
          <Text style={type.small}>{cashMode === 'add' ? `Held from your balance (${money(a.balance)}) until they answer.` : 'Paid to your balance if they accept.'}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  head: { gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { alignSelf: 'flex-start', paddingVertical: 4 },
});
