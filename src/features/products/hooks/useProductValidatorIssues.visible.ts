'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { FieldValidatorIssue } from '@/features/products/validation-engine/core';

import {
  isVisibleIssue,
  resolveFieldChangedAt,
  resolveNextIssueRefreshDelay,
} from './useProductValidatorIssues.helpers';
import type {
  ProductValidatorFieldIssues,
  ProductValidatorTimestampRef,
  ProductValidatorTimestampResolver,
} from './useProductValidatorIssues.types';

type UseVisibleProductValidatorIssuesOptions = {
  fieldIssues: ProductValidatorFieldIssues;
  fieldEditTimestampsRef: ProductValidatorTimestampRef;
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
  resolveChangedAt?: ProductValidatorTimestampResolver;
  validatorEnabled: boolean;
};

type BuildVisibleIssueMapOptions = UseVisibleProductValidatorIssuesOptions & {
  refreshTick: number;
};

const buildVisibleIssueMap = (
  options: BuildVisibleIssueMapOptions
): ProductValidatorFieldIssues => {
  const {
    fieldIssues,
    fieldEditTimestampsRef,
    isIssueAccepted,
    isIssueDenied,
    resolveChangedAt,
    validatorEnabled,
  } = options;

  if (!validatorEnabled) return {};
  const visible: ProductValidatorFieldIssues = {};
  const now = Date.now();

  for (const [fieldName, issueList] of Object.entries(fieldIssues)) {
    const changedAt = resolveFieldChangedAt({
      fieldName,
      timestamps: fieldEditTimestampsRef.current,
      resolveChangedAt,
    });
    visible[fieldName] = issueList.filter((issue: FieldValidatorIssue): boolean =>
      isVisibleIssue({
        fieldName,
        issue,
        changedAt,
        now,
        isIssueAccepted,
        isIssueDenied,
      })
    );
  }

  return visible;
};

const useVisibleIssueRefreshTick = ({
  fieldIssues,
  fieldEditTimestampsRef,
  resolveChangedAt,
  validatorEnabled,
}: Pick<
  UseVisibleProductValidatorIssuesOptions,
  'fieldIssues' | 'fieldEditTimestampsRef' | 'resolveChangedAt' | 'validatorEnabled'
>): number => {
  const debounceRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const previousTimer = debounceRefreshTimerRef.current;
    if (previousTimer !== null) {
      clearTimeout(previousTimer);
      debounceRefreshTimerRef.current = null;
    }
    if (!validatorEnabled) return undefined;

    const nextRemainingMs = resolveNextIssueRefreshDelay({
      fieldIssues,
      resolveChangedAt,
      timestamps: fieldEditTimestampsRef.current,
    });
    if (nextRemainingMs !== null) {
      debounceRefreshTimerRef.current = setTimeout(() => {
        setRefreshTick((previous) => previous + 1);
      }, nextRemainingMs + 10);
    }

    return () => {
      const cleanupTimer = debounceRefreshTimerRef.current;
      if (cleanupTimer !== null) {
        clearTimeout(cleanupTimer);
        debounceRefreshTimerRef.current = null;
      }
    };
  }, [fieldEditTimestampsRef, fieldIssues, refreshTick, resolveChangedAt, validatorEnabled]);

  return refreshTick;
};

export const useVisibleProductValidatorIssues = ({
  fieldIssues,
  fieldEditTimestampsRef,
  isIssueAccepted,
  isIssueDenied,
  resolveChangedAt,
  validatorEnabled,
}: UseVisibleProductValidatorIssuesOptions): ProductValidatorFieldIssues => {
  const refreshTick = useVisibleIssueRefreshTick({
    fieldIssues,
    fieldEditTimestampsRef,
    resolveChangedAt,
    validatorEnabled,
  });

  return useMemo(
    (): ProductValidatorFieldIssues =>
      buildVisibleIssueMap({
        fieldIssues,
        fieldEditTimestampsRef,
        isIssueAccepted,
        isIssueDenied,
        refreshTick,
        resolveChangedAt,
        validatorEnabled,
      }),
    [
      fieldEditTimestampsRef,
      fieldIssues,
      isIssueAccepted,
      isIssueDenied,
      refreshTick,
      resolveChangedAt,
      validatorEnabled,
    ]
  );
};
