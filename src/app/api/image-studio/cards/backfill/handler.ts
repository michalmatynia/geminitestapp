import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { runImageStudioCardLinkBackfill } from '@/features/ai/image-studio/server/card-link-backfill';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const payloadSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  dryRun: z.boolean().optional(),
  includeHeuristicGenerationLinks: z.boolean().optional(),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const projectIdRaw = parsed.data.projectId?.trim();
  const projectId = projectIdRaw ? sanitizeProjectId(projectIdRaw) : undefined;
  if (projectIdRaw && !projectId) {
    throw badRequestError('Invalid project id');
  }

  const result = await runImageStudioCardLinkBackfill({
    ...(projectId ? { projectId } : {}),
    ...(parsed.data.dryRun !== undefined ? { dryRun: parsed.data.dryRun } : {}),
    ...(parsed.data.includeHeuristicGenerationLinks !== undefined
      ? { includeHeuristicGenerationLinks: parsed.data.includeHeuristicGenerationLinks }
      : {}),
  });

  return NextResponse.json({ result });
}
