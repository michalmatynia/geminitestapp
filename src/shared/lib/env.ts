import { z } from 'zod';

const captureException = async (
  error: unknown,
  context: { source: string; context?: Record<string, unknown>; critical?: boolean }
): Promise<void> => {
  try {
    const mod = await import('@/shared/lib/observability/system-logger');
    await  mod.ErrorSystem.captureException(error, {
      service: context.source,
      ...context.context,
      critical: context.critical,
    });
  } catch {
    // ignore
  }
};

/**
 * Schema for all application environment variables.
 * Ensures critical configuration is present and valid at runtime.
 */
const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  MONGODB_URI: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  MONGODB_DB: z.string().default('app'),
  APP_DB_PROVIDER: z.enum(['prisma', 'mongodb']).optional(),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_LOGGING: z.coerce.boolean().default(false),
  AUTH_DEBUG: z.coerce.boolean().default(false),
  AUTH_TOKEN_REFRESH_TTL_MS: z.coerce.number().int().positive().default(60000),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),

  // Integrations
  BASE_API_URL: z.string().url().default('https://api.baselinker.com/connector.php'),
  INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
  ALLEGRO_AUTH_URL: z.string().url().optional(),
  ALLEGRO_TOKEN_URL: z.string().url().optional(),

  // Media
  IMAGEKIT_ID: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Features & Debug
  AI_JOBS_INLINE: z.coerce.boolean().default(false),
  DEBUG_API_TIMING: z.coerce.boolean().default(false),
  DEBUG_SETTINGS: z.coerce.boolean().default(false),
  ENABLE_RATE_LIMITS: z.coerce.boolean().default(true),
  DISABLE_RATE_LIMITS: z.coerce.boolean().default(false),
});

/**
 * Validated environment variables.
 * In development, missing vars will throw a clear error.
 */
function getEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.flatten().fieldErrors;
    const missing = Object.keys(issues).join(', ');

    void captureException(new Error(`Invalid environment variables: ${missing}`), {
      source: 'env-validation',
      context: { missing, issues },
      critical: true,
    });

    if (process.env['NODE_ENV'] === 'production') {
      throw new Error(`Critical environment variables missing or invalid: ${missing}`);
    }

    // In dev, we return partially valid env to allow starting
    return process.env as unknown as z.infer<typeof envSchema>;
  }

  return result.data;
}

export const env = getEnv();

/**
 * Validates that at least one primary database is configured.
 */
export function validateDatabaseConfig() {
  if (!env.DATABASE_URL && !env.MONGODB_URI) {
    throw new Error('Either DATABASE_URL or MONGODB_URI must be configured.');
  }
}
