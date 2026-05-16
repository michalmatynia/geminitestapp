import { pushMilkbarRuntimeToCloud } from '@/features/page-manager/milkbardesigners/milkbar-cms.server';
import { invalidateMongoClientCache } from '@/shared/lib/db/mongo-client';

async function main(): Promise<void> {
  const result = await pushMilkbarRuntimeToCloud();
  console.log(`pushed cloud runtime at ${result.updatedAt}`);
  console.log(`projects: ${result.projectCount}`);
  console.log(`services: ${result.serviceCount}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await invalidateMongoClientCache();
  });
