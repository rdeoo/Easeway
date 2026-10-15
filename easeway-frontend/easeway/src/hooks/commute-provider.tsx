import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, Platform } from 'react-native';

import {
  calculatePlan, DEFAULT_DESTINATION, DEFAULT_ORIGIN, DEMO_ROUTE, googleMapsUrl,
  localDateValue, parseArrival, parseBuffer, type CommutePlan,
} from '@/lib/commute';
import { getGoogleRoute } from '@/lib/google-maps';

export type CommuteResult = {
  plan: CommutePlan;
  origin: string;
  destination: string;
  distanceMeters: number;
  route: google.maps.routes.Route | null;
  warnings: string[];
};

type Inputs = { origin: string; destination: string; date: string; time: string; buffer: string };

function initialInputs(): Inputs {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    origin: DEFAULT_ORIGIN, destination: DEFAULT_DESTINATION, date: localDateValue(tomorrow),
    time: '09:00', buffer: '10',
  };
}

function useCommuteState() {
  const live = Platform.OS === 'web' && Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
  const [inputs, setInputs] = useState(initialInputs);
  const [result, setResult] = useState<CommuteResult | null>(() => {
    if (live) return null;
    const sample = DEMO_ROUTE;
    return {
      plan: calculatePlan(parseArrival(inputs.date, inputs.time), sample.durationMinutes, Number(inputs.buffer)),
      origin: inputs.origin, destination: inputs.destination,
      distanceMeters: sample.distanceMeters, route: null, warnings: [],
    };
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => { clearInterval(timer); requestId.current += 1; };
  }, []);

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    requestId.current += 1;
    setInputs((previous) => ({ ...previous, [key]: value }));
    setResult(null);
    setError('');
    setBusy(false);
  }

  async function planCommute(): Promise<boolean> {
    const id = ++requestId.current;
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const origin = inputs.origin.trim();
      const destination = inputs.destination.trim();
      if (!origin || !destination) throw new Error('Enter both your starting point and destination.');
      if (origin.toLowerCase() === destination.toLowerCase()) {
        throw new Error('Choose a destination different from your starting point.');
      }
      const arrival = parseArrival(inputs.date, inputs.time);
      const buffer = parseBuffer(inputs.buffer);
      const estimate = live ? await getGoogleRoute(origin, destination) : null;
      if (id !== requestId.current) return false;
      const sample = DEMO_ROUTE;
      setNow(Date.now());
      setResult({
        plan: calculatePlan(arrival, estimate ? estimate.durationMinutes : sample.durationMinutes, buffer),
        origin, destination, route: estimate?.route ?? null,
        distanceMeters: estimate ? estimate.distanceMeters : sample.distanceMeters,
        warnings: estimate?.warnings ?? [],
      });
      return true;
    } catch (cause: unknown) {
      if (id === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to plan this commute. Please try again.');
      }
      return false;
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  async function openDirections() {
    if (!result) return;
    setError('');
    try {
      await Linking.openURL(googleMapsUrl(result.origin, result.destination));
    } catch (cause: unknown) {
      setError(`Unable to open Google Maps. ${cause instanceof Error ? cause.message : 'Please try again.'}`);
    }
  }

  return { inputs, result, error, busy, now, live, update, planCommute, openDirections };
}

const CommuteContext = createContext<ReturnType<typeof useCommuteState> | null>(null);

export function CommuteProvider({ children }: { children: ReactNode }) {
  const state = useCommuteState();
  return <CommuteContext.Provider value={state}>{children}</CommuteContext.Provider>;
}

export function useCommute() {
  const state = useContext(CommuteContext);
  if (!state) throw new Error('Commute screens must be inside CommuteProvider.');
  return state;
}
