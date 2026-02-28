const WAIT_FOR_INPUT_NODE_TYPES = new Set<string>(['model']);
const PROMPT_NODE_TYPES = new Set<string>(['prompt']);

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
        (entry: unknown): entry is string => typeof entry === 'string' && entry.trim().length > 0
      )
    : [];

const toRequiredFlag = (value: unknown): boolean | undefined => {
  if (value === true) return true;
  if (value === false) return false;
  return undefined;
};

const readNodeId = (node: Record<string, unknown>): string | null => {
  const id = node['id'];
  return typeof id === 'string' && id.trim().length > 0 ? id : null;
};

const readNodeType = (node: Record<string, unknown>): string | null => {
  const type = node['type'];
  return typeof type === 'string' && type.trim().length > 0 ? type.trim().toLowerCase() : null;
};

const readEdgeFrom = (edge: Record<string, unknown>): string | null => {
  const from = edge['from'];
  if (typeof from === 'string' && from.trim().length > 0) return from;
  const source = edge['source'];
  if (typeof source === 'string' && source.trim().length > 0) return source;
  return null;
};

const readEdgeTo = (edge: Record<string, unknown>): string | null => {
  const to = edge['to'];
  if (typeof to === 'string' && to.trim().length > 0) return to;
  const target = edge['target'];
  if (typeof target === 'string' && target.trim().length > 0) return target;
  return null;
};

const readEdgeToPort = (edge: Record<string, unknown>): string | null => {
  const toPort = edge['toPort'];
  if (typeof toPort === 'string' && toPort.trim().length > 0) return toPort;
  const targetHandle = edge['targetHandle'];
  if (typeof targetHandle === 'string' && targetHandle.trim().length > 0) return targetHandle;
  return null;
};

const collectConnectedInputPorts = (
  nodeId: string,
  edges: Array<Record<string, unknown>>
): Set<string> => {
  const ports = new Set<string>();
  edges.forEach((edge: Record<string, unknown>): void => {
    const from = readEdgeFrom(edge);
    const to = readEdgeTo(edge);
    const toPort = readEdgeToPort(edge);
    if (!from || !to || !toPort) return;
    if (to !== nodeId) return;
    ports.add(toPort);
  });
  return ports;
};

const readNodeContracts = (
  node: Record<string, unknown>
): { nodeContracts: Record<string, unknown>; runtimeContracts: Record<string, unknown> } => {
  const nodeContracts = toRecord(node['inputContracts']) ?? {};
  const config = toRecord(node['config']) ?? {};
  const runtime = toRecord(config['runtime']) ?? {};
  const runtimeContracts = toRecord(runtime['inputContracts']) ?? {};
  return { nodeContracts, runtimeContracts };
};

const readMergedInputContracts = (
  node: Record<string, unknown>
): Record<string, Record<string, unknown>> => {
  const { nodeContracts, runtimeContracts } = readNodeContracts(node);
  const merged: Record<string, Record<string, unknown>> = {};
  Object.entries(nodeContracts).forEach(([port, contract]: [string, unknown]): void => {
    const record = toRecord(contract);
    if (!record) return;
    merged[port] = { ...record };
  });
  Object.entries(runtimeContracts).forEach(([port, contract]: [string, unknown]): void => {
    const record = toRecord(contract);
    if (!record) return;
    merged[port] = {
      ...(merged[port] ?? {}),
      ...record,
    };
  });
  return merged;
};

const hasMirroredRuntimeContracts = (node: Record<string, unknown>, inputs: string[]): boolean => {
  if (inputs.length === 0) return false;
  const { nodeContracts, runtimeContracts } = readNodeContracts(node);
  return inputs.every((port: string): boolean => {
    const nodeContract = toRecord(nodeContracts[port]);
    const runtimeContract = toRecord(runtimeContracts[port]);
    if (!nodeContract || !runtimeContract) return false;
    const nodeRequired = toRequiredFlag(nodeContract['required']);
    const runtimeRequired = toRequiredFlag(runtimeContract['required']);
    if (nodeRequired === undefined || runtimeRequired === undefined) return false;
    return nodeRequired === runtimeRequired;
  });
};

const hasLegacyStrictPromptContracts = (
  node: Record<string, unknown>,
  connectedPorts: Set<string>
): boolean => {
  if (connectedPorts.size === 0) return false;
  const inputs = toStringArray(node['inputs']);
  if (!hasMirroredRuntimeContracts(node, inputs)) return false;
  const config = toRecord(node['config']) ?? {};
  const runtime = toRecord(config['runtime']) ?? {};
  if (runtime['waitForInputs'] !== true) return false;
  const mergedContracts = readMergedInputContracts(node);
  return Array.from(connectedPorts).some((port: string): boolean => {
    const contract = toRecord(mergedContracts[port]);
    return toRequiredFlag(contract?.['required']) === true;
  });
};

