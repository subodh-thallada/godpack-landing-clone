// Sign-up as a sheet over the scene, so the card you just pulled stays in
// view above it. It can't be dismissed (this is the step), so dragging it
// rubber-bands and it springs home with the finger's velocity.
import { type ReactNode, useMemo } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bump } from '../lib/haptics';
import { SNAP, rubberband, sheetIn, sheetOut } from '../lib/motion';
import { colors, radius, type } from '../theme';

type Props = {
  title: string;
  sub?: string;
  children: ReactNode;
  footnote?: string;
  onHeight?: (h: number) => void;
  testID?: string;
};

export function AuthSheet({ title, sub, children, footnote, onHeight, testID }: Props) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const start = useSharedValue(0);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .onStart(() => {
          start.set(y.get());
        })
        .onUpdate((e) => {
          y.set(rubberband(start.get() + e.translationY, 300));
        })
        .onEnd((e) => {
          const moved = Math.abs(y.get()) > 8;
          y.set(withSpring(0, { ...SNAP, velocity: e.velocityY }));
          if (moved) scheduleOnRN(bump, 'light');
        }),
    [y, start],
  );
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    // The entrance and the drag live on separate views so their transforms
    // never fight.
    <Animated.View
      entering={sheetIn}
      exiting={sheetOut}
      style={styles.dock}
      onLayout={(e: LayoutChangeEvent) => onHeight?.(e.nativeEvent.layout.height)}
    >
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 }, style]}
          accessibilityViewIsModal
          testID={testID}
        >
          <View style={styles.grab} />
          <View style={{ gap: 6 }}>
            <Text style={[type.title, { fontSize: 26 }]} accessibilityRole="header">
              {title}
            </Text>
            {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          </View>
          {children}
          {footnote ? <Text style={[type.small, { textAlign: 'center' }]}>{footnote}</Text> : null}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: colors.dialog,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.dialogLine,
    boxShadow: '0 -16px 40px rgba(0,0,0,0.45)',
  },
  grab: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.lineStrong,
    marginBottom: 2,
  },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 21, fontWeight: '500' },
});
