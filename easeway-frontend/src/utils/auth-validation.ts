export function validateAuthInput(
  screenType: 'login' | 'register', name: string, email: string, password: string,
): string | null {
  if (screenType === 'register' && !name.trim()) return 'Enter your name.';
  if (!email.trim()) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  if (screenType === 'register' && password.length < 8) return 'Use a password with at least 8 characters.';
  if (screenType === 'register' && !password.trim()) return 'Your password cannot contain only spaces.';
  return null;
}
