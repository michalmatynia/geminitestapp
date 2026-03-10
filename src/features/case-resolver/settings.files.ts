import {
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  hasHtmlMarkup,
  ensureSafeDocumentHtml,
  stripHtmlToPlainText,
  toStorageDocumentValue,
} from '@/features/document-editor';
import {
  type CaseResolverDocumentHistoryEntry,
  type CaseResolverDocumentVersion,
  type CaseResolverEditorType,
  type CaseResolverFile,
  type CaseResolverScanSlot,
  type CreateCaseResolverFileInput,
} from '@/shared/contracts/case-resolver';

import { sanitizeGraph } from './settings-graph';
import { DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT } from './settings.constants';
import {
  normalizeCaseHappeningDate,
  normalizeCaseResolverCaseStatus,
  normalizeCaseResolverDocumentVersion,
  normalizeCaseResolverFileType,
  normalizeCaseTreeOrder,
  normalizeDocumentContentVersion,
  normalizeDocumentCity,
  normalizeDocumentDate,
  normalizeDocumentFormatVersion,
  normalizeFolderPath,
  normalizeTimestamp,
  sanitizeOptionalId,
  sanitizeOptionalIdArray,
  sanitizeOptionalMimeType,
  sanitizePartyReference,
} from './settings.helpers';

const CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT = 120;

export const normalizeCaseResolverRelatedFileLinks = (
  files: CaseResolverFile[]
): CaseResolverFile[] => {
  if (files.length === 0) return files;

  const filesById = new Map<string, CaseResolverFile>(
    files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  const relationMap = new Map<string, Set<string>>();

  files.forEach((file: CaseResolverFile): void => {
    relationMap.set(file.id, new Set<string>());
  });

  files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') return;
    const sourceSet = relationMap.get(file.id);
    if (!sourceSet) return;
    (file.relatedFileIds ?? []).forEach((relatedFileId: string): void => {
      const normalizedRelatedFileId = relatedFileId.trim();
      if (!normalizedRelatedFileId || normalizedRelatedFileId === file.id) return;
      const relatedFile = filesById.get(normalizedRelatedFileId);
      if (!relatedFile || relatedFile.fileType === 'case') return;
      sourceSet.add(normalizedRelatedFileId);
    });
  });

  relationMap.forEach((relatedIds: Set<string>, sourceId: string): void => {
    relatedIds.forEach((targetId: string): void => {
      const reciprocal = relationMap.get(targetId);
      if (!reciprocal) return;
      reciprocal.add(sourceId);
    });
  });

  return files.map((file: CaseResolverFile): CaseResolverFile => {
    if (file.fileType === 'case') {
      if (!file.relatedFileIds || file.relatedFileIds.length === 0) return file;
      return {
        ...file,
        relatedFileIds: undefined,
      };
    }

    const normalizedRelatedFileIds = Array.from(relationMap.get(file.id) ?? []).sort(
      (left: string, right: string): number => left.localeCompare(right)
    );
    const currentRelatedFileIds = sanitizeOptionalIdArray(file.relatedFileIds).sort(
      (left: string, right: string): number => left.localeCompare(right)
    );
    const hasSameRelatedFileIds =
      normalizedRelatedFileIds.length === currentRelatedFileIds.length &&
      normalizedRelatedFileIds.every(
        (relatedFileId: string, index: number): boolean =>
          relatedFileId === currentRelatedFileIds[index]
      );
    if (hasSameRelatedFileIds) return file;
    return {
      ...file,
      relatedFileIds: normalizedRelatedFileIds.length > 0 ? normalizedRelatedFileIds : undefined,
    };
  });
};

