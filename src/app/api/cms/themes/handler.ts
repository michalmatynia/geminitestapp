import { type NextRequest, NextResponse } from 'next/server';

import { getCmsRepository } from '@/features/cms/server';
import { cmsThemeCreateSchema } from '@/features/cms/server';
import { logCmsActivity } from '@/features/cms/services/cms-activity';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

/**
 * API handler for GET /api/cms/themes
 * Fetches and returns a list of CMS themes.
 */
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const cmsRepository = await getCmsRepository();
  const themes = await cmsRepository.getThemes();
  return NextResponse.json(themes);
}

/**
 * API handler for POST /api/cms/themes
 * Parses request, creates a new CMS theme, logs the activity, and returns the created theme.
 */
export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, cmsThemeCreateSchema, {
    logPrefix: 'cms-themes',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const cmsRepository = await getCmsRepository();
  const theme = await cmsRepository.createTheme({ ...parsed.data, isDefault: false });
  void logCmsActivity({
    event: 'THEME_CREATED',
    description: `Created CMS theme: ${theme.name}`,
    userId: ctx.userId ?? null,
    entityId: theme.id,
    entityType: 'cms_theme',
    metadata: { name: theme.name },
  }).catch(() => {});
  return NextResponse.json(theme);
}
