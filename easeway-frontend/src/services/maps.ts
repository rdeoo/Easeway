import { apiRequest } from './api';
import { supabase } from '../lib/supabase';
import type { Commute, TravelMode } from './commutes';

type MapsMode = 'drive' | 'transit' | 'walk' | 'bicycle';

const mapsModes: Record<TravelMode, MapsMode> = {
  driving: 'drive', transit: 'transit', walking: 'walk', bicycling: 'bicycle',
};

export type TrafficEstimate = {
  durationSeconds: number;
  staticDurationSeconds: number;
  distanceMeters: number;
};

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Sign in before loading routes.');
  return data.session.access_token;
}

function route(commute: Commute) {
  return {
    origin: commute.origin,
    destination: commute.destination,
    mode: mapsModes[commute.travelMode],
  };
}

export async function getTrafficEstimate(commute: Commute, signal?: AbortSignal) {
  const response = await apiRequest<{
    duration_seconds: number; static_duration_seconds: number; distance_meters: number;
  }>('/maps/estimate', {
    method: 'POST', accessToken: await accessToken(), signal,
    body: { ...route(commute), traffic_aware: true },
  });
  if (!response) throw new Error('Could not get a traffic estimate: empty response.');
  return {
    durationSeconds: response.duration_seconds,
    staticDurationSeconds: response.static_duration_seconds,
    distanceMeters: response.distance_meters,
  } satisfies TrafficEstimate;
}
