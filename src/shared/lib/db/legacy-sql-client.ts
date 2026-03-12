/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
const removedLegacyDatabaseHandler: ProxyHandler<Record<string, never>> = {
  get(_target, prop): unknown {
    if (
      process.env['NODE_ENV'] === 'test'
      && (prop === '$disconnect' || prop === '$connect' || prop === '$resetAll')
    ) {
      return async (): Promise<void> => undefined;
    }
    throw new Error('The legacy SQL client has been removed. The application is MongoDB-only.');
  },
  has(): boolean {
    return false;
  },
};

const legacyDatabaseClient = new Proxy({}, removedLegacyDatabaseHandler) as any;

export default legacyDatabaseClient;
