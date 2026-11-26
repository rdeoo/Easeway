// Web: use the browser's localStorage (absent during static rendering).
export const authStorage =
  typeof window === 'undefined' ? undefined : window.localStorage;
