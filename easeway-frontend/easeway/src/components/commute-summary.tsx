import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EasewayIcon } from './easeway-icon';
import { easeway as c } from '@/constants/easeway-theme';
import { useCommute } from '@/hooks/commute-provider';
import { departureCountdown, displayDate, displayTime } from '@/lib/commute';

export function CommuteSummary({ showAction = true }: { showAction?: boolean }) {
  const { result, now, live } = useCommute();
  const plan = result?.plan;
  const late = Boolean(plan && plan.departure.getTime() <= now);
  const timeParts = plan ? displayTime(plan.departure).split(' ') : [];

  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.orbit} />
      <View style={styles.body}>
        <View style={styles.topline}>
          <View style={[styles.pill, late && { backgroundColor: '#483528' }]}>
            <View style={[styles.dot, late && { backgroundColor: c.amber }]} />
            <Text style={[styles.pillText, late && { color: c.amber }]}>
              {!plan ? 'Not planned' : late ? 'Leave time passed' : live ? 'Planned' : 'Sample plan'}
            </Text>
          </View>
          <Text style={styles.secondary}>{live ? 'Your commute' : 'Demo commute'}</Text>
        </View>
        <Text style={styles.label}>{plan ? 'Leave your starting point at' : 'When should you leave?'}</Text>
        {plan ? (
          <View style={styles.timeRow}>
            <Text accessibilityLabel={`Departure ${displayTime(plan.departure)}`} style={styles.time}>{timeParts[0]}</Text>
            <Text style={styles.period}>{timeParts.slice(1).join(' ')}</Text>
          </View>
        ) : <Text style={styles.emptyTitle}>Let&apos;s plan it.</Text>}
        <Text style={styles.countdown}>{plan ? departureCountdown(plan.departure, now) : 'Set your destination and arrival time.'}</Text>
        {plan ? <Text style={styles.date}>{displayDate(plan.departure)}</Text> : null}
        <View style={styles.journey}>
          <View style={styles.point}>
            <View style={[styles.pointIcon, { backgroundColor: c.green }]}><EasewayIcon name="home" color={c.canvas} size={16} /></View>
            <Text style={styles.pointLabel}>Start</Text>
          </View>
          <View style={styles.dotted} />
          <View style={styles.transport}><EasewayIcon name="car" size={18} color="#d9e8ff" /></View>
          <View style={styles.dotted} />
          <View style={styles.point}>
            <View style={[styles.pointIcon, { backgroundColor: c.blue }]}><EasewayIcon name="destination" color={c.canvas} size={16} /></View>
            <Text style={styles.pointLabel}>Destination</Text>
          </View>
        </View>
        {late ? <Text accessibilityRole="alert" style={styles.warning}>The recommended departure has passed. Choose a later arrival or reduce your buffer; you may not arrive in time.</Text> : null}
      </View>
      {showAction ? <Link href={plan ? '/route' : '/commutes'} asChild>
        <Pressable accessibilityRole="link" style={styles.routeButton}>
          <Text style={styles.routeText}>{plan ? 'View route' : 'Plan a commute'}</Text>
          <EasewayIcon name="chevron" size={18} color={c.green} />
        </Pressable>
      </Link> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#28503d', backgroundColor: '#101c25' },
  orbit: { position: 'absolute', pointerEvents: 'none', width: 230, height: 230, borderRadius: 115, borderWidth: 38, borderColor: '#7bed8d0d', right: -110, top: -130 },
  body: { padding: 20 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: c.greenSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.green },
  pillText: { color: c.green, fontSize: 10, fontWeight: '700' },
  secondary: { color: c.muted, fontSize: 12 },
  label: { color: '#c5cfdc', fontSize: 13, marginTop: 24, marginBottom: 3 },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  time: { color: '#84f197', fontSize: 58, lineHeight: 65, fontWeight: '700', letterSpacing: -3 },
  period: { color: '#84f197', fontSize: 21, fontWeight: '700' },
  emptyTitle: { color: c.green, fontSize: 34, fontWeight: '700', marginVertical: 8 },
  countdown: { color: '#bcd6ff', fontSize: 13, fontWeight: '500', marginTop: 4 },
  date: { color: c.muted, fontSize: 11, marginTop: 5 },
  journey: { flexDirection: 'row', alignItems: 'center', marginTop: 23, gap: 9 },
  point: { alignItems: 'center', gap: 5 },
  pointIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pointLabel: { color: c.text, fontSize: 10, fontWeight: '600' },
  dotted: { flex: 1, borderTopWidth: 1, borderColor: '#65758b', borderStyle: 'dotted', marginBottom: 18 },
  transport: { marginBottom: 18 },
  routeButton: { borderTopWidth: 1, borderColor: '#22302f', flexDirection: 'row', gap: 5, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0c151bbb' },
  routeText: { fontSize: 12, fontWeight: '700', color: c.green },
  warning: { color: c.amber, fontSize: 12, lineHeight: 18, paddingTop: 16 },
});
