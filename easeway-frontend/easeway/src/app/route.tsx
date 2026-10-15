import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CommuteSummary } from '@/components/commute-summary';
import { EasewayIcon } from '@/components/easeway-icon';
import RouteMap from '@/components/route-map';
import { easeway as c } from '@/constants/easeway-theme';
import { useCommute } from '@/hooks/commute-provider';
import { displayDate, displayTime, formatDuration } from '@/lib/commute';

export default function RouteScreen() {
  const { result, live, error, openDirections } = useCommute();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Link href="/" replace asChild><Pressable accessibilityRole="link" style={styles.back}><EasewayIcon name="back" color={c.green} size={18} /><Text style={styles.backText}>Back to Home</Text></Pressable></Link>
      <Text accessibilityRole="header" style={styles.title}>Your route</Text>
      <CommuteSummary showAction={false} />
      {result ? (
        <>
          <View style={styles.card}>
            <Text style={styles.address}>{result.origin}</Text>
            <Text style={styles.to}>TO</Text>
            <Text style={styles.address}>{result.destination}</Text>
            <RouteMap live={live} route={result.route} />
            <Text style={styles.hint}>{formatDuration(result.plan.durationMinutes)} {live ? 'estimated' : 'sample'} travel + {result.plan.bufferMinutes} min arrival buffer</Text>
            {[
              { label: 'Leave your starting point', date: result.plan.departure },
              { label: 'Reach your destination', date: result.plan.destinationArrival },
              { label: 'Ready for your commitment', date: result.plan.arrival },
            ].map((stop, index) => (
              <View key={stop.label} style={styles.stop}>
                <View style={styles.dot}><Text style={styles.dotText}>{index + 1}</Text></View>
                <View style={styles.flex}><Text style={styles.stopLabel}>{stop.label}</Text><Text style={styles.date}>{displayDate(stop.date)}</Text></View>
                <Text style={styles.stopTime}>{displayTime(stop.date)}</Text>
              </View>
            ))}
            {result.warnings.map((warning) => <Text key={warning} style={styles.warning}>{warning}</Text>)}
            <Text style={styles.hint}>{live ? 'Google Maps estimate without live or predicted traffic. Allow extra time for delays.' : 'Demo estimate and route illustration only. Not suitable for planning a real trip.'}</Text>
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.warning}>{error}</Text> : null}
          <Pressable accessibilityRole="link" onPress={openDirections} style={styles.directions}><Text style={styles.directionsText}>Open directions in Google Maps</Text><EasewayIcon name="chevron" color={c.canvas} size={18} /></Pressable>
          <Text style={styles.hint}>Opens a new route; your arrival time and buffer are not transferred.</Text>
        </>
      ) : <Text style={styles.hint}>No current route. Plan a commute to see your journey here.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas },
  content: { padding: 18, paddingBottom: 28, gap: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  backText: { color: c.green, fontSize: 12, fontWeight: '600' },
  title: { color: c.text, fontSize: 27, fontWeight: '700' },
  card: { backgroundColor: c.surface, borderRadius: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: c.line },
  address: { color: c.text, fontSize: 13, lineHeight: 20 },
  to: { color: c.blue, fontSize: 9, letterSpacing: 1 },
  hint: { color: c.muted, fontSize: 11, lineHeight: 18 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 25, height: 25, borderRadius: 13, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: c.green, fontSize: 10 },
  flex: { flex: 1 },
  stopLabel: { color: c.text, fontSize: 11, lineHeight: 17 },
  date: { color: c.muted, fontSize: 10, marginTop: 3 },
  stopTime: { color: c.text, fontSize: 12, fontWeight: '600' },
  warning: { color: c.red, fontSize: 12, lineHeight: 18 },
  directions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: c.green, minHeight: 50, borderRadius: 12, padding: 10 },
  directionsText: { color: c.canvas, fontSize: 12, fontWeight: '700' },
});
