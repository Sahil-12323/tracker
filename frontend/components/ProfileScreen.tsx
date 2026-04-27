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
      <Text style={styles.kicker}>PROFILE</Text><Text style={styles.title}>Privacy-safe controls<Text style={styles.blueDot}>.</Text></Text><Text style={styles.subtitle}>Manage your account and data preferences.</Text>
      <View style={styles.userCard}><View style={styles.avatar}><Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.userCopy}><Text style={styles.name}>{user.name}</Text><Text style={styles.email}>{user.email}</Text></View><Pressable onPress={() => setMessage('Profile editing will be available in the next update.')} style={styles.editProfile} testID="profile-edit-button" {...webTest('profile-edit-button')}><Ionicons name="pencil-outline" size={19} color="#0A84FF" /><Text style={styles.editText}>Edit</Text></Pressable></View>

      <View style={styles.gmailCard}>
        <View style={styles.gmailHeader}><View style={styles.gmailIcon}><Ionicons name="mail-outline" size={30} color="#0A84FF" /></View><View style={styles.gmailTitleWrap}><Text style={styles.cardTitle}>Gmail auto-detection</Text><View style={styles.statusLine}><View style={styles.connectedBadge}><Ionicons name={gmail?.configured ? 'checkmark' : 'alert'} size={16} color="#22C55E" /><Text style={styles.connectedText}>{gmail?.connected ? 'Connected' : gmail?.configured ? 'Ready' : 'Setup needed'}</Text></View><Text style={styles.statusText}>{gmail?.message || 'Checking Gmail setup...'}</Text></View></View></View>
        <Text style={styles.body}>We’ll automatically scan your emails for job applications and keep your pipeline updated.</Text>
        <View style={styles.separator} />
        <Text style={styles.label}>Redirect URL</Text>
        <View style={styles.uriBox}><Text style={styles.uri} numberOfLines={1}>{gmail?.redirect_uri || 'Loading...'}</Text><Ionicons name="copy-outline" size={24} color="#0A84FF" /></View>
        <View style={styles.buttonRow}><Pressable onPress={connect} disabled={loading || !gmail?.configured} style={[styles.button, !gmail?.configured && styles.disabled]} testID="gmail-connect-button" {...webTest('gmail-connect-button')}><Ionicons name="logo-google" size={27} color="#FFFFFF" /><Text style={styles.buttonText}>Connect Gmail</Text></Pressable><Pressable testID="gmail-sync-button" onPress={sync} disabled={loading || !gmail?.configured} style={[styles.buttonDark, !gmail?.configured && styles.disabled]} {...webTest('gmail-sync-button')}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="sync-outline" size={27} color="#FFFFFF" /><Text style={styles.buttonDarkText}>Sync now</Text></>}</Pressable></View>
      </View>

      <View style={styles.reminderCard}><View style={styles.reminderHeader}><View style={styles.reminderIcon}><Ionicons name="notifications-outline" size={30} color="#A855F7" /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Reminders</Text><Text style={styles.body}>Follow-up dates are saved with applications and surfaced in analytics. Local notifications will be sent when a follow-up date is due.</Text></View></View><View style={styles.preferenceBox}><Preference icon="calendar-outline" title="Follow-up reminders" body="Get notified about upcoming follow-ups" right="toggle" /><Preference icon="time-outline" title="Reminder time" body="Choose when you want to be notified" right="09:00 AM" /></View></View>
      {!!message && <Text style={styles.message}>{message}</Text>}
      <Pressable onPress={logout} style={styles.logout} testID="logout-button" {...webTest('logout-button')}><Text style={styles.logoutText}>Log out</Text></Pressable>
    </ScrollView>
  );
}

