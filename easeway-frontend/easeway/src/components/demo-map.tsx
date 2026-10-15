import { StyleSheet, Text, View } from 'react-native';

export function DemoMap({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.map, compact && { height: 170 }]} accessibilityLabel="Illustrative sample route, not a real map">
      <View style={styles.water} />
      {[18, 38, 58, 78].map((top) => (
        <View key={`h${top}`} style={[styles.street, { top: `${top}%` }]} />
      ))}
      {[18, 38, 58, 78].map((left) => (
        <View key={`v${left}`} style={[styles.street, styles.vertical, { left: `${left}%` }]} />
      ))}
      <View style={styles.routeHorizontal} />
      <View style={styles.routeVertical} />
      <View style={[styles.pin, styles.start]}><Text style={styles.pinText}>A</Text></View>
      <View style={[styles.pin, styles.end]}><Text style={styles.pinText}>B</Text></View>
      <View style={styles.caption}><Text style={styles.captionText}>SAMPLE ROUTE / ILLUSTRATION ONLY</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 260, backgroundColor: '#edf2ed', overflow: 'hidden', borderRadius: 14 },
  water: { position: 'absolute', left: -50, bottom: -190, width: 600, height: 230, backgroundColor: '#d8eaf2', transform: [{ rotate: '-7deg' }] },
  street: { position: 'absolute', width: '130%', height: 7, backgroundColor: '#fff', transform: [{ rotate: '-15deg' }] },
  vertical: { top: -25, width: 7, height: '140%', transform: [{ rotate: '13deg' }] },
  routeHorizontal: { position: 'absolute', left: '21%', top: '33%', width: '53%', height: 4, backgroundColor: '#347afa', borderRadius: 4, transform: [{ rotate: '-12deg' }] },
  routeVertical: { position: 'absolute', left: '21%', top: '33%', width: 4, height: '38%', backgroundColor: '#347afa', borderRadius: 4, transform: [{ rotate: '25deg' }] },
  pin: { position: 'absolute', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  start: { left: '15%', top: '60%', backgroundColor: '#347afa' },
  end: { left: '69%', top: '17%', backgroundColor: '#1769e0' },
  pinText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  caption: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#ffffffed', padding: 8, borderRadius: 6 },
  captionText: { fontSize: 8, letterSpacing: 1, color: '#52645e' },
});
