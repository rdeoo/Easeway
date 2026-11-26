import { createElement, useState } from 'react';
import {
  ImageBackground, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { Brand, Field, MessageBanner, PrimaryButton, type Feedback } from './ui';
import { validateAuthInput } from '../utils/auth-validation';
import { C, F } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

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
  const { session, loading, error: sessionError, signIn, signUp } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<Feedback['tone']>('error');

  const submit = async () => {
    if (busy) return;
    setMessageTone('error');
    const validationError = validateAuthInput(screenType, name, email, password);
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (isRegister) {
        const signedIn = await signUp(name.trim(), email.trim(), password);
        if (!signedIn) {
          setMessageTone('info');
          setMessage('Check your email to confirm your account, then sign in.');
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not authenticate. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  if (session) return <Redirect href="/commutes" />;

  return createElement(
    SafeAreaView,
    { style: styles.screen },
    createElement(
      KeyboardAvoidingView,
      { style: { flex: 1 }, behavior: Platform.OS === 'ios' ? 'padding' : undefined },
      createElement(
        ScrollView,
        {
          contentContainerStyle: styles.scrollContent,
          keyboardShouldPersistTaps: 'handled',
          showsVerticalScrollIndicator: false,
        },
        createElement(
          ImageBackground,
          {
            source: heroPhoto,
            resizeMode: 'cover',
            style: [styles.hero, { height: Math.min(310, Math.max(235, height * 0.34)) }],
          },
          createElement(LinearGradient, {
            colors: ['rgba(18,35,49,0.80)', 'rgba(16,28,40,0.74)', '#101720'],
            locations: [0, 0.6, 1],
            style: StyleSheet.absoluteFill,
          }),
          createElement(Brand),
        ),
        createElement(
          View,
          { style: styles.panel },
          createElement(Text, { style: styles.eyebrow }, 'YOUR COMMUTE, SIMPLIFIED'),
          createElement(Text, { style: styles.heading }, isRegister ? 'Create your account' : 'Welcome back'),
          createElement(
            Text,
            { style: styles.description },
            isRegister
              ? 'Create an account to save your first commute.'
              : 'Sign in to manage your saved commutes.',
          ),
          createElement(
            View,
            { style: styles.fields },
            isRegister && createElement(Field, {
              label: 'Name', value: name, onChangeText: text => { setName(text); setMessage(''); },
              placeholder: 'Your name', autoCapitalize: 'words',
            }),
            createElement(Field, {
              label: 'Email', value: email, onChangeText: text => { setEmail(text); setMessage(''); },
              placeholder: 'you@example.com', keyboardType: 'email-address',
              autoCapitalize: 'none',
            }),
            createElement(Field, {
              label: 'Password', value: password, onChangeText: text => { setPassword(text); setMessage(''); },
              placeholder: isRegister ? 'At least 8 characters' : 'Your password', secureTextEntry: true,
              autoCapitalize: 'none',
            }),
            createElement(MessageBanner, {
              message: message || sessionError,
              tone: message ? messageTone : 'error',
            }),
            createElement(PrimaryButton, {
              label: busy ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in',
              disabled: busy || loading,
              onPress: submit,
            }),
          ),
          createElement(
            Pressable,
            {
              onPress: () => router.replace(isRegister ? '/login' : '/register'),
              accessibilityRole: 'link',
              style: styles.switchButton,
            },
            createElement(
              Text,
              { style: styles.switchText },
              isRegister
                ? 'Already have an account? Sign in'
                : 'New to Easeway? Create an account',
            ),
          ),
        ),
      ),
    ),
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
