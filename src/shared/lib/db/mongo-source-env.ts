const hasTrimmedEnvValue = (env: NodeJS.ProcessEnv, key: string): boolean => {
  const value = env[key];
  return typeof value === 'string' && value.trim().length > 0;
};

export const hasConfiguredMongoSourceEnv = (env: NodeJS.ProcessEnv = process.env): boolean =>
  hasTrimmedEnvValue(env, 'MONGODB_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_CLOUD_URI');
