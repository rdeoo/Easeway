import { DemoMap } from './demo-map';

export type RouteMapProps = {
  live: boolean;
  route: google.maps.routes.Route | null;
  compact?: boolean;
};

export default function RouteMap({ compact }: RouteMapProps) {
  return <DemoMap compact={compact} />;
}
