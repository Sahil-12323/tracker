import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Analytics, STATUSES, Status } from '../types';

const statusMeta: Record<Status, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Applied: { color: '#0A84FF', bg: 'rgba(10,132,255,.15)', icon: 'briefcase-outline' },
  Screening: { color: '#A855F7', bg: 'rgba(168,85,247,.16)', icon: 'search-outline' },
  Interview: { color: '#F59E0B', bg: 'rgba(245,158,11,.16)', icon: 'calendar-outline' },
  Offer: { color: '#22C55E', bg: 'rgba(34,197,94,.16)', icon: 'gift-outline' },
  Rejected: { color: '#EF4444', bg: 'rgba(239,68,68,.16)', icon: 'close-circle-outline' },
};

export function AnalyticsScreen({ analytics }: { analytics: Analytics | null }) {
  const total = analytics?.total || 0;
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>ANALYTICS</Text><Text style={styles.title}>Measure what is moving<Text style={styles.blueDot}>.</Text></Text><Text style={styles.subtitle}>Track your pipeline and focus on what matters.</Text>
      <View style={styles.grid}>
        <Metric icon="briefcase-outline" tone="#0A84FF" label="Total" value={total} caption="All applications" />
        <Metric icon="person-outline" tone="#22C55E" label="Active" value={analytics?.active || 0} caption="0 vs last 30 days" />
        <Metric icon="calendar-outline" tone="#A855F7" label="Interviews" value={analytics?.interviews || 0} caption="0 scheduled" />
        <Metric icon="star-outline" tone="#F59E0B" label="Offers" value={`${analytics?.success_rate || 0}%`} caption="Offer rate" />
      </View>
      <View style={styles.pipelineCard}><Text style={styles.cardTitle}>Pipeline distribution</Text><Text style={styles.cardSubtitle}>See how your applications are moving through the pipeline.</Text>{STATUSES.map((s) => { const count = analytics?.by_status?.[s] || 0; const pct = total ? Math.round((count / total) * 100) : 0; const fill = Math.max(pct, 8); const meta = statusMeta[s]; return <View key={s} style={styles.barRow}><View style={[styles.barIcon, { backgroundColor: meta.bg }]}><Ionicons name={meta.icon} size={23} color={meta.color} /></View><Text style={styles.barLabel}>{s}</Text><View style={styles.barTrack}><View style={[styles.barFill, { width: `${fill}%`, backgroundColor: meta.color }]} /></View><Text style={styles.barCount}>{count} <Text style={styles.percent}>({pct}%)</Text></Text></View>; })}<View style={styles.pipelineFooter}><FooterTip icon="trending-up-outline" title="No data yet" body="Start adding applications to see your analytics here." /><View style={styles.footerDivider} /><FooterTip icon="sparkles-outline" title="Tip" body="Keep your pipeline updated to get accurate insights." /></View></View>
      <View style={styles.resumeCard}><Text style={styles.cardTitle}>Resume versions</Text>{Object.entries(analytics?.by_resume || { Unspecified: 0 }).map(([name, count]) => <View key={name} style={styles.resumeRow}><Text style={styles.resumeName}>{name}</Text><Text style={styles.resumeCount}>{count}</Text></View>)}</View>
    </ScrollView>
  );
}

function Metric({ icon, tone, label, value, caption }: { icon: keyof typeof Ionicons.glyphMap; tone: string; label: string; value: string | number; caption: string }) { return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${tone}24` }]}><Ionicons name={icon} size={26} color={tone} /></View><View style={styles.metricCopy}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><View style={styles.captionRow}><View style={[styles.captionDot, { backgroundColor: tone }]} /><Text style={styles.metricCaption}>{caption}</Text></View></View></View>; }
function FooterTip({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) { return <View style={styles.footerTip}><View style={styles.footerIcon}><Ionicons name={icon} size={24} color="#0A84FF" /></View><View style={{ flex: 1 }}><Text style={styles.footerTitle}>{title}</Text><Text style={styles.footerBody}>{body}</Text></View></View>; }

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#050507' }, content: { padding: 20, paddingBottom: 128 }, kicker: { color: '#F5A623', fontSize: 14, fontWeight: '900', letterSpacing: 4 }, title: { color: '#FFFFFF', fontSize: 40, lineHeight: 48, fontWeight: '900', marginTop: 18 }, blueDot: { color: '#0A84FF' }, subtitle: { color: '#A1A1AA', fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, metric: { width: '48%', minHeight: 128, backgroundColor: '#101018', borderWidth: 1, borderColor: '#252532', borderRadius: 24, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, metricIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, metricCopy: { flex: 1, minWidth: 0 }, metricValue: { color: '#FFFFFF', fontSize: 31, lineHeight: 35, fontWeight: '900' }, metricLabel: { color: '#D4D4D8', fontSize: 14, fontWeight: '900', marginTop: 4 }, captionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 }, captionDot: { width: 7, height: 7, borderRadius: 99 }, metricCaption: { color: '#A1A1AA', fontSize: 11, fontWeight: '800', flexShrink: 1 },
  pipelineCard: { backgroundColor: '#101018', borderRadius: 24, borderWidth: 1, borderColor: '#252532', padding: 16, marginTop: 18 }, cardTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' }, cardSubtitle: { color: '#A1A1AA', fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: 8, marginBottom: 18 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 }, barIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, barLabel: { width: 86, color: '#FFFFFF', fontSize: 17, fontWeight: '900' }, barTrack: { flex: 1, height: 13, borderRadius: 99, backgroundColor: '#2A2832', overflow: 'hidden' }, barFill: { height: 13, borderRadius: 99 }, barCount: { width: 62, color: '#FFFFFF', fontSize: 15, fontWeight: '900', textAlign: 'right' }, percent: { color: '#A1A1AA' },
  pipelineFooter: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#292933', paddingTop: 18, flexDirection: 'row', gap: 12 }, footerTip: { flex: 1, flexDirection: 'row', gap: 10 }, footerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#0B1B32', alignItems: 'center', justifyContent: 'center' }, footerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, footerBody: { color: '#A1A1AA', fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 4 }, footerDivider: { width: 1, backgroundColor: '#292933' },
  resumeCard: { backgroundColor: '#101018', borderRadius: 24, borderWidth: 1, borderColor: '#252532', padding: 18, marginTop: 18 }, resumeRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#27272A', paddingVertical: 12 }, resumeName: { color: '#FFFFFF', fontWeight: '800' }, resumeCount: { color: '#0A84FF', fontWeight: '900' },
});