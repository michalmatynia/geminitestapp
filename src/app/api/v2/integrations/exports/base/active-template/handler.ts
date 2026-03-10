import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportActiveTemplateId,
  setExportActiveTemplateId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import {
  baseActiveTemplatePreferencePayloadSchema,
  type BaseActiveTemplatePreferenceResponse,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
  inventoryId: optionalTrimmedQueryString(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const templateId = await getExportActiveTemplateId({
    connectionId: query.connectionId ?? null,
    inventoryId: query.inventoryId ?? null,
  });
  const response: BaseActiveTemplatePreferenceResponse = { templateId };
  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, baseActiveTemplatePreferencePayloadSchema, {
    logPrefix: 'exports.base.active-template.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setExportActiveTemplateId(data.templateId ?? null, {
    connectionId: data.connectionId ?? null,
    inventoryId: data.inventoryId ?? null,
  });
  const response: BaseActiveTemplatePreferenceResponse = { templateId: data.templateId ?? null };
  return NextResponse.json(response);
}
