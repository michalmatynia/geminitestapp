import type { DatabaseConfig } from '@/shared/contracts/ai-paths';
import type { UpdaterMapping } from '@/shared/contracts/ai-paths';
import { getValueAtMappingPath } from '../../utils';

export type ResolveDatabaseUpdateMappingsInput = {
  dbConfig: DatabaseConfig;
  nodeInputPorts: string[];
  resolvedInputs: Record<string, unknown>;
  parameterTargetPath: string;
};

export type ResolveDatabaseUpdateMappingsResult = {
  fallbackTarget: string;
  mappings: UpdaterMapping[];
  updates: Record<string, unknown>;
  requiredSourcePorts: Set<string>;
  unresolvedSourcePorts: Set<string>;
};

const SOURCE_PORT_ALIASES: Record<string, string[]> = {
  value: ['result'],
  result: ['value'],
};

const normalizeSourcePath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildSourcePathCandidates = (args: {
  sourcePath: string;
  sourcePort: string;
  candidatePort: string;
}): string[] => {
  const { sourcePath, sourcePort, candidatePort } = args;
  const candidates = new Set<string>([sourcePath]);
  if (sourcePath.startsWith(`${sourcePort}.`)) {
    candidates.add(sourcePath.slice(sourcePort.length + 1));
  }
  if (sourcePath.startsWith(`${candidatePort}.`)) {
    candidates.add(sourcePath.slice(candidatePort.length + 1));
  }
  const firstSegment = sourcePath.split('.')[0]?.trim().toLowerCase() ?? '';
  if (
    firstSegment === 'value' ||
    firstSegment === 'result' ||
    firstSegment === 'current' ||
    firstSegment === 'bundle' ||
    firstSegment === 'context'
  ) {
    const nested = sourcePath.slice(firstSegment.length + 1).trim();
    if (nested.length > 0) {
      candidates.add(nested);
    }
  }
  return Array.from(candidates).filter((candidate) => candidate.length > 0);
};

const resolveValueFromSource = (args: {
  sourceValue: unknown;
  sourcePath: string | null;
  sourcePort: string;
  candidatePort: string;
}): unknown => {
  const { sourceValue, sourcePath, sourcePort, candidatePort } = args;
  if (sourcePath === null) {
    return sourceValue;
  }
  const pathCandidates = buildSourcePathCandidates({
    sourcePath,
    sourcePort,
    candidatePort,
  });
  for (const path of pathCandidates) {
    const value = getValueAtMappingPath(sourceValue, path, {
      jsonIntegrityPolicy: 'repair',
    });
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
};

export function resolveDatabaseUpdateMappings({
  dbConfig,
  resolvedInputs,
  parameterTargetPath,
}: ResolveDatabaseUpdateMappingsInput): ResolveDatabaseUpdateMappingsResult {
  const mappings = dbConfig.mappings ?? [];
  const updates: Record<string, unknown> = {};
  const requiredSourcePorts = new Set<string>();
  const unresolvedSourcePorts = new Set<string>();

  mappings.forEach((mapping) => {
    const sourcePort = mapping.sourcePort;
    const targetPath = mapping.targetPath;
    if (!sourcePort || !targetPath) return;

    requiredSourcePorts.add(sourcePort);
    const sourcePath = normalizeSourcePath(mapping.sourcePath);
    const candidatePorts = [sourcePort, ...(SOURCE_PORT_ALIASES[sourcePort] ?? [])];
    let resolvedValue: unknown = undefined;
    for (const candidatePort of candidatePorts) {
      const sourceValue = resolvedInputs[candidatePort];
      if (sourceValue === undefined) continue;
      const valueAtSource = resolveValueFromSource({
        sourceValue,
        sourcePath,
        sourcePort,
        candidatePort,
      });
      if (valueAtSource !== undefined) {
        resolvedValue = valueAtSource;
        break;
      }
    }
    if (resolvedValue === undefined) {
      unresolvedSourcePorts.add(sourcePort);
      return;
    }
    updates[targetPath] = resolvedValue;
  });

  return {
    fallbackTarget: parameterTargetPath,
    mappings,
    updates,
    requiredSourcePorts,
    unresolvedSourcePorts,
  };
}
