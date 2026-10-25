// Shared building blocks, styled to match the web app's components
// (.btn, .chip, .panel, .surface, .field, .switch, .icon-btn, .dialog).
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  type PressableProps,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, SlideInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '../lib/haptics';
import { colors, radius, type } from '../theme';
import { Icon, type IconName } from './Icon';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const web = Platform.OS === 'web';
const cursor = web ? ({ cursor: 'pointer' } as ViewStyle) : null;

type PressProps = PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean; children?: ReactNode };

// A pressable that eases down a little while held (.btn:active scale .98).
export function Press({ style, scaleTo = 0.98, haptic = true, onPressIn, onPressOut, onPress, disabled, children, ...rest }: PressProps) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityState={{ disabled: !!disabled, ...(rest.accessibilityState ?? {}) }}
      onPressIn={(e) => {
        s.value = withTiming(scaleTo, { duration: 80 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 16, stiffness: 300 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={[cursor, style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'buy' | 'light' | 'gold' | 'danger';

const VARIANT: Record<Variant, { box: ViewStyle; fg: string }> = {
  primary: { box: { backgroundColor: colors.primary, borderRadius: radius.sm }, fg: '#fff' },
  secondary: { box: { backgroundColor: colors.control, borderColor: colors.controlLine, borderWidth: 1, borderRadius: radius.sm }, fg: colors.label },
  ghost: { box: { backgroundColor: 'transparent', borderRadius: radius.sm }, fg: colors.muted },
  buy: { box: { backgroundColor: colors.primary, borderRadius: 12 }, fg: '#fff' },
  light: { box: { backgroundColor: '#f4f2f8', borderRadius: radius.pill }, fg: '#0b0a0e' },
  gold: { box: { backgroundColor: colors.gold, borderRadius: radius.sm }, fg: '#1a1206' },
  danger: { box: { backgroundColor: 'transparent', borderColor: 'rgba(255,92,122,0.45)', borderWidth: 1, borderRadius: radius.sm }, fg: colors.danger },
};

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  left?: ReactNode;
};

export function Button({ label, onPress, variant = 'primary', size = 'md', icon, iconRight, disabled, loading, style, testID, accessibilityLabel, left }: ButtonProps) {
  const v = VARIANT[variant];
  const buy = variant === 'buy';
  const h = buy ? 52 : variant === 'light' ? 54 : size === 'sm' ? 36 : 46;
  const fs = buy ? 18 : size === 'sm' ? 13 : 15;
  return (
    <Press
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={size === 'sm' ? 6 : undefined}
      style={[styles.btn, v.box, { minHeight: h, paddingHorizontal: size === 'sm' ? 14 : 18 }, (disabled || loading) && { opacity: 0.45 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {left}
          {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 18} color={v.fg} /> : null}
          <Text numberOfLines={1} style={{ color: v.fg, fontSize: fs, fontWeight: buy ? '700' : '600' }}>
            {label}
          </Text>
          {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 15 : 17} color={v.fg} /> : null}
        </>
      )}
    </Press>
  );
}

// .chip — the active chip is white with dark text.
export function Chip({ label, on, onPress, testID, icon }: { label: string; on?: boolean; onPress?: () => void; testID?: string; icon?: IconName }) {
  return (
    <Press testID={testID} onPress={onPress} hitSlop={6} accessibilityState={{ selected: !!on }} style={[styles.chip, on && styles.chipOn]}>
      {icon ? <Icon name={icon} size={14} color={on ? '#0b0a12' : colors.label2} /> : null}
      <Text style={[styles.chipText, on && { color: '#0b0a12' }]}>{label}</Text>
    </Press>
  );
}

// .panel and .surface
export function Panel({ children, style, testID, surface }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string; surface?: boolean }) {
  return (
    <View testID={testID} style={[surface ? styles.surface : styles.panel, style]}>
      {children}
    </View>
  );
}

export function Avatar({ handle, color, size = 32 }: { handle: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: Math.max(10, size * 0.42) }}>{(handle[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

export function T({ children, style, variant = 'body', numberOfLines, testID }: { children: ReactNode; style?: StyleProp<TextStyle>; variant?: keyof typeof type; numberOfLines?: number; testID?: string }) {
  return (
    <Text testID={testID} numberOfLines={numberOfLines} style={[type[variant], style]}>
      {children}
    </Text>
  );
}

// .field
export function Field({ label, error, style, onFocus, onBlur, ...props }: TextInputProps & { label?: string; error?: string | null }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6 }, style as StyleProp<ViewStyle>]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        accessibilityLabel={label}
        selectionColor={colors.focus}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.field, focused && styles.fieldFocus, error ? { borderColor: colors.danger } : null, web ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null]}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '500' }}>{error}</Text> : null}
    </View>
  );
}

