import { type CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import {
  getCaseResolverWorkspaceRevision,
  safeParseJson,
} from './utils/workspace-persistence-utils';

const CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA =
  'case_resolver_workspace_detached_documents_v1';
const CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_TEXT_MAX_CHARS = 6_000;
const CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_SCAN_SLOT_OCR_MAX_CHARS = 2_000;

type CaseResolverWorkspaceDetachedDocumentsFileEntry = {
  id: string;
  documentContent?: string;
  documentContentHtml?: string;
  documentContentMarkdown?: string;
  documentContentPlainText?: string;
  originalDocumentContent?: string;
  explodedDocumentContent?: string;
  ocrText?: string;
  scanSlots?: CaseResolverWorkspace['files'][number]['scanSlots'];
};

export type CaseResolverWorkspaceDetachedDocumentsPayload = {
  schema: typeof CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA;
  workspaceRevision: number;
  lastMutationId: string | null;
  files: CaseResolverWorkspaceDetachedDocumentsFileEntry[];
};

const truncate = (value: string, maxChars: number): string =>
  value.length > maxChars ? value.slice(0, maxChars) : value;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const stripHtmlTags = (value: string): string => value.replace(/<[^>]*>/g, ' ');

const resolveLightweightDocumentText = (
  file: CaseResolverWorkspace['files'][number]
): string => {
  const plainText =
    typeof file.documentContentPlainText === 'string' ? file.documentContentPlainText : '';
  if (plainText.trim().length > 0) {
    return truncate(normalizeWhitespace(plainText), CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_TEXT_MAX_CHARS);
  }
  const markdown =
    typeof file.documentContentMarkdown === 'string' ? file.documentContentMarkdown : '';
  if (markdown.trim().length > 0) {
    return truncate(normalizeWhitespace(markdown), CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_TEXT_MAX_CHARS);
  }
  const html = typeof file.documentContentHtml === 'string' ? file.documentContentHtml : '';
  if (html.trim().length > 0) {
    return truncate(
      normalizeWhitespace(stripHtmlTags(html)),
      CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_TEXT_MAX_CHARS
    );
  }
  const content = typeof file.documentContent === 'string' ? file.documentContent : '';
  if (content.trim().length > 0) {
    return truncate(normalizeWhitespace(content), CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_TEXT_MAX_CHARS);
  }
  return '';
};

const normalizeScanSlotsForLightweightSearch = (
  scanSlots: CaseResolverWorkspace['files'][number]['scanSlots']
): CaseResolverWorkspace['files'][number]['scanSlots'] =>
  scanSlots.map((slot): CaseResolverWorkspace['files'][number]['scanSlots'][number] => {
    const ocrText = typeof slot.ocrText === 'string' ? slot.ocrText.trim() : '';
    return {
      ...slot,
      ocrText:
        ocrText.length > 0
          ? truncate(ocrText, CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_SCAN_SLOT_OCR_MAX_CHARS)
          : '',
    };
  });

const resolveDetachedDocumentsEntry = (
  file: CaseResolverWorkspace['files'][number]
): CaseResolverWorkspaceDetachedDocumentsFileEntry | null => {
  const entry: CaseResolverWorkspaceDetachedDocumentsFileEntry = { id: file.id };
  let hasHeavyPayload = false;
  const addString = (
    key: Exclude<keyof CaseResolverWorkspaceDetachedDocumentsFileEntry, 'id' | 'scanSlots'>,
    value: unknown,
    options?: { heavy?: boolean }
  ): void => {
    if (typeof value !== 'string') return;
    if (value.length === 0) return;
    entry[key] = value;
    if (options?.heavy !== false) {
      hasHeavyPayload = true;
    }
  };

  addString('documentContent', file.documentContent);
  addString('documentContentHtml', file.documentContentHtml);
  addString('documentContentMarkdown', file.documentContentMarkdown);
  addString('documentContentPlainText', file.documentContentPlainText, { heavy: false });
  addString('originalDocumentContent', file.originalDocumentContent);
  addString('explodedDocumentContent', file.explodedDocumentContent);
  addString('ocrText', file.ocrText);

  if (!hasHeavyPayload) {
    return null;
  }

  if (Array.isArray(file.scanSlots) && file.scanSlots.length > 0) {
    entry.scanSlots = file.scanSlots;
  }

  return entry;
};

const normalizeDetachedFiles = (
  input: unknown
): CaseResolverWorkspaceDetachedDocumentsPayload['files'] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input
    .map((entry: unknown): CaseResolverWorkspaceDetachedDocumentsFileEntry | null => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
      if (!id || seen.has(id)) return null;
      seen.add(id);
      const normalizedEntry: CaseResolverWorkspaceDetachedDocumentsFileEntry = { id };
      const copyString = (
        key: Exclude<keyof CaseResolverWorkspaceDetachedDocumentsFileEntry, 'id' | 'scanSlots'>
      ): void => {
        const value = record[key];
        if (typeof value !== 'string' || value.length === 0) return;
        normalizedEntry[key] = value;
      };
      copyString('documentContent');
      copyString('documentContentHtml');
      copyString('documentContentMarkdown');
      copyString('documentContentPlainText');
      copyString('originalDocumentContent');
      copyString('explodedDocumentContent');
      copyString('ocrText');
      if (Array.isArray(record['scanSlots'])) {
        normalizedEntry.scanSlots = record['scanSlots'].filter(
          (slot: unknown): slot is Record<string, unknown> =>
            Boolean(slot) && typeof slot === 'object' && !Array.isArray(slot)
        ) as CaseResolverWorkspace['files'][number]['scanSlots'];
      }
      return normalizedEntry;
    })
    .filter(
      (
        entry: CaseResolverWorkspaceDetachedDocumentsFileEntry | null
      ): entry is CaseResolverWorkspaceDetachedDocumentsFileEntry => Boolean(entry)
    );
};

