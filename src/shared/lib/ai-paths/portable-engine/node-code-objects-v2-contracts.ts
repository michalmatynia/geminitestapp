import nodeCodeObjectContractsJson from '../../../../../docs/ai-paths/node-code-objects-v2/contracts.json';

export type PortableNodeCodeObjectContractEntry = {
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
