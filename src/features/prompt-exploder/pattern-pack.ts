import type {
  PromptEngineSettings,
  PromptValidationRule,
  PromptValidationScope,
} from '@/shared/contracts/prompt-engine';
import type {
  PromptExploderPatternPackResult,
  PromptExploderRuntimeValidationScope,
} from '@/shared/contracts/prompt-exploder';
import { defaultPromptEngineSettings } from '@/shared/lib/prompt-engine/settings';

import {
  PROMPT_EXPLODER_PATTERN_PACK,
  includesScope,
  remapExploderScopesForTarget,
} from './pattern-pack-rules';


export { PROMPT_EXPLODER_PATTERN_PACK };

export const PROMPT_EXPLODER_PATTERN_PACK_IDS = new Set(
  PROMPT_EXPLODER_PATTERN_PACK.map((rule) => rule.id)
);

const isCaseResolverExploderScope = (scope: string | null | undefined): boolean =>
  scope === 'case_resolver_prompt_exploder';

export function ensurePromptExploderPatternPack(
  settings: PromptEngineSettings,
  options?: {
    scope?: PromptExploderRuntimeValidationScope;
  }
): PromptExploderPatternPackResult {
  const baseSettings = settings?.promptValidation ? settings : defaultPromptEngineSettings;
  const targetScope = options?.scope ?? 'prompt_exploder';

  const nextRules = [...baseSettings.promptValidation.rules];
  const addedRuleIds: string[] = [];
  const updatedRuleIds: string[] = [];

  const activeRuleScope = isCaseResolverExploderScope(targetScope)
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';

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

    const existingScopes = (existing.appliesToScopes || []) as string[];
    const missingPromptExploderScope = !existingScopes.includes(activeRuleScope);
    const existingLaunchScopes = (existing.launchAppliesToScopes || []) as string[];
    const missingPromptExploderLaunchScope = !existingLaunchScopes.includes(activeRuleScope);
    const merged: PromptValidationRule = {
      ...existing,
      appliesToScopes: (missingPromptExploderScope
        ? [...new Set([...existingScopes, activeRuleScope])]
        : existing.appliesToScopes) as PromptValidationScope[],
      launchAppliesToScopes: (missingPromptExploderLaunchScope
        ? [...new Set([...existingLaunchScopes, activeRuleScope])]
        : existing.launchAppliesToScopes) as PromptValidationScope[],
      promptExploderSegmentType:
        existing.promptExploderSegmentType ?? packRule.promptExploderSegmentType ?? null,
      promptExploderPriority:
        existing.promptExploderPriority && existing.promptExploderPriority !== 0
          ? existing.promptExploderPriority
          : (packRule.promptExploderPriority ?? 0),
      promptExploderConfidenceBoost:
        existing.promptExploderConfidenceBoost && existing.promptExploderConfidenceBoost !== 0
          ? existing.promptExploderConfidenceBoost
          : (packRule.promptExploderConfidenceBoost ?? 0),
      promptExploderTreatAsHeading:
        existing.promptExploderTreatAsHeading ?? packRule.promptExploderTreatAsHeading ?? false,
      promptExploderCaptureTarget:
        existing.promptExploderCaptureTarget?.trim() ||
        packRule.promptExploderCaptureTarget?.trim() ||
        null,
      promptExploderCaptureGroup:
        typeof existing.promptExploderCaptureGroup === 'number' &&
        Number.isFinite(existing.promptExploderCaptureGroup)
          ? Math.max(0, Math.floor(existing.promptExploderCaptureGroup))
          : typeof packRule.promptExploderCaptureGroup === 'number' &&
              Number.isFinite(packRule.promptExploderCaptureGroup)
            ? Math.max(0, Math.floor(packRule.promptExploderCaptureGroup))
            : null,
      promptExploderCaptureApplyTo:
        existing.promptExploderCaptureApplyTo === 'line'
          ? 'line'
          : (packRule.promptExploderCaptureApplyTo ?? 'segment'),
      promptExploderCaptureNormalize:
        existing.promptExploderCaptureNormalize ??
        packRule.promptExploderCaptureNormalize ??
        'trim',
      promptExploderCaptureOverwrite:
        existing.promptExploderCaptureOverwrite ?? packRule.promptExploderCaptureOverwrite ?? false,
    };

    const changed =
      missingPromptExploderScope ||
      missingPromptExploderLaunchScope ||
      merged.promptExploderSegmentType !== existing.promptExploderSegmentType ||
      merged.promptExploderPriority !== existing.promptExploderPriority ||
      merged.promptExploderConfidenceBoost !== existing.promptExploderConfidenceBoost ||
      merged.promptExploderTreatAsHeading !== existing.promptExploderTreatAsHeading ||
      merged.promptExploderCaptureTarget !== existing.promptExploderCaptureTarget ||
      merged.promptExploderCaptureGroup !== existing.promptExploderCaptureGroup ||
      merged.promptExploderCaptureApplyTo !== existing.promptExploderCaptureApplyTo ||
      merged.promptExploderCaptureNormalize !== existing.promptExploderCaptureNormalize ||
      merged.promptExploderCaptureOverwrite !== existing.promptExploderCaptureOverwrite;

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
  scope: PromptExploderRuntimeValidationScope = 'prompt_exploder',
  options?: { includePatternPack?: boolean }
): PromptValidationRule[] {
  const includePatternPack = options?.includePatternPack ?? true;
  const mergedRules = [
    ...settings.promptValidation.rules,
    ...(settings.promptValidation.learnedRules ?? []),
  ];
  const activeRuleScope = isCaseResolverExploderScope(scope)
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';

  const scopedRules = mergedRules.filter((rule) => {
    const scopes = (rule.appliesToScopes || []) as string[];
    return scopes.length === 0 || scopes.includes(activeRuleScope) || scopes.includes('global');
  });
  const nextRules = [...scopedRules];

  if (includePatternPack) {
    const existingRuleIds = new Set(nextRules.map((rule) => rule.id));

    PROMPT_EXPLODER_PATTERN_PACK.filter((rule) =>
      includesScope(rule.appliesToScopes, scope)
    ).forEach((rule) => {
      if (existingRuleIds.has(rule.id)) return;
      nextRules.push({
        ...rule,
        appliesToScopes: remapExploderScopesForTarget(rule.appliesToScopes, scope),
        launchAppliesToScopes: remapExploderScopesForTarget(rule.launchAppliesToScopes, scope),
      });
      existingRuleIds.add(rule.id);
    });
  }

  return nextRules;
}
