import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { IMAGES } from '../constants/assets';
import { authApi, saveToken } from '../lib/api';
import { User } from '../types';

const webTest = (id: string) => (Platform.OS === 'web' ? ({ 'data-testid': id } as any) : {});

export function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setLoading(true); setError('');
    try {
      const result = mode === 'signup' ? await authApi.register({ name, email, password }) : await authApi.login({ email, password });
      await saveToken(result.token); onAuth(result.user);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function googleLogin() {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirect = Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/` : Linking.createURL('/');
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.href = authUrl;
    else await WebBrowser.openAuthSessionAsync(authUrl, redirect);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrap}>
      <Image source={{ uri: IMAGES.authBackground }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <View style={styles.card}>
        <Image source={{ uri: IMAGES.logo }} style={styles.logo} />
        <Text style={styles.kicker}>JOBTRACKR AI</Text>
        <Text style={styles.title}>Track every application without the spreadsheet chaos.</Text>
        {mode === 'signup' && <TextInput testID="name-input" value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#A1A1AA" style={styles.input} autoCapitalize="words" {...webTest('name-input')} />}
        <TextInput testID="email-input" value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#A1A1AA" style={styles.input} autoCapitalize="none" keyboardType="email-address" {...webTest('email-input')} />
        <TextInput testID="password-input" value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#A1A1AA" style={styles.input} secureTextEntry {...webTest('password-input')} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={submit} disabled={loading} style={styles.primary} testID="email-login-button" {...webTest('email-login-button')}>
          {loading ? <ActivityIndicator color="#FAFAFA" /> : <Text style={styles.primaryText}>{mode === 'signup' ? 'Create secure account' : 'Sign in'}</Text>}
        </Pressable>
        <Pressable onPress={googleLogin} style={styles.secondary} testID="google-login-button" {...webTest('google-login-button')}>
          <Ionicons name="logo-google" size={18} color="#FAFAFA" /><Text style={styles.secondaryText}>Continue with Google</Text>
        </Pressable>
        <Pressable testID="auth-mode-toggle" onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={styles.switcher} {...webTest('auth-mode-toggle')}>
          <Text style={styles.switchText}>{mode === 'login' ? 'New here? Create account' : 'Already have an account? Sign in'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#09090B', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'rgba(24,24,27,.92)', borderColor: '#27272A', borderWidth: 1, borderRadius: 24, padding: 24, gap: 14 },
  logo: { width: 72, height: 72, borderRadius: 18 }, kicker: { color: '#60A5FA', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#FAFAFA', fontSize: 30, lineHeight: 36, fontWeight: '800', marginBottom: 10 },
  input: { backgroundColor: '#09090B', borderColor: '#27272A', borderWidth: 1, borderRadius: 12, color: '#FAFAFA', padding: 16, fontSize: 16 },
  primary: { minHeight: 54, borderRadius: 12, backgroundColor: '#3366FF', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryText: { color: '#FAFAFA', fontSize: 16, fontWeight: '800' }, secondary: { minHeight: 54, borderRadius: 12, borderColor: '#3F3F46', borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  secondaryText: { color: '#FAFAFA', fontSize: 15, fontWeight: '700' }, switcher: { alignItems: 'center', justifyContent: 'center', padding: 10, minHeight: 48 }, switchText: { color: '#A1A1AA', fontSize: 14 }, error: { color: '#F87171', fontWeight: '600' },
});