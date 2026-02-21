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
  dbConfig: _dbConfig,
  nodeInputPorts: _nodeInputPorts,
  resolvedInputs: _resolvedInputs,
  parameterTargetPath: _parameterTargetPath,
}: ResolveDatabaseUpdateMappingsInput): ResolveDatabaseUpdateMappingsResult {
  throw new Error(
    'Mapping-based database updates are disabled. Use an explicit update template instead.'
  );
}
