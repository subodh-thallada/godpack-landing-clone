// A six-digit code field: one real text input (so paste, autofill and the
// system's one-time-code suggestion all work) drawn as six boxes. A wrong
// code shakes the row; a right one turns it green.
import { type ComponentRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { EASE_IN_OUT, T_COLOR, loop, scaleIn } from '../lib/motion';
import { colors, radius } from '../theme';

export const CODE_LENGTH = 6;

const CARET = loop({ '0%': { opacity: 1 }, '49%': { opacity: 1 }, '50%': { opacity: 0 }, '100%': { opacity: 0 } }, 1000, 'linear');

export type CodeInputHandle = { focus: () => void };

type Props = { value: string; onChange: (v: string) => void; state: 'idle' | 'error' | 'ok'; testID?: string };

export const CodeInput = forwardRef<CodeInputHandle, Props>(function CodeInput({ value, onChange, state, testID }, ref) {
  const reduced = useReducedMotion();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const x = useSharedValue(0);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }), []);

  useEffect(() => {
    if (state !== 'error' || reduced) return;
    const t = { duration: 55, easing: EASE_IN_OUT };
    x.set(withSequence(withTiming(-9, t), withTiming(9, t), withTiming(-6, t), withTiming(6, t), withTiming(0, t)));
  }, [state, reduced, x]);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const active = Math.min(value.length, CODE_LENGTH - 1);
  return (
    <Animated.View style={[styles.row, shake]}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => {
        const digit = value[i];
        const on = focused && i === active && state === 'idle';
        return (
          <Animated.View key={i} style={[styles.cell, T_COLOR, on && styles.cellOn, state === 'ok' && styles.cellOk, state === 'error' && styles.cellError]}>
            {digit ? (
              <Animated.View key={digit} entering={reduced ? undefined : scaleIn}>
                <Text style={styles.digit}>{digit}</Text>
              </Animated.View>
            ) : on ? (
              <Animated.View style={[styles.caret, CARET]} />
            ) : null}
          </Animated.View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={CODE_LENGTH}
        caretHidden
        autoFocus
        accessibilityLabel={`Verification code, ${CODE_LENGTH} digits`}
        testID={testID}
        style={[StyleSheet.absoluteFill, styles.hidden, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null]}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1,
    maxWidth: 54,
    height: 62,
    borderRadius: radius.md - 2,
    borderWidth: 1.5,
    borderColor: colors.fieldLine,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: { borderColor: colors.focus },
  cellOk: { borderColor: colors.money },
  cellError: { borderColor: colors.danger },
  digit: { color: colors.text, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  caret: { width: 2, height: 26, borderRadius: 1, backgroundColor: colors.focus },
  hidden: { opacity: 0.012, color: 'transparent', fontSize: 16 },
});
