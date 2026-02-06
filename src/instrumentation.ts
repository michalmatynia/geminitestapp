export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeQueues } = await import("@/shared/lib/queue/init");
    initializeQueues();
  }
}
