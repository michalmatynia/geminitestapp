import nodeCodeObjectContractsJson from '../../../../../docs/ai-paths/node-code-objects-v2/contracts.json';

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

type PortableNodeCodeObjectContractEntry = {
  objectId: string;
  title: string;
  objectHashAlgorithm: 'sha256';
  objectHash: string;
};

export type PortableNodeCodeObjectContractsCatalog = {
  schemaVersion: string;
  generatedAt: string;
  specVersion: string;
  totalContracts: number;
  contracts: Record<string, PortableNodeCodeObjectContractEntry>;
  contractsHashAlgorithm: 'sha256';
  contractsHash: string;
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

const parseContractEntry = (value: unknown): PortableNodeCodeObjectContractEntry | null => {
  const record = asRecord(value);
  if (!record) return null;
  const objectId = asTrimmedString(record['objectId']);
  const title = asTrimmedString(record['title']);
  const objectHashAlgorithm = record['objectHashAlgorithm'];
  const objectHash = asSha256Hex(record['objectHash']);
  if (!objectId || !title || objectHashAlgorithm !== 'sha256' || !objectHash) return null;
  return {
    objectId,
    title,
    objectHashAlgorithm: 'sha256',
    objectHash: objectHash.toLowerCase(),
  };
};

const parseContractsCatalog = (input: unknown): PortableNodeCodeObjectContractsCatalog => {
  const record = asRecord(input);
  if (!record) {
    return {
      schemaVersion: 'invalid',
      generatedAt: new Date(0).toISOString(),
      specVersion: 'unknown',
      totalContracts: 0,
      contracts: {},
      contractsHashAlgorithm: 'sha256',
      contractsHash: '0'.repeat(64),
    };
  }
  const contractsRecord = asRecord(record['contracts']) ?? {};
  const contracts = Object.fromEntries(
    Object.entries(contractsRecord)
      .map(([nodeType, entry]): [string, PortableNodeCodeObjectContractEntry] | null => {
        const normalizedType = asTrimmedString(nodeType);
        if (!normalizedType) return null;
        const parsedEntry = parseContractEntry(entry);
        if (!parsedEntry) return null;
        return [normalizedType, parsedEntry];
      })
      .filter(
        (
          row
        ): row is [string, PortableNodeCodeObjectContractEntry] => Boolean(row)
      )
      .sort(([left], [right]) => left.localeCompare(right))
  );
  const schemaVersion = asTrimmedString(record['schemaVersion']) ?? 'invalid';
  const generatedAt = asTrimmedString(record['generatedAt']) ?? new Date(0).toISOString();
  const specVersion = asTrimmedString(record['specVersion']) ?? 'unknown';
  const totalContracts = Number.isFinite(record['totalContracts'])
    ? Math.max(0, Math.trunc(record['totalContracts'] as number))
    : Object.keys(contracts).length;
  const contractsHash = asSha256Hex(record['contractsHash']) ?? '0'.repeat(64);
  return {
    schemaVersion,
    generatedAt,
    specVersion,
    totalContracts,
    contracts,
    contractsHashAlgorithm: 'sha256',
    contractsHash: contractsHash.toLowerCase(),
  };
};

const PORTABLE_NODE_CODE_OBJECT_CONTRACTS: PortableNodeCodeObjectContractsCatalog =
  parseContractsCatalog(nodeCodeObjectContractsJson);

export const getPortableNodeCodeObjectContractsCatalog = (): PortableNodeCodeObjectContractsCatalog => ({
  ...PORTABLE_NODE_CODE_OBJECT_CONTRACTS,
  contracts: { ...PORTABLE_NODE_CODE_OBJECT_CONTRACTS.contracts },
});

export const getPortableNodeCodeObjectContractsHash = (): string =>
  PORTABLE_NODE_CODE_OBJECT_CONTRACTS.contractsHash;

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
  const entries = resolveUniqueNodeTypes(nodeTypes)
    .map((nodeType: string): PortableNodeCodeObjectManifestEntry | null => {
      const contract = PORTABLE_NODE_CODE_OBJECT_CONTRACTS.contracts[nodeType];
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
    contractsSchemaVersion: PORTABLE_NODE_CODE_OBJECT_CONTRACTS.schemaVersion,
    contractsHashAlgorithm: PORTABLE_NODE_CODE_OBJECT_CONTRACTS.contractsHashAlgorithm,
    contractsHash: PORTABLE_NODE_CODE_OBJECT_CONTRACTS.contractsHash,
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

  const warnings: PortableNodeCodeObjectManifestWarning[] = [];
  for (const nodeType of resolveUniqueNodeTypes(nodeTypes)) {
    const contract = PORTABLE_NODE_CODE_OBJECT_CONTRACTS.contracts[nodeType];
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
