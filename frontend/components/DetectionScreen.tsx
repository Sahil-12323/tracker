import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
    setLoading(true); setMessage('');
    try {
      const app = await appApi.acceptDetection(detection.id); setDetection(null); onAccepted(app);
    } catch (e: any) { setMessage(e.message || 'Could not add detection.'); } finally { setLoading(false); }
  }

  async function ignore() {
    if (!detection) return;
    setLoading(true); setMessage('');
    try { await appApi.ignoreDetection(detection.id); setDetection(null); } catch (e: any) { setMessage(e.message || 'Could not ignore detection.'); } finally { setLoading(false); }
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>SMART DETECTION</Text>
      <Text style={styles.title}>Capture jobs from share text, Gmail, or screenshots<Text style={styles.blueDot}>.</Text></Text>
      <Text style={styles.subtitle}>We’ll extract the details and add it to your pipeline.</Text>

      <View style={styles.segment}>{(['share', 'screenshot', 'email'] as Source[]).map((s) => <Pressable key={s} testID={`source-${s}`} onPress={() => setSource(s)} style={[styles.segmentItem, source === s && styles.segmentActive]} {...webTest(`source-${s}`)}><Ionicons name={s === 'share' ? 'share-outline' : s === 'email' ? 'mail-outline' : 'image-outline'} size={22} color={source === s ? '#FFFFFF' : '#A1A1AA'} /><Text style={[styles.segmentText, source === s && styles.segmentTextActive]}>{s === 'email' ? 'EMAIL' : s.toUpperCase()}</Text></Pressable>)}</View>

      <Pressable onPress={pickScreenshot} style={styles.selectCard} testID="pick-screenshot-button" {...webTest('pick-screenshot-button')}>
        <View style={styles.dashedIcon}><Ionicons name="image-outline" size={28} color="#0A84FF" /></View>
        <View style={styles.selectCopy}><Text style={styles.selectTitle}>{imageBase64 ? 'Screenshot attached' : 'Select screenshot'}</Text><Text style={styles.selectMeta}>JPG, PNG or WebP  •  Max size 10MB</Text></View>
        <Ionicons name="chevron-forward" size={28} color="#A1A1AA" />
      </Pressable>

      <TextInput testID="detection-text-input" multiline value={text} onChangeText={setText} placeholder="Paste shared job text, email snippet, or OCR text..." placeholderTextColor="#71717A" style={styles.textarea} {...webTest('detection-text-input')} />

      {detection && <View style={styles.detectedWrap}>
        <View style={styles.detectedTop}><View style={styles.detectedBadge}><Ionicons name="sparkles" size={18} color="#22C55E" /><Text style={styles.detectedBadgeText}>Detected</Text></View><Pressable onPress={() => onEdit({ ...detection })} style={styles.editButton} testID="smart-detection-edit" {...webTest('smart-detection-edit')}><Ionicons name="pencil-outline" size={18} color="#0A84FF" /><Text style={styles.editText}>Edit</Text></Pressable></View>
        <View style={styles.detectedCard}><Text style={styles.jobTitle}>{detection.company_name} - {detection.role}</Text><InfoRow icon="calendar-outline" label="Applied on" value={formatDate(detection.applied_date)} /><InfoRow icon="link-outline" label="Source" value={detection.job_link || detection.source} /><View style={styles.quoteBox}><Text style={styles.quoteIcon}>“</Text><Text style={styles.quoteText}>{detection.raw_text_preview || text}</Text></View></View>
      </View>}

      <View style={styles.looksCard}><View style={styles.bulb}><Ionicons name="bulb-outline" size={26} color="#FFFFFF" /></View><View style={styles.looksCopy}><Text style={styles.looksTitle}>Looks good?</Text><Text style={styles.looksText}>We’ll extract the job details and add it to your pipeline.</Text></View><Pressable onPress={detection ? accept : parse} style={styles.viewDetails} testID="smart-detection-accept" {...webTest('smart-detection-accept')}><Text style={styles.viewText}>View details</Text><Ionicons name="chevron-forward" size={18} color="#0A84FF" /></Pressable></View>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {detection && <Pressable testID="smart-detection-ignore" onPress={ignore} style={styles.ignoreButton} {...webTest('smart-detection-ignore')}><Text style={styles.ignoreText}>Ignore detection</Text></Pressable>}
      <Pressable onPress={detection ? accept : parse} disabled={loading || !text.trim()} style={styles.primary} testID="parse-detection-button" {...webTest('parse-detection-button')}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="sparkles" size={24} color="#FFFFFF" /><Text style={styles.primaryText}>{detection ? 'Add to pipeline' : 'Analyze application'}</Text></>}</Pressable>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { return <View style={styles.infoRow}><Ionicons name={icon} size={20} color="#A1A1AA" /><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text></View>; }
