import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { coerceInput, getValueAtMappingPath } from '@/shared/lib/ai-paths/core/utils';

import {
  normalizeJsonIntegrityPolicy,
  normalizeJsonLikeValue,
  type JsonIntegrityDiagnostic,
} from '../json-integrity';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type MapperJsonIntegrityDiagnostic = JsonIntegrityDiagnostic & { port: string };

const normalizeMapperInputValue = (
  port: string,
  value: unknown,
  jsonIntegrityPolicy: ReturnType<typeof normalizeJsonIntegrityPolicy>,
  diagnostics: MapperJsonIntegrityDiagnostic[]
): unknown => {
  const normalized = normalizeJsonLikeValue(value, jsonIntegrityPolicy);
  if (normalized.state === 'repaired' || normalized.state === 'unparseable') {
    diagnostics.push({
      ...normalized.diagnostic,
      port,
    });
  }
  return normalized.value;
};

const buildMapperSources = (
  nodeInputs: NodeHandlerContext['nodeInputs'],
  jsonIntegrityPolicy: ReturnType<typeof normalizeJsonIntegrityPolicy>,
  diagnostics: MapperJsonIntegrityDiagnostic[]
): Record<'context' | 'result' | 'bundle' | 'value', unknown> => ({
  context: normalizeMapperInputValue(
    'context',
    coerceInput(nodeInputs['context']),
    jsonIntegrityPolicy,
    diagnostics
  ),
  result: normalizeMapperInputValue(
    'result',
    coerceInput(nodeInputs['result']),
    jsonIntegrityPolicy,
    diagnostics
  ),
  bundle: normalizeMapperInputValue(
    'bundle',
    coerceInput(nodeInputs['bundle']),
    jsonIntegrityPolicy,
    diagnostics
  ),
  value: normalizeMapperInputValue(
    'value',
    coerceInput(nodeInputs['value']),
    jsonIntegrityPolicy,
    diagnostics
  ),
});

const resolveMapperContextValue = (
  sources: Record<'context' | 'result' | 'bundle' | 'value', unknown>
): unknown => sources['context'] ?? sources['result'] ?? sources['bundle'] ?? sources['value'];

const MAPPER_SOURCE_PATH_PATTERN = /^(context|result|bundle|value)(?:\.|\[|$)/;

const resolveMappedValue = (
  path: string,
  sources: Record<'context' | 'result' | 'bundle' | 'value', unknown>,
  contextValue: unknown,
  jsonIntegrityPolicy: ReturnType<typeof normalizeJsonIntegrityPolicy>
): unknown => {
  if (!path) return undefined;
  if (MAPPER_SOURCE_PATH_PATTERN.test(path)) {
    return getValueAtMappingPath(sources, path, {
      jsonIntegrityPolicy,
    });
  }
  const fromContext = getValueAtMappingPath(contextValue, path, {
    jsonIntegrityPolicy,
  });
  if (fromContext !== undefined) return fromContext;
  return getValueAtMappingPath(sources, path, {
    jsonIntegrityPolicy,
  });
};

const collectConnectedOutputPorts = (nodeId: string, edges: NodeHandlerContext['edges']): Set<string> =>
  new Set<string>(
    edges
      .filter((edge) => edge.from === nodeId && typeof edge.fromPort === 'string')
      .map((edge) => edge.fromPort as string)
  );

export const handleMapper: NodeHandler = ({
  node,
  nodeInputs,
  edges,
  executed,
  runId,
  toast,
  reportAiPathsError,
}: NodeHandlerContext): RuntimePortValues => {
  try {
    const mapperConfig = node.config?.mapper ?? {
      outputs: node.outputs,
      mappings: {},
      jsonIntegrityPolicy: 'repair',
    };
    const jsonIntegrityPolicy = normalizeJsonIntegrityPolicy(mapperConfig.jsonIntegrityPolicy);
    const jsonIntegrityDiagnostics: MapperJsonIntegrityDiagnostic[] = [];
    const sources = buildMapperSources(nodeInputs, jsonIntegrityPolicy, jsonIntegrityDiagnostics);
    const contextValue = resolveMapperContextValue(sources);
    if (contextValue === undefined) return {};

    const mapped: RuntimePortValues = {};
    const unresolvedMappings: string[] = [];
    const connectedOutputPorts = collectConnectedOutputPorts(node.id, edges);

    (mapperConfig.outputs ?? []).forEach((output: string): void => {
      const mapping = mapperConfig.mappings?.[output]?.trim() ?? '';
      const value = mapping
        ? resolveMappedValue(mapping, sources, contextValue, jsonIntegrityPolicy)
        : output === 'value'
          ? contextValue
          : resolveMappedValue(output, sources, contextValue, jsonIntegrityPolicy);
      if (value !== undefined) {
        mapped[output] = value;
        return;
      }
      if (!mapping) return;
      if (connectedOutputPorts.size > 0 && connectedOutputPorts.has(output)) {
        unresolvedMappings.push(`${output} <- ${mapping}`);
      }
    });

    if (unresolvedMappings.length > 0) {
      const key = `${runId}:${node.id}:${unresolvedMappings.join('|')}`;
      if (!executed.mapper.has(key)) {
        executed.mapper.add(key);
        const preview = unresolvedMappings.slice(0, 2).join(', ');
        const suffix =
          unresolvedMappings.length > 2 ? ` and ${unresolvedMappings.length - 2} more` : '';
        toast(
          `JSON Mapper "${node.title ?? node.id}" could not resolve mapping(s): ${preview}${suffix}.`,
          { variant: 'info' }
        );
      }
    }
    if (jsonIntegrityDiagnostics.length > 0) {
      mapped['jsonIntegrity'] = jsonIntegrityDiagnostics;
      if (
        jsonIntegrityPolicy === 'strict' &&
        jsonIntegrityDiagnostics.some((diagnostic) => diagnostic.parseState === 'unparseable')
      ) {
        const unresolvedPorts = jsonIntegrityDiagnostics
          .filter((diagnostic) => diagnostic.parseState === 'unparseable')
          .map((diagnostic) => diagnostic.port);
        const uniquePorts = Array.from(new Set(unresolvedPorts));
        toast(
          `JSON Mapper "${node.title ?? node.id}" received unparseable JSON on ${uniquePorts.join(', ')} (strict mode).`,
          { variant: 'info' }
        );
      }
    }
    return mapped;
  } catch (error) {
    logClientError(error);
    reportAiPathsError(
      error,
      {
        service: 'ai-paths-runtime',
        nodeId: node.id,
        nodeType: node.type,
      },
      `Node ${node.id} failed`
    );
    return {};
  }
};
