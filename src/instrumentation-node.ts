type InstrumentationGlobal = typeof globalThis & {
  __nodeInstrumentationRegistered?: boolean;
  __cmsProcessHandlersRegistered?: boolean;
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

const isIgnorableUncaughtException = (error: Error): boolean => {
  const errorWithCode = error as Error & { code?: unknown };
  const code = typeof errorWithCode.code === 'string' ? errorWithCode.code : null;

  if (code && IGNORABLE_PROCESS_ERROR_CODES.has(code)) {
    return true;
  }

  if (hasIgnorableAbortMessage(error.message)) {
    return true;
  }

  const stack = typeof error.stack === 'string' ? error.stack.toLowerCase() : '';
  return (
    stack.includes('abortincoming (node:_http_server') ||
    stack.includes('socketonclose (node:_http_server')
  );
};

const isIgnorableProcessFailure = (reason: unknown): boolean => {
  if (reason instanceof Error) {
    return isIgnorableUncaughtException(reason);
  }

  if (typeof reason === 'string') {
    return hasIgnorableAbortMessage(reason);
  }

  if (reason && typeof reason === 'object') {
    const reasonWithCode = reason as { code?: unknown; message?: unknown; stack?: unknown };
    const code = typeof reasonWithCode.code === 'string' ? reasonWithCode.code : null;
    if (code && IGNORABLE_PROCESS_ERROR_CODES.has(code)) {
      return true;
    }
    if (
      typeof reasonWithCode.message === 'string' &&
      hasIgnorableAbortMessage(reasonWithCode.message)
    ) {
      return true;
    }
    if (typeof reasonWithCode.stack === 'string') {
      const stack = reasonWithCode.stack.toLowerCase();
      if (
        stack.includes('abortincoming (node:_http_server') ||
        stack.includes('socketonclose (node:_http_server')
      ) {
        return true;
      }
    }
  }

  return false;
};

export async function registerNodeInstrumentation() {
  const globalScope = globalThis as InstrumentationGlobal;
  if (globalScope.__nodeInstrumentationRegistered) {
    return;
  }
  globalScope.__nodeInstrumentationRegistered = true;

  const { validateDatabaseConfig } = await import('@/shared/lib/env');
  validateDatabaseConfig();

  // Register centralized logging handler for shared logger
  const { registerLogHandler } = await import('@/shared/utils/logger');
  const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');

  registerLogHandler((level, message, error, context) => {
    void (async () => {
      try {
        const service = (context?.['service'] as string) || 'shared-logger';
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
      } catch {
        // Prevent infinite loops if logging fails
      }
    })();
  });

  const { initializeQueues } = await import('@/features/jobs/queue-init');
  initializeQueues();

  if (globalScope.__cmsProcessHandlersRegistered) {
    return;
  }
  globalScope.__cmsProcessHandlersRegistered = true;

  // Set up global error handlers for the Node.js process.
  process.on('unhandledRejection', (reason: unknown) => {
    if (isIgnorableProcessFailure(reason)) {
      return;
    }

    void (async () => {
      try {
        const { logSystemError } = await import('@/shared/lib/observability/system-logger');
        await logSystemError({
          message: 'Unhandled Promise Rejection',
          error: reason,
          source: 'process.unhandledRejection',
        });
      } catch {
        const { logger } = await import('@/shared/utils/logger');
        logger.error('Fatal: Unhandled Rejection (and logging failed)', reason);
      }
    })();
  });

  process.on('uncaughtException', (error: Error) => {
    if (isIgnorableUncaughtException(error)) {
      return;
    }

    void (async () => {
      try {
        const { logSystemError } = await import('@/shared/lib/observability/system-logger');
        await logSystemError({
          message: 'Uncaught Exception',
          error,
          source: 'process.uncaughtException',
          critical: true,
        });
      } catch {
        const { logger } = await import('@/shared/utils/logger');
        logger.error('Fatal: Uncaught Exception (and logging failed)', error);
      }
      // Give some time for logging to complete before exiting.
      setTimeout(() => process.exit(1), 1000);
    })();
  });
}
