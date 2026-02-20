import { useCallback, useRef } from 'react';

import {
  deriveDocumentContentSync,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';

import {
  CASE_RESOLVER_SETTINGS_KEY,
  DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT,
  DEFAULT_CASE_RESOLVER_OCR_PROMPT,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  inferCaseResolverAssetKind,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverSettings,
} from '../settings';
import {
  CASE_RESOLVER_OCR_JOB_POLL_INTERVAL_MS,
  CASE_RESOLVER_OCR_JOB_TIMEOUT_MS,
  appendOwnedFolderRecords,
  createPlaceholderAssetName,
  createUniqueCaseFileName,
  isLikelyImageFile,
  isLikelyScanInputFile,
  normalizeUploadedCaseResolverFile,
  resolveCaseScopedFolderTarget,
  resolveUploadBaseFolder,
  sleep,
  type CaseResolverUploadedFile,
} from './useCaseResolverState.helpers';
import {
  buildCombinedOcrText,
  createId,
} from '../utils/caseResolverUtils';

import type {
  CaseResolverAssetFile,
  CaseResolverAssetKind,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverScanSlot,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

type CaseResolverToast = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'warning' | 'info' }
) => void;

type SettingsStoreLike = {
  get: (key: string) => string | undefined;
};

type UpdateWorkspaceOptions = {
  persistToast?: string;
  mutationId?: string;
  source?: string;
};

type UpdateWorkspaceFn = (
  updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
  options?: UpdateWorkspaceOptions
) => void;

type UseCaseResolverStateAssetActionsInput = {
  settingsStore: SettingsStoreLike;
  toast: CaseResolverToast;
  updateWorkspace: UpdateWorkspaceFn;
  workspace: CaseResolverWorkspace;
  editingDocumentDraft: CaseResolverFileEditDraft | null;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  setIsUploadingScanDraftFiles: React.Dispatch<React.SetStateAction<boolean>>;
  setUploadingScanSlotId: React.Dispatch<React.SetStateAction<string | null>>;
  defaultTagId: string | null;
  defaultCaseIdentifierId: string | null;
  defaultCategoryId: string | null;
  activeCaseId: string | null;
  requestedCaseStatus: 'loading' | 'ready' | 'missing';
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  treeSaveToast: string;
};

type UseCaseResolverStateAssetActionsResult = {
  handleCreateScanFile: (targetFolderPath: string | null) => void;
  handleCreateNodeFile: (targetFolderPath: string | null) => void;
  handleUploadScanFiles: (fileId: string, files: File[]) => Promise<void>;
  handleRunScanFileOcr: (fileId: string) => Promise<void>;
  handleCreateImageAsset: (targetFolderPath: string | null) => void;
  handleUploadAssets: (files: File[], targetFolderPath: string | null) => Promise<CaseResolverAssetFile[]>;
  handleAttachAssetFile: (
    assetId: string,
    file: File,
    options?: { expectedKind?: CaseResolverAssetKind | null }
  ) => Promise<CaseResolverAssetFile>;
};

