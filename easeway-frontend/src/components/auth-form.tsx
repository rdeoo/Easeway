import { useState } from 'react';
import {
  ImageBackground, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Brand, Field, PrimaryButton } from './ui';
import { C, F } from '../constants/theme';

type Props = { screenType: 'login' | 'register' };

// Temporary sample photo. Replace with a local asset when you choose your final hero:
// source={require('../../assets/images/commute-hero.jpg')}
const heroPhoto = {
  uri: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=85',
};

export default function AuthScreen({ screenType }: Props) {
  const isRegister = screenType === 'register';
  const { height } = useWindowDimensions();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ImageBackground
            source={heroPhoto}
            resizeMode="cover"
            style={[styles.hero, { height: Math.min(310, Math.max(235, height * 0.34)) }]}
          >
            <LinearGradient
              colors={['rgba(18,35,49,0.80)', 'rgba(16,28,40,0.74)', '#101720']}
              locations={[0, 0.6, 1]}
              style={StyleSheet.absoluteFill}
            />
            
            <Brand />
          </ImageBackground>

          <View style={styles.panel}>
            <Text style={styles.eyebrow}>YOUR COMMUTE, SIMPLIFIED</Text>
            <Text style={styles.heading}>
              {isRegister ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text style={styles.description}>
              {isRegister
                ? 'Create an account to save your first commute.'
                : 'Sign in to manage your saved commutes.'}
            </Text>

            <View style={styles.fields}>
              {isRegister && (
                <Field
                  label="Name" value={name} onChangeText={setName}
                  placeholder="Your name" autoCapitalize="words"
                />
              )}
              <Field
                label="Email" value={email} onChangeText={setEmail}
                placeholder="you@example.com" keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label="Password" value={password} onChangeText={setPassword}
                placeholder="At least 8 characters" secureTextEntry
                autoCapitalize="none"
              />
              {/* UI PREVIEW ONLY: this button does not authenticate a real user. */}
              <PrimaryButton
                label={isRegister ? 'Create account' : 'Sign in'}
                onPress={() => router.replace('/commutes')}
              />
            </View>
             
            <Pressable
              onPress={() => router.replace(isRegister ? '/login' : '/register')}
              accessibilityRole="link"
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isRegister
                  ? 'Already have an account? Sign in'
                  : 'New to Easeway? Create an account'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scrollContent: { flexGrow: 1 },
  hero: {
    backgroundColor: '#17253A', paddingTop: 24, paddingHorizontal: 24,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute', width: 200, height: 200, top: -30, right: -40,
    borderRadius: 100, backgroundColor: 'rgba(123,237,141,0.08)',
  },
  routeArt: { flex: 1, marginTop: 12 },
  arc: {
    position: 'absolute', width: 265, height: 155,
    top: 9, left: '17%', borderRadius: 145,
    borderTopWidth: 3, borderRightWidth: 3,
    borderTopColor: 'rgba(123,237,141,0.30)',
    borderRightColor: 'rgba(123,237,141,0.30)',
    borderStyle: 'dashed', transform: [{ rotate: '-12deg' }],
  },
  originDotOuter: {
    position: 'absolute', width: 31, height: 31,
    borderRadius: 16, backgroundColor: 'rgba(123,237,141,0.14)',
    left: '10%', bottom: 33, alignItems: 'center', justifyContent: 'center',
  },
  originDotInner: {
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: C.green, borderColor: '#183128', borderWidth: 4,
  },
  pin: { position: 'absolute', top: 26, right: '13%' },
  carSquare: {
    position: 'absolute', top: 106, left: '43%',
    width: 48, height: 48, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#84F197',
    transform: [{ rotate: '-6deg' }],
  },
  panel: {
    flexGrow: 1, marginTop: -18, paddingTop: 37,
    paddingHorizontal: 26, paddingBottom: 32, backgroundColor: C.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  eyebrow: { color: C.green, fontFamily: F.bold, fontSize: 10, letterSpacing: 1.1 },
  heading: {
    fontFamily: F.display, fontSize: 30, color: C.text,
    marginTop: 12, letterSpacing: -0.9,
  },
  description: {
    color: '#94B5DE', fontFamily: F.regular,
    fontSize: 13, marginTop: 8,
  },
  fields: { marginTop: 26, gap: 13 },
  switchButton: { alignItems: 'center', paddingVertical: 18 },
  switchText: { color: C.green, fontSize: 11, fontFamily: F.bold },
  terms: {
    color: '#7990AE', textAlign: 'center',
    fontFamily: F.regular, fontSize: 9, marginTop: 1,
  },
});
