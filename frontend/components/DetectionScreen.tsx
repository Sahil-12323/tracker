import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { IMAGES } from '../constants/assets';
import { appApi } from '../lib/api';
import { Application, ApplicationDraft, Detection, Source } from '../types';

const webTest = (id: string) => (Platform.OS === 'web' ? ({ 'data-testid': id } as any) : {});

export function DetectionScreen({ initialText, onAccepted, onEdit }: { initialText?: string; onAccepted: (app: Application) => void; onEdit: (draft: ApplicationDraft) => void }) {
  const [source, setSource] = useState<Source>('share');
  const [text, setText] = useState('Amazon - Software Engineer\nThank you for applying on 2026-04-26. https://amazon.jobs/example');
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [detection, setDetection] = useState<Detection | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (initialText) { setSource('share'); setText(initialText); } }, [initialText]);

  async function pickScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.35 });
    if (!result.canceled) { setSource('screenshot'); setImageBase64(result.assets[0].base64 || undefined); setMessage('Screenshot attached. Paste visible text below for OCR review.'); }
  }

  async function parse() {
    setLoading(true); setMessage('');
    try { setDetection(await appApi.parseDetection(source, text, imageBase64)); } catch (e: any) { setMessage(e.message); } finally { setLoading(false); }
  }

  async function accept() {
    if (!detection) return;
    const app = await appApi.acceptDetection(detection.id); setDetection(null); onAccepted(app);
  }

  async function ignore() {
    if (!detection) return;
    await appApi.ignoreDetection(detection.id); setDetection(null);
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>SMART DETECTION</Text><Text style={styles.title}>Capture jobs from share text, Gmail, or screenshots.</Text>
      <View style={styles.sourceRow}>{(['share', 'screenshot', 'email'] as Source[]).map((s) => <Pressable key={s} testID={`source-${s}`} onPress={() => setSource(s)} style={[styles.source, source === s && styles.sourceActive]} {...webTest(`source-${s}`)}><Text style={[styles.sourceText, source === s && styles.sourceTextActive]}>{s.toUpperCase()}</Text></Pressable>)}</View>
      <Pressable onPress={pickScreenshot} style={styles.attach} testID="pick-screenshot-button" {...webTest('pick-screenshot-button')}><Ionicons name="image-outline" size={20} color="#0033CC" /><Text style={styles.attachText}>{imageBase64 ? 'Screenshot attached' : 'Select screenshot'}</Text></Pressable>
      <TextInput testID="detection-text-input" multiline value={text} onChangeText={setText} placeholder="Paste shared job text, email snippet, or OCR text..." placeholderTextColor="#71717A" style={styles.textarea} {...webTest('detection-text-input')} />
      {!!message && <Text style={styles.message}>{message}</Text>}
      <Pressable onPress={parse} disabled={loading || !text.trim()} style={styles.primary} testID="parse-detection-button" {...webTest('parse-detection-button')}>{loading ? <ActivityIndicator color="#FAFAFA" /> : <Text style={styles.primaryText}>Analyze application</Text>}</Pressable>
      <Modal visible={!!detection} transparent animationType="slide" onRequestClose={() => setDetection(null)}>
        <View style={styles.overlay}><View style={styles.sheet}><View style={styles.handle} /><Image source={{ uri: IMAGES.detection }} style={styles.hero} /><Text style={styles.sheetTitle}>Detected application</Text>
          {detection && <><Row label="Company" value={detection.company_name} /><Row label="Role" value={detection.role} /><Row label="Status" value={detection.status} /><Row label="Date" value={detection.applied_date} /><Text style={styles.config}>{detection.config_message}</Text></>}
          <View style={styles.actions}><Pressable testID="smart-detection-ignore" onPress={ignore} style={styles.secondary} {...webTest('smart-detection-ignore')}><Text style={styles.secondaryText}>Ignore</Text></Pressable><Pressable testID="smart-detection-edit" onPress={() => { if (detection) { setDetection(null); onEdit({ ...detection }); } }} style={styles.secondary} {...webTest('smart-detection-edit')}><Text style={styles.secondaryText}>Edit</Text></Pressable><Pressable onPress={accept} style={styles.confirm} testID="smart-detection-accept" {...webTest('smart-detection-accept')}><Text style={styles.confirmText}>Add</Text></Pressable></View>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value || '—'}</Text></View>; }

const styles = StyleSheet.create({
  wrap: { flex: 1 }, content: { padding: 20, paddingBottom: 120 }, kicker: { color: '#3366FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.8 }, title: { color: '#09090B', fontSize: 30, lineHeight: 36, fontWeight: '900', marginTop: 8, marginBottom: 20 },
  sourceRow: { flexDirection: 'row', gap: 8, marginBottom: 12 }, source: { flex: 1, borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }, sourceActive: { backgroundColor: '#0033CC', borderColor: '#0033CC' }, sourceText: { color: '#71717A', fontWeight: '900' }, sourceTextActive: { color: '#FAFAFA' },
  attach: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#E4E4E7', padding: 16, marginBottom: 12 }, attachText: { color: '#0033CC', fontWeight: '900' }, textarea: { minHeight: 190, textAlignVertical: 'top', borderRadius: 18, borderWidth: 1, borderColor: '#E4E4E7', backgroundColor: '#F4F4F5', color: '#09090B', padding: 16, fontSize: 16 }, message: { color: '#71717A', fontWeight: '700', marginTop: 12 }, primary: { minHeight: 56, borderRadius: 16, backgroundColor: '#0033CC', alignItems: 'center', justifyContent: 'center', marginTop: 16 }, primaryText: { color: '#FAFAFA', fontSize: 16, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, minHeight: '54%' }, handle: { width: 48, height: 5, borderRadius: 99, backgroundColor: '#D4D4D8', alignSelf: 'center', marginBottom: 16 }, hero: { width: '100%', height: 130, borderRadius: 22, marginBottom: 18 }, sheetTitle: { color: '#09090B', fontSize: 26, fontWeight: '900' }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#E4E4E7', paddingVertical: 12 }, rowLabel: { color: '#71717A', fontWeight: '800' }, rowValue: { color: '#09090B', fontWeight: '900', flex: 1, textAlign: 'right' }, config: { color: '#71717A', marginTop: 12, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 10, paddingTop: 18 }, secondary: { flex: 1, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: '#E4E4E7', alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: '#09090B', fontWeight: '900' }, confirm: { flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: '#0033CC', alignItems: 'center', justifyContent: 'center' }, confirmText: { color: '#FAFAFA', fontWeight: '900' },
});