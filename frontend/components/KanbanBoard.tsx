import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Application, STATUSES, Status } from '../types';

const statusMeta: Record<Status, { color: string; glow: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Applied: { color: '#0A84FF', glow: 'rgba(10,132,255,.18)', icon: 'briefcase-outline' },
  Screening: { color: '#A855F7', glow: 'rgba(168,85,247,.18)', icon: 'search-outline' },
  Interview: { color: '#F59E0B', glow: 'rgba(245,158,11,.18)', icon: 'calendar-outline' },
  Offer: { color: '#22C55E', glow: 'rgba(34,197,94,.18)', icon: 'gift-outline' },
  Rejected: { color: '#EF4444', glow: 'rgba(239,68,68,.18)', icon: 'close-circle-outline' },
};
const webTest = (id: string) => (Platform.OS === 'web' ? ({ 'data-testid': id } as any) : {});

export function KanbanBoard({ applications, onStatusChange, onOpenAdd, onOpenAutoImport }: { applications: Application[]; onStatusChange: (id: string, status: Status) => void; onOpenAdd: () => void; onOpenAutoImport?: () => void }) {
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<Status>('Applied');
  const [menuOpen, setMenuOpen] = useState(false);
  const [streak, setStreak] = useState<{ status: Status; tick: number } | null>(null);
  const cardWidth = Math.min(120, Math.max(104, width * 0.28));
  const visibleApps = useMemo(() => applications.filter((app) => app.status === selected), [applications, selected]);

  function moveApplication(id: string, status: Status) {
    setSelected(status);
    setStreak({ status, tick: Date.now() });
    onStatusChange(id, status);
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>PIPELINE</Text>
          <Text style={styles.title}>Your applications</Text>
          <Text style={styles.subtitle}>Track every step of your journey.</Text>
        </View>
        <View>
          <Pressable onPress={() => setMenuOpen((v) => !v)} style={styles.add} testID="add-application-button" {...webTest('add-application-button')}><Ionicons name={menuOpen ? 'close' : 'add'} size={30} color="#FFFFFF" /></Pressable>
          <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
            <View style={styles.menuOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} testID="add-menu-backdrop" {...webTest('add-menu-backdrop')} />
              <View style={styles.addMenu}>
            <MenuAction label="Add manually" icon="create-outline" onPress={() => { setMenuOpen(false); onOpenAdd(); }} testID="add-manual-action" />
            <MenuAction label="Scan from email" icon="mail-outline" onPress={() => { setMenuOpen(false); onOpenAutoImport?.(); }} testID="scan-email-action" />
            <MenuAction label="Paste job description" icon="document-text-outline" onPress={() => { setMenuOpen(false); onOpenAutoImport?.(); }} testID="paste-job-action" />
              </View>
            </View>
          </Modal>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
        {STATUSES.map((status) => <StatusSummary key={status} status={status} selected={selected === status} count={applications.filter((a) => a.status === status).length} width={cardWidth} streakTick={streak?.status === status ? streak.tick : 0} onPress={() => setSelected(status)} />)}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{selected}</Text>
        <Text style={styles.sectionCount}>{visibleApps.length} applications</Text>
      </View>

      <View style={styles.listCard} testID={`kanban-column-${selected.toLowerCase()}`} {...webTest(`kanban-column-${selected.toLowerCase()}`)}>
        {visibleApps.length === 0 ? <EmptyState selected={selected} /> : visibleApps.map((card, index) => <JobRow key={card.id} app={card} isLast={index === visibleApps.length - 1} onStatusChange={moveApplication} />)}
      </View>

      <View style={styles.aiCard}>
        <View style={styles.aiIcon}><Ionicons name="sparkles-outline" size={24} color="#FFFFFF" /></View>
        <View style={styles.aiCopy}><Text style={styles.aiTitle}>Let AI handle the tracking for you</Text><Text style={styles.aiText}>Connect your email or paste a job post to detect applications automatically.</Text></View>
        <Pressable onPress={onOpenAutoImport} style={styles.emailButton} testID="pipeline-connect-email" {...webTest('pipeline-connect-email')}><Text style={styles.emailButtonText}>Auto-import</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function MenuAction({ label, icon, onPress, testID }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; testID: string }) {
  return (
    <Pressable onPress={onPress} style={styles.menuAction} testID={testID} {...webTest(testID)}>
      <Text style={styles.menuText}>{label}</Text>
      <Ionicons name={icon} size={21} color="#0A84FF" />
    </Pressable>
  );
}

function StatusSummary({ status, count, width, selected, streakTick, onPress }: { status: Status; count: number; width: number; selected: boolean; streakTick: number; onPress: () => void }) {
  const meta = statusMeta[status];
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!streakTick) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 760 });
  }, [progress, streakTick]);
  const streakStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.18, 0.82, 1], [0, 1, 1, 0]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-width * 0.9, width * 0.9]) }, { rotate: '-18deg' }],
  }));
  return <Pressable onPress={onPress} style={[styles.statusCard, { width }, selected && styles.statusCardActive]} testID={`status-summary-${status}`} {...webTest(`status-summary-${status}`)}>
    <Animated.View pointerEvents="none" style={[styles.pipelineStreak, { backgroundColor: meta.color }, streakStyle]} />
    <View style={[styles.statusIcon, { backgroundColor: meta.glow }]}><Ionicons name={meta.icon} size={24} color={meta.color} /></View>
    <Text style={styles.statusLabel}>{status}</Text>
    <Text style={styles.statusCount}>{count}</Text>
    <View style={[styles.statusLine, { backgroundColor: meta.color }]} />
  </Pressable>;
}

