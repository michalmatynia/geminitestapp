import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';

import { listNodeCodeObjectV3NativeRegistryContracts } from './node-code-object-v3-legacy-bridge';

import type { ResolveCodeObjectHandlerArgs } from './node-runtime-kernel';

export type NodeRuntimeLegacyHandlerCatalog = Record<string, NodeHandler>;

export type NodeRuntimeHandlerCatalog = {
  legacyHandlers: NodeRuntimeLegacyHandlerCatalog;
  legacyNodeTypes: readonly string[];
  nativeCodeObjectHandlers: Record<string, NodeHandler>;
  nativeCodeObjectHandlerIds: readonly string[];
  resolveLegacyHandler: (nodeType: string) => NodeHandler | null;
  resolveNativeCodeObjectHandler: (args: ResolveCodeObjectHandlerArgs) => NodeHandler | null;
};

const buildNativeCodeObjectHandlers = (
  legacyHandlers: NodeRuntimeLegacyHandlerCatalog
): Record<string, NodeHandler> => {
  const nativeEntries = listNodeCodeObjectV3NativeRegistryContracts()
    .map((contract): [string, NodeHandler] | null => {
      const handler = legacyHandlers[contract.nodeType];
      return handler ? [contract.codeObjectId, handler] : null;
    })
    .filter((entry): entry is [string, NodeHandler] => Array.isArray(entry));
  return Object.fromEntries(nativeEntries);
};

export const createNodeRuntimeHandlerCatalog = (
  legacyHandlersInput: NodeRuntimeLegacyHandlerCatalog
): NodeRuntimeHandlerCatalog => {
  const legacyHandlers = { ...legacyHandlersInput };
  const nativeCodeObjectHandlers = buildNativeCodeObjectHandlers(legacyHandlers);

  return {
    legacyHandlers,
    legacyNodeTypes: Object.freeze(Object.keys(legacyHandlers).sort()),
    nativeCodeObjectHandlers,
    nativeCodeObjectHandlerIds: Object.freeze(Object.keys(nativeCodeObjectHandlers).sort()),
    resolveLegacyHandler: (nodeType: string): NodeHandler | null =>
      legacyHandlers[nodeType] ?? null,
    resolveNativeCodeObjectHandler: ({
      codeObjectId,
    }: ResolveCodeObjectHandlerArgs): NodeHandler | null =>
      nativeCodeObjectHandlers[codeObjectId] ?? null,
  };
};
