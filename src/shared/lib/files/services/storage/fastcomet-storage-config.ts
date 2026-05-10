import 'server-only';

import {
  DEFAULT_FASTCOMET_STORAGE_BASE_URL,
  DEFAULT_FASTCOMET_STORAGE_PORT,
  DEFAULT_FASTCOMET_STORAGE_RESOLVE_IP,
  DEFAULT_FASTCOMET_STORAGE_SERVER,
  DEFAULT_FASTCOMET_STORAGE_UPLOAD_PATH,
  type FastCometStorageConfig,
} from '@/shared/lib/files/constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { parseJsonSetting } from '@/shared/utils/settings-json';

const DEFAULT_TIMEOUT_MS = 20_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const LEGACY_FASTCOMET_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeNullableString = (value: unknown): string | null => {
  const trimmed = normalizeString(value);
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeFastCometIpAddress = (value: unknown): string | null => {
  const trimmed = normalizeString(value);
  if (trimmed.length === 0) return null;
  return /^[A-Fa-f0-9:.]+$/.test(trimmed) ? trimmed : null;
};

const clampTimeout = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  const int = Math.floor(parsed);
  return Math.min(Math.max(int, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
};

const normalizePort = (value: unknown, fallback: number | null): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const port = Math.floor(parsed);
  return port >= 1 && port <= 65_535 ? port : fallback;
};

const normalizeUrl = (value: unknown): string => {
  const trimmed = normalizeString(value);
  if (trimmed.length === 0) return '';
  try {
    const url = new URL(trimmed);
    if (LEGACY_FASTCOMET_HOSTS.has(url.hostname.toLowerCase())) {
      const defaultUrl = new URL(DEFAULT_FASTCOMET_STORAGE_BASE_URL);
      url.protocol = defaultUrl.protocol;
      url.hostname = defaultUrl.hostname;
      url.port = defaultUrl.port;
    }
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    void ErrorSystem.captureException(error);
    return '';
  }
};

const normalizeOptionalUrl = (value: unknown): string | null => {
  const normalized = normalizeUrl(value);
  return normalized.length > 0 ? normalized : null;
};

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return fallback;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const readStoredConfigValue = (
  stored: Partial<FastCometStorageConfig>,
  key: keyof FastCometStorageConfig,
  envKey: string
): unknown => stored[key] ?? process.env[envKey];

const readStoredConfigValueWithFallback = (
  stored: Partial<FastCometStorageConfig>,
  key: keyof FastCometStorageConfig,
  envKeys: string[]
): unknown => {
  const storedValue = stored[key];
  if (storedValue !== undefined && storedValue !== null) return storedValue;
  for (const envKey of envKeys) {
    const envValue = process.env[envKey];
    if (envValue !== undefined && envValue.trim().length > 0) return envValue;
  }
  return undefined;
};

const resolveDefaultUploadEndpoint = (baseUrl: string): string => {
  if (baseUrl.length === 0) return '';
  try {
    return new URL(DEFAULT_FASTCOMET_STORAGE_UPLOAD_PATH, `${baseUrl}/`)
      .toString()
      .replace(/\/$/, '');
  } catch (error) {
    void ErrorSystem.captureException(error);
    return '';
  }
};

const resolveFastCometBaseUrl = (stored: Partial<FastCometStorageConfig>): string => {
  const configured = normalizeUrl(
    readStoredConfigValue(stored, 'baseUrl', 'FASTCOMET_STORAGE_BASE_URL')
  );
  return configured.length > 0 ? configured : DEFAULT_FASTCOMET_STORAGE_BASE_URL;
};

const resolveFastCometUploadEndpoint = (
  stored: Partial<FastCometStorageConfig>,
  baseUrl: string
): string => {
  const configured = normalizeUrl(
    readStoredConfigValue(stored, 'uploadEndpoint', 'FASTCOMET_STORAGE_UPLOAD_URL')
  );
  return configured.length > 0 ? configured : resolveDefaultUploadEndpoint(baseUrl);
};

const resolveHostnameFromUrl = (value: string): string | null => {
  try {
    const hostname = new URL(value).hostname.trim();
    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
};

const resolvePortFromUrl = (value: string): number | null => {
  try {
    const url = new URL(value);
    if (url.port.trim().length > 0) return normalizePort(url.port, null);
    return url.protocol === 'http:' ? 80 : DEFAULT_FASTCOMET_STORAGE_PORT;
  } catch {
    return null;
  }
};

const resolveFastCometServer = (
  stored: Partial<FastCometStorageConfig>,
  baseUrl: string,
  uploadEndpoint: string
): string | null =>
  normalizeNullableString(
    readStoredConfigValue(stored, 'server', 'FASTCOMET_STORAGE_SERVER')
  ) ??
  resolveHostnameFromUrl(uploadEndpoint) ??
  resolveHostnameFromUrl(baseUrl) ??
  DEFAULT_FASTCOMET_STORAGE_SERVER;

const resolveFastCometPort = (
  stored: Partial<FastCometStorageConfig>,
  baseUrl: string,
  uploadEndpoint: string
): number | null =>
  normalizePort(
    readStoredConfigValue(stored, 'port', 'FASTCOMET_STORAGE_PORT'),
    resolvePortFromUrl(uploadEndpoint) ?? resolvePortFromUrl(baseUrl) ?? DEFAULT_FASTCOMET_STORAGE_PORT
  );

const resolveFastCometToken = (stored: Partial<FastCometStorageConfig>): string | null =>
  normalizeNullableString(
    readStoredConfigValueWithFallback(stored, 'token', [
      'FASTCOMET_STORAGE_TOKEN',
      'FASTCOMET_STORAGE_AUTH_TOKEN',
    ])
  ) ??
  normalizeNullableString(
    readStoredConfigValue(stored, 'authToken', 'FASTCOMET_STORAGE_AUTH_TOKEN')
  );

const isDefaultFastCometBaseUrl = (baseUrl: string): boolean => {
  try {
    return new URL(baseUrl).hostname === new URL(DEFAULT_FASTCOMET_STORAGE_BASE_URL).hostname;
  } catch {
    return false;
  }
};

const resolveFastCometIpOverride = (
  stored: Partial<FastCometStorageConfig>,
  baseUrl: string
): string | null => {
  const configured = normalizeFastCometIpAddress(
    readStoredConfigValue(stored, 'resolveIp', 'FASTCOMET_STORAGE_RESOLVE_IP')
  );
  if (configured !== null) return configured;
  return isDefaultFastCometBaseUrl(baseUrl) ? DEFAULT_FASTCOMET_STORAGE_RESOLVE_IP : null;
};

export const resolveFastCometConfig = (raw: string | null): FastCometStorageConfig => {
  const stored = parseJsonSetting<Partial<FastCometStorageConfig> | null>(raw, null) ?? {};
  const baseUrl = resolveFastCometBaseUrl(stored);
  const uploadEndpoint = resolveFastCometUploadEndpoint(stored, baseUrl);
  const token = resolveFastCometToken(stored);

  return {
    baseUrl,
    uploadEndpoint,
    deleteEndpoint: normalizeOptionalUrl(
      readStoredConfigValue(stored, 'deleteEndpoint', 'FASTCOMET_STORAGE_DELETE_URL')
    ),
    server: resolveFastCometServer(stored, baseUrl, uploadEndpoint),
    port: resolveFastCometPort(stored, baseUrl, uploadEndpoint),
    username: normalizeNullableString(
      readStoredConfigValue(stored, 'username', 'FASTCOMET_STORAGE_USERNAME')
    ),
    token,
    authToken: token,
    keepLocalCopy: parseBoolean(
      readStoredConfigValue(stored, 'keepLocalCopy', 'FASTCOMET_STORAGE_KEEP_LOCAL_COPY'),
      true
    ),
    timeoutMs: clampTimeout(
      readStoredConfigValue(stored, 'timeoutMs', 'FASTCOMET_STORAGE_TIMEOUT_MS')
    ),
    resolveIp: resolveFastCometIpOverride(stored, baseUrl),
  };
};
