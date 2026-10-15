import { Link } from 'expo-router';
import React, { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CommuteSummary } from '@/components/commute-summary';
import { EasewayIcon, type EasewayIconName } from '@/components/easeway-icon';
import RouteMap from '@/components/route-map';
import { easeway as c } from '@/constants/easeway-theme';
import { useCommute } from '@/hooks/commute-provider';
import { displayTime, formatDuration } from '@/lib/commute';

export default function HomeScreen() {
  const { result, now, live } = useCommute();
  const today = new Date(now);
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const metrics: { label: string; value: string; icon: EasewayIconName; color: string; background: string }[] = result ? [
    { label: live ? 'Est. travel' : 'Sample travel', value: formatDuration(result.plan.durationMinutes), icon: 'car', color: c.blue, background: c.blueSoft },
    { label: 'Arrival buffer', value: `${result.plan.bufferMinutes} min`, icon: 'clock', color: c.violet, background: '#29243e' },
    { label: 'Distance', value: `${(result.distanceMeters / 1000).toFixed(1)} km`, icon: 'pin', color: c.green, background: c.greenSoft },
  ] : [];
  const destinationParts = result?.destination.split(',').map((part) => part.trim());

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.welcome}>
        <View style={styles.flex}>
          <Text style={styles.overline}>{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</Text>
          <Text accessibilityRole="header" style={styles.greeting}>{greeting}</Text>
        </View>
        <Text style={styles.modeBadge}>{live ? 'LIVE MAPS' : 'DEMO'}</Text>
      </View>
      <CommuteSummary />
      <View style={styles.tripCard}>
        <View style={styles.tripHeading}>
          <View style={styles.flex}>
            <Text style={styles.overline}>{result ? 'NEXT COMMUTE' : 'YOUR NEXT COMMUTE'}</Text>
            <Text accessibilityRole="header" style={styles.destination}>{destinationParts?.[0] ?? 'Where are you headed?'}</Text>
            <View style={styles.addressRow}>
              <EasewayIcon name="pin" size={13} />
              <Text style={styles.address}>{result ? destinationParts?.slice(1).join(', ') || 'Your selected destination' : 'Set a destination in Commutes'}</Text>
            </View>
          </View>
          {result ? <Text style={styles.arrivalBadge}>Arrive {displayTime(result.plan.arrival)}</Text> : null}
        </View>
        <RouteMap live={live} route={result?.route ?? null} compact />
        {result ? (
          <View style={styles.metrics}>
            {metrics.map((metric) => (
              <View key={metric.label} style={styles.metric}>
                <View style={[styles.metricIcon, { backgroundColor: metric.background }]}><EasewayIcon name={metric.icon} color={metric.color} size={17} /></View>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Link href="/commutes" replace asChild>
          <Pressable accessibilityRole="link" style={styles.editButton}>
            <Text style={styles.editText}>{result ? 'Edit commute' : 'Plan a commute'}</Text>
            <EasewayIcon name="chevron" size={17} color={c.blue} />
          </Pressable>
        </Link>
      </View>
      <View style={styles.note}>
        <View style={[styles.noteDot, live && { backgroundColor: c.blue }]} />
        <View style={styles.flex}>
          <Text style={styles.noteTitle}>{live ? 'Base travel estimate' : 'Sample commute, not live data'}</Text>
          <Text style={styles.noteText}>{live ? 'Google Maps driving routes are enabled. Traffic predictions, weather, and alerts are not included.' : 'Waterfront Station to BCIT Burnaby. Duration and distance are illustrative; use a Google Maps key in the browser for real driving estimates.'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas },
  content: { padding: 18, paddingBottom: 28, gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  welcome: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  overline: { color: c.muted, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  greeting: { color: c.text, fontSize: 23, fontWeight: '600', letterSpacing: -0.8, marginTop: 5 },
  modeBadge: { color: c.blue, fontSize: 9, fontWeight: '700', backgroundColor: c.blueSoft, borderRadius: 7, padding: 7 },
  tripCard: { borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, padding: 16, gap: 16 },
  tripHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  destination: { color: c.text, fontSize: 17, fontWeight: '600', letterSpacing: -0.5, marginTop: 6 },
  addressRow: { flexDirection: 'row', gap: 4, marginTop: 6, alignItems: 'center' },
  address: { color: c.muted, fontSize: 11, flex: 1, lineHeight: 16 },
  arrivalBadge: { color: '#9db7ff', backgroundColor: c.blueSoft, fontSize: 9, fontWeight: '700', padding: 7, borderRadius: 8, maxWidth: 105 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, gap: 6 },
  metricIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { color: c.muted, fontSize: 10 },
  metricValue: { color: c.text, fontWeight: '600', fontSize: 13 },
  editButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, minHeight: 44, borderTopWidth: 1, borderColor: c.line, paddingTop: 10 },
  editText: { color: c.blue, fontSize: 12, fontWeight: '600' },
  note: { flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 14 },
  noteDot: { width: 7, height: 7, backgroundColor: c.amber, borderRadius: 4, marginTop: 5 },
  noteTitle: { color: c.text, fontSize: 12, fontWeight: '600' },
  noteText: { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
});
