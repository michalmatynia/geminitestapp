type InstrumentationGlobal = typeof globalThis & {
  __cmsProcessHandlersRegistered?: boolean;
};

export async function registerNodeInstrumentation() {
  const { validateDatabaseConfig } = await import('@/shared/lib/env');
  validateDatabaseConfig();

  const { initializeQueues } = await import('@/features/jobs/lib/queue-init');
  initializeQueues();

  const globalScope = globalThis as InstrumentationGlobal;
  if (globalScope.__cmsProcessHandlersRegistered) {
    return;
  }
  globalScope.__cmsProcessHandlersRegistered = true;

  // Set up global error handlers for the Node.js process.
  process.on('unhandledRejection', (reason: unknown) => {
    void (async () => {
      try {
        const { logSystemError } = await import('@/features/observability/server');
        await logSystemError({
          message: 'Unhandled Promise Rejection',
          error: reason,
          source: 'process.unhandledRejection',
        });
      } catch {
        console.error('Fatal: Unhandled Rejection (and logging failed)', reason);  
      }
    })();
  });

  process.on('uncaughtException', (error: Error) => {
    void (async () => {
      try {
        const { logSystemError } = await import('@/features/observability/server');
        await logSystemError({
          message: 'Uncaught Exception',
          error,
          source: 'process.uncaughtException',
          critical: true,
        });
      } catch {
        console.error('Fatal: Uncaught Exception (and logging failed)', error);  
      }
      // Give some time for logging to complete before exiting.
      setTimeout(() => process.exit(1), 1000);
    })();
  });
}
