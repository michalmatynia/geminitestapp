import { z } from 'zod';
import {
  promptExploderDocumentSchema,
  type PromptExploderSegment,
  type PromptExploderBinding,
  type PromptExploderDocument,
} from './document';
import {
  type PromptExploderSegmentType,
} from './base';
import {
  type PromptExploderBenchmarkSuggestion,
  type PromptExploderBenchmarkCaseReport,
  type PromptExploderBenchmarkAggregate,
} from './benchmark';
import {
  type PromptExploderLearnedTemplate,
} from './settings';
import { type PromptValidationRule, type PromptEngineSettings } from '../prompt-engine';

export type PromptExploderOrchestratorRollout = {
  enabled: boolean;
  reason: 'settings' | 'env_override' | 'canary';
  bucket: number;
  canaryPercent: number;
};

export type SegmentSelectionStrategy =
  | {
      kind: 'match_title';
      title: string;
    }
  | {
      kind: 'preserve_id';
      previousId: string | null;
    }
  | "manual";

export type PromptExploderSegmentationReturnTarget = 'image-studio' | 'case-resolver';

export const promptExploderSegmentationRecordSchema = z.object({
  id: z.string(),
  sourcePrompt: z.string(),
  sourcePromptLength: z.number().int().nonnegative(),
  reassembledPrompt: z.string(),
  reassembledPromptLength: z.number().int().nonnegative(),
  documentSnapshot: promptExploderDocumentSchema,
  segmentCount: z.number().int().nonnegative(),
  returnTarget: z.enum(['image-studio', 'case-resolver']),
  validationScope: z.string(),
  validationRuleStack: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  capturedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PromptExploderSegmentationRecord = z.infer<
  typeof promptExploderSegmentationRecordSchema
> & {
  prompt?: string;
  segments?: PromptExploderSegment[];
};

export type PromptExploderSegmentationLibraryState = {
  records: PromptExploderSegmentationRecord[];
  lastCapturedAt: string | null;
  totalCaptured: number;
  version: number;
};

export type CaptureSegmentationRecordReason =
  | 'manual_save'
  | 'benchmark_suggestion'
  | 'auto_learning'
  | 'rule_tuning'
  | 'missing_prompt'
  | 'missing_document'
  | 'persist_failed'
  | 'no_changes';

export type CaptureSegmentationRecordResult = {
  ok: boolean;
  captured: boolean;
  persisted: boolean;
  recordId?: string;
  error?: string;
  reason: CaptureSegmentationRecordReason;
};

/**
 * Prompt Exploder Manual Bindings DTOs
 */

export type PromptExploderSegmentationAnalysisRecord = {
  id: string;
  recordId: string;
  capturedAt: string;
  returnTarget: PromptExploderSegmentationReturnTarget;
  validationScope: string;
  validationRuleStack: string | { id?: string; name?: string; ruleIds?: string[] } | undefined;
  sourcePrompt: string;
  sourcePromptLength: number;
  reassembledPrompt: string;
  reassembledPromptLength: number;
  stats: PromptExploderSegmentationStats;
  segments: PromptExploderSegmentationSegmentOutline[];
  segmentCount: number;
  averageConfidence: number;
  lowConfidenceCount: number;
  types: Record<string, number>;
  matchedRules: string[];
};

export type PromptExploderSegmentationAnalysisContext = {
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  records: PromptExploderSegmentationAnalysisRecord[];
};

export type PromptExploderSegmentationStats = {
  segmentCount: number;
  includedSegmentCount: number;
  averageConfidence: number;
  typeCounts: Record<string, number>;
};

export type PromptExploderSegmentationOutline = {
  stats: PromptExploderSegmentationStats;
  segments: PromptExploderSegmentationSegmentOutline[];
};

export type PromptExploderSegmentationSegmentOutline = {
  order: number;
  id: string;
  type: PromptExploderSegment['type'];
  title: string;
  includeInOutput: boolean;
  confidence: number;
  matchedPatternIds: string[];
  matchedPatternLabels: string[];
  matchedSequenceLabels: string[];
  validationResults: string[];
  subsectionCount: number;
  subsections: PromptExploderSegmentationSubsectionOutline[];
};

export type PromptExploderSegmentationSubsectionOutline = {
  index: number;
  id: string;
  title: string;
  code: string | null;
  condition: string | null;
  guidance: string | null;
  itemCount: number;
  nestedSegmentCount: number;
};

export type ManualBindingBuildSuccess = {
  ok: true;
  bindings: PromptExploderBinding[];
  warnings: string[];
};

export type ManualBindingBuildError = {
  ok: false;
  error: string;
  details?: Record<string, unknown>;
};

export type ManualBindingBuildResult = ManualBindingBuildSuccess | ManualBindingBuildError;

/**
 * Prompt Exploder Tree DTOs
 */

export const promptExploderTreeNodeKindSchema = z.enum([
  'segment',
  'document',
  'list_item',
  'subsection',
  'subsection_item',
  'hierarchy_item',
  'binding',
  'param',
]);

export type PromptExploderTreeNodeKind = z.infer<typeof promptExploderTreeNodeKindSchema>;

export const promptExploderTreeMetadataSchema = z.object({
  kind: promptExploderTreeNodeKindSchema,
  entityId: z.string(),
  id: z.string().optional(),
  label: z.string().optional(),
  isExpanded: z.boolean().optional(),
  isSelected: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  parentEntityId: z.string().nullable().optional(),
  segmentType: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  guidance: z.string().nullable().optional(),
  logicalOperator: z.string().nullable().optional(),
});

export type PromptExploderTreeMetadata = z.infer<typeof promptExploderTreeMetadataSchema>;

export type ParsedPromptHeading = {
  code: string | null;
  title: string;
  level?: number;
  text?: string;
  id?: string;
};

export type ParseCustomBenchmarkCasesResult =
  | { ok: true; cases: PromptExploderBenchmarkCase[] }
  | { ok: false; error: string };

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

export type PromptExploderPatternPackResult = {
  nextSettings: PromptEngineSettings;
  addedRuleIds: string[];
  updatedRuleIds: string[];
};

export type PromptExploderBenchmarkCase = {
  id: string;
  prompt: string;
  expectedTypes: PromptExploderSegmentType[];
  minSegments: number;
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
