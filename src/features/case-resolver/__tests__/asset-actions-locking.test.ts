import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCaseResolverStateAssetActions } from '@/features/case-resolver/hooks/useCaseResolverState.asset-actions';
import {
  createCaseResolverFile,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';

import type {
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const createJsonResponse = (payload: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => (
      typeof payload === 'string' ? payload : JSON.stringify(payload)
    ),
  }) as Response;

const createMutableState = <T,>(initial: T): {
  get: () => T;
  set: React.Dispatch<React.SetStateAction<T>>;
} => {
  let current = initial;
  const set: React.Dispatch<React.SetStateAction<T>> = (value): void => {
    current =
      typeof value === 'function'
        ? (value as (prev: T) => T)(current)
        : value;
  };
  return {
    get: (): T => current,
    set,
  };
};

const buildHarness = (sourceFile: CaseResolverFile): {
  result: ReturnType<typeof renderHook<typeof useCaseResolverStateAssetActions>>['result'];
  getWorkspace: () => CaseResolverWorkspace;
  setWorkspace: (next: CaseResolverWorkspace) => void;
  toast: ReturnType<typeof vi.fn>;
} => {
  let workspace: CaseResolverWorkspace = {
    ...parseCaseResolverWorkspace(null),
    files: [sourceFile],
    activeFileId: sourceFile.id,
  };
  const draftState = createMutableState<CaseResolverFileEditDraft | null>(null);
  const isUploadingState = createMutableState(false);
  const uploadingSlotState = createMutableState<string | null>(null);
  const selectedFileState = createMutableState<string | null>(null);
  const selectedFolderState = createMutableState<string | null>(null);
  const selectedAssetState = createMutableState<string | null>(null);
  const toast = vi.fn();

  const updateWorkspace = (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
  ): void => {
    workspace = updater(workspace);
  };

  const { result } = renderHook(() =>
    useCaseResolverStateAssetActions({
      settingsStore: {
        get: () => undefined,
      },
      toast,
      updateWorkspace,
      workspace,
      editingDocumentDraft: draftState.get(),
      setEditingDocumentDraft: draftState.set,
      setIsUploadingScanDraftFiles: isUploadingState.set,
      setUploadingScanSlotId: uploadingSlotState.set,
      defaultTagId: null,
      defaultCaseIdentifierId: null,
      defaultCategoryId: null,
      activeCaseId: null,
      requestedCaseStatus: 'ready',
      setSelectedFileId: selectedFileState.set,
      setSelectedFolderPath: selectedFolderState.set,
      setSelectedAssetId: selectedAssetState.set,
      treeSaveToast: 'Case Resolver tree changes saved.',
    })
  );

  return {
    result,
    getWorkspace: (): CaseResolverWorkspace => workspace,
    setWorkspace: (next: CaseResolverWorkspace): void => {
      workspace = next;
    },
    toast,
  };
};

const withLockedFile = (workspace: CaseResolverWorkspace, fileId: string): CaseResolverWorkspace => ({
  ...workspace,
  files: workspace.files.map((file) => (
    file.id === fileId ? { ...file, isLocked: true } : file
  )),
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('case resolver asset actions lock races', () => {
  it('does not attach uploaded scan slots when document becomes locked mid-upload', async () => {
    const scanfile = createCaseResolverFile({
      id: 'scan-1',
      fileType: 'scanfile',
      name: 'Scan Document',
      scanSlots: [],
      isLocked: false,
    });
    const harness = buildHarness(scanfile);
    const uploadDeferred = createDeferred<Response>();
    const fetchMock = vi.fn((url: string | URL): Promise<Response> => {
      const resolvedUrl = typeof url === 'string' ? url : url.toString();
      if (resolvedUrl === '/api/case-resolver/assets/upload') {
        return uploadDeferred.promise;
      }
      throw new Error(`Unexpected fetch URL: ${resolvedUrl}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const uploadPromise = harness.result.current.handleUploadScanFiles(
      'scan-1',
      [new File(['image-bytes'], 'scan.png', { type: 'image/png' })]
    );

    harness.setWorkspace(withLockedFile(harness.getWorkspace(), 'scan-1'));
    uploadDeferred.resolve(
      createJsonResponse([
        {
          id: 'asset-upload-1',
          originalName: 'scan.png',
          filepath: '/uploads/case-resolver/images/scan.png',
          mimetype: 'image/png',
          size: 16,
          folder: '',
        },
      ])
    );
    await uploadPromise;

    const finalFile = harness.getWorkspace().files.find((file) => file.id === 'scan-1');
    expect(finalFile?.isLocked).toBe(true);
    expect(finalFile?.scanSlots).toHaveLength(0);
    expect(harness.toast).toHaveBeenCalledWith(
      'Document was locked before uploaded files could be attached.',
      { variant: 'warning' }
    );
  });

  it('does not apply OCR output when document becomes locked mid-run', async () => {
    const scanfile = createCaseResolverFile({
      id: 'scan-1',
      fileType: 'scanfile',
      name: 'Scan Document',
      scanSlots: [
        {
          id: 'slot-1',
          name: 'scan.png',
          filepath: '/uploads/case-resolver/images/scan.png',
          sourceFileId: 'asset-scan-1',
          mimeType: 'image/png',
          size: 32,
          ocrText: '',
          ocrError: null,
        },
      ],
      isLocked: false,
    });
    const harness = buildHarness(scanfile);
    const enqueueDeferred = createDeferred<Response>();
    const fetchMock = vi.fn((url: string | URL): Promise<Response> => {
      const resolvedUrl = typeof url === 'string' ? url : url.toString();
      if (resolvedUrl === '/api/case-resolver/ocr/jobs') {
        return enqueueDeferred.promise;
      }
      if (resolvedUrl === '/api/case-resolver/ocr/jobs/job-1') {
        return Promise.resolve(
          createJsonResponse({
            job: {
              status: 'completed',
              resultText: 'Recognized text from OCR.',
            },
          })
        );
      }
      throw new Error(`Unexpected fetch URL: ${resolvedUrl}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const before = harness.getWorkspace().files.find((file) => file.id === 'scan-1');
    const beforeDocumentContentVersion = before?.documentContentVersion ?? null;
    const beforeOcrText = before?.scanSlots?.[0]?.ocrText ?? '';

    const ocrPromise = harness.result.current.handleRunScanFileOcr('scan-1');

    harness.setWorkspace(withLockedFile(harness.getWorkspace(), 'scan-1'));
    enqueueDeferred.resolve(createJsonResponse({ job: { id: 'job-1' } }));
    await ocrPromise;

    const after = harness.getWorkspace().files.find((file) => file.id === 'scan-1');
    expect(after?.isLocked).toBe(true);
    expect(after?.scanSlots?.[0]?.ocrText ?? '').toBe(beforeOcrText);
    expect(after?.documentContentVersion ?? null).toBe(beforeDocumentContentVersion);
    expect(harness.toast).toHaveBeenCalledWith(
      'Document was locked before OCR output could be applied.',
      { variant: 'warning' }
    );
  });
});
