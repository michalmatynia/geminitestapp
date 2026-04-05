import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import {
  kangurSocialImageAddonsBatchJobSchema,
  kangurSocialImageAddonsBatchJobsSchema,
  kangurSocialImageAddonsBatchPayloadSchema,
} from '@/shared/contracts/kangur-social-image-addons';
import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { createKangurSocialImageAddonsBatch } from '@/features/kangur/social/server/social-image-addons-batch';
import {
  listKangurSocialImageAddonsBatchJobs,
  readKangurSocialImageAddonsBatchJob,
  startKangurSocialImageAddonsBatchJob,
} from '@/features/kangur/social/server/social-image-addons-batch-jobs';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
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

const bodySchema = kangurSocialImageAddonsBatchPayloadSchema.extend({
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

export async function getKangurSocialImageAddonsBatchHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can inspect batch captures.');
  }

  const query = querySchema.parse(ctx.query ?? {});
  if (!query.id) {
    const jobs = await listKangurSocialImageAddonsBatchJobs({
      limit: query.limit ?? 5,
    });
    const responseBody = kangurSocialImageAddonsBatchJobsSchema.parse(jobs);

    void logKangurServerEvent({
      source: 'kangur.social-image-addons.batch.list',
      message: 'Kangur social image add-on batch history fetched',
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

  const job = await readKangurSocialImageAddonsBatchJob(query.id);
  const responseBody = job ? kangurSocialImageAddonsBatchJobSchema.parse(job) : null;

  void logKangurServerEvent({
    source: 'kangur.social-image-addons.batch.status',
    message: 'Kangur social image add-on batch status fetched',
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
    const requestCookies = req.headers.get('cookie') ?? '';
    if (parsed.async) {
      const job = await startKangurSocialImageAddonsBatchJob({
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

      void logKangurServerEvent({
        source: 'kangur.social-image-addons.batch.start',
        message: 'Kangur social image add-on batch capture queued',
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

    const result = await createKangurSocialImageAddonsBatch({
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
    const surfacedError = surfaceBatchCaptureError(error);
    void ErrorSystem.captureException(surfacedError, {
      service: 'kangur.social-image-addons',
      action: 'apiBatch',
      durationMs: Date.now() - startedAt,
      baseUrl,
    });
    throw surfacedError;
  }
}
