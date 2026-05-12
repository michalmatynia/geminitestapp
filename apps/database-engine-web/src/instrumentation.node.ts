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

type LogContext = Record<string, unknown> | undefined;
type ErrorLogger = {
  captureException: (error: Error, context?: Record<string, unknown>) => void | Promise<void>;
  logWarning: (message: unknown, context?: Record<string, unknown>) => void | Promise<void>;
  logInfo: (message: unknown, context?: Record<string, unknown>) => void | Promise<void>;
};

const getLoggerService = (context: LogContext): string => {
  const contextService = context?.['service'];
  if (typeof contextService === 'string' && contextService.trim() !== '') {
    return contextService;
  }

  return 'database-engine-web';
};

const toErrorInstance = (error: unknown, message: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof message === 'string' ? message : 'database-engine-node error');
};

const logDatabaseEngineNodeEvent = async ({
  level,
  message,
  error,
  context,
  logger,
}: {
  level: string;
  message: unknown;
  error: unknown;
  context: LogContext;
  logger: ErrorLogger;
}): Promise<void> => {
  try {
    const service = getLoggerService(context);
    const eventContext = context ?? {};

    if (level === 'error') {
      await logger.captureException(toErrorInstance(error, message), {
        service,
        message,
        ...eventContext,
      });
      return;
    }

    if (level === 'warn') {
      await logger.logWarning(message, {
        service,
        ...eventContext,
      });
      return;
    }

    await logger.logInfo(message, {
      service,
      ...eventContext,
    });
  } catch (loggingError) {
    logClientError(loggingError);
  }
};

export async function prepareDatabaseEngineNodeEnvironment(): Promise<void> {
  const { applyActiveMongoSourceEnv } = await import('@/shared/lib/db/mongo-source');
  await applyActiveMongoSourceEnv();
}

export async function registerDatabaseEngineNodeInstrumentation(): Promise<void> {
  const globalScope = globalThis as InstrumentationGlobal;
  if (globalScope.__databaseEngineNodeInstrumentationRegistered === true) return;
  globalScope.__databaseEngineNodeInstrumentationRegistered = true;

  await prepareDatabaseEngineNodeEnvironment();

  const { registerLogHandler } = await import('@/shared/utils/logger');
  const { ErrorSystem } = (await import('@/shared/lib/observability/system-logger')) as {
    ErrorSystem: ErrorLogger;
  };

  registerLogHandler((level, message, error, context) => {
    void logDatabaseEngineNodeEvent({
      level,
      message,
      error,
      context,
      logger: ErrorSystem,
    });
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
