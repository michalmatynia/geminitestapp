import { z } from 'zod';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';


const captureException = async (
  error: unknown,
  context: { source: string; context?: Record<string, unknown>; critical?: boolean }
): Promise<void> => {
  try {
    await reportRuntimeCatch(error, {
      source: context.source,
      action: 'captureException',
      critical: context.critical,
      ...(context.context ?? {}),
    });
  } catch (reportingError) {
    console.error('[env-validation] Failed to capture exception', reportingError, {
      originalError: error,
      context,
    });
  }
};

/**
 * Schema for all application environment variables.
 * Ensures critical configuration is present and valid at runtime.
 */
const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  MONGODB_DB: z.string().default('app'),
  APP_DB_PROVIDER: z.enum(['mongodb']).optional(),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_LOGGING: z.coerce.boolean().default(false),
  AUTH_DEBUG: z.coerce.boolean().default(false),
  AUTH_TOKEN_REFRESH_TTL_MS: z.coerce.number().int().positive().default(60000),
  AUTH_ENCRYPTION_KEY: z.string().optional(),
  AUTH_DB_PROVIDER: z.enum(['mongodb']).optional(),

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

  // OpenTelemetry
  OTEL_ENABLED: z.coerce.boolean().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_SERVICE_VERSION: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_TRACES_SAMPLER: z.string().optional(),
  OTEL_TRACES_SAMPLER_ARG: z.string().optional(),
  CENTRAL_LOG_WEBHOOK_URL: z.string().url().optional(),
  QUERY_TELEMETRY_STORE_RAW_KEYS: z.coerce.boolean().optional(),
  SYSTEM_LOG_ALERTS_ENABLED: z.coerce.boolean().optional(),
  CRITICAL_ERROR_NOTIFICATIONS_ENABLED: z.coerce.boolean().optional(),
  CRITICAL_ERROR_WEBHOOK_URL: z.string().url().optional(),
  CRITICAL_ERROR_MIN_LEVEL: z.enum(['info', 'warn', 'error']).optional(),
  CRITICAL_ERROR_THROTTLE_SECONDS: z.coerce.number().int().positive().optional(),
});

/**
 * Validated environment variables.
 * In development, missing vars will throw a clear error.
 */
function getEnv(): z.infer<typeof envSchema> {
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
    const fallbackEnv = envSchema.parse({});
    const partialEnv = envSchema.partial().parse(process.env);
    return {
      ...fallbackEnv,
      ...partialEnv,
    };
  }

  return result.data;
}

export const env = getEnv();

/**
 * Validates that at least one primary database is configured.
 */
export function validateDatabaseConfig() {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured.');
  }
}