export const normalizeCaseResolverDocumentHistory = (
  input: unknown,
  fallbackTimestamp: string,
  mode: 'markdown' | 'wysiwyg'
): CaseResolverDocumentHistoryEntry[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const entries: CaseResolverDocumentHistoryEntry[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;

    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `doc-history-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const fallbackContent =
      typeof record['documentContent'] === 'string' ? record['documentContent'] : '';
    const rawMarkdown =
      typeof record['documentContentMarkdown'] === 'string'
        ? record['documentContentMarkdown']
        : undefined;
    const rawHtml =
      typeof record['documentContentHtml'] === 'string' ? record['documentContentHtml'] : undefined;
    const activeDocumentVersion = normalizeCaseResolverDocumentVersion(
      record['activeDocumentVersion']
    );
    const canonical = (() => {
      if (mode === 'markdown') {
        const resolvedMarkdownContent = (() => {
          if (typeof rawMarkdown === 'string' && rawMarkdown.trim().length > 0) {
            return rawMarkdown;
          }
          if (
            typeof record['documentContentPlainText'] === 'string' &&
            record['documentContentPlainText'].trim().length > 0
          ) {
            return record['documentContentPlainText'];
          }
          if (fallbackContent.trim().length > 0) {
            return hasHtmlMarkup(fallbackContent)
              ? stripHtmlToPlainText(fallbackContent)
              : fallbackContent;
          }
          if (typeof rawHtml === 'string' && rawHtml.trim().length > 0) {
            return stripHtmlToPlainText(rawHtml);
          }
          return '';
        })();
        return deriveDocumentContentSync({
          mode: 'markdown',
          value: resolvedMarkdownContent,
          previousHtml: rawHtml,
          previousMarkdown: rawMarkdown,
        });
      }

      const resolvedHtmlContent = (() => {
        if (typeof rawHtml === 'string' && rawHtml.trim().length > 0) {
          return rawHtml;
        }
        if (typeof rawMarkdown === 'string' && rawMarkdown.trim().length > 0) {
          return ensureHtmlForPreview(rawMarkdown, 'markdown');
        }
        return ensureSafeDocumentHtml(fallbackContent);
      })();
      return deriveDocumentContentSync({
        mode: 'wysiwyg',
        value: resolvedHtmlContent,
        previousHtml: rawHtml,
        previousMarkdown: rawMarkdown,
      });
    })();

    entries.push({
      id: rawId,
      savedAt: normalizeTimestamp(record['savedAt'], fallbackTimestamp),
      documentContentVersion: normalizeDocumentContentVersion(record['documentContentVersion']),
      activeDocumentVersion,
      editorType: canonical.mode,
      documentContent: toStorageDocumentValue(canonical),
      documentContentMarkdown: canonical.markdown,
      documentContentHtml: canonical.html,
      documentContentPlainText: canonical.plainText,
    });
  });

  return entries
    .sort((left: CaseResolverDocumentHistoryEntry, right: CaseResolverDocumentHistoryEntry) => {
      const rightTimestamp = Date.parse(right.savedAt);
      const leftTimestamp = Date.parse(left.savedAt);
      if (
        Number.isFinite(rightTimestamp) &&
        Number.isFinite(leftTimestamp) &&
        rightTimestamp !== leftTimestamp
      ) {
        return rightTimestamp - leftTimestamp;
      }
      return right.documentContentVersion - left.documentContentVersion;
    })
    .slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT);
};

export const normalizeCaseResolverScanSlots = (
  input: unknown,
  fileId: string
): CaseResolverScanSlot[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const slots: CaseResolverScanSlot[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;

    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `scan-slot-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    const rawStatus = typeof record['status'] === 'string' ? record['status'] : '';
    const status =
      rawStatus === 'pending' ||
      rawStatus === 'processing' ||
      rawStatus === 'completed' ||
      rawStatus === 'failed'
        ? rawStatus
        : 'completed';

    slots.push({
      id: rawId,
      fileId,
      status,
      progress: typeof record['progress'] === 'number' ? record['progress'] : 100,
      name: rawName || `Scan ${slots.length + 1}`,
      filepath: sanitizeOptionalId(record['filepath']),
      sourceFileId: sanitizeOptionalId(record['sourceFileId']),
      mimeType: sanitizeOptionalMimeType(record['mimeType']),
      size:
        typeof record['size'] === 'number' && Number.isFinite(record['size']) && record['size'] >= 0
          ? Math.round(record['size'])
          : undefined,
      ocrText: typeof record['ocrText'] === 'string' ? record['ocrText'] : '',
      ocrError:
        typeof record['ocrError'] === 'string' && record['ocrError'].trim().length > 0
          ? record['ocrError'].trim()
          : null,
    });
  });

  return slots;
};

