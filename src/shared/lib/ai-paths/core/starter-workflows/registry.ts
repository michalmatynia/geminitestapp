import type { PathConfig } from '@/shared/contracts/ai-paths';
import type { DatabaseOperation } from '@/shared/contracts/ai-paths-core';
import type { CanvasSemanticDocument } from '@/shared/contracts/ai-paths-semantic-grammar';
import type {
  AiTriggerButtonDisplay,
  AiTriggerButtonLocation,
} from '@/shared/contracts/ai-trigger-buttons';

import baseExportBlwoAsset from './assets/base-export-blwo.canvas.json';
import descriptionInferenceLiteAsset from './assets/description-inference-lite.canvas.json';
import gemmaVisionObjectAnalyserApiAsset from './assets/gemma-vision-object-analyser-api.canvas.json';
import gemmaVisionObjectAnalyserModelAsset from './assets/gemma-vision-object-analyser-model.canvas.json';
import parameterInferenceAsset from './assets/parameter-inference.canvas.json';
import translationEnPlAsset from './assets/translation-en-pl.canvas.json';
import { resolvePortablePathInput } from '../../portable-engine/portable-engine-resolvers';
import { deserializeSemanticCanvasToPathConfig } from '../semantic-grammar/deserialize';
import { sanitizeEdges } from '../utils/graph';

export type StarterWorkflowSeedPolicy = {
  autoSeed: boolean;
  defaultPathId?: string;
  isActive?: boolean;
  isLocked?: boolean;
  sortOrder?: number;
};

export type StarterWorkflowTriggerPreset = {
  id: string;
  name: string;
  pathId: string;
  locations: AiTriggerButtonLocation[];
  mode?: 'click' | 'toggle' | 'execute_path' | 'open_chat' | 'open_url' | 'copy_text';
  enabled?: boolean;
  display?: AiTriggerButtonDisplay;
  sortIndex?: number;
};

export type StarterWorkflowLineage = {
  starterKey: string;
  templateVersion: number;
  canonicalGraphHashes: string[];
};

export type AiPathTemplateRegistryEntry = {
  templateId: string;
  name: string;
  description: string;
  semanticAsset: CanvasSemanticDocument;
  seedPolicy?: StarterWorkflowSeedPolicy;
  triggerButtonPresets?: StarterWorkflowTriggerPreset[];
  starterLineage: StarterWorkflowLineage;
};

export type AiPathsStarterProvenance = {
  starterKey: string;
  templateId: string;
  templateVersion: number;
  seededDefault: boolean;
};

export type StarterWorkflowResolution = {
  entry: AiPathTemplateRegistryEntry;
  matchedBy: 'provenance' | 'canonical_hash' | 'legacy_alias';
};

export type StarterWorkflowUpgradeResult = {
  config: PathConfig;
  changed: boolean;
  resolution: StarterWorkflowResolution | null;
};

type DeepValue = Record<string, unknown> | unknown[] | string | number | boolean | null;
type CanonicalNodeShape = {
  id: string;
  type: string;
  inputs: string[];
  outputs: string[];
  config: DeepValue;
};
type CanonicalEdgeShape = {
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
};

const STARTER_PROVENANCE_KEY = 'aiPathsStarter';

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const normalizeTextLower = (value: unknown): string => normalizeText(value).toLowerCase();
const isDatabaseOperation = (value: unknown): value is DatabaseOperation =>
  value === 'query' ||
  value === 'update' ||
  value === 'insert' ||
  value === 'delete' ||
  value === 'action' ||
  value === 'distinct';

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const sortObjectDeep = (value: unknown): DeepValue => {
  if (Array.isArray(value)) {
    return value.map((entry: unknown): DeepValue => sortObjectDeep(entry));
  }
  if (!value || typeof value !== 'object') {
    return (value ?? null) as DeepValue;
  }
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, DeepValue>>((acc, key) => {
      acc[key] = sortObjectDeep(record[key]);
      return acc;
    }, {});
};

const hashString = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const buildCanonicalNodeShape = (node: unknown): CanonicalNodeShape => {
  const record = toRecord(node) ?? {};
  return {
    id: normalizeText(record['id']),
    type: normalizeText(record['type']),
    inputs: Array.isArray(record['inputs']) ? [...(record['inputs'] as string[])] : [],
    outputs: Array.isArray(record['outputs']) ? [...(record['outputs'] as string[])] : [],
    config: sortObjectDeep(toRecord(record['config']) ?? {}),
  };
};

