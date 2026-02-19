export const TRANSLATION_EN_PL_PATH_ID = 'path_96708d';
export const TRANSLATION_EN_PL_PATH_NAME =
  'Translation EN->PL Description + Parameters';
const UPDATE_NODE_ID = 'node-db-update-translate-en-pl';
const PARSER_NODE_ID = 'node-parser-translate-en-pl';
const REGEX_DESCRIPTION_NODE_ID = 'node-regex-translate-en-pl';
const REGEX_PARAMETERS_NODE_ID = 'node-regex-params-translate-en-pl';

const CANONICAL_UPDATE_TEMPLATE =
  '{\n' +
  '  "$set": {\n' +
  '    "description_pl": "{{value.description_pl}}",\n' +
  '    "parameters": {{result.parameters}}\n' +
  '  }\n' +
  '}';

const CANONICAL_MAPPINGS: Array<Record<string, unknown>> = [
  {
    sourcePort: 'value',
    targetPath: '__translation_description_payload__',
  },
  {
    sourcePort: 'result',
    targetPath: '__translation_parameters_payload__',
  },
];

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value)
    ? value.filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
    )
    : [];

const isTranslationEnPlPathConfig = (parsed: Record<string, unknown>): boolean => {
  const id = typeof parsed['id'] === 'string' ? parsed['id'].trim() : '';
  if (id === TRANSLATION_EN_PL_PATH_ID) return true;
  const name =
    typeof parsed['name'] === 'string' ? parsed['name'].trim().toLowerCase() : '';
  return name === TRANSLATION_EN_PL_PATH_NAME.toLowerCase();
};

const hasEdge = (
  edges: Array<Record<string, unknown>>,
  edge: {
    from: string;
    to: string;
    fromPort: string;
    toPort: string;
  },
): boolean =>
  edges.some((candidate: Record<string, unknown>) => {
    return (
      candidate['from'] === edge.from &&
      candidate['to'] === edge.to &&
      candidate['fromPort'] === edge.fromPort &&
      candidate['toPort'] === edge.toPort
    );
  });

const buildEdgeId = (
  edges: Array<Record<string, unknown>>,
  preferredPrefix: string,
): string => {
  const existingIds = new Set(
    edges
      .map((edge: Record<string, unknown>) =>
        typeof edge['id'] === 'string' ? edge['id'] : null,
      )
      .filter((id: string | null): id is string => Boolean(id)),
  );
  let counter = 1;
  let nextId = `${preferredPrefix}-${counter}`;
  while (existingIds.has(nextId)) {
    counter += 1;
    nextId = `${preferredPrefix}-${counter}`;
  }
  return nextId;
};

const ensureEdge = (
  edges: Array<Record<string, unknown>>,
  edge: {
    from: string;
    to: string;
    fromPort: string;
    toPort: string;
  },
): Array<Record<string, unknown>> => {
  if (hasEdge(edges, edge)) return edges;
  return [
    ...edges,
    {
      id: buildEdgeId(edges, 'edge-tr-pl'),
      from: edge.from,
      to: edge.to,
      fromPort: edge.fromPort,
      toPort: edge.toPort,
    },
  ];
};

