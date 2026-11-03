import { useState, type ComponentProps } from 'react';

import 
{
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Card, Field, PrimaryButton, SectionHeading } from '../../components/ui';
import { C, F } from '../../constants/theme';
import { useCommutes, type TravelMode, formatTime } from '../../context/CommuteContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

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

const modes: { key: TravelMode; label: string; icon: IconName }[] = 
[
  { key: 'driving', label: 'Drive', icon: 'car-outline' },
  { key: 'transit', label: 'Transit', icon: 'train-outline' },
  { key: 'bicycling', label: 'Bike', icon: 'bicycle-outline' },
  { key: 'walking', label: 'Walk', icon: 'walk-outline' },
];

export default function AddCommuteScreen() 
{
  const { addCommute } = useCommutes();
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('Home');
  const [destination, setDestination] = useState('BCIT Burnaby');
  const [days, setDays] = useState([ 1 ]);
  const [arrival, setArrival] = useState(() => {
    const value = new Date();
    value.setHours(8, 30, 0, 0);
    return value;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [buffer, setBuffer] = useState(10);
  const [mode, setMode] = useState<TravelMode>('driving');

  const toggleDay = (id: number) => {
    setDays(current => current.includes(id)
      ? current.filter(day => day !== id)
      : [...current, id]);
  };

  const save = () => {
    if (!name.trim() || !origin.trim() || !destination.trim() || days.length === 0) {
      Alert.alert('Missing details', 'Enter a name, both locations and at least one day.');
      return;
    }
    // Sample travel durations for UI testing only, NOT live Google Maps ETAs.
    const sampleDurations: Record<TravelMode, number> = {
      driving: 45, transit: 55, bicycling: 40, walking: 65,
    };
    addCommute({
      name: name.trim(), origin: origin.trim(), destination: destination.trim(),
      days: [...days].sort((a, b) => a - b),
      arrivalTime: `${String(arrival.getHours()).padStart(2, '0')}:${String(arrival.getMinutes()).padStart(2, '0')}`,
      bufferMinutes: buffer, travelMode: mode,
      durationMinutes: sampleDurations[mode],
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.topbarTitle}>Add commute</Text>
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
          <Text style={styles.pageTitle}>Plan a recurring trip</Text>

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
                  <View>
                    <Text style={styles.fieldLabel}>FROM</Text>
                    <TextInput
                      value={origin} onChangeText={setOrigin}
                      placeholder="Starting address" placeholderTextColor={C.placeholder}
                      style={styles.locationInput}
                    />
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>TO</Text>
                    <TextInput
                      value={destination} onChangeText={setDestination}
                      placeholder="Destination address" placeholderTextColor={C.placeholder}
                      style={styles.locationInput}
                    />
                  </View>
                </View>
                <Pressable
                  accessibilityLabel="Swap origin and destination"
                  style={styles.swapButton}
                  onPress={() => { setOrigin(destination); setDestination(origin); }}
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
              <Pressable onPress={() => setShowPicker(true)} style={styles.timeControl}>
                <Text style={styles.bigTime}>
                  {formatTime(arrival.getHours() * 60 + arrival.getMinutes())}
                </Text>
                <Ionicons name="chevron-down" color={C.violet} size={17} />
              </Pressable>
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
                    onPress={() => setBuffer(current => Math.min(60, current + 1))}>
                    <Ionicons name="add" size={19} color={C.blueLight} />
                  </Pressable>
                </View>
              </View>
            </Card>

           {/** <Card>
              <SectionHeading title="Travel mode" subtitle="How are you travelling?"
                icon="car-outline" color={C.green} />
              <View style={styles.modeRow}>
                {modes.map(item => {
                  const selected = mode === item.key;
                  return (
                    <Pressable key={item.key} onPress={() => setMode(item.key)}
                      style={[styles.mode, selected && styles.modeSelected]}>
                      <Ionicons name={item.icon} size={20} color={selected ? C.green : C.muted} />
                      <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card> */}

            <PrimaryButton label="Save commute" icon="checkmark" onPress={save} />
            <Text style={styles.previewNote}>Saved to temporary UI state • not the database yet</Text>
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
