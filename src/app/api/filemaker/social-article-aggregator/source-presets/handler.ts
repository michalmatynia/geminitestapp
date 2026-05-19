import { randomUUID } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import {
  deleteSocialArticleSourcePreset,
  listSocialArticleSourcePresets,
  upsertSocialArticleSourcePreset,
} from '@/features/filemaker/social/server/social-article-aggregator-repository';
import { socialArticleSourcePresetSchema } from '@/shared/contracts/social-article-aggregator';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  preset: z.record(z.string(), z.unknown()),
});

const requireAdmin = async (req: NextRequest): Promise<void> => {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can manage article source presets.');
  }
};

export async function getHandler(req: NextRequest): Promise<Response> {
  await requireAdmin(req);
  const presets = await listSocialArticleSourcePresets();
  return NextResponse.json(presets, { headers: { 'Cache-Control': 'no-store' } });
}

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
  const preset = socialArticleSourcePresetSchema.parse({
    ...rawPreset,
    id,
  });
  const saved = await upsertSocialArticleSourcePreset(preset);
  return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } });
}

export async function deleteHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await requireAdmin(req);
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const deleted = await deleteSocialArticleSourcePreset(id);
  if (!deleted) {
    throw notFoundError('Article source preset not found.');
  }
  return NextResponse.json(deleted, { headers: { 'Cache-Control': 'no-store' } });
}
