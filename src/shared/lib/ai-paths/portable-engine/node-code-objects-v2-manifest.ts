import { getPortableNodeCodeObjectContractsCatalog } from './node-code-objects-v2-contracts';

export const PORTABLE_NODE_CODE_OBJECT_MANIFEST_METADATA_KEY = 'aiPathsNodeCodeObjectsV2' as const;
export const PORTABLE_NODE_CODE_OBJECT_MANIFEST_SCHEMA_VERSION =
  'ai-paths.node-code-object-manifest.v1' as const;

export const PORTABLE_NODE_CODE_OBJECT_HASH_VERIFICATION_MODES = ['off', 'warn', 'strict'] as const;
export type PortableNodeCodeObjectHashVerificationMode =
  (typeof PORTABLE_NODE_CODE_OBJECT_HASH_VERIFICATION_MODES)[number];

export type PortableNodeCodeObjectManifestEntry = {
  nodeType: string;
  objectHashAlgorithm: 'sha256';
  objectHash: string;
};

export type PortableNodeCodeObjectManifest = {
  schemaVersion: typeof PORTABLE_NODE_CODE_OBJECT_MANIFEST_SCHEMA_VERSION;
  contractsSchemaVersion: string;
  contractsHashAlgorithm: 'sha256';
  contractsHash: string;
  generatedAt: string;
  entries: PortableNodeCodeObjectManifestEntry[];
};

export type PortableNodeCodeObjectManifestWarningCode =
  | 'node_code_object_manifest_invalid'
  | 'node_code_object_hash_missing'
  | 'node_code_object_hash_mismatch'
  | 'node_code_object_hash_unknown_node_type';

