import { Link, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { EasewayIcon, type EasewayIconName } from '@/components/easeway-icon';
import { easeway as c } from '@/constants/easeway-theme';
import { CommuteProvider } from '@/hooks/commute-provider';

function AppFrame() {
  const pathname = usePathname();
  const tabs: { label: string; icon: EasewayIconName; href?: '/' | '/commutes'; selected: boolean }[] = [
    { label: 'Home', icon: 'home', href: '/', selected: pathname === '/' || pathname === '/route' },
    { label: 'Commutes', icon: 'calendar', href: '/commutes', selected: pathname === '/commutes' },
    { label: 'Alerts', icon: 'bell', selected: false },
    { label: 'Profile', icon: 'user', selected: false },
  ];
  return (
    <View style={styles.stage}>
      <SafeAreaView style={styles.frame}>
        <View style={styles.header}>
          <Link href="/" replace asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Easeway home" style={styles.brand}>
              <View style={styles.logo}><View style={styles.logoStroke} /><View style={styles.logoStart} /><View style={styles.logoEnd} /></View>
              <Text style={styles.brandName}>Easeway</Text>
            </Pressable>
          </Link>
          <View accessibilityLabel="No account connected" style={styles.avatar}><Text style={styles.avatarText}>E</Text></View>
        </View>
        <View style={styles.screens}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.canvas }, animation: 'none' }} />
        </View>
        <View accessibilityLabel="Main navigation" style={styles.navigation}>
          {tabs.map((tab) => {
            const content = (
              <>
                <View style={[styles.navIcon, tab.selected && { backgroundColor: c.greenSoft }]}>
                  <EasewayIcon name={tab.icon} color={tab.selected ? c.green : c.muted} size={21} />
                </View>
                <Text style={[styles.navLabel, tab.selected && { color: c.green }]}>{tab.label}</Text>
                {!tab.href && <Text style={styles.soon}>Soon</Text>}
              </>
            );
            return tab.href ? (
              <Link key={tab.label} href={tab.href} replace asChild>
                <Pressable accessibilityRole="link" accessibilityState={{ selected: tab.selected }} style={styles.navItem}>{content}</Pressable>
              </Link>
            ) : (
              <Pressable key={tab.label} disabled accessibilityRole="button" accessibilityLabel={`${tab.label}, coming soon`} accessibilityState={{ disabled: true }} style={styles.navItem}>{content}</Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <CommuteProvider><AppFrame /></CommuteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#080b10', alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 460, backgroundColor: c.canvas, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#1a222d' },
  header: { height: 65, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.line },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  logo: { width: 29, height: 29, borderRadius: 9, backgroundColor: '#63e79c', transform: [{ rotate: '-4deg' }] },
  logoStroke: { position: 'absolute', width: 18, height: 4, borderRadius: 2, top: 13, left: 5, backgroundColor: '#122c27', transform: [{ rotate: '-43deg' }] },
  logoStart: { position: 'absolute', width: 6, height: 6, borderRadius: 3, bottom: 5, left: 5, backgroundColor: '#122c27' },
  logoEnd: { position: 'absolute', width: 6, height: 6, borderRadius: 3, top: 5, right: 5, backgroundColor: '#122c27' },
  brandName: { color: c.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.8 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#63e79c', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#122c27', fontWeight: '700', fontSize: 13 },
  screens: { flex: 1 },
  navigation: { flexDirection: 'row', backgroundColor: c.canvas, borderTopWidth: 1, borderColor: c.line, paddingHorizontal: 8, paddingTop: 5, paddingBottom: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 64, gap: 3 },
  navIcon: { width: 33, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  navLabel: { color: c.muted, fontSize: 10, fontWeight: '600' },
  soon: { color: '#8390a2', fontSize: 8 },
});
