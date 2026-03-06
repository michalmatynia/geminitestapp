import { z } from 'zod';
import { namedDtoSchema } from '../base';
import { type PromptExploderSegmentType } from './base';

import { type PromptValidationRule } from '../prompt-engine';
import { type PromptExploderLearnedTemplate } from './settings';

/**
 * Prompt Exploder Benchmark DTOs
 */

export type ApplyBenchmarkSuggestionsResult = {
  nextLearnedRules: PromptValidationRule[];
  appliedRules: PromptValidationRule[];
  addedCount: number;
  updatedCount: number;
  nextTemplates: PromptExploderLearnedTemplate[];
  touchedTemplateIds: string[];
  invalidSegmentTitles: string[];
};

export type BenchmarkSuggestionPreparation = {
  uniqueSuggestions: PromptExploderBenchmarkSuggestion[];
  validSuggestions: PromptExploderBenchmarkSuggestion[];
  invalidSegmentTitles: string[];
};

export const promptExploderBenchmarkCaseConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  bindings: z.record(z.string(), z.unknown()),
  expectedKeywords: z.array(z.string()).optional(),
  maxTokens: z.number().optional(),
});

export type PromptExploderBenchmarkCaseConfig = z.infer<
  typeof promptExploderBenchmarkCaseConfigSchema
>;

export const promptExploderBenchmarkSuiteSchema = namedDtoSchema.extend({
  documentId: z.string(),
  cases: z.array(promptExploderBenchmarkCaseConfigSchema),
});

export type PromptExploderBenchmarkSuite = z.infer<typeof promptExploderBenchmarkSuiteSchema>;

export const promptExploderBenchmarkSuggestionSchema = z.object({
  id: z.string().optional(),
  caseId: z.string(),
  segmentId: z.string().optional(),
  segmentTitle: z.string().nullable().optional(),
  segmentType: z.string().optional(),
  suggestedSegmentType: z.string().default('static'),
  suggestedBindings: z.record(z.string(), z.unknown()).optional(),
  reasoning: z.string().optional(),
  suggestedRulePattern: z.string().default(''),
  suggestedRuleTitle: z.string().default(''),
  suggestedPriority: z.number().default(0),
  suggestedConfidenceBoost: z.number().default(0),
  suggestedRuleTreatAsHeading: z.boolean().default(true),
  sampleText: z.string().default(''),
  confidence: z.number().optional(),
  matchedPatternIds: z.array(z.string()).optional(),
  matchedPatternLabels: z.array(z.string()).optional(),
  matchedSequenceLabels: z.array(z.string()).optional(),
});

export type PromptExploderBenchmarkSuggestion = z.infer<
  typeof promptExploderBenchmarkSuggestionSchema
>;

export type PromptExploderBenchmarkCaseReport = {
  id: string;
  expectedTypes: PromptExploderSegmentType[];
  predictedTypes: PromptExploderSegmentType[];
  matchedTypes: PromptExploderSegmentType[];
  missingTypes: PromptExploderSegmentType[];
  unexpectedTypes: PromptExploderSegmentType[];
  segmentCount: number;
  minSegments: number;
  meetsMinSegments: boolean;
  avgSegmentConfidence: number;
  lowConfidenceSegments: number;
  precision: number;
  recall: number;
  f1: number;
  lowConfidenceSuggestions: PromptExploderBenchmarkSuggestion[];
};

export type PromptExploderBenchmarkAggregate = {
  caseCount: number;
  expectedTypeRecall: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  minSegmentPassRate: number;
  avgSegmentConfidence: number;
  totalLowConfidenceSegments: number;
  totalLowConfidenceSuggestions: number;
};

export type PromptExploderBenchmarkReport = {
  generatedAt: string;
  suite: 'default' | 'extended' | 'custom';
  config: {
    lowConfidenceThreshold: number;
    suggestionLimit: number;
  };
  cases: PromptExploderBenchmarkCaseReport[];
  aggregate: PromptExploderBenchmarkAggregate;
};

export type PromptExploderBenchmarkCase = {
  id: string;
  prompt: string;
  expectedTypes: PromptExploderSegmentType[];
  minSegments: number;
};

export type ParseCustomBenchmarkCasesResult =
  | { ok: true; cases: PromptExploderBenchmarkCase[] }
  | { ok: false; error: string };
