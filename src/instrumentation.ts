/**
 * Next.js Instrumentation Entry Point
 * 
 * This file is automatically loaded by Next.js before the application starts.
 * It handles runtime-specific initialization for both Edge and Node.js environments.
 */

/**
 * Parse environment variable as boolean
 * Accepts: '1', 'true', 'yes', 'on' (case-insensitive)
 */
const parseEnvBoolean = (value: string | undefined): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

/**
 * Check if Node.js instrumentation should be skipped
 * Useful for debugging or when running in specific environments
 */
export const shouldSkipNodeInstrumentation = (
  env: NodeJS.ProcessEnv = process.env
): boolean => parseEnvBoolean(env['SKIP_NEXT_NODE_INSTRUMENTATION']);

/**
 * Main instrumentation registration function
 * Routes to appropriate runtime-specific initialization:
 * - Edge runtime: Lightweight initialization for edge functions
 * - Node.js runtime: Full server-side initialization with database, monitoring, etc.
 */
export async function register(): Promise<void> {
  // Edge runtime: Vercel Edge Functions, Middleware
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    const { registerEdgeInstrumentation } = await import('./instrumentation.edge');
    await registerEdgeInstrumentation();
    return;
  }

  // Node.js runtime: API routes, Server Components, SSR
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    if (shouldSkipNodeInstrumentation()) {
      return;
    }

    const { registerNodeInstrumentation } = await import('./instrumentation.node');
    await registerNodeInstrumentation();
  }
}
