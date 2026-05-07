import { z } from 'zod';

import { type NextRequest, NextResponse } from 'next/server';

import {
  socialPublishingImageAddonsBatchJobSchema,
  socialPublishingImageAddonsBatchJobsSchema,
  socialPublishingImageAddonsBatchPayloadSchema,
} from '@/shared/contracts/social-publishing-image-addons';
import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { logSocialPublishingServerEvent } from '@/features/filemaker/social/server/social-publishing-observability';
import { createSocialPublishingImageAddonsBatch } from '@/features/filemaker/social/server/social-image-addons-batch';
import {
  listSocialPublishingImageAddonsBatchJobs,
  readSocialPublishingImageAddonsBatchJob,
  startSocialPublishingImageAddonsBatchJob,
} from '@/features/filemaker/social/server/social-image-addons-batch-jobs';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  AppErrorCodes,
  createAppError,
  forbiddenError,
  isAppError,
} from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { resolveTrustedSelfOriginHost } from '@/shared/lib/security/trusted-self-origin';

export const querySchema = z.object({
  id: optionalTrimmedQueryString(z.string().trim().min(1)).optional(),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

const bodySchema = socialPublishingImageAddonsBatchPayloadSchema.extend({
  async: z.boolean().optional(),
});

const surfaceBatchCaptureError = (error: unknown): unknown => {
  if (!isAppError(error) || error.code !== AppErrorCodes.operationFailed) {
    return error;
  }

  return createAppError(error.message, {
    code: error.code,
    httpStatus: error.httpStatus,
    cause: error.cause,
    meta: error.meta,
    expected: true,
    critical: error.critical,
    retryable: error.retryable,
    ...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {}),
  });
};

export async function getSocialPublishingImageAddonsBatchHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can inspect batch captures.');
  }

  const query = querySchema.parse(ctx.query ?? {});
  if (!query.id) {
    const jobs = await listSocialPublishingImageAddonsBatchJobs({
      limit: query.limit ?? 5,
    });
    const responseBody = socialPublishingImageAddonsBatchJobsSchema.parse(jobs);

    void logSocialPublishingServerEvent({
      source: 'social-publishing.image-addons.batch.list',
      message: 'Social publishing image add-on batch history fetched',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        count: responseBody.length,
        limit: query.limit ?? 5,
      },
    });

    return NextResponse.json(responseBody, { headers: { 'Cache-Control': 'no-store' } });
  }

  const job = await readSocialPublishingImageAddonsBatchJob(query.id);
  const responseBody = job ? socialPublishingImageAddonsBatchJobSchema.parse(job) : null;

  void logSocialPublishingServerEvent({
    source: 'social-publishing.image-addons.batch.status',
    message: 'Social publishing image add-on batch status fetched',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      jobId: query.id,
      status: responseBody?.status ?? null,
    },
  });

  return NextResponse.json(responseBody, { headers: { 'Cache-Control': 'no-store' } });
}

export async function postSocialPublishingImageAddonsBatchHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can run batch captures.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const startedAt = Date.now();
  const requestOrigin = new URL(req.url).origin;
  const baseUrl = parsed.baseUrl?.trim() || requestOrigin;

  try {
    const requestCookies = req.headers.get('cookie') ?? '';
    if (parsed.async) {
      const job = await startSocialPublishingImageAddonsBatchJob({
        baseUrl,
        presetIds: parsed.presetIds ?? null,
        presetLimit: parsed.presetLimit ?? null,
        appearanceMode: parsed.appearanceMode,
        playwrightPersonaId: parsed.playwrightPersonaId ?? undefined,
        playwrightScript: parsed.playwrightScript ?? undefined,
        playwrightRoutes: parsed.playwrightRoutes ?? undefined,
        createdBy: actor.actorId,
        forwardCookies: requestCookies || null,
        trustedSelfOriginHost: resolveTrustedSelfOriginHost({
          requestUrl: req.url,
          candidateUrl: baseUrl,
        }),
      });

      void logSocialPublishingServerEvent({
        source: 'social-publishing.image-addons.batch.start',
        message: 'Social publishing image add-on batch capture queued',
        request: req,
        requestContext: ctx,
        actor,
        statusCode: 202,
        context: {
          jobId: job.id,
          runId: job.runId,
          presetCount: job.progress?.totalCount ?? null,
          durationMs: Date.now() - startedAt,
        },
      });

      return NextResponse.json(job, {
        status: 202,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const result = await createSocialPublishingImageAddonsBatch({
      baseUrl,
      presetIds: parsed.presetIds ?? null,
      presetLimit: parsed.presetLimit ?? null,
      appearanceMode: parsed.appearanceMode,
      playwrightPersonaId: parsed.playwrightPersonaId ?? undefined,
      playwrightScript: parsed.playwrightScript ?? undefined,
      playwrightRoutes: parsed.playwrightRoutes ?? undefined,
      createdBy: actor.actorId,
      forwardCookies: requestCookies || null,
      trustedSelfOriginHost: resolveTrustedSelfOriginHost({
        requestUrl: req.url,
        candidateUrl: baseUrl,
      }),
    });

    void logSocialPublishingServerEvent({
      source: 'social-publishing.image-addons.batch',
      message: 'Social publishing image add-on batch capture completed',
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
    const surfacedError = surfaceBatchCaptureError(error);
    void ErrorSystem.captureException(surfacedError, {
      service: 'social-publishing.image-addons',
      action: 'apiBatch',
      durationMs: Date.now() - startedAt,
      baseUrl,
    });
    throw surfacedError;
  }
}
