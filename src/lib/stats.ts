import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface PublicStats {
  totalDonations: number;
  totalRecipients: number;
  uniqueCities: number;
  uniqueStates: number;
}

let cache: { data: PublicStats; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000; // 5 min

export async function getPublicStats(): Promise<PublicStats> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.data;

  const [donSnap, userSnap] = await Promise.all([
    getDocs(collection(db, 'donations')),
    getDocs(collection(db, 'users')),
  ]);

  const cities = new Set<string>();
  const states = new Set<string>();
  donSnap.docs.forEach((d) => {
    const city = d.data().location?.city;
    if (city) cities.add(city.trim().toLowerCase());
  });
  userSnap.docs.forEach((d) => {
    const state = d.data().state;
    if (state) states.add(state.trim().toLowerCase());
  });

  const totalRecipients = userSnap.docs.reduce(
    (sum, d) => sum + (d.data().receivedCount ?? 0), 0
  );

  const data: PublicStats = {
    totalDonations: donSnap.size,
    totalRecipients,
    uniqueCities: cities.size,
    uniqueStates: states.size,
  };

  cache = { data, ts: Date.now() };
  return data;
}
