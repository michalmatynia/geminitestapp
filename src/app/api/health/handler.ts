import { MongoClient } from 'mongodb';
import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { configurationError } from '@/shared/errors/app-error';
import { getAppDbProvider, type AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getNodeOtelRuntimeStatus } from '@/shared/lib/observability/otel-node';
import { getCentralLoggingRuntimeStats } from '@/shared/lib/observability/system-logger';
import { getSystemLogAlertsQueueStatus } from '@/shared/lib/observability/workers/systemLogAlertsQueue';
import { getQueueHealth } from '@/shared/lib/queue/registry';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const pingMongo = async (uri: string): Promise<void> => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    await client.db().command({ ping: 1 });
  } finally {
    await client.close().catch(() => {});
  }
};

const normalizeProviderFromEnv = (): AppDbProvider | 'unknown' => {
  const envProvider = process.env['APP_DB_PROVIDER']?.toLowerCase();
  if (envProvider === 'mongodb') return 'mongodb';
  if (process.env['MONGODB_URI']) return 'mongodb';
  return 'unknown';
};

const shouldSkipDbCheck = process.env['SKIP_HEALTH_DB_CHECK'] === 'true';

const resolveProvider = async (): Promise<AppDbProvider | 'unknown'> => {
  if (shouldSkipDbCheck) {
    return normalizeProviderFromEnv();
  }
  try {
    return await getAppDbProvider();
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (process.env['MONGODB_URI']) return 'mongodb';
    return 'unknown';
  }
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const startedAtMs = Date.now();
  const provider = await resolveProvider();
  const db = {
    provider,
    ok: false,
    error: null as string | null,
  };

  try {
    if (shouldSkipDbCheck) {
      db.ok = true;
    } else if (provider === 'mongodb') {
      const uri = process.env['MONGODB_URI'];
      if (!uri) {
        throw configurationError('MONGODB_URI missing');
      }
      await pingMongo(uri);
      db.ok = true;
    } else {
      throw configurationError('No database provider configured.');
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
    db.error = error instanceof Error ? error.message : 'Database ping failed';
  }

  const alertsState = getSystemLogAlertsQueueStatus();
  const centralLogging = getCentralLoggingRuntimeStats();
  const otel = getNodeOtelRuntimeStatus();
  let alertQueueHealth: Record<string, unknown> | null = null;
  try {
    const queueHealth = await getQueueHealth();
    alertQueueHealth =
      queueHealth['system-log-alerts'] && typeof queueHealth['system-log-alerts'] === 'object'
        ? (queueHealth['system-log-alerts'] as Record<string, unknown>)
        : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    alertQueueHealth = null;
  }

  const observability = {
    logPersistencePath: provider,
    ingestionMode:
      process.env['QUERY_TELEMETRY_BLOCKING_INGESTION'] === 'true' ? 'blocking' : 'non-blocking',
    otel,
    centralizedLogging: centralLogging,
    alertWorker: {
      enabled: alertsState.enabled,
      workerStarted: alertsState.workerStarted,
      schedulerRegistered: alertsState.schedulerRegistered,
      startupTickQueued: alertsState.startupTickQueued,
      queue: alertQueueHealth,
    },
  };

  const ok = db.ok;
  return Response.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAtMs,
      db,
      observability,
    },
    { status: ok ? 200 : 503 }
  );
}
