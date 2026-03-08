export const KANGUR_MOBILE_AUTH_MODES = [
  'development',
  'learner-session',
] as const;

export type KangurMobileAuthMode = (typeof KANGUR_MOBILE_AUTH_MODES)[number];

export const resolveKangurMobileAuthMode = (
  value: string | undefined,
): KangurMobileAuthMode => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'learner-session') {
    return 'learner-session';
  }

  return 'development';
};
