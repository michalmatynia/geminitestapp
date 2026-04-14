import type { PathConfig } from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';

type BuildRuntimePersistenceConfigInput = {
  activePathId: string | null;
  updatedAt: string;
  pathConfigs: Record<string, PathConfig>;
  runtimeState: RuntimeState;
  lastRunAt: string | null;
};

export const buildRuntimePersistenceConfig = (
  input: BuildRuntimePersistenceConfigInput
): PathConfig | null => {
  if (!input.activePathId) return null;
  const baseConfig = input.pathConfigs[input.activePathId];
  if (!baseConfig) return null;
  return {
    ...baseConfig,
    id: input.activePathId,
    updatedAt: input.updatedAt,
    runtimeState: input.runtimeState,
    lastRunAt: input.lastRunAt,
  };
};
