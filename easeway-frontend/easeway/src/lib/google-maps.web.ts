import type { RouteEstimate } from './commute';

let mapsPromise: Promise<void> | undefined;

declare global {
  interface Window {
    easewayMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

export function loadGoogleMaps(): Promise<void> {
  if (mapsPromise) return mapsPromise;
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to use live routes.'));

  mapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => fail('Google Maps timed out. Check your connection and retry.'), 20_000);
    const fail = (message: string) => {
      clearTimeout(timeout);
      script.remove();
      mapsPromise = undefined;
      reject(new Error(message));
    };
    window.gm_authFailure = () => {
      window.dispatchEvent(new Event('easeway-maps-auth-error'));
      fail('Google Maps authorization failed. Check the API key, billing, enabled APIs, and referrer restrictions.');
    };
    window.easewayMapsReady = () => {
      clearTimeout(timeout);
      resolve();
    };
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=easewayMapsReady`;
    script.onerror = () => fail('Google Maps could not load. Check your connection and API configuration.');
    document.head.appendChild(script);
  });
  return mapsPromise;
}

export async function getGoogleRoute(
  origin: string,
  destination: string,
): Promise<RouteEstimate> {
  await loadGoogleMaps();
  const { Route } = await google.maps.importLibrary('routes') as google.maps.RoutesLibrary;
  const { routes } = await Route.computeRoutes({
    origin,
    destination,
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_UNAWARE',
    fields: ['durationMillis', 'distanceMeters', 'path', 'viewport', 'warnings'],
  });
  const route = routes?.[0];
  if (
    !route || typeof route.durationMillis !== 'number' ||
    !Number.isFinite(route.durationMillis) || route.durationMillis <= 0 ||
    typeof route.distanceMeters !== 'number' || !Number.isFinite(route.distanceMeters)
  ) {
    throw new Error('No route found. Try a more specific origin or destination.');
  }
  return {
    route,
    durationMinutes: route.durationMillis / 60_000,
    distanceMeters: route.distanceMeters,
    warnings: route.warnings ?? [],
  };
}
