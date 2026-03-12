import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/features/auth/server';
import { getKangurKnowledgeGraphStatusSnapshot } from '@/features/kangur/server/knowledge-graph/status-loader';
import {
  kangurKnowledgeGraphStatusResponseSchema,
  type ApiHandlerContext,
} from '@/shared/contracts';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/shared/contracts/kangur-knowledge-graph';
import { authError, badRequestError, internalError } from '@/shared/errors/app-error';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';

type KangurKnowledgeGraphStatusSession = {
  user?: {
    isElevated?: boolean;
    permissions?: string[];
  } | null;
} | null;

const canAccessKangurKnowledgeGraphStatus = (
  session: KangurKnowledgeGraphStatusSession
): boolean =>
  Boolean(session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage'));

export const querySchema = z.object({
  graphKey: z.preprocess(
    (value) => normalizeOptionalQueryString(value) ?? KANGUR_KNOWLEDGE_GRAPH_KEY,
    z.string().trim().min(1).max(160)
  ),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!canAccessKangurKnowledgeGraphStatus(session)) {
    throw authError('Unauthorized.');
  }

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
