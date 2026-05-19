/**
 * Agent Runtime Context Registry - Server Entry Point
 *
 * This module serves as the server-only entry point for agent runtime context registry integration.
 * It exports utilities for building and resolving context registry envelopes for agent execution.
 *
 * Boundary Warning: This module must only be imported into server-side code.
 *
 * Exported members:
 * - applyAgentRuntimeContextMemory: Apply context memory to agent state
 * - buildAgentRuntimeContextRegistryPrompt: Build prompt with context registry content
 * - readAgentRuntimeContextRegistry: Read and parse context registry data
 * - resolveAgentRuntimeContextRegistryEnvelope: Resolve context registry references
 *
 * Example usage:
 * import { resolveAgentRuntimeContextRegistryEnvelope } from '@/features/ai/agent-runtime/context-registry/server';
 */

import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
} from '@/features/ai/ai-context-registry/context/page-context-shared';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';

export {
  applyAgentRuntimeContextMemory,
  buildAgentRuntimeContextRegistryPrompt,
  readAgentRuntimeContextRegistry,
} from './shared';

export const resolveAgentRuntimeContextRegistryEnvelope = async (
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