export const useCaseResolverStateAssetActions = ({
  settingsStore,
  toast,
  updateWorkspace,
  workspace,
  editingDocumentDraft,
  setEditingDocumentDraft,
  setIsUploadingScanDraftFiles,
  setUploadingScanSlotId,
  defaultTagId,
  defaultCaseIdentifierId,
  defaultCategoryId,
  activeCaseId,
  requestedCaseStatus,
  setSelectedFileId,
  setSelectedFolderPath,
  setSelectedAssetId,
  treeSaveToast,
}: UseCaseResolverStateAssetActionsInput): UseCaseResolverStateAssetActionsResult => {
  const settingsStoreRef = useRef(settingsStore);
  settingsStoreRef.current = settingsStore;
  const createCaseResolverOcrCorrelationId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `case-resolver-ocr-${crypto.randomUUID()}`;
    }
    return `case-resolver-ocr-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
  }, []);

  const uploadSourceFileToCaseResolver = useCallback(
    async (sourceFile: File, targetFolderPath: string): Promise<CaseResolverUploadedFile> => {
      const uploadFormData = new FormData();
      uploadFormData.append('folder', targetFolderPath);
      uploadFormData.append('file', sourceFile);
      const uploadResponse = await fetch('/api/case-resolver/assets/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadResponse.ok) {
        const fallbackMessage = `Failed to upload file (${uploadResponse.status})`;
        const errorBody = await uploadResponse.text();
        throw new Error(errorBody || fallbackMessage);
      }
      const uploadPayload = (await uploadResponse.json()) as unknown;
      const firstEntry: unknown = Array.isArray(uploadPayload)
        ? (uploadPayload[0] ?? null)
        : uploadPayload;
      return normalizeUploadedCaseResolverFile(firstEntry, sourceFile, targetFolderPath);
    },
    []
  );

  const resolveRuntimeScanOcrSettings = useCallback(
    (options?: { modelOverride?: string | null; promptOverride?: string | null }): { model: string; prompt: string } => {
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
    []
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

  const pollImageOcrRuntimeJob = useCallback(
    async (jobId: string): Promise<string> => {
      const startedAt = Date.now();
      while (Date.now() - startedAt <= CASE_RESOLVER_OCR_JOB_TIMEOUT_MS) {
        const response = await fetch(
          `/api/case-resolver/ocr/jobs/${encodeURIComponent(jobId)}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );
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
          typeof payload.job?.status === 'string'
            ? payload.job.status.trim().toLowerCase()
            : '';

        if (status === 'completed') {
          return typeof payload.job?.resultText === 'string'
            ? payload.job.resultText.trim()
            : '';
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
    },
    []
  );

  const handleCreateScanFile = useCallback((targetFolderPath: string | null): void => {
    const runtimeCaseResolverSettings = parseCaseResolverSettings(
      settingsStoreRef.current.get(CASE_RESOLVER_SETTINGS_KEY)
    );
    if (!activeCaseId) {
      toast(
        requestedCaseStatus === 'loading'
          ? 'Case context is still loading. Please wait.'
          : 'Cannot create image file without a selected case.',
        { variant: 'warning' }
      );
      return;
    }
    let createdImageFile = false;

    updateWorkspace((current) => {
      const folder = resolveCaseScopedFolderTarget({
        targetFolderPath,
        ownerCaseId: activeCaseId,
        folderRecords: current.folderRecords,
      });
      const name = createUniqueCaseFileName({
        files: current.files,
        folder,
        baseName: 'New Image',
      });
      const createdFileId = createId('case-file');
      const createdFile = createCaseResolverFile({
        id: createdFileId,
        fileType: 'scanfile',
        name,
        folder,
        parentCaseId: activeCaseId,
        editorType: 'wysiwyg',
        scanSlots: [],
        scanOcrModel:
          runtimeCaseResolverSettings.ocrModel.trim() ||
          (settingsStoreRef.current.get('openai_model') ?? '').trim(),
        scanOcrPrompt: DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT,
        tagId: defaultTagId,
        caseIdentifierId: defaultCaseIdentifierId,
        categoryId: defaultCategoryId,
      });
      createdImageFile = true;
      return {
        ...current,
        files: [...current.files, createdFile],
        folders: normalizeFolderPaths([...current.folders, folder]),
        folderRecords: appendOwnedFolderRecords({
          records: current.folderRecords,
          folderPath: folder,
          ownerCaseId: activeCaseId,
        }),
      };
    }, { persistToast: treeSaveToast });

    if (createdImageFile) {
      toast('New image file created.', { variant: 'success' });
    }
  }, [
    activeCaseId,
    defaultCaseIdentifierId,
    defaultCategoryId,
    defaultTagId,
    requestedCaseStatus,
    toast,
    treeSaveToast,
    updateWorkspace,
  ]);

  const handleUploadScanFiles = useCallback(
    async (fileId: string, files: File[]): Promise<void> => {
      const targetFile = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === fileId
      );
      if (targetFile?.fileType !== 'scanfile') {
        throw new Error('Scan file no longer exists.');
      }

      const sourceFiles = files.filter(
        (file: File): boolean => file instanceof File && file.size >= 0
      );
      if (sourceFiles.length === 0) return;

      const normalizedFolder = normalizeFolderPath(targetFile.folder);
      const createdSlots: CaseResolverScanSlot[] = [];
      const createdFolders = new Set<string>();
      const failedFiles: string[] = [];

      for (const sourceFile of sourceFiles) {
        if (!isLikelyScanInputFile(sourceFile)) {
          failedFiles.push(
            `${sourceFile.name || 'file'}: Only image and PDF files are supported.`
          );
          continue;
        }
        const inferredKind = inferCaseResolverAssetKind({
          mimeType: sourceFile.type,
          name: sourceFile.name,
        });
        if (inferredKind !== 'image' && inferredKind !== 'pdf') {
          failedFiles.push(
            `${sourceFile.name || 'file'}: Only image and PDF files are supported.`
          );
          continue;
        }
        try {
          const uploadBaseFolder = resolveUploadBaseFolder(normalizedFolder, inferredKind);
          const uploaded = await uploadSourceFileToCaseResolver(sourceFile, uploadBaseFolder);
          createdSlots.push({
            id: createId('scan-slot'),
            name: uploaded.originalName,
            filepath: uploaded.filepath,
            sourceFileId: uploaded.id,
            mimeType: uploaded.mimetype,
            size: uploaded.size,
            ocrText: '',
            ocrError: null,
          });
          createdFolders.add(normalizeFolderPath(uploaded.folder || normalizedFolder));
        } catch (error: unknown) {
          failedFiles.push(
            `${sourceFile.name || 'file'}: ${
              error instanceof Error ? error.message : 'Upload failed'
            }`
          );
        }
      }

      if (createdSlots.length > 0) {
        updateWorkspace((current) => {
          const now = new Date().toISOString();
          let didUpdate = false;
          const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
            if (file.id !== fileId || file.fileType !== 'scanfile') return file;
            didUpdate = true;
            return {
              ...file,
              scanSlots: [...(file.scanSlots ?? []), ...createdSlots],
              updatedAt: now,
            };
          });
          if (!didUpdate) return current;
          return {
            ...current,
            files: nextFiles,
            folders: normalizeFolderPaths([
              ...current.folders,
              ...Array.from(createdFolders),
            ]),
          };
        }, { persistToast: treeSaveToast });
        setEditingDocumentDraft((current) => {
          if (current?.id !== fileId || current?.fileType !== 'scanfile') return current;
          return {
            ...current,
            scanSlots: [...(current.scanSlots ?? []), ...createdSlots],
            updatedAt: new Date().toISOString(),
          };
        });
        toast(
          createdSlots.length === 1
            ? '1 file uploaded to scan file.'
            : `${createdSlots.length} files uploaded to scan file.`,
          { variant: 'success' }
        );
      }

      if (failedFiles.length > 0) {
        toast(
          failedFiles.length === 1
            ? failedFiles[0] ?? 'Failed to upload file.'
            : `${failedFiles.length} files failed to upload.`,
          { variant: 'error' }
        );
      }
    },
    [toast, treeSaveToast, updateWorkspace, uploadSourceFileToCaseResolver, workspace.files, setEditingDocumentDraft]
  );

  const handleRunScanFileOcr = useCallback(
    async (fileId: string): Promise<void> => {
      const targetFile = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === fileId
      );
      if (targetFile?.fileType !== 'scanfile') {
        throw new Error('Scan file no longer exists.');
      }
      const draftScanSlots =
        editingDocumentDraft?.id === fileId && editingDocumentDraft.fileType === 'scanfile'
          ? editingDocumentDraft.scanSlots
          : null;
      const scanSlotsForOcr =
        draftScanSlots && draftScanSlots.length > 0
          ? draftScanSlots
          : targetFile.scanSlots;

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
            const message =
              error instanceof Error ? error.message : 'OCR failed';
            nextSlots.push(slot);
            failedSlots.push(
              `${slot.name || `Slot ${index + 1}`}: ${
                message
              }`
            );
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
          updateWorkspace((current) => {
            const now = new Date().toISOString();
            let didUpdate = false;
            const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
              if (file.id !== fileId || file.fileType !== 'scanfile') return file;
              didUpdate = true;
              const mergedText = buildCombinedOcrText(nextSlots);
              const canonicalDocument = deriveDocumentContentSync({
                mode: 'wysiwyg',
                value: ensureSafeDocumentHtml(mergedText),
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
              return {
                ...file,
                scanSlots: nextSlots,
                scanOcrModel: runtime.model,
                scanOcrPrompt: runtime.prompt,
                editorType: canonicalDocument.mode,
                documentContentVersion: file.documentContentVersion + 1,
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
            if (!didUpdate) return current;
            return {
              ...current,
              files: nextFiles,
            };
          }, { persistToast: treeSaveToast });
          setEditingDocumentDraft((current) => {
            if (current?.id !== fileId || current?.fileType !== 'scanfile') return current;
            const now = new Date().toISOString();
            const mergedText = buildCombinedOcrText(nextSlots);
            const canonicalDocument = deriveDocumentContentSync({
              mode: 'wysiwyg',
              value: ensureSafeDocumentHtml(mergedText),
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
            return {
              ...current,
              scanSlots: nextSlots,
              scanOcrModel: runtime.model,
              scanOcrPrompt: runtime.prompt,
              editorType: canonicalDocument.mode,
              baseDocumentContentVersion: (current.baseDocumentContentVersion ?? 0) + 1,
              documentContentVersion: (current.documentContentVersion ?? 0) + 1,
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
          toast(
            successfulSlots === 1
              ? 'OCR finished for 1 file.'
              : `OCR finished for ${successfulSlots} files.`,
            { variant: 'success' }
          );
        }

        if (failedSlots.length > 0) {
          toast(
            failedSlots.length === 1
              ? failedSlots[0] ?? 'OCR failed for one file.'
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

  const handleCreateImageAsset = useCallback((targetFolderPath: string | null): void => {
    const createdAssetId = createId('asset');
    const ownerCaseId = activeCaseId;
    if (!ownerCaseId) {
      toast(
        requestedCaseStatus === 'loading'
          ? 'Case context is still loading. Please wait.'
          : 'Cannot create image placeholder without a selected case.',
        { variant: 'warning' }
      );
      return;
    }
    updateWorkspace((current) => {
      const folder = resolveCaseScopedFolderTarget({
        targetFolderPath,
        ownerCaseId,
        folderRecords: current.folderRecords,
      });
      const name = createPlaceholderAssetName({
        assets: current.assets,
        folder,
        baseName: 'New Image',
      });
      const createdAsset = createCaseResolverAssetFile({
        id: createdAssetId,
        name,
        folder,
        kind: 'image',
      });
      return {
        ...current,
        assets: [...current.assets, createdAsset],
        folders: normalizeFolderPaths([...current.folders, folder]),
        folderRecords: appendOwnedFolderRecords({
          records: current.folderRecords,
          folderPath: folder,
          ownerCaseId,
        }),
      };
    }, { persistToast: treeSaveToast });
    toast('Image placeholder created. Upload the file when ready.', { variant: 'success' });
  }, [activeCaseId, requestedCaseStatus, toast, treeSaveToast, updateWorkspace]);

  const handleCreateNodeFile = useCallback((targetFolderPath: string | null): void => {
    const ownerCaseId = activeCaseId;
    if (!ownerCaseId) {
      toast(
        requestedCaseStatus === 'loading'
          ? 'Case context is still loading. Please wait.'
          : 'Cannot create node file without a selected case.',
        { variant: 'warning' }
      );
      return;
    }

    let createdAssetId: string | null = null;
    updateWorkspace((current) => {
      const folder = resolveCaseScopedFolderTarget({
        targetFolderPath,
        ownerCaseId,
        folderRecords: current.folderRecords,
      });
      const name = createPlaceholderAssetName({
        assets: current.assets,
        folder,
        baseName: 'New Node File',
      });
      const newId = createId('asset');
      const createdAsset = createCaseResolverAssetFile({
        id: newId,
        name,
        folder,
        kind: 'node_file',
        sourceFileId: ownerCaseId,
        textContent: JSON.stringify(
          {
            kind: 'case_resolver_node_file_snapshot_v1',
            source: 'manual',
            nodes: [],
            edges: [],
            nodeFileMeta: {},
          },
          null,
          2
        ),
      });
      createdAssetId = newId;
      return {
        ...current,
        assets: [...current.assets, createdAsset],
        folders: normalizeFolderPaths([...current.folders, folder]),
        folderRecords: appendOwnedFolderRecords({
          records: current.folderRecords,
          folderPath: folder,
          ownerCaseId,
        }),
      };
    }, { persistToast: treeSaveToast });

    if (createdAssetId) {
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(createdAssetId);
      toast('Node file created.', { variant: 'success' });
    }
  }, [
    activeCaseId,
    requestedCaseStatus,
    setSelectedAssetId,
    setSelectedFileId,
    setSelectedFolderPath,
    toast,
    treeSaveToast,
    updateWorkspace,
  ]);

  const handleUploadAssets = useCallback(
    async (
      files: File[],
      targetFolderPath: string | null
    ): Promise<CaseResolverAssetFile[]> => {
      const sourceFiles = files.filter(
        (file: File): boolean => file instanceof File && file.size >= 0
      );
      if (sourceFiles.length === 0) return [];

      const normalizedFolder = normalizeFolderPath(targetFolderPath ?? '');
      const createdAssets: CaseResolverAssetFile[] = [];
      const failedFiles: string[] = [];

      for (const sourceFile of sourceFiles) {
        try {
          const inferredKind = inferCaseResolverAssetKind({
            mimeType: sourceFile.type,
            name: sourceFile.name,
          });
          const uploadBaseFolder = resolveUploadBaseFolder(normalizedFolder, inferredKind);
          const uploaded = await uploadSourceFileToCaseResolver(sourceFile, uploadBaseFolder);
          const fallbackName = sourceFile.name.trim() || `File ${createdAssets.length + 1}`;
          const assetName = uploaded.originalName.trim() || fallbackName;
          createdAssets.push(
            createCaseResolverAssetFile({
              id: createId('asset'),
              name: assetName,
              folder: uploaded.folder || normalizedFolder,
              kind: uploaded.kind,
              filepath: uploaded.filepath,
              sourceFileId: uploaded.id,
              mimeType: uploaded.mimetype,
              size: uploaded.size,
            })
          );
        } catch (error: unknown) {
          failedFiles.push(
            `${sourceFile.name || 'file'}: ${error instanceof Error ? error.message : 'Upload failed'}`
          );
        }
      }

      if (createdAssets.length > 0) {
        updateWorkspace((current) => ({
          ...current,
          assets: [...current.assets, ...createdAssets],
          folders: normalizeFolderPaths([
            ...current.folders,
            ...createdAssets.map((asset: CaseResolverAssetFile): string => asset.folder),
          ]),
        }), { persistToast: treeSaveToast });
      }

      if (failedFiles.length > 0) {
        toast(
          failedFiles.length === 1
            ? failedFiles[0] ?? 'Failed to upload file.'
            : `${failedFiles.length} files failed to upload.`,
          { variant: 'error' }
        );
      }

      if (createdAssets.length === 0 && failedFiles.length > 0) {
        throw new Error(failedFiles[0] ?? 'Failed to upload files.');
      }

      return createdAssets;
    },
    [toast, treeSaveToast, updateWorkspace, uploadSourceFileToCaseResolver]
  );

  const handleAttachAssetFile = useCallback(
    async (
      assetId: string,
      file: File,
      options?: { expectedKind?: CaseResolverAssetKind | null }
    ): Promise<CaseResolverAssetFile> => {
      const currentAsset = workspace.assets.find(
        (asset: CaseResolverAssetFile): boolean => asset.id === assetId
      );
      if (!currentAsset) {
        throw new Error('Asset placeholder no longer exists.');
      }

      const expectedKind = options?.expectedKind ?? currentAsset.kind;
      if (expectedKind === 'image' && !isLikelyImageFile(file)) {
        throw new Error('Please upload an image file for this image placeholder.');
      }

      const uploadFolder = normalizeFolderPath(currentAsset.folder);
      const uploadBaseFolder = resolveUploadBaseFolder(uploadFolder, expectedKind);
      const uploaded = await uploadSourceFileToCaseResolver(file, uploadBaseFolder);
      const uploadedKind = inferCaseResolverAssetKind({
        kind: uploaded.kind,
        mimeType: uploaded.mimetype,
        name: uploaded.originalName,
      });
      if (
        expectedKind &&
        expectedKind !== 'file' &&
        uploadedKind !== expectedKind
      ) {
        throw new Error(`Uploaded file type does not match this ${expectedKind} placeholder.`);
      }

      const now = new Date().toISOString();
      const resolvedKind = expectedKind && expectedKind !== 'file'
        ? expectedKind
        : uploadedKind;
      const updatedAsset: CaseResolverAssetFile = {
        ...currentAsset,
        folder: normalizeFolderPath(uploaded.folder || uploadFolder),
        kind: resolvedKind,
        filepath: uploaded.filepath,
        sourceFileId: uploaded.id,
        mimeType: uploaded.mimetype,
        size: uploaded.size,
        updatedAt: now,
      };
      updateWorkspace((current) => {
        let didUpdate = false;
        const nextAssets = current.assets.map((asset) => {
          if (asset.id !== assetId) return asset;
          didUpdate = true;
          return updatedAsset;
        });
        if (!didUpdate) return current;
        return {
          ...current,
          assets: nextAssets,
          folders: normalizeFolderPaths([
            ...current.folders,
            normalizeFolderPath(uploaded.folder || uploadFolder),
          ]),
        };
      }, { persistToast: treeSaveToast });

      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(updatedAsset.id);
      toast('File attached to image placeholder.', { variant: 'success' });
      return updatedAsset;
    },
    [
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      toast,
      treeSaveToast,
      updateWorkspace,
      uploadSourceFileToCaseResolver,
      workspace.assets,
    ]
  );

  return {
    handleCreateScanFile,
    handleCreateNodeFile,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleCreateImageAsset,
    handleUploadAssets,
    handleAttachAssetFile,
  };
};
