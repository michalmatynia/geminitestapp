import { z } from 'zod';
import { dtoBaseSchema, type DtoBase } from '../base';
import {
  caseResolverFileTypeSchema,
  caseResolverDocumentVersionSchema,
  caseResolverEditorTypeSchema,
  caseResolverAssetKindSchema,
  type CaseResolverFileType,
  type CaseResolverDocumentVersion,
  type CaseResolverEditorType,
  type CaseResolverAssetKind,
  type CaseResolverDocumentFormatVersion,
} from './base';
import { caseResolverScanSlotSchema, type CaseResolverScanSlot } from './ocr';
import { caseResolverGraphSchema, type CaseResolverGraph } from './graph';
import { caseResolverPartyReferenceSchema, type CaseResolverPartyReference } from './relations';
import {
  caseResolverDocumentHistoryEntrySchema,
  type CaseResolverDocumentHistoryEntry,
} from './history';

export const caseResolverDocumentDateActionSchema = z.enum([
  'useDetectedDate',
  'keepText',
  'ignore',
]);
export type CaseResolverDocumentDateAction = z.infer<typeof caseResolverDocumentDateActionSchema>;

export const caseResolverDocumentDateProposalSchema = z.object({
  isoDate: z.string(),
  source: z.enum(['metadata', 'text']),
  sourceLine: z.string().nullable(),
  cityHint: z.string().nullable(),
  city: z.string().nullable().optional(),
  action: caseResolverDocumentDateActionSchema,
});
export type CaseResolverDocumentDateProposal = z.infer<
  typeof caseResolverDocumentDateProposalSchema
>;

/**
 * Case Resolver Document & File DTOs
 */
