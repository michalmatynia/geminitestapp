import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { classifyAmazonScanFailure } from '@/features/products/server/product-scan-amazon-classifier';
import { listAmazonScanDiagnosticArtifacts } from '@/features/products/server/product-scan-amazon-diagnostics-reader';
import { getProductScanByIdWithSync } from '@/features/products/server/product-scans-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';

export const paramsSchema = z.object({
  scanId: z.string().trim().min(1, 'Scan id is required'),
});

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { scanId: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { scanId } = parsedParams.data;
  const scan = await getProductScanByIdWithSync(scanId);
  if (!scan) throw notFoundError('Product scan not found.', { scanId });

  const artifacts = await listAmazonScanDiagnosticArtifacts(scanId);
  const classification = classifyAmazonScanFailure(scan);

  return NextResponse.json({
    scanId,
    provider: scan.provider,
    status: scan.status,
    classification,
    artifacts,
  });
}
