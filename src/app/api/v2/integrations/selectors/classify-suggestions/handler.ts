import { NextResponse, type NextRequest } from 'next/server';

import { classifyProbeSuggestions } from '@/features/integrations/services/selector-registry';
import type { SelectorRegistryClassifySuggestionsRequest } from '@/shared/contracts/integrations/selector-registry';
import { selectorRegistryClassifySuggestionsRequestSchema } from '@/shared/contracts/integrations/selector-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { selectorRegistryClassifySuggestionsRequestSchema };

export async function postHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistryClassifySuggestionsRequest;
  const response = await classifyProbeSuggestions(body);
  return NextResponse.json(response);
}
