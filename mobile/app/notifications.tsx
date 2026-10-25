// Notifications: pulls, battles, shipments, followers and money movements.
// Opening this marks them read; each one links to where it happened.
import { go } from '../src/lib/nav';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { staggered } from '../src/lib/motion';
import { Icon, type IconName } from '../src/components/Icon';
import { Empty, Press, Screen } from '../src/components/ui';
import { since } from '../src/lib/format';
import { markRead, useSession } from '../src/store/session';
import { colors, radius } from '../src/theme';

function iconFor(title: string): IconName {
  if (/battle/i.test(title)) return 'battles';
  if (/ship|deliver/i.test(title)) return 'truck';
  if (/follow/i.test(title)) return 'feed';
  if (/withdraw|credit|sold/i.test(title)) return 'cash';
  if (/pull/i.test(title)) return 'sparkles';
  return 'bell';
}

export default function Notifications() {
  const s = useSession((x) => x.s);
  const list = s?.notifications ?? [];
  useEffect(() => {
    // Read once you've seen them; leave a moment so the unread dots show.
    const t = setTimeout(() => markRead(), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <Screen title="Notifications" testID="screen-notifications">
      {list.length ? (
        list.map((n, i) => (
          <Animated.View key={n.id} entering={staggered(i)}>
            <Press onPress={() => go(n.href)} accessibilityLabel={`${n.title}. ${n.body}`} style={[styles.row, !n.read && { borderColor: 'rgba(157,133,255,0.45)' }]} testID="notification">
              <View style={styles.icon}>
                <Icon name={iconFor(n.title)} size={18} color={colors.accentSoft} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{n.title}</Text>
                <Text style={{ color: colors.label2, fontSize: 13 }}>{n.body}</Text>
                <Text style={{ color: colors.faint, fontSize: 11, marginTop: 2 }}>{since(n.at)}</Text>
              </View>
              {!n.read ? <View style={styles.dot} /> : null}
            </Press>
          </Animated.View>
        ))
      ) : (
        <Empty icon="bell" title="You're all caught up" body="Pulls, battles, shipments and new followers show up here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, alignItems: 'flex-start' },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(121,84,237,0.16)', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accentSoft, marginTop: 6 },
});