const buildCanonicalEdgeShape = (edge: unknown): CanonicalEdgeShape => {
  const record = toRecord(edge) ?? {};
  return {
    from: normalizeText(record['from']),
    to: normalizeText(record['to']),
    fromPort: normalizeText(record['fromPort']),
    toPort: normalizeText(record['toPort']),
  };
};

export const computeStarterWorkflowGraphHash = (
  config: Pick<PathConfig, 'nodes' | 'edges'>
): string => {
  const nodes = Array.isArray(config.nodes)
    ? config.nodes
      .map((node) => buildCanonicalNodeShape(node))
      .sort((left, right) => String(left.id).localeCompare(String(right.id)))
    : [];
  const edges = Array.isArray(config.edges)
    ? config.edges
      .map((edge) => buildCanonicalEdgeShape(edge))
      .sort((left, right) =>
        [String(left.from), String(left.to), String(left.fromPort), String(left.toPort)]
          .join('|')
          .localeCompare(
            [
              String(right.from),
              String(right.to),
              String(right.fromPort),
              String(right.toPort),
            ].join('|')
          )
      )
    : [];
  return hashString(JSON.stringify(sortObjectDeep({ nodes, edges })));
};

const TRANSLATION_EN_PL_ADDITIONAL_GRAPH_HASHES: string[] = ['97eb2bff'];
const PARAMETER_INFERENCE_ADDITIONAL_GRAPH_HASHES: string[] = ['7f2d8625'];

const buildTriggerDisplay = (label: string): AiTriggerButtonDisplay => ({
  label,
  showLabel: true,
});

const applyStarterProvenance = (
  config: PathConfig,
  provenance: AiPathsStarterProvenance
): PathConfig => {
  const existingExtensions = toRecord(config.extensions) ?? {};
  return {
    ...config,
    extensions: {
      ...existingExtensions,
      [STARTER_PROVENANCE_KEY]: provenance,
    },
  };
};

const readStarterProvenance = (config: PathConfig): AiPathsStarterProvenance | null => {
  const extensions = toRecord(config.extensions);
  const starter = toRecord(extensions?.[STARTER_PROVENANCE_KEY]);
  if (!starter) return null;
  const starterKey = normalizeText(starter['starterKey']);
  const templateId = normalizeText(starter['templateId']);
  const templateVersion =
    typeof starter['templateVersion'] === 'number' && Number.isFinite(starter['templateVersion'])
      ? starter['templateVersion']
      : null;
  if (!starterKey || !templateId || templateVersion === null) return null;
  return {
    starterKey,
    templateId,
    templateVersion,
    seededDefault: starter['seededDefault'] === true,
  };
};

const materializeSemanticAsset = (
  asset: CanvasSemanticDocument,
  args: {
    pathId?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
    isLocked?: boolean;
    updatedAt?: string;
  } = {}
): PathConfig => {
  const config = deserializeSemanticCanvasToPathConfig(asset);
  const repaired = {
    ...config,
    id: args.pathId ?? config.id,
    name: args.name ?? config.name,
    description: args.description ?? config.description,
    isActive: args.isActive ?? config.isActive,
    isLocked: args.isLocked ?? config.isLocked,
    updatedAt: args.updatedAt ?? config.updatedAt,
  };
  return {
    ...repaired,
    edges: sanitizeEdges(repaired.nodes ?? [], repaired.edges ?? []),
  };
};

const hasCanonicalGraphHash = (entry: AiPathTemplateRegistryEntry, graphHash: string): boolean => {
  const normalizedHash = normalizeTextLower(graphHash);
  if (!normalizedHash) return false;
  return entry.starterLineage.canonicalGraphHashes.some(
    (hash) => normalizeTextLower(hash) === normalizedHash
  );
};

const hasAliasMatch = (value: string, aliases: string[]): boolean => {
  const normalizedValue = normalizeTextLower(value);
  if (!normalizedValue) return false;
  return aliases.some((alias) => normalizeTextLower(alias) === normalizedValue);
};

