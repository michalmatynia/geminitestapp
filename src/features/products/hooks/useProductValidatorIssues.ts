import { useEffect, useMemo, useRef, useState } from 'react';

import { logClientError } from '@/features/observability';
import {
  areIssueMapsEquivalent,
  buildFieldIssues,
  isRuntimePatternEnabled,
  mergeFieldIssueMaps,
  normalizeValidationDebounceMs,
  type FieldValidatorIssue,
} from '@/features/products/validation-engine/core';
import { api } from '@/shared/lib/api-client';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/types/domain/products';

type UseProductValidatorIssuesOptions = {
  values: Record<string, unknown>;
  runtimeValues?: Record<string, unknown>;
  patterns: ProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  validationScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  runtimeDebounceMs?: number;
  trackedFields?: string[];
  resolveChangedAt?: (
    fieldName: string,
    timestamps: Record<string, number>
  ) => number;
  source: string;
};

const toComparableString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

export const useProductValidatorIssues = ({
  values,
  runtimeValues,
  patterns,
  latestProductValues,
  validationScope,
  validatorEnabled,
  isIssueDenied,
  isIssueAccepted,
  runtimeDebounceMs = 250,
  trackedFields,
  resolveChangedAt,
  source,
}: UseProductValidatorIssuesOptions): {
  fieldIssues: Record<string, FieldValidatorIssue[]>;
  visibleFieldIssues: Record<string, FieldValidatorIssue[]>;
} => {
  const previousFieldValuesRef = useRef<Record<string, string>>({});
  const fieldEditTimestampsRef = useRef<Record<string, number>>({});
  const debounceRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debounceTick, setDebounceTick] = useState(0);
  const [runtimeFieldIssues, setRuntimeFieldIssues] = useState<Record<string, FieldValidatorIssue[]>>(
    {}
  );

  const runtimePatternIds = useMemo(
    () =>
      patterns
        .filter((pattern: ProductValidationPattern) => isRuntimePatternEnabled(pattern))
        .map((pattern: ProductValidationPattern) => pattern.id),
    [patterns]
  );

  const trackedFieldList = useMemo(
    () =>
      Array.isArray(trackedFields) && trackedFields.length > 0
        ? trackedFields
        : Object.keys(values),
    [trackedFields, values]
  );

  useEffect(() => {
    if (!validatorEnabled || runtimePatternIds.length === 0) {
      setRuntimeFieldIssues((previous) =>
        Object.keys(previous).length === 0 ? previous : {}
      );
      return;
    }
    const timer = setTimeout(() => {
      void api
        .post<{ issues?: Record<string, FieldValidatorIssue[]> }>(
          '/api/products/validator-runtime/evaluate',
          {
            values: runtimeValues ?? values,
            latestProductValues,
            patternIds: runtimePatternIds,
            validationScope,
          },
          { logError: false }
        )
        .then((response) => {
          const nextIssues = response.issues ?? {};
          setRuntimeFieldIssues((previous) =>
            areIssueMapsEquivalent(previous, nextIssues) ? previous : nextIssues
          );
        })
        .catch((error: unknown) => {
          setRuntimeFieldIssues((previous) =>
            Object.keys(previous).length === 0 ? previous : {}
          );
          logClientError(error instanceof Error ? error : new Error(String(error)), {
            context: {
              source,
              action: 'runtimeValidatorEvaluate',
            },
          });
        });
    }, Math.max(0, runtimeDebounceMs));
    return () => {
      clearTimeout(timer);
    };
  }, [
    latestProductValues,
    runtimeDebounceMs,
    runtimePatternIds,
    runtimeValues,
    source,
    validationScope,
    validatorEnabled,
    values,
  ]);

  useEffect(() => {
    const now = Date.now();
    for (const fieldName of trackedFieldList) {
      const normalizedValue = toComparableString(values[fieldName]);
      if (!(fieldName in previousFieldValuesRef.current)) {
        previousFieldValuesRef.current[fieldName] = normalizedValue;
        continue;
      }
      if (previousFieldValuesRef.current[fieldName] === normalizedValue) continue;
      previousFieldValuesRef.current[fieldName] = normalizedValue;
      fieldEditTimestampsRef.current[fieldName] = now;
    }
  }, [trackedFieldList, values]);

  const staticFieldIssues = useMemo(
    () =>
      validatorEnabled
        ? buildFieldIssues({
          values,
          patterns,
          latestProductValues,
          validationScope,
        })
        : ({} as Record<string, FieldValidatorIssue[]>),
    [
      latestProductValues,
      patterns,
      validationScope,
      validatorEnabled,
      values,
    ]
  );

  const fieldIssues = useMemo(
    () =>
      mergeFieldIssueMaps(
        staticFieldIssues,
        validatorEnabled ? runtimeFieldIssues : {}
      ),
    [runtimeFieldIssues, staticFieldIssues, validatorEnabled]
  );

  useEffect(() => {
    if (debounceRefreshTimerRef.current) {
      clearTimeout(debounceRefreshTimerRef.current);
      debounceRefreshTimerRef.current = null;
    }
    if (!validatorEnabled) return;
    const now = Date.now();
    let nextRemainingMs: number | null = null;
    for (const [fieldName, issueList] of Object.entries(fieldIssues)) {
      const changedAt = resolveChangedAt
        ? resolveChangedAt(fieldName, fieldEditTimestampsRef.current)
        : fieldEditTimestampsRef.current[fieldName] ?? 0;
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
    if (nextRemainingMs !== null) {
      debounceRefreshTimerRef.current = setTimeout(() => {
        setDebounceTick((prev) => prev + 1);
      }, nextRemainingMs + 10);
    }
    return () => {
      if (debounceRefreshTimerRef.current) {
        clearTimeout(debounceRefreshTimerRef.current);
        debounceRefreshTimerRef.current = null;
      }
    };
  }, [debounceTick, fieldIssues, resolveChangedAt, validatorEnabled]);

  const visibleFieldIssues = useMemo((): Record<string, FieldValidatorIssue[]> => {
    if (!validatorEnabled) return {};
    const visible: Record<string, FieldValidatorIssue[]> = {};
    const now = Date.now();
    for (const [fieldName, issueList] of Object.entries(fieldIssues)) {
      const changedAt = resolveChangedAt
        ? resolveChangedAt(fieldName, fieldEditTimestampsRef.current)
        : fieldEditTimestampsRef.current[fieldName] ?? 0;
      visible[fieldName] = issueList.filter((issue: FieldValidatorIssue): boolean => {
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
      });
    }
    return visible;
  }, [
    debounceTick,
    fieldIssues,
    isIssueAccepted,
    isIssueDenied,
    resolveChangedAt,
    validatorEnabled,
  ]);

  return {
    fieldIssues,
    visibleFieldIssues,
  };
};
