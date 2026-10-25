// Shows the current toast (.toast) above the tab bar, and reads it aloud for
// screen readers.
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dismissToast, useToast } from '../lib/toast';
import { colors } from '../theme';
import { Press } from './ui';

export function Toaster() {
  const current = useToast((s) => s.current);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (current) AccessibilityInfo.announceForAccessibility(current.text);
  }, [current]);
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: insets.bottom + 128 }]}>
      {current ? (
        <Animated.View key={current.id} entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(160)} accessibilityLiveRegion="polite">
          <Press onPress={dismissToast} haptic={false} accessibilityLabel={current.text} testID="toast" style={styles.toast}>
            <Text style={[styles.text, current.tone === 'warn' && { color: colors.gold }]}>{current.text}</Text>
          </Press>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    maxWidth: 360,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.dialog,
    borderWidth: 1,
    borderColor: colors.dialogLine,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  },
  text: { color: colors.label, fontWeight: '600', fontSize: 14, textAlign: 'center' },
});
