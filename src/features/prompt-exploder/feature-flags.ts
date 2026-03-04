import type { PromptExploderOrchestratorRollout } from '@/shared/contracts/prompt-exploder';

export const resolvePromptExploderOrchestratorRollout = (args: {
  settingsEnabled: boolean;
  cohortSeed?: string | null | undefined;
}): PromptExploderOrchestratorRollout => {
  void args.cohortSeed;
  return {
    enabled: args.settingsEnabled,
    reason: 'settings',
    bucket: 0,
    canaryPercent: args.settingsEnabled ? 100 : 0,
  };
};

export const isPromptExploderOrchestratorEnabled = (
  settingsEnabled: boolean,
  cohortSeed?: string | null
): boolean => {
  void cohortSeed;
  return settingsEnabled;
};