export const caseResolverFileSchema = dtoBaseSchema.extend({
  workspaceId: z.string(),
  name: z.string(),
  fileType: caseResolverFileTypeSchema,
  caseStatus: z.enum(['pending', 'completed']).optional(),
  caseTreeOrder: z.number().int().optional(),
  documentContent: z.string(),
  version: caseResolverDocumentVersionSchema,
  graph: caseResolverGraphSchema.optional(),
  isLocked: z.boolean().optional(),
  scanSlots: z.array(caseResolverScanSlotSchema).optional(),
  documentContentVersion: z.number().optional(),
  ocrText: z.string().optional(),
  documentContentPlainText: z.string().optional(),
  documentContentHtml: z.string().optional(),
  documentContentMarkdown: z.string().optional(),
  originalDocumentContent: z.string().optional(),
  documentCity: z.string().nullable().optional(),
  documentDate: caseResolverDocumentDateProposalSchema.nullable().optional(),
  happeningDate: z.string().nullable().optional(),
  isSent: z.boolean().optional(),
  relatedFileIds: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export interface CaseResolverFile extends DtoBase {
  id: string;
  workspaceId: string;
  name: string;
  fileType: CaseResolverFileType;
  caseStatus?: 'pending' | 'completed' | undefined;
  caseTreeOrder?: number | undefined;
  folder: string;
  parentCaseId?: string | null | undefined;
  referenceCaseIds: string[];
  documentContent: string;
  version: CaseResolverDocumentVersion;
  graph?: CaseResolverGraph | undefined;
  isLocked?: boolean | undefined;
  scanSlots: CaseResolverScanSlot[];
  documentContentVersion: number;
  documentContentFormatVersion: number;
  activeDocumentVersion: 'original' | 'exploded';
  editorType: 'wysiwyg' | 'markdown' | 'code' | 'rich-text' | 'plain-text';
  ocrText?: string | undefined;
  documentContentPlainText: string;
  documentContentHtml: string;
  documentContentMarkdown: string;
  originalDocumentContent?: string | undefined;
  explodedDocumentContent?: string | undefined;
  documentCity?: string | null | undefined;
  documentDate?: CaseResolverDocumentDateProposal | null | undefined;
  happeningDate?: string | null | undefined;
  isSent?: boolean | undefined;
  documentHistory: CaseResolverDocumentHistoryEntry[];
  documentConversionWarnings: string[];
  lastContentConversionAt?: string | null | undefined;
  relatedFileIds?: string[] | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  addresser?: CaseResolverPartyReference | null | undefined;
  addressee?: CaseResolverPartyReference | null | undefined;
  tagId?: string | null | undefined;
  caseIdentifierId?: string | null | undefined;
  categoryId?: string | null | undefined;
  scanOcrModel: string;
  scanOcrPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export const caseResolverFileEditDraftSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  fileType: caseResolverFileTypeSchema,
  folder: z.string(),
  caseTreeOrder: z.number().int().optional(),
  parentCaseId: z.string().nullable().optional(),
  referenceCaseIds: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  documentDate: caseResolverDocumentDateProposalSchema.nullable().optional(),
  documentCity: z.string().nullable().optional(),
  happeningDate: z.string().nullable().optional(),
  isSent: z.boolean().optional(),
  originalDocumentContent: z.string().optional(),
  explodedDocumentContent: z.string().optional(),
  activeDocumentVersion: z.enum(['original', 'exploded']).optional(),
  editorType: caseResolverEditorTypeSchema.optional(),
  documentContentFormatVersion: z.number().optional(),
  documentContentVersion: z.number().optional(),
  baseDocumentContentVersion: z.number().nullable().optional(),
  documentContent: z.string().optional(),
  documentContentMarkdown: z.string().optional(),
  documentContentHtml: z.string().optional(),
  documentContentPlainText: z.string().optional(),
  documentHistory: z.array(caseResolverDocumentHistoryEntrySchema).optional(),
  documentConversionWarnings: z.array(z.string()).optional(),
  lastContentConversionAt: z.string().nullable().optional(),
  scanSlots: z.array(caseResolverScanSlotSchema).optional(),
  scanOcrModel: z.string().optional(),
  scanOcrPrompt: z.string().optional(),
  isLocked: z.boolean().optional(),
  graph: caseResolverGraphSchema.optional(),
  addresser: caseResolverPartyReferenceSchema.nullable().optional(),
  addressee: caseResolverPartyReferenceSchema.nullable().optional(),
  tagId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  caseIdentifierId: z.string().nullable().optional(),
});

export interface CaseResolverFileEditDraft {
  id: string;
  name: string;
  content: string;
  fileType: CaseResolverFileType;
  folder: string;
  caseTreeOrder?: number | undefined;
  parentCaseId?: string | null | undefined;
  referenceCaseIds?: string[] | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  documentDate?: CaseResolverDocumentDateProposal | null | undefined;
  documentCity?: string | null | undefined;
  happeningDate?: string | null | undefined;
  isSent?: boolean | undefined;
  originalDocumentContent?: string | undefined;
  explodedDocumentContent?: string | undefined;
  activeDocumentVersion?: 'original' | 'exploded' | undefined;
  editorType?: CaseResolverEditorType | undefined;
  documentContentFormatVersion?: number | undefined;
  documentContentVersion?: number | undefined;
  baseDocumentContentVersion?: number | null | undefined;
  documentContent?: string | undefined;
  documentContentMarkdown?: string | undefined;
  documentContentHtml?: string | undefined;
  documentContentPlainText?: string | undefined;
  documentHistory?: CaseResolverDocumentHistoryEntry[] | undefined;
  documentConversionWarnings?: string[] | undefined;
  lastContentConversionAt?: string | null | undefined;
  scanSlots?: CaseResolverScanSlot[] | undefined;
  scanOcrModel?: string | undefined;
  scanOcrPrompt?: string | undefined;
  isLocked?: boolean | undefined;
  graph?: CaseResolverGraph | undefined;
  addresser?: CaseResolverPartyReference | null | undefined;
  addressee?: CaseResolverPartyReference | null | undefined;
  tagId?: string | null | undefined;
  categoryId?: string | null | undefined;
  caseIdentifierId?: string | null | undefined;
}

export const caseResolverAssetFileSchema = dtoBaseSchema.extend({
  workspaceId: z.string(),
  folderId: z.string().nullable(),
  name: z.string(),
  kind: caseResolverAssetKindSchema,
  size: z.number(),
  url: z.string().optional(),
  sourceFileId: z.string().optional(),
  textContent: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export interface CaseResolverAssetFile extends DtoBase {
  id: string;
  workspaceId: string;
  folderId: string | null;
  folder: string;
  name: string;
  kind: CaseResolverAssetKind;
  size: number | null;
  url?: string | undefined;
  filepath?: string | null | undefined;
  sourceFileId?: string | null | undefined;
  mimeType?: string | null | undefined;
  textContent?: string | undefined;
  description?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

/**
 * Case Resolver Folders
 */
export const caseResolverFolderTimestampSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CaseResolverFolderTimestamp = z.infer<typeof caseResolverFolderTimestampSchema>;

export const caseResolverFolderRecordSchema = dtoBaseSchema.extend({
  workspaceId: z.string(),
  parentId: z.string().nullable(),
  ownerCaseId: z.string().nullable().optional(),
  name: z.string(),
  path: z.string(),
});

export interface CaseResolverFolderRecord {
  id?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | null | undefined;
  workspaceId?: string | undefined;
  parentId?: string | null | undefined;
  ownerCaseId?: string | null | undefined;
  name?: string | undefined;
  path: string;
}

/**
 * Case Resolver Node File Search Types
 */

export type NodeFileDocumentSearchScope = 'case_scope' | 'all_cases';

export type NodeFileDocumentSearchRow = {
  file: CaseResolverFile;
  signatureLabel: string;
  addresserLabel: string;
  addresseeLabel: string;
  folderPath: string;
  folderSegments: string[];
  searchable: string;
};

export type NodeFileDocumentFolderNode = {
  path: string;
  name: string;
  parentPath: string | null;
  depth: number;
  directFileCount: number;
  descendantFileCount: number;
};

export type NodeFileDocumentFolderTree = {
  nodesByPath: Map<string, NodeFileDocumentFolderNode>;
  childPathsByParent: Map<string | null, string[]>;
  rootFileCount: number;
};

export interface CreateCaseResolverFileInput {
  id: string;
  workspaceId?: string;
  version?: CaseResolverDocumentVersion;
  fileType?: CaseResolverFileType | null | undefined;
  name: string;
  caseStatus?: 'pending' | 'completed' | null | undefined;
  caseTreeOrder?: number | null | undefined;
  folder?: string;
  parentCaseId?: string | null | undefined;
  referenceCaseIds?: string[] | null | undefined;
  relatedFileIds?: string[] | null | undefined;
  documentDate?: CaseResolverDocumentDateProposal | string | null | undefined;
  documentCity?: string | null | undefined;
  happeningDate?: string | null | undefined;
  originalDocumentContent?: string | null | undefined;
  explodedDocumentContent?: string | null | undefined;
  activeDocumentVersion?: CaseResolverDocumentVersion | null | undefined;
  documentContent?: string | null | undefined;
  editorType?: CaseResolverEditorType | null | undefined;
  documentContentFormatVersion?: CaseResolverDocumentFormatVersion | number | null | undefined;
  documentContentVersion?: number | null | undefined;
  documentContentMarkdown?: string | null | undefined;
  documentContentHtml?: string | null | undefined;
  documentContentPlainText?: string | null | undefined;
  documentHistory?: CaseResolverDocumentHistoryEntry[] | null | undefined;
  documentConversionWarnings?: string[] | null | undefined;
  lastContentConversionAt?: string | null | undefined;
  scanSlots?: CaseResolverScanSlot[] | null | undefined;
  scanOcrModel?: string | null | undefined;
  scanOcrPrompt?: string | null | undefined;
  isSent?: boolean | null | undefined;
  isLocked?: boolean | null | undefined;
  graph?: Partial<CaseResolverGraph> | null;
  addresser?: CaseResolverPartyReference | null | undefined;
  addressee?: CaseResolverPartyReference | null | undefined;
  tagId?: string | null | undefined;
  caseIdentifierId?: string | null | undefined;
  categoryId?: string | null | undefined;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}
