// The notification primer's preview: a phone's lock screen where three
// notifications arrive one after another and stack, newest in front, the way
// they will on your own phone. The newest is about the card you just pulled.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, type IconName, Mark } from '../components/Icon';
import { Thumb } from '../components/Thumb';
import { DUR, EASE_OUT, T_SETTLE } from '../lib/motion';
import { colors, type Tier } from '../theme';

type Note = { title: string; body: string; when: string; icon?: IconName };

const arrive = FadeInUp.duration(DUR.ui + 60).easing(EASE_OUT);

export function PhoneMock({ top, short, card }: { top: number; short: boolean; card: { id: string; tier: Tier; name?: string } | null }) {
  const { width: W } = useWindowDimensions();
  const reduced = useReducedMotion();
  const notes: Note[] = [
    { title: 'Battle joined', body: '@kai joined your Arena battle. 2 seats left.', when: '2m ago', icon: 'battles' },
    { title: 'Daily check-in', body: 'Your free spin is ready. Keep the streak going.', when: '1m ago', icon: 'flame' },
    { title: 'Your card shipped', body: `${card?.name ?? 'Your pull'} is on its way. Arriving Thursday.`, when: 'now' },
  ];
  const [count, setCount] = useState(reduced ? notes.length : 0);

  useEffect(() => {
    if (reduced) return;
    const ids = [500, 1250, 2000].map((t, i) => setTimeout(() => setCount(i + 1), t));
    return () => ids.forEach(clearTimeout);
  }, [reduced]);

  const pw = Math.min(W * 0.66, 270);
  const ph = short ? 196 : 232;
  return (
    <View style={[styles.phone, { top, left: (W - pw) / 2, width: pw, height: ph }]} testID="ob-phone" accessibilityLabel="Preview of Godpack notifications on a lock screen">
      <View style={styles.island} />
      <Text style={styles.date}>Saturday 25 October</Text>
      <Text style={[styles.time, short && { fontSize: 38, lineHeight: 42 }]}>9:41</Text>
      <View style={{ alignSelf: 'stretch', height: 84, marginTop: short ? 4 : 8 }}>
        {notes.slice(0, count).map((n, i) => {
          // 0 is the newest, in front; older ones tuck behind it.
          const depth = count - 1 - i;
          return (
            <Animated.View key={n.title} entering={arrive} style={[styles.noteWrap, { zIndex: 10 - depth }]}>
              <Animated.View style={[styles.note, T_SETTLE, { opacity: depth === 0 ? 1 : depth === 1 ? 0.7 : 0.4, transform: [{ translateY: depth * 9 }, { scale: 1 - depth * 0.06 }] }]}>
                <View style={styles.app}>
                  <Mark size={18} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={styles.title} numberOfLines={1}>
                      {n.title}
                    </Text>
                    <Text style={styles.when}>{n.when}</Text>
                  </View>
                  <Text style={styles.body} numberOfLines={2}>
                    {n.body}
                  </Text>
                </View>
                {n.icon ? (
                  <Icon name={n.icon} size={16} color={colors.muted} />
                ) : card ? (
                  <Thumb id={card.id} graded tier={card.tier} width={22} glow={false} />
                ) : null}
              </Animated.View>
            </Animated.View>
          );
        })}
      </View>
      <LinearGradient colors={['rgba(16,16,20,0)', colors.bg]} style={styles.fade} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  phone: { position: 'absolute', alignItems: 'center', paddingTop: 12, paddingHorizontal: 10, borderTopLeftRadius: 38, borderTopRightRadius: 38, borderWidth: 2, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: '#15131b', overflow: 'hidden' },
  island: { width: 72, height: 20, borderRadius: 10, backgroundColor: '#000' },
  date: { marginTop: 10, color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  time: { color: '#fff', fontSize: 46, lineHeight: 50, fontWeight: '700', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  noteWrap: { position: 'absolute', left: 0, right: 0, top: 0 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(52,48,64,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  app: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  title: { flexShrink: 1, color: '#fff', fontSize: 13, fontWeight: '700' },
  when: { marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500' },
  body: { color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 16 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 },
});
