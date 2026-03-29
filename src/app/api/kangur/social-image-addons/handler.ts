import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  listKangurSocialImageAddons,
} from '@/features/kangur/server/social-image-addons-repository';
import { createKangurSocialImageAddonFromPlaywright } from '@/features/kangur/server/social-image-addons-service';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { kangurSocialCaptureAppearanceModeSchema } from '@/shared/contracts/kangur-social-image-addons';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  limit: optionalIntegerQuerySchema(z.number().int().min(1).max(50)),
  scope: optionalTrimmedQueryString(z.enum(['admin'])).optional(),
});

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  sourceUrl: z.string().trim().url(),
  selector: z.string().trim().optional(),
  waitForMs: z.number().int().min(0).max(15000).optional(),
  waitForSelectorMs: z.number().int().min(1000).max(20000).optional(),
  appearanceMode: kangurSocialCaptureAppearanceModeSchema.optional(),
});

const toSourceHost = (sourceUrl: string): string | null => {
  try {
    return new URL(sourceUrl).host || null;
  } catch {
    return null;
  }
};

export async function getKangurSocialImageAddonsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can access social image add-ons.');
  }

  const query = querySchema.parse(ctx.query ?? {});
  const limit = query.limit ?? 12;
  const addons = await listKangurSocialImageAddons(limit);
  void logKangurServerEvent({
    source: 'kangur.social-image-addons.list',
    message: 'Kangur social image add-ons listed',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      count: addons.length,
      limit,
    },
  });
  return NextResponse.json(addons, { headers: { 'Cache-Control': 'no-store' } });
}

export async function postKangurSocialImageAddonsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can create social image add-ons.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const startedAt = Date.now();
  const sourceHost = toSourceHost(parsed.sourceUrl);
  const hasSelector = Boolean(parsed.selector?.trim());

  try {
    const requestCookies = req.headers.get('cookie') ?? '';
    const addon = await createKangurSocialImageAddonFromPlaywright({
      title: parsed.title,
      description: parsed.description,
      sourceUrl: parsed.sourceUrl,
      selector: parsed.selector,
      waitForMs: parsed.waitForMs,
      waitForSelectorMs: parsed.waitForSelectorMs,
      appearanceMode: parsed.appearanceMode,
      createdBy: actor.actorId,
      forwardCookies: requestCookies || null,
    });

    void logKangurServerEvent({
      source: 'kangur.social-image-addons.create',
      message: 'Kangur social image add-on created',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        addonId: addon.id,
        playwrightRunId: addon.playwrightRunId ?? null,
        durationMs: Date.now() - startedAt,
        sourceHost,
        hasSelector,
        waitForMs: parsed.waitForMs ?? 0,
        waitForSelectorMs: parsed.waitForSelectorMs ?? 10000,
      },
    });

    return NextResponse.json(addon, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-image-addons',
      action: 'apiCreate',
      durationMs: Date.now() - startedAt,
      sourceHost,
      hasSelector,
      waitForMs: parsed.waitForMs ?? 0,
      waitForSelectorMs: parsed.waitForSelectorMs ?? 10000,
    });
    throw error;
  }
}
