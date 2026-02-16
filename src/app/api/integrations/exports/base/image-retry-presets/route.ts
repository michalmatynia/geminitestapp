export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { normalizeImageRetryPresets } from '@/features/data-import-export/public';
import {
  getExportImageRetryPresets,
  setExportImageRetryPresets
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const transformSchema = z.object({
  forceJpeg: z.boolean().optional(),
  maxDimension: z.number().int().positive().optional(),
  jpegQuality: z.number().int().min(10).max(100).optional()
});

const presetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  imageBase64Mode: z.enum(['base-only', 'full-data-uri']).optional(),
  transform: transformSchema
});

const requestSchema = z.object({
  presets: z.array(presetSchema).min(1)
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const presets = await getExportImageRetryPresets();
  return NextResponse.json({ presets });
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'exports.base.image-retry-presets.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const normalized = normalizeImageRetryPresets(data.presets);
  await setExportImageRetryPresets(normalized);
  return NextResponse.json({ presets: normalized });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'products.exports.base.image-retry-presets.GET', requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'products.exports.base.image-retry-presets.POST', requireCsrf: false });
