import { NextRequest, NextResponse } from 'next/server';

import {
  getImportActiveTemplateId,
  setImportActiveTemplateId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import {
  baseActiveTemplatePreferencePayloadSchema,
  type BaseActiveTemplatePreferenceResponse,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const templateId = await getImportActiveTemplateId({
    connectionId: searchParams.get('connectionId'),
    inventoryId: searchParams.get('inventoryId'),
  });
  const response: BaseActiveTemplatePreferenceResponse = { templateId };
  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, baseActiveTemplatePreferencePayloadSchema, {
    logPrefix: 'imports.base.active-template.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setImportActiveTemplateId(data.templateId ?? null, {
    connectionId: data.connectionId ?? null,
    inventoryId: data.inventoryId ?? null,
  });
  const response: BaseActiveTemplatePreferenceResponse = { templateId: data.templateId ?? null };
  return NextResponse.json(response);
}
