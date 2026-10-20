import { createContext, useContext, useState, type ReactNode } from 'react';

// Temporary UI data. Replace this provider with FastAPI when integrating.
export type TravelMode = 'driving' | 'transit' | 'bicycling' | 'walking';

export type Commute = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  days: number[];  // Monday = 1 ... Sunday = 7
  arrivalTime: string; // '08:30' local time
  bufferMinutes: number;
  durationMinutes: number; // deterministic demo estimate
  travelMode: TravelMode;
};

const initial: Commute[] = [
  {
    id: 'work', name: 'Work', origin: 'Home', destination: 'BCIT Burnaby',
    days: [1, 2, 3, 4, 5], arrivalTime: '08:30', bufferMinutes: 10,
    durationMinutes: 45, travelMode: 'driving',
  },
  {
    id: 'class', name: 'Evening class', origin: 'Home',
    destination: 'SFU Burnaby Campus', days: [2], arrivalTime: '18:00',
    bufferMinutes: 10, durationMinutes: 40, travelMode: 'driving',
  },
];

type CommuteStore = {
  commutes: Commute[];
  addCommute: (commute: Omit<Commute, 'id'>) => void;
  deleteCommute: (id: string) => void;
};

const Context = createContext<CommuteStore | null>(null);

export function CommuteProvider({ children }: { children: ReactNode }) {
  const [commutes, setCommutes] = useState<Commute[]>(initial);
  const addCommute = (commute: Omit<Commute, 'id'>) => {
    setCommutes(current => [...current, { ...commute, id: String(Date.now()) }]);
  };
  const deleteCommute = (id: string) => {
    setCommutes(current => current.filter(commute => commute.id !== id));
  };
  return (
    <Context.Provider value={{ commutes, addCommute, deleteCommute }}>
      {children}
    </Context.Provider>
  );
}

export function useCommutes() {
  const value = useContext(Context);
  if (!value) throw new Error('useCommutes must be inside CommuteProvider');
  return value;
}

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
  return toMinutes(commute.arrivalTime) - commute.durationMinutes - commute.bufferMinutes;
}

export function formatDays(days: number[]) {
  const ordered = [...days].sort((a, b) => a - b);
  if (ordered.join(',') === '1,2,3,4,5') return 'Mon–Fri';
  if (ordered.length === 7) return 'Every day';
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return ordered.map(d => names[d - 1]).join(', ');
}
