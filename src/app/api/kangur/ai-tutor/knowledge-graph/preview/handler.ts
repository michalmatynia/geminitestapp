import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import { buildKangurKnowledgeGraphPreviewResult } from '@/features/kangur/server/knowledge-graph/preview';
import { resolveKangurAiTutorRuntimeDocuments } from '@/features/kangur/server/context-registry';
import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { kangurAiTutorConversationContextSchema } from '@/shared/contracts/kangur-ai-tutor';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

export const kangurAiTutorKnowledgeGraphPreviewRequestSchema = z.object({
  latestUserMessage: z.string().trim().min(1).max(1_000),
  learnerId: z.string().trim().max(120).optional(),
  locale: z.string().trim().max(16).optional().default('pl'),
  context: kangurAiTutorConversationContextSchema.optional(),
});

export async function postKangurAiTutorKnowledgeGraphPreviewHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can preview Kangur AI Tutor knowledge graph retrieval.');
  }

  const payload = kangurAiTutorKnowledgeGraphPreviewRequestSchema.parse(ctx.body);
  const learnerId = payload.learnerId ?? actor.activeLearner.id;
  const requestedRefs = buildKangurAiTutorContextRegistryRefs({
    learnerId,
    context: payload.context,
  });

  const contextRegistryBundle =
    requestedRefs.length > 0
      ? await contextRegistryEngine.resolveRefs({
          refs: requestedRefs,
          maxNodes: 24,
          depth: 1,
        })
      : null;

  const resolvedRuntimeDocuments = resolveKangurAiTutorRuntimeDocuments(
    contextRegistryBundle,
    payload.context
  );
  const runtimeDocuments = [
    resolvedRuntimeDocuments.learnerSnapshot,
    resolvedRuntimeDocuments.loginActivity,
    resolvedRuntimeDocuments.surfaceContext,
    resolvedRuntimeDocuments.assignmentContext,
  ].filter((document): document is NonNullable<typeof document> => Boolean(document));

  const preview = await buildKangurKnowledgeGraphPreviewResult({
    latestUserMessage: payload.latestUserMessage,
    learnerId,
    locale: payload.locale,
    context: payload.context,
    runtimeDocuments,
    runtimeResolution: 'live',
  });

  return NextResponse.json(
    preview,
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
