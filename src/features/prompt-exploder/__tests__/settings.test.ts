import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadSettings = async (): Promise<typeof import('../settings')> => import('../settings');

beforeEach(() => {
  vi.unmock('@/shared/contracts/prompt-exploder');
  vi.resetModules();
});

describe('parsePromptExploderSettingsResult', () => {
  it('returns defaults when payload is empty', async () => {
    const { defaultPromptExploderSettings, parsePromptExploderSettingsResult } =
      await loadSettings();
    const parsed = parsePromptExploderSettingsResult(null);

    expect(parsed.error).toBeNull();
    expect(parsed.settings).toEqual(defaultPromptExploderSettings);
  });

  it('accepts canonical settings payloads', async () => {
    const { defaultPromptExploderSettings, parsePromptExploderSettingsResult } =
      await loadSettings();
    const parsed = parsePromptExploderSettingsResult(JSON.stringify(defaultPromptExploderSettings));

    expect(parsed.error).toBeNull();
    expect(parsed.settings.ai.operationMode).toBe(defaultPromptExploderSettings.ai.operationMode);
  });

  it('rejects non-canonical AI payload keys in non-empty payloads', async () => {
    const { defaultPromptExploderSettings, parsePromptExploderSettingsResult } =
      await loadSettings();
    const payload = {
      ...defaultPromptExploderSettings,
      ai: {
        ...defaultPromptExploderSettings.ai,
        provider: 'openai',
      },
    };

    const parsed = parsePromptExploderSettingsResult(JSON.stringify(payload));

    expect(parsed.error?.code).toBe('invalid_shape');
    expect(parsed.error?.message).toContain('unsupported keys: provider');
    expect(parsed.settings).toEqual(defaultPromptExploderSettings);
  });

  it('rejects partial non-empty payloads instead of merging defaults', async () => {
    const { defaultPromptExploderSettings, parsePromptExploderSettingsResult } =
      await loadSettings();
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

  it('rejects deprecated operationMode values in non-empty payloads', async () => {
    const { defaultPromptExploderSettings, parsePromptExploderSettingsResult } =
      await loadSettings();
    const payload = {
      ...defaultPromptExploderSettings,
      ai: {
        operationMode: 'manual',
      },
    };

    const parsed = parsePromptExploderSettingsResult(JSON.stringify(payload));

    expect(parsed.error?.code).toBe('invalid_shape');
    expect(parsed.settings).toEqual(defaultPromptExploderSettings);
  });

  it('rejects non-canonical object validationRuleStack payloads', async () => {
    const { defaultPromptExploderSettings, parsePromptExploderSettingsResult } =
      await loadSettings();
    const payload = {
      ...defaultPromptExploderSettings,
      runtime: {
        ...defaultPromptExploderSettings.runtime,
        validationRuleStack: {
          id: 'prompt-exploder',
        },
      },
    };

    const parsed = parsePromptExploderSettingsResult(JSON.stringify(payload));

    expect(parsed.error?.code).toBe('invalid_shape');
    expect(parsed.settings).toEqual(defaultPromptExploderSettings);
  });
});

describe('parsePromptExploderSettings', () => {
  it('returns defaults for empty payloads', async () => {
    const { defaultPromptExploderSettings, parsePromptExploderSettings } = await loadSettings();
    expect(parsePromptExploderSettings(null)).toEqual(defaultPromptExploderSettings);
    expect(parsePromptExploderSettings('')).toEqual(defaultPromptExploderSettings);
  });

  it('throws for invalid non-empty payloads', async () => {
    const { parsePromptExploderSettings } = await loadSettings();
    expect(() => parsePromptExploderSettings('{"broken"')).toThrowError(/not valid json/i);
  });

  it('throws for non-canonical AI payload keys in non-empty payloads', async () => {
    const { defaultPromptExploderSettings, parsePromptExploderSettings } = await loadSettings();
    expect(() =>
      parsePromptExploderSettings(
        JSON.stringify({
          ...defaultPromptExploderSettings,
          ai: {
            ...defaultPromptExploderSettings.ai,
            provider: 'openai',
          },
        })
      )
    ).toThrowError(/invalid shape/i);
  });
});
