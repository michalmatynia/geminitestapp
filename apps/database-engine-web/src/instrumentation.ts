const parseEnvBoolean = (value: string | undefined): boolean => {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export const shouldSkipDatabaseEngineNodeInstrumentation = (
  env: NodeJS.ProcessEnv = process.env
): boolean => parseEnvBoolean(env['SKIP_DATABASE_ENGINE_NODE_INSTRUMENTATION']);

export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;
  if (shouldSkipDatabaseEngineNodeInstrumentation()) return;

  const { registerDatabaseEngineNodeInstrumentation } = await import('./instrumentation.node');
  await registerDatabaseEngineNodeInstrumentation();
}
