import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
import type { PromptExploderSegmentType } from '@/shared/contracts/prompt-exploder';

type PromptValidationRegexRule = Extract<PromptValidationRule, { kind: 'regex' }>;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const buildExploderRegexRuleDraft = (args: {
  id: string;
  title: string;
  fallbackTitle: string;
  description: string;
  pattern: string;
  message: string;
  sequenceGroupId: string;
  sequenceGroupLabel: string;
  sequence: number;
  segmentType: PromptExploderSegmentType;
  priority: number;
  confidenceBoost: number;
  treatAsHeading: boolean;
}): PromptValidationRegexRule => ({
  kind: 'regex',
  id: args.id,
  enabled: true,
  severity: 'info',
  title: args.title.trim() || args.fallbackTitle,
  description: args.description,
  pattern: args.pattern.trim(),
  flags: 'mi',
  message: args.message,
  similar: [],
  autofix: { enabled: false, operations: [] },
  sequenceGroupId: args.sequenceGroupId,
  sequenceGroupLabel: args.sequenceGroupLabel,
  sequenceGroupDebounceMs: 0,
  sequence: args.sequence,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  appliesToScopes: ['prompt_exploder'],
  launchEnabled: false,
  launchAppliesToScopes: ['prompt_exploder'],
  launchScopeBehavior: 'gate',
  launchOperator: 'contains',
  launchValue: null,
  launchFlags: null,
  promptExploderSegmentType: args.segmentType,
  promptExploderPriority: clampNumber(Math.floor(args.priority), -50, 50),
  promptExploderConfidenceBoost: clampNumber(args.confidenceBoost, 0, 0.5),
  promptExploderTreatAsHeading: args.treatAsHeading,
});

export const buildManualLearnedRegexRuleDraft = (args: {
  id: string;
  segmentTitle: string;
  segmentType: PromptExploderSegmentType;
  sequence: number;
  ruleTitle: string;
  rulePattern: string;
  priority: number;
  confidenceBoost: number;
  treatAsHeading: boolean;
}): PromptValidationRegexRule => {
  return buildExploderRegexRuleDraft({
    id: args.id,
    title: args.ruleTitle,
    fallbackTitle: `Learned ${args.segmentType} pattern`,
    description: `Approved from Prompt Exploder segment: ${args.segmentTitle}`,
    pattern: args.rulePattern,
    message: `Learned pattern matched a ${args.segmentType} segment.`,
    sequenceGroupId: 'exploder_learned',
    sequenceGroupLabel: 'Exploder Learned',
    sequence: args.sequence,
    segmentType: args.segmentType,
    priority: args.priority,
    confidenceBoost: args.confidenceBoost,
    treatAsHeading: args.treatAsHeading,
  });
};

export const buildBenchmarkLearnedRegexRuleDraft = (args: {
  id: string;
  caseId: string;
  segmentTitle: string;
  segmentType: PromptExploderSegmentType;
  sequence: number;
  suggestedRuleTitle: string;
  suggestedRulePattern: string;
  suggestedPriority: number;
  suggestedConfidenceBoost: number;
  suggestedRuleTreatAsHeading: boolean;
}): PromptValidationRegexRule => {
  return buildExploderRegexRuleDraft({
    id: args.id,
    title: args.suggestedRuleTitle,
    fallbackTitle: `Benchmark ${args.segmentType} pattern`,
    description: `Benchmark suggestion from case "${args.caseId}" and segment "${args.segmentTitle}".`,
    pattern: args.suggestedRulePattern,
    message: `Benchmark learned pattern matched ${args.segmentType}.`,
    sequenceGroupId: 'exploder_benchmark_suggestions',
    sequenceGroupLabel: 'Exploder Benchmark Suggestions',
    sequence: args.sequence,
    segmentType: args.segmentType,
    priority: args.suggestedPriority,
    confidenceBoost: args.suggestedConfidenceBoost,
    treatAsHeading: args.suggestedRuleTreatAsHeading,
  });
};
