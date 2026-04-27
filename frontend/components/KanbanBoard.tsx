import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { IMAGES } from '../constants/assets';
import { Application, STATUSES, Status } from '../types';

const statusColor: Record<Status, string> = { Applied: '#71717A', Screening: '#EAB308', Interview: '#3B82F6', Offer: '#22C55E', Rejected: '#EF4444' };
const webTest = (id: string) => (Platform.OS === 'web' ? ({ 'data-testid': id } as any) : {});

export function KanbanBoard({ applications, onStatusChange, onOpenAdd }: { applications: Application[]; onStatusChange: (id: string, status: Status) => void; onOpenAdd: () => void }) {
  const { width } = useWindowDimensions();
  const [activeDrag, setActiveDrag] = useState<Application | null>(null);
  const columnWidth = Math.min(width - 48, 390);

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View><Text style={styles.kicker}>PIPELINE</Text><Text style={styles.title}>Your applications</Text></View>
        <Pressable onPress={onOpenAdd} style={styles.add} testID="add-application-button" {...webTest('add-application-button')}><Ionicons name="add" size={24} color="#FAFAFA" /></Pressable>
      </View>
      {activeDrag && <Text style={styles.dragHint}>Selected {activeDrag.company_name}. Tap a column title to move it.</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={columnWidth + 14} decelerationRate="fast" contentContainerStyle={styles.columns}>
        {STATUSES.map((status) => {
          const cards = applications.filter((a) => a.status === status);
          return (
            <View key={status} style={[styles.column, { width: columnWidth }]} testID={`kanban-column-${status.toLowerCase()}`} {...webTest(`kanban-column-${status.toLowerCase()}`)}>
              <Pressable onPress={() => activeDrag && onStatusChange(activeDrag.id, status)} style={styles.columnHeader}>
                <View style={[styles.dot, { backgroundColor: statusColor[status] }]} /><Text style={styles.columnTitle}>{status}</Text><Text style={styles.count}>{cards.length}</Text>
              </Pressable>
              {cards.length === 0 ? <EmptyColumn /> : cards.map((card) => <JobCard key={card.id} app={card} active={activeDrag?.id === card.id} onLongPress={() => setActiveDrag(card)} onStatusChange={onStatusChange} />)}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function JobCard({ app, active, onLongPress, onStatusChange }: { app: Application; active: boolean; onLongPress: () => void; onStatusChange: (id: string, status: Status) => void }) {
  return (
    <Pressable onLongPress={onLongPress} style={[styles.card, active && styles.cardActive]} testID={`job-card-${app.id}`} {...webTest(`job-card-${app.id}`)}>
      <View style={styles.cardTop}><Text style={styles.company}>{app.company_name}</Text><Ionicons name="briefcase-outline" size={18} color="#71717A" /></View>
      <Text style={styles.role}>{app.role}</Text><Text style={styles.date}>Applied {app.applied_date}</Text>
      {!!app.resume_version && <Text style={styles.resume}>Resume: {app.resume_version}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moveRow}>
        {STATUSES.filter((s) => s !== app.status).map((s) => <Pressable key={s} testID={`move-${app.id}-${s}`} onPress={() => onStatusChange(app.id, s)} style={styles.movePill} {...webTest(`move-${app.id}-${s}`)}><Text style={styles.moveText}>{s}</Text></Pressable>)}
      </ScrollView>
    </Pressable>
  );
}

function EmptyColumn() {
  return <View style={styles.empty}><Image source={{ uri: IMAGES.empty }} style={styles.emptyImage} /><Text style={styles.emptyText}>No cards here yet.</Text></View>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1 }, hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 },
  kicker: { color: '#3366FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.8 }, title: { color: '#09090B', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  add: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#0033CC', alignItems: 'center', justifyContent: 'center' }, dragHint: { color: '#0033CC', fontWeight: '800', paddingHorizontal: 20, marginBottom: 8 },
  columns: { gap: 14, paddingHorizontal: 20, paddingBottom: 120 }, column: { backgroundColor: '#F4F4F5', borderRadius: 24, padding: 14, borderWidth: 1, borderColor: '#E4E4E7' },
  columnHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }, dot: { width: 10, height: 10, borderRadius: 99 }, columnTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: '#09090B' }, count: { color: '#71717A', fontWeight: '900' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E4E4E7', padding: 16, marginBottom: 12 }, cardActive: { borderColor: '#0033CC', borderWidth: 2, transform: [{ scale: .99 }] }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  company: { fontSize: 18, fontWeight: '900', color: '#09090B' }, role: { color: '#3F3F46', fontSize: 16, marginTop: 6 }, date: { color: '#71717A', marginTop: 12, fontWeight: '700' }, resume: { color: '#0033CC', marginTop: 8, fontWeight: '800' }, moveRow: { gap: 8, paddingTop: 14 },
  movePill: { borderRadius: 999, backgroundColor: '#F4F4F5', paddingHorizontal: 12, paddingVertical: 9 }, moveText: { fontSize: 12, fontWeight: '900', color: '#3F3F46' }, empty: { alignItems: 'center', paddingVertical: 28 }, emptyImage: { width: 190, height: 128, borderRadius: 18 }, emptyText: { color: '#71717A', marginTop: 12, fontWeight: '800' },
});