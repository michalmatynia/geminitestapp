import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import type { PathConfig, AiNode } from '@/shared/contracts/ai-paths';
import { 
  PARAMETER_INFERENCE_PATH_ID, 
  PARAMETER_INFERENCE_PATH_NAME, 
  PARAMETER_INFERENCE_TRIGGER_BUTTON_ID 
} from '../settings-store-parameter-inference';
import { getParameterInferenceNodes } from './nodes';
import { PARAMETER_INFERENCE_PATH_EDGES } from './edges';

export const buildParameterInferencePathConfigValue = (timestamp: string): string => {
  const config: PathConfig = {
    id: PARAMETER_INFERENCE_PATH_ID,
    version: 12,
    name: PARAMETER_INFERENCE_PATH_NAME,
    description:
      'Infer product parameter values from name and images, then update product parameters.',
    trigger: 'Product Modal - Infer Parameters',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    strictFlowMode: true,
    nodes: getParameterInferenceNodes(timestamp) as AiNode[],
    edges: PARAMETER_INFERENCE_PATH_EDGES,
    updatedAt: timestamp,
    isLocked: false,
    isActive: true,
    parserSamples: {},
    updaterSamples: {},
  };
  const normalizedNodes = normalizeNodes(config.nodes);
  return JSON.stringify({
    ...config,
    nodes: normalizedNodes,
    edges: sanitizeEdges(normalizedNodes, config.edges),
  });
};

