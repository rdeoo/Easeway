export const DEFAULT_ORIGIN = 'Waterfront Station, 601 W Cordova St, Vancouver, BC, Canada';
export const DEFAULT_DESTINATION = 'BCIT Burnaby, 3700 Willingdon Ave, Burnaby, BC, Canada';

// Illustrative values for no-key demos, not measured estimates for this route.
export const DEMO_ROUTE = { durationMinutes: 28, distanceMeters: 9600 };

export type CommutePlan = {
  arrival: Date;
  departure: Date;
  destinationArrival: Date;
  durationMinutes: number;
  bufferMinutes: number;
};

export type RouteEstimate = {
  route: google.maps.routes.Route;
  durationMinutes: number;
  distanceMeters: number;
  warnings: string[];
};

export function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseArrival(date: string, time: string, now = new Date()): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Enter an arrival date as YYYY-MM-DD and a time as HH:MM (24-hour).');
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const arrival = new Date(year, month - 1, day, hours, minutes);
  if (
    arrival.getFullYear() !== year || arrival.getMonth() !== month - 1 ||
    arrival.getDate() !== day || arrival.getHours() !== hours || arrival.getMinutes() !== minutes
  ) {
    throw new Error('Enter a valid local arrival date and time.');
  }
  if (arrival.getTime() <= now.getTime()) {
    throw new Error('Your required arrival time must be in the future.');
  }
  return arrival;
}

export function parseBuffer(value: string): number {
  if (!/^\d{1,3}$/.test(value) || Number(value) > 180) {
    throw new Error('Enter a whole-number buffer from 0 to 180 minutes.');
  }
  return Number(value);
}

export function calculatePlan(
  arrival: Date,
  durationMinutes: number,
  bufferMinutes: number,
): CommutePlan {
  if (!Number.isFinite(arrival.getTime())) {
    throw new Error('The arrival date is invalid.');
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error('No valid travel duration was returned. Try another route.');
  }
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 180) {
    throw new Error('Enter a whole-number buffer from 0 to 180 minutes.');
  }
  // Round up so a partial minute never recommends leaving too late.
  const roundedDuration = Math.ceil(durationMinutes);
  const destinationArrival = new Date(arrival.getTime() - bufferMinutes * 60_000);
  return {
    arrival,
    destinationArrival,
    departure: new Date(destinationArrival.getTime() - roundedDuration * 60_000),
    durationMinutes: roundedDuration,
    bufferMinutes,
  };
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ''}` : `${minutes} min`;
}

export function displayTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function displayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function departureCountdown(departure: Date, now: number): string {
  const remaining = departure.getTime() - now;
  if (remaining <= 0) return 'Recommended departure has passed';
  const minutes = Math.ceil(remaining / 60_000);
  if (minutes < 60) return `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  if (minutes < 1440) return `in ${formatDuration(minutes)}`;
  const days = Math.floor(minutes / 1440);
  return `in ${days} ${days === 1 ? 'day' : 'days'}${minutes % 1440 ? ` ${formatDuration(minutes % 1440)}` : ''}`;
}
export function googleMapsUrl(origin: string, destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}
