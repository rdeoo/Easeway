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
