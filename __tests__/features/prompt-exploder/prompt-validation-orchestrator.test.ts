import { describe, expect, it } from 'vitest';

import { parseValidatorPatternLists } from '@/features/admin/pages/validator-scope';
import { PromptValidationRuleCompileError } from '@/features/prompt-core/errors';
import type {
  PromptValidationRule,
  PromptEngineSettings,
} from '@/features/prompt-engine/settings';
import {
  explodePromptText,
  getPromptExploderRuntimePatternCacheSnapshot,
  resetPromptExploderRuntimePatternCache,
} from '@/features/prompt-exploder/parser';
import {
  getPromptValidationRuntimeSelectionCacheSnapshot,
  resetPromptValidationRuntimeSelectionCache,
  resolvePromptValidationRuntime,
} from '@/features/prompt-exploder/prompt-validation-orchestrator';
import {
  defaultPromptExploderSettings,
} from '@/features/prompt-exploder/settings';

const buildRegexRule = (overrides: Partial<PromptValidationRule> = {}): PromptValidationRule => ({
  kind: 'regex',
  id: 'rule.prompt.scope',
  enabled: true,
  severity: 'warning',
  title: 'Prompt scope rule',
  description: null,
  pattern: '^ALLOW$',
  flags: 'm',
  message: 'Prompt must equal ALLOW',
  similar: [],
  appliesToScopes: ['prompt_exploder'],
  ...overrides,
});

const buildPromptSettings = (rule: PromptValidationRule): PromptEngineSettings => ({
  version: 1,
  promptValidation: {
    enabled: true,
    rules: [rule],
    learnedRules: [],
  },
});

