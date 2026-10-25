// Vault: the cards you own, as on the website — stats with Sell all, search,
// Graded / Raw filters, sorting, a select mode with a sell tray, and tiles
// with their auto-sell timers. Tap a card to sell or ship it.
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { T_SETTLE, fadeIn, scaleIn, sheetIn, sheetOut } from '../../src/lib/motion';
import { Icon } from '../../src/components/Icon';
import { Thumb } from '../../src/components/Thumb';
import { Button, Chip, Empty, Press, Stat, ViewHead } from '../../src/components/ui';
import { money, plural } from '../../src/lib/format';
import { success, tap } from '../../src/lib/haptics';
import { toast } from '../../src/lib/toast';
import { SELL_RATE, type VaultItem, cardOf, saleTimer, sell, useSession, vaultValue } from '../../src/store/session';
import { colors, radius } from '../../src/theme';

const SORTS = ['Recent', 'Value: high to low', 'Value: low to high', 'Name'] as const;
type Sort = (typeof SORTS)[number];

export default function Vault() {
  const s = useSession((x) => x.s);
  const { width: W } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'graded' | 'raw'>('all');
  const [sort, setSort] = useState<Sort>('Recent');
  const [sortOpen, setSortOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmAll, setConfirmAll] = useState(false);

  const list = useMemo(() => {
    let l = (s?.vault ?? []).slice();
    if (filter !== 'all') l = l.filter((v) => (filter === 'graded' ? v.graded : !v.graded));
    const q = query.trim().toLowerCase();
    if (q) l = l.filter((v) => cardOf(v).name.toLowerCase().includes(q));
    if (sort === 'Value: high to low') l.sort((a, b) => b.value - a.value);
    if (sort === 'Value: low to high') l.sort((a, b) => a.value - b.value);
    if (sort === 'Name') l.sort((a, b) => cardOf(a).name.localeCompare(cardOf(b).name));
    return l;
  }, [s, filter, query, sort]);

  const tileW = (Math.min(W, 520) - 32 - 12) / 2;
  const chosen = (s?.vault ?? []).filter((v) => selected.includes(v.uid));
  const chosenValue = chosen.reduce((sum, v) => sum + v.value, 0) * SELL_RATE;

  const toggleSelect = (on: boolean) => {
    setSelecting(on);
    setSelected([]);
  };
  const press = (v: VaultItem) => {
    if (!selecting) return router.push(`/card/${v.uid}`);
    tap();
    setSelected((x) => (x.includes(v.uid) ? x.filter((u) => u !== v.uid) : [...x, v.uid]));
  };

  const header = (
    <View style={{ gap: 16, paddingBottom: 14 }}>
      <ViewHead title="Vault" sub="Sell or ship the cards you own. Cards you leave unclaimed auto-sell after 7 days." />
      <View style={styles.stats}>
        <Stat label="Cards" value={s?.vault.length ?? 0} testID="vault-count" />
        <Stat label="Vault value" value={money(vaultValue(s))} money />
        <View style={{ flex: 1 }} />
        <Button label="Sell all" icon="cash" variant="secondary" disabled={!s?.vault.length} onPress={() => setConfirmAll(true)} testID="vault-sell-all" />
      </View>
      {confirmAll && s ? (
        <Animated.View entering={fadeIn} style={styles.confirm} testID="confirm-sell-all">
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Sell all {plural(s.vault.length, 'card')}?</Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>You'll get {money(vaultValue(s) * SELL_RATE)} after the 5% sell-back fee.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Button label="Cancel" variant="secondary" onPress={() => setConfirmAll(false)} style={{ flex: 1 }} />
            <Button
              label="Sell all"
              onPress={() => {
                const got = sell(s.vault.map((v) => v.uid));
                success();
                toast(`Sold everything for ${money(got)}`);
                setConfirmAll(false);
              }}
              style={{ flex: 1 }}
              testID="confirm-sell-all-yes"
            />
          </View>
        </Animated.View>
      ) : null}
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search your cards" placeholderTextColor={colors.faint} style={styles.searchInput} accessibilityLabel="Search your cards" testID="vault-search" selectionColor={colors.focus} />
        {query ? (
          <Press onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={10} style={{ padding: 4 }}>
            <Icon name="close" size={16} color={colors.muted} />
          </Press>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Chip label="All" on={filter === 'all'} onPress={() => setFilter('all')} testID="vault-all" />
        <Chip label="Graded" on={filter === 'graded'} onPress={() => setFilter('graded')} testID="vault-graded" />
        <Chip label="Raw" on={filter === 'raw'} onPress={() => setFilter('raw')} testID="vault-raw" />
        <View style={{ flex: 1 }} />
        <Press onPress={() => (s?.vault.length ? toggleSelect(!selecting) : toast('Your Vault is empty'))} style={[styles.select, selecting && { backgroundColor: colors.control }]} testID="vault-select" accessibilityLabel={selecting ? 'Done selecting' : 'Select cards'}>
          <Icon name="check" size={15} color={selecting ? colors.text : colors.muted} />
          <Text style={{ color: selecting ? colors.text : colors.muted, fontSize: 13, fontWeight: '600' }}>{selecting ? 'Done' : 'Select'}</Text>
        </Press>
      </View>
      <View>
        <Press onPress={() => setSortOpen((o) => !o)} style={styles.sort} testID="vault-sort" accessibilityLabel={`Sort: ${sort}`} accessibilityState={{ expanded: sortOpen }}>
          <Text style={styles.sortLabel}>Sort</Text>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, flex: 1 }}>{sort}</Text>
          <Animated.View style={[T_SETTLE, { transform: [{ rotate: sortOpen ? '180deg' : '0deg' }] }]}>
            <Icon name="chevronDown" size={16} color={colors.muted} />
          </Animated.View>
        </Press>
        {sortOpen ? (
          <Animated.View entering={scaleIn} style={[styles.menu, { transformOrigin: 'top' }]}>
            {SORTS.map((o) => (
              <Press
                key={o}
                onPress={() => {
                  setSort(o);
                  setSortOpen(false);
                }}
                style={[styles.menuRow, o === sort && { backgroundColor: colors.control }]}
                accessibilityState={{ selected: o === sort }}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{o}</Text>
              </Press>
            ))}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }} testID="screen-vault">
      <FlatList
        data={list}
        keyExtractor={(v) => v.uid}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: selecting ? 110 : 32, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Empty
            icon="vault"
            title={s?.vault.length ? 'No cards match' : 'Your Vault is empty'}
            body={s?.vault.length ? 'Try a different search or filter.' : 'Open a pack and the cards you keep land here.'}
            action={!s?.vault.length ? <Button label="Open a pack" size="sm" onPress={() => router.navigate('/packs')} /> : undefined}
          />
        }
        renderItem={({ item: v }) => {
          const c = cardOf(v);
          const on = selected.includes(v.uid);
          return (
            // No entrance per tile: rows are recycled as you scroll, so it would
            // replay every time one comes back into view.
            <View>
              <Press
                onPress={() => press(v)}
                accessibilityLabel={`${c.name}, ${money(v.value)}${selecting && on ? ', selected' : ''}`}
                accessibilityState={{ selected: on }}
                style={[styles.tile, { width: tileW }, on && styles.tileOn]}
                testID="vault-tile"
              >
                <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.01)']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.art, { height: tileW * 1.25 }]}>
                  <Thumb id={c.id} graded={v.graded} tier={v.tier} width={v.graded ? tileW * 0.52 : tileW * 0.6} />
                </LinearGradient>
                <Text style={styles.timer}>{saleTimer(v)}</Text>
                {selecting ? <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="check" size={12} color="#fff" stroke={3} /> : null}</View> : null}
                <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, gap: 2 }}>
                  <Text style={styles.value}>{money(v.value)}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                </View>
              </Press>
            </View>
          );
        }}
      />
      {selecting ? (
        <Animated.View entering={sheetIn} exiting={sheetOut} style={styles.tray} testID="sell-tray">
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] }} testID="selected-count">
              {selected.length} selected
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>5% sell-back fee</Text>
          </View>
          <Button
            label={`Sell for ${money(chosenValue, { compact: true })}`}
            icon="cash"
            disabled={!selected.length}
            onPress={() => {
              const got = sell(selected);
              success();
              toast(`Sold ${plural(selected.length, 'card')} for ${money(got)}`);
              toggleSelect(false);
            }}
            testID="sell-selected"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', alignItems: 'center', gap: 28, padding: 18, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  confirm: { gap: 6, padding: 16, borderRadius: radius.md, backgroundColor: colors.dialog, borderWidth: 1, borderColor: colors.dialogLine },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.fieldLine },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, height: '100%' },
  select: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 12, borderRadius: radius.sm },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface2 },
  sortLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  menu: { marginTop: 6, padding: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.dialogLine, backgroundColor: colors.dialog },
  menuRow: { padding: 10, borderRadius: radius.sm },
  tile: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden' },
  tileOn: { borderColor: colors.accentSoft },
  art: { alignItems: 'center', justifyContent: 'center' },
  timer: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface2, color: colors.muted, fontSize: 11, fontWeight: '600', overflow: 'hidden', fontVariant: ['tabular-nums'] },
  check: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.fieldLine, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  value: { color: colors.money, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  name: { color: colors.text, fontSize: 14, fontWeight: '600' },
  tray: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.dialog, borderWidth: 1, borderColor: colors.dialogLine, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' },
});
