import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { DemoMap } from './demo-map';
import type { RouteMapProps } from './route-map';
import { loadGoogleMaps } from '@/lib/google-maps.web';

export default function RouteMap({ live, route, compact }: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!live) return;
    let active = true;
    const authFailure = () => {
      if (active) setError('Google Maps authorization failed. Check billing, APIs, and key restrictions.');
    };
    window.addEventListener('easeway-maps-auth-error', authFailure);
    loadGoogleMaps()
      .then(async () => {
        const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
        if (active && container.current) {
          setMap(new Map(container.current, {
            center: { lat: 49.2827, lng: -123.1207 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          }));
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Google Maps failed to load.');
      });
    return () => {
      active = false;
      window.removeEventListener('easeway-maps-auth-error', authFailure);
    };
  }, [live, attempt]);

  useEffect(() => {
    if (!map || !route) return;
    const polylines = route.createPolylines({ polylineOptions: { strokeColor: '#247565', strokeWeight: 6 } });
    polylines.forEach((line) => line.setMap(map));
    if (route.viewport) map.fitBounds(route.viewport, 35);
    return () => polylines.forEach((line) => line.setMap(null));
  }, [map, route]);

  if (!live) return <DemoMap compact={compact} />;
  return (
    <View>
      <div ref={container} aria-label="Google Maps commute route" style={{ height: compact ? 170 : 300, borderRadius: 14, overflow: 'hidden', background: '#edf0e8' }} />
      {error ? (
        <View style={{ gap: 8, paddingTop: 10 }}>
          <Text accessibilityRole="alert" style={{ color: '#ff8b95' }}>{error}</Text>
          <button type="button" onClick={() => { setError(''); setMap(null); setAttempt((value) => value + 1); }}>Retry map</button>
        </View>
      ) : !map ? <Text style={{ paddingTop: 10, color: '#9eabbc' }}>Loading Google Maps...</Text> : null}
    </View>
  );
}
