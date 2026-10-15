import { router } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EasewayIcon } from '@/components/easeway-icon';
import { easeway as c } from '@/constants/easeway-theme';
import { useCommute } from '@/hooks/commute-provider';

function Field({ label, value, onChangeText, editable = true, numeric = false }: {
  label: string; value: string; onChangeText: (value: string) => void; editable?: boolean; numeric?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} editable={editable}
        keyboardType={numeric ? 'number-pad' : 'default'} autoCapitalize="none"
        placeholderTextColor={c.muted} selectionColor={c.green}
        style={[styles.input, !editable && { color: c.muted }]} />
    </View>
  );
}

export default function CommutesScreen() {
  const { inputs, update, planCommute, live, error, busy } = useCommute();

  async function submit() {
    if (await planCommute()) router.replace('/');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={styles.overline}>YOUR DAILY JOURNEY</Text>
        <Text accessibilityRole="header" style={styles.title}>Plan your commute</Text>
        <Text style={styles.description}>Choose when to arrive. We&apos;ll work back from there.</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.driving}>
          <EasewayIcon name="car" color={c.green} size={20} />
          <Text style={styles.cardTitle}>Driving commute</Text>
        </View>
        {!live ? <View style={styles.notice}><Text style={styles.noticeText}>Demo: Waterfront Station to BCIT Burnaby with illustrative duration and distance, not measured route estimates. {Platform.OS === 'web' ? 'Add a Google Maps key to enter your own addresses.' : 'Use the browser preview with a Google Maps key for live routes.'}</Text></View> : null}
        <Field label="Starting point" value={inputs.origin} onChangeText={(value) => update('origin', value)} editable={live} />
        <Field label="Destination" value={inputs.destination} onChangeText={(value) => update('destination', value)} editable={live} />
        <Field label="Arrival date (YYYY-MM-DD)" value={inputs.date} onChangeText={(value) => update('date', value)} />
        <Field label="Arrive by (24-hour)" value={inputs.time} onChangeText={(value) => update('time', value)} />
        <Text style={styles.hint}>All times use this device&apos;s local timezone.</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.bufferTitle}><EasewayIcon name="clock" color={c.violet} /><Text style={styles.cardTitle}>A little extra time</Text></View>
        <Text style={styles.description}>For parking, walking in, or a moment to yourself.</Text>
        <View style={styles.bufferRow}>
          {[0, 5, 10, 15].map((minutes) => (
            <Pressable key={minutes} accessibilityRole="button" accessibilityLabel={`${minutes} minute buffer`}
              accessibilityState={{ selected: inputs.buffer === String(minutes) }} onPress={() => update('buffer', String(minutes))}
              style={[styles.bufferChip, inputs.buffer === String(minutes) && styles.modeSelected]}>
              <Text style={[styles.modeText, inputs.buffer === String(minutes) && { color: c.green }]}>{minutes} min</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Custom buffer (0-180 minutes)" value={inputs.buffer} onChangeText={(value) => update('buffer', value)} numeric />
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={submit}
        style={({ pressed }) => [styles.button, (busy || pressed) && { opacity: 0.6 }]}>
        {busy ? <ActivityIndicator color={c.canvas} /> : <EasewayIcon name="clock" color={c.canvas} size={20} />}
        <Text style={styles.buttonText}>{busy ? 'Finding your route...' : 'Find my departure time'}</Text>
      </Pressable>
      <Text style={styles.hint}>One commute at a time. Plans stay in memory while the app is open; accounts and saved schedules are not yet available.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas },
  content: { padding: 18, paddingBottom: 28, gap: 18 },
  overline: { color: c.muted, fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  title: { color: c.text, fontSize: 27, fontWeight: '700', letterSpacing: -0.8, marginTop: 6 },
  description: { color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  card: { padding: 16, gap: 16, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.line },
  cardTitle: { color: c.text, fontSize: 15, fontWeight: '600' },
  field: { gap: 8 },
  label: { color: '#c8d2df', fontSize: 12, fontWeight: '500' },
  input: { color: c.text, backgroundColor: c.inset, borderWidth: 1, borderColor: '#344052', borderRadius: 10, padding: 13, minHeight: 48, fontSize: 14 },
  driving: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  modeSelected: { backgroundColor: c.greenSoft, borderColor: '#4c8e69' },
  modeText: { color: c.muted, fontSize: 12, fontWeight: '600' },
  notice: { backgroundColor: '#312a1c', padding: 12, borderRadius: 10 },
  noticeText: { color: '#e8c47e', fontSize: 11, lineHeight: 18 },
  hint: { color: c.muted, fontSize: 11, lineHeight: 18 },
  bufferTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bufferRow: { flexDirection: 'row', gap: 8 },
  bufferChip: { flex: 1, minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  error: { color: c.red, fontSize: 13, lineHeight: 20 },
  button: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.green },
  buttonText: { color: c.canvas, fontSize: 14, fontWeight: '700' },
});
