import { z } from 'zod';
import { type CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import {
  getCaseResolverWorkspaceRevision,
  safeParseJson,
} from './utils/workspace-persistence-utils';
import { type CaseResolverWorkspaceDetachedPayload } from './workspace-persistence-detached.types';

export const CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V2 =
  'case_resolver_workspace_detached_documents_v2';
const CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA =
  CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V2;
const CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_TEXT_MAX_CHARS = 6_000;
const CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_SCAN_SLOT_OCR_MAX_CHARS = 2_000;

/**
 * Zod schema for a single detached document file entry.
 */
/**
 * Zod schema for a scan slot.
 */
export const ScanSlotSchema = z.object({
  id: z.string().min(1),
  fileId: z.string().min(1),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().nonnegative(),
  ocrText: z.string().optional(),
});

export type CaseResolverScanSlot = z.infer<typeof ScanSlotSchema>;

// Update DetachedFileEntrySchema to use the ScanSlotSchema
export const DetachedFileEntrySchema = z.object({
  id: z.string().min(1),
  documentContent: z.string().optional(),
  documentContentHtml: z.string().optional(),
  documentContentMarkdown: z.string().optional(),
  documentContentPlainText: z.string().optional(),
  originalDocumentContent: z.string().optional(),
  explodedDocumentContent: z.string().optional(),
  ocrText: z.string().optional(),
  scanSlots: z.array(ScanSlotSchema).optional(),
});

export type CaseResolverWorkspaceDetachedDocumentsFileEntry = z.infer<typeof DetachedFileEntrySchema>;

/**
 * Zod schema for the entire detached documents payload.
 */
export const DetachedDocumentsPayloadSchema = z.object({
  schema: z.literal(CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA),
  workspaceRevision: z.number().int().positive(),
  lastMutationId: z.string().trim().min(1).nullable(),
  files: z.array(DetachedFileEntrySchema),
});

const coerceDetachedWorkspaceFile = (
  value: unknown
): CaseResolverWorkspace['files'][number] => value as CaseResolverWorkspace['files'][number];

const truncate = (value: string, maxChars: number): string =>
  value.length > maxChars ? value.slice(0, maxChars) : value;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const stripHtmlTags = (value: string): string => value.replace(/<[^>]*>/g, ' ');

const resolveLightweightDocumentText = (file: CaseResolverWorkspace['files'][number]): string => {
  const plainText =
    typeof file.documentContentPlainText === 'string' ? file.documentContentPlainText : '';
  if (plainText.trim().length > 0) {
    return truncate(
      normalizeWhitespace(plainText),
      CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_TEXT_MAX_CHARS
    );
  }
  const markdown =
    typeof file.documentContentMarkdown === 'string' ? file.documentContentMarkdown : '';
  if (markdown.trim().length > 0) {
    return truncate(
      normalizeWhitespace(markdown),
      CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_TEXT_MAX_CHARS
    );
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
    return truncate(
      normalizeWhitespace(content),
      CASE_RESOLVER_WORKSPACE_LIGHTWEIGHT_TEXT_MAX_CHARS
    );
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
      const result = DetachedFileEntrySchema.safeParse(entry);
      if (!result.success) return null;
      
      const fileEntry = result.data;
      if (seen.has(fileEntry.id)) return null;
      seen.add(fileEntry.id);
      
      return fileEntry;
    })
    .filter((entry): entry is CaseResolverWorkspaceDetachedDocumentsFileEntry => Boolean(entry));
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
      const fileRecord: Record<string, unknown> = { ...file };
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
      return coerceDetachedWorkspaceFile(fileRecord);
    }),
  };
};

export const parseCaseResolverWorkspaceDetachedDocumentsPayload = (
  raw: string | null | undefined
): CaseResolverWorkspaceDetachedDocumentsPayload | null => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const parsed = safeParseJson<unknown>(raw);
  if (!parsed) return null;
  
  const result = DetachedDocumentsPayloadSchema.safeParse(parsed);
  return result.success ? result.data : null;
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
    detachedDocumentsPayload.files.map(
      (entry): [string, CaseResolverWorkspaceDetachedDocumentsFileEntry] => [entry.id, entry]
    )
  );
  let updated = false;
  const files = workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
    const payload = payloadByFileId.get(file.id);
    if (!payload) return file;
    updated = true;
    const fileRecord: Record<string, unknown> = { ...file };
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
    return coerceDetachedWorkspaceFile(fileRecord);
  });
  return updated ? { ...workspace, files } : workspace;
};
