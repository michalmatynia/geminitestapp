import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { buildKangurKnowledgeGraph } from '@/features/kangur/server/knowledge-graph/build-kangur-knowledge-graph';
import { syncKangurKnowledgeGraphToNeo4j } from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { enrichKangurKnowledgeGraphWithEmbeddings } from '@/features/kangur/server/knowledge-graph/semantic';
import { getKangurKnowledgeGraphStatusSnapshot } from '@/features/kangur/server/knowledge-graph/status-loader';
import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import {
  kangurKnowledgeGraphSyncRequestSchema,
  kangurKnowledgeGraphSyncResponseSchema,
  type ApiHandlerContext,
} from '@/shared/contracts';
import { authError, badRequestError, internalError } from '@/shared/errors/app-error';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';

type KangurKnowledgeGraphSyncSession = {
  user?: {
    isElevated?: boolean;
    permissions?: string[];
  } | null;
} | null;

const canManageKangurKnowledgeGraph = (session: KangurKnowledgeGraphSyncSession): boolean =>
  Boolean(session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage'));

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!canManageKangurKnowledgeGraph(session)) {
    throw authError('Unauthorized.');
  }

  if (!isNeo4jEnabled()) {
    throw badRequestError('Neo4j is not enabled for Kangur knowledge graph sync.');
  }

  const payload = kangurKnowledgeGraphSyncRequestSchema.parse(ctx.body ?? {});
  const [tutorContent, nativeGuideStore, pageContentStore] = await Promise.all([
    getKangurAiTutorContent(payload.locale),
    getKangurAiTutorNativeGuideStore(payload.locale),
    getKangurPageContentStore(payload.locale),
  ]);

  const baseSnapshot = buildKangurKnowledgeGraph({
    locale: payload.locale,
    tutorContent,
    nativeGuideStore,
    pageContentStore,
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
