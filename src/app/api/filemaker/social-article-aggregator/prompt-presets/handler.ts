import { randomUUID } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteSocialArticlePromptPreset,
  listSocialArticlePromptPresets,
  upsertSocialArticlePromptPreset,
} from '@/features/filemaker/social/server/social-article-aggregator-repository';
import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { socialArticlePromptPresetSchema } from '@/shared/contracts/social-article-aggregator';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

/**
 * Social Article Aggregator Prompt Presets Handlers
 *
 * HTTP request handlers for article aggregator prompt templates.
 * Handlers: getHandler, postHandler
 *
 * - Lists and creates prompt presets for article aggregation
 * - Manages prompt templates and configurations
 * - Handles preset sharing and versioning
 */

const bodySchema = z.object({
  preset: z.record(z.string(), z.unknown()),
});

const requireAdmin = async (req: NextRequest): Promise<void> => {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can manage article prompt presets.');
  }
};

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function getHandler(req: NextRequest): Promise<Response> {
  await requireAdmin(req);
  const presets = await listSocialArticlePromptPresets();
  return NextResponse.json(presets, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await requireAdmin(req);
  const parsed = bodySchema.parse(ctx.body ?? {});
  const rawPreset = parsed.preset;
  const id =
    typeof rawPreset['id'] === 'string' && rawPreset['id'].trim().length > 0
      ? rawPreset['id'].trim()
      : randomUUID();
  const preset = socialArticlePromptPresetSchema.parse({
    ...rawPreset,
    id,
  });
  const saved = await upsertSocialArticlePromptPreset(preset);
  return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function deleteHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await requireAdmin(req);
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const deleted = await deleteSocialArticlePromptPreset(id);
  if (!deleted) {
    throw notFoundError('Article prompt preset not found.');
  }
  return NextResponse.json(deleted, { headers: { 'Cache-Control': 'no-store' } });
}
