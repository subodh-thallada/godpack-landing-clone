// Root: providers, the stored state gate, background activity, toasts and
// the tour overlay above every screen.
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Curtain } from '../src/components/Curtain';
import { DataToggle } from '../src/dev/fixtures';
import { Toaster } from '../src/components/Toaster';
import { TourOverlay } from '../src/components/Tour';
import { useWorld } from '../src/lib/world';
import { usePrefs } from '../src/store/prefs';
import { autoSell, useSession } from '../src/store/session';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useHydrated() {
  const [ready, setReady] = useState(() => useSession.persist.hasHydrated() && usePrefs.persist.hasHydrated());
  useEffect(() => {
    const check = () => setReady(useSession.persist.hasHydrated() && usePrefs.persist.hasHydrated());
    const a = useSession.persist.onFinishHydration(check);
    const b = usePrefs.persist.onFinishHydration(check);
    check();
    return () => {
      a();
      b();
    };
  }, []);
  return ready;
}

const sheet = { presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } } as const;

export default function RootLayout() {
  const ready = useHydrated();
  const signedIn = useSession((x) => !!x.s);
  const onboarded = usePrefs((p) => p.onboarded);
  // Pushes use the platform's own transition; reduced motion makes them fades.
  const reduced = useReducedMotion();
  useWorld(ready && signedIn);

  useEffect(() => {
    if (!ready) return;
    autoSell();
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {ready ? (
          <View style={{ flex: 1, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' } : null) }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: reduced ? 'fade' : 'default' }}>
              <Stack.Screen name="index" options={{ animation: 'none' }} />
              {/* Each part of the app is only reachable in the right state, so a
                  deep link can't skip onboarding or sign-in, or reset an account. */}
              <Stack.Protected guard={!signedIn && !onboarded}>
                <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
              </Stack.Protected>
              <Stack.Protected guard={!signedIn && onboarded}>
                <Stack.Screen name="signin" options={{ animation: 'fade', gestureEnabled: false }} />
              </Stack.Protected>
              <Stack.Protected guard={signedIn}>
                <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="open" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: '#000' } }} />
                <Stack.Screen name="replay" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
                <Stack.Screen name="wallet" options={sheet} />
                <Stack.Screen name="odds" options={sheet} />
                <Stack.Screen name="pull" options={sheet} />
                <Stack.Screen name="card/[uid]" options={sheet} />
                <Stack.Screen name="connections" options={sheet} />
                <Stack.Screen name="profile/index" />
                <Stack.Screen name="profile/[handle]" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="chat" />
                <Stack.Screen name="shipments" />
                <Stack.Screen name="deposit" />
                <Stack.Screen name="withdraw" />
                <Stack.Screen name="settings" />
              </Stack.Protected>
            </Stack>
            <Curtain />
            <TourOverlay />
            <Toaster />
            {__DEV__ ? <DataToggle /> : null}
          </View>
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.bg }} />
        )}
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
