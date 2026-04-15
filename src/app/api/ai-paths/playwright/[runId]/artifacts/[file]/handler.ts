import { type NextRequest, NextResponse } from 'next/server';

import { assertPlaywrightRunAccess } from '@/app/api/ai-paths/playwright/access';
import {
  enforceAiPathsActionRateLimit,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server';
import {
  aiPathsPlaywrightArtifactRouteParamsSchema,
} from '@/shared/contracts/ai-paths';
import {
  readPlaywrightEngineArtifact,
  readPlaywrightEngineRun,
} from '@/features/playwright/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';


const guessContentType = (fileName: string): string => {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.webm')) return 'video/webm';
  if (normalized.endsWith('.html')) return 'text/html; charset=utf-8';
  if (normalized.endsWith('.json')) return 'application/json; charset=utf-8';
  if (normalized.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
};

const toInlineDisposition = (fileName: string): string => {
  const safe = fileName.replace(/["\r\n]/g, '');
  return `inline; filename="${safe}"`;
};

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string; file: string }
): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'playwright-artifact');
  }

  const parsedParams = aiPathsPlaywrightArtifactRouteParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { runId, file } = parsedParams.data;

  const run = await readPlaywrightEngineRun(runId);
  if (!run) {
    throw notFoundError('Playwright run not found.', { runId });
  }
  assertPlaywrightRunAccess({ run, access, isInternal });

  const artifact = await readPlaywrightEngineArtifact({
    runId,
    fileName: file,
  });
  if (!artifact) {
    throw notFoundError('Playwright artifact not found.', { runId, file });
  }

  const contentType = artifact.artifact.mimeType?.trim() || guessContentType(file);
  return new NextResponse(new Uint8Array(artifact.content), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': toInlineDisposition(file),
      'Cache-Control': 'no-store',
    },
  });
}
