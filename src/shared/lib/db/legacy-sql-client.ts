/**
 * Legacy SQL Client
 * 
 * Stub implementation for removed legacy SQL database client.
 * Provides:
 * - Error throwing for removed SQL client access
 * - Test environment compatibility stubs
 * - Migration guidance to MongoDB-only architecture
 * - Proxy-based access prevention
 * - Graceful degradation for tests
 */

/**
 * Proxy handler that traps all property accesses to the removed SQL client.
 * In test environments, it allows certain lifecycle methods to resolve silently.
 * In all other cases/environments, it throws a descriptive error.
 */
const removedLegacyDatabaseHandler: ProxyHandler<Record<string, never>> = {
  get(_target, prop): unknown {
    if (
      process.env['NODE_ENV'] === 'test' &&
      (prop === '$disconnect' || prop === '$connect' || prop === '$resetAll')
    ) {
      return (): Promise<void> => Promise.resolve();
    }
    // SQL support was removed; all database operations now use MongoDB
    throw new Error('The legacy SQL client has been removed. The application is MongoDB-only.');
  },
  has(): boolean {
    return false;
  },
};

/**
 * A proxy that throws an error when any property is accessed,
 * representing the removed legacy SQL client.
 * This ensures that any remaining calls to the legacy SQL client are caught
 * and provide a clear migration path.
 */
const legacyDatabaseClient = new Proxy(
  {},
  removedLegacyDatabaseHandler
) as Record<string, unknown>;

export default legacyDatabaseClient;
