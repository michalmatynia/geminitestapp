import { z } from 'zod';

import { namedDtoSchema } from '../base';
import { type PromptValidationRule, type PromptEngineSettings } from '../prompt-engine';
import {
  promptExploderSegmentTypeSchema,
  type PromptExploderSegmentType,
} from './base';
import { type PromptExploderLearnedTemplate } from './settings';

/**
 * Prompt Exploder Benchmark DTOs
 */

export const promptExploderBenchmarkCaseConfigSchema = z.object({
  similarityThreshold: z.number().min(0).max(1).default(0.85),
  minApprovalsForMatching: z.number().int().min(1).default(1),
  autoActivateLearnedTemplates: z.boolean().default(true),
});

export type PromptExploderBenchmarkCaseConfig = z.infer<
  typeof promptExploderBenchmarkCaseConfigSchema
>;

export const promptExploderBenchmarkCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  sourcePrompt: z.string(),
  expectedSegmentTitles: z.array(z.string()),
  expectedSegmentTypes: z.array(promptExploderSegmentTypeSchema).optional(),
  config: promptExploderBenchmarkCaseConfigSchema.optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PromptExploderBenchmarkCase = z.infer<typeof promptExploderBenchmarkCaseSchema>;

export const promptExploderBenchmarkSuiteSchema = namedDtoSchema.extend({
  cases: z.array(promptExploderBenchmarkCaseSchema),
  config: promptExploderBenchmarkCaseConfigSchema.optional(),
  tags: z.array(z.string()).default([]),
});

export type PromptExploderBenchmarkSuite = z.infer<typeof promptExploderBenchmarkSuiteSchema>;

export const promptExploderBenchmarkSuggestionSchema = z.object({
  id: z.string().optional(),
  caseId: z.string(),
  segmentId: z.string().optional(),
  segmentTitle: z.string().nullable().optional(),
  segmentType: z.string().optional(),
  suggestedSegmentType: promptExploderSegmentTypeSchema.default('static'),
  suggestedBindings: z.record(z.string(), z.unknown()).optional(),
  reasoning: z.string().optional(),
  suggestedRulePattern: z.string().default(''),
  suggestedRuleTitle: z.string().default(''),
  suggestedPriority: z.number().default(0),
  suggestedConfidenceBoost: z.number().default(0),
  suggestedTreatAsHeading: z.boolean().default(true),
  sampleText: z.string().default(''),
  confidence: z.number().optional(),
  matchedPatternIds: z.array(z.string()).optional(),
  matchedPatternLabels: z.array(z.string()).optional(),
  matchedSequenceLabels: z.array(z.string()).optional(),
});

export type PromptExploderBenchmarkSuggestion = z.infer<
  typeof promptExploderBenchmarkSuggestionSchema
>;

export type PromptExploderBenchmarkResult = {
  caseId: string;
  caseTitle: string;
  ok: boolean;
  score: number;
  durationMs: number;
  matchedCount: number;
  expectedCount: number;
  missingTitles: string[];
  extraTitles: string[];
  typeMismatches: Array<{ title: string; expected: string; actual: string }>;
  suggestions: PromptExploderBenchmarkSuggestion[];
  error?: string | null;
};

export type PromptExploderBenchmarkStats = {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  averageScore: number;
  totalDurationMs: number;
  generatedAt: string;
};

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
