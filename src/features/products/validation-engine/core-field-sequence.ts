import type {
  FieldValidatorIssue,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';

import { deriveDiffSegment } from './core-launch-replacement';
import type { SequenceIssueAggregate, StaticPatternPlan } from './core-types';

const resolveGroupLabel = (pattern: ProductValidationPattern): string | null => {
  const label = pattern.sequenceGroupLabel?.trim() ?? '';
  return label.length > 0 ? label : null;
};

export const ensureSequenceAggregate = (
  aggregates: Map<string, SequenceIssueAggregate>,
  plan: StaticPatternPlan,
  workingValue: string
): void => {
  if (!plan.inSequenceGroup || plan.sequenceGroupId === null) return;
  if (aggregates.has(plan.sequenceGroupId)) return;
  aggregates.set(plan.sequenceGroupId, {
    groupId: plan.sequenceGroupId,
    groupLabel: resolveGroupLabel(plan.pattern),
    originalValue: workingValue,
    finalValue: workingValue,
    severity: plan.pattern.severity,
    postAcceptBehavior: plan.postAcceptBehavior,
    debounceMs: plan.debounceMs,
  });
};

export const updateSequenceAggregate = (
  aggregates: Map<string, SequenceIssueAggregate>,
  plan: StaticPatternPlan,
  nextValue: string
): void => {
  if (!plan.inSequenceGroup || plan.sequenceGroupId === null) return;
  const aggregate = aggregates.get(plan.sequenceGroupId);
  if (aggregate === undefined) return;
  aggregate.finalValue = nextValue;
  if (plan.pattern.severity === 'error') aggregate.severity = 'error';
  if (plan.postAcceptBehavior === 'stop_after_accept') {
    aggregate.postAcceptBehavior = 'stop_after_accept';
  }
  aggregate.debounceMs = Math.max(aggregate.debounceMs, plan.debounceMs);
};

const buildSequenceIssue = (aggregate: SequenceIssueAggregate): FieldValidatorIssue => {
  const diff = deriveDiffSegment(aggregate.originalValue, aggregate.finalValue);
  return {
    patternId: `sequence:${aggregate.groupId}`,
    message: aggregate.groupLabel === null ? 'Sequence result' : `${aggregate.groupLabel} sequence result`,
    severity: aggregate.severity,
    matchText: diff.matchText,
    index: diff.index,
    length: diff.length,
    regex: '',
    flags: null,
    replacementValue: aggregate.finalValue,
    replacementApplyMode: 'replace_whole_field',
    replacementScope: 'field',
    replacementActive: true,
    postAcceptBehavior: aggregate.postAcceptBehavior,
    debounceMs: aggregate.debounceMs,
  };
};

export const appendSequenceIssues = (
  issues: FieldValidatorIssue[],
  sequenceAggregates: Map<string, SequenceIssueAggregate>
): FieldValidatorIssue[] => {
  const nextIssues = [...issues];
  for (const aggregate of sequenceAggregates.values()) {
    if (aggregate.finalValue === aggregate.originalValue) continue;
    nextIssues.push(buildSequenceIssue(aggregate));
  }
  return nextIssues;
};
