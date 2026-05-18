import type { ObservabilityApplicationId } from '@/shared/contracts/system';

export type ObservabilityLogOrigin = {
  applicationId: ObservabilityApplicationId;
  applicationName: string;
  environment: string | null;
  sourceService: string | null;
  originDatabase: string | null;
  originCollection: string | null;
  originLogId: string | null;
};

type BuildObservabilityLogOriginInput = {
  applicationId?: unknown;
  applicationName?: unknown;
  environment?: unknown;
  sourceService?: unknown;
  originDatabase?: unknown;
  originCollection?: unknown;
  originLogId?: unknown;
  values?: unknown[];
  fallbackApplicationId?: ObservabilityApplicationId;
};

const APPLICATION_NAMES: Record<ObservabilityApplicationId, string> = {
  geminitestapp: 'GeminiTestApp',
  studiq: 'StudiQ',
  'cms-builder': 'CMS Builder',
  stargater: 'Stargater',
  arch: 'Milkbar Designers',
};

const KNOWN_APPLICATION_IDS = new Set<ObservabilityApplicationId>([
  'geminitestapp',
  'studiq',
  'cms-builder',
  'stargater',
  'arch',
]);

const STUDIQ_PATTERN = /(^|[^a-z0-9])(kangur|studiq)([^a-z0-9]|$)/i;
const CMS_BUILDER_PATTERN =
  /(^|[^a-z0-9])(cms-?builder|cms_builder|cmsbuilder|cms-builder-web|admin\/cms|api\/cms|cms\.(pages|themes|slugs|domains|media|css-ai)|cms-page|cms-theme|cms-slug|cms-domain)([^a-z0-9]|$)/i;
const STARGATER_PATTERN = /(^|[^a-z0-9])(stargater|e-?commerce|ecom)([^a-z0-9]|$)/i;
const ARCH_PATTERN = /(^|[^a-z0-9])(milkbar|milkbardesigners|arch-web|mbd)([^a-z0-9]|$)/i;
const GEMINITESTAPP_PATTERN = /(^|[^a-z0-9])(geminitestapp|gemini-test-app)([^a-z0-9]|$)/i;

const trimString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readRecordString = (
  value: unknown,
  keys: readonly string[]
): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const normalized = trimString(record[key]);
    if (normalized !== null) return normalized;
  }
  return null;
};

export const normalizeObservabilityApplicationId = (
  value: unknown
): ObservabilityApplicationId | null => {
  const normalized = trimString(value)?.toLowerCase();
  if (!normalized) return null;

  if (KNOWN_APPLICATION_IDS.has(normalized as ObservabilityApplicationId)) {
    return normalized as ObservabilityApplicationId;
  }
  if (normalized === 'kangur') return 'studiq';
  if (
    normalized === 'cms' ||
    normalized === 'cms-builder-web' ||
    normalized === 'cms_builder' ||
    normalized === 'cmsbuilder'
  ) {
    return 'cms-builder';
  }
  if (normalized === 'ecommerce' || normalized === 'e-com' || normalized === 'ecom') {
    return 'stargater';
  }
  if (normalized === 'milkbar' || normalized === 'milkbardesigners' || normalized === 'arch-web') {
    return 'arch';
  }
  if (normalized === 'gemini') return 'geminitestapp';

  return null;
};

export const getObservabilityApplicationName = (
  applicationId: ObservabilityApplicationId
): string => APPLICATION_NAMES[applicationId];

export const getObservabilityRuntimeEnvironment = (): string | null =>
  trimString(process.env['VERCEL_ENV']) ??
  trimString(process.env['APP_ENV']) ??
  trimString(process.env['NODE_ENV']);

export const resolveObservabilityApplicationIdFromValues = (
  values: unknown[],
  fallbackApplicationId: ObservabilityApplicationId = 'geminitestapp'
): ObservabilityApplicationId => {
  for (const value of values) {
    const exact =
      normalizeObservabilityApplicationId(value) ??
      normalizeObservabilityApplicationId(
        readRecordString(value, [
          'observabilityApplicationId',
          'sourceApplicationId',
          'sourceApplication',
          'applicationId',
          'application',
          'appId',
          'app',
          'surface',
        ])
      );
    if (exact !== null) return exact;
  }

  for (const value of values) {
    const text =
      trimString(value) ??
      readRecordString(value, ['source', 'service', 'route', 'path', 'endpoint', 'key']);
    if (text === null) continue;
    if (STUDIQ_PATTERN.test(text)) return 'studiq';
    if (CMS_BUILDER_PATTERN.test(text)) return 'cms-builder';
    if (STARGATER_PATTERN.test(text)) return 'stargater';
    if (ARCH_PATTERN.test(text)) return 'arch';
    if (GEMINITESTAPP_PATTERN.test(text)) return 'geminitestapp';
  }

  return fallbackApplicationId;
};

export const buildObservabilityLogOrigin = (
  input: BuildObservabilityLogOriginInput
): ObservabilityLogOrigin => {
  const applicationId =
    normalizeObservabilityApplicationId(input.applicationId) ??
    resolveObservabilityApplicationIdFromValues(
      input.values ?? [],
      input.fallbackApplicationId ?? 'geminitestapp'
    );

  return {
    applicationId,
    applicationName:
      trimString(input.applicationName) ?? getObservabilityApplicationName(applicationId),
    environment: trimString(input.environment) ?? getObservabilityRuntimeEnvironment(),
    sourceService: trimString(input.sourceService),
    originDatabase: trimString(input.originDatabase),
    originCollection: trimString(input.originCollection),
    originLogId: trimString(input.originLogId),
  };
};
