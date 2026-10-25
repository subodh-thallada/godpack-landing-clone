// Haptic feedback, quietly skipped where the platform has none (web).
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS === 'ios' || Platform.OS === 'android';

export const tap = () => {
  if (on) Haptics.selectionAsync().catch(() => {});
};
export const bump = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (!on) return;
  const s = { light: Haptics.ImpactFeedbackStyle.Light, medium: Haptics.ImpactFeedbackStyle.Medium, heavy: Haptics.ImpactFeedbackStyle.Heavy }[style];
  Haptics.impactAsync(s).catch(() => {});
};
export const success = () => {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
export const warn = () => {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
