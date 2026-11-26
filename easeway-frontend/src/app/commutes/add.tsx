import { useEffect, useRef, useState } from 'react';

import 
{
  KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Card, Field, MessageBanner, PrimaryButton, SectionHeading } from '../../components/ui';
import { C, F } from '../../constants/theme';
import { useCommutes, type Commute, type TravelMode, formatTime } from '../../context/CommuteContext';
import type { NewCommute } from '../../services/commutes';
import { useAuth } from '../../context/AuthContext';
import { PlaceField } from '../../components/place-field';
import type { VerifiedPlace } from '../../services/places';

const weekdays = 
[
  { id: 1, label: 'M' }, 
  { id: 2, label: 'T' }, 
  { id: 3, label: 'W' },
  { id: 4, label: 'T' }, 
  { id: 5, label: 'F' },
  { id: 6, label: 'S' }, 
  { id: 7, label: 'S' },
];

export default function AddCommuteScreen() 
{
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  return id ? <EditCommuteLoader key={`${session.user.id}-${id}`} id={id} />
    : <CommuteForm key={session.user.id} />;
}

function EditCommuteLoader({ id }: { id: string }) {
  const { loadCommute } = useCommutes();
  const [commute, setCommute] = useState<Commute | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadCommute(id, controller.signal).then(saved => {
      if (!controller.signal.aborted) setCommute(saved);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load commute.');
    });
    return () => controller.abort();
  }, [id, loadCommute, attempt]);
  if (commute) return <CommuteForm initial={commute} />;
  return <SafeAreaView style={styles.screen}>
    <MessageBanner message={error || 'Loading commute...'} tone={error ? 'error' : 'info'} />
    {Boolean(error) && <PrimaryButton label="Retry" onPress={() => {
      setError('');
      setAttempt(current => current + 1);
    }} />}
    <PrimaryButton label="Back to commutes" onPress={() => router.replace('/commutes')} />
  </SafeAreaView>;
}

