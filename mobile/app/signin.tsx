// Signed out: log back in with Apple, Google or email.
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthButtons } from '../src/components/AuthButtons';
import { logoImage } from '../src/data/images';
import { suggestHandle } from '../src/lib/auth';
import { usePrefs } from '../src/store/prefs';
import { signIn } from '../src/store/session';
import { AVATAR_COLORS, colors, type } from '../src/theme';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="screen-signin">
      <LinearGradient colors={['#24184d', colors.bg]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 360 }} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, gap: 22, flexGrow: 1, justifyContent: 'center' }}>
        <Image source={logoImage} style={{ width: 140, height: 50, alignSelf: 'center' }} contentFit="contain" />
        <View style={{ gap: 8 }}>
          <Text style={[type.title, { textAlign: 'center' }]}>Welcome back</Text>
          <Text style={[type.body, { textAlign: 'center' }]}>Log in to the demo to open packs, battle and manage your Vault.</Text>
        </View>
        <AuthButtons
          allowSkip={false}
          onIdentity={(id) => {
            const handle = suggestHandle(id.name, id.email);
            signIn({ handle, name: id.name || handle, color: AVATAR_COLORS[0], provider: id.provider, email: id.email });
            if (!usePrefs.getState().tourDone) usePrefs.setState({ tourRequested: true });
            router.replace('/packs');
          }}
        />
        <Text style={[type.small, { textAlign: 'center' }]}>Unofficial demo · accounts stay on this device · no real money</Text>
      </ScrollView>
    </View>
  );
}
