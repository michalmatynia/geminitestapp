import { type NextRequest } from 'next/server';
import { z } from 'zod';

import { readPlaywrightEngineArtifact } from '@/features/playwright/server';
import { getProductScanByIdWithSync } from '@/features/products/server/product-scans-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';

export const paramsSchema = z.object({
  scanId: z.string().trim().min(1, 'Scan id is required'),
  artifactName: z.string().trim().min(1, 'Artifact name is required').max(255),
});

const resolveDownloadFileName = (value: string): string =>
  value
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'artifact';

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { scanId: string; artifactName: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }

  const { scanId, artifactName } = parsedParams.data;
  const scan = await getProductScanByIdWithSync(scanId);
  if (!scan) {
    throw notFoundError('Product scan not found.', { scanId });
  }

  const engineRunId = scan.engineRunId?.trim() || null;
  if (!engineRunId) {
    throw notFoundError('Product scan artifact not found.', {
      scanId,
      artifactName,
      reason: 'missing_engine_run_id',
    });
  }

  const artifactResult = await readPlaywrightEngineArtifact({
    runId: engineRunId,
    fileName: artifactName,
  });
  if (!artifactResult) {
    throw notFoundError('Product scan artifact not found.', {
      scanId,
      artifactName,
      engineRunId,
    });
  }

  return new Response(new Uint8Array(artifactResult.content), {
    status: 200,
    headers: {
      'Content-Type': artifactResult.artifact.mimeType?.trim() || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${resolveDownloadFileName(artifactName)}"`,
    },
  });
}
