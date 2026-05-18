/**
 * MongoDB Source Environment Utilities
 * 
 * Provides utility functions to check for the presence of MongoDB 
 * connection strings in the environment. It supports multiple 
 * source-specific URI keys (local, cloud) and the default URI key.
 */

/**
 * Checks if a specific environment variable exists and has a non-empty trimmed value.
 * 
 * @param env - The environment object to check.
 * @param key - The environment variable key.
 * @returns True if the value exists and is not empty.
 */
const hasTrimmedEnvValue = (env: NodeJS.ProcessEnv, key: string): boolean => {
  const value = env[key];
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Determines if any valid MongoDB source configuration is present in the environment.
 * Checks for:
 * - MONGODB_URI (default)
 * - MONGODB_LOCAL_URI
 * - MONGODB_CLOUD_URI
 *
 * @param env - Optional environment object to check (defaults to process.env).
 * @returns True if at least one MongoDB URI is configured.
 */
export const hasConfiguredMongoSourceEnv = (env: NodeJS.ProcessEnv = process.env): boolean =>
  hasTrimmedEnvValue(env, 'MONGODB_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_CLOUD_URI');

/**
 * Determines if StudiQ MongoDB is explicitly configured via environment variables.
 * Returns false when only hardcoded local defaults (127.0.0.1:27018) would be used.
 */
export const hasStudiqMongoSourceEnv = (env: NodeJS.ProcessEnv = process.env): boolean =>
  hasTrimmedEnvValue(env, 'STUDIQ_MONGODB_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_STUDIQ_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'STUDIQ_MONGODB_CLOUD_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_STUDIQ_CLOUD_URI') ||
  hasTrimmedEnvValue(env, 'STUDIQ_MONGODB_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_STUDIQ_URI');

/**
 * Determines if CMS Builder MongoDB is explicitly configured via environment variables.
 * Returns false when only hardcoded local defaults (127.0.0.1:27019) would be used.
 */
export const hasCmsBuilderMongoSourceEnv = (env: NodeJS.ProcessEnv = process.env): boolean =>
  hasTrimmedEnvValue(env, 'CMS_BUILDER_MONGODB_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_CMS_BUILDER_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'CMS_BUILDER_MONGODB_CLOUD_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_CMS_BUILDER_CLOUD_URI') ||
  hasTrimmedEnvValue(env, 'CMS_BUILDER_MONGODB_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_CMS_BUILDER_URI');

/**
 * Determines if Ecommerce (Stargater) MongoDB is explicitly configured via environment variables.
 * Returns false when only hardcoded local defaults (127.0.0.1:27021) would be used.
 */
export const hasEcommerceMongoSourceEnv = (env: NodeJS.ProcessEnv = process.env): boolean =>
  hasTrimmedEnvValue(env, 'ECOM_MONGODB_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_ECOM_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'ECOM_MONGODB_CLOUD_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_ECOM_CLOUD_URI') ||
  hasTrimmedEnvValue(env, 'ECOM_MONGODB_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_ECOM_URI') ||
  hasTrimmedEnvValue(env, 'PRODUCTS_MONGODB_CLOUD_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_PRODUCTS_CLOUD_URI');

/**
 * Determines if Arch MongoDB is explicitly configured via environment variables.
 * Returns false when only hardcoded local defaults (127.0.0.1:27022) would be used.
 */
export const hasArchMongoSourceEnv = (env: NodeJS.ProcessEnv = process.env): boolean =>
  hasTrimmedEnvValue(env, 'ARCH_MONGODB_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_ARCH_LOCAL_URI') ||
  hasTrimmedEnvValue(env, 'ARCH_MONGODB_CLOUD_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_ARCH_CLOUD_URI') ||
  hasTrimmedEnvValue(env, 'ARCH_MONGODB_URI') ||
  hasTrimmedEnvValue(env, 'MONGODB_ARCH_URI');
