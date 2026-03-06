import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';

import type { ResolveCodeObjectHandlerArgs } from './node-runtime-kernel';

export type NodeCodeObjectHandlerResolver = (
  args: ResolveCodeObjectHandlerArgs
) => NodeHandler | null;

const CODE_OBJECT_RESOLVER_REGISTRY = new Map<string, NodeCodeObjectHandlerResolver>();

const normalizeResolverId = (value: string): string => value.trim();

const listResolvers = (): NodeCodeObjectHandlerResolver[] =>
  Array.from(CODE_OBJECT_RESOLVER_REGISTRY.values());

export const registerAiPathsRuntimeCodeObjectResolver = (
  id: string,
  resolver: NodeCodeObjectHandlerResolver
): (() => void) => {
  const normalizedId = normalizeResolverId(id);
  if (!normalizedId) {
    throw new Error('AI Paths runtime code-object resolver id must be non-empty.');
  }
  CODE_OBJECT_RESOLVER_REGISTRY.set(normalizedId, resolver);
  return () => {
    CODE_OBJECT_RESOLVER_REGISTRY.delete(normalizedId);
  };
};

export const unregisterAiPathsRuntimeCodeObjectResolver = (id: string): boolean => {
  const normalizedId = normalizeResolverId(id);
  if (!normalizedId) return false;
  return CODE_OBJECT_RESOLVER_REGISTRY.delete(normalizedId);
};

export const clearAiPathsRuntimeCodeObjectResolvers = (): void => {
  CODE_OBJECT_RESOLVER_REGISTRY.clear();
};

export const listAiPathsRuntimeCodeObjectResolverIds = (): string[] =>
  Array.from(CODE_OBJECT_RESOLVER_REGISTRY.keys());

export const resolveAiPathsRuntimeCodeObjectHandler = (
  args: ResolveCodeObjectHandlerArgs,
  options?: {
    resolverIds?: string[] | undefined;
  }
): NodeHandler | null => {
  const resolverIds =
    Array.isArray(options?.resolverIds) && options?.resolverIds.length > 0
      ? options.resolverIds
        .map((entry: string): string => normalizeResolverId(entry))
        .filter(Boolean)
      : null;

  const resolverEntries =
    resolverIds && resolverIds.length > 0
      ? resolverIds
        .map(
          (id: string): NodeCodeObjectHandlerResolver | null =>
            CODE_OBJECT_RESOLVER_REGISTRY.get(id) ?? null
        )
        .filter((resolver): resolver is NodeCodeObjectHandlerResolver => Boolean(resolver))
      : listResolvers();

  for (const resolver of resolverEntries) {
    const resolved = resolver(args);
    if (resolved) {
      return resolved;
    }
  }
  return null;
};
