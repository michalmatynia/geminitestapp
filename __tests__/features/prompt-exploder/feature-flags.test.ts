import { afterEach, describe, expect, it } from 'vitest';

import {
  isPromptExploderOrchestratorEnabled,
  isPromptValidationStrictStackMode,
  resolvePromptExploderOrchestratorRollout,
} from '@/features/prompt-exploder/feature-flags';

const FLAG_NAME = 'NEXT_PUBLIC_PROMPT_VALIDATION_ORCHESTRATOR_V2';
const CANARY_FLAG_NAME = 'NEXT_PUBLIC_PROMPT_VALIDATION_ORCHESTRATOR_CANARY_PERCENT';
const STRICT_FLAG_NAME = 'NEXT_PUBLIC_PROMPT_VALIDATION_STRICT_STACK_MODE';
const ORIGINAL_ENV = process.env[FLAG_NAME];
const ORIGINAL_CANARY_ENV = process.env[CANARY_FLAG_NAME];
const ORIGINAL_STRICT_ENV = process.env[STRICT_FLAG_NAME];

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env[FLAG_NAME];
  } else {
    process.env[FLAG_NAME] = ORIGINAL_ENV;
  }
  if (ORIGINAL_CANARY_ENV === undefined) {
    delete process.env[CANARY_FLAG_NAME];
  } else {
    process.env[CANARY_FLAG_NAME] = ORIGINAL_CANARY_ENV;
  }
  if (ORIGINAL_STRICT_ENV === undefined) {
    delete process.env[STRICT_FLAG_NAME];
  } else {
    process.env[STRICT_FLAG_NAME] = ORIGINAL_STRICT_ENV;
  }
});

describe('prompt exploder feature flags', () => {
  it('uses settings value when env override is missing', () => {
    delete process.env[FLAG_NAME];
    expect(isPromptExploderOrchestratorEnabled(true)).toBe(true);
    expect(isPromptExploderOrchestratorEnabled(false)).toBe(false);
  });

  it('accepts env true override', () => {
    process.env[FLAG_NAME] = 'true';
    expect(isPromptExploderOrchestratorEnabled(false)).toBe(true);
  });

  it('accepts env false override', () => {
    process.env[FLAG_NAME] = '0';
    expect(isPromptExploderOrchestratorEnabled(true)).toBe(false);
  });

  it('supports deterministic canary rollout cohorts', () => {
    delete process.env[FLAG_NAME];
    process.env[CANARY_FLAG_NAME] = '20';
    const cohortA = resolvePromptExploderOrchestratorRollout({
      settingsEnabled: true,
      cohortSeed: 'seed-a',
    });
    const cohortB = resolvePromptExploderOrchestratorRollout({
      settingsEnabled: true,
      cohortSeed: 'seed-a',
    });
    expect(cohortA.reason).toBe('canary');
    expect(cohortA.bucket).toBe(cohortB.bucket);
    expect(cohortA.enabled).toBe(cohortB.enabled);
  });

  it('honors strict stack mode env override', () => {
    process.env[STRICT_FLAG_NAME] = 'false';
    expect(isPromptValidationStrictStackMode()).toBe(false);
    process.env[STRICT_FLAG_NAME] = 'true';
    expect(isPromptValidationStrictStackMode()).toBe(true);
  });
});
