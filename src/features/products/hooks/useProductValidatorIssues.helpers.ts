import { normalizeValidationDebounceMs, type FieldValidatorIssue } from '@/features/products/validation-engine/core';

import type {
  ProductValidatorFieldIssues,
  ProductValidatorTimestampResolver,
} from './useProductValidatorIssues.types';

type ResolveFieldChangedAtOptions = {
  fieldName: string;
  timestamps: Record<string, number>;
  resolveChangedAt?: ProductValidatorTimestampResolver;
};

type ResolveNextIssueRefreshDelayOptions = {
  fieldIssues: ProductValidatorFieldIssues;
  resolveChangedAt?: ProductValidatorTimestampResolver;
  timestamps: Record<string, number>;
};

type IsVisibleIssueOptions = {
  fieldName: string;
  issue: FieldValidatorIssue;
  changedAt: number;
  now: number;
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
};

export const toComparableString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

export const resolveFieldChangedAt = ({
  fieldName,
  timestamps,
  resolveChangedAt,
}: ResolveFieldChangedAtOptions): number => {
  if (typeof resolveChangedAt === 'function') {
    return resolveChangedAt(fieldName, timestamps);
  }

  return timestamps[fieldName] ?? 0;
};

export const resolveNextIssueRefreshDelay = ({
  fieldIssues,
  resolveChangedAt,
  timestamps,
}: ResolveNextIssueRefreshDelayOptions): number | null => {
  const now = Date.now();
  let nextRemainingMs: number | null = null;

  for (const [fieldName, issueList] of Object.entries(fieldIssues)) {
    const changedAt = resolveFieldChangedAt({
      fieldName,
      timestamps,
      resolveChangedAt,
    });
    if (changedAt <= 0) continue;

    for (const issue of issueList) {
      const debounceMs = normalizeValidationDebounceMs(issue.debounceMs);
      if (debounceMs <= 0) continue;
      const remaining = debounceMs - (now - changedAt);
      if (remaining <= 0) continue;
      nextRemainingMs =
        nextRemainingMs === null ? remaining : Math.min(nextRemainingMs, remaining);
    }
  }

  return nextRemainingMs;
};

export const isVisibleIssue = ({
  fieldName,
  issue,
  changedAt,
  now,
  isIssueAccepted,
  isIssueDenied,
}: IsVisibleIssueOptions): boolean => {
  if (isIssueDenied(fieldName, issue.patternId)) return false;
  if (
    issue.postAcceptBehavior === 'stop_after_accept' &&
    isIssueAccepted(fieldName, issue.patternId)
  ) {
    return false;
  }

  const debounceMs = normalizeValidationDebounceMs(issue.debounceMs);
  if (debounceMs <= 0 || changedAt <= 0) return true;
  return now - changedAt >= debounceMs;
};
