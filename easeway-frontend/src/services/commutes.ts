import { apiRequest } from './api';
import { supabase } from '../lib/supabase';

export type TravelMode = 'driving' | 'transit' | 'bicycling' | 'walking';
type ApiMode = 'drive' | 'transit' | 'bike' | 'walk';

export type Commute = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  days: number[];
  arrivalTime: string;
  bufferMinutes: number;
  estimatedDurationSeconds: number | null;
  travelMode: TravelMode;
};

export type NewCommute = Omit<Commute, 'id' | 'estimatedDurationSeconds'>;

type ApiCommute = {
  id: number;
  name: string;
  origin_address: string;
  destination_address: string;
  days_of_week: number[];
  arrival_time: string;
  arrival_buffer_minutes: number | null;
  estimated_duration_seconds: number | null;
  travel_mode: ApiMode;
};

const apiModes: Record<TravelMode, ApiMode> = {
  driving: 'drive', transit: 'transit', bicycling: 'bike', walking: 'walk',
};
const uiModes: Record<ApiMode, TravelMode> = {
  drive: 'driving', transit: 'transit', bike: 'bicycling', walk: 'walking',
};

function fromApi(commute: ApiCommute): Commute {
  return {
    id: String(commute.id), name: commute.name,
    origin: commute.origin_address, destination: commute.destination_address,
    days: commute.days_of_week.map(day => day === 0 ? 7 : day),
    arrivalTime: commute.arrival_time.slice(0, 5),
    bufferMinutes: commute.arrival_buffer_minutes ?? 0,
    estimatedDurationSeconds: commute.estimated_duration_seconds,
    travelMode: uiModes[commute.travel_mode],
  };
}

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Sign in before managing commutes.');
  return data.session.access_token;
}

export async function listCommutes(signal: AbortSignal) {
  const response = await apiRequest<ApiCommute[]>('/commutes?is_active=true', {
    accessToken: await accessToken(), signal,
  });
  if (!response) throw new Error('Could not load commutes: empty response.');
  return response.map(fromApi);
}

export async function createCommute(commute: NewCommute) {
  const response = await apiRequest<ApiCommute>('/commutes', {
    method: 'POST', accessToken: await accessToken(),
    body: {
      name: commute.name,
      origin_address: commute.origin,
      destination_address: commute.destination,
      days_of_week: commute.days.map(day => day === 7 ? 0 : day),
      arrival_time: commute.arrivalTime,
      arrival_buffer_minutes: commute.bufferMinutes,
      travel_mode: apiModes[commute.travelMode],
    },
  });
  if (!response || response.estimated_duration_seconds === null) {
    throw new Error('The saved commute did not include a travel estimate.');
  }
  return fromApi(response);
}

export async function removeCommute(id: string) {
  await apiRequest(`/commutes/${encodeURIComponent(id)}`, {
    method: 'DELETE', accessToken: await accessToken(),
  });
}
