/**
 * Environment Variable Validation
 * 
 * Runtime environment variable validation and type safety.
 * Provides:
 * - Zod-based environment schema validation
 * - Type-safe environment variable access
 * - Runtime validation with error reporting
 * - Environment-specific configuration
 * - Critical error handling and logging
 */

import { z } from 'zod';
import { logger } from '@/shared/utils/logger';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

/**
 * Captures an environment validation exception and reports it.
 * 
 * @param error - The error to report.
 * @param context - Reporting context including source and criticality.
 */
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
    logger.error('[env-validation] Failed to capture exception', reportingError, {
      originalError: error,
      context,
    });
  }
};

/**
 * Schema for all application environment variables.
 * Ensures critical configuration is present and valid at runtime.
 * 
 * We use .optional() for many vars to allow the app to boot even if some 
 * features are not configured, but we enforce strictly in validateDatabaseConfig().
 */
const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().url().optional(),
  MONGODB_LOCAL_URI: z.string().url().optional(),
  MONGODB_CLOUD_URI: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  MONGODB_DB: z.string().default('app'),
  MONGODB_LOCAL_DB: z.string().default('app'),
  MONGODB_CLOUD_DB: z.string().default('app'),
  MONGODB_ACTIVE_SOURCE_DEFAULT: z.enum(['local', 'cloud']).optional(),
  STUDIQ_MONGODB_URI: z.string().url().optional(),
  STUDIQ_MONGODB_DB: z.string().optional(),
  STUDIQ_MONGODB_LOCAL_URI: z.string().url().optional(),
  STUDIQ_MONGODB_LOCAL_DB: z.string().optional(),
  STUDIQ_MONGODB_CLOUD_URI: z.string().url().optional(),
  STUDIQ_MONGODB_CLOUD_DB: z.string().optional(),
  CMS_BUILDER_MONGODB_URI: z.string().url().optional(),
  CMS_BUILDER_MONGODB_DB: z.string().optional(),
  CMS_BUILDER_MONGODB_LOCAL_URI: z.string().url().optional(),
  CMS_BUILDER_MONGODB_LOCAL_DB: z.string().optional(),
  CMS_BUILDER_MONGODB_CLOUD_URI: z.string().url().optional(),
  CMS_BUILDER_MONGODB_CLOUD_DB: z.string().optional(),
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
  DEBUG_MONGODB_POOL: z.coerce.boolean().default(false),
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
 * Parses and validates process.env against the schema.
 * 
 * @returns Type-safe environment variables.
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
      // Required environment variables are missing or invalid in production
      throw new Error(`Critical environment variables missing or invalid: ${missing}`);
    }

    // In development, we return partially valid env to allow the developer to see 
    // the app partially running while they fix their .env file.
    const fallbackEnv = envSchema.parse({});
    const partialEnv = envSchema.partial().parse(process.env);
    return {
      ...fallbackEnv,
      ...partialEnv,
    };
  }

  return result.data;
}

/**
 * Validated and type-safe environment variables.
 * Use this instead of process.env throughout the app.
 */
export const env = getEnv();

/**
 * Validates that the database configuration is coherent and safe.
 * 
 * Rules:
 * 1. Must have either MONGODB_URI or (MONGODB_LOCAL_URI/MONGODB_CLOUD_URI).
 * 2. Cannot mix legacy MONGODB_URI with split local/cloud sources.
 * 3. Split sources require MONGODB_ACTIVE_SOURCE_DEFAULT.
 * 4. ACTIVE_SOURCE must point to a configured URI.
 * 
 * @throws Error if the configuration is invalid.
 */
export function validateDatabaseConfig() {
  const hasLegacyMongoConfig = Boolean(env.MONGODB_URI);
  const hasSplitMongoConfig = Boolean(env.MONGODB_LOCAL_URI || env.MONGODB_CLOUD_URI);

  if (!hasLegacyMongoConfig && !hasSplitMongoConfig) {
    throw new Error(
      'MongoDB must be configured. Set MONGODB_URI or one of MONGODB_LOCAL_URI / MONGODB_CLOUD_URI.'
    );
  }

  // Prevent ambiguity between legacy and modern split source config
  if (hasLegacyMongoConfig && hasSplitMongoConfig) {
    throw new Error(
      'Do not mix legacy MONGODB_URI with split MongoDB source envs. Use either MONGODB_URI alone or MONGODB_LOCAL_URI / MONGODB_CLOUD_URI with MONGODB_ACTIVE_SOURCE_DEFAULT.'
    );
  }

  if (env.MONGODB_ACTIVE_SOURCE_DEFAULT && !hasSplitMongoConfig) {
    throw new Error(
      'MONGODB_ACTIVE_SOURCE_DEFAULT requires split MongoDB source envs. Configure MONGODB_LOCAL_URI / MONGODB_CLOUD_URI instead of relying on legacy MONGODB_URI.'
    );
  }

  if (env.MONGODB_LOCAL_URI && env.MONGODB_CLOUD_URI && !env.MONGODB_ACTIVE_SOURCE_DEFAULT) {
    throw new Error(
      'Split MongoDB configuration requires MONGODB_ACTIVE_SOURCE_DEFAULT to be set to "local" or "cloud".'
    );
  }

  if (env.MONGODB_ACTIVE_SOURCE_DEFAULT === 'local' && !env.MONGODB_LOCAL_URI) {
    throw new Error(
      'MONGODB_ACTIVE_SOURCE_DEFAULT=local requires MONGODB_LOCAL_URI to be configured.'
    );
  }

  if (env.MONGODB_ACTIVE_SOURCE_DEFAULT === 'cloud' && !env.MONGODB_CLOUD_URI) {
    throw new Error(
      'MONGODB_ACTIVE_SOURCE_DEFAULT=cloud requires MONGODB_CLOUD_URI to be configured.'
    );
  }
}