const matchesLegacyTranslationRepairSignature = (config: PathConfig): boolean => {
  const nameOrTriggerMatches =
    hasAliasMatch(config.name ?? '', [
      'Translation EN->PL Description + Parameters',
      'Translation EN->PL Description + Parameters v2',
    ]) ||
    hasAliasMatch(config.trigger ?? '', ['Product Modal - Translate EN->PL (Desc+Params)']);

  if (!nameOrTriggerMatches) return false;

  return (config.nodes ?? []).some((node) => {
    if (node.type !== 'database') return false;
    const database = toRecord(toRecord(node.config)?.['database']);
    const updateTemplate = normalizeText(database?.['updateTemplate']);
    return (
      updateTemplate.includes('"description_pl"') &&
      updateTemplate.includes('"parameters"') &&
      updateTemplate.includes('{{result.parameters}}')
    );
  });
};

const hasParameterInferencePromptStructure = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'prompt') return false;
    const prompt = toRecord(toRecord(node.config)?.['prompt']);
    const template = normalizeText(prompt?.['template']);
    return template.includes('{{title}}') && template.includes('{{content_en}}');
  });

const hasParameterInferenceSeedRouterPromptContract = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'router' || normalizeText(node.id) !== 'node-router-seed-params') {
      return false;
    }
    return node.inputs?.includes('prompt') === true || node.outputs?.includes('prompt') === true;
  });

const hasParameterInferenceBlankProductCoreParser = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'parser') return false;
    const parser = toRecord(toRecord(node.config)?.['parser']);
    const mappings = toRecord(parser?.['mappings']);
    return (
      normalizeText(parser?.['presetId']) === 'product_core' &&
      normalizeText(mappings?.['title']) === '' &&
      normalizeText(mappings?.['content_en']) === ''
    );
  });

const hasParameterInferenceLegacyMappingUpdate = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'database') return false;
    const database = toRecord(toRecord(node.config)?.['database']);
    return (
      normalizeTextLower(database?.['operation']) === 'update' &&
      normalizeTextLower(database?.['updatePayloadMode']) === 'mapping'
    );
  });

const matchesLegacyParameterInferenceRepairSignature = (config: PathConfig): boolean => {
  const nameOrTriggerMatches =
    hasAliasMatch(config.name ?? '', ['Parameter Inference', 'Parameter Inference v2 No Param Add']) ||
    hasAliasMatch(config.trigger ?? '', ['Product Modal - Infer Parameters']);

  if (!nameOrTriggerMatches) return false;

  if (!hasParameterInferencePromptStructure(config)) return false;

  return (
    hasParameterInferenceBlankProductCoreParser(config) ||
    hasParameterInferenceSeedRouterPromptContract(config) ||
    hasParameterInferenceLegacyMappingUpdate(config)
  );
};

const matchesLegacyStarterWorkflowRepairSignature = (
  entry: AiPathTemplateRegistryEntry,
  config: PathConfig
): boolean => {
  switch (entry.starterLineage.starterKey) {
    case 'translation_en_pl':
      return matchesLegacyTranslationRepairSignature(config);
    case 'parameter_inference':
      return matchesLegacyParameterInferenceRepairSignature(config);
    default:
      return false;
  }
};