export const buildCaseResolverWorkspaceDetachedDocumentsPayload = (
  workspace: CaseResolverWorkspace
): CaseResolverWorkspaceDetachedDocumentsPayload => ({
  schema: CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA,
  workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
  lastMutationId:
    typeof workspace.lastMutationId === 'string' && workspace.lastMutationId.trim().length > 0
      ? workspace.lastMutationId.trim()
      : null,
  files: workspace.files
    .filter((file): boolean => file.fileType === 'document' || file.fileType === 'scanfile')
    .map((file): CaseResolverWorkspaceDetachedDocumentsFileEntry | null =>
      resolveDetachedDocumentsEntry(file)
    )
    .filter(
      (
        entry: CaseResolverWorkspaceDetachedDocumentsFileEntry | null
      ): entry is CaseResolverWorkspaceDetachedDocumentsFileEntry => Boolean(entry)
    ),
});

export const stripCaseResolverWorkspaceDetachedDocuments = (
  workspace: CaseResolverWorkspace
): CaseResolverWorkspace => {
  if (!Array.isArray(workspace.files) || workspace.files.length === 0) return workspace;
  return {
    ...workspace,
    files: workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
      if (file.fileType !== 'document' && file.fileType !== 'scanfile') return file;
      const fileRecord = { ...file } as Record<string, unknown>;
      delete fileRecord['documentContent'];
      delete fileRecord['documentContentHtml'];
      delete fileRecord['documentContentMarkdown'];
      delete fileRecord['originalDocumentContent'];
      delete fileRecord['explodedDocumentContent'];
      delete fileRecord['ocrText'];
      if (file.fileType === 'document') {
        const lightweightText = resolveLightweightDocumentText(file);
        if (lightweightText.length > 0) {
          fileRecord['documentContentPlainText'] = lightweightText;
        } else {
          delete fileRecord['documentContentPlainText'];
        }
      }
      if (file.fileType === 'scanfile') {
        const scanSlots = Array.isArray(file.scanSlots) ? file.scanSlots : [];
        if (scanSlots.length > 0) {
          fileRecord['scanSlots'] = normalizeScanSlotsForLightweightSearch(scanSlots);
        } else {
          delete fileRecord['scanSlots'];
        }
        const lightweightText = resolveLightweightDocumentText(file);
        if (lightweightText.length > 0) {
          fileRecord['documentContentPlainText'] = lightweightText;
        } else {
          delete fileRecord['documentContentPlainText'];
        }
      }
      return fileRecord as CaseResolverWorkspace['files'][number];
    }),
  };
};

