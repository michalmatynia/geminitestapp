export const DESCRIPTION_AND_NAME_PATH_ID = 'path_65mv2p';
export const DESCRIPTION_AND_NAME_PATH_NAME = 'Description & Name';

const PROMPT_REQUIRED_PORTS = new Map<string, string[]>([
  ['node-ozsf40xo', ['bundle']],
  ['node-07ywfx', ['result']],
  ['node-bq516q', ['result']],
]);

const MODEL_REQUIRED_PORTS = new Map<string, string[]>([
  ['node-o8fdnje9', ['prompt']],
  ['node-05y44u', ['prompt']],
  ['node-gfrhnz', ['prompt']],
]);

const TARGET_REQUIRED_PORTS = new Map<string, string[]>([
  ...PROMPT_REQUIRED_PORTS.entries(),
  ...MODEL_REQUIRED_PORTS.entries(),
]);

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value)
    ? value.filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    )
    : [];

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter(
      (entry: unknown): entry is string =>
        typeof entry === 'string' && entry.trim().length > 0
    )
    : [];

const normalizePathName = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const isDescriptionAndNamePathConfig = (
  parsed: Record<string, unknown>
): boolean => {
  const id = typeof parsed['id'] === 'string' ? parsed['id'].trim() : '';
  if (id === DESCRIPTION_AND_NAME_PATH_ID) return true;
  return (
    normalizePathName(parsed['name']) ===
    DESCRIPTION_AND_NAME_PATH_NAME.trim().toLowerCase()
  );
};

const isRequiredConfigured = (
  contracts: Record<string, unknown>,
  requiredPorts: Set<string>
): boolean => {
  return Array.from(requiredPorts).every((port: string): boolean => {
    const contract = toRecord(contracts[port]);
    return contract?.['required'] === true;
  });
};

const hasWaitForInputsEnabled = (
  node: Record<string, unknown>
): boolean => {
  const config = toRecord(node['config']);
  const runtime = toRecord(config?.['runtime']);
  return runtime?.['waitForInputs'] === true;
};

const hasExpectedContracts = (
  node: Record<string, unknown>,
  requiredPorts: string[]
): boolean => {
  const nodeContracts = toRecord(node['inputContracts']) ?? {};
  const config = toRecord(node['config']);
  const runtime = toRecord(config?.['runtime']);
  const runtimeContracts = toRecord(runtime?.['inputContracts']) ?? {};
  const mergedContracts = {
    ...nodeContracts,
    ...runtimeContracts,
  };
  return isRequiredConfigured(mergedContracts, new Set(requiredPorts));
};

const applyRequiredContracts = (
  node: Record<string, unknown>,
  requiredPorts: string[]
): Record<string, unknown> => {
  const inputs = toStringArray(node['inputs']);
  const requiredPortSet = new Set(requiredPorts);
  const nodeContracts = toRecord(node['inputContracts']) ?? {};
  const config = toRecord(node['config']) ?? {};
  const runtime = toRecord(config['runtime']) ?? {};
  const runtimeContracts = toRecord(runtime['inputContracts']) ?? {};
  const nextContracts: Record<string, unknown> = {};

  inputs.forEach((port: string): void => {
    const existing = {
      ...(toRecord(nodeContracts[port]) ?? {}),
      ...(toRecord(runtimeContracts[port]) ?? {}),
    };
    nextContracts[port] = {
      ...existing,
      required: requiredPortSet.has(port),
    };
  });

  Object.entries(nodeContracts).forEach(([port, contract]: [string, unknown]): void => {
    if (nextContracts[port] !== undefined) return;
    if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return;
    nextContracts[port] = contract;
  });
  Object.entries(runtimeContracts).forEach(([port, contract]: [string, unknown]): void => {
    if (nextContracts[port] !== undefined) return;
    if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return;
    nextContracts[port] = contract;
  });

  return {
    ...node,
    inputContracts: nextContracts,
    config: {
      ...config,
      runtime: {
        ...runtime,
        waitForInputs: true,
        inputContracts: nextContracts,
      },
    },
  };
};

export const needsDescriptionAndNameConfigUpgrade = (
  raw: string | undefined
): boolean => {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return false;
    if (!isDescriptionAndNamePathConfig(parsed)) return false;

    const nodes = toArray(parsed['nodes']);
    let foundTargetNode = false;
    for (const [nodeId, requiredPorts] of TARGET_REQUIRED_PORTS.entries()) {
      const node = nodes.find(
        (candidate: Record<string, unknown>): boolean => candidate['id'] === nodeId
      );
      if (!node) continue;
      foundTargetNode = true;
      if (!hasWaitForInputsEnabled(node)) return true;
      if (!hasExpectedContracts(node, requiredPorts)) return true;
    }
    return foundTargetNode ? false : false;
  } catch {
    return false;
  }
};

export const upgradeDescriptionAndNameConfig = (
  raw: string | undefined
): string | null => {
  if (!raw) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (!isDescriptionAndNamePathConfig(parsed)) return raw;

  const nodes = toArray(parsed['nodes']);
  if (nodes.length === 0) return raw;
  let changed = false;
  const nextNodes = nodes.map((node: Record<string, unknown>): Record<string, unknown> => {
    const nodeId = typeof node['id'] === 'string' ? node['id'] : null;
    if (!nodeId) return node;
    const requiredPorts = TARGET_REQUIRED_PORTS.get(nodeId);
    if (!requiredPorts) return node;
    const nextNode = applyRequiredContracts(node, requiredPorts);
    if (JSON.stringify(nextNode) !== JSON.stringify(node)) {
      changed = true;
    }
    return nextNode;
  });

  if (!changed) return raw;
  const nextParsed: Record<string, unknown> = {
    ...parsed,
    nodes: nextNodes,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(nextParsed);
};
