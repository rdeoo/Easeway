import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Brand } from '../../components/ui';
import { C, F } from '../../constants/theme';
import { modeIcons } from '../../constants/travel-modes';
import {
  useCommutes, departureMinutes, formatDays, formatTime,
  toMinutes,
} from '../../context/CommuteContext';
import { useAuth } from '../../context/AuthContext';
import { departureToday } from '../../utils/commute-time';

export default function CommutesScreen() {
  const { commutes, loading, error: loadError, retry, deleteCommute } = useCommutes();
  const { session, loading: authLoading, signOut } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const today = ((now.getDay() + 6) % 7) + 1; // Monday=1
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const next = commutes
    .flatMap(commute => {
      const departure = departureToday(commute, today, currentMinutes);
      return departure !== null
        ? [{ id: commute.id, departure }] : [];
    })
    .sort((a, b) => a.departure - b.departure)[0];

  const confirmDelete = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await deleteCommute(id);
      setDeletingId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete commute.');
    } finally {
      setBusy(false);
    }
  };

  const logOut = async () => {
    setError('');
    try {
      await signOut();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign out.');
    }
  };

  if (authLoading) return null;
  if (!session) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          <Brand />

        </View>
        <Pressable onPress={logOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>YOUR ROUTINE</Text>
        {loading && <Text style={styles.empty}>Loading saved commutes...</Text>}
        {(error || loadError) && (
          <View>
            <Text accessibilityRole="alert" style={styles.empty}>{error || loadError}</Text>
            {loadError && <Pressable onPress={retry}><Text style={styles.signOut}>Retry</Text></Pressable>}
          </View>
        )}
        <View style={styles.introRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>All commutes</Text>
            <Text style={styles.description}>Keep the trips you make most often in one place.</Text>
          </View>
          <Pressable accessibilityLabel="Add commute" accessibilityRole="button"
            style={styles.addSquare} onPress={() => router.push('/commutes/add')}>
            <Ionicons name="add" size={22} color={C.greenText} />
          </Pressable>
        </View>

        <View style={styles.list}>
          {commutes.map(commute => {
            const departure = departureMinutes(commute);
            return (
            <Pressable
              style={({ pressed }) => [styles.commuteCard, pressed && { opacity: 0.85 }]}
              key={commute.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${commute.name} route`}
              onPress={() => router.push({ pathname: '/commutes/[id]', params: { id: commute.id } })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconSquare}>
                  <Ionicons name={modeIcons[commute.travelMode]} size={21} color={C.blueLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commuteName}>{commute.name}</Text>
                  <Text style={styles.destination}>From {commute.origin}</Text>
                  <Text style={styles.destination}>{commute.destination}</Text>
                </View>
                <Pressable
                  hitSlop={10}
                  disabled={busy}
                  onPress={() => setDeletingId(commute.id)}
                  accessibilityLabel={`Delete ${commute.name}`}
                >
                  <Ionicons name="trash-outline" size={17} color={C.muted} />
                </Pressable>
                <Ionicons name="chevron-forward" size={17} color={C.muted} />
              </View>

              {deletingId === commute.id && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>Delete this commute?</Text>
                  <Pressable disabled={busy} onPress={() => confirmDelete(commute.id)}>
                    <Text style={styles.signOut}>{busy ? 'Deleting...' : 'Delete'}</Text>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => setDeletingId(null)}>
                    <Text style={styles.metaText}>Cancel</Text>
                  </Pressable>
                </View>
              )}
              {departure !== null ? (
                <View style={styles.departureBox}>
                  <View>
                    <Text style={styles.leaveLabel}>LEAVE AT</Text>
                    <Text style={styles.leaveTime}>{formatTime(departure)}</Text>
                    {departure < 0 && <Text style={styles.metaText}>
                      {Math.ceil(-departure / 1440)} day(s) before arrival
                    </Text>}
                  </View>
                  {next?.id === commute.id && <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Upcoming</Text>
                  </View>}
                </View>
              ) : <Text style={styles.empty}>No saved travel estimate for this commute.</Text>}

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
                  <Text style={styles.metaText}>
                    {commute.estimatedDurationSeconds === null ? 'Estimate unavailable'
                      : `${Math.ceil(commute.estimatedDurationSeconds / 60)} min`}
                  </Text>
                </View>
              </View>
            </Pressable>
          ); })}
        </View>

        {commutes.length === 0 ? (
          <Text style={styles.empty}>No commutes saved yet. Add your first regular trip.</Text>
        ) : !next ? (
          <Text style={styles.empty}>No upcoming departures remaining today.</Text>
        ) : null}

        
        <Text style={styles.previewNote}>
          Google Maps estimates without live traffic. Departure includes your arrival buffer.
          Open a commute to see its route and live traffic before departure.
          Work and Evening class are local examples with verified locations.
        </Text>
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
