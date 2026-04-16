import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { getProductOrdersImportRepository } from '@/features/products/server';
import {
  loadBaseOrderImportPreview,
  markPreviewOrdersAsImported,
} from '@/features/products/server/product-orders-import-preview';
import { baseOrderImportQuickImportPayloadSchema } from '@/shared/contracts/products/orders-import';
import { type BaseOrderImportQuickImportResponse } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { baseOrderImportQuickImportPayloadSchema as quickImportOrdersImportSchema };

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof baseOrderImportQuickImportPayloadSchema>;
  const preview = await loadBaseOrderImportPreview(data);
  const importableOrders = preview.orders.filter(
    (order) => order.importState === 'new' || order.importState === 'changed'
  );

  if (importableOrders.length === 0) {
    const response: BaseOrderImportQuickImportResponse = {
      preview,
      importableCount: 0,
      skippedImportedCount: preview.orders.filter((order) => order.importState === 'imported').length,
      importedCount: 0,
      createdCount: 0,
      updatedCount: 0,
      syncedAt: null,
      results: [],
    };
    return NextResponse.json(response);
  }

  const repository = await getProductOrdersImportRepository();
  const importResult = await repository.upsertOrders(data.connectionId, importableOrders);
  const response: BaseOrderImportQuickImportResponse = {
    preview: markPreviewOrdersAsImported(
      preview,
      importResult.syncedAt,
      importResult.results.map((result) => result.baseOrderId)
    ),
    importableCount: importableOrders.length,
    skippedImportedCount: preview.orders.filter((order) => order.importState === 'imported').length,
    importedCount: importResult.createdCount + importResult.updatedCount,
    createdCount: importResult.createdCount,
    updatedCount: importResult.updatedCount,
    syncedAt: importResult.syncedAt,
    results: importResult.results,
  };

  return NextResponse.json(response);
}
