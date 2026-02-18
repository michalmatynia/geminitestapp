import {
  defaultPromptEngineSettings,
  type PromptEngineSettings,
  type PromptValidationRule,
  type PromptValidationScope,
} from '@/features/prompt-engine/settings';

import {
  PROMPT_EXPLODER_PATTERN_PACK,
  includesScope,
  remapExploderScopesForTarget,
} from './pattern-pack-rules';

import type { PromptExploderRuntimeValidationScope } from './validation-stack';

export { PROMPT_EXPLODER_PATTERN_PACK };

export type PromptExploderPatternPackResult = {
  nextSettings: PromptEngineSettings;
  addedRuleIds: string[];
  updatedRuleIds: string[];
};

export const PROMPT_EXPLODER_PATTERN_PACK_IDS = new Set(
  PROMPT_EXPLODER_PATTERN_PACK.map((rule) => rule.id)
);

export function ensurePromptExploderPatternPack(
  settings: PromptEngineSettings,
  options?: {
    scope?: PromptExploderRuntimeValidationScope;
  }
): PromptExploderPatternPackResult {
  const baseSettings = settings?.promptValidation
    ? settings
    : defaultPromptEngineSettings;
  const targetScope = options?.scope ?? 'prompt_exploder';

  const nextRules = [...baseSettings.promptValidation.rules];
  const addedRuleIds: string[] = [];
  const updatedRuleIds: string[] = [];

  PROMPT_EXPLODER_PATTERN_PACK.forEach((packRule) => {
    const packScopes = remapExploderScopesForTarget(packRule.appliesToScopes, targetScope);
    const packLaunchScopes = remapExploderScopesForTarget(
      packRule.launchAppliesToScopes,
      targetScope
    );
    const existingIndex = nextRules.findIndex((rule) => {
      if (rule.id !== packRule.id) return false;
      return includesScope(rule.appliesToScopes, targetScope);
    });
    const existing = existingIndex >= 0 ? nextRules[existingIndex] : null;
    if (!existing) {
      nextRules.push({
        ...packRule,
        appliesToScopes: packScopes,
        launchAppliesToScopes: packLaunchScopes,
      });
      addedRuleIds.push(packRule.id);
      return;
    }

    const existingScopes = existing.appliesToScopes ?? [];
    const missingPromptExploderScope = !existingScopes.includes(targetScope);
    const existingLaunchScopes = existing.launchAppliesToScopes ?? [];
    const missingPromptExploderLaunchScope =
      !existingLaunchScopes.includes(targetScope);
    const merged: PromptValidationRule = {
      ...existing,
      appliesToScopes: (missingPromptExploderScope
        ? [...new Set([...existingScopes, targetScope])]
        : existing.appliesToScopes) as PromptValidationScope[],
      launchAppliesToScopes: (missingPromptExploderLaunchScope
        ? [...new Set([...existingLaunchScopes, targetScope])]
        : existing.launchAppliesToScopes) as PromptValidationScope[],
      promptExploderSegmentType:
        existing.promptExploderSegmentType ??
        packRule.promptExploderSegmentType ??
        null,
      promptExploderPriority:
        existing.promptExploderPriority && existing.promptExploderPriority !== 0
          ? existing.promptExploderPriority
          : (packRule.promptExploderPriority ?? 0),
      promptExploderConfidenceBoost:
        existing.promptExploderConfidenceBoost &&
          existing.promptExploderConfidenceBoost !== 0
          ? existing.promptExploderConfidenceBoost
          : (packRule.promptExploderConfidenceBoost ?? 0),
      promptExploderTreatAsHeading:
        existing.promptExploderTreatAsHeading ??
        (packRule.promptExploderTreatAsHeading ?? false),
      promptExploderCaptureTarget:
        existing.promptExploderCaptureTarget?.trim() ||
        packRule.promptExploderCaptureTarget?.trim() ||
        null,
      promptExploderCaptureGroup:
        typeof existing.promptExploderCaptureGroup === 'number' &&
        Number.isFinite(existing.promptExploderCaptureGroup)
          ? Math.max(0, Math.floor(existing.promptExploderCaptureGroup))
          : (typeof packRule.promptExploderCaptureGroup === 'number' &&
              Number.isFinite(packRule.promptExploderCaptureGroup)
            ? Math.max(0, Math.floor(packRule.promptExploderCaptureGroup))
            : null),
      promptExploderCaptureApplyTo:
        existing.promptExploderCaptureApplyTo === 'line'
          ? 'line'
          : (packRule.promptExploderCaptureApplyTo ?? 'segment'),
      promptExploderCaptureNormalize:
        existing.promptExploderCaptureNormalize ??
        packRule.promptExploderCaptureNormalize ??
        'trim',
      promptExploderCaptureOverwrite:
        existing.promptExploderCaptureOverwrite ??
        packRule.promptExploderCaptureOverwrite ??
        false,
    };

    const changed =
      missingPromptExploderScope ||
      missingPromptExploderLaunchScope ||
      merged.promptExploderSegmentType !== existing.promptExploderSegmentType ||
      merged.promptExploderPriority !== existing.promptExploderPriority ||
      merged.promptExploderConfidenceBoost !==
      existing.promptExploderConfidenceBoost ||
      merged.promptExploderTreatAsHeading !==
      existing.promptExploderTreatAsHeading ||
      merged.promptExploderCaptureTarget !==
      existing.promptExploderCaptureTarget ||
      merged.promptExploderCaptureGroup !==
      existing.promptExploderCaptureGroup ||
      merged.promptExploderCaptureApplyTo !==
      existing.promptExploderCaptureApplyTo ||
      merged.promptExploderCaptureNormalize !==
      existing.promptExploderCaptureNormalize ||
      merged.promptExploderCaptureOverwrite !==
      existing.promptExploderCaptureOverwrite;

    if (changed) {
      nextRules[existingIndex] = merged;
      updatedRuleIds.push(existing.id);
    }
  });

  return {
    nextSettings: {
      ...baseSettings,
      promptValidation: {
        ...baseSettings.promptValidation,
        rules: nextRules,
      },
    },
    addedRuleIds,
    updatedRuleIds,
  };
}

export function getPromptExploderScopedRules(
  settings: PromptEngineSettings,
  scope: PromptExploderRuntimeValidationScope = 'prompt_exploder'
): PromptValidationRule[] {
  const mergedRules = [
    ...settings.promptValidation.rules,
    ...(settings.promptValidation.learnedRules ?? []),
  ];
  const scopedRules = mergedRules.filter((rule) => {
    const scopes = rule.appliesToScopes ?? [];
    return scopes.length === 0 || scopes.includes(scope) || scopes.includes('global');
  });
  const nextRules = [...scopedRules];
  const existingRuleIds = new Set(nextRules.map((rule) => rule.id));

  PROMPT_EXPLODER_PATTERN_PACK
    .filter((rule) => includesScope(rule.appliesToScopes, scope))
    .forEach((rule) => {
      if (existingRuleIds.has(rule.id)) return;
      nextRules.push({
        ...rule,
        appliesToScopes: remapExploderScopesForTarget(rule.appliesToScopes, scope),
        launchAppliesToScopes: remapExploderScopesForTarget(
          rule.launchAppliesToScopes,
          scope
        ),
      });
      existingRuleIds.add(rule.id);
    });

  return nextRules;
}
