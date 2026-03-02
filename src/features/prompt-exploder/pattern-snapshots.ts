import type { PromptValidationRule, PromptValidationScope } from '@/shared/contracts/prompt-engine';

import type {
  PromptExploderPatternSnapshot,
  PromptExploderRuntimeValidationScope,
} from '@/shared/contracts/prompt-exploder';

export type { PromptExploderPatternSnapshot };

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
  rules: PromptValidationRule[],
  scope: PromptExploderRuntimeValidationScope = 'prompt_exploder'
): PromptValidationRule[] => {
  const activeRuleScope =
    scope === 'case_resolver_prompt_exploder' ? 'case_resolver_prompt_exploder' : 'prompt_exploder';

  return rules.map((rule) => ({
    ...rule,
    appliesToScopes: [
      ...new Set([...(rule.appliesToScopes ?? []), activeRuleScope as PromptValidationScope]),
    ] as PromptValidationScope[],
  }));
};

export const mergeRestoredPromptExploderRules = (args: {
  existingRules: PromptValidationRule[];
  restoredRules: PromptValidationRule[];
  isPromptExploderManagedRule: (rule: PromptValidationRule) => boolean;
  scope?: PromptExploderRuntimeValidationScope;
}): PromptValidationRule[] => {
  const scope = args.scope ?? 'prompt_exploder';
  const shouldReplaceManagedRule = (rule: PromptValidationRule): boolean => {
    if (!args.isPromptExploderManagedRule(rule)) return false;
    const scopes = rule.appliesToScopes ?? [];
    const activeRuleScope =
      scope === 'case_resolver_prompt_exploder'
        ? 'case_resolver_prompt_exploder'
        : 'prompt_exploder';
    return (
      scopes.length === 0 ||
      scopes.includes(activeRuleScope as PromptValidationScope) ||
      scopes.includes('global')
    );
  };
  const keptRules = args.existingRules.filter((rule) => !shouldReplaceManagedRule(rule));
  const normalizedRestoredRules = ensurePromptExploderScopeOnRules(args.restoredRules, scope);
  return [...keptRules, ...normalizedRestoredRules];
};
