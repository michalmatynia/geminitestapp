import { NextResponse, type NextRequest } from 'next/server';

import { probeSelectorRegistryEntry } from '@/features/integrations/services/selector-registry';
import type { SelectorRegistryProbeRequest } from '@/shared/contracts/integrations/selector-registry';
import { selectorRegistryProbeRequestSchema } from '@/shared/contracts/integrations/selector-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { selectorRegistryProbeRequestSchema };

export async function postHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistryProbeRequest;
  const response = await probeSelectorRegistryEntry(body);
  return NextResponse.json(response);
}
