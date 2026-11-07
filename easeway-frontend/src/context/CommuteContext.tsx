import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { defaultCommutes } from '../constants/default-commutes';
import { createCommute, listCommutes, removeCommute, type Commute, type NewCommute } from '../services/commutes';
export type { Commute, TravelMode } from '../services/commutes';
export { toMinutes, formatTime, departureMinutes } from '../utils/commute-time';

type CommuteStore = {
  commutes: Commute[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  addCommute: (commute: NewCommute) => Promise<void>;
  deleteCommute: (id: string) => Promise<void>;
};

const Context = createContext<CommuteStore | null>(null);

export function CommuteProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return <UserCommuteProvider key={userId ?? 'signed-out'} userId={userId}>
    {children}
  </UserCommuteProvider>;
}

function UserCommuteProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [commutes, setCommutes] = useState<Commute[]>(defaultCommutes);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    listCommutes(controller.signal).then(saved => {
      if (!controller.signal.aborted) setCommutes([...defaultCommutes, ...saved]);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Could not load commutes.');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [userId, attempt]);

  const addCommute = async (commute: NewCommute) => {
    const saved = await createCommute(commute);
    setCommutes(current => [...current, saved]);
  };
  const deleteCommute = async (id: string) => {
    if (!defaultCommutes.some(commute => commute.id === id)) await removeCommute(id);
    setCommutes(current => current.filter(commute => commute.id !== id));
  };
  return (
    <Context.Provider value={{
      commutes, loading, error, retry: () => {
        setLoading(true);
        setError(null);
        setAttempt(current => current + 1);
      },
      addCommute, deleteCommute,
    }}>
      {children}
    </Context.Provider>
  );
}

export function useCommutes() {
  const value = useContext(Context);
  if (!value) throw new Error('useCommutes must be inside CommuteProvider');
  return value;
}

export function formatDays(days: number[]) {
  const ordered = [...days].sort((a, b) => a - b);
  if (ordered.join(',') === '1,2,3,4,5') return 'Mon–Fri';
  if (ordered.length === 7) return 'Every day';
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return ordered.map(d => names[d - 1]).join(', ');
}
