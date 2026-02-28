import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getImportLastTemplateId, setImportLastTemplateId } from '@/shared/lib/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const requestSchema = z.object({
  templateId: z.string().trim().min(1).optional(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const templateId = await getImportLastTemplateId();
  return NextResponse.json({ templateId });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'imports.base.last-template.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setImportLastTemplateId(data.templateId ?? null);
  return NextResponse.json({ templateId: data.templateId ?? null });
}
