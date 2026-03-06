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

const normalizeSourcePath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildSourcePathCandidates = (args: { sourcePath: string; sourcePort: string }): string[] => {
  const { sourcePath, sourcePort } = args;
  const candidates = new Set<string>([sourcePath]);
  if (sourcePath.startsWith(`${sourcePort}.`)) {
    candidates.add(sourcePath.slice(sourcePort.length + 1));
  }
  return Array.from(candidates).filter((candidate) => candidate.length > 0);
};

const resolveValueFromSource = (args: {
  sourceValue: unknown;
  sourcePath: string | null;
  sourcePort: string;
}): unknown => {
  const { sourceValue, sourcePath, sourcePort } = args;
  if (sourcePath === null) {
    return sourceValue;
  }
  const pathCandidates = buildSourcePathCandidates({
    sourcePath,
    sourcePort,
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
  nodeInputPorts,
  resolvedInputs,
  parameterTargetPath,
}: ResolveDatabaseUpdateMappingsInput): ResolveDatabaseUpdateMappingsResult {
  const mappings = dbConfig.mappings ?? [];
  const updates: Record<string, unknown> = {};
  const requiredSourcePorts = new Set<string>();
  const unresolvedSourcePorts = new Set<string>();
  const inputPorts = new Set(nodeInputPorts.map((port) => port.trim()).filter(Boolean));

  mappings.forEach((mapping) => {
    const sourcePort = mapping.sourcePort;
    const targetPath = mapping.targetPath;
    if (!sourcePort || !targetPath) return;

    requiredSourcePorts.add(sourcePort);
    if (!inputPorts.has(sourcePort)) {
      unresolvedSourcePorts.add(sourcePort);
      return;
    }
    const sourcePath = normalizeSourcePath(mapping.sourcePath);
    const sourceValue = resolvedInputs[sourcePort];
    if (sourceValue === undefined) {
      unresolvedSourcePorts.add(sourcePort);
      return;
    }
    const resolvedValue = resolveValueFromSource({
      sourceValue,
      sourcePath,
      sourcePort,
    });
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
