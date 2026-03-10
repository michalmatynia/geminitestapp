import { z } from 'zod';

import {
  type PromptExploderBenchmarkCase as PromptExploderBenchmarkCaseContract,
  type PromptExploderBenchmarkReport as PromptExploderBenchmarkReportContract,
} from './benchmark';
import {
  promptExploderDocumentSchema,
  promptExploderSegmentSchema,
  type PromptExploderSegment,
  type PromptExploderBinding,
} from './document';

export type SegmentSelectionStrategy =
  | {
      kind: 'match_title';
      title: string;
    }
  | {
      kind: 'preserve_id';
      previousId: string | null;
    }
  | {
      kind: 'manual';
    }
  | {
      kind: 'all';
    };

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
  validationRuleStack: z.string().trim().min(1).optional(),
  capturedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  prompt: z.string(),
  segments: z.array(promptExploderSegmentSchema),
});

export type PromptExploderSegmentationRecord = z.infer<
  typeof promptExploderSegmentationRecordSchema
>;

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
  validationRuleStack: string | undefined;
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
};

export type PromptExploderBenchmarkCase = PromptExploderBenchmarkCaseContract;

export type PromptExploderBenchmarkReport = PromptExploderBenchmarkReportContract;