const rawRegistryEntries: AiPathTemplateRegistryEntry[] = [
  {
    templateId: 'starter_parameter_inference',
    name: 'Parameter Inference',
    description:
      'Infer product parameter values from title, description, and images, then update product parameters.',
    semanticAsset: parameterInferenceAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: 'path_syr8f4',
      isActive: true,
      isLocked: false,
      sortOrder: 20,
    },
    triggerButtonPresets: [
      {
        id: '0ef40981-7ac6-416e-9205-7200289f851c',
        name: 'Infer Parameters',
        pathId: 'path_syr8f4',
        locations: ['product_modal'],
        display: buildTriggerDisplay('Infer Parameters'),
        enabled: true,
        mode: 'click',
        sortIndex: 20,
      },
    ],
    starterLineage: {
      starterKey: 'parameter_inference',
      templateVersion: 16,
      canonicalGraphHashes: PARAMETER_INFERENCE_ADDITIONAL_GRAPH_HASHES,
    },
  },
  {
    templateId: 'starter_description_inference_lite',
    name: 'Description Inference v3 Lite',
    description:
      'Single-model grounded description generation workflow optimized for server execution.',
    semanticAsset: descriptionInferenceLiteAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: false,
      defaultPathId: 'path_descv3lite',
      isActive: true,
      isLocked: false,
      sortOrder: 30,
    },
    triggerButtonPresets: [
      {
        id: '4c07d35b-ea92-4d1f-b86b-c586359f68de',
        name: 'Infer Description Lite',
        pathId: 'path_descv3lite',
        locations: ['product_modal'],
        display: buildTriggerDisplay('Infer Description Lite'),
        enabled: true,
        mode: 'click',
        sortIndex: 30,
      },
    ],
    starterLineage: {
      starterKey: 'description_inference_lite',
      templateVersion: 6,
      canonicalGraphHashes: [],
    },
  },
  {
    templateId: 'starter_base_export_blwo',
    name: 'Base Export Workflow (BLWo)',
    description: 'Product-row workflow export to Base.com launched by BLWo trigger button.',
    semanticAsset: baseExportBlwoAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: 'path_base_export_blwo_v1',
      isActive: true,
      isLocked: false,
      sortOrder: 40,
    },
    triggerButtonPresets: [
      {
        id: '5f36f340-3d89-4f6f-a08f-2387f380b90b',
        name: 'BLWo',
        pathId: 'path_base_export_blwo_v1',
        locations: ['product_row'],
        display: buildTriggerDisplay('BLWo'),
        enabled: true,
        mode: 'click',
        sortIndex: 40,
      },
    ],
    starterLineage: {
      starterKey: 'base_export_blwo',
      templateVersion: 2,
      canonicalGraphHashes: [],
    },
  },
  {
    templateId: 'starter_translation_en_pl',
    name: 'Translation EN->PL Description + Parameters',
    description: 'Translate English description and parameters to Polish and update the product.',
    semanticAsset: translationEnPlAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: false,
      defaultPathId: 'path_96708d',
      isActive: true,
      isLocked: false,
      sortOrder: 50,
    },
    starterLineage: {
      starterKey: 'translation_en_pl',
      templateVersion: 6,
      canonicalGraphHashes: TRANSLATION_EN_PL_ADDITIONAL_GRAPH_HASHES,
    },
  },
  {
    templateId: 'gemma_vision_object_analyser_model',
    name: 'Gemma Vision Object Analyser',
    description:
      'Image Studio → Fetcher → Prompt → vision model → bounds extraction → canvas repositioning.',
    semanticAsset: gemmaVisionObjectAnalyserModelAsset as CanvasSemanticDocument,
    starterLineage: {
      starterKey: 'gemma_vision_object_analyser_model',
      templateVersion: 1,
      canonicalGraphHashes: [],
    },
  },
  {
    templateId: 'gemma_vision_object_analyser_api',
    name: 'Gemma Vision Analyser (Custom API)',
    description:
      'Image Studio → Fetcher → custom vision REST API → bounds extraction → canvas repositioning.',
    semanticAsset: gemmaVisionObjectAnalyserApiAsset as CanvasSemanticDocument,
    starterLineage: {
      starterKey: 'gemma_vision_object_analyser_api',
      templateVersion: 1,
      canonicalGraphHashes: [],
    },
  },
];

export const STARTER_WORKFLOW_REGISTRY: AiPathTemplateRegistryEntry[] = rawRegistryEntries.map(
  (entry: AiPathTemplateRegistryEntry): AiPathTemplateRegistryEntry => {
    const latestConfig = materializeSemanticAsset(entry.semanticAsset, {
      pathId: entry.seedPolicy?.defaultPathId ?? entry.semanticAsset.path.id,
      isActive: entry.seedPolicy?.isActive,
      isLocked: entry.seedPolicy?.isLocked,
    });
    const latestHash = computeStarterWorkflowGraphHash(latestConfig);
    return {
      ...entry,
      starterLineage: {
        ...entry.starterLineage,
        canonicalGraphHashes: Array.from(
          new Set([latestHash, ...entry.starterLineage.canonicalGraphHashes])
        ),
      },
    };
  }
);

