import 'server-only';

import { externalServiceError, timeoutError } from '@/shared/errors/app-error';

import { getNeo4jConfig } from './config';

export interface Neo4jCypherStatement {
  statement: string;
  parameters?: Record<string, unknown>;
}

export interface Neo4jStatementResult {
  columns: string[];
  records: Array<Record<string, unknown>>;
  stats: Record<string, unknown> | null;
}

type Neo4jHttpResponse = {
  results?: Array<{
    columns?: string[];
    data?: Array<{ row?: unknown[] }>;
    stats?: Record<string, unknown>;
  }>;
  errors?: Array<{ code?: string; message?: string }>;
};

const NEO4J_FETCH_RETRY_COUNT = 2;
const NEO4J_FETCH_RETRY_DELAY_MS = 200;

const buildAuthHeader = (username: string, password: string): string =>
  `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

const createTimeoutSignal = (timeoutMs: number): { signal: AbortSignal; clear: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
};

const sleep = async (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const normalizeResults = (payload: Neo4jHttpResponse): Neo4jStatementResult[] =>
  (payload.results ?? []).map((result) => {
    const columns = result.columns ?? [];
    const records = (result.data ?? []).map((entry) =>
      Object.fromEntries(columns.map((column, index) => [column, entry.row?.[index] ?? null]))
    );
    return {
      columns,
      records,
      stats: result.stats ?? null,
    };
  });

export async function runNeo4jStatements(
  statements: Neo4jCypherStatement[]
): Promise<Neo4jStatementResult[]> {
  const config = getNeo4jConfig();
  if (!config.enabled || !config.httpUrl || !config.username || !config.password) {
    throw externalServiceError('Neo4j is not enabled.', {
      enabled: config.enabled,
      hasHttpUrl: Boolean(config.httpUrl),
    });
  }

  const endpoint = `${config.httpUrl}/db/${encodeURIComponent(config.database)}/tx/commit`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= NEO4J_FETCH_RETRY_COUNT; attempt += 1) {
    const timeout = createTimeoutSignal(config.requestTimeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: buildAuthHeader(config.username, config.password),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ statements }),
        signal: timeout.signal,
        cache: 'no-store',
      });

      const payload = (await response.json()) as Neo4jHttpResponse;
      if (!response.ok) {
        throw externalServiceError('Neo4j request failed.', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          errors: payload.errors ?? [],
        });
      }

      if (payload.errors && payload.errors.length > 0) {
        throw externalServiceError('Neo4j returned query errors.', {
          endpoint,
          errors: payload.errors,
        });
      }

      return normalizeResults(payload);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw timeoutError('Neo4j request timed out.', {
          endpoint,
          timeoutMs: config.requestTimeoutMs,
        });
      }

      lastError = error;
      const canRetry =
        attempt < NEO4J_FETCH_RETRY_COUNT &&
        error instanceof Error &&
        error.name !== 'AppError';
      if (!canRetry) {
        throw error;
      }
      await sleep(NEO4J_FETCH_RETRY_DELAY_MS * (attempt + 1));
    } finally {
      timeout.clear();
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Neo4j request failed.');
}

export async function pingNeo4j(): Promise<boolean> {
  try {
    const [result] = await runNeo4jStatements([{ statement: 'RETURN 1 AS ok' }]);
    return result?.records[0]?.['ok'] === 1;
  } catch {
    return false;
  }
}
