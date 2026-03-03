import { Prisma, PrismaClient } from '@prisma/client';

const REQUIRED_MODELS = [
  'page',
  'product',
  'note',
  'aiPathRun',
  'asset3D',
  'productDraft',
] as const;

type PrismaDelegate = {
  findFirst: (args?: unknown) => Promise<unknown>;
};

const getDelegate = (prisma: PrismaClient, model: string): PrismaDelegate | null => {
  const candidate = (prisma as unknown as Record<string, unknown>)[model];
  if (!candidate || typeof candidate !== 'object') return null;
  const findFirst = (candidate as Record<string, unknown>)['findFirst'];
  if (typeof findFirst !== 'function') return null;
  return candidate as PrismaDelegate;
};

const isPrismaAvailabilityError = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientValidationError) return true;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  ) {
    return true;
  }
  return false;
};

const fail = (message: string): never => {
  console.error(`[preflight:prisma] ${message}`);
  process.exit(1);
};

async function main(): Promise<void> {
  if (!process.env['DATABASE_URL']) {
    fail('DATABASE_URL is not set. Prisma integration tests require a reachable PostgreSQL database.');
  }

  process.env['APP_DB_PROVIDER'] = 'prisma';
  process.env['PRODUCT_DB_PROVIDER'] = 'prisma';
  process.env['NOTE_DB_PROVIDER'] = 'prisma';
  process.env['INTEGRATION_DB_PROVIDER'] = 'prisma';
  process.env['AUTH_DB_PROVIDER'] = 'prisma';

  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    fail(
      `Cannot reach Prisma test database. ${(error as Error)?.message ?? 'Unknown connection error.'}`
    );
  }

  const missingDelegates: string[] = [];
  for (const model of REQUIRED_MODELS) {
    if (!getDelegate(prisma, model)) {
      missingDelegates.push(model);
    }
  }
  if (missingDelegates.length > 0) {
    fail(
      `Prisma client is missing required delegates: ${missingDelegates.join(', ')}. Run prisma generate or align the schema before running integration-prisma tests.`
    );
  }

  for (const model of REQUIRED_MODELS) {
    const delegate = getDelegate(prisma, model);
    if (!delegate) continue;
    try {
      await delegate.findFirst({ select: { id: true } });
    } catch (error) {
      if (isPrismaAvailabilityError(error)) {
        fail(
          `Prisma model "${model}" is not available in the connected database (${(error as Error).message}). Run migrations/db push and retry.`
        );
      }
      throw error;
    }
  }

  console.log('[preflight:prisma] Database connectivity and required model probes passed.');
  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error('[preflight:prisma] Unexpected failure.');
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
