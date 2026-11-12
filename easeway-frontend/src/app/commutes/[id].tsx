import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { C, F } from '../../constants/theme';
import { modeIcons, modeLabels } from '../../constants/travel-modes';
import {
  formatDays, formatTime, toMinutes, useCommutes, type Commute,
} from '../../context/CommuteContext';
import { useAuth } from '../../context/AuthContext';
import { ConfirmationDialog, MessageBanner } from '../../components/ui';
import { getTrafficEstimate, type TrafficEstimate } from '../../services/maps';
import {
  departureBefore, isInTrafficWindow, nextTrip, trafficWindowStart,
} from '../../utils/commute-time';

const TRAFFIC_REFRESH_MS = 5 * 60_000;

type Icon = ComponentProps<typeof Ionicons>['name'];
type TrafficResult = {
  estimate: TrafficEstimate;
  fetchedAt: Date;
  tripKey: number;
  source: 'auto' | 'developer';
};

function clock(date: Date) {
  return formatTime(date.getHours() * 60 + date.getMinutes());
}

function dayLabel(date: Date, now: Date) {
  const days = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000,
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function duration(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function distance(meters: number) {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

function message(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

export default function CommuteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();

  if (authLoading) return null;
  if (!session) return <Redirect href="/login" />;
  return <SavedCommuteScreen key={`${session.user.id}-${id}`} id={id} />;
}

function SavedCommuteScreen({ id }: { id: string }) {
  const { loadCommute, feedback, setFeedback } = useCommutes();
  const [saved, setSaved] = useState<Commute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [confirmEdit, setConfirmEdit] = useState(false);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    loadCommute(id, controller.signal).then(commute => {
      if (!controller.signal.aborted) setSaved(commute);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(message(cause, 'Could not load commute.'));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
    // The retry counter deliberately restarts the focused request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadCommute, attempt]));
  const commute = saved;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topbar}>
        <Pressable
          accessibilityRole="button" accessibilityLabel="Back to commutes" hitSlop={10}
          onPress={() => router.dismissTo('/commutes')}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
          <Text style={styles.backText}>Commutes</Text>
        </Pressable>
        {commute && !loading && !error && <Pressable
          accessibilityRole="button" accessibilityLabel="Edit commute"
          onPress={() => setConfirmEdit(true)}
          style={styles.editButton}
        >
          <Text style={styles.backText}>Edit</Text>
        </Pressable>}
      </View>
      {feedback && <View style={styles.feedback}>
        <MessageBanner compact message={feedback.text} tone={feedback.tone} onDismiss={() => setFeedback(null)} />
      </View>}
      {loading ? <Text style={[styles.note, styles.content]}>Loading commute...</Text>
        : error ? <View style={styles.content}>
          <MessageBanner message={error} />
          <Pressable accessibilityRole="button" onPress={() => setAttempt(current => current + 1)}>
            <Text style={styles.backText}>Retry</Text>
          </Pressable>
        </View> : commute ? <>
          <CommuteDetails key={JSON.stringify(commute)} commute={commute} />
        </> : <Text style={[styles.note, styles.content]}>This commute could not be found.</Text>}
      <ConfirmationDialog visible={confirmEdit} title="Edit commute?"
        description={`Edit “${commute?.name ?? 'this commute'}”? Your changes will only be saved when you select Save changes.`}
        confirmLabel="Continue editing" destructive={false} busy={false}
        onCancel={() => setConfirmEdit(false)}
        onConfirm={() => {
          setConfirmEdit(false);
          router.push({ pathname: '/commutes/add', params: { id } });
        }} />
    </SafeAreaView>
  );
}

function CommuteDetails({ commute }: { commute: Commute }) {
  const [now, setNow] = useState(() => new Date());
  const [traffic, setTraffic] = useState<TrafficResult | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const staticSeconds = commute.estimatedDurationSeconds;
  const supportsTraffic = commute.travelMode === 'driving';
  const trip = nextTrip(commute, now);
  const tripKey = trip?.arrival.getTime() ?? null;
  const inWindow = supportsTraffic && isInTrafficWindow(trip, staticSeconds, now);

  const fetchTraffic = async (source: TrafficResult['source'], signal?: AbortSignal) => {
    if (tripKey === null) return;
    setTrafficLoading(true);
    setTrafficError('');
    try {
      const estimate = await getTrafficEstimate(commute, signal);
      if (!signal?.aborted) setTraffic({ estimate, fetchedAt: new Date(), tripKey, source });
    } catch (cause) {
      if (!signal?.aborted) setTrafficError(message(cause, 'Could not get a traffic estimate.'));
    } finally {
      setTrafficLoading(false);
    }
  };

  // Only poll Google's traffic-aware estimate inside the pre-departure window.
  useEffect(() => {
    if (!inWindow || tripKey === null) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = () => {
      void fetchTraffic('auto', controller.signal);
      timer = setTimeout(poll, TRAFFIC_REFRESH_MS);
    };
    timer = setTimeout(poll, 0);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // fetchTraffic is recreated each render; the window and trip determine polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inWindow, tripKey, commute]);

  const current = traffic?.tripKey === tripKey ? traffic : null;
  const durationSeconds = current?.estimate.durationSeconds ?? staticSeconds;
  const trafficAware = current !== null;
  const departure = trip && durationSeconds !== null
    ? departureBefore(trip.arrival, durationSeconds, commute.bufferMinutes) : null;
  const behindMinutes = departure ? Math.floor((now.getTime() - departure.getTime()) / 60_000) : 0;
  const windowStart = trip?.departure && staticSeconds !== null
    ? trafficWindowStart(trip.departure, staticSeconds) : null;

  let trafficStatus: string;
  if (!supportsTraffic) {
    trafficStatus = `Live traffic only applies to driving. Showing Google's ${modeLabels[commute.travelMode].toLowerCase()} estimate without traffic.`;
  } else if (current) {
    const delta = Math.ceil(current.estimate.durationSeconds / 60)
      - Math.ceil(current.estimate.staticDurationSeconds / 60);
    trafficStatus = `Live traffic as of ${clock(current.fetchedAt)}`
      + (current.source === 'developer' ? ' (developer tool)' : '')
      + `: ${delta === 0 ? 'no delay' : `${Math.abs(delta)} min ${delta > 0 ? 'slower' : 'faster'}`} than without traffic.`
      + (inWindow ? ' Refreshes every 5 min until departure.' : '');
  } else if (inWindow) {
    trafficStatus = trafficLoading ? 'Checking live traffic...' : 'Live traffic estimate unavailable; showing estimate without traffic.';
  } else if (windowStart && trip) {
    trafficStatus = `Estimate without traffic. Live traffic checks start ${dayLabel(windowStart, now).toLowerCase()} at ${clock(windowStart)}.`;
  } else {
    trafficStatus = 'No saved estimate without traffic, so live traffic checks cannot be scheduled.';
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>COMMUTE</Text>
      <Text style={styles.title}>{commute.name}</Text>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Text style={styles.label}>RECOMMENDED DEPARTURE</Text>
          <Badge trafficAware={trafficAware} />
        </View>
        {departure && trip ? (
          <>
            <Text style={styles.leaveTime}>
              {behindMinutes > 0 ? 'Leave now' : clock(departure)}
            </Text>
            <Text style={styles.sub}>
              {behindMinutes > 0
                ? `Recommended departure was ${clock(departure)} (${behindMinutes} min ago)`
                : dayLabel(departure, now)}
              {` · arrive ${dayLabel(trip.arrival, now).toLowerCase()} by ${clock(trip.arrival)}`}
            </Text>
          </>
        ) : (
          <Text style={styles.sub}>
            {trip ? 'No travel estimate is available for this commute.' : 'No upcoming trips scheduled.'}
          </Text>
        )}

        <View style={styles.divider} />
        <View style={styles.heroRow}>
          <Text style={styles.label}>ESTIMATED DURATION</Text>
          <Badge trafficAware={trafficAware} />
        </View>
        <Text style={styles.duration}>
          {durationSeconds === null ? 'Unavailable' : duration(durationSeconds)}
        </Text>
        <Text style={styles.sub}>{trafficStatus}</Text>
        <MessageBanner message={trafficError} />
      </View>

      <View style={styles.route}>
        <View style={styles.routeRail}>
          <View style={[styles.routeDot, { backgroundColor: C.green }]} />
          <View style={styles.routeLine} />
          <View style={[styles.routeDot, { backgroundColor: C.red }]} />
        </View>
        <View style={styles.routeStops}>
          <View>
            <Text style={styles.label}>FROM</Text>
            <Text style={styles.routeText}>{commute.origin}</Text>
          </View>
          <View>
            <Text style={styles.label}>TO</Text>
            <Text style={styles.routeText}>{commute.destination}</Text>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        <Stat icon={modeIcons[commute.travelMode]} label="Travel mode" value={modeLabels[commute.travelMode]} />
        <Stat icon="hourglass-outline" label="Time buffer" value={`${commute.bufferMinutes} min`} />
        <Stat icon="flag-outline" label="Arrive by" value={formatTime(toMinutes(commute.arrivalTime))} />
        <Stat icon="calendar-outline" label="Days" value={formatDays(commute.days)} />
        <Stat
          icon="speedometer-outline" label="No-traffic estimate"
          value={staticSeconds === null ? 'Unavailable' : duration(staticSeconds)}
        />
        {current && (
          <Stat icon="resize-outline" label="Distance" value={distance(current.estimate.distanceMeters)} />
        )}
      </View>

      {/* TEMPORARY DEVELOPER TOOL: remove before release. */}
      <View style={styles.devBox}>
        <View style={styles.heroRow}>
          <Ionicons name="construct-outline" size={15} color={C.amber} />
          <Text style={styles.devLabel}>TEMPORARY DEVELOPER TOOL</Text>
        </View>
        <Text style={styles.devText}>
          Fetches a traffic-aware estimate now, ignoring the pre-departure window.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={trafficLoading || !supportsTraffic || tripKey === null}
          onPress={() => void fetchTraffic('developer')}
          style={({ pressed }) => [styles.devButton, {
            opacity: trafficLoading || !supportsTraffic || tripKey === null ? 0.5 : pressed ? 0.8 : 1,
          }]}
        >
          <Text style={styles.devButtonText}>
            {trafficLoading ? 'Getting traffic...' : 'Get traffic aware duration'}
          </Text>
        </Pressable>
        {!supportsTraffic && <Text style={styles.devText}>Only available for driving commutes.</Text>}
      </View>

      <Text style={styles.footnote}>
        Departure = arrival time − estimated duration − {commute.bufferMinutes} min buffer.
        Durations are rounded up to the minute. Estimates by Google Maps.
      </Text>
    </ScrollView>
  );
}

function Badge({ trafficAware }: { trafficAware: boolean }) {
  return (
    <View style={[styles.badge, trafficAware ? styles.badgeLive : styles.badgeStatic]}>
      <Ionicons
        name={trafficAware ? 'pulse' : 'remove-circle-outline'} size={11}
        color={trafficAware ? C.green : C.muted}
      />
      <Text style={[styles.badgeText, { color: trafficAware ? C.green : C.muted }]}>
        {trafficAware ? 'Traffic-aware' : 'Without traffic'}
      </Text>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: Icon; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={C.blueLight} />
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: {
    height: 62, paddingHorizontal: 14, borderBottomWidth: 1,
    borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center',
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: C.text, fontFamily: F.medium, fontSize: 14 },
  feedback: { marginHorizontal: 18, marginTop: 12, marginBottom: 4 },
  editButton: {
    marginLeft: 'auto', minHeight: 44, paddingHorizontal: 18,
    justifyContent: 'center', borderWidth: 1,
    borderRadius: 10, backgroundColor: 'rgba(99,140,255,0.12)',
  },
  content: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 36 },
  eyebrow: { color: C.green, fontFamily: F.bold, fontSize: 10, letterSpacing: 1 },
  title: { fontFamily: F.displayMedium, fontSize: 23, color: C.text, letterSpacing: -0.7, marginTop: 6, marginBottom: 2 },
  route: {
    flexDirection: 'row', gap: 12, marginTop: 16, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.line, backgroundColor: C.card,
  },
  routeRail: { alignItems: 'center', paddingVertical: 3 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { flex: 1, width: 2, marginVertical: 4, backgroundColor: C.line },
  routeStops: { flex: 1, gap: 16 },
  routeText: { fontFamily: F.medium, fontSize: 13, color: C.text, marginTop: 3, lineHeight: 18 },
  hero: {
    marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1,
    borderColor: 'rgba(123,237,141,0.14)', backgroundColor: 'rgba(123,237,141,0.05)',
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: F.bold, color: '#8FADD2', fontSize: 9, letterSpacing: 0.9 },
  leaveTime: { fontFamily: F.display, color: C.green, fontSize: 32, marginTop: 4 },
  duration: { fontFamily: F.display, color: C.text, fontSize: 26, marginTop: 4 },
  sub: { fontFamily: F.regular, fontSize: 11, color: '#89A0C2', marginTop: 4 },
  error: { fontFamily: F.regular, fontSize: 11, color: C.red, marginTop: 6 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 14 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  badgeLive: { backgroundColor: 'rgba(123,237,141,0.12)' },
  badgeStatic: { backgroundColor: 'rgba(141,154,173,0.12)' },
  badgeText: { fontFamily: F.bold, fontSize: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  stat: {
    flexGrow: 1, flexBasis: '45%', borderRadius: 13, padding: 12, gap: 4,
    borderWidth: 1, borderColor: C.line, backgroundColor: C.card,
  },
  statLabel: { fontFamily: F.bold, color: '#8FADD2', fontSize: 9, letterSpacing: 0.8, marginTop: 2 },
  statValue: { fontFamily: F.semibold, color: C.text, fontSize: 14 },
  devBox: {
    marginTop: 18, borderRadius: 13, padding: 14, gap: 8, borderWidth: 1,
    borderStyle: 'dashed', borderColor: C.amber, backgroundColor: 'rgba(245,185,77,0.06)',
  },
  devLabel: { flex: 1, fontFamily: F.bold, color: C.amber, fontSize: 10, letterSpacing: 0.9 },
  devText: { fontFamily: F.regular, color: C.muted, fontSize: 11 },
  devButton: {
    height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.amber,
  },
  devButtonText: { fontFamily: F.bold, color: C.greenText, fontSize: 13 },
  note: { fontFamily: F.regular, fontSize: 11, color: C.muted, textAlign: 'center' },
  footnote: { color: C.muted, fontFamily: F.regular, fontSize: 10, textAlign: 'center', marginTop: 16 },
});