describe('prompt validation orchestrator runtime', () => {
  it('reuses selection cache for identical runtime resolution inputs', () => {
    resetPromptValidationRuntimeSelectionCache();
    const lists = parseValidatorPatternLists(null);
    const promptSettings = buildPromptSettings(buildRegexRule({ pattern: '^ALLOW$' }));

    const first = resolvePromptValidationRuntime({
      promptSettings,
      promptExploderSettings: defaultPromptExploderSettings,
      validatorPatternLists: lists,
      runtimeRuleProfile: 'all',
      runtimeValidationRuleStack: 'prompt-exploder',
      learningEnabled: true,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
      strictUnknownStack: true,
    });
    const second = resolvePromptValidationRuntime({
      promptSettings,
      promptExploderSettings: defaultPromptExploderSettings,
      validatorPatternLists: lists,
      runtimeRuleProfile: 'all',
      runtimeValidationRuleStack: 'prompt-exploder',
      learningEnabled: true,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
      strictUnknownStack: true,
    });

    const snapshot = getPromptValidationRuntimeSelectionCacheSnapshot();
    expect(snapshot.size).toBe(1);
    expect(first.identity.cacheKey).toBe(second.identity.cacheKey);
    expect(first.correlationId).not.toBe(second.correlationId);
  });

  it('changes cache key when list or settings version changes', () => {
    resetPromptValidationRuntimeSelectionCache();
    const lists = parseValidatorPatternLists(null);
    const promptSettingsA = buildPromptSettings(buildRegexRule({ pattern: '^ALLOW$' }));
    const promptSettingsB = buildPromptSettings(buildRegexRule({ pattern: '^DENY$' }));

    const runtimeA = resolvePromptValidationRuntime({
      promptSettings: promptSettingsA,
      promptExploderSettings: defaultPromptExploderSettings,
      validatorPatternLists: lists,
      runtimeRuleProfile: 'all',
      runtimeValidationRuleStack: 'prompt-exploder',
      learningEnabled: true,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
      strictUnknownStack: true,
    });

    const updatedLists = lists.map((list, index) =>
      index === 0
        ? { ...list, updatedAt: '2026-02-16T12:00:00.000Z' }
        : list
    );
    const runtimeB = resolvePromptValidationRuntime({
      promptSettings: promptSettingsA,
      promptExploderSettings: defaultPromptExploderSettings,
      validatorPatternLists: updatedLists,
      runtimeRuleProfile: 'all',
      runtimeValidationRuleStack: 'prompt-exploder',
      learningEnabled: true,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
      strictUnknownStack: true,
    });
    const runtimeC = resolvePromptValidationRuntime({
      promptSettings: promptSettingsB,
      promptExploderSettings: defaultPromptExploderSettings,
      validatorPatternLists: lists,
      runtimeRuleProfile: 'all',
      runtimeValidationRuleStack: 'prompt-exploder',
      learningEnabled: true,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
      strictUnknownStack: true,
    });

    expect(runtimeB.identity.listVersion).not.toBe(runtimeA.identity.listVersion);
    expect(runtimeB.identity.cacheKey).not.toBe(runtimeA.identity.cacheKey);
    expect(runtimeC.identity.settingsVersion).not.toBe(runtimeA.identity.settingsVersion);
    expect(runtimeC.identity.cacheKey).not.toBe(runtimeA.identity.cacheKey);
  });

  it('uses explicit runtime cache key entries in parser cache', () => {
    resetPromptExploderRuntimePatternCache();

    const rule = buildRegexRule({
      id: 'segment.heading.markdown',
      pattern: '^##\\s+SECTION\\b',
      appliesToScopes: ['prompt_exploder'],
    });

    explodePromptText({
      prompt: '## SECTION\nBody',
      validationScope: 'prompt_exploder',
      validationRules: [rule],
      runtimeCacheKey: 'cache:key:a',
      correlationId: 'test-a',
    });
    explodePromptText({
      prompt: '## SECTION\nBody',
      validationScope: 'prompt_exploder',
      validationRules: [rule],
      runtimeCacheKey: 'cache:key:a',
      correlationId: 'test-a-2',
    });
    explodePromptText({
      prompt: '## SECTION\nBody',
      validationScope: 'prompt_exploder',
      validationRules: [rule],
      runtimeCacheKey: 'cache:key:b',
      correlationId: 'test-b',
    });

    const snapshot = getPromptExploderRuntimePatternCacheSnapshot();
    expect(snapshot.keyed).toBe(2);
    expect(snapshot.keyedKeys).toEqual(['cache:key:a', 'cache:key:b']);
  });

  it('throws rule compile error for strict case-resolver runtime when all regex rules are invalid', () => {
    const invalidRule = buildRegexRule({
      id: 'case.invalid.regex',
      pattern: '(?<bad',
      flags: 'imu',
      appliesToScopes: ['case_resolver_prompt_exploder'],
    });

    expect(() =>
      explodePromptText({
        prompt: 'Example',
        validationScope: 'case_resolver_prompt_exploder',
        validationRules: [invalidRule],
        runtimeCacheKey: 'compile:error:case',
      })
    ).toThrow(PromptValidationRuleCompileError);
  });

  it('invalidates parser runtime cache when settings/list runtime version changes', () => {
    resetPromptExploderRuntimePatternCache();
    resetPromptValidationRuntimeSelectionCache();
    const lists = parseValidatorPatternLists(null);
    const promptSettingsA = buildPromptSettings(buildRegexRule({ pattern: '^ALLOW$' }));
    const runtimeA = resolvePromptValidationRuntime({
      promptSettings: promptSettingsA,
      promptExploderSettings: defaultPromptExploderSettings,
      validatorPatternLists: lists,
      runtimeRuleProfile: 'all',
      runtimeValidationRuleStack: 'prompt-exploder',
      learningEnabled: true,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
      strictUnknownStack: true,
    });
    explodePromptText({
      prompt: 'ALLOW',
      validationScope: runtimeA.identity.scope,
      validationRules: runtimeA.runtimeValidationRules,
      runtimeCacheKey: runtimeA.identity.cacheKey,
    });
    const before = getPromptExploderRuntimePatternCacheSnapshot();
    expect(before.keyedKeys).toContain(runtimeA.identity.cacheKey);

    const updatedLists = lists.map((list, index) =>
      index === 0
        ? { ...list, updatedAt: '2026-02-16T22:00:00.000Z' }
        : list
    );
    resolvePromptValidationRuntime({
      promptSettings: promptSettingsA,
      promptExploderSettings: defaultPromptExploderSettings,
      validatorPatternLists: updatedLists,
      runtimeRuleProfile: 'all',
      runtimeValidationRuleStack: 'prompt-exploder',
      learningEnabled: true,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
      strictUnknownStack: true,
    });

    const after = getPromptExploderRuntimePatternCacheSnapshot();
    expect(after.keyedKeys).not.toContain(runtimeA.identity.cacheKey);
  });
});
