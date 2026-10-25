// The five main tabs under a shared header. The first visit after onboarding
// (or "Replay the tour" in Settings) plays the spotlight tour.
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { AppHeader } from '../../src/components/AppHeader';
import { useCurtain } from '../../src/components/Curtain';
import { FocusGate } from '../../src/components/FocusGate';
import { TabBar } from '../../src/components/TabBar';
import { startTour, useTour } from '../../src/components/Tour';
import { tourSteps } from '../../src/lib/tourSteps';
import { setPrefs, usePrefs } from '../../src/store/prefs';
import { getS, useSession } from '../../src/store/session';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const onboarded = usePrefs((p) => p.onboarded);
  const tourRequested = usePrefs((p) => p.tourRequested);
  const signedIn = useSession((x) => !!x.s);
  // After onboarding, the tour waits for the curtain to open into the app.
  const curtain = useCurtain((c) => c.active);

  useEffect(() => {
    if (!onboarded || !signedIn || !tourRequested || curtain || useTour.getState().active) return;
    // Let the first screen lay out so every target has a position.
    const t = setTimeout(() => {
      const s = getS();
      const p = usePrefs.getState();
      startTour(tourSteps(p.answers, s?.balance ?? 0, s?.freePacks ?? 0), () => setPrefs({ tourDone: true, tourRequested: false }));
    }, 900);
    return () => clearTimeout(t);
  }, [onboarded, signedIn, tourRequested, curtain]);

  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!signedIn) return <Redirect href="/signin" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenLayout={({ children }) => <FocusGate>{children}</FocusGate>}
      screenOptions={{
        header: () => (
          <FocusGate>
            <AppHeader />
          </FocusGate>
        ),
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="packs" options={{ title: 'Packs' }} />
      <Tabs.Screen name="battles" options={{ title: 'Battles' }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault' }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="rewards" options={{ title: 'Rewards' }} />
    </Tabs>
  );
}
