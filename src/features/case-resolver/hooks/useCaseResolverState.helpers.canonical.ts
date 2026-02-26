import {
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
  type DocumentContentCanonical,
} from '@/features/document-editor/content-format';
import type {
  CaseResolverFile,
  CaseResolverFileEditDraft,
} from '@/shared/contracts/case-resolver';
import { buildFileEditDraft } from '../utils/caseResolverUtils';
import { stableStringify } from '../../ai/ai-paths/lib';

export type CaseResolverDraftCanonicalState = {
  mode: 'markdown' | 'wysiwyg';
  storedContent: string;
  markdown: string;
  html: string;
  plainText: string;
  warnings: string[];
  originalDocumentContent: string;
  explodedDocumentContent: string;
};

const normalizeSemanticallyEmptyCanonicalContent = (
  canonical: DocumentContentCanonical
): DocumentContentCanonical => {
  if (canonical.plainText.trim().length > 0) return canonical;
  if (
    canonical.html.length === 0 &&
    canonical.markdown.length === 0 &&
    canonical.plainText.length === 0
  ) {
    return canonical;
  }
  return {
    ...canonical,
    html: '',
    markdown: '',
    plainText: '',
  };
};

export const buildCaseResolverDraftCanonicalState = (
  draft: CaseResolverFileEditDraft
): CaseResolverDraftCanonicalState => {
  const resolvedMode: 'markdown' | 'wysiwyg' =
    draft.fileType === 'scanfile' ? 'markdown' : 'wysiwyg';
  const resolvedCanonicalSource = (() => {
    if (resolvedMode === 'markdown') {
      if (
        typeof draft.documentContentMarkdown === 'string' &&
        draft.documentContentMarkdown.trim().length > 0
      ) {
        return draft.documentContentMarkdown;
      }
      if (
        typeof draft.documentContentPlainText === 'string' &&
        draft.documentContentPlainText.trim().length > 0
      ) {
        return draft.documentContentPlainText;
      }
      return draft.documentContent ?? '';
    }
    if (
      typeof draft.documentContentHtml === 'string' &&
      draft.documentContentHtml.trim().length > 0
    ) {
      return draft.documentContentHtml;
    }
    if (
      typeof draft.documentContentMarkdown === 'string' &&
      draft.documentContentMarkdown.trim().length > 0
    ) {
      return ensureHtmlForPreview(draft.documentContentMarkdown, 'markdown');
    }
    return ensureSafeDocumentHtml(draft.documentContent ?? '');
  })();
  const canonical = normalizeSemanticallyEmptyCanonicalContent(
    deriveDocumentContentSync({
      mode: resolvedMode,
      value: resolvedCanonicalSource,
      previousHtml: draft.documentContentHtml ?? '',
      previousMarkdown: draft.documentContentMarkdown ?? '',
    })
  );
  const storedContent = toStorageDocumentValue(canonical);
  const originalDocumentContent =
    draft.activeDocumentVersion === 'original'
      ? storedContent
      : (draft.originalDocumentContent ?? '');
  const explodedDocumentContent =
    draft.activeDocumentVersion === 'exploded'
      ? storedContent
      : (draft.explodedDocumentContent ?? '');
  return {
    mode: resolvedMode,
    storedContent,
    markdown: canonical.markdown,
    html: canonical.html,
    plainText: canonical.plainText,
    warnings: [...canonical.warnings],
    originalDocumentContent,
    explodedDocumentContent,
  };
};

const normalizeComparableReferenceCaseIds = (
  value: string[] | null | undefined
): string[] => [...(value ?? [])].sort();

const normalizeComparableWarnings = (
  value: string[] | null | undefined
): string[] => [...(value ?? [])];

type CaseResolverComparableDocumentSnapshot = {
  id: string;
  name: string;
  folder: string;
  parentCaseId: string | null;
  referenceCaseIds: string[];
  documentDate: CaseResolverFileEditDraft['documentDate'];
  documentCity: string | null;
  isSent: boolean;
  tagId: string | null;
  caseIdentifierId: string | null;
  categoryId: string | null;
  scanOcrModel: string;
  scanOcrPrompt: string;
  addresser: CaseResolverFileEditDraft['addresser'];
  addressee: CaseResolverFileEditDraft['addressee'];
  activeDocumentVersion: CaseResolverFileEditDraft['activeDocumentVersion'];
  editorType: CaseResolverFileEditDraft['editorType'];
  documentContentFormatVersion: 1;
  documentContent: string;
  documentContentMarkdown: string;
  documentContentHtml: string;
  documentContentPlainText: string;
  documentConversionWarnings: string[];
  originalDocumentContent: string;
  explodedDocumentContent: string;
};

