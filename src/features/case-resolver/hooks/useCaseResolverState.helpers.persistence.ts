import type { CaseResolverFileEditDraft } from '@/shared/contracts/case-resolver';

const CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX = 'case-resolver-editor-draft-v1';

export type StoredCaseResolverEditorDraft = {
  fileId: string;
  baseDocumentContentVersion: number;
  updatedAt: string;
  draft: Partial<CaseResolverFileEditDraft>;
};

export type WriteStoredEditorDraftResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'storage-unavailable' };

const buildEditorDraftStorageKey = (fileId: string): string =>
  `${CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX}:${fileId}`;

export const readStoredEditorDraft = (fileId: string): StoredCaseResolverEditorDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(buildEditorDraftStorageKey(fileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCaseResolverEditorDraft | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.fileId !== fileId) return null;
    if (!parsed.draft || typeof parsed.draft !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const isQuotaExceededStorageError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: unknown; code?: unknown };
  const errorName = typeof record.name === 'string' ? record.name : '';
  const errorCode = typeof record.code === 'number' ? record.code : null;
  return (
    errorName === 'QuotaExceededError' ||
    errorName === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    errorCode === 22 ||
    errorCode === 1014
  );
};

const buildStoredEditorDraftPatch = (
  draft: CaseResolverFileEditDraft,
  mode: 'primary' | 'minimal'
): Partial<CaseResolverFileEditDraft> => {
  const primaryContentPatch: Partial<CaseResolverFileEditDraft> =
    draft.editorType === 'wysiwyg'
      ? {
        documentContentHtml: draft.documentContentHtml ?? '',
      }
      : {
        documentContentMarkdown: draft.documentContentMarkdown ?? '',
      };

  const patch = Object.fromEntries(
    Object.entries({
      name: draft.name,
      folder: draft.folder,
      parentCaseId: draft.parentCaseId,
      referenceCaseIds: [...(draft.referenceCaseIds ?? [])],
      updatedAt: draft.updatedAt,
      documentDate: draft.documentDate,
      documentCity: draft.documentCity,
      isSent: draft.isSent === true,
      activeDocumentVersion: draft.activeDocumentVersion,
      editorType: draft.editorType,
      documentContentFormatVersion: draft.documentContentFormatVersion,
      documentContentVersion: draft.documentContentVersion,
      documentConversionWarnings: [...(draft.documentConversionWarnings ?? [])],
      lastContentConversionAt: draft.lastContentConversionAt,
      scanOcrModel: draft.scanOcrModel,
      scanOcrPrompt: draft.scanOcrPrompt,
      addresser: draft.addresser,
      addressee: draft.addressee,
      tagId: draft.tagId,
      caseIdentifierId: draft.caseIdentifierId,
      categoryId: draft.categoryId,
      // Persist scan slot topology only; OCR text can be very large and quickly exhaust quota.
      scanSlots: (draft.scanSlots ?? []).map((slot) => ({
        ...slot,
        ocrText: '',
      })),
    }).filter(([, value]) => value !== undefined)
  ) as Partial<CaseResolverFileEditDraft>;
  if (mode === 'minimal') return patch;
  return {
    ...patch,
    ...primaryContentPatch,
    originalDocumentContent: draft.originalDocumentContent ?? '',
    explodedDocumentContent: draft.explodedDocumentContent ?? '',
  };
};

const buildStoredEditorDraftPayload = (
  fileId: string,
  draft: CaseResolverFileEditDraft,
  mode: 'primary' | 'minimal'
): StoredCaseResolverEditorDraft => ({
  fileId,
  baseDocumentContentVersion: draft.baseDocumentContentVersion ?? 0,
  updatedAt: new Date().toISOString(),
  draft: buildStoredEditorDraftPatch(draft, mode),
});

const collectStoredEditorDraftKeys = (storage: Storage, keepKey: string): string[] => {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const entryKey = storage.key(index);
    if (!entryKey) continue;
    if (!entryKey.startsWith(`${CASE_RESOLVER_EDITOR_DRAFT_STORAGE_PREFIX}:`)) continue;
    if (entryKey === keepKey) continue;
    keys.push(entryKey);
  }
  return keys;
};

const removeStoredEditorDraftsExcept = (storage: Storage, keepKey: string): void => {
  const removableKeys = collectStoredEditorDraftKeys(storage, keepKey);
  removableKeys.forEach((entryKey) => {
    try {
      storage.removeItem(entryKey);
    } catch {
      // Ignore cleanup errors; we still attempt to persist the latest draft.
    }
  });
};

const tryWriteEditorDraftPayload = (
  storage: Storage,
  key: string,
  payload: StoredCaseResolverEditorDraft
): WriteStoredEditorDraftResult => {
  try {
    storage.setItem(key, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    if (isQuotaExceededStorageError(error)) {
      return { ok: false, reason: 'quota' };
    }
    return { ok: false, reason: 'storage-unavailable' };
  }
};

export const writeStoredEditorDraft = (
  fileId: string,
  draft: CaseResolverFileEditDraft
): WriteStoredEditorDraftResult => {
  if (typeof window === 'undefined') return { ok: true };
  const storage = window.localStorage;
  const key = buildEditorDraftStorageKey(fileId);

  const primaryWrite = tryWriteEditorDraftPayload(
    storage,
    key,
    buildStoredEditorDraftPayload(fileId, draft, 'primary')
  );
  if (primaryWrite.ok) return primaryWrite;

  if (primaryWrite.reason !== 'quota') return primaryWrite;
  removeStoredEditorDraftsExcept(storage, key);

  const retryPrimaryWrite = tryWriteEditorDraftPayload(
    storage,
    key,
    buildStoredEditorDraftPayload(fileId, draft, 'primary')
  );
  if (retryPrimaryWrite.ok) return retryPrimaryWrite;
  if (retryPrimaryWrite.reason !== 'quota') return retryPrimaryWrite;

  const minimalWrite = tryWriteEditorDraftPayload(
    storage,
    key,
    buildStoredEditorDraftPayload(fileId, draft, 'minimal')
  );
  if (minimalWrite.ok) return minimalWrite;
  return { ok: false, reason: 'quota' };
};

export const clearStoredEditorDraft = (fileId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(buildEditorDraftStorageKey(fileId));
  } catch {
    // Ignore storage cleanup errors.
  }
};
