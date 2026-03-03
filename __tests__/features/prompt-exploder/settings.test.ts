import { describe, expect, it } from 'vitest';

import {
  defaultPromptExploderSettings,
  parsePromptExploderSettingsResult,
  parsePromptExploderSettings,
} from '@/features/prompt-exploder/settings';

describe('prompt exploder settings schema', () => {
  it('returns defaults for empty input', () => {
    const parsed = parsePromptExploderSettings(null);
    expect(parsed).toEqual(defaultPromptExploderSettings);
  });

  it('throws on non-empty invalid payloads', () => {
    expect(() => parsePromptExploderSettings('{bad-json')).toThrow();
    expect(() =>
      parsePromptExploderSettings(
        JSON.stringify({
          version: 1,
          ai: { operationMode: 'rules_only' },
        })
      )
    ).toThrow();
  });

  it('rejects partial non-empty payloads instead of filling missing sections', () => {
    const partialRaw = JSON.stringify({
      version: 1,
      learning: {
        enabled: true,
        similarityThreshold: 0.7,
        templates: [
          {
            id: 'legacy_template',
            segmentType: 'sequence',
            title: 'Legacy',
            normalizedTitle: 'legacy',
            anchorTokens: ['legacy'],
            sampleText: 'legacy sample',
            approvals: 1,
            createdAt: '2026-02-13T00:00:00.000Z',
            updatedAt: '2026-02-13T00:00:00.000Z',
          },
        ],
      },
    });

    const parsed = parsePromptExploderSettingsResult(partialRaw);
    expect(parsed.settings).toEqual(defaultPromptExploderSettings);
    expect(parsed.error?.code).toBe('invalid_shape');
  });

  it('rejects deprecated persisted AI snapshot keys', () => {
    const result = parsePromptExploderSettingsResult(
      JSON.stringify({
        version: 1,
        runtime: defaultPromptExploderSettings.runtime,
        learning: defaultPromptExploderSettings.learning,
        ai: {
          operationMode: 'hybrid',
          modelId: 'legacy-model',
          fallbackModelId: 'legacy-fallback',
          temperature: 0.7,
        },
      })
    );

    expect(result.settings).toEqual(defaultPromptExploderSettings);
    expect(result.error?.code).toBe('deprecated_ai_keys');
    expect(result.error?.deprecatedKeys).toEqual(['modelId', 'fallbackModelId', 'temperature']);
  });
});
