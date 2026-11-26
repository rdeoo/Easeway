import type { Commute } from '../services/commutes';
import type { VerifiedPlace } from '../services/places';

// Verified through backend Places details; Routes estimates use TRAFFIC_UNAWARE.
export const lonsdaleQuay: VerifiedPlace = {
  place_id: 'ChIJK4VAHLNxhlQRpEnAmoodLxM',
  address: '145 Chadwick Ct #220, North Vancouver, BC V7M 3K2, Canada',
  location: { latitude: 49.3096412, longitude: -123.0826332 },
};
export const bcitBurnaby: VerifiedPlace = {
  place_id: 'ChIJ5f5T_SF3hlQRnRB6ZAeyWjU',
  address: '3700 Willingdon Ave, Burnaby, BC V5G 3L1, Canada',
  location: { latitude: 49.2489744, longitude: -123.0018917 },
};
export const sfuBurnaby: VerifiedPlace = {
  place_id: 'ChIJJyJ6hcB5hlQRW7Uwbj9sUAA',
  address: '8888 University Dr W, Burnaby, BC V5A 1S6, Canada',
  location: { latitude: 49.2790886, longitude: -122.9201795 },
};

export const defaultCommutes: Commute[] = [
  {
    id: 'work', name: 'Work', origin: lonsdaleQuay.address,
    destination: bcitBurnaby.address, days: [1, 2, 3, 4, 5],
    arrivalTime: '08:30', bufferMinutes: 10,
    estimatedDurationSeconds: 1183, travelMode: 'driving',
  },
  {
    id: 'class', name: 'Evening class', origin: lonsdaleQuay.address,
    destination: sfuBurnaby.address, days: [2],
    arrivalTime: '18:00', bufferMinutes: 10,
    estimatedDurationSeconds: 1803, travelMode: 'driving',
  },
];
