import { contextRegistryEngine } from '@/features/ai/server';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
} from '@/shared/lib/ai-context-registry/page-context-shared';

export const resolveKangurTtsContextRegistryEnvelope = async (
  contextRegistry: ContextRegistryConsumerEnvelope | null | undefined
): Promise<ContextRegistryConsumerEnvelope | null> => {
  if (!contextRegistry) {
    return null;
  }

  const resolvedRegistryBundle =
    contextRegistry.refs.length > 0
      ? await contextRegistryEngine.resolveRefs({
        refs: contextRegistry.refs,
        maxNodes: 24,
        depth: 1,
      })
      : null;

  return buildContextRegistryConsumerEnvelope({
    refs: contextRegistry.refs,
    resolved: mergeContextRegistryResolutionBundles(
      resolvedRegistryBundle,
      contextRegistry.resolved ?? null
    ),
  });
};
