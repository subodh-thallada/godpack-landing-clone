// Odds for a pack, shown before you open it (full and Safe mode tables).
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, Sheet } from '../src/components/ui';
import { packById } from '../src/data';
import { money } from '../src/lib/format';
import { colors, radius, tierColor, type } from '../src/theme';

const TIER_NAME = { common: 'Common', core: 'Core', hit: 'Hit', chase: 'Chase', grail: 'Grail' } as const;

export default function Odds() {
  const p = useLocalSearchParams<{ pack: string; safe?: string }>();
  const pack = packById(p.pack);
  const [safe, setSafe] = useState(p.safe === '1');
  const rows = safe ? pack.safeOdds : pack.odds;
  const max = Math.max(...rows.map((r) => r[3]));
  return (
    <Sheet title={`${pack.name} odds`} testID="odds-sheet">
      <Text style={type.body}>
        Every pull is drawn from these ranges. {pack.slabs ? 'This pack pulls graded slabs.' : 'This pack pulls raw cards.'} Odds are the same for everyone.
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Standard" on={!safe} onPress={() => setSafe(false)} testID="odds-standard" />
        <Chip label="Safe mode" on={safe} onPress={() => setSafe(true)} icon="shield" testID="odds-safe" />
      </View>
      <View style={styles.table}>
        <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
          <Text style={[styles.head, { flex: 1 }]}>Tier</Text>
          <Text style={[styles.head, { flex: 1.6 }]}>Value</Text>
          <Text style={[styles.head, { width: 70, textAlign: 'right' }]}>Chance</Text>
        </View>
        {rows.map(([tier, lo, hi, chance], i) => (
          <View key={i} style={styles.row} testID="odds-row">
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.dot, { backgroundColor: tierColor[tier] }]} />
              <Text style={{ color: colors.text, fontWeight: '700' }}>{TIER_NAME[tier]}</Text>
            </View>
            <Text style={[styles.cell, { flex: 1.6 }]}>
              {money(lo)} – {money(hi, { compact: true })}
            </Text>
            <View style={{ width: 70, alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.cell, { fontWeight: '800', color: colors.text }]}>{chance}%</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(chance / max) * 100}%`, backgroundColor: tierColor[tier] }]} />
              </View>
            </View>
          </View>
        ))}
      </View>
      <Text style={type.small}>
        {safe ? 'Safe mode trims the lowest outcomes and keeps the same top prizes. ' : ''}Range: {money((safe ? pack.safeRange : pack.range)[0])} – {money((safe ? pack.safeRange : pack.range)[1], { compact: true })}. Demo odds, no real money.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  table: { borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  head: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  cell: { color: colors.label2, fontVariant: ['tabular-nums'], fontWeight: '600', fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  track: { width: 60, height: 4, borderRadius: 2, backgroundColor: colors.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
