import { NextRequest, NextResponse } from 'next/server';

import {
  getImportActiveTemplateId,
  setImportActiveTemplateId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { baseScopedPreferenceQuerySchema, baseScopedTemplatePreferencePayloadSchema } from '@/shared/contracts/integrations/preferences';
import { type BaseActiveTemplatePreferenceResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

export { baseScopedPreferenceQuerySchema as querySchema };

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = baseScopedPreferenceQuerySchema.parse(_ctx.query ?? {});
  const templateId = await getImportActiveTemplateId({
    connectionId: query.connectionId ?? null,
    inventoryId: query.inventoryId ?? null,
  });
  const response: BaseActiveTemplatePreferenceResponse = { templateId };
  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, baseScopedTemplatePreferencePayloadSchema, {
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
