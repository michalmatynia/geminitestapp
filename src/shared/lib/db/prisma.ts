const removedPrismaHandler: ProxyHandler<Record<string, never>> = {
  get(): never {
    throw new Error('Prisma has been removed. The application is MongoDB-only.');
  },
  has(): boolean {
    return false;
  },
};

const prisma = new Proxy({}, removedPrismaHandler) as any;

export default prisma;
