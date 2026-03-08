import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportDefaultInventoryId,
  setExportDefaultInventoryId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let inventoryId: string | null = null;
  try {
    inventoryId = await getExportDefaultInventoryId();
  } catch (error) {
    void ErrorSystem.logWarning(
      'Failed to read Base.com default inventory setting; returning null.',
      {
        service: 'exports.base.default-inventory',
        error: error instanceof Error ? error.message : String(error),
      }
    );
    inventoryId = null;
  }
  return NextResponse.json({ inventoryId });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'exports.base.default-inventory.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setExportDefaultInventoryId(data.inventoryId ?? null);
  return NextResponse.json({ inventoryId: data.inventoryId ?? null });
}