function CommuteForm({ initial }: { initial?: Commute }) {
  const { addCommute, editCommute, setFeedback, loading: commutesLoading } = useCommutes();
  const { session, loading } = useAuth();
  const [name, setName] = useState(initial?.name ?? '');
  const [origin, setOrigin] = useState<VerifiedPlace | { address: string } | null>(initial ? { address: initial.origin } : null);
  const [destination, setDestination] = useState<VerifiedPlace | { address: string } | null>(initial ? { address: initial.destination } : null);
  const [swapVersion, setSwapVersion] = useState(0);
  const [days, setDays] = useState(initial?.days ?? [ 1 ]);
  const [arrival, setArrival] = useState(() => {
    const value = new Date();
    const [hours, minutes] = (initial?.arrivalTime ?? '08:30').split(':').map(Number);
    value.setHours(hours, minutes, 0, 0);
    return value;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [buffer, setBuffer] = useState(initial?.bufferMinutes ?? 10);
  const mode: TravelMode = initial?.travelMode ?? 'driving';
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [webArrival, setWebArrival] = useState(initial?.arrivalTime ?? '08:30');
  useEffect(() => { setFeedback(null); }, [setFeedback]);

  const toggleDay = (id: number) => {
    setDays(current => current.includes(id)
      ? current.filter(day => day !== id)
      : [...current, id]);
  };

  const save = async () => {
    if (savingRef.current) return;
    if (!name.trim() || !origin || !destination || days.length === 0) {
      setError('Enter a name, select both verified locations and at least one day.');
      return;
    }
    if (name.trim().length > 100) {
      setError('Use a commute name with at most 100 characters.');
      return;
    }
    if (('place_id' in origin && 'place_id' in destination && origin.place_id === destination.place_id)
      || origin.address.toLowerCase() === destination.address.toLowerCase()) {
      setError('Starting and destination locations must be different.');
      return;
    }
    if (Platform.OS === 'web' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(webArrival)) {
      setError('Enter an arrival time in 24-hour HH:MM format.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const values: NewCommute = {
        name: name.trim(), origin: origin.address, destination: destination.address,
        days: [...days].sort((a, b) => a - b),
        arrivalTime: Platform.OS === 'web' ? webArrival
          : `${String(arrival.getHours()).padStart(2, '0')}:${String(arrival.getMinutes()).padStart(2, '0')}`,
        bufferMinutes: buffer, travelMode: mode,
      };
      if (initial) {
        const changes = Object.fromEntries(Object.entries(values).filter(([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(initial[key as keyof NewCommute]))) as Partial<NewCommute>;
        if (Object.keys(changes).length) await editCommute(initial.id, changes);
        else setFeedback({ text: 'No changes to save.', tone: 'info' });
        router.dismissTo({ pathname: '/commutes/[id]', params: { id: initial.id } });
      } else {
        await addCommute(values);
        router.replace('/commutes');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this commute.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading) return null;
  if (!session) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.replace('/commutes')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.topbarTitle}>{initial ? 'Edit commute' : 'Add commute'}</Text>
        <View style={{ width: 38 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.pageTitle}>{initial ? 'Update your recurring trip' : 'Plan a recurring trip'}</Text>

          <View style={styles.cardGap}>
            <Card>
              <Field label="Commute name" value={name} onChangeText={setName}
                placeholder="e.g. Work, BCIT, Gym" />
            </Card>

            <Card>
              <View style={styles.locationLayout}>
                <View style={styles.locationRail}>
                  <View style={styles.startDot} />
                  <View style={styles.dashedLine} />
                  <View style={styles.endDot} />
                </View>
                <View style={{ flex: 1, gap: 12 }}>
                  <PlaceField key={`origin-${swapVersion}`} label="From"
                    value={origin} onChange={setOrigin} disabled={saving} />
                  <PlaceField key={`destination-${swapVersion}`} label="To"
                    value={destination} onChange={setDestination} disabled={saving} />
                </View>
                <Pressable
                  accessibilityLabel="Swap origin and destination"
                  style={styles.swapButton}
                  disabled={saving}
                  onPress={() => {
                    setOrigin(destination);
                    setDestination(origin);
                    setSwapVersion(current => current + 1);
                  }}
                >
                  <Ionicons name="swap-vertical" size={18} color={C.blueLight} />
                </Pressable>
              </View>
            </Card>

            <Card>
              <SectionHeading title="Days" subtitle="When does this commute repeat?"
                icon="calendar-outline" />
              <View style={styles.daysRow}>
                {weekdays.map(day => {
                  const selected = days.includes(day.id);
                  return (
                    <Pressable key={day.id} onPress={() => toggleDay(day.id)}
                      style={[styles.day, selected && styles.daySelected]}>
                      <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
                        {day.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <Card>
              <SectionHeading title="Arrive by" subtitle="Target arrival time"
                icon="time-outline" color={C.violet} />
              {Platform.OS === 'web' ? (
                <TextInput accessibilityLabel="Arrival time (HH:MM)"
                  value={webArrival} onChangeText={setWebArrival}
                  placeholder="08:30" style={styles.locationInput} />
              ) : <Pressable onPress={() => setShowPicker(true)} style={styles.timeControl}>
                <Text style={styles.bigTime}>
                  {formatTime(arrival.getHours() * 60 + arrival.getMinutes())}
                </Text>
                <Ionicons name="chevron-down" color={C.violet} size={17} />
              </Pressable>}
              {showPicker && (
                <View>
                  <DateTimePicker
                    value={arrival} mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_event, value) => {
                      if (Platform.OS !== 'ios') setShowPicker(false);
                      if (value) setArrival(value);
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <Pressable onPress={() => setShowPicker(false)} style={styles.donePicker}>
                      <Text style={styles.doneText}>Done</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Card>

            <Card>
              <SectionHeading title="Arrival buffer"
                subtitle="How early do you want to arrive?"
                icon="timer-outline" color={C.violet} />
              <View style={styles.bufferRow}>
                <Text style={styles.bufferLabel}>Extra time</Text>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepButton}
                    onPress={() => setBuffer(current => Math.max(0, current - 1))}>
                    <Ionicons name="remove" size={19} color={C.blueLight} />
                  </Pressable>
                  <Text style={styles.bufferValue}>{buffer} min</Text>
                  <Pressable style={styles.stepButton}
                    onPress={() => setBuffer(current => Math.min(initial ? 120 : 60, current + 1))}>
                    <Ionicons name="add" size={19} color={C.blueLight} />
                  </Pressable>
                </View>
              </View>
            </Card>

            <MessageBanner message={error} />
            <PrimaryButton label={saving ? 'Saving...' : initial ? 'Save changes' : 'Save commute'}
              icon="checkmark" onPress={save}
              disabled={saving || commutesLoading || !origin || !destination} />
            <Text style={styles.previewNote}>
              {initial ? 'Changing the route refreshes its saved estimate. Schedule and buffer changes reuse it.'
                : 'One Google Maps estimate is saved with your commute. Live traffic is not included.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: {
    height: 59, paddingHorizontal: 18, borderBottomColor: C.line,
    borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backButton: { width: 38, height: 38, backgroundColor: '#1A222E',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  topbarTitle: { fontFamily: F.displayMedium, color: C.text, fontSize: 16 },
  content: { paddingHorizontal: 18, paddingTop: 25, paddingBottom: 36 },
  pageTitle: { fontFamily: F.displayMedium, fontSize: 23, color: C.text, letterSpacing: -0.6 },
  pageSubtitle: { fontFamily: F.regular, fontSize: 12, color: '#95B4DC', marginTop: 5 },
  cardGap: { gap: 14, marginTop: 21 },
  fieldLabel: { fontFamily: F.bold, color: '#819BC3', fontSize: 9, letterSpacing: 1.1 },
  locationLayout: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  locationRail: { width: 17, height: 100, alignItems: 'center', justifyContent: 'space-between' },
  startDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.blue, borderWidth: 3, borderColor: '#172946' },
  dashedLine: { flex: 1, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: '#8393A8', marginVertical: 3 },
  endDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.green },
  locationInput: {
    height: 32, color: C.text, fontFamily: F.medium, fontSize: 13,
    borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 4,
  },
  swapButton: {
    width: 34, height: 34, backgroundColor: 'rgba(99,140,255,0.11)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  day: {
    width: 34, height: 34, backgroundColor: C.input,
    borderWidth: 1, borderColor: C.inputLine, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  daySelected: { backgroundColor: C.green, borderColor: C.green },
  dayText: { fontFamily: F.bold, fontSize: 11, color: C.muted },
  dayTextSelected: { color: C.greenText },
  timeControl: { marginTop: 15, flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  bigTime: { fontFamily: F.display, fontSize: 32, color: C.text, letterSpacing: -1 },
  donePicker: { alignItems: 'flex-end', padding: 8 },
  doneText: { color: C.green, fontFamily: F.bold },
  bufferRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bufferLabel: { fontFamily: F.regular, color: C.muted, fontSize: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  stepButton: {
    width: 30, height: 30, backgroundColor: 'rgba(99,140,255,0.10)',
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  bufferValue: { fontFamily: F.bold, color: C.text, minWidth: 47, textAlign: 'center', fontSize: 12 },
  modeRow: { flexDirection: 'row', gap: 7, marginTop: 15 },
  mode: {
    flex: 1, minHeight: 60, paddingVertical: 9, borderWidth: 1,
    borderColor: C.inputLine, backgroundColor: C.input, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  modeSelected: { borderColor: C.green, backgroundColor: 'rgba(123,237,141,0.09)' },
  modeText: { fontFamily: F.medium, color: C.muted, fontSize: 10 },
  modeTextSelected: { color: C.green },
  previewNote: { fontFamily: F.regular, color: C.muted, fontSize: 10, textAlign: 'center' },
});
