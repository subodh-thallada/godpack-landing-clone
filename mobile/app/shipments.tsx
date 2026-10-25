// Shipments: every card you've shipped and where it is
// (Requested → Packed → Shipped → Delivered).
import { go } from '../src/lib/nav';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Thumb } from '../src/components/Thumb';
import { Button, Empty, Panel, Screen } from '../src/components/ui';
import { money, since } from '../src/lib/format';
import { STAGES, cardOf, shipmentStage, useSession } from '../src/store/session';
import { colors, type } from '../src/theme';

export default function Shipments() {
  const s = useSession((x) => x.s);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(id);
  }, []);
  const list = s?.shipments ?? [];
  return (
    <Screen title="Shipments" testID="screen-shipments">
      {list.length ? (
        list.map((sh) => {
          const stage = shipmentStage(sh, now);
          const c = cardOf(sh.item);
          return (
            <Panel key={sh.id} style={{ gap: 12 }} testID="shipment">
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Thumb id={c.id} graded={sh.item.graded} tier={sh.item.tier} width={sh.item.graded ? 40 : 46} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{c.name}</Text>
                  <Text style={type.small}>
                    {money(sh.item.value)} · shipped {since(sh.at)}
                  </Text>
                  <Text style={{ color: colors.faint, fontSize: 12, fontVariant: ['tabular-nums'] }}>Tracking {sh.tracking}</Text>
                </View>
                <Text style={[styles.stage, stage === 3 && { color: colors.money }]} testID="shipment-stage">
                  {STAGES[stage]}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`Shipment progress: ${STAGES[stage]}`}>
                {STAGES.map((st, i) => (
                  <View key={st} style={{ flex: 1, gap: 4 }}>
                    <View style={[styles.seg, i <= stage && { backgroundColor: stage === 3 ? colors.money : colors.accentSoft }]} />
                    <Text style={{ color: i <= stage ? colors.label2 : colors.faint, fontSize: 10, fontWeight: '600' }}>{st}</Text>
                  </View>
                ))}
              </View>
              <Text style={type.small}>
                To {sh.address.name}, {sh.address.city}, {sh.address.region} {sh.address.zip} · {sh.address.country === 'US' ? 'United States' : 'Canada'}
              </Text>
            </Panel>
          );
        })
      ) : (
        <Empty icon="truck" title="No shipments yet" body="Open a card in your Vault and tap Ship to send it to your door. US $5 · Canada $10." action={<Button label="Go to Vault" size="sm" onPress={() => go('/vault')} />} />
      )}
      <Text style={[type.small, { textAlign: 'center' }]}>Demo shipments move along on their own every 45 seconds. Nothing is actually sent.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { color: colors.accentSoft, fontWeight: '800', fontSize: 13 },
  seg: { height: 5, borderRadius: 3, backgroundColor: colors.surface2 },
});