export const needsParameterInferenceConfigUpgrade = (raw: string | undefined): boolean => {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return true;

    const version = typeof parsed['version'] === 'number' ? parsed['version'] : 0;
    const nodes = Array.isArray(parsed['nodes'])
      ? (parsed['nodes'] as Array<Record<string, unknown>>)
      : [];
    const edges = Array.isArray(parsed['edges'])
      ? (parsed['edges'] as Array<Record<string, unknown>>)
      : [];

    if (version >= 12) {
      const hasFetcher = nodes.some((node) => node?.['type'] === 'fetcher');
      if (!hasFetcher) return true;
      if (!nodes.some((node) => node?.['id'] === 'node-vp-template-params')) return true;
      return false;
    }

    if (version >= 11) {
      const hasFetcher = nodes.some((node) => node?.['type'] === 'fetcher');
      if (!hasFetcher) return true;
      if (nodes.some((node) => node?.['id'] === 'node-regex-template-params')) return true;
      if (!nodes.some((node) => node?.['id'] === 'node-vp-template-params')) return true;
      const hasCtxEdge = edges.some(
        (edge) =>
          edge?.['from'] === 'node-fetcher-params' &&
          edge?.['to'] === 'node-update-params' &&
          edge?.['fromPort'] === 'context' &&
          edge?.['toPort'] === 'context'
      );
      if (!hasCtxEdge) return true;
      return false;
    }

    if (nodes.some((node) => node?.['id'] === 'node-sim-params')) return true;

    const triggerNode = nodes.find((node) => node?.['id'] === 'node-trigger-params');
    const triggerEvent =
      triggerNode &&
      typeof triggerNode === 'object' &&
      triggerNode['config'] &&
      typeof triggerNode['config'] === 'object' &&
      (triggerNode['config'] as Record<string, unknown>)['trigger'] &&
      typeof (triggerNode['config'] as Record<string, unknown>)['trigger'] === 'object'
        ? (
            (triggerNode['config'] as Record<string, unknown>)['trigger'] as Record<string, unknown>
        )['event']
        : null;
    if (triggerEvent !== PARAMETER_INFERENCE_TRIGGER_BUTTON_ID) return true;

    const updateNode = nodes.find((node) => node?.['id'] === 'node-update-params');
    const updateDatabase =
      updateNode &&
      typeof updateNode === 'object' &&
      updateNode['config'] &&
      typeof updateNode['config'] === 'object' &&
      (updateNode['config'] as Record<string, unknown>)['database'] &&
      typeof (updateNode['config'] as Record<string, unknown>)['database'] === 'object'
        ? ((updateNode['config'] as Record<string, unknown>)['database'] as Record<string, unknown>)
        : null;
    const guardEnabled =
      updateDatabase &&
      typeof updateDatabase['parameterInferenceGuard'] === 'object' &&
      updateDatabase['parameterInferenceGuard'] !== null
        ? (updateDatabase['parameterInferenceGuard'] as Record<string, unknown>)['enabled'] === true
        : false;
    if (!guardEnabled) return true;
    const guardTargetPath =
      updateDatabase &&
      typeof updateDatabase['parameterInferenceGuard'] === 'object' &&
      updateDatabase['parameterInferenceGuard'] !== null
        ? (updateDatabase['parameterInferenceGuard'] as Record<string, unknown>)['targetPath']
        : null;
    if (guardTargetPath !== 'parameters') return true;
    const updateMappings = Array.isArray(updateDatabase?.['mappings'])
      ? (updateDatabase['mappings'] as Array<Record<string, unknown>>)
      : [];
    const writesSimpleParameters = updateMappings.some((mapping) => {
      if (!mapping || typeof mapping !== 'object') return false;
      return mapping['targetPath'] === 'parameters';
    });
    if (!writesSimpleParameters) return true;
    const updatePayloadMode =
      typeof updateDatabase?.['updatePayloadMode'] === 'string'
        ? updateDatabase['updatePayloadMode']
        : null;
    if (updatePayloadMode !== 'custom') return true;
    const updateQueryConfig =
      updateDatabase &&
      typeof updateDatabase['query'] === 'object' &&
      updateDatabase['query'] !== null
        ? (updateDatabase['query'] as Record<string, unknown>)
        : null;
    const updateQueryCollection =
      updateQueryConfig && typeof updateQueryConfig['collection'] === 'string'
        ? updateQueryConfig['collection'].trim().toLowerCase()
        : '';
    if (updateQueryCollection !== 'products') return true;
    const updateQueryMode =
      updateQueryConfig && typeof updateQueryConfig['mode'] === 'string'
        ? updateQueryConfig['mode']
        : null;
    if (updateQueryMode !== 'custom') return true;
    const updateQueryTemplate =
      updateQueryConfig && typeof updateQueryConfig['queryTemplate'] === 'string'
        ? updateQueryConfig['queryTemplate'].trim()
        : '';
    if (!updateQueryTemplate) return true;
    if (!updateQueryTemplate.includes('"id"') || !updateQueryTemplate.includes('{{entityId}}')) {
      return true;
    }
    const updateTemplate =
      typeof updateDatabase?.['updateTemplate'] === 'string'
        ? updateDatabase['updateTemplate'].trim()
        : '';
    if (!updateTemplate) return true;
    if (
      !updateTemplate.includes('"$set"') ||
      !updateTemplate.includes('"parameters"') ||
      !updateTemplate.includes('{{value}}')
    ) {
      return true;
    }

    const queryNode = nodes.find((node) => node?.['id'] === 'node-query-params');
    const queryType = queryNode?.['type'];
    if (queryType !== 'database') return true;
    const queryDatabase =
      queryNode &&
      typeof queryNode === 'object' &&
      queryNode['config'] &&
      typeof queryNode['config'] === 'object' &&
      (queryNode['config'] as Record<string, unknown>)['database'] &&
      typeof (queryNode['config'] as Record<string, unknown>)['database'] === 'object'
        ? ((queryNode['config'] as Record<string, unknown>)['database'] as Record<string, unknown>)
        : null;
    const queryConfig =
      queryDatabase && typeof queryDatabase['query'] === 'object' && queryDatabase['query'] !== null
        ? (queryDatabase['query'] as Record<string, unknown>)
        : null;
    const queryMode =
      queryConfig && typeof queryConfig['mode'] === 'string' ? queryConfig['mode'] : null;
    if (queryMode !== 'custom') return true;
    const queryCollection =
      queryConfig && typeof queryConfig['collection'] === 'string'
        ? queryConfig['collection'].trim().toLowerCase()
        : null;
    if (queryCollection !== 'product_parameters') return true;
    const queryTemplate =
      queryConfig && typeof queryConfig['queryTemplate'] === 'string'
        ? queryConfig['queryTemplate'].trim()
        : null;
    if (
      !queryTemplate ||
      !queryTemplate.includes('catalogId') ||
      !queryTemplate.includes('{{bundle.catalogId}}')
    ) {
      return true;
    }

    const promptNode = nodes.find((node) => node?.['id'] === 'node-prompt-params');
    const promptTemplate =
      promptNode &&
      typeof promptNode === 'object' &&
      promptNode['config'] &&
      typeof promptNode['config'] === 'object' &&
      (promptNode['config'] as Record<string, unknown>)['prompt'] &&
      typeof (promptNode['config'] as Record<string, unknown>)['prompt'] === 'object'
        ? ((promptNode['config'] as Record<string, unknown>)['prompt'] as Record<string, unknown>)[
          'template'
        ]
        : null;
    if (
      typeof promptTemplate !== 'string' ||
      !promptTemplate.includes('"Black|Red|Blue"') ||
      !promptTemplate.includes('Title Case')
    ) {
      return true;
    }

    const templatePromptNode = nodes.find((node) => node?.['id'] === 'node-prompt-template-params');
    const templatePromptTemplate =
      templatePromptNode &&
      typeof templatePromptNode === 'object' &&
      templatePromptNode['config'] &&
      typeof templatePromptNode['config'] === 'object' &&
      (templatePromptNode['config'] as Record<string, unknown>)['prompt'] &&
      typeof (templatePromptNode['config'] as Record<string, unknown>)['prompt'] === 'object'
        ? (
            (templatePromptNode['config'] as Record<string, unknown>)['prompt'] as Record<
              string,
              unknown
            >
        )['template']
        : null;
    if (
      typeof templatePromptTemplate !== 'string' ||
      !templatePromptTemplate.includes('{"parameterId":"<id>","value":""}') ||
      !templatePromptTemplate.includes('If input has no valid definitions')
    ) {
      return true;
    }

    const templateRegexNode = nodes.find((node) => node?.['id'] === 'node-regex-template-params');
    const templateRegexMode =
      templateRegexNode &&
      typeof templateRegexNode === 'object' &&
      templateRegexNode['config'] &&
      typeof templateRegexNode['config'] === 'object' &&
      (templateRegexNode['config'] as Record<string, unknown>)['regex'] &&
      typeof (templateRegexNode['config'] as Record<string, unknown>)['regex'] === 'object'
        ? (
            (templateRegexNode['config'] as Record<string, unknown>)['regex'] as Record<
              string,
              unknown
            >
        )['mode']
        : null;
    if (templateRegexMode !== 'extract') return true;

    const seedNode = nodes.find((node) => node?.['id'] === 'node-seed-params');
    if (seedNode?.['type'] !== 'database') return true;
    const seedDatabase =
      seedNode &&
      typeof seedNode === 'object' &&
      seedNode['config'] &&
      typeof seedNode['config'] === 'object' &&
      (seedNode['config'] as Record<string, unknown>)['database'] &&
      typeof (seedNode['config'] as Record<string, unknown>)['database'] === 'object'
        ? ((seedNode['config'] as Record<string, unknown>)['database'] as Record<string, unknown>)
        : null;
    const seedQueryConfig =
      seedDatabase && typeof seedDatabase['query'] === 'object' && seedDatabase['query'] !== null
        ? (seedDatabase['query'] as Record<string, unknown>)
        : null;
    const seedQueryCollection =
      seedQueryConfig && typeof seedQueryConfig['collection'] === 'string'
        ? seedQueryConfig['collection'].trim().toLowerCase()
        : '';
    if (seedQueryCollection !== 'products') return true;
    const seedQueryMode =
      seedQueryConfig && typeof seedQueryConfig['mode'] === 'string'
        ? seedQueryConfig['mode']
        : null;
    if (seedQueryMode !== 'custom') return true;
    const seedQueryTemplate =
      seedQueryConfig && typeof seedQueryConfig['queryTemplate'] === 'string'
        ? seedQueryConfig['queryTemplate'].trim()
        : '';
    if (
      !seedQueryTemplate ||
      !seedQueryTemplate.includes('{{entityId}}') ||
      !seedQueryTemplate.includes('"parameters"') ||
      !seedQueryTemplate.includes('"$exists"') ||
      !seedQueryTemplate.includes('"$size"')
    ) {
      return true;
    }
    const seedUpdatePayloadMode =
      typeof seedDatabase?.['updatePayloadMode'] === 'string'
        ? seedDatabase['updatePayloadMode']
        : null;
    if (seedUpdatePayloadMode !== 'custom') return true;
    const seedAction = typeof seedDatabase?.['action'] === 'string' ? seedDatabase['action'] : null;
    if (seedAction !== 'findOneAndUpdate') return true;
    const seedUpdateTemplate =
      typeof seedDatabase?.['updateTemplate'] === 'string'
        ? seedDatabase['updateTemplate'].trim()
        : '';
    if (
      !seedUpdateTemplate.includes('"$set"') ||
      !seedUpdateTemplate.includes('"parameters"') ||
      !seedUpdateTemplate.includes('{{value}}')
    ) {
      return true;
    }

    const hasDefinitionsEdgeToUpdater = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-query-params' &&
        edge['to'] === 'node-update-params' &&
        edge['fromPort'] === 'result' &&
        edge['toPort'] === 'result'
      );
    });
    if (!hasDefinitionsEdgeToUpdater) return true;

    const hasDefinitionsEdgeToPrompt = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-query-params' &&
        edge['to'] === 'node-prompt-params' &&
        edge['fromPort'] === 'result' &&
        edge['toPort'] === 'result'
      );
    });
    if (!hasDefinitionsEdgeToPrompt) return true;

    const hasDefinitionsEdgeToTemplatePrompt = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-query-params' &&
        edge['to'] === 'node-prompt-template-params' &&
        edge['fromPort'] === 'result' &&
        edge['toPort'] === 'result'
      );
    });
    if (!hasDefinitionsEdgeToTemplatePrompt) return true;

    const hasTemplateWriteEdgeToSeed = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-regex-template-params' &&
        edge['to'] === 'node-seed-params' &&
        edge['fromPort'] === 'value' &&
        edge['toPort'] === 'value'
      );
    });
    if (!hasTemplateWriteEdgeToSeed) return true;

    const hasSeedDependencyEdgeToUpdater = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-seed-params' &&
        edge['to'] === 'node-update-params' &&
        edge['fromPort'] === 'bundle' &&
        edge['toPort'] === 'bundle'
      );
    });
    if (!hasSeedDependencyEdgeToUpdater) return true;
    const hasLegacySeedDependencyEdgeToUpdater = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-seed-params' &&
        edge['to'] === 'node-update-params' &&
        edge['fromPort'] === 'result' &&
        edge['toPort'] === 'bundle'
      );
    });
    if (hasLegacySeedDependencyEdgeToUpdater) return true;

    const parserNode = nodes.find((node) => node?.['id'] === 'node-parser-params');
    const parserMappings =
      parserNode &&
      typeof parserNode['config'] === 'object' &&
      parserNode['config'] !== null &&
      typeof (parserNode['config'] as Record<string, unknown>)['parser'] === 'object'
        ? ((parserNode['config'] as Record<string, unknown>)['parser'] as Record<string, unknown>)[
          'mappings'
        ]
        : null;
    const catalogIdMapping =
      parserMappings && typeof parserMappings === 'object' && 'catalogId' in parserMappings
        ? (parserMappings as Record<string, unknown>)['catalogId']
        : undefined;
    if (
      !parserMappings ||
      typeof parserMappings !== 'object' ||
      typeof catalogIdMapping !== 'string' ||
      !catalogIdMapping.trim()
    )
      return true;

    const hasLegacyCatalogIdEdge = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-parser-params' &&
        edge['to'] === 'node-query-params' &&
        edge['fromPort'] === 'catalogId' &&
        edge['toPort'] === 'catalogId'
      );
    });
    if (hasLegacyCatalogIdEdge) return true;

    const hasBundleEdgeToQuery = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-parser-params' &&
        edge['to'] === 'node-query-params' &&
        edge['fromPort'] === 'bundle' &&
        edge['toPort'] === 'bundle'
      );
    });
    return !hasBundleEdgeToQuery;
  } catch {
    return true;
  }
};
