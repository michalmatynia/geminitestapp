/**
 * AI Paths Context Registry - Server Entry Point
 *
 * This module serves as the server-only entry point for AI Paths context registry integration.
 * It exports utilities for building and resolving context registry envelopes for path execution.
 *
 * Boundary Warning: This module must only be imported into server-side code.
 *
 * Exported members:
 * - resolveAiPathsContextRegistryEnvelope: Resolve context registry references for AI Paths
 *
 * Example usage:
 * import { resolveAiPathsContextRegistryEnvelope } from '@/features/ai/ai-paths/context-registry/server';
 */

import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
} from '@/features/ai/ai-context-registry/context/page-context-shared';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';

export const resolveAiPathsContextRegistryEnvelope = async (
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
