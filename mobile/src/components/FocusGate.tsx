// On the web, react-navigation keeps unfocused tabs mounted and only puts
// them behind the focused one, so screen readers (and tests) can still reach
// them. Hide them properly there; native already detaches inactive screens.
import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';

export function FocusGate({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, display: focused ? 'flex' : 'none' }} aria-hidden={!focused}>
      {children}
    </View>
  );
}
