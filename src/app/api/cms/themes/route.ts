export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const colorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  muted: z.string(),
});

const typographySchema = z.object({
  headingFont: z.string(),
  bodyFont: z.string(),
  baseSize: z.number(),
  headingWeight: z.number(),
  bodyWeight: z.number(),
});

const spacingSchema = z.object({
  sectionPadding: z.string(),
  containerMaxWidth: z.string(),
});

const themeCreateSchema = z.object({
  name: z.string().trim().min(1),
  colors: colorsSchema,
  typography: typographySchema,
  spacing: spacingSchema,
  customCss: z.string().optional(),
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const cmsRepository = await getCmsRepository();
  const themes = await cmsRepository.getThemes();
  return NextResponse.json(themes);
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, themeCreateSchema, {
    logPrefix: 'cms-themes',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const cmsRepository = await getCmsRepository();
  const theme = await cmsRepository.createTheme(parsed.data);
  return NextResponse.json(theme);
}

export const GET = apiHandler(GET_handler, { source: 'cms.themes.GET' });
export const POST = apiHandler(POST_handler, { source: 'cms.themes.POST' });