export const parseCaseResolverWorkspaceDetachedDocumentsPayload = (
  raw: string | null | undefined
): CaseResolverWorkspaceDetachedDocumentsPayload | null => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const parsed = safeParseJson<unknown>(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const schemaRaw = record['schema'];
  if (
    typeof schemaRaw === 'string' &&
    schemaRaw.trim().length > 0 &&
    schemaRaw !== CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA
  ) {
    return null;
  }
  const workspaceRevisionRaw = record['workspaceRevision'];
  const workspaceRevision =
    typeof workspaceRevisionRaw === 'number' &&
    Number.isFinite(workspaceRevisionRaw) &&
    workspaceRevisionRaw > 0
      ? Math.floor(workspaceRevisionRaw)
      : 0;
  const lastMutationIdRaw = record['lastMutationId'];
  const lastMutationId =
    typeof lastMutationIdRaw === 'string' && lastMutationIdRaw.trim().length > 0
      ? lastMutationIdRaw.trim()
      : null;
  return {
    schema: CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA,
    workspaceRevision,
    lastMutationId,
    files: normalizeDetachedFiles(record['files']),
  };
};

export const applyCaseResolverWorkspaceDetachedDocumentsPayload = ({
  workspace,
  detachedDocumentsPayload,
}: {
  workspace: CaseResolverWorkspace;
  detachedDocumentsPayload: CaseResolverWorkspaceDetachedDocumentsPayload | null;
}): CaseResolverWorkspace => {
  if (!detachedDocumentsPayload) return workspace;
  const workspaceRevision = getCaseResolverWorkspaceRevision(workspace);
  if (workspaceRevision <= 0 || detachedDocumentsPayload.workspaceRevision !== workspaceRevision) {
    return workspace;
  }
  const workspaceLastMutationId =
    typeof workspace.lastMutationId === 'string' && workspace.lastMutationId.trim().length > 0
      ? workspace.lastMutationId.trim()
      : null;
  if (
    detachedDocumentsPayload.lastMutationId !== null &&
    detachedDocumentsPayload.lastMutationId !== workspaceLastMutationId
  ) {
    return workspace;
  }
  if (detachedDocumentsPayload.files.length === 0 || workspace.files.length === 0) return workspace;
  const payloadByFileId = new Map<string, CaseResolverWorkspaceDetachedDocumentsFileEntry>(
    detachedDocumentsPayload.files.map((entry): [string, CaseResolverWorkspaceDetachedDocumentsFileEntry] => [
      entry.id,
      entry,
    ])
  );
  let updated = false;
  const files = workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
    const payload = payloadByFileId.get(file.id);
    if (!payload) return file;
    updated = true;
    const fileRecord = { ...file } as Record<string, unknown>;
    const mergeString = (
      key: Exclude<keyof CaseResolverWorkspaceDetachedDocumentsFileEntry, 'id' | 'scanSlots'>
    ): void => {
      const value = payload[key];
      if (typeof value !== 'string' || value.length === 0) return;
      fileRecord[key] = value;
    };
    mergeString('documentContent');
    mergeString('documentContentHtml');
    mergeString('documentContentMarkdown');
    mergeString('documentContentPlainText');
    mergeString('originalDocumentContent');
    mergeString('explodedDocumentContent');
    mergeString('ocrText');
    if (Array.isArray(payload.scanSlots)) {
      fileRecord['scanSlots'] = payload.scanSlots;
    }
    return fileRecord as CaseResolverWorkspace['files'][number];
  });
  return updated ? { ...workspace, files } : workspace;
};
