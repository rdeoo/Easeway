import type { ReactNode, ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C, F } from '../constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Text-only branding until your team creates the final logo.
export function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.logoMark}>
        <Ionicons name="navigate" size={17} color={C.greenText} />
      </View>
      <Text style={styles.brandName}>Easeway</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  icon = 'chevron-forward',
  onPress,
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      <LinearGradient
        colors={[C.greenBright, C.greenEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryLabel}>{label}</Text>
        <Ionicons name={icon} size={19} color={C.greenText} />
      </LinearGradient>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

// Used by the sections on the Add commute screen.
export function SectionHeading({
  title,
  subtitle,
  icon,
  color = C.blueLight,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  color?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 31, height: 31, borderRadius: 10,
    backgroundColor: C.green, alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  brandName: { fontFamily: F.display, fontSize: 22, color: '#FFFFFF', letterSpacing: -0.7 },
  primaryButton: {
    height: 49, borderRadius: 13, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  primaryLabel: { fontFamily: F.bold, fontSize: 13, color: C.greenText },
  field: { gap: 6 },
  fieldLabel: { color: '#7594B8', fontFamily: F.bold, fontSize: 10, letterSpacing: 1 },
  input: {
    height: 46, backgroundColor: C.input, borderWidth: 1,
    borderColor: C.inputLine, borderRadius: 11, paddingHorizontal: 13,
    color: C.text, fontFamily: F.regular, fontSize: 13,
  },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontFamily: F.displayMedium, fontSize: 13, color: C.text },
  sectionSubtitle: { fontFamily: F.regular, fontSize: 10, color: C.muted, marginTop: 2 },
  card: {
    backgroundColor: C.card, borderColor: C.line, borderWidth: 1,
    borderRadius: 18, padding: 16,
  },
});
