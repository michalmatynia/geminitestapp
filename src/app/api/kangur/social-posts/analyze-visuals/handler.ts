import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { analyzeKangurSocialVisuals } from '@/features/kangur/server/social-posts-vision';
import { findKangurSocialImageAddonsByIds } from '@/features/kangur/server/social-image-addons-repository';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { kangurSocialVisualAnalysisSchema } from '@/shared/contracts/kangur-social-posts';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  postId: z.string().trim().optional(),
  docReferences: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().trim().optional(),
  visionModelId: z.string().trim().optional(),
  imageAddonIds: z.array(z.string().trim().min(1)).max(30).default([]),
});

export async function postKangurSocialPostAnalyzeVisualsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can analyze social post visuals.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const startedAt = Date.now();
  const imageAddonIds = parsed.imageAddonIds.map((id) => id.trim()).filter(Boolean);
  const imageAddons =
    imageAddonIds.length > 0 ? await findKangurSocialImageAddonsByIds(imageAddonIds) : [];

  try {
    const analysis = kangurSocialVisualAnalysisSchema.parse(
      await analyzeKangurSocialVisuals({
        docReferences: parsed.docReferences,
        notes: parsed.notes,
        modelId: parsed.visionModelId,
        imageAddons,
      })
    );

    void logKangurServerEvent({
      source: 'kangur.social-posts.analyze-visuals',
      message: 'Kangur social visual analysis completed',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        postId: parsed.postId ?? null,
        imageAddonCount: imageAddonIds.length,
        docReferenceCount: parsed.docReferences?.length ?? 0,
        notesLength: parsed.notes?.trim().length ?? 0,
        durationMs: Date.now() - startedAt,
        highlightCount: analysis.highlights.length,
        docUpdateCount: analysis.docUpdates.length,
      },
    });

    return NextResponse.json(analysis, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.analyze-visuals',
      action: 'apiAnalyzeVisuals',
      postId: parsed.postId ?? null,
      imageAddonCount: imageAddonIds.length,
      docReferenceCount: parsed.docReferences?.length ?? 0,
      notesLength: parsed.notes?.trim().length ?? 0,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
