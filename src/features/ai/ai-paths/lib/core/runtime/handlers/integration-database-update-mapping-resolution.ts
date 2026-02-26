import type {
  DatabaseConfig,
} from '@/shared/contracts/ai-paths';
import type { UpdaterMapping } from '@/shared/contracts/ai-paths';

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
    const value = resolvedInputs[sourcePort];
    if (value === undefined) {
      unresolvedSourcePorts.add(sourcePort);
      return;
    }
    updates[targetPath] = value;
  });

  return {
    fallbackTarget: parameterTargetPath,
    mappings,
    updates,
    requiredSourcePorts,
    unresolvedSourcePorts,
  };
}
