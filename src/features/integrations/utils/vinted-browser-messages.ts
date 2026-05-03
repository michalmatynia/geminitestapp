const normalizeVintedBrowserMessage = (
  value: string | null | undefined
): string => value?.trim().toLowerCase() ?? '';

export const isVintedGoogleSignInBlockedMessage = (
  value: string | null | undefined
): boolean => {
  const normalized = normalizeVintedBrowserMessage(value);
  if (!normalized) return false;
  return (
    normalized.includes('google sign-in is blocked') ||
    normalized.includes('this browser or app may not be secure') ||
    normalized.includes('try using a different browser') ||
    normalized.includes('continue with google') ||
    normalized.includes('use vinted.pl email/password')
  );
};

export const isVintedBrowserAuthRequiredMessage = (
  value: string | null | undefined
): boolean => {
  const normalized = normalizeVintedBrowserMessage(value);
  if (!normalized) return false;
  return (
    normalized.includes('auth_required') ||
    normalized.includes('manual verification') ||
    normalized.includes('browser challenge') ||
    normalized.includes('could not be verified') ||
    normalized.includes('verification is incomplete') ||
    normalized.includes('vinted session expired') ||
    isVintedGoogleSignInBlockedMessage(normalized)
  );
};

export const resolveVintedGoogleSignInBlockedRecoveryDescription = (
  includeRefreshStep = true
): string =>
  includeRefreshStep
    ? 'Google sign-in is blocked in the automated Vinted.pl browser. Use Vinted.pl email/password instead of Continue with Google, then refresh the Vinted browser session and retry.'
    : 'Google sign-in is blocked in the automated Vinted.pl browser. Use Vinted.pl email/password instead of Continue with Google.';
