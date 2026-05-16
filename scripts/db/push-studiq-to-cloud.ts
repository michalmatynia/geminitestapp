import { pushStudiqLocalToCloud } from '@/features/kangur/services/studiq-push-to-cloud.server';
import { invalidateMongoClientCache } from '@/shared/lib/db/mongo-client';

async function main(): Promise<void> {
  const result = await pushStudiqLocalToCloud((p) => {
    process.stdout.write(`[${p.step}/${p.total}] ${p.message}\n`);
    return Promise.resolve();
  });

  console.log(`\npushed cloud at ${result.updatedAt}`);
  console.log(`collections: ${result.collectionCount}`);
  console.log(`documents:   ${result.documentCount.toLocaleString()}`);
  console.log(result.collections.map((c) => `  • ${c}`).join('\n'));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await invalidateMongoClientCache();
  });
