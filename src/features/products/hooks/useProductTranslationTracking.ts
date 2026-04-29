'use client';

import { useCallback, useEffect, useState } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormParameters } from '@/features/products/context/ProductFormParameterContext';
import {
  extractTranslationEnPlFromAiPathRunDetail,
  type TranslationEnPlAiPathResult,
} from '@/features/products/lib/extractTranslationEnPlFromAiPathRunDetail';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { getAiPathRun } from '@/shared/lib/ai-paths/api/client';
import { subscribeToTrackedAiPathRun, type TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import { isTranslationEnPlTriggerButton } from '../lib/ai-trigger-buttons';

type TranslationRunIdSetter = React.Dispatch<React.SetStateAction<string | null>>;

type ProductTranslationFormHandlers = {
  applyLocalizedParameterValues: ReturnType<
    typeof useProductFormParameters
  >['applyLocalizedParameterValues'];
  setValue: ReturnType<typeof useProductFormCore>['setValue'];
};

const clearPendingTranslationRun = (
  setPendingTranslationRunId: TranslationRunIdSetter,
  trackedRunId: string
): void => {
  setPendingTranslationRunId((current) => (current === trackedRunId ? null : current));
};

const applyTranslationResult = (
  translationResult: TranslationEnPlAiPathResult | null,
  handlers: ProductTranslationFormHandlers
): void => {
  if (translationResult === null) {
    return;
  }

  const descriptionPl = translationResult.descriptionPl ?? '';
  if (descriptionPl.length > 0) {
    handlers.setValue('description_pl', descriptionPl, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  if (translationResult.parameterTranslations.length > 0) {
    handlers.applyLocalizedParameterValues(
      translationResult.parameterTranslations.map((entry) => ({
        parameterId: entry.parameterId,
        languageCode: 'pl',
        value: entry.value,
      }))
    );
  }
};

const resolveCompletedTranslationResult = async (
  snapshot: TrackedAiPathRunSnapshot,
  trackedRunId: string,
  isActive: () => boolean
): Promise<TranslationEnPlAiPathResult | null> => {
  const streamedTranslation = snapshot.run !== null && snapshot.run !== undefined
    ? extractTranslationEnPlFromAiPathRunDetail({ run: snapshot.run })
    : null;
  if (streamedTranslation !== null) {
    return streamedTranslation;
  }

  const response = await getAiPathRun(trackedRunId, { timeoutMs: 60_000 });
  if (isActive() === false || response.ok === false) {
    return null;
  }

  return extractTranslationEnPlFromAiPathRunDetail(response.data);
};

const handleSubmitTranslationSnapshot = async ({
  handlers,
  isActive,
  setPendingTranslationRunId,
  snapshot,
  trackedRunId,
}: {
  handlers: ProductTranslationFormHandlers;
  isActive: () => boolean;
  setPendingTranslationRunId: TranslationRunIdSetter;
  snapshot: TrackedAiPathRunSnapshot;
  trackedRunId: string;
}): Promise<void> => {
  if (snapshot.status !== 'completed') {
    if (isActive() === true) {
      clearPendingTranslationRun(setPendingTranslationRunId, trackedRunId);
    }
    return;
  }

  const translationResult = await resolveCompletedTranslationResult(snapshot, trackedRunId, isActive);
  if (isActive() === false) {
    return;
  }

  applyTranslationResult(translationResult, handlers);
  clearPendingTranslationRun(setPendingTranslationRunId, trackedRunId);
};

export function useProductTranslationTracking(args: {
  shouldApplyNormalizeResultLocally: boolean;
}): {
  pendingTranslationRunId: string | null;
  setPendingTranslationRunId: React.Dispatch<React.SetStateAction<string | null>>;
  handleTranslationRunQueued: (button: AiTriggerButtonRecord, runId: string) => void;
} {
  const { shouldApplyNormalizeResultLocally } = args;
  const { setValue } = useProductFormCore();
  const { applyLocalizedParameterValues } = useProductFormParameters();
  const [pendingTranslationRunId, setPendingTranslationRunId] = useState<string | null>(null);

  const handleTranslationRunQueued = useCallback((button: AiTriggerButtonRecord, runId: string) => {
    if (shouldApplyNormalizeResultLocally && isTranslationEnPlTriggerButton(button)) {
      setPendingTranslationRunId(runId);
    }
  }, [shouldApplyNormalizeResultLocally]);

  useEffect(() => {
    if (pendingTranslationRunId === null) return undefined;

    let active = true;
    let terminalHandled = false;
    const trackedRunId = pendingTranslationRunId;

    const unsubscribe = subscribeToTrackedAiPathRun(trackedRunId, (snapshot) => {
      if (active === false || terminalHandled === true || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;

      handleSubmitTranslationSnapshot({
        handlers: { applyLocalizedParameterValues, setValue },
        isActive: () => active,
        setPendingTranslationRunId,
        snapshot,
        trackedRunId,
      }).catch((error: unknown) => {
          void ErrorSystem.captureException(error);
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyLocalizedParameterValues, pendingTranslationRunId, setValue]);

  return {
    pendingTranslationRunId,
    setPendingTranslationRunId,
    handleTranslationRunQueued,
  };
}
