import nodeCodeObjectV3ContractsJson from '../../../../../../docs/ai-paths/node-code-objects-v3/contracts.json';

import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';

import type { ResolveCodeObjectHandlerArgs } from './node-runtime-kernel';

export type NodeCodeObjectV3ContractEntry = {
  nodeType: string;
  codeObjectId: string;
  runtimeStrategy: string;
  executionAdapter: string;
  legacyHandlerKey: string | null;
};

export const NODE_CODE_OBJECT_V3_EXECUTION_ADAPTERS = [
  'legacy_handler_bridge',
  'native_handler_registry',
] as const;
export type NodeCodeObjectV3ExecutionAdapter =
  (typeof NODE_CODE_OBJECT_V3_EXECUTION_ADAPTERS)[number];

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseContractEntry = ({
  nodeType,
  value,
}: {
  nodeType: string;
  value: unknown;
}): NodeCodeObjectV3ContractEntry | null => {
  const record = asRecord(value);
  if (!record) return null;
  const codeObjectId = asTrimmedString(record['codeObjectId']);
  const runtimeStrategy = asTrimmedString(record['runtimeStrategy']);
  const executionAdapter = asTrimmedString(record['executionAdapter']);
  const legacyHandlerKey = asTrimmedString(record['legacyHandlerKey']);
  if (!codeObjectId || !runtimeStrategy || !executionAdapter) return null;
  return {
    nodeType,
    codeObjectId,
    runtimeStrategy,
    executionAdapter,
    legacyHandlerKey,
  };
};

const parseContractsByCodeObjectId = (
  input: unknown
): Map<string, NodeCodeObjectV3ContractEntry> => {
  const root = asRecord(input);
  const contracts = asRecord(root?.['contracts']) ?? {};
  const entries = Object.entries(contracts)
    .map(([rawNodeType, value]): NodeCodeObjectV3ContractEntry | null => {
      const nodeType = asTrimmedString(rawNodeType);
      if (!nodeType) return null;
      return parseContractEntry({ nodeType, value });
    })
    .filter((entry): entry is NodeCodeObjectV3ContractEntry => Boolean(entry))
    .map((entry): [string, NodeCodeObjectV3ContractEntry] => [entry.codeObjectId, entry]);
  return new Map(entries);
};

const NODE_CODE_OBJECT_V3_CONTRACTS_BY_CODE_OBJECT_ID = parseContractsByCodeObjectId(
  nodeCodeObjectV3ContractsJson
);

const normalizeNodeType = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeCodeObjectId = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const resolveNodeCodeObjectV3ContractByCodeObjectId = (
  codeObjectIdInput: string
): NodeCodeObjectV3ContractEntry | null => {
  const codeObjectId = normalizeCodeObjectId(codeObjectIdInput);
  if (!codeObjectId) return null;
  return NODE_CODE_OBJECT_V3_CONTRACTS_BY_CODE_OBJECT_ID.get(codeObjectId) ?? null;
};

export const listNodeCodeObjectV3NativeRegistryContracts = (): readonly NodeCodeObjectV3ContractEntry[] =>
  Array.from(NODE_CODE_OBJECT_V3_CONTRACTS_BY_CODE_OBJECT_ID.values())
    .filter(
      (entry: NodeCodeObjectV3ContractEntry): boolean =>
        entry.runtimeStrategy === 'code_object_v3' &&
        entry.executionAdapter === 'native_handler_registry'
    )
    .sort((left, right) => left.codeObjectId.localeCompare(right.codeObjectId));

export type CreateNodeCodeObjectV3ContractResolverArgs = {
  resolveLegacyHandler: (nodeType: string) => NodeHandler | null;
  resolveNativeCodeObjectHandler?:
    | ((args: ResolveCodeObjectHandlerArgs) => NodeHandler | null)
    | undefined;
  strictNativeRegistry?: boolean | undefined;
};

const resolveViaLegacyBridge = ({
  contract,
  resolveLegacyHandler,
}: {
  contract: NodeCodeObjectV3ContractEntry;
  resolveLegacyHandler: (nodeType: string) => NodeHandler | null;
}): NodeHandler | null => {
  if (!contract.legacyHandlerKey) return null;
  return resolveLegacyHandler(contract.legacyHandlerKey);
};

const resolveViaNativeRegistry = ({
  args,
  resolveNativeCodeObjectHandler,
}: {
  args: ResolveCodeObjectHandlerArgs;
  resolveNativeCodeObjectHandler:
    | ((args: ResolveCodeObjectHandlerArgs) => NodeHandler | null)
    | undefined;
}): NodeHandler | null => {
  if (typeof resolveNativeCodeObjectHandler !== 'function') return null;
  return resolveNativeCodeObjectHandler(args);
};

export const createNodeCodeObjectV3ContractResolver = ({
  resolveLegacyHandler,
  resolveNativeCodeObjectHandler,
  strictNativeRegistry: _strictNativeRegistry,
}: CreateNodeCodeObjectV3ContractResolverArgs): ((
  args: ResolveCodeObjectHandlerArgs
) => NodeHandler | null) => {
  return ({
    nodeType: nodeTypeInput,
    codeObjectId: codeObjectIdInput,
  }: ResolveCodeObjectHandlerArgs) => {
    const nodeType = normalizeNodeType(nodeTypeInput);
    const codeObjectId = normalizeCodeObjectId(codeObjectIdInput);
    if (!nodeType || !codeObjectId) return null;

    const contract = resolveNodeCodeObjectV3ContractByCodeObjectId(codeObjectId);
    if (!contract) return null;
    if (contract.nodeType !== nodeType) return null;
    if (contract.runtimeStrategy !== 'code_object_v3') return null;

    if (contract.executionAdapter === 'native_handler_registry') {
      return resolveViaNativeRegistry({
        args: {
          nodeType,
          codeObjectId,
        },
        resolveNativeCodeObjectHandler,
      });
    }

    if (contract.executionAdapter === 'legacy_handler_bridge') {
      return resolveViaLegacyBridge({
        contract,
        resolveLegacyHandler,
      });
    }

    return null;
  };
};

export const createNodeCodeObjectV3LegacyBridgeResolver = ({
  resolveLegacyHandler,
}: {
  resolveLegacyHandler: (nodeType: string) => NodeHandler | null;
}): ((args: ResolveCodeObjectHandlerArgs) => NodeHandler | null) => {
  return ({
    nodeType: nodeTypeInput,
    codeObjectId: codeObjectIdInput,
  }: ResolveCodeObjectHandlerArgs) => {
    const nodeType = normalizeNodeType(nodeTypeInput);
    const codeObjectId = normalizeCodeObjectId(codeObjectIdInput);
    if (!nodeType || !codeObjectId) return null;

    const contract = resolveNodeCodeObjectV3ContractByCodeObjectId(codeObjectId);
    if (!contract) return null;
    if (contract.nodeType !== nodeType) return null;
    if (contract.runtimeStrategy !== 'code_object_v3') return null;

    return resolveViaLegacyBridge({
      contract,
      resolveLegacyHandler,
    });
  };
};
