import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import {
  SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS,
  seedSocialArticleSourcePresets,
} from '@/features/filemaker/social/server/social-article-source-preset-seeds';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const bodySchema = z.object({
  ids: z.array(z.string().trim().min(1)).optional(),
  force: z.boolean().optional(),
});

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can seed source presets.' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(ctx.body ?? {});
  const { ids, force } = parsed.success ? parsed.data : { ids: undefined, force: false };

  const result = await seedSocialArticleSourcePresets({ ids, force: force ?? false });

  return NextResponse.json(
    {
      seeded: result.seeded,
      skipped: result.skipped,
      available: SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS.map((s) => ({
        id: s.id,
        name: s.name,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function getHandler(req: NextRequest): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can view seed presets.' }, { status: 403 });
  }

  return NextResponse.json(
    {
      available: SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS.map((s) => ({
        id: s.id,
        name: s.name,
        urls: s.urls,
        playwrightScripterId: s.playwrightScripterId,
        playwrightScripterMode: s.playwrightScripterMode,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
