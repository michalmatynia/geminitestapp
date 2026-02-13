import type { PromptValidationRule, PromptValidationScope } from '@/features/prompt-engine/settings';

import type { PromptExploderPatternSnapshot } from './types';

export const buildPatternSnapshot = (args: {
  rules: PromptValidationRule[];
  snapshotDraftName: string;
  now: string;
  snapshotId?: string;
}): PromptExploderPatternSnapshot => {
  const snapshotName =
    args.snapshotDraftName.trim() || `Prompt Exploder Snapshot ${args.now.slice(0, 19)}`;
  return {
    id: args.snapshotId ?? `snapshot_${Date.now().toString(36)}`,
    name: snapshotName,
    createdAt: args.now,
    ruleCount: args.rules.length,
    rulesJson: JSON.stringify(args.rules, null, 2),
  };
};

export const prependPatternSnapshot = (
  snapshots: PromptExploderPatternSnapshot[],
  snapshot: PromptExploderPatternSnapshot,
  maxSnapshots = 40
): PromptExploderPatternSnapshot[] => {
  return [snapshot, ...snapshots].slice(0, maxSnapshots);
};

export const removePatternSnapshotById = (
  snapshots: PromptExploderPatternSnapshot[],
  snapshotId: string
): PromptExploderPatternSnapshot[] => {
  return snapshots.filter((snapshot) => snapshot.id !== snapshotId);
};

export const ensurePromptExploderScopeOnRules = (
  rules: PromptValidationRule[]
): PromptValidationRule[] => {
  return rules.map((rule) => ({
    ...rule,
    appliesToScopes: [
      ...new Set([...(rule.appliesToScopes ?? []), 'prompt_exploder']),
    ] as PromptValidationScope[],
  }));
};

export const mergeRestoredPromptExploderRules = (args: {
  existingRules: PromptValidationRule[];
  restoredRules: PromptValidationRule[];
  isPromptExploderManagedRule: (rule: PromptValidationRule) => boolean;
}): PromptValidationRule[] => {
  const keptRules = args.existingRules.filter(
    (rule) => !args.isPromptExploderManagedRule(rule)
  );
  const normalizedRestoredRules = ensurePromptExploderScopeOnRules(args.restoredRules);
  return [...keptRules, ...normalizedRestoredRules];
};
