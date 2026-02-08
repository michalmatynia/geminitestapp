export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { initializeQueues } = await import('@/features/jobs/lib/queue-init');
    initializeQueues();

    // Set up global error handlers for the Node.js process
    process.on('unhandledRejection', async (reason: unknown) => {
      try {
        const { logSystemError } = await import('@/features/observability/server');
        await logSystemError({
          message: 'Unhandled Promise Rejection',
          error: reason,
          source: 'process.unhandledRejection',
        });
      } catch {
        console.error('Fatal: Unhandled Rejection (and logging failed)', reason); // eslint-disable-line no-console
      }
    });

    process.on('uncaughtException', async (error: Error) => {
      try {
        const { logSystemError } = await import('@/features/observability/server');
        await logSystemError({
          message: 'Uncaught Exception',
          error,
          source: 'process.uncaughtException',
          critical: true,
        });
      } catch {
        console.error('Fatal: Uncaught Exception (and logging failed)', error); // eslint-disable-line no-console
      }
      // Give some time for logging to complete before exiting
      setTimeout(() => process.exit(1), 1000);
    });
  }
}
