import type { ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Brand, PrimaryButton } from '../../components/ui';
import { C, F } from '../../constants/theme';
import {
  useCommutes, departureMinutes, formatDays, formatTime,
  type Commute, toMinutes,
} from '../../context/CommuteContext';

type Icon = ComponentProps<typeof Ionicons>['name'];
const modeIcons: Record<Commute['travelMode'], Icon> = {
  driving: 'car-outline', transit: 'train-outline',
  bicycling: 'bicycle-outline', walking: 'walk-outline',
};

export default function CommutesScreen() {
  const { commutes, deleteCommute } = useCommutes();

  // UI-only deterministic preview. Only highlight the NEXT upcoming trip today.
  const now = new Date();
  const today = ((now.getDay() + 6) % 7) + 1; // Monday=1
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const next = commutes
    .filter(c => c.days.includes(today) && departureMinutes(c) >= currentMinutes)
    .sort((a, b) => departureMinutes(a) - departureMinutes(b))[0];

  const confirmDelete = (commute: Commute) => {
    Alert.alert('Delete commute?', `Remove ${commute.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCommute(commute.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          <Brand />

        </View>
        <Pressable onPress={() => router.replace('/login')}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>YOUR ROUTINE</Text>
        <View style={styles.introRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>All commutes</Text>
            <Text style={styles.description}>Keep the trips you make most often in one place.</Text>
          </View>
          <Pressable style={styles.addSquare} onPress={() => router.push('/commutes/add')}>
            <Ionicons name="add" size={22} color={C.greenText} />
          </Pressable>
        </View>

        <View style={styles.list}>
          {commutes.map(commute => (
            <View style={styles.commuteCard} key={commute.id}>
              <View style={styles.cardHeader}>
                <View style={styles.iconSquare}>
                  <Ionicons name={modeIcons[commute.travelMode]} size={21} color={C.blueLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commuteName}>{commute.name}</Text>
                  <Text style={styles.destination}>{commute.destination}</Text>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => confirmDelete(commute)}
                  accessibilityLabel={`Delete ${commute.name}`}
                >
                  <Ionicons name="trash-outline" size={17} color={C.muted} />
                </Pressable>
              </View>

              {next?.id === commute.id && (
                <View style={styles.departureBox}>
                  <View>
                    <Text style={styles.leaveLabel}>LEAVE AT</Text>
                    <Text style={styles.leaveTime}>{formatTime(departureMinutes(commute))}</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Upcoming</Text>
                  </View>
                </View>
              )}

              <View style={styles.metaRow}>
                <View style={styles.meta}>
                  <Ionicons name="calendar-outline" size={14} color={C.muted} />
                  <Text style={styles.metaText}>{formatDays(commute.days)}</Text>
                </View>
                <View style={styles.meta}>
                  <Ionicons name="time-outline" size={14} color={C.muted} />
                  <Text style={styles.metaText}>Arrive {formatTime(toMinutes(commute.arrivalTime))}</Text>
                </View>
                <View style={styles.meta}>
                  <Ionicons name="car-outline" size={14} color={C.muted} />
                  <Text style={styles.metaText}>{commute.durationMinutes} min</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {commutes.length === 0 ? (
          <Text style={styles.empty}>No commutes saved yet. Add your first regular trip.</Text>
        ) : !next ? (
          <Text style={styles.empty}>No upcoming departures remaining today.</Text>
        ) : null}

        
        <Text style={styles.previewNote}>UI preview • departure times use sample durations</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: {
    height: 62, paddingHorizontal: 18, borderBottomWidth: 1,
    borderBottomColor: C.line, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topbarTitle: { fontFamily: F.displayMedium, fontSize: 15, color: C.text },
  signOut: { color: C.green, fontFamily: F.bold, fontSize: 13 },
  content: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 36 },
  eyebrow: { color: C.green, fontFamily: F.bold, fontSize: 10, letterSpacing: 1 },
  introRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, marginBottom: 18, gap: 10 },
  title: { fontFamily: F.displayMedium, fontSize: 23, color: C.text, letterSpacing: -0.7 },
  description: { fontFamily: F.regular, fontSize: 12, color: '#95B4DC', marginTop: 4 },
  addSquare: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.green, borderRadius: 12,
  },
  list: { gap: 13, marginBottom: 16 },
  commuteCard: {
    borderRadius: 18, padding: 17, borderWidth: 1,
    borderColor: C.line, backgroundColor: C.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconSquare: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(99,140,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  commuteName: { fontFamily: F.displayMedium, color: C.text, fontSize: 14 },
  destination: { fontFamily: F.regular, fontSize: 10, color: '#95B4DC', marginTop: 2 },
  departureBox: {
    marginTop: 15, borderRadius: 13, padding: 14,
    borderWidth: 1, borderColor: 'rgba(123,237,141,0.14)',
    backgroundColor: 'rgba(123,237,141,0.05)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  leaveLabel: { fontFamily: F.bold, color: '#8FADD2', fontSize: 9, letterSpacing: 0.9 },
  leaveTime: { fontFamily: F.display, color: C.green, fontSize: 23, marginTop: 3 },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(123,237,141,0.12)', flexDirection: 'row',
    alignItems: 'center', gap: 6,
  },
  statusDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: C.green },
  statusText: { color: C.green, fontFamily: F.bold, fontSize: 9 },
  metaRow: {
    borderTopWidth: 1, borderTopColor: C.line,
    marginTop: 15, paddingTop: 12,
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: F.regular, fontSize: 10, color: '#89A0C2' },
  empty: { fontFamily: F.regular, fontSize: 11, color: C.muted, marginBottom: 15 },
  previewNote: {
    color: C.muted, fontFamily: F.regular, fontSize: 10,
    textAlign: 'center', marginTop: 15,
  },
});
