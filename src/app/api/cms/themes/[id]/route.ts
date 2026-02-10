export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { cmsThemeUpdateSchema } from '@/features/cms/validations/api';
import { parseJsonBody } from '@/features/products/server';
import type { UpdateCmsThemeDto } from '@/shared/dtos/cms';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const id = params.id;
  const cmsRepository = await getCmsRepository();
  const theme = await cmsRepository.getThemeById(id);

  if (!theme) {
    throw notFoundError('Theme not found');
  }

  return NextResponse.json(theme);
}

async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const id = params.id;

  const parsed = await parseJsonBody(req, cmsThemeUpdateSchema, {
    logPrefix: 'cms-themes',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const cmsRepository = await getCmsRepository();
  const updated = await cmsRepository.updateTheme(id, parsed.data as Partial<UpdateCmsThemeDto>);

  if (!updated) {
    throw notFoundError('Theme not found');
  }

  return NextResponse.json(updated);
}

async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const id = params.id;
  const cmsRepository = await getCmsRepository();
  await cmsRepository.deleteTheme(id);
  return new Response(null, { status: 204 });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: 'cms.themes.[id].GET' });
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: 'cms.themes.[id].PUT' });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: 'cms.themes.[id].DELETE' });
