import type { ReactNode, ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C, F } from '../constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type Feedback = { text: string; tone: 'error' | 'success' | 'info' };

export function MessageBanner({ message, tone = 'error', onDismiss, compact = false }: {
  message?: string | null; tone?: Feedback['tone']; onDismiss?: () => void; compact?: boolean;
}) {
  if (!message) return null;
  const color = tone === 'error' ? C.red : tone === 'success' ? C.green : C.blueLight;
  return <View style={[styles.message, compact && styles.compactMessage, { borderColor: color, backgroundColor: `${color}18` }]}>
    <Text accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.messageText, compact && styles.compactMessageText, { color }]}>{message}</Text>
    {onDismiss && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message"
      onPress={onDismiss} hitSlop={8}><Ionicons name="close" size={18} color={color} /></Pressable>}
  </View>;
}

export function ConfirmationDialog({ visible, title, description, error, busy, onConfirm, onCancel,
  confirmLabel = 'Delete', destructive = true }: {
  visible: boolean; title: string; description: string; error?: string; busy: boolean;
  onConfirm: () => void; onCancel: () => void;
  confirmLabel?: string; destructive?: boolean;
}) {
  return <Modal visible={visible} transparent animationType="fade"
    onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={styles.modalBackdrop}>
      <View accessibilityViewIsModal style={styles.dialog}>
        <Text accessibilityRole="header" style={styles.dialogTitle}>{title}</Text>
        <Text style={styles.dialogDescription}>{description}</Text>
        <MessageBanner message={error} />
        <View style={styles.dialogActions}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel}
            style={styles.dialogButton}><Text style={styles.dialogDescription}>Cancel</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm}
            style={[styles.dialogButton, { backgroundColor: destructive ? C.red : C.blueLight, opacity: busy ? 0.5 : 1 }]}>
            <Text style={styles.primaryLabel}>{busy ? 'Deleting...' : confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

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
  message: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 10 },
  messageText: { flex: 1, fontFamily: F.medium, fontSize: 13, lineHeight: 19 },
  compactMessage: { padding: 8, borderRadius: 8 },
  compactMessageText: { fontSize: 12, lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, padding: 22, gap: 16, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  dialogTitle: { fontFamily: F.displayMedium, fontSize: 21, color: C.text },
  dialogDescription: { fontFamily: F.regular, fontSize: 14, lineHeight: 21, color: C.text },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  dialogButton: { minHeight: 44, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center', backgroundColor: C.input },
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
