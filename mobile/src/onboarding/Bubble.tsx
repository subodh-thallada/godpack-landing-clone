// Pip's speech bubble. Each new line arrives a word at a time: a short
// stagger that runs on the UI thread, so nothing re-renders while it plays.
// Screen readers get the whole line at once.
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { EASE_OUT, fadeIn } from '../lib/motion';
import { colors } from '../theme';

const WORD_STEP = 26;

export const Bubble = memo(function Bubble({ text, testID }: { text: string; testID?: string }) {
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(' '), [text]);
  return (
    <Animated.View key={text} entering={fadeIn} style={styles.wrap}>
      <View style={styles.tail} />
      <View accessible accessibilityRole="text" accessibilityLabel={text} testID={testID} style={styles.bubble}>
        {words.map((w, i) => (
          <Animated.Text key={i} entering={reduced ? undefined : FadeIn.delay(i * WORD_STEP).duration(140).easing(EASE_OUT)} style={styles.text}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </Animated.Text>
        ))}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center' },
  bubble: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderTopLeftRadius: 6, backgroundColor: colors.dialog, borderWidth: 1, borderColor: colors.dialogLine },
  tail: { position: 'absolute', left: -5, top: 14, width: 12, height: 12, backgroundColor: colors.dialog, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: colors.dialogLine, transform: [{ rotate: '45deg' }] },
  text: { color: colors.label, fontSize: 15, lineHeight: 21, fontWeight: '500' },
});
