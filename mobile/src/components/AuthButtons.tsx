// Continue with Apple / Google / email, plus "Skip for now". Each returns an
// Identity; see lib/auth.ts for when a provider runs for real.
//
// Apple: on iOS, Apple's own button (real Sign in with Apple). Android has
// no native Apple sign-in, so it isn't offered there. On the web the button
// creates a demo account on this device, and says so.
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Cancelled, type Identity, appleAvailable, googleClientIds, googleConfigured, identityFromIdToken, signInWithApple, validEmail } from '../lib/auth';
import { toast } from '../lib/toast';
import { colors, type } from '../theme';
import { GoogleG, Icon } from './Icon';
import { Button, Field, Press } from './ui';

WebBrowser.maybeCompleteAuthSession();

type Props = { onIdentity: (id: Identity) => void; allowSkip?: boolean };

export function AuthButtons({ onIdentity, allowSkip = true }: Props) {
  // iOS asks the system whether Sign in with Apple is available; until it
  // answers, nothing is shown in its place (no placeholder flash).
  const [apple, setApple] = useState<'native' | 'web' | 'none' | 'pending'>(Platform.OS === 'ios' ? 'pending' : Platform.OS === 'web' ? 'web' : 'none');
  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'ios') appleAvailable().then((ok) => setApple(ok ? 'native' : 'none'));
  }, []);

  const signInApple = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      onIdentity(await signInWithApple());
    } catch (e) {
      if (!(e instanceof Cancelled)) toast('Apple sign-in did not finish. Try again or use another option.', 'warn');
    } finally {
      busy.current = false;
    }
  };

  const submitEmail = () => {
    if (!validEmail(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError(null);
    onIdentity({ name: '', email: email.trim().toLowerCase(), provider: 'email', demo: true });
  };

  return (
    <View style={{ gap: 12 }}>
      {apple === 'native' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={27}
          style={{ height: 54, width: '100%' }}
          onPress={signInApple}
        />
      ) : null}
      {apple === 'pending' ? <View style={{ height: 54 }} /> : null}
      {apple === 'web' ? <Button label="Continue with Apple" variant="light" left={<Icon name="apple" size={19} color="#111" />} onPress={signInApple} testID="auth-apple" /> : null}
      {googleConfigured ? (
        <RealGoogle onIdentity={onIdentity} />
      ) : (
        <Button label="Continue with Google" variant="light" left={<GoogleG size={18} />} onPress={() => onIdentity({ name: '', provider: 'google', demo: true })} testID="auth-google" />
      )}
      {showEmail ? (
        <Animated.View entering={FadeInDown.duration(200)} style={{ gap: 10 }}>
          <Field
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (error) setError(null);
            }}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={submitEmail}
            error={error}
            autoFocus
            testID="auth-email-input"
          />
          <Button label="Continue" variant="buy" onPress={submitEmail} testID="auth-email-continue" />
          <Text style={[type.small, { textAlign: 'center' }]}>Demo: no email is sent. Your account stays on this device.</Text>
        </Animated.View>
      ) : (
        <Button label="Continue with email" variant="secondary" icon="mail" onPress={() => setShowEmail(true)} testID="auth-email" style={{ minHeight: 54, borderRadius: 27 }} />
      )}
      {allowSkip ? (
        <Press onPress={() => onIdentity({ name: '', provider: 'guest', demo: true })} testID="auth-skip" style={{ alignSelf: 'center', padding: 10 }}>
          <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 15 }}>Skip for now</Text>
        </Press>
      ) : null}
    </View>
  );
}

// Google sign-in through the system browser; only rendered when client IDs
// are configured.
function RealGoogle({ onIdentity }: { onIdentity: (id: Identity) => void }) {
  const [request, response, prompt] = Google.useIdTokenAuthRequest(googleClientIds);
  const latest = useRef(onIdentity);
  latest.current = onIdentity;
  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) latest.current(identityFromIdToken(response.params.id_token));
    else if (response?.type === 'error') toast('Google sign-in did not finish. Try again or use another option.', 'warn');
  }, [response]);
  return <Button label="Continue with Google" variant="light" left={<GoogleG size={18} />} disabled={!request} onPress={() => prompt()} testID="auth-google" />;
}
