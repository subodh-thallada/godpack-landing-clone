// The bottom tab bar, using the website's nav icons and active marker (a
// rounded square behind the icon), with the Global Chat dock above it.
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { plural } from '../lib/format';
import { EASE_OUT } from '../lib/motion';
import { usePulse } from './Curtain';
import { pendingForMe } from '../store/market';
import { openBattles, useSession } from '../store/session';
import { colors, radius } from '../theme';
import { Icon, type IconName } from './Icon';
import { TourTarget } from './Tour';
import { Press } from './ui';

export const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'packs', label: 'Packs', icon: 'packs' },
  { name: 'battles', label: 'Battles', icon: 'battles' },
  { name: 'market', label: 'Market', icon: 'market' },
  { name: 'vault', label: 'Vault', icon: 'vault' },
  { name: 'feed', label: 'Feed', icon: 'feed' },
  { name: 'rewards', label: 'Rewards', icon: 'rewards' },
];

export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const s = useSession((x) => x.s);
  const counts: Record<string, { n: number; accent: boolean }> = {
    battles: { n: openBattles(s).length, accent: true },
    market: { n: pendingForMe(s?.market), accent: true },
    vault: { n: s?.vault.length ?? 0, accent: false },
  };
  return (
    <View style={styles.wrap}>
      <ChatDock />
      <View style={[styles.row, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
          const on = state.index === i;
          const count = counts[tab.name];
          return (
            <TourTarget key={route.key} id={`tab-${tab.name}`} style={{ flex: 1 }}>
              <Press
                testID={`tab-${tab.name}`}
                accessibilityRole="tab"
                accessibilityLabel={count?.n ? `${tab.label}, ${count.n}` : tab.label}
                accessibilityState={{ selected: on }}
                scaleTo={0.94}
                onPress={() => {
                  const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!on && !e.defaultPrevented) navigateToTab(route.key);
                }}
                style={styles.tab}
              >
                <View style={[styles.marker, on && styles.markerOn]}>
                  {tab.name === 'vault' ? <VaultIcon color={on ? colors.navOn : colors.nav} /> : <Icon name={tab.icon} size={21} color={on ? colors.navOn : colors.nav} />}
                  {count?.n ? (
                    <View style={[styles.count, count.accent ? styles.countAccent : null]}>
                      <Text style={[styles.countText, count.accent ? { color: '#fff' } : null]}>{count.n > 99 ? '99+' : count.n}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.label, on && { color: colors.navOn }]}>{tab.label}</Text>
              </Press>
            </TourTarget>
          );
        })}
      </View>
    </View>
  );
}

// The Vault icon pops when a card lands in it (the end of onboarding).
function VaultIcon({ color }: { color: string }) {
  const pulse = usePulse((p) => p.vault);
  const s = useSharedValue(1);
  useEffect(() => {
    if (!pulse) return;
    // A once-only catch, so it's allowed a real bounce.
    s.set(withSequence(withTiming(1.35, { duration: 120, easing: EASE_OUT }), withSpring(1, { duration: 450, dampingRatio: 0.4 })));
  }, [pulse, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return (
    <Animated.View style={style}>
      <Icon name="vault" size={21} color={color} />
    </Animated.View>
  );
}

// The collapsed Global Chat dock from the website.
function ChatDock() {
  const s = useSession((x) => x.s);
  const unread = s ? s.chat.filter((m) => m.at > s.chatSeen && !m.mine).length : 0;
  return (
    <Press onPress={() => router.push('/chat')} accessibilityLabel={unread ? `Global chat, ${plural(unread, 'new message')}` : 'Global chat'} testID="chat-dock" style={styles.dock} scaleTo={0.99}>
      <Icon name="grip" size={14} color={colors.faint} />
      <Text style={styles.dockTitle}>Global Chat</Text>
      {unread ? (
        <View style={styles.dockCount}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{unread}</Text>
        </View>
      ) : null}
      <View style={styles.dot} />
      <Text style={styles.online}>{22 + ((s?.chat.length ?? 0) % 7)} online</Text>
      <View style={{ flex: 1 }} />
      <Icon name="chevronUp" size={18} color={colors.label2} />
    </Press>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  row: { flexDirection: 'row', paddingTop: 6, paddingHorizontal: 6 },
  tab: { alignItems: 'center', gap: 2 },
  marker: { width: 52, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  markerOn: { backgroundColor: colors.control },
  label: { color: colors.nav, fontSize: 10.5, fontWeight: '600' },
  count: { position: 'absolute', top: -3, right: 4, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  countAccent: { backgroundColor: colors.primary },
  countText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  dock: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 10, marginTop: 8, height: 44, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  dockTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  dockCount: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.online, marginLeft: 2 },
  online: { color: colors.label2, fontSize: 13, fontWeight: '500' },
});
