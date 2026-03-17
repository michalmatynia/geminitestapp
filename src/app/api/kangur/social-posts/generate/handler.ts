import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  generateKangurSocialPostDraft,
} from '@/features/kangur/server/social-posts-generation';
import { updateKangurSocialPost } from '@/features/kangur/server/social-posts-repository';
import { findKangurSocialImageAddonsByIds } from '@/features/kangur/server/social-image-addons-repository';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  docReferences: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().trim().optional(),
  postId: z.string().trim().optional(),
  modelId: z.string().trim().optional(),
  imageAddonIds: z.array(z.string().trim().min(1)).optional(),
});

export async function postKangurSocialPostGenerateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can generate social posts.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const startedAt = Date.now();

  const imageAddonIds = (parsed.imageAddonIds ?? []).map((id) => id.trim()).filter(Boolean);
  const imageAddons =
    imageAddonIds.length > 0 ? await findKangurSocialImageAddonsByIds(imageAddonIds) : [];

  try {
    const draft = await generateKangurSocialPostDraft({
      docReferences: parsed.docReferences,
      notes: parsed.notes,
      modelId: parsed.modelId,
      imageAddons,
    });

    if (parsed.postId) {
      const updated = await updateKangurSocialPost(parsed.postId, {
        titlePl: draft.titlePl,
        titleEn: draft.titleEn,
        bodyPl: draft.bodyPl,
        bodyEn: draft.bodyEn,
        combinedBody: draft.combinedBody,
        generatedSummary: draft.summary,
        docReferences: draft.docReferences,
        imageAddonIds,
        ...(parsed.modelId ? { brainModelId: parsed.modelId } : {}),
        status: 'draft',
      });

      if (!updated) {
        throw notFoundError('Social post not found.');
      }
      void logKangurServerEvent({
        source: 'kangur.social-posts.generate',
        message: 'Kangur social post generated and updated',
        request: req,
        requestContext: ctx,
        actor,
        statusCode: 200,
        context: {
          postId: updated.id,
          docReferenceCount: parsed.docReferences?.length ?? 0,
          imageAddonCount: imageAddonIds.length,
          notesLength: parsed.notes?.trim().length ?? 0,
          durationMs: Date.now() - startedAt,
          updated: true,
        },
      });
      return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } });
    }

    void logKangurServerEvent({
      source: 'kangur.social-posts.generate',
      message: 'Kangur social post draft generated',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        postId: null,
        docReferenceCount: parsed.docReferences?.length ?? 0,
        imageAddonCount: imageAddonIds.length,
        notesLength: parsed.notes?.trim().length ?? 0,
        durationMs: Date.now() - startedAt,
        updated: false,
      },
    });

    return NextResponse.json(draft, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.generate',
      action: 'apiGenerate',
      postId: parsed.postId ?? null,
      docReferenceCount: parsed.docReferences?.length ?? 0,
      imageAddonCount: imageAddonIds.length,
      notesLength: parsed.notes?.trim().length ?? 0,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
