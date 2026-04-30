'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

import { areIssueMapsEquivalent } from '@/features/products/validation-engine/core';
import type { ProductValidationInstanceScope } from '@/shared/contracts/products/validation';
import type { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { ProductValidatorFieldIssues } from './useProductValidatorIssues.types';

type ContextRegistryEnvelope = NonNullable<
  ReturnType<typeof useOptionalContextRegistryPageEnvelope>
>;

type RuntimeValidatorPayload = {
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
  patternIds: string[];
  validationScope: ProductValidationInstanceScope;
  contextRegistry?: ContextRegistryEnvelope;
};

type RuntimeValidatorEffectOptions = {
  values: Record<string, unknown>;
  runtimeValues?: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
  validationScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  runtimeDebounceMs: number;
  source: string;
  contextRegistry: ReturnType<typeof useOptionalContextRegistryPageEnvelope>;
  contextRegistryKey: string;
  runtimePatternIds: string[];
  runtimeValuesKey: string;
  setRuntimeFieldIssues: Dispatch<SetStateAction<ProductValidatorFieldIssues>>;
};

type RuntimeScheduleOptions = RuntimeValidatorEffectOptions & {
  lastSentRuntimeKey: string;
  clearLastSentRuntimeKey: () => void;
  markRuntimeKeySent: (nextRuntimeKey: string) => void;
};

type RuntimeUpdateOptions = {
  payload: RuntimeValidatorPayload;
  setRuntimeFieldIssues: Dispatch<SetStateAction<ProductValidatorFieldIssues>>;
  source: string;
};

const buildRuntimeValidatorPayload = ({
  contextRegistry,
  latestProductValues,
  runtimePatternIds,
  runtimeValues,
  validationScope,
  values,
}: RuntimeValidatorEffectOptions): RuntimeValidatorPayload => {
  const payload: RuntimeValidatorPayload = {
    values: runtimeValues ?? values,
    latestProductValues,
    patternIds: runtimePatternIds,
    validationScope,
  };

  if (contextRegistry !== null) {
    payload.contextRegistry = contextRegistry;
  }

  return payload;
};

const evaluateRuntimeIssues = async ({
  payload,
  setRuntimeFieldIssues,
  source,
}: RuntimeUpdateOptions): Promise<void> => {
  try {
    const response = await api.post<{ issues?: ProductValidatorFieldIssues }>(
      '/api/v2/products/validator-runtime/evaluate',
      payload,
      { logError: false }
    );
    const nextIssues = response.issues ?? {};
    setRuntimeFieldIssues((previous) =>
      areIssueMapsEquivalent(previous, nextIssues) ? previous : nextIssues
    );
  } catch (error) {
    setRuntimeFieldIssues((previous) => (Object.keys(previous).length === 0 ? previous : {}));
    logClientError(error instanceof Error ? error : new Error(String(error)), {
      context: {
        source,
        action: 'runtimeValidatorEvaluate',
      },
    });
  }
};

const scheduleRuntimeEvaluation = ({
  runtimeDebounceMs,
  runtimePatternIds,
  runtimeValuesKey,
  source,
  validatorEnabled,
  lastSentRuntimeKey,
  clearLastSentRuntimeKey,
  markRuntimeKeySent,
  setRuntimeFieldIssues,
  ...payloadOptions
}: RuntimeScheduleOptions): (() => void) | undefined => {
  if (!validatorEnabled || runtimePatternIds.length === 0) {
    setRuntimeFieldIssues((previous) => (Object.keys(previous).length === 0 ? previous : {}));
    clearLastSentRuntimeKey();
    return undefined;
  }
  if (runtimeValuesKey.length > 0 && runtimeValuesKey === lastSentRuntimeKey) {
    return undefined;
  }

  const payload = buildRuntimeValidatorPayload({
    ...payloadOptions,
    runtimeDebounceMs,
    runtimePatternIds,
    runtimeValuesKey,
    source,
    setRuntimeFieldIssues,
    validatorEnabled,
  });
  const timer = setTimeout(() => {
    markRuntimeKeySent(runtimeValuesKey);
    void evaluateRuntimeIssues({
      payload,
      setRuntimeFieldIssues,
      source,
    });
  }, Math.max(0, runtimeDebounceMs));

  return () => clearTimeout(timer);
};

export const useRuntimeValidatorEffect = (
  options: RuntimeValidatorEffectOptions
): void => {
  const lastSentRuntimeKeyRef = useRef<string>('');
  const {
    contextRegistry,
    contextRegistryKey,
    latestProductValues,
    runtimeDebounceMs,
    runtimePatternIds,
    runtimeValues,
    runtimeValuesKey,
    setRuntimeFieldIssues,
    source,
    validationScope,
    validatorEnabled,
    values,
  } = options;

  useEffect(
    () =>
      scheduleRuntimeEvaluation({
        contextRegistry,
        contextRegistryKey,
        latestProductValues,
        runtimeDebounceMs,
        runtimePatternIds,
        runtimeValues,
        runtimeValuesKey,
        setRuntimeFieldIssues,
        source,
        validationScope,
        validatorEnabled,
        values,
        lastSentRuntimeKey: lastSentRuntimeKeyRef.current,
        clearLastSentRuntimeKey: () => {
          lastSentRuntimeKeyRef.current = '';
        },
        markRuntimeKeySent: (nextRuntimeKey: string) => {
          lastSentRuntimeKeyRef.current = nextRuntimeKey;
        },
      }),
    [
      contextRegistry,
      contextRegistryKey,
      latestProductValues,
      runtimeDebounceMs,
      runtimePatternIds,
      runtimeValues,
      runtimeValuesKey,
      setRuntimeFieldIssues,
      source,
      validationScope,
      validatorEnabled,
      values,
    ]
  );
};