export const getStarterWorkflowRegistry = (): AiPathTemplateRegistryEntry[] =>
  STARTER_WORKFLOW_REGISTRY.slice();

export const getStarterWorkflowTemplateById = (
  templateId: string
): AiPathTemplateRegistryEntry | null =>
  STARTER_WORKFLOW_REGISTRY.find((entry) => entry.templateId === templateId) ?? null;

export const getAutoSeedStarterWorkflowEntries = (): AiPathTemplateRegistryEntry[] =>
  STARTER_WORKFLOW_REGISTRY.filter((entry) => entry.seedPolicy?.autoSeed === true).sort(
    (left, right) => (left.seedPolicy?.sortOrder ?? 0) - (right.seedPolicy?.sortOrder ?? 0)
  );

export const materializeStarterWorkflowPathConfig = (
  entry: AiPathTemplateRegistryEntry,
  args: {
    pathId?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
    isLocked?: boolean;
    seededDefault?: boolean;
    updatedAt?: string;
  } = {}
): PathConfig => {
  const materialized = materializeSemanticAsset(entry.semanticAsset, {
    pathId: args.pathId ?? entry.seedPolicy?.defaultPathId ?? entry.semanticAsset.path.id,
    name: args.name ?? entry.name,
    description: args.description ?? entry.description,
    isActive: args.isActive ?? entry.seedPolicy?.isActive,
    isLocked: args.isLocked ?? entry.seedPolicy?.isLocked,
    updatedAt: args.updatedAt,
  });
  return applyStarterProvenance(materialized, {
    starterKey: entry.starterLineage.starterKey,
    templateId: entry.templateId,
    templateVersion: entry.starterLineage.templateVersion,
    seededDefault: args.seededDefault === true,
  });
};

const edgeSignature = (edge: unknown): string => {
  const record = toRecord(edge) ?? {};
  return [
    normalizeText(record['from']),
    normalizeText(record['to']),
    normalizeText(record['fromPort']),
  ].join('|');
};

const renderTemplateToken = (sourcePort: string, sourcePath: string): string => {
  const normalizedPort = normalizeText(sourcePort) || 'value';
  const normalizedPath = normalizeText(sourcePath);
  return normalizedPath ? `{{${normalizedPort}.${normalizedPath}}}` : `{{${normalizedPort}}}`;
};

const deriveCustomUpdateTemplateFromMappings = (value: unknown): string | null => {
  if (!Array.isArray(value)) return null;
  const assignments = value
    .map((entry: unknown) => toRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .reduce<Record<string, string>>((acc, entry) => {
      const targetPath = normalizeText(entry['targetPath']);
      if (!targetPath) return acc;
      acc[targetPath] = renderTemplateToken(
        normalizeText(entry['sourcePort']) || 'value',
        normalizeText(entry['sourcePath'])
      );
      return acc;
    }, {});

  if (Object.keys(assignments).length === 0) return null;
  const lines = Object.entries(assignments).map(
    ([targetPath, token]) =>
      `    "${targetPath}": ${token.startsWith('{{') ? token : JSON.stringify(token)}`
  );
  return `{\n  "$set": {\n${lines.join(',\n')}\n  }\n}`;
};

const buildIncomingPortMap = (config: PathConfig): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  (config.edges ?? []).forEach((edge) => {
    const toNodeId = normalizeText(edge.to);
    if (!toNodeId) return;
    const ports = map.get(toNodeId) ?? new Set<string>();
    const port = normalizeText(edge.toPort);
    if (port) ports.add(port);
    map.set(toNodeId, ports);
  });
  return map;
};

