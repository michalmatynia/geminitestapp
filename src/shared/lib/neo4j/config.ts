import 'server-only';

import { configurationError } from '@/shared/errors/app-error';

const parseBoolean = (value: string | undefined): boolean =>
  ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const deriveHttpUrlFromUri = (value: string): string => {
  const parsed = new URL(value);
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    return trimTrailingSlash(parsed.origin);
  }

  if (
    parsed.protocol === 'neo4j:' ||
    parsed.protocol === 'neo4j+s:' ||
    parsed.protocol === 'bolt:' ||
    parsed.protocol === 'bolt+s:'
  ) {
    const isSecure = parsed.protocol.endsWith('+s:');
    const httpPort = process.env['NEO4J_HTTP_PORT']?.trim() || (isSecure ? '7473' : '7474');
    const protocol = isSecure ? 'https' : 'http';
    return `${protocol}://${parsed.hostname}:${httpPort}`;
  }

  throw configurationError('NEO4J_URI uses an unsupported protocol.', {
    protocol: parsed.protocol,
  });
};

export interface Neo4jConfig {
  enabled: boolean;
  uri: string | null;
  httpUrl: string | null;
  username: string | null;
  password: string | null;
  database: string;
  requestTimeoutMs: number;
}

export const isNeo4jEnabled = (): boolean =>
  parseBoolean(process.env['NEO4J_ENABLED']) ||
  Boolean(process.env['NEO4J_URI']?.trim() || process.env['NEO4J_HTTP_URL']?.trim());

export const getNeo4jConfig = (): Neo4jConfig => {
  const enabled = isNeo4jEnabled();
  const uri = process.env['NEO4J_URI']?.trim() || null;
  const httpUrlOverride = process.env['NEO4J_HTTP_URL']?.trim() || null;
  const username = process.env['NEO4J_USERNAME']?.trim() || null;
  const password = process.env['NEO4J_PASSWORD']?.trim() || null;
  const database = process.env['NEO4J_DATABASE']?.trim() || 'neo4j';
  const requestTimeoutMs = parsePositiveInt(process.env['NEO4J_REQUEST_TIMEOUT_MS'], 10_000);

  if (!enabled) {
    return {
      enabled: false,
      uri,
      httpUrl: httpUrlOverride,
      username,
      password,
      database,
      requestTimeoutMs,
    };
  }

  const httpUrl = httpUrlOverride ?? (uri ? deriveHttpUrlFromUri(uri) : null);

  if (!httpUrl) {
    throw configurationError('Neo4j is enabled but no NEO4J_URI or NEO4J_HTTP_URL is configured.');
  }

  if (!username || !password) {
    throw configurationError('Neo4j is enabled but credentials are incomplete.', {
      hasUsername: Boolean(username),
      hasPassword: Boolean(password),
    });
  }

  return {
    enabled: true,
    uri,
    httpUrl,
    username,
    password,
    database,
    requestTimeoutMs,
  };
};