export const needsTranslationEnPlConfigUpgrade = (
  raw: string | undefined,
): boolean => {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return false;
    if (!isTranslationEnPlPathConfig(parsed)) return false;

    const nodes = toArray(parsed['nodes']);
    const edges = toArray(parsed['edges']);
    const updateNode = nodes.find(
      (node: Record<string, unknown>) => node['id'] === UPDATE_NODE_ID,
    );
    if (!updateNode) return false;
    const updateConfig = toRecord(updateNode['config']);
    const databaseConfig = toRecord(updateConfig?.['database']);
    if (!databaseConfig) return true;

    const updateTemplate =
      typeof databaseConfig['updateTemplate'] === 'string'
        ? databaseConfig['updateTemplate']
        : '';
    if (!updateTemplate.includes('{{value.description_pl}}')) return true;
    if (!updateTemplate.includes('{{result.parameters}}')) return true;

    const mappings = Array.isArray(databaseConfig['mappings'])
      ? (databaseConfig['mappings'] as Array<Record<string, unknown>>)
      : [];
    const hasDescriptionMapping = mappings.some((mapping: Record<string, unknown>) => {
      return (
        mapping['sourcePort'] === 'value' &&
        mapping['targetPath'] === '__translation_description_payload__'
      );
    });
    const hasParametersMapping = mappings.some((mapping: Record<string, unknown>) => {
      return (
        mapping['sourcePort'] === 'result' &&
        mapping['targetPath'] === '__translation_parameters_payload__'
      );
    });
    if (!hasDescriptionMapping || !hasParametersMapping) return true;

    const valueEdgesToUpdater = edges.filter((edge: Record<string, unknown>) => {
      return edge['to'] === UPDATE_NODE_ID && edge['toPort'] === 'value';
    });
    if (valueEdgesToUpdater.length !== 1) return true;
    if (valueEdgesToUpdater[0]?.['from'] !== REGEX_DESCRIPTION_NODE_ID) return true;

    if (
      !hasEdge(edges, {
        from: REGEX_PARAMETERS_NODE_ID,
        to: UPDATE_NODE_ID,
        fromPort: 'value',
        toPort: 'result',
      })
    ) {
      return true;
    }
    if (
      !hasEdge(edges, {
        from: PARSER_NODE_ID,
        to: UPDATE_NODE_ID,
        fromPort: 'bundle',
        toPort: 'bundle',
      })
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const upgradeTranslationEnPlConfig = (
  raw: string | undefined,
): string | null => {
  if (!raw) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (!isTranslationEnPlPathConfig(parsed)) return raw;

  const nodes = toArray(parsed['nodes']);
  let edges = toArray(parsed['edges']);
  const updateNodeIndex = nodes.findIndex(
    (node: Record<string, unknown>) => node['id'] === UPDATE_NODE_ID,
  );
  if (updateNodeIndex < 0) return raw;

  const updateNode = nodes[updateNodeIndex] as Record<string, unknown>;
  const updateConfig = toRecord(updateNode['config']) ?? {};
  const databaseConfig = toRecord(updateConfig['database']) ?? {};

  const nextDatabaseConfig: Record<string, unknown> = {
    ...databaseConfig,
    updatePayloadMode: 'custom',
    updateTemplate: CANONICAL_UPDATE_TEMPLATE,
    mappings: CANONICAL_MAPPINGS,
  };
  const nextNodes = [...nodes];
  nextNodes[updateNodeIndex] = {
    ...updateNode,
    config: {
      ...updateConfig,
      database: nextDatabaseConfig,
    },
  };

  edges = edges.map((edge: Record<string, unknown>) => {
    if (
      edge['from'] === REGEX_PARAMETERS_NODE_ID &&
      edge['to'] === UPDATE_NODE_ID &&
      edge['fromPort'] === 'value' &&
      edge['toPort'] === 'value'
    ) {
      return {
        ...edge,
        toPort: 'result',
      };
    }
    return edge;
  });

  edges = ensureEdge(edges, {
    from: PARSER_NODE_ID,
    to: UPDATE_NODE_ID,
    fromPort: 'bundle',
    toPort: 'bundle',
  });
  edges = ensureEdge(edges, {
    from: REGEX_DESCRIPTION_NODE_ID,
    to: UPDATE_NODE_ID,
    fromPort: 'value',
    toPort: 'value',
  });
  edges = ensureEdge(edges, {
    from: REGEX_PARAMETERS_NODE_ID,
    to: UPDATE_NODE_ID,
    fromPort: 'value',
    toPort: 'result',
  });

  const nextParsed: Record<string, unknown> = {
    ...parsed,
    nodes: nextNodes,
    edges,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(nextParsed);
};