const buildStarterAssetOverlay = (current: PathConfig, latest: PathConfig): PathConfig => {
  const latestNodesById = new Map((latest.nodes ?? []).map((node) => [node.id, node] as const));
  const latestEdgesById = new Map((latest.edges ?? []).map((edge) => [edge.id, edge] as const));
  const latestEdgesBySignature = new Map(
    (latest.edges ?? []).map((edge) => [edgeSignature(edge), edge] as const)
  );
  const currentIncomingPorts = buildIncomingPortMap(current);
  const promotedIncomingPorts = new Map(
    Array.from(currentIncomingPorts.entries()).map(
      ([nodeId, ports]) => [nodeId, new Set(ports)] as const
    )
  );
  (current.edges ?? []).forEach((edge) => {
    const latestEdge =
      latestEdgesById.get(edge.id) ?? latestEdgesBySignature.get(edgeSignature(edge));
    if (!latestEdge) return;
    const toNodeId = normalizeText(latestEdge.to);
    const toPort = normalizeText(latestEdge.toPort);
    if (!toNodeId || !toPort) return;
    const ports = promotedIncomingPorts.get(toNodeId) ?? new Set<string>();
    ports.add(toPort);
    promotedIncomingPorts.set(toNodeId, ports);
  });

  let nodeChanged = false;
  const nextNodes = (current.nodes ?? []).map((node) => {
    const latestNode = latestNodesById.get(node.id);
    if (latestNode?.type !== node.type) return node;
    const currentConfig = toRecord(node.config);
    const latestConfig = toRecord(latestNode.config);
    const currentDatabaseConfig = toRecord(currentConfig?.['database']);
    const latestDatabaseConfig = toRecord(latestConfig?.['database']);
    let nextLatestNode = latestNode;
    if (currentDatabaseConfig && latestDatabaseConfig) {
      const incomingPorts = promotedIncomingPorts.get(node.id) ?? new Set<string>();
      const latestTemplate = normalizeText(latestDatabaseConfig['updateTemplate']);
      const needsResultPort = latestTemplate.includes('{{result.');
      const downgradeResultPort = needsResultPort && !incomingPorts.has('result');
      const latestMappings = Array.isArray(latestDatabaseConfig['mappings'])
        ? (latestDatabaseConfig['mappings'] as Array<Record<string, unknown>>)
        : null;
      const adaptedMappings =
        latestMappings?.reduce<
          Array<{ targetPath: string; sourcePort: string; sourcePath?: string }>
        >((acc, mapping) => {
          const targetPath = normalizeText(mapping['targetPath']);
          const sourcePort = normalizeText(mapping['sourcePort']);
          if (!targetPath || !sourcePort) return acc;
          const nextSourcePort =
            sourcePort === 'result' && downgradeResultPort ? 'value' : sourcePort;
          const sourcePath = normalizeText(mapping['sourcePath']);
          acc.push({
            targetPath,
            sourcePort: nextSourcePort,
            ...(sourcePath ? { sourcePath } : {}),
          });
          return acc;
        }, []) ?? undefined;
      const mappingsChanged =
        latestMappings !== null &&
        JSON.stringify(adaptedMappings) !== JSON.stringify(latestDatabaseConfig['mappings']);
      const baseLatestDatabaseConfig = {
        ...latestDatabaseConfig,
        operation: isDatabaseOperation(latestDatabaseConfig['operation'])
          ? latestDatabaseConfig['operation']
          : 'update',
        ...(downgradeResultPort
          ? {
            updateTemplate: latestTemplate.replaceAll('{{result.', '{{value.'),
          }
          : {}),
        ...(latestMappings !== null ? { mappings: adaptedMappings } : {}),
      };
      const derivedTemplate =
        !incomingPorts.has('result') || needsResultPort === false
          ? ((needsResultPort ? latestTemplate.replaceAll('{{result.', '{{value.') : null) ??
            deriveCustomUpdateTemplateFromMappings(currentDatabaseConfig['mappings']))
          : null;
      if (
        normalizeText(currentDatabaseConfig['updatePayloadMode']).toLowerCase() === 'mapping' &&
        normalizeText(latestDatabaseConfig['updatePayloadMode']).toLowerCase() === 'custom' &&
        derivedTemplate
      ) {
        nextLatestNode = {
          ...latestNode,
          config: {
            ...latestConfig,
            database: {
              ...baseLatestDatabaseConfig,
              updateTemplate: derivedTemplate,
            },
          },
        };
      } else if (downgradeResultPort || mappingsChanged) {
        nextLatestNode = {
          ...latestNode,
          config: {
            ...latestConfig,
            database: baseLatestDatabaseConfig,
          },
        };
      }
    }
    const nextNode = {
      ...nextLatestNode,
      position: node.position ?? nextLatestNode.position,
      createdAt: node.createdAt ?? nextLatestNode.createdAt,
      updatedAt: node.updatedAt ?? nextLatestNode.updatedAt,
      data: node.data ?? nextLatestNode.data,
    };
    if (JSON.stringify(nextNode) !== JSON.stringify(node)) nodeChanged = true;
    return nextNode;
  });

  let edgeChanged = false;
  const nextEdges = (current.edges ?? []).map((edge) => {
    const latestEdge =
      latestEdgesById.get(edge.id) ?? latestEdgesBySignature.get(edgeSignature(edge));
    if (!latestEdge) return edge;
    const nextEdge = {
      ...latestEdge,
      createdAt: edge.createdAt ?? latestEdge.createdAt,
      updatedAt: edge.updatedAt ?? latestEdge.updatedAt,
      data: edge.data ?? latestEdge.data,
    };
    if (JSON.stringify(nextEdge) !== JSON.stringify(edge)) edgeChanged = true;
    return nextEdge;
  });

  const currentExtensions = toRecord(current.extensions);
  const latestExtensions = toRecord(latest.extensions);
  const nextConfig = {
    ...current,
    version: Math.max(current.version ?? 0, latest.version ?? 0),
    name: normalizeText(current.name) || latest.name,
    description: normalizeText(current.description) || latest.description,
    trigger: normalizeText(current.trigger) || latest.trigger,
    executionMode: latest.executionMode ?? current.executionMode,
    flowIntensity: latest.flowIntensity ?? current.flowIntensity,
    runMode: latest.runMode ?? current.runMode,
    strictFlowMode: latest.strictFlowMode ?? current.strictFlowMode,
    blockedRunPolicy: latest.blockedRunPolicy ?? current.blockedRunPolicy,
    aiPathsValidation: latest.aiPathsValidation ?? current.aiPathsValidation,
    isActive: current.isActive ?? latest.isActive,
    isLocked: current.isLocked ?? latest.isLocked,
    updatedAt: current.updatedAt ?? latest.updatedAt,
    nodes: nextNodes,
    edges: nextEdges,
    ...(currentExtensions || latestExtensions
      ? {
        extensions: {
          ...(currentExtensions ?? {}),
          ...(latestExtensions ?? {}),
        },
      }
      : {}),
  } as PathConfig;

  if (!nodeChanged && !edgeChanged && JSON.stringify(nextConfig) === JSON.stringify(current)) {
    return current;
  }
  return nextConfig;
};

