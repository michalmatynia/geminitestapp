import { type NextRequest, NextResponse } from 'next/server';

import { getImportLastTemplateId, setImportLastTemplateId } from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { baseActiveTemplatePreferencePayloadSchema } from '@/shared/contracts/integrations/preferences';
import { type BaseActiveTemplatePreferenceResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const templateId = await getImportLastTemplateId();
  const response: BaseActiveTemplatePreferenceResponse = { templateId };
  return NextResponse.json(response);
}

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, baseActiveTemplatePreferencePayloadSchema, {
    logPrefix: 'imports.base.last-template.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setImportLastTemplateId(data.templateId ?? null);
  const response: BaseActiveTemplatePreferenceResponse = { templateId: data.templateId ?? null };
  return NextResponse.json(response);
}
