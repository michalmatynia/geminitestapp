import { NextRequest, NextResponse } from 'next/server';

import { normalizeImageRetryPresets } from '@/features/data-import-export/public';
import {
  getExportImageRetryPresets,
  setExportImageRetryPresets,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import {
  baseImageRetryPresetsPayloadSchema,
  type BaseImageRetryPresetsResponse,
  type ImageRetryPreset,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const presets = await getExportImageRetryPresets();
  const response: BaseImageRetryPresetsResponse = { presets };
  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, baseImageRetryPresetsPayloadSchema, {
    logPrefix: 'exports.base.image-retry-presets.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const normalized: ImageRetryPreset[] = normalizeImageRetryPresets(data.presets);
  await setExportImageRetryPresets(normalized);
  const response: BaseImageRetryPresetsResponse = { presets: normalized };
  return NextResponse.json(response);
}
