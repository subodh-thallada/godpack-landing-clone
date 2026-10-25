import { Redirect } from 'expo-router';
import { usePrefs } from '../src/store/prefs';
import { useSession } from '../src/store/session';

// First launch goes to onboarding; after that, straight into the app (or to
// sign-in if you logged out).
export default function Index() {
  const onboarded = usePrefs((p) => p.onboarded);
  const signedIn = useSession((x) => !!x.s);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href={signedIn ? '/packs' : '/signin'} />;
}
