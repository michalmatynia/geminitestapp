'use client';

import { useMemo } from 'react';

import {
  buildFieldIssues,
  mergeFieldIssueMaps,
} from '@/features/products/validation-engine/core';

import { useProductValidatorFieldEditTimestamps } from './useProductValidatorIssues.editTracking';
import { useRuntimeProductValidatorIssues } from './useProductValidatorIssues.runtime';
import type {
  ProductValidatorFieldIssues,
  UseProductValidatorIssuesOptions,
  UseProductValidatorIssuesResult,
} from './useProductValidatorIssues.types';
import { useVisibleProductValidatorIssues } from './useProductValidatorIssues.visible';

const EMPTY_FIELD_ISSUES: ProductValidatorFieldIssues = {};

export const useProductValidatorIssues = ({
  values,
  runtimeValues,
  patterns,
  latestProductValues,
  categories,
  validationScope,
  validatorEnabled,
  isIssueDenied,
  isIssueAccepted,
  runtimeDebounceMs = 250,
  trackedFields,
  resolveChangedAt,
  source,
}: UseProductValidatorIssuesOptions): UseProductValidatorIssuesResult => {
  const runtimeFieldIssues = useRuntimeProductValidatorIssues({
    values,
    runtimeValues,
    patterns,
    latestProductValues,
    validationScope,
    validatorEnabled,
    runtimeDebounceMs,
    source,
  });
  const fieldEditTimestampsRef = useProductValidatorFieldEditTimestamps({
    trackedFields,
    values,
  });

  const staticFieldIssues = useMemo((): ProductValidatorFieldIssues => {
    if (!validatorEnabled) return EMPTY_FIELD_ISSUES;
    return buildFieldIssues({
      values,
      patterns,
      latestProductValues,
      validationScope,
      categories,
    });
  }, [categories, latestProductValues, patterns, validationScope, validatorEnabled, values]);

  const fieldIssues = useMemo((): ProductValidatorFieldIssues => {
    const activeRuntimeIssues = validatorEnabled ? runtimeFieldIssues : EMPTY_FIELD_ISSUES;
    return mergeFieldIssueMaps(staticFieldIssues, activeRuntimeIssues);
  }, [runtimeFieldIssues, staticFieldIssues, validatorEnabled]);

  const visibleFieldIssues = useVisibleProductValidatorIssues({
    fieldIssues,
    fieldEditTimestampsRef,
    isIssueAccepted,
    isIssueDenied,
    resolveChangedAt,
    validatorEnabled,
  });

  return {
    fieldIssues,
    visibleFieldIssues,
  };
};
