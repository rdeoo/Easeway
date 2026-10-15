import type { RouteEstimate } from './commute';

export async function getGoogleRoute(
  _origin: string,
  _destination: string,
): Promise<RouteEstimate> {
  throw new Error('Live Google Maps routes are available in the browser preview. Run npm run web.');
}