function JobRow({ app, isLast, onStatusChange }: { app: Application; isLast: boolean; onStatusChange: (id: string, status: Status) => void }) {
  const meta = statusMeta[app.status];
  const initials = app.company_name.slice(0, 1).toUpperCase();
  return (
    <View style={[styles.rowItem, !isLast && styles.rowDivider]} testID={`job-card-${app.id}`} {...webTest(`job-card-${app.id}`)}>
      <View style={[styles.logoBox, { borderColor: meta.color }]}><Text style={[styles.logoText, { color: meta.color }]}>{initials}</Text></View>
      <View style={styles.rowCopy}>
        <Text style={styles.roleTitle}>{app.role}</Text>
        <Text style={styles.companyLine}>{app.company_name} {app.resume_version ? `• ${app.resume_version}` : '• Remote-ready'}</Text>
        <View style={styles.dateLine}><Ionicons name="calendar-outline" size={15} color="#A1A1AA" /><Text style={styles.dateText}>Applied on {formatDate(app.applied_date)}</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moveRow}>
          {STATUSES.filter((s) => s !== app.status).slice(0, 4).map((s) => <Pressable key={s} testID={`move-${app.id}-${s}`} onPress={() => onStatusChange(app.id, s)} style={styles.movePill} {...webTest(`move-${app.id}-${s}`)}><Text style={styles.moveText}>{s}</Text></Pressable>)}
        </ScrollView>
      </View>
      <View style={styles.rowRight}><View style={[styles.statusPill, { borderColor: meta.color, backgroundColor: meta.glow }]}><Text style={[styles.statusPillText, { color: meta.color }]}>{app.status}</Text></View><Ionicons name="ellipsis-vertical" size={20} color="#71717A" /></View>
    </View>
  );
}

