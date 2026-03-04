import { describe, expect, it } from 'vitest';

import {
  PROMPT_EXPLODER_APPLY_PROMPT_STORAGE_KEY,
  PROMPT_EXPLODER_DRAFT_PROMPT_STORAGE_KEY,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_STORAGE_KEY,
  PROMPT_EXPLODER_SETTINGS_STORAGE_KEY,
  migratePromptExploderPersistedSettingValue,
} from '@/features/prompt-exploder/persistence-contract-migration';

describe('prompt exploder persistence contract migration', () => {
  it('normalizes legacy runtime validation stack alias in settings payload', () => {
    const result = migratePromptExploderPersistedSettingValue({
      key: PROMPT_EXPLODER_SETTINGS_STORAGE_KEY,
      value: JSON.stringify({
        version: 1,
        runtime: {
          validationRuleStack: 'prompt_exploder',
        },
      }),
    });

    expect(result.status).toBe('changed');
    expect(result.changed).toBe(true);
    expect(result.nextValue).toBeTruthy();
    expect(JSON.parse(result.nextValue || '{}')).toMatchObject({
      version: 1,
      runtime: {
        validationRuleStack: 'prompt-exploder',
      },
    });
    expect(result.stats.stackAliasesNormalized).toBe(1);
  });

  it('normalizes legacy segmentation-library scope/stack aliases', () => {
    const result = migratePromptExploderPersistedSettingValue({
      key: PROMPT_EXPLODER_SEGMENTATION_LIBRARY_STORAGE_KEY,
      value: JSON.stringify({
        version: 1,
        records: [
          {
            id: 'seg-1',
            validationScope: 'case-resolver-prompt-exploder',
            validationRuleStack: 'case_resolver_prompt_exploder',
            returnTarget: 'studio',
          },
        ],
      }),
    });

    expect(result.status).toBe('changed');
    const next = JSON.parse(result.nextValue || '{}') as {
      records?: Array<Record<string, unknown>>;
    };
    expect(next.records?.[0]).toMatchObject({
      validationScope: 'case_resolver_prompt_exploder',
      validationRuleStack: 'case-resolver-prompt-exploder',
      returnTarget: 'image-studio',
    });
    expect(result.stats.stackAliasesNormalized).toBe(1);
    expect(result.stats.scopeAliasesNormalized).toBe(2);
  });

  it('normalizes legacy bridge aliases and applies default target', () => {
    const result = migratePromptExploderPersistedSettingValue({
      key: PROMPT_EXPLODER_DRAFT_PROMPT_STORAGE_KEY,
      value: JSON.stringify({
        prompt: 'Draft payload',
        source: 'prompt_exploder',
      }),
    });

    expect(result.status).toBe('changed');
    const next = JSON.parse(result.nextValue || '{}') as Record<string, unknown>;
    expect(next['source']).toBe('prompt-exploder');
    expect(next['target']).toBe('prompt-exploder');
    expect(result.stats.bridgeAliasesNormalized).toBe(1);
    expect(result.stats.bridgeDefaultsApplied).toBe(1);
  });

  it('normalizes legacy apply target alias to image-studio', () => {
    const result = migratePromptExploderPersistedSettingValue({
      key: PROMPT_EXPLODER_APPLY_PROMPT_STORAGE_KEY,
      value: JSON.stringify({
        prompt: 'Apply payload',
        source: 'prompt-exploder',
        target: 'studio',
      }),
    });

    expect(result.status).toBe('changed');
    const next = JSON.parse(result.nextValue || '{}') as Record<string, unknown>;
    expect(next['target']).toBe('image-studio');
    expect(result.stats.bridgeAliasesNormalized).toBe(1);
  });

  it('returns invalid_json for malformed values', () => {
    const result = migratePromptExploderPersistedSettingValue({
      key: PROMPT_EXPLODER_SETTINGS_STORAGE_KEY,
      value: '{bad json',
    });
    expect(result.status).toBe('invalid_json');
    expect(result.changed).toBe(false);
    expect(result.nextValue).toBeNull();
  });
});
