import { type NextRequest } from 'next/server';
import { z } from 'zod';

import { readAmazonScanDiagnosticArtifact } from '@/features/products/server/product-scan-amazon-diagnostics-reader';
import { getProductScanByIdWithSync } from '@/features/products/server/product-scans-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';

export const paramsSchema = z.object({
  scanId: z.string().trim().min(1, 'Scan id is required'),
  filename: z
    .string()
    .trim()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long'),
});

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { scanId: string; filename: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { scanId, filename } = parsedParams.data;
  const scan = await getProductScanByIdWithSync(scanId);
  if (!scan) throw notFoundError('Product scan not found.', { scanId });

  const artifact = await readAmazonScanDiagnosticArtifact(scanId, filename);
  if (!artifact) {
    throw notFoundError('Diagnostic artifact not found.', { scanId, filename });
  }

  return new Response(artifact.content, {
    status: 200,
    headers: {
      'Content-Type': artifact.mimeType,
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="${artifact.filename}"`,
    },
  });
}
