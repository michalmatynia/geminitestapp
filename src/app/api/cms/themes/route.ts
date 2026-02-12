export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { cmsThemeCreateSchema } from '@/features/cms/validations/api';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const cmsRepository = await getCmsRepository();
  const themes = await cmsRepository.getThemes();
  return NextResponse.json(themes);
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, cmsThemeCreateSchema, {
    logPrefix: 'cms-themes',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const cmsRepository = await getCmsRepository();
  const theme = await cmsRepository.createTheme({ ...parsed.data, isDefault: false });
  return NextResponse.json(theme);
}

export const GET = apiHandler(GET_handler, { source: 'cms.themes.GET' });
export const POST = apiHandler(POST_handler, { source: 'cms.themes.POST' });
