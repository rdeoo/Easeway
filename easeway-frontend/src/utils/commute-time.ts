import type { Commute } from '../services/commutes';

export function toMinutes(hhmm: string) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTime(minutes: number) {
  const time = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(time / 60);
  const m = time % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function departureMinutes(commute: Commute) {
  if (commute.estimatedDurationSeconds === null) return null;
  return toMinutes(commute.arrivalTime)
    - Math.ceil(commute.estimatedDurationSeconds / 60) - commute.bufferMinutes;
}

export function departureToday(commute: Commute, today: number, currentMinutes: number) {
  const departure = departureMinutes(commute);
  if (departure === null) return null;
  const week = 7 * 1440;
  const candidates = commute.days.map(day => {
    const offset = (day - today) * 1440 + departure;
    return ((offset % week) + week) % week;
  }).filter(minutes => minutes >= currentMinutes && minutes < 1440);
  return candidates.length ? Math.min(...candidates) : null;
}

export type Trip = {
  arrival: Date;
  // Recommended departure from the stored no-traffic estimate; null without an estimate.
  departure: Date | null;
};

const MINUTE_MS = 60_000;
export const TRAFFIC_WINDOW_MAX_MS = 60 * MINUTE_MS;

export function departureBefore(arrival: Date, durationSeconds: number, bufferMinutes: number) {
  return new Date(
    arrival.getTime() - (Math.ceil(durationSeconds / 60) + bufferMinutes) * MINUTE_MS,
  );
}

// The next scheduled trip whose departure (or arrival, without an estimate) is not yet past.
export function nextTrip(commute: Commute, now: Date): Trip | null {
  const [hours, minutes] = commute.arrivalTime.split(':').map(Number);
  for (let offset = 0; offset <= 8; offset += 1) {
    const arrival = new Date(
      now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes,
    );
    const weekday = ((arrival.getDay() + 6) % 7) + 1; // Monday=1
    if (!commute.days.includes(weekday)) continue;
    const departure = commute.estimatedDurationSeconds === null ? null
      : departureBefore(arrival, commute.estimatedDurationSeconds, commute.bufferMinutes);
    // A departure stays current until its minute has fully passed.
    if ((departure ?? arrival).getTime() + MINUTE_MS > now.getTime()) {
      return { arrival, departure };
    }
  }
  return null;
}

// Traffic-aware estimates start 2x the no-traffic duration before departure, at most 1 hour.
export function trafficWindowStart(departure: Date, staticDurationSeconds: number) {
  const lead = Math.min(2 * staticDurationSeconds * 1000, TRAFFIC_WINDOW_MAX_MS);
  return new Date(departure.getTime() - lead);
}

export function isInTrafficWindow(trip: Trip | null, staticDurationSeconds: number | null, now: Date) {
  if (!trip?.departure || staticDurationSeconds === null) return false;
  const time = now.getTime();
  return time >= trafficWindowStart(trip.departure, staticDurationSeconds).getTime()
    && time < trip.departure.getTime() + MINUTE_MS;
}
