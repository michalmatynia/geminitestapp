import type { PromptExploderBenchmarkCase } from '@/features/prompt-exploder/benchmark';
import {
  defaultCustomBenchmarkCaseIdFromPrompt,
  mergeCustomBenchmarkCases,
  parseCustomBenchmarkCasesDraft,
  toCustomCaseSlug,
  upsertCustomBenchmarkCase,
} from '@/features/prompt-exploder/custom-benchmark-cases';

const buildCase = (
  id: string,
  overrides: Partial<PromptExploderBenchmarkCase> = {}
): PromptExploderBenchmarkCase => ({
  id,
  prompt: `Prompt ${id}`,
  expectedTypes: ['sequence'],
  minSegments: 1,
  ...overrides,
});

describe('prompt exploder custom benchmark cases', () => {
  it('parses valid custom benchmark JSON and clamps minSegments', () => {
    const parsed = parseCustomBenchmarkCasesDraft(
      JSON.stringify([
        {
          id: 'case_1',
          prompt: 'Prompt one',
          expectedTypes: ['sequence', 'invalid_type'],
          minSegments: 999,
        },
      ])
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.cases).toHaveLength(1);
    expect(parsed.cases[0]?.expectedTypes).toEqual(['sequence']);
    expect(parsed.cases[0]?.minSegments).toBe(200);
  });

  it('returns detailed parse errors for duplicate ids and missing expected types', () => {
    const duplicate = parseCustomBenchmarkCasesDraft(
      JSON.stringify([
        { id: 'case_1', prompt: 'One', expectedTypes: ['sequence'], minSegments: 1 },
        { id: 'case_1', prompt: 'Two', expectedTypes: ['list'], minSegments: 1 },
      ])
    );
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.error).toContain('Duplicate custom case id');

    const noTypes = parseCustomBenchmarkCasesDraft(
      JSON.stringify([{ id: 'case_2', prompt: 'Two', expectedTypes: ['unknown'], minSegments: 1 }])
    );
    expect(noTypes.ok).toBe(false);
    if (noTypes.ok) return;
    expect(noTypes.error).toContain('must include at least one valid expected type');
  });

  it('builds default case id from first non-empty prompt line', () => {
    const caseId = defaultCustomBenchmarkCaseIdFromPrompt(
      '\n\n  === PREMIUM PROMPT v1 ===\nROLE\nDo things'
    );
    expect(caseId).toBe('custom_premium_prompt_v1');
    expect(toCustomCaseSlug('@@@')).toBe('case');
  });

  it('upserts and merges custom benchmark cases by id', () => {
    const current = [buildCase('a'), buildCase('b')];
    const upserted = upsertCustomBenchmarkCase(current, buildCase('b', { prompt: 'Updated B' }));
    expect(upserted).toHaveLength(2);
    expect(upserted.find((value) => value.id === 'b')?.prompt).toBe('Updated B');

    const merged = mergeCustomBenchmarkCases(upserted, [
      buildCase('b', { prompt: 'Template B' }),
      buildCase('c'),
    ]);
    expect(merged).toHaveLength(3);
    expect(merged.find((value) => value.id === 'b')?.prompt).toBe('Template B');
  });
});
