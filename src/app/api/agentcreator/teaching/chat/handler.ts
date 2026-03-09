import { NextRequest, NextResponse } from 'next/server';

import { buildAgentTeachingContextRegistrySystemPrompt } from '@/features/ai/agentcreator/teaching/context-registry/system-prompt';
import { runTeachingChat } from '@/features/ai/agentcreator/teaching/server/chat';
import { mergeContextRegistryResolutionBundles } from '@/features/ai/ai-context-registry/context/page-context-shared';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { agentTeachingChatRequestSchema } from '@/shared/contracts/agent-teaching';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, agentTeachingChatRequestSchema, {
    logPrefix: 'agentcreator.teaching.chat.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { agentId, messages, contextRegistry } = parsed.data;
  const registryRefs = contextRegistry?.refs ?? [];
  const resolvedRegistryBundle = registryRefs.length
    ? await contextRegistryEngine.resolveRefs({
      refs: registryRefs,
      maxNodes: 24,
      depth: 1,
    })
    : null;
  const contextRegistryBundle = mergeContextRegistryResolutionBundles(
    resolvedRegistryBundle,
    contextRegistry?.resolved ?? null
  );
  const additionalSystemPrompt = buildAgentTeachingContextRegistrySystemPrompt(
    contextRegistryBundle
  );
  const result = await runTeachingChat({
    agentId,
    messages,
    additionalSystemPrompt,
  });
  return NextResponse.json(result);
}
