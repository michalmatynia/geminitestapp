import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createFullDatabaseBackup } from '@/features/database/server';
import {
  getProductMigrationTotal,
  migrateProductBatch,
  type MigrationDirection,
} from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { removeUndefined } from '@/shared/utils';

const migrationDirectionSchema = z.enum(['prisma-to-mongo', 'mongo-to-prisma']);

const migrationSchema = z.object({
  direction: migrationDirectionSchema,
  dryRun: z.boolean().optional(),
  cursor: z.string().nullable().optional(),
  batchSize: z.coerce.number().int().positive().optional(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const parsedDirection = migrationDirectionSchema.safeParse(
    searchParams.get('direction')
  );
  if (!parsedDirection.success) {
    throw badRequestError('Invalid migration direction.');
  }
  const total = await getProductMigrationTotal(parsedDirection.data);
  return NextResponse.json({ total });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, migrationSchema, {
    logPrefix: 'products.migrate.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const shouldBackup =
    !parsed.data.dryRun && (!parsed.data.cursor || parsed.data.cursor === '');
  if (shouldBackup) {
    const backupResult = await createFullDatabaseBackup();
    if (!backupResult.mongo || !backupResult.postgres) {
      throw operationFailedError('Failed to create full database backup.');
    }
  }
  const result = await migrateProductBatch(removeUndefined({
    direction: parsed.data.direction,
    dryRun: Boolean(parsed.data.dryRun),
    cursor: parsed.data.cursor ?? null,
    batchSize: parsed.data.batchSize,
  }) as { direction: MigrationDirection; dryRun?: boolean; cursor?: string | null; batchSize?: number });
  return NextResponse.json({ result, backup: shouldBackup });
}
