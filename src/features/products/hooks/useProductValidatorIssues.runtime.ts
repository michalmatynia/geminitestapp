'use client';

import { useMemo, useState } from 'react';

import { isRuntimePatternEnabled } from '@/features/products/validation-engine/core';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useRuntimeValidatorEffect } from './useProductValidatorIssues.runtimeEffect';
import type { ProductValidatorFieldIssues } from './useProductValidatorIssues.types';

type RuntimeProductValidatorIssuesOptions = {
  values: Record<string, unknown>;
  runtimeValues?: Record<string, unknown>;
  patterns: ProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  validationScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  runtimeDebounceMs: number;
  source: string;
};

type RuntimeValuesKeyOptions = {
  values: Record<string, unknown>;
  runtimeValues?: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
  runtimePatternIds: string[];
  validationScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  contextRegistryKey: string;
};

const buildRuntimeValuesKey = ({
  values,
  runtimeValues,
  latestProductValues,
  runtimePatternIds,
  validationScope,
  validatorEnabled,
  contextRegistryKey,
}: RuntimeValuesKeyOptions): string => {
  if (!validatorEnabled || runtimePatternIds.length === 0) return '';

  try {
    return JSON.stringify({
      v: runtimeValues ?? values,
      lp: latestProductValues,
      p: runtimePatternIds,
      s: validationScope,
      c: contextRegistryKey,
    });
  } catch (error) {
    logClientError(error);
    return '';
  }
};

const useRuntimePatternIds = (patterns: ProductValidationPattern[]): string[] =>
  useMemo(
    () =>
      patterns
        .filter((pattern: ProductValidationPattern) => isRuntimePatternEnabled(pattern))
        .map((pattern: ProductValidationPattern) => pattern.id),
    [patterns]
  );

const useContextRegistryKey = (
  contextRegistry: ReturnType<typeof useOptionalContextRegistryPageEnvelope>
): string =>
  useMemo((): string => {
    try {
      return JSON.stringify(contextRegistry ?? null);
    } catch (error) {
      logClientError(error);
      return '';
    }
  }, [contextRegistry]);

const useRuntimeValuesKey = (options: RuntimeValuesKeyOptions): string => {
  const {
    contextRegistryKey,
    latestProductValues,
    runtimePatternIds,
    runtimeValues,
    validationScope,
    validatorEnabled,
    values,
  } = options;

  return useMemo(
    (): string => buildRuntimeValuesKey(options),
    [
      contextRegistryKey,
      latestProductValues,
      runtimePatternIds,
      runtimeValues,
      validationScope,
      validatorEnabled,
      values,
    ]
  );
};

export const useRuntimeProductValidatorIssues = ({
  values,
  runtimeValues,
  patterns,
  latestProductValues,
  validationScope,
  validatorEnabled,
  runtimeDebounceMs,
  source,
}: RuntimeProductValidatorIssuesOptions): ProductValidatorFieldIssues => {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const [runtimeFieldIssues, setRuntimeFieldIssues] = useState<ProductValidatorFieldIssues>({});
  const runtimePatternIds = useRuntimePatternIds(patterns);
  const contextRegistryKey = useContextRegistryKey(contextRegistry);
  const runtimeValuesKey = useRuntimeValuesKey({
    values,
    runtimeValues,
    latestProductValues,
    runtimePatternIds,
    validationScope,
    validatorEnabled,
    contextRegistryKey,
  });

  useRuntimeValidatorEffect({
    contextRegistry,
    contextRegistryKey,
    latestProductValues,
    runtimeDebounceMs,
    runtimePatternIds,
    runtimeValues,
    runtimeValuesKey,
    source,
    validationScope,
    validatorEnabled,
    values,
    setRuntimeFieldIssues,
  });

  return runtimeFieldIssues;
};