function formatDate(date: string) { const parsed = new Date(date); return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }); }

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#050507' }, content: { padding: 20, paddingBottom: 180 }, kicker: { color: '#F5A623', fontSize: 14, fontWeight: '900', letterSpacing: 4 }, title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 14 }, blueDot: { color: '#0A84FF' }, subtitle: { color: '#A1A1AA', fontSize: 16, lineHeight: 23, fontWeight: '800', marginTop: 12, marginBottom: 20 },
  segment: { flexDirection: 'row', borderWidth: 1, borderColor: '#262633', backgroundColor: '#08080E', borderRadius: 22, padding: 3, minHeight: 58, marginBottom: 14 }, segmentItem: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, segmentActive: { backgroundColor: '#0A84FF', shadowColor: '#0A84FF', shadowOpacity: .55, shadowRadius: 16 }, segmentText: { color: '#A1A1AA', fontWeight: '900', fontSize: 12, letterSpacing: .6 }, segmentTextActive: { color: '#FFFFFF' },
  selectCard: { minHeight: 80, borderRadius: 22, borderWidth: 1, borderColor: '#252532', backgroundColor: '#101018', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }, dashedIcon: { width: 58, height: 50, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#3F3F46', alignItems: 'center', justifyContent: 'center' }, selectCopy: { flex: 1 }, selectTitle: { color: '#0A84FF', fontSize: 18, fontWeight: '900' }, selectMeta: { color: '#A1A1AA', fontSize: 12, fontWeight: '800', marginTop: 4 },
  textarea: { minHeight: 74, maxHeight: 88, textAlignVertical: 'top', borderRadius: 20, borderWidth: 1, borderColor: '#252532', backgroundColor: '#101018', color: '#FFFFFF', padding: 14, fontSize: 14, lineHeight: 20, marginBottom: 12 }, message: { color: '#A1A1AA', fontWeight: '700', marginBottom: 10 },
  detectedWrap: { borderRadius: 24, borderWidth: 1, borderColor: '#252532', backgroundColor: '#101018', padding: 14, marginBottom: 18 }, detectedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, detectedBadge: { borderRadius: 14, backgroundColor: 'rgba(34,197,94,.15)', paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', gap: 7, alignItems: 'center' }, detectedBadgeText: { color: '#22C55E', fontSize: 15, fontWeight: '900' }, editButton: { borderWidth: 1, borderColor: '#242E44', backgroundColor: '#111827', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7 }, editText: { color: '#0A84FF', fontWeight: '900' }, detectedCard: { borderRadius: 18, backgroundColor: '#171720', borderWidth: 1, borderColor: '#2A2A34', padding: 16 }, jobTitle: { color: '#0A84FF', fontSize: 22, lineHeight: 28, fontWeight: '900', marginBottom: 16 }, infoRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 10 }, infoLabel: { color: '#D4D4D8', width: 98, fontSize: 15, fontWeight: '800' }, infoValue: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, quoteBox: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#27272A', borderRadius: 16, backgroundColor: '#20202A', padding: 16, flexDirection: 'row', gap: 10 }, quoteIcon: { color: '#0A84FF', fontSize: 40, lineHeight: 40, fontWeight: '900' }, quoteText: { flex: 1, color: '#E4E4E7', fontSize: 15, lineHeight: 23, fontWeight: '700' },
  looksCard: { borderRadius: 22, backgroundColor: '#101820', borderWidth: 1, borderColor: '#1E293B', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }, bulb: { width: 50, height: 50, borderRadius: 17, backgroundColor: '#0A58C9', alignItems: 'center', justifyContent: 'center' }, looksCopy: { flex: 1 }, looksTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, looksText: { color: '#A1A1AA', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 }, viewDetails: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, borderWidth: 1, borderColor: '#1D2C49', paddingHorizontal: 10, minHeight: 40 }, viewText: { color: '#0A84FF', fontWeight: '900', fontSize: 12 },
  ignoreButton: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 18, marginBottom: 8 }, ignoreText: { color: '#A1A1AA', fontWeight: '900' }, primary: { minHeight: 62, borderRadius: 20, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: '#0A84FF', shadowOpacity: .55, shadowRadius: 22, flexDirection: 'row', gap: 10 }, primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
});