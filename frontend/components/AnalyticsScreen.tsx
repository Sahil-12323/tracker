import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Analytics, STATUSES } from '../types';

export function AnalyticsScreen({ analytics }: { analytics: Analytics | null }) {
  const total = analytics?.total || 0;
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>ANALYTICS</Text><Text style={styles.title}>Measure what is moving.</Text>
      <View style={styles.grid}><Metric label="Total" value={total} /><Metric label="Active" value={analytics?.active || 0} /><Metric label="Interviews" value={analytics?.interviews || 0} /><Metric label="Offers" value={`${analytics?.success_rate || 0}%`} /></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Pipeline distribution</Text>{STATUSES.map((s) => { const count = analytics?.by_status?.[s] || 0; const pct = total ? Math.max((count / total) * 100, 5) : 5; return <View key={s} style={styles.barRow}><Text style={styles.barLabel}>{s}</Text><View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View><Text style={styles.barCount}>{count}</Text></View>; })}</View>
      <View style={styles.card}><Text style={styles.cardTitle}>Resume versions</Text>{Object.entries(analytics?.by_resume || { Unspecified: 0 }).map(([name, count]) => <View key={name} style={styles.resumeRow}><Text style={styles.resumeName}>{name}</Text><Text style={styles.resumeCount}>{count}</Text></View>)}</View>
      <View style={styles.reminder}><Text style={styles.reminderValue}>{analytics?.upcoming_followups || 0}</Text><Text style={styles.reminderText}>follow-ups due in the next 7 days.</Text></View>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  wrap: { flex: 1 }, content: { padding: 20, paddingBottom: 120 }, kicker: { color: '#3366FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.8 }, title: { color: '#09090B', fontSize: 30, fontWeight: '900', marginTop: 8, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { width: '48%', backgroundColor: '#09090B', borderRadius: 22, padding: 18 }, metricValue: { color: '#FAFAFA', fontSize: 30, fontWeight: '900' }, metricLabel: { color: '#A1A1AA', marginTop: 8, fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E4E4E7', padding: 18, marginTop: 14 }, cardTitle: { fontSize: 20, fontWeight: '900', color: '#09090B', marginBottom: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 }, barLabel: { width: 78, color: '#3F3F46', fontWeight: '800' }, barTrack: { flex: 1, height: 12, borderRadius: 99, backgroundColor: '#F4F4F5', overflow: 'hidden' }, barFill: { height: 12, borderRadius: 99, backgroundColor: '#0033CC' }, barCount: { width: 28, color: '#71717A', fontWeight: '900', textAlign: 'right' },
  resumeRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E4E4E7', paddingVertical: 12 }, resumeName: { color: '#09090B', fontWeight: '800' }, resumeCount: { color: '#0033CC', fontWeight: '900' }, reminder: { marginTop: 14, borderRadius: 24, backgroundColor: '#0033CC', padding: 22 }, reminderValue: { color: '#FAFAFA', fontSize: 36, fontWeight: '900' }, reminderText: { color: '#DBEAFE', fontSize: 16, fontWeight: '700' },
});