const buildStarterGraphReplacement = (current: PathConfig, latest: PathConfig): PathConfig => {
  const currentExtensions = toRecord(current.extensions);
  const latestExtensions = toRecord(latest.extensions);
  return {
    ...latest,
    id: current.id,
    name: normalizeText(current.name) || latest.name,
    description: normalizeText(current.description) || latest.description,
    trigger: normalizeText(current.trigger) || latest.trigger,
    isActive: current.isActive ?? latest.isActive,
    isLocked: current.isLocked ?? latest.isLocked,
    updatedAt: current.updatedAt ?? latest.updatedAt,
    ...(currentExtensions || latestExtensions
      ? {
        extensions: {
          ...(currentExtensions ?? {}),
          ...(latestExtensions ?? {}),
        },
      }
      : {}),
  };
};

const countNodeIdOverlap = (left: PathConfig, right: PathConfig): number => {
  const rightNodeIds = new Set((right.nodes ?? []).map((node) => node.id));
  return (left.nodes ?? []).reduce((count, node) => count + Number(rightNodeIds.has(node.id)), 0);
};

const selectStarterOverlaySource = (current: PathConfig, latest: PathConfig): PathConfig => {
  const variants: PathConfig[] = [latest];
  const resolvedLatest = resolvePortablePathInput(latest, {
    repairIdentities: true,
    includeConnections: false,
    signingPolicyTelemetrySurface: 'api',
    nodeCodeObjectHashVerificationMode: 'warn',
  });
  if (resolvedLatest.ok) {
    variants.push(resolvedLatest.value.pathConfig);
  }

  return variants.reduce<PathConfig>((best, candidate) => {
    const bestScore = countNodeIdOverlap(current, best);
    const candidateScore = countNodeIdOverlap(current, candidate);
    return candidateScore > bestScore ? candidate : best;
  }, variants[0]!);
};