function Preference({ icon, title, body, right }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; right: 'toggle' | string }) { return <View style={styles.preference}><View style={styles.prefIcon}><Ionicons name={icon} size={24} color="#A855F7" /></View><View style={styles.prefCopy}><Text style={styles.prefTitle}>{title}</Text><Text style={styles.prefBody}>{body}</Text></View>{right === 'toggle' ? <View style={styles.toggle}><View style={styles.toggleKnob} /></View> : <View style={styles.timePill}><Text style={styles.timeText}>{right}</Text><Ionicons name="chevron-down" size={19} color="#A1A1AA" /></View>}</View>; }

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#050507' }, content: { padding: 20, paddingBottom: 128 }, kicker: { color: '#F5A623', fontSize: 14, fontWeight: '900', letterSpacing: 4 }, title: { color: '#FFFFFF', fontSize: 40, lineHeight: 48, fontWeight: '900', marginTop: 18 }, blueDot: { color: '#0A84FF' }, subtitle: { color: '#A1A1AA', fontSize: 18, lineHeight: 25, fontWeight: '800', marginTop: 16, marginBottom: 24 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#101018', borderWidth: 1, borderColor: '#252532', borderRadius: 26, padding: 18, minHeight: 122 }, avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#0A84FF', shadowOpacity: .45, shadowRadius: 18 }, avatarText: { color: '#FFFFFF', fontSize: 36, fontWeight: '900' }, userCopy: { flex: 1, minWidth: 0 }, name: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' }, email: { color: '#A1A1AA', marginTop: 7, fontSize: 15, fontWeight: '800' }, editProfile: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: '#25314B', backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13 }, editText: { color: '#0A84FF', fontSize: 15, fontWeight: '900' },
  gmailCard: { backgroundColor: '#101018', borderWidth: 1, borderColor: '#252532', borderRadius: 26, padding: 18, marginTop: 22 }, gmailHeader: { flexDirection: 'row', gap: 16, alignItems: 'center' }, gmailIcon: { width: 66, height: 66, borderRadius: 20, backgroundColor: '#0B1B32', alignItems: 'center', justifyContent: 'center' }, gmailTitleWrap: { flex: 1 }, cardTitle: { color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontWeight: '900' }, statusLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9, flexWrap: 'wrap' }, connectedBadge: { borderRadius: 999, backgroundColor: 'rgba(34,197,94,.18)', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7 }, connectedText: { color: '#22C55E', fontWeight: '900' }, statusText: { color: '#A1A1AA', fontSize: 14, fontWeight: '800', flexShrink: 1 }, body: { color: '#A1A1AA', lineHeight: 25, fontSize: 16, fontWeight: '800', marginTop: 18 }, separator: { height: 1, backgroundColor: '#292933', marginVertical: 18 }, label: { color: '#A1A1AA', fontSize: 13, fontWeight: '900', marginBottom: 8 }, uriBox: { borderRadius: 14, borderWidth: 1, borderColor: '#2A2A34', backgroundColor: '#171720', minHeight: 54, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, uri: { flex: 1, color: '#D4D4D8', fontSize: 13, fontWeight: '800' }, buttonRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  button: { flex: 1, minHeight: 58, borderRadius: 16, borderWidth: 1, borderColor: '#2A2A34', backgroundColor: 'rgba(255,255,255,.035)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }, buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, buttonDark: { flex: 1, minHeight: 58, borderRadius: 16, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowColor: '#0A84FF', shadowOpacity: .45, shadowRadius: 16 }, buttonDarkText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, disabled: { opacity: .58 },
  reminderCard: { backgroundColor: '#101018', borderWidth: 1, borderColor: '#252532', borderRadius: 26, padding: 18, marginTop: 22 }, reminderHeader: { flexDirection: 'row', gap: 16 }, reminderIcon: { width: 66, height: 66, borderRadius: 20, backgroundColor: 'rgba(168,85,247,.15)', alignItems: 'center', justifyContent: 'center' }, preferenceBox: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#2A2A34', overflow: 'hidden' }, preference: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#2A2A34' }, prefIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(168,85,247,.15)', alignItems: 'center', justifyContent: 'center' }, prefCopy: { flex: 1 }, prefTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, prefBody: { color: '#A1A1AA', fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 3 }, toggle: { width: 54, height: 30, borderRadius: 99, backgroundColor: '#0A84FF', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 4 }, toggleKnob: { width: 24, height: 24, borderRadius: 99, backgroundColor: '#FFFFFF' }, timePill: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: '#2A2A34', backgroundColor: '#171720', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }, timeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  message: { color: '#A1A1AA', fontWeight: '700', marginTop: 14 }, logout: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', marginTop: 18 }, logoutText: { color: '#FFFFFF', fontWeight: '900' },
});