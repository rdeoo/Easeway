import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { C, F } from '../constants/theme';
import { searchPlaces, verifyPlace, type PlaceSuggestion, type VerifiedPlace } from '../services/places';

type Props = {
  label: string;
  value: VerifiedPlace | null;
  onChange: (place: VerifiedPlace | null) => void;
  disabled?: boolean;
};

export function PlaceField({ label, value, onChange, disabled }: Props) {
  const [query, setQuery] = useState(value?.address ?? '');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sessionToken = useRef(randomUUID());
  const revision = useRef(0);

  useEffect(() => {
    if (value || busy || query.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const places = await searchPlaces(query.trim(), sessionToken.current, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(places);
          setError(places.length ? '' : 'No locations found. Try a more specific search.');
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Location search failed.');
        }
      }
    }, 350);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, value, busy]);

  useEffect(() => () => { revision.current += 1; }, []);

  const select = async (suggestion: PlaceSuggestion) => {
    const currentRevision = ++revision.current;
    setBusy(true);
    setError('');
    setSuggestions([]);
    try {
      const place = await verifyPlace(suggestion.place_id, sessionToken.current);
      if (currentRevision === revision.current) {
        setQuery(place.address);
        onChange(place);
      }
    } catch (cause) {
      if (currentRevision === revision.current) {
        setError(cause instanceof Error ? cause.message : 'Location could not be verified.');
      }
    } finally {
      sessionToken.current = randomUUID();
      setBusy(false);
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value?.address ?? query}
        editable={!disabled && !busy}
        onChangeText={text => {
          revision.current += 1;
          setQuery(text);
          onChange(null);
          setSuggestions([]);
          setError('');
        }}
        placeholder="Search and select a location"
        placeholderTextColor={C.placeholder}
        style={styles.input}
        autoCorrect={false}
      />
      {busy && <Text style={styles.hint}>Verifying location...</Text>}
      {value && <Text style={styles.hint}>Verified location</Text>}
      {error ? <Text accessibilityRole="alert" style={styles.hint}>{error}</Text> : null}
      {suggestions.map(suggestion => (
        <Pressable
          key={suggestion.place_id}
          accessibilityRole="button"
          onPress={() => select(suggestion)}
          disabled={disabled || busy}
          style={styles.suggestion}
        >
          <Text style={styles.description}>{suggestion.description}</Text>
        </Pressable>
      ))}
      {suggestions.length > 0 && <Text style={styles.hint}>Google Maps</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: F.bold, color: '#819BC3', fontSize: 9, letterSpacing: 1.1 },
  input: {
    minHeight: 36, color: C.text, fontFamily: F.medium, fontSize: 13,
    borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 6,
  },
  suggestion: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  description: { color: C.text, fontFamily: F.regular, fontSize: 12 },
  hint: { color: C.muted, fontFamily: F.regular, fontSize: 11, marginTop: 5 },
});
