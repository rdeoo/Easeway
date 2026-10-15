import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import { easeway } from '@/constants/easeway-theme';

const names = {
  home: { ios: 'house', android: 'home', web: 'home' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  user: { ios: 'person', android: 'person', web: 'person' },
  car: { ios: 'car', android: 'directions_car', web: 'directions_car' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  destination: { ios: 'briefcase', android: 'work', web: 'work' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  back: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' },
} as const;

export type EasewayIconName = keyof typeof names;

export function EasewayIcon({ name, color = easeway.muted, size = 20 }: {
  name: EasewayIconName; color?: string; size?: number;
}) {
  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SymbolView name={names[name]} tintColor={color} size={size} />
    </View>
  );
}
