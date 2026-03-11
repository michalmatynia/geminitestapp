import 'server-only';

import type {
  ProductMigrationDirection as MigrationDirection,
  ProductMigrationBatchResult as MigrationBatchResult,
} from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';

export type { MigrationDirection };

const LEGACY_PRODUCT_MIGRATION_REMOVED_MESSAGE =
  'Legacy Prisma product migration has been removed. Products are stored in MongoDB only.';

export async function getProductMigrationTotal(_direction: MigrationDirection): Promise<number> {
  throw badRequestError(LEGACY_PRODUCT_MIGRATION_REMOVED_MESSAGE);
}

export async function migrateProductBatch({
  direction: _direction,
  dryRun: _dryRun = false,
  cursor: _cursor,
  batchSize: _batchSize = 50,
}: {
  direction: MigrationDirection;
  dryRun?: boolean | undefined;
  cursor?: string | null | undefined;
  batchSize?: number | undefined;
}): Promise<MigrationBatchResult> {
  throw badRequestError(LEGACY_PRODUCT_MIGRATION_REMOVED_MESSAGE);
}
