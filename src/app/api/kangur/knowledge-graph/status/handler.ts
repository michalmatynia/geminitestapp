import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getKangurKnowledgeGraphStatusSnapshot } from '@/features/kangur/server/knowledge-graph/status-loader';
import { kangurKnowledgeGraphStatusResponseSchema } from '@/shared/contracts/kangur-observability';
import { type ApiHandlerContext } from '@/shared/contracts';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/shared/contracts/kangur-knowledge-graph';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';
import { assertSettingsManageAccess } from '@/features/auth/server';

export const querySchema = z.object({
  graphKey: z.preprocess(
    (value) => normalizeOptionalQueryString(value) ?? KANGUR_KNOWLEDGE_GRAPH_KEY,
    z.string().trim().min(1).max(160)
  ),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();

  const parsedQuery = querySchema.safeParse(_ctx.query ?? {});
  if (!parsedQuery.success) {
    throw badRequestError('Invalid graph key');
  }

  const status = await getKangurKnowledgeGraphStatusSnapshot(parsedQuery.data.graphKey);
  const responsePayload = { status };
  const validatedResponse = kangurKnowledgeGraphStatusResponseSchema.safeParse(responsePayload);
  if (!validatedResponse.success) {
    throw internalError('Invalid Kangur knowledge graph status contract', {
      issues: validatedResponse.error.flatten(),
    });
  }

  return NextResponse.json(validatedResponse.data, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
