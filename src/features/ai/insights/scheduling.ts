const parseEnvBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
};

export const isScheduledAiInsightsEnabled = (
  env: NodeJS.ProcessEnv = process.env
): boolean => parseEnvBoolean(env['ENABLE_SCHEDULED_AI_INSIGHTS']) === true;
