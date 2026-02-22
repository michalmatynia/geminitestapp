import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { normalizeImageRetryPresets } from '@/features/data-import-export/utils/image-retry-presets';
import {
  getExportImageRetryPresets,
  setExportImageRetryPresets
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { imageRetryPresetSchema, type ImageRetryPreset } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const requestSchema = z.object({
  presets: z.array(imageRetryPresetSchema).min(1)
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const presets = await getExportImageRetryPresets();
  return NextResponse.json({ presets });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'exports.base.image-retry-presets.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const normalized: ImageRetryPreset[] = normalizeImageRetryPresets(data.presets);
  await setExportImageRetryPresets(normalized);  return NextResponse.json({ presets: normalized });
}
