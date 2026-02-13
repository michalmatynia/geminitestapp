import { describe, expect, it } from 'vitest';

import {
  defaultPromptExploderSettings,
  parsePromptExploderSettings,
} from '@/features/prompt-exploder/settings';

describe('prompt exploder settings schema', () => {
  it('returns defaults for empty input', () => {
    const parsed = parsePromptExploderSettings(null);
    expect(parsed).toEqual(defaultPromptExploderSettings);
  });

  it('backfills new governance fields from legacy settings', () => {
    const legacyRaw = JSON.stringify({
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

    const parsed = parsePromptExploderSettings(legacyRaw);
    expect(parsed.runtime.ruleProfile).toBe('all');
    expect(parsed.runtime.benchmarkSuite).toBe('default');
    expect(parsed.runtime.benchmarkLowConfidenceThreshold).toBe(0.55);
    expect(parsed.runtime.benchmarkSuggestionLimit).toBe(4);
    expect(parsed.runtime.customBenchmarkCases).toEqual([]);
    expect(parsed.learning.minApprovalsForMatching).toBe(1);
    expect(parsed.learning.maxTemplates).toBe(1000);
    expect(parsed.learning.autoActivateLearnedTemplates).toBe(true);
    expect(parsed.learning.templates[0]?.state).toBe('active');
    expect(parsed.patternSnapshots).toEqual([]);
  });
});
