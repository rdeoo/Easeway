import 'expo-sqlite/localStorage/install';

// Android/iOS: expo-sqlite provides a persistent localStorage implementation.
export const authStorage = globalThis.localStorage;