export type PortableNodeCodeObjectManifestWarning = {
  code: PortableNodeCodeObjectManifestWarningCode;
  message: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asSha256Hex = (value: unknown): string | null => {
  const parsed = asTrimmedString(value);
  if (!parsed) return null;
  return /^[a-f0-9]{64}$/i.test(parsed) ? parsed : null;
};

const resolveUniqueNodeTypes = (nodeTypes: string[]): string[] =>
  Array.from(
    new Set(
      nodeTypes
        .map((nodeType: string): string => (typeof nodeType === 'string' ? nodeType.trim() : ''))
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));

const parseManifestEntry = (value: unknown): PortableNodeCodeObjectManifestEntry | null => {
  const record = asRecord(value);
  if (!record) return null;
  const nodeType = asTrimmedString(record['nodeType']);
  const objectHashAlgorithm = record['objectHashAlgorithm'];
  const objectHash = asSha256Hex(record['objectHash']);
  if (!nodeType || objectHashAlgorithm !== 'sha256' || !objectHash) return null;
  return {
    nodeType,
    objectHashAlgorithm: 'sha256',
    objectHash: objectHash.toLowerCase(),
  };
};

const parseManifest = (value: unknown): PortableNodeCodeObjectManifest | null => {
  const record = asRecord(value);
  if (!record) return null;
  const schemaVersion = asTrimmedString(record['schemaVersion']);
  if (schemaVersion !== PORTABLE_NODE_CODE_OBJECT_MANIFEST_SCHEMA_VERSION) return null;
  const contractsSchemaVersion = asTrimmedString(record['contractsSchemaVersion']);
  const contractsHashAlgorithm = record['contractsHashAlgorithm'];
  const contractsHash = asSha256Hex(record['contractsHash']);
  const generatedAt = asTrimmedString(record['generatedAt']);
  const entriesRaw = Array.isArray(record['entries']) ? record['entries'] : null;
  if (
    !contractsSchemaVersion ||
    contractsHashAlgorithm !== 'sha256' ||
    !contractsHash ||
    !generatedAt ||
    !entriesRaw
  ) {
    return null;
  }
  const entries = entriesRaw
    .map((entry: unknown): PortableNodeCodeObjectManifestEntry | null => parseManifestEntry(entry))
    .filter((entry): entry is PortableNodeCodeObjectManifestEntry => Boolean(entry))
    .sort((left, right) => left.nodeType.localeCompare(right.nodeType));
  return {
    schemaVersion: PORTABLE_NODE_CODE_OBJECT_MANIFEST_SCHEMA_VERSION,
    contractsSchemaVersion,
    contractsHashAlgorithm: 'sha256',
    contractsHash: contractsHash.toLowerCase(),
    generatedAt,
    entries,
  };
};

const formatVerificationError = (
  warning: PortableNodeCodeObjectManifestWarning
): string => `Portable node code object verification failed: ${warning.message}`;

const finalizeVerification = (
  mode: PortableNodeCodeObjectHashVerificationMode,
  warnings: PortableNodeCodeObjectManifestWarning[]
):
  | { ok: true; warnings: PortableNodeCodeObjectManifestWarning[] }
  | { ok: false; error: string; warnings: PortableNodeCodeObjectManifestWarning[] } => {
  if (warnings.length === 0 || mode !== 'strict') {
    return { ok: true, warnings };
  }
  return {
    ok: false,
    error: formatVerificationError(warnings[0]!),
    warnings,
  };
};

export const buildPortableNodeCodeObjectManifest = (
  nodeTypes: string[]
): PortableNodeCodeObjectManifest => {
  const contractsCatalog = getPortableNodeCodeObjectContractsCatalog();
  const entries = resolveUniqueNodeTypes(nodeTypes)
    .map((nodeType: string): PortableNodeCodeObjectManifestEntry | null => {
      const contract = contractsCatalog.contracts[nodeType];
      if (!contract) return null;
      return {
        nodeType,
        objectHashAlgorithm: contract.objectHashAlgorithm,
        objectHash: contract.objectHash,
      };
    })
    .filter((entry): entry is PortableNodeCodeObjectManifestEntry => Boolean(entry));
  return {
    schemaVersion: PORTABLE_NODE_CODE_OBJECT_MANIFEST_SCHEMA_VERSION,
    contractsSchemaVersion: contractsCatalog.schemaVersion,
    contractsHashAlgorithm: contractsCatalog.contractsHashAlgorithm,
    contractsHash: contractsCatalog.contractsHash,
    generatedAt: new Date().toISOString(),
    entries,
  };
};

export const withPortableNodeCodeObjectManifest = (
  metadata: Record<string, unknown> | undefined,
  nodeTypes: string[]
): Record<string, unknown> => ({
  ...(metadata ?? {}),
  [PORTABLE_NODE_CODE_OBJECT_MANIFEST_METADATA_KEY]: buildPortableNodeCodeObjectManifest(nodeTypes),
});

export const verifyPortableNodeCodeObjectManifest = ({
  metadata,
  nodeTypes,
  mode,
}: {
  metadata: Record<string, unknown> | undefined;
  nodeTypes: string[];
  mode: PortableNodeCodeObjectHashVerificationMode;
}):
  | { ok: true; warnings: PortableNodeCodeObjectManifestWarning[] }
  | { ok: false; error: string; warnings: PortableNodeCodeObjectManifestWarning[] } => {
  if (mode === 'off') {
    return { ok: true, warnings: [] };
  }
  const manifestRaw = metadata?.[PORTABLE_NODE_CODE_OBJECT_MANIFEST_METADATA_KEY];
  if (manifestRaw === undefined || manifestRaw === null) {
    return { ok: true, warnings: [] };
  }

  const parsedManifest = parseManifest(manifestRaw);
  if (!parsedManifest) {
    return finalizeVerification(mode, [
      {
        code: 'node_code_object_manifest_invalid',
        message:
          'Portable package metadata contains an invalid node code object manifest (aiPathsNodeCodeObjectsV2).',
      },
    ]);
  }

  const manifestEntryByNodeType = new Map<string, PortableNodeCodeObjectManifestEntry>(
    parsedManifest.entries.map((entry) => [entry.nodeType, entry])
  );
  const contractsCatalog = getPortableNodeCodeObjectContractsCatalog();
  const warnings: PortableNodeCodeObjectManifestWarning[] = [];
  for (const nodeType of resolveUniqueNodeTypes(nodeTypes)) {
    const contract = contractsCatalog.contracts[nodeType];
    if (!contract) {
      warnings.push({
        code: 'node_code_object_hash_unknown_node_type',
        message: `Node type "${nodeType}" is not present in local node code object contracts.`,
      });
      continue;
    }
    const entry = manifestEntryByNodeType.get(nodeType);
    if (!entry) {
      warnings.push({
        code: 'node_code_object_hash_missing',
        message: `Node type "${nodeType}" is missing from package node code object manifest.`,
      });
      continue;
    }
    if (
      entry.objectHashAlgorithm !== contract.objectHashAlgorithm ||
      entry.objectHash.toLowerCase() !== contract.objectHash.toLowerCase()
    ) {
      warnings.push({
        code: 'node_code_object_hash_mismatch',
        message: `Node type "${nodeType}" manifest hash does not match local node code object contracts.`,
      });
    }
  }

  return finalizeVerification(mode, warnings);
};
