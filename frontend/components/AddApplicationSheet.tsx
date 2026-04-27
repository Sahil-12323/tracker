import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApplicationDraft, STATUSES, Status } from '../types';

const webTest = (id: string) => (Platform.OS === 'web' ? ({ 'data-testid': id } as any) : {});
const today = new Date().toISOString().slice(0, 10);
const blank: ApplicationDraft = { company_name: '', role: '', status: 'Applied', applied_date: today, job_link: '', notes: '', resume_version: '', follow_up_date: '', source: 'manual' };

export function AddApplicationSheet({ visible, initial, onClose, onSave }: { visible: boolean; initial?: Partial<ApplicationDraft>; onClose: () => void; onSave: (draft: ApplicationDraft) => void }) {
  const [draft, setDraft] = useState<ApplicationDraft>({ ...blank, ...initial });
  useEffect(() => { if (visible) setDraft({ ...blank, ...initial }); }, [visible, initial]);
  const update = (key: keyof ApplicationDraft, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const canSave = draft.company_name.trim() && draft.role.trim() && draft.applied_date.trim();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{initial?.company_name ? 'Confirm application' : 'Add application'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
            <Field label="Company Name" value={draft.company_name} onChangeText={(v) => update('company_name', v)} testID="company-input" />
            <Field label="Role" value={draft.role} onChangeText={(v) => update('role', v)} testID="role-input" />
            <Text style={styles.label}>Status</Text>
            <View style={styles.chips}>{STATUSES.map((s) => <Pressable key={s} testID={`status-chip-${s}`} onPress={() => update('status', s)} style={[styles.chip, draft.status === s && styles.chipActive]} {...webTest(`status-chip-${s}`)}><Text style={[styles.chipText, draft.status === s && styles.chipTextActive]}>{s}</Text></Pressable>)}</View>
            <Field label="Applied Date" value={draft.applied_date} onChangeText={(v) => update('applied_date', v)} testID="applied-date-input" />
            <Field label="Job Link" value={draft.job_link || ''} onChangeText={(v) => update('job_link', v)} testID="job-link-input" />
            <Field label="Resume Version" value={draft.resume_version || ''} onChangeText={(v) => update('resume_version', v)} testID="resume-input" />
            <Field label="Follow-up Date" value={draft.follow_up_date || ''} onChangeText={(v) => update('follow_up_date', v)} testID="follow-up-input" />
            <Text style={styles.label}>Notes</Text>
            <TextInput testID="notes-input" multiline value={draft.notes || ''} onChangeText={(v) => update('notes', v)} placeholder="Recruiter details, next steps, salary range..." placeholderTextColor="#A1A1AA" style={[styles.input, styles.notes]} {...webTest('notes-input')} />
          </ScrollView>
          <View style={styles.actions}>
            <Pressable testID="cancel-application-button" onPress={onClose} style={styles.secondary} {...webTest('cancel-application-button')}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
            <Pressable disabled={!canSave} onPress={() => onSave(draft)} style={[styles.primary, !canSave && styles.disabled]} testID="save-application-button" {...webTest('save-application-button')}><Text style={styles.primaryText}>Save</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, testID, ...props }: { label: string; value: string; onChangeText: (v: string) => void; testID: string }) {
  return <><Text style={styles.label}>{label}</Text><TextInput testID={testID} placeholder={label} placeholderTextColor="#A1A1AA" style={styles.input} {...props} {...webTest(testID)} /></>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.45)' },
  sheet: { maxHeight: '92%', minHeight: '58%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  handle: { width: 48, height: 5, borderRadius: 99, backgroundColor: '#D4D4D8', alignSelf: 'center', marginBottom: 18 }, title: { fontSize: 26, fontWeight: '800', color: '#09090B', marginBottom: 16 },
  form: { paddingBottom: 20, gap: 8 }, label: { color: '#71717A', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: .4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E4E4E7', backgroundColor: '#F4F4F5', borderRadius: 12, padding: 15, fontSize: 16, color: '#09090B' }, notes: { minHeight: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 }, chipActive: { backgroundColor: '#0033CC', borderColor: '#0033CC' }, chipText: { color: '#71717A', fontWeight: '800' }, chipTextActive: { color: '#FAFAFA' },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 12 }, secondary: { flex: 1, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: '#E4E4E7', alignItems: 'center', justifyContent: 'center' }, secondaryText: { fontWeight: '800', color: '#09090B' },
  primary: { flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: '#0033CC', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#FAFAFA', fontWeight: '900' }, disabled: { opacity: .45 },
});