const buildCaseResolverFileComparableSnapshot = (
  file: CaseResolverFile
): CaseResolverComparableDocumentSnapshot => {
  const canonicalDraft = buildFileEditDraft(file);
  const canonicalState = buildCaseResolverDraftCanonicalState(canonicalDraft);
  return {
    id: file.id,
    name: file.name,
    folder: file.folder,
    parentCaseId: file.parentCaseId ?? null,
    referenceCaseIds: normalizeComparableReferenceCaseIds(file.referenceCaseIds),
    documentDate: canonicalDraft.documentDate,
    documentCity:
      typeof canonicalDraft.documentCity === 'string'
        ? canonicalDraft.documentCity.trim() || null
        : null,
    isSent: file.isSent === true,
    tagId: file.tagId ?? null,
    caseIdentifierId: file.caseIdentifierId ?? null,
    categoryId: file.categoryId ?? null,
    scanOcrModel: file.scanOcrModel ?? '',
    scanOcrPrompt: file.scanOcrPrompt ?? '',
    addresser: file.addresser,
    addressee: file.addressee,
    activeDocumentVersion: canonicalDraft.activeDocumentVersion,
    editorType: canonicalState.mode,
    documentContentFormatVersion: 1,
    documentContent: canonicalState.storedContent,
    documentContentMarkdown: canonicalState.markdown,
    documentContentHtml: canonicalState.html,
    documentContentPlainText: canonicalState.plainText,
    documentConversionWarnings: normalizeComparableWarnings(canonicalState.warnings),
    originalDocumentContent: canonicalState.originalDocumentContent ?? '',
    explodedDocumentContent: canonicalState.explodedDocumentContent ?? '',
  };
};

const buildCaseResolverDraftComparableSnapshot = (
  draft: CaseResolverFileEditDraft,
  canonicalState: CaseResolverDraftCanonicalState
): CaseResolverComparableDocumentSnapshot => ({
  id: draft.id,
  name: draft.name,
  folder: draft.folder,
  parentCaseId: draft.parentCaseId ?? null,
  referenceCaseIds: normalizeComparableReferenceCaseIds(draft.referenceCaseIds),
  documentDate: draft.documentDate,
  documentCity: typeof draft.documentCity === 'string' ? draft.documentCity.trim() || null : null,
  isSent: draft.isSent === true,
  tagId: draft.tagId ?? null,
  caseIdentifierId: draft.caseIdentifierId ?? null,
  categoryId: draft.categoryId ?? null,
  scanOcrModel: draft.scanOcrModel ?? '',
  scanOcrPrompt: draft.scanOcrPrompt ?? '',
  addresser: draft.addresser,
  addressee: draft.addressee,
  activeDocumentVersion: draft.activeDocumentVersion,
  editorType: canonicalState.mode,
  documentContentFormatVersion: 1,
  documentContent: canonicalState.storedContent,
  documentContentMarkdown: canonicalState.markdown,
  documentContentHtml: canonicalState.html,
  documentContentPlainText: canonicalState.plainText,
  documentConversionWarnings: normalizeComparableWarnings(canonicalState.warnings),
  originalDocumentContent: canonicalState.originalDocumentContent ?? '',
  explodedDocumentContent: canonicalState.explodedDocumentContent ?? '',
});

export const buildCaseResolverFileComparableFingerprint = (
  file: CaseResolverFile
): string => stableStringify(buildCaseResolverFileComparableSnapshot(file));

export const buildCaseResolverDraftComparableFingerprint = (
  draft: CaseResolverFileEditDraft,
  canonicalState?: CaseResolverDraftCanonicalState
): string =>
  stableStringify(
    buildCaseResolverDraftComparableSnapshot(
      draft,
      canonicalState ?? buildCaseResolverDraftCanonicalState(draft)
    )
  );

export const hasCaseResolverDraftMeaningfulChanges = ({
  draft,
  file,
  canonicalState,
}: {
  draft: CaseResolverFileEditDraft;
  file: CaseResolverFile;
  canonicalState?: CaseResolverDraftCanonicalState;
}): boolean =>
  buildCaseResolverDraftComparableFingerprint(draft, canonicalState) !==
  buildCaseResolverFileComparableFingerprint(file);

export const canCaseResolverDraftPerformInitialManualSave = ({
  draft,
  file,
  canonicalState,
}: {
  draft: CaseResolverFileEditDraft;
  file: CaseResolverFile;
  canonicalState?: CaseResolverDraftCanonicalState;
}): boolean => {
  if (draft.id !== file.id) return false;
  if (draft.fileType !== 'document' || file.fileType !== 'document') return false;
  if ((file.documentHistory?.length ?? 0) > 0) return false;
  if (file.documentContentVersion > 1) return false;
  if (file.updatedAt !== file.createdAt) return false;

  const resolvedCanonicalState = canonicalState ?? buildCaseResolverDraftCanonicalState(draft);
  if (
    hasCaseResolverDraftMeaningfulChanges({
      draft,
      file,
      canonicalState: resolvedCanonicalState,
    })
  ) {
    return false;
  }

  const hasAnyTextContent =
    resolvedCanonicalState.plainText.trim().length > 0 ||
    resolvedCanonicalState.markdown.trim().length > 0 ||
    resolvedCanonicalState.originalDocumentContent.trim().length > 0 ||
    resolvedCanonicalState.explodedDocumentContent.trim().length > 0;
  return !hasAnyTextContent;
};