function EmptyState({ selected }: { selected: Status }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={statusMeta[selected].icon} size={26} color={statusMeta[selected].color} /></View><Text style={styles.emptyText}>No {selected.toLowerCase()} applications yet.</Text><Text style={styles.emptySubtext}>Tap + to add one or use Auto-import.</Text></View>;
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#050507' }, content: { paddingTop: 18, paddingBottom: 128 }, glowOne: { position: 'absolute', top: 10, right: -90, width: 210, height: 210, borderRadius: 120, backgroundColor: 'rgba(10,132,255,.12)' }, glowTwo: { position: 'absolute', top: 260, left: -110, width: 180, height: 180, borderRadius: 100, backgroundColor: 'rgba(168,85,247,.08)' },
  hero: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 18 }, heroCopy: { flex: 1, paddingRight: 12 }, kicker: { color: '#F5A623', fontSize: 13, fontWeight: '900', letterSpacing: 3.4 }, title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1.2 }, subtitle: { color: '#D4D4D8', fontSize: 17, fontWeight: '800', marginTop: 8 },
  add: { width: 64, height: 60, borderRadius: 21, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#0A84FF', shadowOpacity: .75, shadowRadius: 24, elevation: 12 }, menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.18)' }, addMenu: { position: 'absolute', right: 20, top: 104, width: 252, borderRadius: 22, backgroundColor: '#1C1B24', borderWidth: 1, borderColor: '#30303A', paddingVertical: 14, shadowColor: '#000', shadowOpacity: .45, shadowRadius: 22, elevation: 12 }, menuAction: { minHeight: 54, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, menuText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  summaryRow: { paddingHorizontal: 20, gap: 12, paddingVertical: 10 }, statusCard: { height: 126, borderRadius: 22, backgroundColor: '#11111A', borderWidth: 1, borderColor: '#242432', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 7, overflow: 'hidden' }, statusCardActive: { borderColor: '#5B6578', backgroundColor: '#151520' }, pipelineStreak: { position: 'absolute', top: -22, width: 24, height: 176, borderRadius: 999, opacity: 0, shadowColor: '#FFFFFF', shadowOpacity: .55, shadowRadius: 14 }, statusIcon: { width: 48, height: 40, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, statusLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, statusCount: { color: '#FFFFFF', fontSize: 29, lineHeight: 32, fontWeight: '900' }, statusLine: { position: 'absolute', bottom: 11, left: 20, right: 20, height: 4, borderRadius: 99 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }, sectionTitle: { color: '#FFFFFF', fontSize: 27, fontWeight: '900' }, sectionCount: { color: '#A1A1AA', fontSize: 15, fontWeight: '800' },
  listCard: { marginHorizontal: 20, borderRadius: 24, backgroundColor: '#11111A', borderWidth: 1, borderColor: '#242432', overflow: 'hidden' }, rowItem: { flexDirection: 'row', padding: 16, gap: 13 }, rowDivider: { borderBottomWidth: 1, borderBottomColor: '#232330' }, logoBox: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, logoText: { fontSize: 26, fontWeight: '900' }, rowCopy: { flex: 1, minWidth: 0 }, roleTitle: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontWeight: '900' }, companyLine: { color: '#C7C7D1', fontSize: 14, fontWeight: '800', marginTop: 3 }, dateLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 }, dateText: { color: '#A1A1AA', fontSize: 13, fontWeight: '700' }, rowRight: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }, statusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 6 }, statusPillText: { fontSize: 12, fontWeight: '900' }, moveRow: { gap: 7, paddingTop: 10 }, movePill: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,.055)', borderWidth: 1, borderColor: '#2A2A34', paddingHorizontal: 10, paddingVertical: 7 }, moveText: { fontSize: 11, fontWeight: '900', color: '#D4D4D8' },
  empty: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20 }, emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, emptySubtext: { color: '#A1A1AA', marginTop: 6, fontWeight: '700', textAlign: 'center' },
  aiCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(10,132,255,.42)', backgroundColor: '#0B1422', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }, aiIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#0A84FF', shadowOpacity: .45, shadowRadius: 16 }, aiCopy: { flex: 1 }, aiTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, aiText: { color: '#D4D4D8', fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 4 }, emailButton: { minHeight: 44, borderRadius: 15, backgroundColor: '#0A84FF', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }, emailButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});