const shouldUpgradeNodeRuntimeContracts = (
  node: Record<string, unknown>,
  connectedPorts: Set<string>
): boolean => {
  const nodeType = readNodeType(node);
  if (!nodeType) return false;

  if (PROMPT_NODE_TYPES.has(nodeType)) {
    return hasLegacyStrictPromptContracts(node, connectedPorts);
  }

  if (!WAIT_FOR_INPUT_NODE_TYPES.has(nodeType)) return false;
  if (connectedPorts.size === 0) return false;

  const config = toRecord(node['config']) ?? {};
  const runtime = toRecord(config['runtime']) ?? {};
  const mergedContracts = readMergedInputContracts(node);
  const promptRequired = toRequiredFlag(toRecord(mergedContracts['prompt'])?.['required']) === true;
  if (runtime['waitForInputs'] !== true) return true;
  if (!promptRequired) return true;

  const inputs = toStringArray(node['inputs']);
  if (!hasMirroredRuntimeContracts(node, inputs)) return false;
  return Array.from(connectedPorts).some((port: string): boolean => {
    if (port === 'prompt') return false;
    const contract = toRecord(mergedContracts[port]);
    return toRequiredFlag(contract?.['required']) === true;
  });
};

const applyNodeRuntimeContractsUpgrade = (
  node: Record<string, unknown>,
  connectedPorts: Set<string>
): Record<string, unknown> => {
  const nodeType = readNodeType(node);
  const inputs = toStringArray(node['inputs']);
  const mergedContracts = readMergedInputContracts(node);

  if (nodeType && PROMPT_NODE_TYPES.has(nodeType)) {
    const nextContracts: Record<string, Record<string, unknown>> = {};
    inputs.forEach((port: string): void => {
      nextContracts[port] = {
        ...(mergedContracts[port] ?? {}),
        required: false,
      };
    });
    Object.entries(mergedContracts).forEach(
      ([port, contract]: [string, Record<string, unknown>]): void => {
        if (nextContracts[port] !== undefined) return;
        nextContracts[port] = {
          ...contract,
          ...(toRequiredFlag(contract['required']) === true ? { required: false } : {}),
        };
      }
    );
    const config = toRecord(node['config']) ?? {};
    const runtime = toRecord(config['runtime']) ?? {};
    return {
      ...node,
      inputContracts: nextContracts,
      config: {
        ...config,
        runtime: {
          ...runtime,
          waitForInputs: false,
          inputContracts: nextContracts,
        },
      },
    };
  }

  const hasMirroredContracts = hasMirroredRuntimeContracts(node, inputs);
  const nextContracts: Record<string, Record<string, unknown>> = {};
  inputs.forEach((port: string): void => {
    const existing = mergedContracts[port] ?? {};
    const required =
      port === 'prompt'
        ? true
        : hasMirroredContracts && connectedPorts.has(port)
          ? false
          : toRequiredFlag(existing['required']) === true;
    nextContracts[port] = {
      ...existing,
      required,
    };
  });
  Object.entries(mergedContracts).forEach(
    ([port, contract]: [string, Record<string, unknown>]): void => {
      if (nextContracts[port] !== undefined) return;
      nextContracts[port] = contract;
    }
  );

  const config = toRecord(node['config']) ?? {};
  const runtime = toRecord(config['runtime']) ?? {};
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

export const needsRuntimeInputContractsUpgrade = (raw: string | undefined): boolean => {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return false;
    const nodes = toArray(parsed['nodes']);
    if (nodes.length === 0) return false;
    const edges = toArray(parsed['edges']);

    return nodes.some((node: Record<string, unknown>): boolean => {
      const nodeId = readNodeId(node);
      const nodeType = readNodeType(node);
      if (
        !nodeId ||
        !nodeType ||
        (!WAIT_FOR_INPUT_NODE_TYPES.has(nodeType) && !PROMPT_NODE_TYPES.has(nodeType))
      ) {
        return false;
      }
      const connectedPorts = collectConnectedInputPorts(nodeId, edges);
      return shouldUpgradeNodeRuntimeContracts(node, connectedPorts);
    });
  } catch {
    return false;
  }
};

export const upgradeRuntimeInputContractsConfig = (raw: string | undefined): string | null => {
  if (!raw) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const nodes = toArray(parsed['nodes']);
  if (nodes.length === 0) return raw;
  const edges = toArray(parsed['edges']);
  let changed = false;

  const nextNodes = nodes.map((node: Record<string, unknown>): Record<string, unknown> => {
    const nodeId = readNodeId(node);
    const nodeType = readNodeType(node);
    if (
      !nodeId ||
      !nodeType ||
      (!WAIT_FOR_INPUT_NODE_TYPES.has(nodeType) && !PROMPT_NODE_TYPES.has(nodeType))
    ) {
      return node;
    }
    const connectedPorts = collectConnectedInputPorts(nodeId, edges);
    if (!shouldUpgradeNodeRuntimeContracts(node, connectedPorts)) {
      return node;
    }
    const upgraded = applyNodeRuntimeContractsUpgrade(node, connectedPorts);
    changed = true;
    return upgraded;
  });

  if (!changed) return raw;
  const nextParsed: Record<string, unknown> = {
    ...parsed,
    nodes: nextNodes,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(nextParsed);
};
