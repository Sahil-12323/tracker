import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AddApplicationSheet } from '../components/AddApplicationSheet';
import { AnalyticsScreen } from '../components/AnalyticsScreen';
import { AuthScreen } from '../components/AuthScreen';
import { DetectionScreen } from '../components/DetectionScreen';
import { KanbanBoard } from '../components/KanbanBoard';
import { OnboardingScreen } from '../components/OnboardingScreen';
import { ProfileScreen } from '../components/ProfileScreen';
import { appApi, authApi, saveToken } from '../lib/api';
import { Analytics, Application, ApplicationDraft, Status, User } from '../types';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
const tabs = [
  { key: 'home', label: 'Board', icon: 'grid-outline' },
  { key: 'detect', label: 'Detect', icon: 'scan-outline' },
  { key: 'analytics', label: 'Stats', icon: 'bar-chart-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
] as const;
const webTest = (id: string) => (Platform.OS === 'web' ? ({ 'data-testid': id } as any) : {});
const ONBOARDING_KEY = 'jobtrackr_onboarding_seen';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [onboardingSeen, setOnboardingSeen] = useState(true);
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('home');
  const [apps, setApps] = useState<Application[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [sheet, setSheet] = useState(false);
  const [initialDraft, setInitialDraft] = useState<Partial<ApplicationDraft> | undefined>();
  const [sharedText, setSharedText] = useState('');

  useEffect(() => {
    const boot = async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingSeen(seen === 'true');
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash.includes('session_id=')) {
          const id = new URLSearchParams(window.location.hash.replace('#', '')).get('session_id');
          if (id) { const res = await authApi.googleSession(id); await saveToken(res.token); setUser(res.user); window.history.replaceState({}, '', window.location.pathname); await loadData(); return; }
        }
        const existing = await authApi.me(); setUser(existing); await loadData();
      } catch { setUser(null); } finally { setChecking(false); }
    };
    boot();
  }, []);

  useEffect(() => {
    const parseUrl = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const incoming = String(parsed.queryParams?.text || parsed.queryParams?.url || '');
      if (incoming) { setSharedText(incoming); setTab('detect'); }
    };
    Linking.getInitialURL().then(parseUrl);
    const sub = Linking.addEventListener('url', (event) => parseUrl(event.url));
    return () => sub.remove();
  }, []);

  async function loadData() {
    const [list, stats] = await Promise.all([appApi.list(), appApi.analytics()]); setApps(list); setAnalytics(stats);
  }

  async function saveApplication(draft: ApplicationDraft) {
    try {
      const saved = await appApi.create(draft); setApps((current) => [saved, ...current]); setSheet(false); setInitialDraft(undefined); await loadData(); await scheduleFollowUp(saved);
    } catch (e: any) { Alert.alert('Could not save', e.message); }
  }

  async function scheduleFollowUp(app: Application) {
    if (!app.follow_up_date) return;
    const date = new Date(`${app.follow_up_date}T09:00:00`);
    if (Number.isNaN(date.getTime()) || date <= new Date()) return;
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return;
    await Notifications.scheduleNotificationAsync({ content: { title: `Follow up with ${app.company_name}`, body: `${app.role} is ready for a check-in.` }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } });
  }

  async function updateStatus(id: string, status: Status) {
    const previous = apps; setApps((current) => current.map((a) => (a.id === id ? { ...a, status } : a)));
    try { await appApi.updateStatus(id, status); await loadData(); } catch (e: any) { setApps(previous); Alert.alert('Move failed', e.message); }
  }

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingSeen(true);
  }

  if (checking) return <View style={styles.loading}><ActivityIndicator color="#007AFF" size="large" /><Text style={styles.loadingText}>Preparing JobTrackr AI</Text></View>;
  if (!onboardingSeen) return <OnboardingScreen onFinish={finishOnboarding} />;
  if (!user) return <AuthScreen onAuth={(u) => { setUser(u); loadData().catch(() => null); }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        {tab === 'home' && <KanbanBoard applications={apps} onStatusChange={updateStatus} onOpenAdd={() => { setInitialDraft(undefined); setSheet(true); }} />}
        {tab === 'detect' && <DetectionScreen initialText={sharedText} onAccepted={(app) => { setApps((cur) => [app, ...cur]); setTab('home'); loadData().catch(() => null); }} onEdit={(draft) => { setInitialDraft(draft); setSheet(true); }} />}
        {tab === 'analytics' && <AnalyticsScreen analytics={analytics} />}
        {tab === 'profile' && <ProfileScreen user={user} onLogout={() => setUser(null)} onDetections={(items) => { if (items.length) setTab('detect'); }} />}
        <View style={styles.tabbar}>{tabs.map((item) => <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabActive]} testID={`tab-${item.key}`} {...webTest(`tab-${item.key}`)}><Ionicons name={item.icon as any} size={21} color={tab === item.key ? '#FAFAFA' : '#71717A'} /><Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text></Pressable>)}</View>
        <AddApplicationSheet visible={sheet} initial={initialDraft} onClose={() => { setSheet(false); setInitialDraft(undefined); }} onSave={saveApplication} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050505' }, screen: { flex: 1, backgroundColor: '#050505' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505', gap: 14 }, loadingText: { color: '#FFFFFF', fontWeight: '900' },
  tabbar: { position: 'absolute', left: 16, right: 16, bottom: 18, minHeight: 72, borderRadius: 24, backgroundColor: 'rgba(17,17,17,.94)', borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', padding: 8, shadowColor: '#007AFF', shadowOpacity: .22, shadowRadius: 22, elevation: 10 },
  tab: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4 }, tabActive: { backgroundColor: '#007AFF', shadowColor: '#007AFF', shadowOpacity: .45, shadowRadius: 14 }, tabText: { color: '#71717A', fontSize: 11, fontWeight: '900' }, tabTextActive: { color: '#FFFFFF' }, error: { position: 'absolute', bottom: 98, left: 20, right: 20, color: '#EF4444', fontWeight: '800' },
});
