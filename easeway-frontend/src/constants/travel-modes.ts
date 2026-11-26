import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { TravelMode } from '../services/commutes';

type Icon = ComponentProps<typeof Ionicons>['name'];

export const modeIcons: Record<TravelMode, Icon> = {
  driving: 'car-outline', transit: 'train-outline',
  bicycling: 'bicycle-outline', walking: 'walk-outline',
};

export const modeLabels: Record<TravelMode, string> = {
  driving: 'Driving', transit: 'Transit', bicycling: 'Cycling', walking: 'Walking',
};
