import { NextRequest, NextResponse } from 'next/server';

import { getCmsRepository } from '@/features/cms/server';
import { cmsThemeUpdateSchema } from '@/features/cms/server';
import { parseJsonBody } from '@/features/products/server';
import type { UpdateCmsThemeDto } from '@/shared/contracts/cms';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const cmsRepository = await getCmsRepository();
  const theme = await cmsRepository.getThemeById(id);

  if (!theme) {
    throw notFoundError('Theme not found');
  }

  return NextResponse.json(theme);
}

export async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
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

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const cmsRepository = await getCmsRepository();
  await cmsRepository.deleteTheme(id);
  return new Response(null, { status: 204 });
}
