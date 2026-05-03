import { type NextRequest, NextResponse } from 'next/server';

import { deleteProductScan } from '@/features/products/server/product-scans-repository';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { scanId: string }
): Promise<Response> {
  const scanId = params.scanId.trim();
  if (!scanId) {
    return NextResponse.json({ error: 'Scan ID is required.' }, { status: 400 });
  }

  const deleted = await deleteProductScan(scanId);
  if (!deleted) {
    return NextResponse.json({ error: 'Scan not found or already deleted.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
