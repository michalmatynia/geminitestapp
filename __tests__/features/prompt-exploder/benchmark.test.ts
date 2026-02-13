import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES,
  EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES,
  PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET,
  runPromptExploderBenchmark,
} from '@/features/prompt-exploder/benchmark';
import { PROMPT_EXPLODER_PATTERN_PACK } from '@/features/prompt-exploder/pattern-pack';

describe('prompt exploder benchmark quality gate', () => {
  it('maintains high expected-type recall across benchmark cases', () => {
    const report = runPromptExploderBenchmark({
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    report.cases.forEach((caseReport) => {
      expect(caseReport.segmentCount).toBeGreaterThanOrEqual(caseReport.minSegments);
    });
    expect(report.aggregate.expectedTypeRecall).toBeGreaterThanOrEqual(
      PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET
    );
  });

  it('supports default and extended benchmark suites', () => {
    const defaultReport = runPromptExploderBenchmark({
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
      suite: 'default',
    });
    const extendedReport = runPromptExploderBenchmark({
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
      suite: 'extended',
    });

    expect(defaultReport.suite).toBe('default');
    expect(extendedReport.suite).toBe('extended');
    expect(defaultReport.aggregate.caseCount).toBe(
      DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES.length
    );
    expect(extendedReport.aggregate.caseCount).toBe(
      EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES.length
    );
    expect(extendedReport.aggregate.caseCount).toBeGreaterThanOrEqual(
      defaultReport.aggregate.caseCount
    );
  });

  it('supports custom benchmark case sets and returns low-confidence suggestions', () => {
    const customReport = runPromptExploderBenchmark({
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
      cases: [
        {
          id: 'custom_minimal',
          prompt: 'ROLE\nKeep product unchanged.',
          expectedTypes: ['assigned_text'],
          minSegments: 1,
        },
      ],
    });

    expect(customReport.suite).toBe('custom');
    expect(customReport.aggregate.caseCount).toBe(1);
    expect(customReport.config.lowConfidenceThreshold).toBe(0.55);
    expect(customReport.config.suggestionLimit).toBe(4);
    expect(customReport.cases[0]?.lowConfidenceSuggestions).toBeDefined();
    expect(Array.isArray(customReport.cases[0]?.lowConfidenceSuggestions)).toBe(true);
  });

  it('applies benchmark suggestion tuning options', () => {
    const tunedReport = runPromptExploderBenchmark({
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
      suite: 'extended',
      lowConfidenceThreshold: 0.9,
      suggestionLimit: 1,
    });

    expect(tunedReport.config.lowConfidenceThreshold).toBe(0.9);
    expect(tunedReport.config.suggestionLimit).toBe(1);
    tunedReport.cases.forEach((caseReport) => {
      expect(caseReport.lowConfidenceSuggestions.length).toBeLessThanOrEqual(1);
    });
  });

  it('treats explicit empty custom case sets as custom suite with zero cases', () => {
    const customEmptyReport = runPromptExploderBenchmark({
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
      cases: [],
    });

    expect(customEmptyReport.suite).toBe('custom');
    expect(customEmptyReport.aggregate.caseCount).toBe(0);
    expect(customEmptyReport.cases).toEqual([]);
  });
});
