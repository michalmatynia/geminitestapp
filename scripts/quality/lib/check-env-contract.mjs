import { sortIssues, summarizeIssues, summarizeRules, createIssue } from './check-runner.mjs';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const hasValue = (value) => normalizeString(value).length > 0;

const parseUrl = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return { ok: false, normalized: '' };
  try {
    return { ok: true, normalized: new URL(normalized).toString() };
  } catch {
    return { ok: false, normalized };
  }
};

const isKnownAppProvider = (value) => value === 'prisma' || value === 'mongodb';

export const analyzeEnvContract = ({
  env = process.env,
  generatedAt = new Date().toISOString(),
} = {}) => {
  const issues = [];
  const nodeEnv = normalizeString(env['NODE_ENV']) || 'development';
  const databaseUrl = normalizeString(env['DATABASE_URL']);
  const mongoUri = normalizeString(env['MONGODB_URI']);
  const appDbProvider = normalizeString(env['APP_DB_PROVIDER']).toLowerCase();
  const authSecret = normalizeString(env['AUTH_SECRET']);
  const nextAuthSecret = normalizeString(env['NEXTAUTH_SECRET']);
  const redisUrl = normalizeString(env['REDIS_URL']);
  const redisTls = normalizeString(env['REDIS_TLS']).toLowerCase();
  const enableRateLimits = normalizeString(env['ENABLE_RATE_LIMITS']).toLowerCase();
  const disableRateLimits = normalizeString(env['DISABLE_RATE_LIMITS']).toLowerCase();

  if (!hasValue(databaseUrl) && !hasValue(mongoUri)) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'database-provider-missing',
        message: 'No database provider is configured. Set DATABASE_URL or MONGODB_URI.',
      })
    );
  }

  if (hasValue(appDbProvider) && !isKnownAppProvider(appDbProvider)) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'app-db-provider-invalid',
        message: `APP_DB_PROVIDER="${appDbProvider}" is invalid. Expected "prisma" or "mongodb".`,
      })
    );
  }

  if (appDbProvider === 'prisma' && !hasValue(databaseUrl)) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'app-db-provider-prisma-missing-url',
        message: 'APP_DB_PROVIDER=prisma requires DATABASE_URL.',
      })
    );
  }

  if (appDbProvider === 'mongodb' && !hasValue(mongoUri)) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'app-db-provider-mongodb-missing-url',
        message: 'APP_DB_PROVIDER=mongodb requires MONGODB_URI.',
      })
    );
  }

  if (hasValue(databaseUrl) && hasValue(mongoUri) && !hasValue(appDbProvider)) {
    issues.push(
      createIssue({
        severity: 'warn',
        ruleId: 'dual-database-provider-implicit-fallback',
        message:
          'DATABASE_URL and MONGODB_URI are both configured while APP_DB_PROVIDER is unset. App data will default to MongoDB unless Database Engine routing overrides it.',
      })
    );
  }

  if (hasValue(databaseUrl) && !parseUrl(databaseUrl).ok) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'database-url-invalid',
        message: 'DATABASE_URL is not a valid URL.',
      })
    );
  }

  if (hasValue(mongoUri) && !parseUrl(mongoUri).ok) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'mongodb-uri-invalid',
        message: 'MONGODB_URI is not a valid URL.',
      })
    );
  }

  if (nodeEnv === 'production' && !hasValue(authSecret) && !hasValue(nextAuthSecret)) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'auth-secret-missing-production',
        message: 'Production environment requires AUTH_SECRET or NEXTAUTH_SECRET.',
      })
    );
  }

  if (authSecret && nextAuthSecret && authSecret !== nextAuthSecret) {
    issues.push(
      createIssue({
        severity: 'warn',
        ruleId: 'auth-secret-mismatch',
        message: 'AUTH_SECRET and NEXTAUTH_SECRET are both set but differ.',
      })
    );
  }

  if (authSecret === 'dev-secret-change-me' || nextAuthSecret === 'dev-secret-change-me') {
    issues.push(
      createIssue({
        severity: nodeEnv === 'production' ? 'error' : 'warn',
        ruleId: 'auth-secret-dev-fallback',
        message: 'A development fallback auth secret is configured.',
      })
    );
  }

  if (redisTls === 'true' && !hasValue(redisUrl)) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'redis-tls-without-url',
        message: 'REDIS_TLS=true requires REDIS_URL.',
      })
    );
  }

  if (hasValue(redisUrl) && !parseUrl(redisUrl).ok) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'redis-url-invalid',
        message: 'REDIS_URL is not a valid URL.',
      })
    );
  }

  if (enableRateLimits === 'true' && disableRateLimits === 'true') {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'rate-limit-flags-conflict',
        message: 'ENABLE_RATE_LIMITS=true conflicts with DISABLE_RATE_LIMITS=true.',
      })
    );
  }

  const fastCometValues = {
    uploadUrl: normalizeString(env['FASTCOMET_STORAGE_UPLOAD_URL']),
    baseUrl: normalizeString(env['FASTCOMET_STORAGE_BASE_URL']),
    deleteUrl: normalizeString(env['FASTCOMET_STORAGE_DELETE_URL']),
    authToken: normalizeString(env['FASTCOMET_STORAGE_AUTH_TOKEN']),
    keepLocalCopy: normalizeString(env['FASTCOMET_STORAGE_KEEP_LOCAL_COPY']),
    timeoutMs: normalizeString(env['FASTCOMET_STORAGE_TIMEOUT_MS']),
  };
  const hasFastCometConfig = Object.values(fastCometValues).some(hasValue);

  if (hasFastCometConfig && !hasValue(fastCometValues.uploadUrl)) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'fastcomet-upload-url-missing',
        message:
          'FASTCOMET storage env is partially configured but FASTCOMET_STORAGE_UPLOAD_URL is missing.',
      })
    );
  }

  if (hasFastCometConfig && !hasValue(fastCometValues.baseUrl)) {
    issues.push(
      createIssue({
        severity: 'warn',
        ruleId: 'fastcomet-base-url-missing',
        message:
          'FASTCOMET storage env is configured without FASTCOMET_STORAGE_BASE_URL. Upload responses must return absolute URLs.',
      })
    );
  }

  if (hasValue(fastCometValues.uploadUrl) && !parseUrl(fastCometValues.uploadUrl).ok) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'fastcomet-upload-url-invalid',
        message: 'FASTCOMET_STORAGE_UPLOAD_URL is not a valid URL.',
      })
    );
  }

  if (hasValue(fastCometValues.baseUrl) && !parseUrl(fastCometValues.baseUrl).ok) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'fastcomet-base-url-invalid',
        message: 'FASTCOMET_STORAGE_BASE_URL is not a valid URL.',
      })
    );
  }

  if (hasValue(fastCometValues.deleteUrl) && !parseUrl(fastCometValues.deleteUrl).ok) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'fastcomet-delete-url-invalid',
        message: 'FASTCOMET_STORAGE_DELETE_URL is not a valid URL.',
      })
    );
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt,
    status: summary.status,
    summary,
    environment: {
      nodeEnv,
      hasDatabaseUrl: hasValue(databaseUrl),
      hasMongoUri: hasValue(mongoUri),
      appDbProvider: appDbProvider || null,
      hasAuthSecret: hasValue(authSecret),
      hasNextAuthSecret: hasValue(nextAuthSecret),
      hasRedisUrl: hasValue(redisUrl),
      hasFastCometConfig,
    },
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
