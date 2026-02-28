import { type AiNode } from '@/shared/contracts/ai-paths';
import { PARSER_PRESETS, REGEX_INPUT_PORTS, REGEX_OUTPUT_PORTS } from '../../constants';
import { createParserMappings, ensureUniquePorts, normalizePortName } from '../../utils';

export const normalizeMapperNode = (node: AiNode): AiNode => {
  const mapperConfig = node.config?.mapper;
  const outputs =
    mapperConfig?.outputs && mapperConfig.outputs.length > 0
      ? mapperConfig.outputs
      : node.outputs.length > 0
        ? node.outputs
        : ['value', 'result'];
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], ['context', 'result', 'bundle', 'value']),
    outputs,
    config: {
      ...node.config,
      mapper: {
        outputs,
        mappings: mapperConfig?.mappings ?? createParserMappings(outputs),
        jsonIntegrityPolicy: mapperConfig?.jsonIntegrityPolicy ?? 'repair',
      },
    },
  };
};

export const normalizeParserNode = (node: AiNode): AiNode => {
  const parserConfig = node.config?.parser;
  const normalizedNodeOutputs = (node.outputs ?? [])
    .map((port: string): string => normalizePortName(port))
    .map((port: string): string => port.trim())
    .filter(Boolean);
  const baseMappings =
    parserConfig?.mappings ??
    (normalizedNodeOutputs.length > 0 ? createParserMappings(normalizedNodeOutputs) : {});
  const canonicalMappings = Object.entries(baseMappings).reduce<Record<string, string>>(
    (acc: Record<string, string>, [rawKey, rawPath]: [string, string]): Record<string, string> => {
      const key = normalizePortName(rawKey).trim();
      if (!key) return acc;
      const path = typeof rawPath === 'string' ? rawPath : '';
      if (!(key in acc) || (!acc[key] && path)) {
        acc[key] = path;
      }
      return acc;
    },
    {}
  );
  const mappingKeys = Object.keys(canonicalMappings)
    .map((key: string): string => key.trim())
    .filter(Boolean);
  const outputsFromMappings = mappingKeys.length > 0 ? mappingKeys : normalizedNodeOutputs;
  const outputMode = parserConfig?.outputMode ?? 'individual';
  const hasImagesOutput = outputsFromMappings.some(
    (key: string): boolean => key.toLowerCase() === 'images' || key.toLowerCase() === 'imageurls'
  );
  const outputs =
    outputMode === 'bundle'
      ? ['bundle', ...(hasImagesOutput ? ['images'] : [])]
      : outputsFromMappings;
  return {
    ...node,
    outputs,
    config: {
      ...node.config,
      parser: {
        mappings: canonicalMappings,
        outputMode,
        presetId: parserConfig?.presetId ?? PARSER_PRESETS[0]?.id ?? 'custom',
      },
    },
  };
};

export const normalizeRegexNode = (node: AiNode): AiNode => {
  const config = node.config?.regex;
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], REGEX_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], REGEX_OUTPUT_PORTS),
    config: {
      ...node.config,
      regex: {
        pattern: config?.pattern ?? '',
        flags: config?.flags ?? 'g',
        mode: config?.mode ?? 'group',
        matchMode: config?.matchMode ?? 'first',
        groupBy: config?.groupBy ?? 'match',
        outputMode: config?.outputMode ?? 'object',
        includeUnmatched: config?.includeUnmatched ?? true,
        unmatchedKey: config?.unmatchedKey ?? '__unmatched__',
        splitLines: config?.splitLines ?? true,
        sampleText: config?.sampleText ?? '',
        aiPrompt: config?.aiPrompt ?? '',
        aiAutoRun: config?.aiAutoRun ?? false,
        activeVariant: config?.activeVariant ?? 'manual',
        jsonIntegrityPolicy: config?.jsonIntegrityPolicy ?? 'repair',
        ...(config?.manual ? { manual: config.manual } : {}),
        ...(config?.aiProposal ? { aiProposal: config.aiProposal } : {}),
        ...(config?.aiProposals ? { aiProposals: config.aiProposals } : {}),
      },
    },
  };
};
