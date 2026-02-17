import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getImportActiveTemplateId,
  setImportActiveTemplateId
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const requestSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional(),
  connectionId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const templateId = await getImportActiveTemplateId({
    connectionId: searchParams.get('connectionId'),
    inventoryId: searchParams.get('inventoryId'),
  });
  return NextResponse.json({ templateId });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'imports.base.active-template.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setImportActiveTemplateId(data.templateId ?? null, {
    connectionId: data.connectionId ?? null,
    inventoryId: data.inventoryId ?? null,
  });
  return NextResponse.json({ templateId: data.templateId ?? null });
}
