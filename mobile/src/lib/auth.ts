// Sign-in helpers. Sign in with Apple runs for real on iOS devices that
// support it. Google runs for real when OAuth client IDs are configured
// (EXPO_PUBLIC_GOOGLE_*_CLIENT_ID); without them, and on platforms with no
// provider, the demo signs you in on this device only.
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { USERS } from '../data';

// Handles that belong to the demo's built-in collectors.
export const TAKEN = new Set(USERS.map((u) => u.handle));

export type Identity = { name: string; email?: string; provider: 'apple' | 'google' | 'email' | 'guest'; demo: boolean };

export const googleClientIds = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

export const googleConfigured =
  Platform.OS === 'ios'
    ? !!googleClientIds.iosClientId
    : Platform.OS === 'android'
      ? !!googleClientIds.androidClientId
      : !!googleClientIds.webClientId;

export async function appleAvailable() {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export class Cancelled extends Error {}

export async function signInWithApple(): Promise<Identity> {
  if (!(await appleAvailable())) return { name: '', provider: 'apple', demo: true };
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    const name = cred.fullName ? AppleAuthentication.formatFullName(cred.fullName, 'short') : '';
    return { name, email: cred.email ?? undefined, provider: 'apple', demo: false };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new Cancelled();
    throw e;
  }
}

// Reads the name and email out of a Google ID token.
export function identityFromIdToken(token: string): Identity {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '='));
    const utf8 = binary.replace(/[\s\S]/g, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'));
    const json = JSON.parse(decodeURIComponent(utf8));
    return { name: json.given_name || json.name || '', email: json.email, provider: 'google', demo: false };
  } catch {
    return { name: '', provider: 'google', demo: false };
  }
}

// A collector handle from a name or email: lowercase letters, numbers and _.
export function suggestHandle(name: string, email?: string) {
  const base = (name || (email ? email.split('@')[0] : '') || 'collector')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 14);
  const handle = base.length >= 3 ? base : `collector${Math.floor(100 + Math.random() * 900)}`;
  return TAKEN.has(handle) ? `${handle.slice(0, 12)}_${Math.floor(10 + Math.random() * 90)}` : handle;
}

export const validHandle = (h: string) => /^[a-z0-9_]{3,16}$/.test(h);
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