// .switch — a native switch in the website's colours.
export function Toggle({ value, onChange, label, testID }: { value: boolean; onChange: (v: boolean) => void; label: string; testID?: string }) {
  return (
    <Switch
      testID={testID}
      accessibilityLabel={label}
      value={value}
      onValueChange={(v) => {
        tap();
        onChange(v);
      }}
      trackColor={{ false: colors.switchOff, true: colors.switchOn }}
      thumbColor={Platform.OS === 'android' ? (value ? '#fff' : colors.label2) : undefined}
      ios_backgroundColor={colors.switchOff}
    />
  );
}

// .view-title-row h1 (+ .view-sub)
export function ViewHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <View style={{ gap: 8, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[type.title, { flex: 1 }]} accessibilityRole="header">
          {title}
        </Text>
        {right}
      </View>
      {sub ? <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, fontWeight: '500' }}>{sub}</Text> : null}
    </View>
  );
}

// .section-head .shine-head
export function SectionHead({ icon, title, right, gold }: { icon?: IconName; title: string; right?: ReactNode; gold?: boolean }) {
  const c = gold ? colors.gold : colors.head;
  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon ? <Icon name={icon} size={21} color={c} /> : null}
        <Text style={[type.h2, { color: c }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export const Caps = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[type.caps, style]}>{children}</Text>;

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={28} color={colors.faint} />
      <Text style={[type.h3, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.small, { textAlign: 'center', maxWidth: 300 }]}>{body}</Text>
      {action}
    </View>
  );
}

// .icon-btn; "outline" is the round bordered button the header uses.
export function IconButton({ name, onPress, label, testID, badge, outline }: { name: IconName; onPress: () => void; label: string; testID?: string; badge?: number; outline?: boolean }) {
  return (
    <Press testID={testID} accessibilityLabel={label} onPress={onPress} scaleTo={0.94} style={[styles.iconBtn, outline && styles.iconBtnOutline]}>
      <Icon name={name} size={20} color={colors.label} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Press>
  );
}

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/packs'));

// A pushed screen: back button, inline title, scrolling body, optional footer.
export function Screen({ title, children, right, scroll = true, testID, footer }: { title: string; children: ReactNode; right?: ReactNode; scroll?: boolean; testID?: string; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView testID={testID} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.screenHead, { paddingTop: insets.top + 4 }]}>
        <IconButton name="chevronLeft" label="Back" testID="back" onPress={goBack} />
        <Text style={styles.screenTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: (footer ? 16 : insets.bottom + 32), gap: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

// A bottom sheet over the current screen (.dialog), with a text Close like
// the website's dialogs. Tapping the dimmed backdrop also closes it.
export function Sheet({ title, children, testID, onClose, scroll = true, closeLabel = 'Close' }: { title: string; children: ReactNode; testID?: string; onClose?: () => void; scroll?: boolean; closeLabel?: string }) {
  const insets = useSafeAreaInsets();
  const close = onClose ?? goBack;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}>
        <Pressable accessibilityLabel="Dismiss" style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap} pointerEvents="box-none">
        <Animated.View testID={testID} entering={SlideInDown.duration(280)} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
          <View style={styles.grab} />
          <View style={styles.sheetHead}>
            <Text style={[type.h3, { flex: 1, fontSize: 20 }]} accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
            <Press onPress={close} testID="sheet-close" accessibilityLabel={closeLabel} hitSlop={10} style={{ paddingVertical: 6, paddingLeft: 12 }}>
              <Text style={{ color: colors.accentSoft, fontWeight: '600', fontSize: 15 }}>{closeLabel}</Text>
            </Press>
          </View>
          {scroll ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 14 }}>{children}</View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function Row({ children, style, gap = 10 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }} />;
}

// .stat — "center" lays several out evenly in a row (profile stats).
export function Stat({ label, value, money, center, testID }: { label: string; value: number | string; money?: boolean; center?: boolean; testID?: string }) {
  return (
    <View style={[{ gap: 2 }, center && { flex: 1, alignItems: 'center' }]}>
      <Text style={type.caps}>{label}</Text>
      <Text testID={testID} style={{ color: money ? colors.money : colors.text, fontWeight: '700', fontSize: center ? 20 : 26, letterSpacing: -0.4, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.label, borderColor: colors.label },
  chipText: { color: colors.label2, fontWeight: '600', fontSize: 13 },
  panel: { backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.panelLine, padding: 20 },
  surface: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 16 },
  fieldLabel: { color: colors.label2, fontSize: 13, fontWeight: '600' },
  field: { minHeight: 46, borderRadius: radius.field, borderWidth: 1, borderColor: colors.fieldLine, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 14, fontSize: 16 },
  fieldFocus: { borderColor: colors.focus },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 20 },
  iconBtn: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  iconBtnOutline: { borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  screenHead: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 6, backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  screenTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 17, fontWeight: '700' },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: colors.dialog, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.dialogLine },
  grab: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong, marginTop: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
});
