const parseEnvBoolean = (value: string | undefined): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export const shouldSkipNodeInstrumentation = (
  env: NodeJS.ProcessEnv = process.env
): boolean => parseEnvBoolean(env['SKIP_NEXT_NODE_INSTRUMENTATION']);

export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    const { registerEdgeInstrumentation } = await import('./instrumentation.edge');
    await registerEdgeInstrumentation();
    return;
  }

  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    if (shouldSkipNodeInstrumentation()) {
      return;
    }

    const { registerNodeInstrumentation } = await import('./instrumentation.node');
    await registerNodeInstrumentation();
  }
}
