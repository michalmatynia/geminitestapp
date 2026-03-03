import { z } from 'zod';

import {
  promptExploderDocumentSchema,
  type PromptExploderDocument,
  type PromptExploderSegment,
  type PromptExploderSubsection,
} from '@/shared/contracts/prompt-exploder';

import { reassemblePromptSegments } from './parser';
import { clonePromptExploderDocument } from './prompt-library';

export const PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY = 'prompt_exploder_segmentation_library';
export const PROMPT_EXPLODER_SEGMENTATION_LIBRARY_VERSION = 1;
export const PROMPT_EXPLODER_SEGMENTATION_LIBRARY_MAX_RECORDS = 200;

export const promptExploderSegmentationReturnTargetSchema = z.enum([
  'image-studio',
  'case-resolver',
]);
export type PromptExploderSegmentationReturnTarget = z.infer<
  typeof promptExploderSegmentationReturnTargetSchema
>;

export const promptExploderSegmentationRecordSchema = z.object({
  id: z.string(),
  sourcePrompt: z.string(),
  sourcePromptLength: z.number().int().nonnegative(),
  reassembledPrompt: z.string(),
  reassembledPromptLength: z.number().int().nonnegative(),
  documentSnapshot: promptExploderDocumentSchema,
  segmentCount: z.number().int().nonnegative(),
  returnTarget: promptExploderSegmentationReturnTargetSchema,
  validationScope: z.string(),
  validationRuleStack: z.string(),
  capturedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PromptExploderSegmentationRecord = z.infer<typeof promptExploderSegmentationRecordSchema>;

export const promptExploderSegmentationLibraryStateSchema = z.object({
  version: z
    .number()
    .int()
    .positive()
    .default(PROMPT_EXPLODER_SEGMENTATION_LIBRARY_VERSION),
  records: z.array(promptExploderSegmentationRecordSchema).default([]),
});
export type PromptExploderSegmentationLibraryState = z.infer<
  typeof promptExploderSegmentationLibraryStateSchema
>;

export const defaultPromptExploderSegmentationLibraryState: PromptExploderSegmentationLibraryState =
  {
    version: PROMPT_EXPLODER_SEGMENTATION_LIBRARY_VERSION,
    records: [],
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

export type PromptExploderSegmentationAnalysisRecord = {
  recordId: string;
  capturedAt: string;
  returnTarget: PromptExploderSegmentationReturnTarget;
  validationScope: string;
  validationRuleStack: string;
  sourcePrompt: string;
  sourcePromptLength: number;
  reassembledPrompt: string;
  reassembledPromptLength: number;
  stats: PromptExploderSegmentationStats;
  segments: PromptExploderSegmentationSegmentOutline[];
};

export type PromptExploderSegmentationAnalysisContext = {
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  records: PromptExploderSegmentationAnalysisRecord[];
};

const outlineSubsectionFromSnapshot = (
  subsection: PromptExploderSubsection,
  index: number
): PromptExploderSegmentationSubsectionOutline => ({
  index: index + 1,
  id: subsection.id,
  title: subsection.title,
  code: subsection.code ?? null,
  condition: subsection.condition ?? null,
  guidance: subsection.guidance ?? null,
  itemCount: subsection.items?.length ?? 0,
  nestedSegmentCount: subsection.segments?.length ?? 0,
});

const outlineSegmentFromSnapshot = (
  segment: PromptExploderSegment,
  index: number
): PromptExploderSegmentationSegmentOutline => ({
  order: index + 1,
  id: segment.id,
  type: segment.type,
  title: segment.title ?? `Segment ${index + 1}`,
  includeInOutput: segment.includeInOutput,
  confidence: segment.confidence,
  matchedPatternIds: [...segment.matchedPatternIds],
  matchedPatternLabels: [...segment.matchedPatternLabels],
  matchedSequenceLabels: [...segment.matchedSequenceLabels],
  validationResults: [...segment.validationResults],
  subsectionCount: segment.subsections.length,
  subsections: segment.subsections.map(outlineSubsectionFromSnapshot),
});

export const buildPromptExploderSegmentationOutline = (
  document: PromptExploderDocument
): PromptExploderSegmentationOutline => {
  const segments = document.segments.map(outlineSegmentFromSnapshot);
  const typeCounts: Record<string, number> = {};
  let confidenceSum = 0;
  let includedSegmentCount = 0;

  segments.forEach((segment) => {
    typeCounts[segment.type] = (typeCounts[segment.type] ?? 0) + 1;
    confidenceSum += segment.confidence;
    if (segment.includeInOutput) includedSegmentCount += 1;
  });

  const segmentCount = segments.length;
  const averageConfidence = segmentCount > 0 ? confidenceSum / segmentCount : 0;

  return {
    stats: {
      segmentCount,
      includedSegmentCount,
      averageConfidence,
      typeCounts,
    },
    segments,
  };
};

export const parsePromptExploderSegmentationLibrary = (
  rawValue: string | null | undefined
): PromptExploderSegmentationLibraryState => {
  if (!rawValue?.trim()) return defaultPromptExploderSegmentationLibraryState;
  try {
    const parsed: unknown = JSON.parse(rawValue);
    const result = promptExploderSegmentationLibraryStateSchema.safeParse(parsed);
    if (!result.success) return defaultPromptExploderSegmentationLibraryState;
    return result.data;
  } catch {
    return defaultPromptExploderSegmentationLibraryState;
  }
};

export const createPromptExploderSegmentationRecordId = (): string =>
  `segctx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const sortPromptExploderSegmentationRecordsByCapturedAt = (
  records: PromptExploderSegmentationRecord[]
): PromptExploderSegmentationRecord[] =>
  [...records].sort(
    (left, right) =>
      right.capturedAt.localeCompare(left.capturedAt) || right.id.localeCompare(left.id)
  );

export const prunePromptExploderSegmentationRecords = (
  records: PromptExploderSegmentationRecord[],
  maxRecords: number = PROMPT_EXPLODER_SEGMENTATION_LIBRARY_MAX_RECORDS
): PromptExploderSegmentationRecord[] =>
  sortPromptExploderSegmentationRecordsByCapturedAt(records).slice(0, maxRecords);

export const appendPromptExploderSegmentationRecord = (args: {
  records: PromptExploderSegmentationRecord[];
  nextRecord: PromptExploderSegmentationRecord;
  maxRecords?: number;
}): PromptExploderSegmentationRecord[] => {
  const maxRecords = args.maxRecords ?? PROMPT_EXPLODER_SEGMENTATION_LIBRARY_MAX_RECORDS;
  return prunePromptExploderSegmentationRecords([...args.records, args.nextRecord], maxRecords);
};

export const removePromptExploderSegmentationRecordById = (
  records: PromptExploderSegmentationRecord[],
  recordId: string
): PromptExploderSegmentationRecord[] => records.filter((record) => record.id !== recordId);

export const buildPromptExploderSegmentationRecord = (args: {
  promptText: string;
  documentState: PromptExploderDocument | null | undefined;
  now: string;
  returnTarget: PromptExploderSegmentationReturnTarget;
  validationScope: string;
  validationRuleStack: string;
  createRecordId?: () => string;
}): PromptExploderSegmentationRecord | null => {
  const promptTrimmed = args.promptText.trim();
  if (!promptTrimmed || !args.documentState) return null;
  const createRecordId = args.createRecordId ?? createPromptExploderSegmentationRecordId;
  const documentSnapshot = clonePromptExploderDocument({
    ...args.documentState,
    sourcePrompt: args.promptText,
  });
  if (!documentSnapshot) return null;
  const reassembledPrompt =
    documentSnapshot.reassembledPrompt && documentSnapshot.reassembledPrompt.trim().length > 0
      ? documentSnapshot.reassembledPrompt
      : reassemblePromptSegments(documentSnapshot.segments);
  return {
    id: createRecordId(),
    sourcePrompt: args.promptText,
    sourcePromptLength: args.promptText.length,
    reassembledPrompt,
    reassembledPromptLength: reassembledPrompt.length,
    documentSnapshot,
    segmentCount: documentSnapshot.segments.length,
    returnTarget: args.returnTarget,
    validationScope: args.validationScope,
    validationRuleStack: args.validationRuleStack,
    capturedAt: args.now,
    createdAt: args.now,
    updatedAt: args.now,
  };
};

export const hydratePromptExploderSegmentationRecordDocument = (
  record: PromptExploderSegmentationRecord
): PromptExploderDocument | null => {
  const cloned = clonePromptExploderDocument(record.documentSnapshot);
  if (!cloned) return null;
  return {
    ...cloned,
    sourcePrompt: record.sourcePrompt,
  };
};

export const buildPromptExploderSegmentationAnalysisContext = (args: {
  records: PromptExploderSegmentationRecord[];
  now?: string;
}): PromptExploderSegmentationAnalysisContext => {
  const sorted = sortPromptExploderSegmentationRecordsByCapturedAt(args.records);
  const records = sorted.map((record) => {
    const outline = buildPromptExploderSegmentationOutline(record.documentSnapshot);
    return {
      recordId: record.id,
      capturedAt: record.capturedAt,
      returnTarget: record.returnTarget,
      validationScope: record.validationScope,
      validationRuleStack: record.validationRuleStack,
      sourcePrompt: record.sourcePrompt,
      sourcePromptLength: record.sourcePromptLength,
      reassembledPrompt: record.reassembledPrompt,
      reassembledPromptLength: record.reassembledPromptLength,
      stats: outline.stats,
      segments: outline.segments,
    };
  });
  return {
    schemaVersion: PROMPT_EXPLODER_SEGMENTATION_LIBRARY_VERSION,
    generatedAt: args.now ?? new Date().toISOString(),
    recordCount: records.length,
    records,
  };
};

export const buildPromptExploderSegmentationAnalysisContextJson = (args: {
  records: PromptExploderSegmentationRecord[];
  now?: string;
}): string => JSON.stringify(buildPromptExploderSegmentationAnalysisContext(args), null, 2);