export const createCaseResolverFile = (input: CreateCaseResolverFileInput): CaseResolverFile => {
  const now = new Date().toISOString();
  const createdAt = normalizeTimestamp(input.createdAt, now);
  const updatedAt = normalizeTimestamp(input.updatedAt, createdAt);
  const fallbackDocumentContent =
    typeof input.documentContent === 'string' ? input.documentContent : '';
  const originalDocumentContent =
    typeof input.originalDocumentContent === 'string'
      ? input.originalDocumentContent
      : fallbackDocumentContent;
  const explodedDocumentContent =
    typeof input.explodedDocumentContent === 'string' ? input.explodedDocumentContent : '';
  const requestedVersion = normalizeCaseResolverDocumentVersion(input.activeDocumentVersion);
  const activeDocumentVersion: CaseResolverDocumentVersion =
    requestedVersion === 'exploded' && explodedDocumentContent.trim().length === 0
      ? 'original'
      : requestedVersion;
  const activeDocumentContent =
    activeDocumentVersion === 'exploded' ? explodedDocumentContent : originalDocumentContent;
  const fileType = normalizeCaseResolverFileType(input.fileType);
  const caseStatus =
    fileType === 'case' ? normalizeCaseResolverCaseStatus(input.caseStatus) : undefined;
  const caseTreeOrder =
    fileType === 'case' ? normalizeCaseTreeOrder(input.caseTreeOrder) : undefined;
  const happeningDate =
    fileType === 'case' ? normalizeCaseHappeningDate(input.happeningDate) : null;
  const resolvedEditorType: 'markdown' | 'wysiwyg' =
    fileType === 'scanfile' ? 'markdown' : 'wysiwyg';
  const resolvedCanonicalSource = (() => {
    if (resolvedEditorType === 'markdown') {
      if (
        typeof input.documentContentMarkdown === 'string' &&
        input.documentContentMarkdown.trim().length > 0
      ) {
        return input.documentContentMarkdown;
      }
      if (
        typeof input.documentContentPlainText === 'string' &&
        input.documentContentPlainText.trim().length > 0
      ) {
        return input.documentContentPlainText;
      }
      if (activeDocumentContent.trim().length > 0) {
        return hasHtmlMarkup(activeDocumentContent)
          ? stripHtmlToPlainText(activeDocumentContent)
          : activeDocumentContent;
      }
      if (
        typeof input.documentContentHtml === 'string' &&
        input.documentContentHtml.trim().length > 0
      ) {
        return stripHtmlToPlainText(input.documentContentHtml);
      }
      return '';
    }
    if (
      typeof input.documentContentHtml === 'string' &&
      input.documentContentHtml.trim().length > 0
    ) {
      return input.documentContentHtml;
    }
    if (
      typeof input.documentContentMarkdown === 'string' &&
      input.documentContentMarkdown.trim().length > 0
    ) {
      return ensureHtmlForPreview(input.documentContentMarkdown, 'markdown');
    }
    return ensureSafeDocumentHtml(activeDocumentContent);
  })();
  const canonicalDocument = deriveDocumentContentSync({
    mode: resolvedEditorType,
    value: resolvedCanonicalSource,
    previousHtml: input.documentContentHtml,
    previousMarkdown: input.documentContentMarkdown,
  });
  const documentContent = toStorageDocumentValue(canonicalDocument);
  const editorType: CaseResolverEditorType = resolvedEditorType;
  const documentContentFormatVersion = normalizeDocumentFormatVersion(
    input.documentContentFormatVersion
  );
  const documentContentVersion = normalizeDocumentContentVersion(input.documentContentVersion);
  const documentConversionWarnings = Array.isArray(input.documentConversionWarnings)
    ? input.documentConversionWarnings
      .filter((entry: string | unknown): entry is string => typeof entry === 'string')
      .map((entry: string) => entry.trim())
      .filter((entry: string) => entry.length > 0)
    : canonicalDocument.warnings;
  const lastContentConversionAt = normalizeTimestamp(input.lastContentConversionAt, updatedAt);
  const parentCaseId = sanitizeOptionalId(input.parentCaseId);
  const referenceCaseIds = sanitizeOptionalIdArray(input.referenceCaseIds).filter(
    (referenceId: string): boolean => referenceId !== input.id
  );
  const relatedFileIds = sanitizeOptionalIdArray(input.relatedFileIds).filter(
    (relatedId: string): boolean => relatedId !== input.id
  );
  const scanOcrModel = typeof input.scanOcrModel === 'string' ? input.scanOcrModel.trim() : '';
  const scanOcrPrompt =
    typeof input.scanOcrPrompt === 'string' && input.scanOcrPrompt.trim().length > 0
      ? input.scanOcrPrompt.trim()
      : DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT;
  return {
    id: input.id,
    workspaceId: input.workspaceId ?? 'default',
    version: input.version ?? 'original',
    fileType,
    caseStatus,
    caseTreeOrder,
    name: input.name.trim() || 'Untitled Case',
    folder: normalizeFolderPath(input.folder ?? ''),
    parentCaseId,
    referenceCaseIds,
    relatedFileIds: relatedFileIds.length > 0 ? relatedFileIds : undefined,
    documentDate: normalizeDocumentDate(input.documentDate),
    documentCity: normalizeDocumentCity(input.documentCity),
    happeningDate,
    originalDocumentContent,
    explodedDocumentContent,
    activeDocumentVersion,
    editorType,
    documentContentFormatVersion,
    documentContentVersion,
    documentContent,
    documentContentMarkdown: canonicalDocument.markdown,
    documentContentHtml: canonicalDocument.html,
    documentContentPlainText: canonicalDocument.plainText,
    documentHistory: normalizeCaseResolverDocumentHistory(
      input.documentHistory,
      updatedAt,
      resolvedEditorType
    ),
    documentConversionWarnings,
    lastContentConversionAt,
    scanSlots: normalizeCaseResolverScanSlots(input.scanSlots, input.id),
    scanOcrModel: fileType === 'scanfile' ? scanOcrModel : '',
    scanOcrPrompt: fileType === 'scanfile' ? scanOcrPrompt : '',
    isSent: input.isSent === true,
    isLocked: input.isLocked === true,
    addresser: sanitizePartyReference(input.addresser),
    addressee: sanitizePartyReference(input.addressee),
    tagId: sanitizeOptionalId(input.tagId),
    caseIdentifierId: sanitizeOptionalId(input.caseIdentifierId),
    categoryId: sanitizeOptionalId(input.categoryId),
    createdAt,
    updatedAt,
    graph: sanitizeGraph({
      nodes: input.graph?.nodes ?? [],
      edges: input.graph?.edges ?? [],
      nodeMeta: input.graph?.nodeMeta ?? {},
      edgeMeta: input.graph?.edgeMeta ?? {},
      pdfExtractionPresetId: input.graph?.pdfExtractionPresetId,
      documentFileLinksByNode: input.graph?.documentFileLinksByNode ?? {},
      documentDropNodeId: input.graph?.documentDropNodeId ?? null,
      documentSourceFileIdByNode: input.graph?.documentSourceFileIdByNode ?? {},
      nodeFileAssetIdByNode: input.graph?.nodeFileAssetIdByNode ?? {},
    }),
  };
};
