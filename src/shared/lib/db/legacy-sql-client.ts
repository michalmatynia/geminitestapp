const removedLegacyDatabaseHandler: ProxyHandler<Record<string, never>> = {
  get(_target, prop): unknown {
    if (
      process.env['NODE_ENV'] === 'test' &&
      (prop === '$disconnect' || prop === '$connect' || prop === '$resetAll')
    ) {
      return async (): Promise<void> => undefined;
    }
    throw new Error('The legacy SQL client has been removed. The application is MongoDB-only.');
  },
  has(): boolean {
    return false;
  },
};

/**
 * A proxy that throws an error when any property is accessed,
 * representing the removed legacy SQL client.
 */
const legacyDatabaseClient = new Proxy(
  {},
  removedLegacyDatabaseHandler
) as Record<string, unknown>;

export default legacyDatabaseClient;
