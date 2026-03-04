import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportActiveTemplateId,
  setExportActiveTemplateId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const requestSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional(),
  connectionId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const templateId = await getExportActiveTemplateId({
    connectionId: searchParams.get('connectionId'),
    inventoryId: searchParams.get('inventoryId'),
  });
  return NextResponse.json({ templateId });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
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
  return NextResponse.json({ templateId: data.templateId ?? null });
}
