'use client';

import { useCallback } from 'react';

import { buildCombinedOcrText } from '@/features/case-resolver/utils/caseResolverUtils';
import {
  deriveDocumentContentSync,
  toStorageDocumentValue,
} from '@/features/document-editor/public';
import type {
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverScanSlot,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import type { Toast } from '@/shared/contracts/ui';
import type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';

import {
  CASE_RESOLVER_SETTINGS_KEY,
  DEFAULT_CASE_RESOLVER_OCR_PROMPT,
  parseCaseResolverSettings,
} from '../settings';
import {
  CASE_RESOLVER_OCR_JOB_POLL_INTERVAL_MS,
  CASE_RESOLVER_OCR_JOB_TIMEOUT_MS,
  sleep,
} from './useCaseResolverState.helpers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';



export function useCaseResolverStateOcrActions({
  settingsStoreRef,
  toast,
  updateWorkspace,
  workspace,
  editingDocumentDraft,
  setEditingDocumentDraft,
  setIsUploadingScanDraftFiles,
  setUploadingScanSlotId,
  treeSaveToast,
}: {
  settingsStoreRef: React.MutableRefObject<SettingsStoreValue>;
  toast: Toast;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: {
      persistToast?: string;
      persistNow?: boolean;
      mutationId?: string;
      source?: string;
      skipNormalization?: boolean;
    }
  ) => void;
  workspace: CaseResolverWorkspace;
  editingDocumentDraft: CaseResolverFileEditDraft | null;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  setIsUploadingScanDraftFiles: React.Dispatch<React.SetStateAction<boolean>>;
  setUploadingScanSlotId: React.Dispatch<React.SetStateAction<string | null>>;
  treeSaveToast: string;
}) {
  const createCaseResolverOcrCorrelationId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `case-resolver-ocr-${crypto.randomUUID()}`;
    }
    return `case-resolver-ocr-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
  }, []);

  const resolveRuntimeScanOcrSettings = useCallback(
    (options?: {
      modelOverride?: string | null;
      promptOverride?: string | null;
    }): { model: string; prompt: string } => {
      const runtimeCaseResolverSettings = parseCaseResolverSettings(
        settingsStoreRef.current.get(CASE_RESOLVER_SETTINGS_KEY)
      );
      const modelOverride = options?.modelOverride?.trim() ?? '';
      const promptOverride = options?.promptOverride?.trim() ?? '';
      return {
        model:
          modelOverride ||
          runtimeCaseResolverSettings.ocrModel.trim() ||
          (settingsStoreRef.current.get('openai_model') ?? '').trim(),
        prompt:
          promptOverride ||
          runtimeCaseResolverSettings.ocrPrompt.trim() ||
          DEFAULT_CASE_RESOLVER_OCR_PROMPT,
      };
    },
    [settingsStoreRef]
  );

  const enqueueImageOcrRuntimeJob = useCallback(
    async (input: {
      filepath: string;
      runtime: { model: string; prompt: string };
    }): Promise<string> => {
      const correlationId = createCaseResolverOcrCorrelationId();
      const response = await fetch('/api/case-resolver/ocr/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
        },
        body: JSON.stringify({
          filepath: input.filepath,
          model: input.runtime.model,
          prompt: input.runtime.prompt,
          correlationId,
        }),
      });
      if (!response.ok) {
        const fallbackMessage = `Failed to queue OCR runtime job (${response.status})`;
        const errorBody = await response.text();
        throw new Error(errorBody || fallbackMessage);
      }
      const payload = (await response.json()) as {
        job?: { id?: unknown } | null;
      };
      const jobIdRaw = payload.job?.id;
      if (typeof jobIdRaw !== 'string' || jobIdRaw.trim().length === 0) {
        throw new Error('OCR runtime job id was not returned.');
      }
      return jobIdRaw.trim();
    },
    [createCaseResolverOcrCorrelationId]
  );

  const pollImageOcrRuntimeJob = useCallback(async (jobId: string): Promise<string> => {
    const startedAt = Date.now();
    while (Date.now() - startedAt <= CASE_RESOLVER_OCR_JOB_TIMEOUT_MS) {
      const response = await fetch(`/api/case-resolver/ocr/jobs/${encodeURIComponent(jobId)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) {
        const fallbackMessage = `Failed to read OCR runtime job (${response.status})`;
        const errorBody = await response.text();
        throw new Error(errorBody || fallbackMessage);
      }

      const payload = (await response.json()) as {
        job?: {
          status?: unknown;
          resultText?: unknown;
          errorMessage?: unknown;
        } | null;
      };
      const status =
        typeof payload.job?.status === 'string' ? payload.job.status.trim().toLowerCase() : '';

      if (status === 'completed') {
        return typeof payload.job?.resultText === 'string' ? payload.job.resultText.trim() : '';
      }
      if (status === 'failed') {
        const errorMessage = payload.job?.errorMessage;
        throw new Error(
          typeof errorMessage === 'string' && errorMessage.trim().length > 0
            ? errorMessage.trim()
            : 'OCR runtime job failed.'
        );
      }

      await sleep(CASE_RESOLVER_OCR_JOB_POLL_INTERVAL_MS);
    }

    throw new Error('OCR runtime job timed out.');
  }, []);

  const handleRunScanFileOcr = useCallback(
    async (fileId: string): Promise<void> => {
      const targetFile = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === fileId
      );
      if (targetFile?.fileType !== 'scanfile') {
        throw new Error('Scan file no longer exists.');
      }
      if (targetFile.isLocked) {
        throw new Error('Document is locked. Unlock it before running OCR.');
      }
      const draftScanSlots =
        editingDocumentDraft?.id === fileId && editingDocumentDraft.fileType === 'scanfile'
          ? editingDocumentDraft.scanSlots
          : null;
      const scanSlotsForOcr =
        draftScanSlots && draftScanSlots.length > 0 ? draftScanSlots : targetFile.scanSlots;

      if (scanSlotsForOcr.length === 0) {
        toast('Upload at least one image or PDF to this file before running OCR.', {
          variant: 'warning',
        });
        return;
      }

      setIsUploadingScanDraftFiles(true);
      setUploadingScanSlotId('all');

      try {
        const runtime = resolveRuntimeScanOcrSettings();
        const nextSlots: CaseResolverScanSlot[] = [];
        const failedSlots: string[] = [];
        let successfulSlots = 0;

        for (let index = 0; index < scanSlotsForOcr.length; index += 1) {
          const slot = scanSlotsForOcr[index];
          if (!slot) continue;
          setUploadingScanSlotId(slot.id);
          if (!slot.filepath) {
            const missingFilepathMessage = 'Missing file path.';
            nextSlots.push({
              ...slot,
              ocrError: missingFilepathMessage,
            });
            failedSlots.push(`${slot.name || `Slot ${index + 1}`}: ${missingFilepathMessage}`);
            continue;
          }
          try {
            const runtimeJobId = await enqueueImageOcrRuntimeJob({
              filepath: slot.filepath,
              runtime,
            });
            const extractedText = await pollImageOcrRuntimeJob(runtimeJobId);
            nextSlots.push({
              ...slot,
              ocrText: extractedText,
              ocrError: null,
            });
            successfulSlots += 1;
          } catch (error: unknown) {
            logClientError(error);
            const message = error instanceof Error ? error.message : 'OCR failed';
            nextSlots.push(slot);
            failedSlots.push(`${slot.name || `Slot ${index + 1}`}: ${message}`);
            if (nextSlots.length > 0) {
              const lastIndex = nextSlots.length - 1;
              const currentSlot = nextSlots[lastIndex];
              if (currentSlot) {
                nextSlots[lastIndex] = {
                  ...currentSlot,
                  ocrError: message,
                };
              }
            }
          }
        }

        if (successfulSlots > 0) {
          let didPersistOcrResult = false;
          let ocrPersistBlockedByLock = false;
          updateWorkspace(
            (current: CaseResolverWorkspace) => {
              const now = new Date().toISOString();
              let didUpdate = false;
              const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
                if (file.id !== fileId || file.fileType !== 'scanfile') return file;
                if (file.isLocked) {
                  ocrPersistBlockedByLock = true;
                  return file;
                }
                didUpdate = true;
                const mergedText = buildCombinedOcrText(nextSlots);
                const canonicalDocument = deriveDocumentContentSync({
                  mode: 'markdown',
                  value: mergedText,
                });
                const storedDocumentContent = toStorageDocumentValue(canonicalDocument);
                const nextOriginalDocumentContent =
                  file.activeDocumentVersion === 'original'
                    ? storedDocumentContent
                    : file.originalDocumentContent;
                const nextExplodedDocumentContent =
                  file.activeDocumentVersion === 'exploded'
                    ? storedDocumentContent
                    : file.explodedDocumentContent;
                const nextContentVersion =
                  ((): number => {
                    const val = file.documentContentVersion;
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string') {
                      const parsed = Number.parseInt(val, 10);
                      return Number.isNaN(parsed) ? 0 : parsed;
                    }
                    return 0;
                  })() + 1;
                return {
                  ...file,
                  scanSlots: nextSlots,
                  scanOcrModel: runtime.model,
                  scanOcrPrompt: runtime.prompt,
                  editorType: canonicalDocument.mode,
                  documentContentVersion: nextContentVersion,
                  documentContent: storedDocumentContent,
                  documentContentMarkdown: canonicalDocument.markdown,
                  documentContentHtml: canonicalDocument.html,
                  documentContentPlainText: canonicalDocument.plainText,
                  originalDocumentContent: nextOriginalDocumentContent,
                  explodedDocumentContent: nextExplodedDocumentContent,
                  documentConversionWarnings: canonicalDocument.warnings,
                  lastContentConversionAt: now,
                  updatedAt: now,
                };
              });
              didPersistOcrResult = didUpdate;
              if (!didUpdate) return current;
              return {
                ...current,
                files: nextFiles,
              };
            },
            { persistToast: treeSaveToast }
          );
          if (didPersistOcrResult) {
            setEditingDocumentDraft((current) => {
              if (current?.id !== fileId || current?.fileType !== 'scanfile') return current;
              if (current.isLocked) return current;
              const now = new Date().toISOString();
              const mergedText = buildCombinedOcrText(nextSlots);
              const canonicalDocument = deriveDocumentContentSync({
                mode: 'markdown',
                value: mergedText,
              });
              const storedDocumentContent = toStorageDocumentValue(canonicalDocument);
              const nextOriginalDocumentContent: string =
                current.activeDocumentVersion === 'original'
                  ? storedDocumentContent
                  : (current.originalDocumentContent ?? '');
              const nextExplodedDocumentContent: string =
                current.activeDocumentVersion === 'exploded'
                  ? storedDocumentContent
                  : (current.explodedDocumentContent ?? '');
              const nextBaseVersion =
                ((): number => {
                  const val = current.baseDocumentContentVersion;
                  if (typeof val === 'number') return val;
                  if (typeof val === 'string') {
                    const parsed = Number.parseInt(val, 10);
                    return Number.isNaN(parsed) ? 0 : parsed;
                  }
                  return 0;
                })() + 1;
              const nextContentVersion =
                ((): number => {
                  const val = current.documentContentVersion;
                  if (typeof val === 'number') return val;
                  if (typeof val === 'string') {
                    const parsed = Number.parseInt(val, 10);
                    return Number.isNaN(parsed) ? 0 : parsed;
                  }
                  return 0;
                })() + 1;
              return {
                ...current,
                scanSlots: nextSlots,
                scanOcrModel: runtime.model,
                scanOcrPrompt: runtime.prompt,
                editorType: canonicalDocument.mode,
                baseDocumentContentVersion: nextBaseVersion,
                documentContentVersion: nextContentVersion,
                documentContent: storedDocumentContent,
                documentContentMarkdown: canonicalDocument.markdown,
                documentContentHtml: canonicalDocument.html,
                documentContentPlainText: canonicalDocument.plainText,
                originalDocumentContent: nextOriginalDocumentContent,
                explodedDocumentContent: nextExplodedDocumentContent,
                documentConversionWarnings: canonicalDocument.warnings,
                lastContentConversionAt: now,
                updatedAt: now,
              };
            });
            toast('OCR finished.', { variant: 'success' });
          } else if (ocrPersistBlockedByLock) {
            toast('Document was locked before OCR output could be applied.', {
              variant: 'warning',
            });
          }
        }

        if (failedSlots.length > 0) {
          toast(
            failedSlots.length === 1
              ? (failedSlots[0] ?? 'OCR failed for one file.')
              : `${failedSlots.length} files failed during OCR.`,
            { variant: 'error' }
          );
        }
      } finally {
        setUploadingScanSlotId(null);
        setIsUploadingScanDraftFiles(false);
      }
    },
    [
      editingDocumentDraft,
      enqueueImageOcrRuntimeJob,
      pollImageOcrRuntimeJob,
      resolveRuntimeScanOcrSettings,
      setEditingDocumentDraft,
      setIsUploadingScanDraftFiles,
      setUploadingScanSlotId,
      toast,
      treeSaveToast,
      updateWorkspace,
      workspace.files,
    ]
  );

  return {
    handleRunScanFileOcr,
    resolveRuntimeScanOcrSettings,
    enqueueImageOcrRuntimeJob,
    pollImageOcrRuntimeJob,
  };
}
