import { NextRequest, NextResponse } from 'next/server';

import { buildKangurKnowledgeGraphFromRepositories } from '@/features/kangur/server/knowledge-graph/source-loader';
import { syncKangurKnowledgeGraphToNeo4j } from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { enrichKangurKnowledgeGraphWithEmbeddings } from '@/features/kangur/server/knowledge-graph/semantic';
import { getKangurKnowledgeGraphStatusSnapshot } from '@/features/kangur/server/knowledge-graph/status-loader';
import { kangurKnowledgeGraphSyncRequestSchema, kangurKnowledgeGraphSyncResponseSchema } from '@/shared/contracts/kangur-observability';
import { type ApiHandlerContext } from '@/shared/contracts';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();

  if (!isNeo4jEnabled()) {
    throw badRequestError('Neo4j is not enabled for Kangur knowledge graph sync.');
  }

  const payload = kangurKnowledgeGraphSyncRequestSchema.parse(ctx.body ?? {});
  const baseSnapshot = await buildKangurKnowledgeGraphFromRepositories({
    locale: payload.locale,
  });
  const snapshot = payload.withEmbeddings
    ? await enrichKangurKnowledgeGraphWithEmbeddings(baseSnapshot)
    : baseSnapshot;
  const syncResult = await syncKangurKnowledgeGraphToNeo4j(snapshot);
  const status = await getKangurKnowledgeGraphStatusSnapshot(syncResult.graphKey);
  const responsePayload = {
    sync: {
      ...syncResult,
      locale: payload.locale,
      withEmbeddings: payload.withEmbeddings,
    },
    status,
  };
  const validatedResponse = kangurKnowledgeGraphSyncResponseSchema.safeParse(responsePayload);

  if (!validatedResponse.success) {
    throw internalError('Invalid Kangur knowledge graph sync contract', {
      issues: validatedResponse.error.flatten(),
    });
  }

  return NextResponse.json(validatedResponse.data, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
