/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
const removedPrismaHandler: ProxyHandler<Record<string, never>> = {
  get(_target, prop): unknown {
    if (
      process.env['NODE_ENV'] === 'test'
      && (prop === '$disconnect' || prop === '$connect' || prop === '$resetAll')
    ) {
      return async (): Promise<void> => undefined;
    }
    throw new Error('Prisma has been removed. The application is MongoDB-only.');
  },
  has(): boolean {
    return false;
  },
};

const prisma = new Proxy({}, removedPrismaHandler) as any;

export default prisma;