export const resolveStarterWorkflowForPathConfig = (
  config: PathConfig
): StarterWorkflowResolution | null => {
  const provenance = readStarterProvenance(config);
  if (provenance) {
    const entryByTemplate = STARTER_WORKFLOW_REGISTRY.find(
      (entry) => entry.templateId === provenance.templateId
    );
    if (entryByTemplate) {
      return { entry: entryByTemplate, matchedBy: 'provenance' };
    }
    const entryByStarterKey = STARTER_WORKFLOW_REGISTRY.find(
      (entry) => entry.starterLineage.starterKey === provenance.starterKey
    );
    if (entryByStarterKey) {
      return { entry: entryByStarterKey, matchedBy: 'provenance' };
    }
  }
  const graphHash = computeStarterWorkflowGraphHash(config);
  const entryByCanonicalHash = STARTER_WORKFLOW_REGISTRY.find((entry) =>
    hasCanonicalGraphHash(entry, graphHash)
  );
  if (entryByCanonicalHash) {
    return { entry: entryByCanonicalHash, matchedBy: 'canonical_hash' };
  }
  const entryByLegacyAlias = STARTER_WORKFLOW_REGISTRY.find((entry) =>
    matchesLegacyStarterWorkflowRepairSignature(entry, config)
  );
  if (entryByLegacyAlias) {
    return { entry: entryByLegacyAlias, matchedBy: 'legacy_alias' };
  }
  return null;
};

export const upgradeStarterWorkflowPathConfig = (
  config: PathConfig
): StarterWorkflowUpgradeResult => {
  const resolution = resolveStarterWorkflowForPathConfig(config);
  if (!resolution) return { config, changed: false, resolution: null };
  const currentGraphHash = computeStarterWorkflowGraphHash(config);
  const provenance = readStarterProvenance(config);

  const latest = materializeStarterWorkflowPathConfig(resolution.entry, {
    pathId: config.id,
    name: normalizeText(config.name) || resolution.entry.name,
    description: normalizeText(config.description) || resolution.entry.description,
    isActive: config.isActive,
    isLocked: config.isLocked,
    seededDefault:
      config.id === resolution.entry.seedPolicy?.defaultPathId &&
      resolution.entry.seedPolicy?.autoSeed === true,
  });

  const safeToOverlay =
    hasCanonicalGraphHash(resolution.entry, currentGraphHash) ||
    resolution.matchedBy === 'legacy_alias' ||
    Boolean(
      provenance?.starterKey === resolution.entry.starterLineage.starterKey &&
        provenance?.templateVersion < resolution.entry.starterLineage.templateVersion &&
        (config.id === resolution.entry.seedPolicy?.defaultPathId ||
          resolution.entry.starterLineage.starterKey === 'parameter_inference' ||
          resolution.entry.starterLineage.starterKey === 'description_inference_lite' ||
          resolution.entry.starterLineage.starterKey === 'translation_en_pl')
    );

  const overlaySource = selectStarterOverlaySource(config, latest);
  const latestNodeCount = (overlaySource.nodes ?? []).length;
  const shouldReplaceGraphCompletely =
    resolution.entry.starterLineage.starterKey === 'parameter_inference' &&
    hasParameterInferencePromptStructure(config) &&
    countNodeIdOverlap(config, overlaySource) < latestNodeCount;

  // Allow full graph replacement even when safeToOverlay is false (e.g. provenance already
  // bumped to current templateVersion by a prior overlay that touched no nodes). Paths with
  // fewer canonical nodes than the latest template cannot be repaired by overlay alone —
  // missing nodes are never injected by the overlay, so full replacement is always required.
  if (!safeToOverlay && !shouldReplaceGraphCompletely) {
    return { config, changed: false, resolution };
  }

  const next = shouldReplaceGraphCompletely
    ? buildStarterGraphReplacement(config, latest)
    : buildStarterAssetOverlay(config, overlaySource);
  if (next === config || JSON.stringify(next) === JSON.stringify(config)) {
    return { config: next, changed: false, resolution };
  }

  return {
    config: {
      ...next,
      edges: sanitizeEdges(next.nodes ?? [], next.edges ?? []),
    },
    changed: true,
    resolution,
  };
};
