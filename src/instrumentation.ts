export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeQueues } = await import('@/features/jobs/lib/queue-init');
    initializeQueues();
  }
}
