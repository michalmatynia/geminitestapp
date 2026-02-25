import type { NodeHandler, NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import { coerceInput, getValueAtMappingPath } from '../../../utils';
import {
  normalizeJsonIntegrityPolicy,
  normalizeJsonLikeValue,
  type JsonIntegrityDiagnostic,
} from '../json-integrity';

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
    const jsonIntegrityPolicy = normalizeJsonIntegrityPolicy(
      mapperConfig.jsonIntegrityPolicy
    );
    const jsonIntegrityDiagnostics: Array<
      JsonIntegrityDiagnostic & { port: string }
    > = [];
    const normalizeMapperInputValue = (
      port: string,
      value: unknown,
    ): unknown => {
      const normalized = normalizeJsonLikeValue(value, jsonIntegrityPolicy);
      if (
        normalized.state === 'repaired' ||
        normalized.state === 'unparseable'
      ) {
        jsonIntegrityDiagnostics.push({
          ...normalized.diagnostic,
          port,
        });
      }
      return normalized.value;
    };

    const sources = {
      context: normalizeMapperInputValue('context', coerceInput(nodeInputs['context'])),
      result: normalizeMapperInputValue('result', coerceInput(nodeInputs['result'])),
      bundle: normalizeMapperInputValue('bundle', coerceInput(nodeInputs['bundle'])),
      value: normalizeMapperInputValue('value', coerceInput(nodeInputs['value'])),
    };
    const contextValue =
      sources['context'] ??
      sources['result'] ??
      sources['bundle'] ??
      sources['value'];
    if (contextValue === undefined) return {};

    const sourcePathPattern = /^(context|result|bundle|value)(?:\.|\[|$)/;
    const resolveMappedValue = (path: string): unknown => {
      if (!path) return undefined;
      if (sourcePathPattern.test(path)) {
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

    const mapped: RuntimePortValues = {};
    const unresolvedMappings: string[] = [];
    const connectedOutputPorts = new Set<string>(
      edges
        .filter((edge) => edge.from === node.id && typeof edge.fromPort === 'string')
        .map((edge) => edge.fromPort as string)
    );

    mapperConfig.outputs.forEach((output: string): void => {
      const mapping = mapperConfig.mappings?.[output]?.trim() ?? '';
      const value = mapping
        ? resolveMappedValue(mapping)
        : output === 'value'
          ? contextValue
          : resolveMappedValue(output);
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
          unresolvedMappings.length > 2
            ? ` and ${unresolvedMappings.length - 2} more`
            : '';
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
        jsonIntegrityDiagnostics.some(
          (diagnostic) => diagnostic.parseState === 'unparseable'
        )
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
    reportAiPathsError(error, {
      service: 'ai-paths-runtime',
      nodeId: node.id,
      nodeType: node.type,
    }, `Node ${node.id} failed`);
    return {};
  }
};
