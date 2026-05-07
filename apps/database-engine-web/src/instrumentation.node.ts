import { logClientError } from '@/shared/utils/observability/client-error-logger';

type InstrumentationGlobal = typeof globalThis & {
  __databaseEngineNodeInstrumentationRegistered?: boolean;
};

const IGNORABLE_PROCESS_ERROR_CODES = new Set(['ECONNRESET', 'ECONNABORTED', 'EPIPE']);

const hasIgnorableAbortMessage = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return (
    normalized === 'aborted' ||
    normalized.includes('socket hang up') ||
    normalized.includes('request aborted') ||
    normalized.includes('client disconnected')
  );
};

const isIgnorableProcessFailure = (reason: unknown): boolean => {
  if (reason instanceof Error) {
    const code = (reason as { code?: unknown }).code;
    if (typeof code === 'string' && IGNORABLE_PROCESS_ERROR_CODES.has(code)) {
      return true;
    }
    return hasIgnorableAbortMessage(reason.message);
  }

  if (typeof reason === 'string') {
    return hasIgnorableAbortMessage(reason);
  }

  return false;
};

export async function prepareDatabaseEngineNodeEnvironment(): Promise<void> {
  const { applyActiveMongoSourceEnv } = await import('@/shared/lib/db/mongo-source');
  await applyActiveMongoSourceEnv();
}

export async function registerDatabaseEngineNodeInstrumentation(): Promise<void> {
  const globalScope = globalThis as InstrumentationGlobal;
  if (globalScope.__databaseEngineNodeInstrumentationRegistered) return;
  globalScope.__databaseEngineNodeInstrumentationRegistered = true;

  await prepareDatabaseEngineNodeEnvironment();

  const { registerLogHandler } = await import('@/shared/utils/logger');
  const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');

  registerLogHandler((level, message, error, context) => {
    void (async () => {
      try {
        const service = (context?.['service'] as string) || 'database-engine-web';
        if (level === 'error') {
          await ErrorSystem.captureException(error || message, {
            service,
            message,
            ...context,
          });
        } else if (level === 'warn') {
          await ErrorSystem.logWarning(message, {
            service,
            ...context,
          });
        } else {
          await ErrorSystem.logInfo(message, {
            service,
            ...context,
          });
        }
      } catch (loggingError) {
        logClientError(loggingError);
      }
    })();
  });

  process.on('unhandledRejection', (reason: unknown) => {
    if (isIgnorableProcessFailure(reason)) return;
    logClientError(reason);
  });

  process.on('uncaughtException', (error: Error) => {
    if (isIgnorableProcessFailure(error)) return;
    logClientError(error);
    setTimeout(() => process.exit(1), 1000);
  });
}
