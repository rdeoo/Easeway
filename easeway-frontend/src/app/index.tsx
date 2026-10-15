import { Redirect } from 'expo-router';

export default function Index() {
  // UI preview: later check the real auth session here.
  return <Redirect href="/login" />;
}
