'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type {
  CaptureSegmentationRecordResult,
  PromptExploderSegmentationRecord,
} from '@/shared/contracts/prompt-exploder';
import type { Toast } from '@/shared/contracts/ui/base';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  appendPromptExploderSegmentationRecord,
  buildPromptExploderSegmentationRecord,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_MAX_RECORDS,
} from '../../segmentation-library';
import type { DocumentState } from '../DocumentContext';

export const useSegmentationRecordCapture = ({
  activeValidationRuleStackId,
  activeValidationScope,
  documentState,
  parsedSegmentationRecords,
  persistSegmentationRecords,
  promptText,
  returnTarget,
  setSelectedSegmentationRecordId,
  toast,
}: {
  activeValidationRuleStackId: string;
  activeValidationScope: string;
  documentState: DocumentState['documentState'];
  parsedSegmentationRecords: PromptExploderSegmentationRecord[];
  persistSegmentationRecords: (records: PromptExploderSegmentationRecord[]) => Promise<boolean>;
  promptText: DocumentState['promptText'];
  returnTarget: DocumentState['returnTarget'];
  setSelectedSegmentationRecordId: Dispatch<SetStateAction<string | null>>;
  toast: Toast;
}) =>
  useCallback(async (): Promise<CaptureSegmentationRecordResult> => {
    if (!promptText.trim()) {
      return {
        ok: false,
        captured: false,
        persisted: false,
        reason: 'missing_prompt',
      };
    }

    if (!documentState) {
      return {
        ok: false,
        captured: false,
        persisted: false,
        reason: 'missing_document',
      };
    }

    const now = new Date().toISOString();
    const nextRecord = buildPromptExploderSegmentationRecord({
      promptText,
      documentState,
      now,
      returnTarget,
      validationScope: activeValidationScope,
      validationRuleStack: activeValidationRuleStackId,
    });
    if (!nextRecord) {
      return {
        ok: false,
        captured: false,
        persisted: false,
        reason: 'missing_document',
      };
    }

    const nextRecords = appendPromptExploderSegmentationRecord({
      records: parsedSegmentationRecords,
      nextRecord,
      maxRecords: PROMPT_EXPLODER_SEGMENTATION_LIBRARY_MAX_RECORDS,
    });

    try {
      const persisted = await persistSegmentationRecords(nextRecords);
      if (persisted) {
        setSelectedSegmentationRecordId(nextRecord.id);
      }

      return {
        ok: true,
        captured: true,
        persisted,
        reason: 'manual_save' as const,
        ...(persisted ? { recordId: nextRecord.id } : {}),
      };
    } catch (error) {
      logClientError(error);
      toast(
        error instanceof Error
          ? `Failed to capture segmentation context: ${error.message}`
          : 'Failed to capture segmentation context.',
        { variant: 'warning' }
      );

      return {
        ok: false,
        captured: true,
        persisted: false,
        reason: 'persist_failed',
        recordId: nextRecord.id,
      };
    }
  }, [
    activeValidationRuleStackId,
    activeValidationScope,
    documentState,
    parsedSegmentationRecords,
    persistSegmentationRecords,
    promptText,
    returnTarget,
    setSelectedSegmentationRecordId,
    toast,
  ]);
