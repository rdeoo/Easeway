import { apiRequest } from './api';

export type PlaceSuggestion = { place_id: string; description: string };
export type VerifiedPlace = {
  place_id: string;
  address: string;
  location: { latitude: number; longitude: number };
};

export async function searchPlaces(query: string, sessionToken: string, signal: AbortSignal) {
  const places = await apiRequest<PlaceSuggestion[]>(
    `/places/autocomplete?query=${encodeURIComponent(query)}&session_token=${sessionToken}`,
    { signal },
  );
  if (!places) throw new Error('Location search returned no response.');
  return places;
}

export async function verifyPlace(placeId: string, sessionToken: string) {
  const place = await apiRequest<VerifiedPlace>(
    `/places/details?place_id=${encodeURIComponent(placeId)}&session_token=${sessionToken}`,
  );
  if (!place) throw new Error('Location verification returned no response.');
  return place;
}
