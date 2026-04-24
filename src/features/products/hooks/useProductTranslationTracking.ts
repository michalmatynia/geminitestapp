'use client';

import { useCallback, useEffect, useState } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormParameters } from '@/features/products/context/ProductFormParameterContext';
import { extractTranslationEnPlFromAiPathRunDetail } from '@/features/products/lib/extractTranslationEnPlFromAiPathRunDetail';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { getAiPathRun } from '@/shared/lib/ai-paths/api/client';
import { subscribeToTrackedAiPathRun, type TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import { isTranslationEnPlTriggerButton } from '../lib/ai-trigger-buttons';

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

  const handleSubmitTranslationSnapshot = useCallback(
    async (
      snapshot: TrackedAiPathRunSnapshot,
      trackedRunId: string,
      isActive: () => boolean
    ): Promise<void> => {
      if (snapshot.status !== 'completed') {
        if (isActive() === true) {
          setPendingTranslationRunId((current) => (current === trackedRunId ? null : current));
        }
        return;
      }

      const streamedTranslation = (snapshot.run !== null && snapshot.run !== undefined)
        ? extractTranslationEnPlFromAiPathRunDetail({ run: snapshot.run })
        : null;
      let translationResult = streamedTranslation;

      if (translationResult === null) {
        const response = await getAiPathRun(trackedRunId, { timeoutMs: 60_000 });
        if (isActive() === false) return;
        if (response.ok === false) {
          setPendingTranslationRunId((current) => (current === trackedRunId ? null : current));
          return;
        }
        translationResult = extractTranslationEnPlFromAiPathRunDetail(response.data);
      }

      if (isActive() === false) return;

      if (translationResult !== null && (translationResult.descriptionPl ?? '') !== '') {
        setValue('description_pl', translationResult.descriptionPl, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }

      if (translationResult !== null && translationResult.parameterTranslations.length > 0) {
        applyLocalizedParameterValues(
          translationResult.parameterTranslations.map((entry) => ({
            parameterId: entry.parameterId,
            languageCode: 'pl',
            value: entry.value,
          }))
        );
      }

      setPendingTranslationRunId((current) => (current === trackedRunId ? null : current));
    },
    [applyLocalizedParameterValues, setValue]
  );

  useEffect(() => {
    if (pendingTranslationRunId === null) return;

    let active = true;
    let terminalHandled = false;
    const trackedRunId = pendingTranslationRunId;

    const unsubscribe = subscribeToTrackedAiPathRun(trackedRunId, (snapshot) => {
      if (active === false || terminalHandled === true || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;

      handleSubmitTranslationSnapshot(snapshot, trackedRunId, () => active).catch((error: unknown) => {
        void ErrorSystem.captureException(error);
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [handleSubmitTranslationSnapshot, pendingTranslationRunId]);

  return {
    pendingTranslationRunId,
    setPendingTranslationRunId,
    handleTranslationRunQueued,
  };
}
