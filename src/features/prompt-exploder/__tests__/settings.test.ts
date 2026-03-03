import { describe, expect, it } from 'vitest';

import {
  defaultPromptExploderSettings,
  parsePromptExploderSettingsResult,
} from '../settings';

describe('parsePromptExploderSettingsResult', () => {
  it('returns defaults when payload is empty', () => {
    const parsed = parsePromptExploderSettingsResult(null);

    expect(parsed.error).toBeNull();
    expect(parsed.settings).toEqual(defaultPromptExploderSettings);
  });

  it('accepts canonical settings payloads', () => {
    const parsed = parsePromptExploderSettingsResult(
      JSON.stringify(defaultPromptExploderSettings)
    );

    expect(parsed.error).toBeNull();
    expect(parsed.settings.ai.operationMode).toBe(
      defaultPromptExploderSettings.ai.operationMode
    );
  });

  it('rejects deprecated AI snapshot keys in non-empty payloads', () => {
    const payload = {
      ...defaultPromptExploderSettings,
      ai: {
        ...defaultPromptExploderSettings.ai,
        provider: 'openai',
      },
    };

    const parsed = parsePromptExploderSettingsResult(JSON.stringify(payload));

    expect(parsed.error?.code).toBe('deprecated_ai_keys');
    expect(parsed.error?.deprecatedKeys).toEqual(['provider']);
    expect(parsed.settings).toEqual(defaultPromptExploderSettings);
  });

  it('rejects partial non-empty payloads instead of merging defaults', () => {
    const partialPayload = {
      version: 1,
      runtime: {
        ruleProfile: 'all',
      },
      learning: {
        enabled: true,
      },
      ai: {
        operationMode: 'rules_only',
      },
    };

    const parsed = parsePromptExploderSettingsResult(JSON.stringify(partialPayload));

    expect(parsed.error?.code).toBe('invalid_shape');
    expect(parsed.settings).toEqual(defaultPromptExploderSettings);
  });
});
