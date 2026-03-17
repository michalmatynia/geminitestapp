import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { createKangurSocialImageAddonsBatch } from '@/features/kangur/server/social-image-addons-batch';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  baseUrl: z.string().trim().url().optional(),
  presetIds: z.array(z.string().trim().min(1)).optional(),
});

export async function postKangurSocialImageAddonsBatchHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can run batch captures.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const startedAt = Date.now();
  const requestOrigin = new URL(req.url).origin;
  const baseUrl = parsed.baseUrl?.trim() || requestOrigin;

  try {
    const result = await createKangurSocialImageAddonsBatch({
      baseUrl,
      presetIds: parsed.presetIds ?? null,
      createdBy: actor.actorId,
    });

    void logKangurServerEvent({
      source: 'kangur.social-image-addons.batch',
      message: 'Kangur social image add-on batch capture completed',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        runId: result.runId,
        addonCount: result.addons.length,
        failureCount: result.failures.length,
        durationMs: Date.now() - startedAt,
      },
    });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-image-addons',
      action: 'apiBatch',
      durationMs: Date.now() - startedAt,
      baseUrl,
    });
    throw error;
  }
}
