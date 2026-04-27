import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { appApi, authApi, clearToken } from '../lib/api';
import { Detection, User } from '../types';

const webTest = (id: string) => (Platform.OS === 'web' ? ({ 'data-testid': id } as any) : {});

export function ProfileScreen({ user, onLogout, onDetections }: { user: User; onLogout: () => void; onDetections: (items: Detection[]) => void }) {
  const [gmail, setGmail] = useState<{ configured: boolean; connected: boolean; redirect_uri: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { appApi.gmailConfig().then(setGmail).catch((e) => setMessage(e.message)); }, []);

  async function connect() {
    setLoading(true); setMessage('');
    try { const res = await appApi.gmailConnect(); await WebBrowser.openBrowserAsync(res.auth_url); } catch (e: any) { setMessage(e.message); } finally { setLoading(false); }
  }
  async function sync() {
    setLoading(true); setMessage('');
    try { const items = await appApi.gmailSync(); onDetections(items); setMessage(`Detected ${items.length} possible applications from Gmail.`); } catch (e: any) { setMessage(e.message); } finally { setLoading(false); }
  }
  async function logout() { await authApi.logout().catch(() => null); await clearToken(); onLogout(); }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>PROFILE</Text><Text style={styles.title}>Privacy-safe controls.</Text>
      <View style={styles.userCard}><View style={styles.avatar}><Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text></View><View><Text style={styles.name}>{user.name}</Text><Text style={styles.email}>{user.email}</Text></View></View>
      <View style={styles.card}><View style={styles.cardHeader}><Ionicons name="mail-outline" size={22} color="#0033CC" /><Text style={styles.cardTitle}>Gmail auto-detection</Text></View><Text style={styles.body}>{gmail?.message || 'Checking Gmail setup...'}</Text><Text style={styles.uri}>Redirect URI: {gmail?.redirect_uri || 'Loading...'}</Text>
        <View style={styles.row}><Pressable onPress={connect} disabled={loading || !gmail?.configured} style={[styles.button, !gmail?.configured && styles.disabled]} testID="gmail-connect-button" {...webTest('gmail-connect-button')}><Text style={styles.buttonText}>Connect Gmail</Text></Pressable><Pressable testID="gmail-sync-button" onPress={sync} disabled={loading || !gmail?.connected} style={[styles.buttonDark, !gmail?.connected && styles.disabled]} {...webTest('gmail-sync-button')}>{loading ? <ActivityIndicator color="#FAFAFA" /> : <Text style={styles.buttonDarkText}>Sync</Text>}</Pressable></View>
      </View>
      <View style={styles.card}><View style={styles.cardHeader}><Ionicons name="notifications-outline" size={22} color="#0033CC" /><Text style={styles.cardTitle}>Reminders</Text></View><Text style={styles.body}>Follow-up dates are saved with applications and surfaced in analytics. Local notification scheduling runs when you add a follow-up date.</Text></View>
      {!!message && <Text style={styles.message}>{message}</Text>}
      <Pressable onPress={logout} style={styles.logout} testID="logout-button" {...webTest('logout-button')}><Text style={styles.logoutText}>Log out</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 }, content: { padding: 20, paddingBottom: 120 }, kicker: { color: '#3366FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.8 }, title: { color: '#09090B', fontSize: 30, fontWeight: '900', marginTop: 8, marginBottom: 20 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#09090B', borderRadius: 24, padding: 18 }, avatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#3366FF', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#FAFAFA', fontSize: 24, fontWeight: '900' }, name: { color: '#FAFAFA', fontSize: 20, fontWeight: '900' }, email: { color: '#A1A1AA', marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 24, padding: 18, marginTop: 14 }, cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }, cardTitle: { color: '#09090B', fontSize: 19, fontWeight: '900' }, body: { color: '#3F3F46', lineHeight: 22, fontWeight: '600' }, uri: { color: '#71717A', marginTop: 12, fontSize: 12, lineHeight: 18 }, row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  button: { flex: 1, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: '#E4E4E7', alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#09090B', fontWeight: '900' }, buttonDark: { flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: '#0033CC', alignItems: 'center', justifyContent: 'center' }, buttonDarkText: { color: '#FAFAFA', fontWeight: '900' }, disabled: { opacity: .42 }, message: { color: '#71717A', fontWeight: '700', marginTop: 14 }, logout: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090B', marginTop: 18 }, logoutText: { color: '#FAFAFA', fontWeight: '900' },
});