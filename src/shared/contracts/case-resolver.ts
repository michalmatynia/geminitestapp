import { z } from 'zod';

import { aiNodeSchema, edgeSchema, type AiNode, type Edge, type NodeDefinition } from './ai-paths';
import { dtoBaseSchema, namedDtoSchema, type NamedDto, type DtoBase } from './base';
import { documentEditorModeSchema } from './document-editor';

export type { AiNode, Edge, NodeDefinition };
export type AiEdge = Edge;

/**
 * Case Resolver Node Roles
 */
export const caseResolverNodeRoleSchema = z.enum(['text_note', 'explanatory', 'ai_prompt']);
export type CaseResolverNodeRoleDto = z.infer<typeof caseResolverNodeRoleSchema>;
export type CaseResolverNodeRole = CaseResolverNodeRoleDto;

/**
 * Case Resolver Formatting Modes
 */
export const caseResolverQuoteModeSchema = z.enum(['none', 'double', 'single']);
export type CaseResolverQuoteModeDto = z.infer<typeof caseResolverQuoteModeSchema>;
export type CaseResolverQuoteMode = CaseResolverQuoteModeDto;

export const caseResolverJoinModeSchema = z.enum(['newline', 'tab', 'space', 'none']);
export type CaseResolverJoinModeDto = z.infer<typeof caseResolverJoinModeSchema>;
export type CaseResolverJoinMode = CaseResolverJoinModeDto;

/**
 * Case Resolver Node Ports
 */
export const caseResolverDocumentNodePortSchema = z.enum(['wysiwygText', 'content', 'plainText']);
export type CaseResolverDocumentNodePortDto = z.infer<typeof caseResolverDocumentNodePortSchema>;
export type CaseResolverDocumentNodePort = CaseResolverDocumentNodePortDto;

/**
 * Case Resolver Asset Kinds
 */
export const caseResolverAssetKindSchema = z.enum(['document', 'folder', 'workspace', 'pdf', 'image', 'file', 'node_file']);
export type CaseResolverAssetKindDto = z.infer<typeof caseResolverAssetKindSchema>;
export type CaseResolverAssetKind = CaseResolverAssetKindDto;

/**
 * Case Resolver File Types
 */
export const caseResolverFileTypeSchema = z.enum(['pdf', 'image', 'text', 'markdown', 'html', 'json', 'scanfile', 'document', 'case']);
export type CaseResolverFileTypeDto = z.infer<typeof caseResolverFileTypeSchema>;
export type CaseResolverFileType = CaseResolverFileTypeDto;

/**
 * Case Resolver Versions
 */
export const caseResolverDocumentVersionSchema = z.union([z.literal(1), z.enum(['original', 'exploded'])]);
export type CaseResolverDocumentVersionDto = z.infer<typeof caseResolverDocumentVersionSchema>;
export type CaseResolverDocumentVersion = CaseResolverDocumentVersionDto;

export type CaseResolverDocumentFormatVersion = 1;

/**
 * Case Resolver Editor Types
 */
export const caseResolverEditorTypeSchema = z.enum(['graph', 'document', 'capture', 'settings', 'wysiwyg', 'markdown', 'code', 'rich-text', 'plain-text']);
export type CaseResolverEditorTypeDto = z.infer<typeof caseResolverEditorTypeSchema>;
export type CaseResolverEditorType = CaseResolverEditorTypeDto;

/**
 * Case Resolver PDF Extraction Presets
 */
export const caseResolverPdfExtractionPresetIdSchema = z.enum(['plain_text', 'structured_sections', 'facts_entities', 'custom']);
export type CaseResolverPdfExtractionPresetIdDto = z.infer<typeof caseResolverPdfExtractionPresetIdSchema>;
export type CaseResolverPdfExtractionPresetId = CaseResolverPdfExtractionPresetIdDto;

export const caseResolverPdfExtractionPresetSchema = z.object({
  value: caseResolverPdfExtractionPresetIdSchema,
  label: z.string(),
  description: z.string(),
  template: z.string(),
});

export type CaseResolverPdfExtractionPresetDto = z.infer<typeof caseResolverPdfExtractionPresetSchema>;
export type CaseResolverPdfExtractionPreset = CaseResolverPdfExtractionPresetDto;

/**
 * Case Resolver Party References
 */
export const caseResolverPartyReferenceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  kind: z.enum(['person', 'organization']),
  role: z.string().optional(),
});

export type CaseResolverPartyReferenceDto = z.infer<typeof caseResolverPartyReferenceSchema>;
export type CaseResolverPartyReference = CaseResolverPartyReferenceDto;

export const caseResolverDocumentDateActionSchema = z.enum(['useDetectedDate', 'keepText', 'ignore']);
export type CaseResolverDocumentDateActionDto = z.infer<typeof caseResolverDocumentDateActionSchema>;
export type CaseResolverDocumentDateAction = CaseResolverDocumentDateActionDto;

export const caseResolverDocumentDateProposalSchema = z.object({
  isoDate: z.string(),
  source: z.enum(['metadata', 'text']),
  sourceLine: z.string().nullable(),
  cityHint: z.string().nullable(),
  city: z.string().nullable().optional(),
  action: caseResolverDocumentDateActionSchema,
});
export type CaseResolverDocumentDateProposalDto = z.infer<typeof caseResolverDocumentDateProposalSchema>;
export type CaseResolverDocumentDateProposal = CaseResolverDocumentDateProposalDto;

/**
 * Case Resolver Tags & Identifiers
 */
export const caseResolverTagSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

export interface CaseResolverTagDto extends DtoBase {
  id: string;
  label: string;
  color?: string | undefined;
  parentId?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export type CaseResolverTag = CaseResolverTagDto;

export const caseResolverIdentifierSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.string(),
  name: z.string().optional(),
  label: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

export interface CaseResolverIdentifierDto extends DtoBase {
  id: string;
  type: string;
  value: string;
  name?: string | undefined;
  label?: string | undefined;
  parentId?: string | null | undefined;
  color?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export type CaseResolverIdentifier = CaseResolverIdentifierDto;

/**
 * Case Resolver Categories
 */
export const caseResolverCategorySchema = z.object({
  id: z.string(),
  parentId: z.string().nullable().optional(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export interface CaseResolverCategoryDto extends DtoBase {
  id: string;
  parentId?: string | null | undefined;
  name: string;
  sortOrder: number;
  description?: string | undefined;
  color?: string | undefined;
  icon?: string | undefined;
  createdAt: string;
  updatedAt: string;
}
export type CaseResolverCategory = CaseResolverCategoryDto;

/**
 * Case Resolver Scan Slots
 */
export const caseResolverScanSlotSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number(),
  name: z.string().optional(),
  ocrText: z.string().optional(),
  filepath: z.string().optional(),
  sourceFileId: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  ocrError: z.string().nullable().optional(),
  error: z.string().optional(),
});

export interface CaseResolverScanSlotDto {
  id: string;
  fileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  name?: string | undefined;
  ocrText?: string | undefined;
  filepath?: string | null | undefined;
  sourceFileId?: string | null | undefined;
  mimeType?: string | undefined;
  size?: number | undefined;
  ocrError?: string | null | undefined;
  error?: string | undefined;
}

export type CaseResolverScanSlot = CaseResolverScanSlotDto;

/**
 * Case Resolver History
 */
export const caseResolverDocumentHistoryEntrySchema = z.object({
  id: z.string(),
  savedAt: z.string(),
  documentContentVersion: z.number(),
  activeDocumentVersion: z.enum(['original', 'exploded']),
  editorType: z.enum(['wysiwyg', 'markdown', 'code', 'rich-text', 'plain-text']),
  documentContent: z.string(),
  documentContentMarkdown: z.string().optional(),
  documentContentHtml: z.string().optional(),
  documentContentPlainText: z.string().optional(),
  documentId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  changes: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().optional(),
});

export interface CaseResolverDocumentHistoryEntryDto {
  id: string;
  savedAt: string;
  documentContentVersion: number;
  activeDocumentVersion: 'original' | 'exploded';
  editorType: 'wysiwyg' | 'markdown' | 'code' | 'rich-text' | 'plain-text';
  documentContent: string;
  documentContentMarkdown?: string | undefined;
  documentContentHtml?: string | undefined;
  documentContentPlainText?: string | undefined;
  documentId?: string | undefined;
  userId?: string | undefined;
  action?: string | undefined;
  changes?: Record<string, unknown> | undefined;
  timestamp?: string | undefined;
}
export type CaseResolverDocumentHistoryEntry = CaseResolverDocumentHistoryEntryDto;

/**
 * Case Resolver Meta & Graphs
 */
export const caseResolverNodeMetaSchema = z.object({
  role: caseResolverNodeRoleSchema.optional(),
  includeInOutput: z.boolean().optional(),
  quoteMode: caseResolverQuoteModeSchema.optional(),
  surroundPrefix: z.string().optional(),
  surroundSuffix: z.string().optional(),
  appendTrailingNewline: z.boolean().optional(),
  textColor: z.string().optional(),
  plainTextValidationEnabled: z.boolean().optional(),
  plainTextFormatterEnabled: z.boolean().optional(),
  plainTextValidationStackId: z.string().optional(),
});

export interface CaseResolverNodeMetaDto {
  role?: CaseResolverNodeRole;
  includeInOutput?: boolean;
  quoteMode?: CaseResolverQuoteMode;
  surroundPrefix?: string;
  surroundSuffix?: string;
  appendTrailingNewline?: boolean;
  textColor?: string;
  plainTextValidationEnabled?: boolean;
  plainTextFormatterEnabled?: boolean;
  plainTextValidationStackId?: string;
}

export type CaseResolverNodeMeta = CaseResolverNodeMetaDto;

export const caseResolverEdgeMetaSchema = z.object({
  joinMode: caseResolverJoinModeSchema.optional(),
});

export interface CaseResolverEdgeMetaDto {
  joinMode?: CaseResolverJoinMode;
}

export type CaseResolverEdgeMeta = CaseResolverEdgeMetaDto;

export const caseResolverGraphSchema = z.object({
  nodes: z.array(aiNodeSchema),
  edges: z.array(z.any()), // aiEdgeSchema
  nodeMeta: z.record(z.string(), caseResolverNodeMetaSchema).optional(),
  edgeMeta: z.record(z.string(), caseResolverEdgeMetaSchema).optional(),
  pdfExtractionPresetId: caseResolverPdfExtractionPresetIdSchema.optional(),
  documentFileLinksByNode: z.record(z.string(), z.array(z.string())).optional(),
  documentDropNodeId: z.string().nullable().optional(),
  documentSourceFileIdByNode: z.record(z.string(), z.string()).optional(),
  nodeFileAssetIdByNode: z.record(z.string(), z.string()).optional(),
});

export interface CaseResolverGraphDto {
  nodes: AiNode[];
  edges: Edge[];
  nodeMeta?: Record<string, CaseResolverNodeMeta> | undefined;
  edgeMeta?: Record<string, CaseResolverEdgeMeta> | undefined;
  pdfExtractionPresetId?: CaseResolverPdfExtractionPresetId | undefined;
  documentFileLinksByNode?: Record<string, string[]> | undefined;
  documentDropNodeId?: string | null | undefined;
  documentSourceFileIdByNode?: Record<string, string> | undefined;
  nodeFileAssetIdByNode?: Record<string, string> | undefined;
}

export type CaseResolverGraph = CaseResolverGraphDto;

/**
 * Case Resolver Node File Meta & Snapshots
 */
export const caseResolverNodeFileMetaSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  fileId: z.string(),
  assignedAt: z.string(),
});

export interface CaseResolverNodeFileMetaDto {
  id: string;
  nodeId: string;
  fileId: string;
  assignedAt: string;
}

export type CaseResolverNodeFileMeta = CaseResolverNodeFileMetaDto;

export interface CaseResolverSnapshotNodeMetaDto {
  fileId: string;
  fileType: CaseResolverFileType;
  fileName: string;
}

export type CaseResolverSnapshotNodeMeta = CaseResolverSnapshotNodeMetaDto;

export const caseResolverNodeFileSnapshotSchema = z.object({
  kind: z.literal('case_resolver_node_file_snapshot_v1'),
  nodes: z.array(aiNodeSchema),
  edges: z.array(edgeSchema),
  nodeMeta: z.record(z.string(), caseResolverNodeMetaSchema).optional(),
  edgeMeta: z.record(z.string(), caseResolverEdgeMetaSchema).optional(),
  nodeFileMeta: z.record(z.string(), z.object({
    fileId: z.string(),
    fileType: caseResolverFileTypeSchema,
    fileName: z.string(),
  })),
});

export interface CaseResolverNodeFileSnapshotDto {
  kind: 'case_resolver_node_file_snapshot_v1';
  source?: 'manual' | 'auto' | undefined;
  nodes: AiNode[];
  edges: Edge[];
  nodeMeta?: Record<string, CaseResolverNodeMeta> | undefined;
  edgeMeta?: Record<string, CaseResolverEdgeMeta> | undefined;
  nodeFileMeta: Record<string, CaseResolverSnapshotNodeMeta>;
}

export type CaseResolverNodeFileSnapshot = CaseResolverNodeFileSnapshotDto;

/**
 * Case Resolver Relation Contracts
 */
export const caseResolverRelationEntityTypeSchema = z.enum(['custom', 'person', 'organization', 'place', 'event', 'date', 'amount', 'identifier', 'case', 'folder', 'file']);
export type CaseResolverRelationEntityTypeDto = z.infer<typeof caseResolverRelationEntityTypeSchema>;
export type CaseResolverRelationEntityType = CaseResolverRelationEntityTypeDto;

export const caseResolverRelationFileKindSchema = z.enum(['image', 'pdf', 'case_file', 'asset_file']).nullable();
export type CaseResolverRelationFileKindDto = z.infer<typeof caseResolverRelationFileKindSchema>;
export type CaseResolverRelationFileKind = CaseResolverRelationFileKindDto;

export const caseResolverRelationEdgeKindSchema = z.enum(['contains', 'located_in', 'parent_case', 'references', 'related', 'custom']);
export type CaseResolverRelationEdgeKindDto = z.infer<typeof caseResolverRelationEdgeKindSchema>;
export type CaseResolverRelationEdgeKind = CaseResolverRelationEdgeKindDto;

export const caseResolverRelationNodeMetaSchema = z.object({
  entityType: caseResolverRelationEntityTypeSchema,
  entityId: z.string(),
  label: z.string(),
  fileKind: caseResolverRelationFileKindSchema,
  folderPath: z.string().nullable(),
  sourceFileId: z.string().nullable(),
  isStructural: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CaseResolverRelationNodeMetaDto = z.infer<typeof caseResolverRelationNodeMetaSchema>;
export type CaseResolverRelationNodeMeta = CaseResolverRelationNodeMetaDto;

export const caseResolverRelationEdgeMetaSchema = z.object({
  relationType: caseResolverRelationEdgeKindSchema,
  label: z.string(),
  isStructural: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CaseResolverRelationEdgeMetaDto = z.infer<typeof caseResolverRelationEdgeMetaSchema>;
export type CaseResolverRelationEdgeMeta = CaseResolverRelationEdgeMetaDto;

export const caseResolverRelationGraphSchema = z.object({
  nodes: z.array(aiNodeSchema),
  edges: z.array(edgeSchema),
  nodeMeta: z.record(z.string(), caseResolverRelationNodeMetaSchema).optional(),
  edgeMeta: z.record(z.string(), caseResolverRelationEdgeMetaSchema).optional(),
});

export type CaseResolverRelationGraphDto = z.infer<typeof caseResolverRelationGraphSchema>;
export type CaseResolverRelationGraph = CaseResolverRelationGraphDto;

/**
 * Case Resolver Document & File DTOs
 */
export const caseResolverFileSchema = dtoBaseSchema.extend({
  workspaceId: z.string(),
  name: z.string(),
  fileType: caseResolverFileTypeSchema,
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
  relatedFileIds: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export interface CaseResolverFileDto extends DtoBase {
  id: string;
  workspaceId: string;
  name: string;
  fileType: CaseResolverFileType;
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

export type CaseResolverFile = CaseResolverFileDto;

export const caseResolverFileEditDraftSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  fileType: caseResolverFileTypeSchema,
  folder: z.string(),
  parentCaseId: z.string().nullable().optional(),
  referenceCaseIds: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  documentDate: caseResolverDocumentDateProposalSchema.nullable().optional(),
  documentCity: z.string().nullable().optional(),
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

export interface CaseResolverFileEditDraftDto {
  id: string;
  name: string;
  content: string;
  fileType: CaseResolverFileType;
  folder: string;
  parentCaseId?: string | null | undefined;
  referenceCaseIds?: string[] | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  documentDate?: CaseResolverDocumentDateProposal | null | undefined;
  documentCity?: string | null | undefined;
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

export type CaseResolverFileEditDraft = CaseResolverFileEditDraftDto;

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

export interface CaseResolverAssetFileDto extends DtoBase {
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

export type CaseResolverAssetFile = CaseResolverAssetFileDto;

/**
 * Case Resolver Workspace & Folders
 */
export const caseResolverFolderTimestampSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CaseResolverFolderTimestampDto = z.infer<typeof caseResolverFolderTimestampSchema>;
export type CaseResolverFolderTimestamp = CaseResolverFolderTimestampDto;

export const caseResolverFolderRecordSchema = dtoBaseSchema.extend({
  workspaceId: z.string(),
  parentId: z.string().nullable(),
  ownerCaseId: z.string().nullable().optional(),
  name: z.string(),
  path: z.string(),
});

export interface CaseResolverFolderRecordDto {
  id?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | null | undefined;
  workspaceId?: string | undefined;
  parentId?: string | null | undefined;
  ownerCaseId?: string | null | undefined;
  name?: string | undefined;
  path: string;
}

export type CaseResolverFolderRecord = CaseResolverFolderRecordDto;

export const caseResolverWorkspaceSchema = namedDtoSchema.extend({
  ownerId: z.string(),
  isPublic: z.boolean(),
  version: z.number().optional(),
  activeFileId: z.string().nullable().optional(),
  files: z.array(caseResolverFileSchema).optional(),
  assets: z.array(caseResolverAssetFileSchema).optional(),
  folders: z.array(z.string()).optional(),
  folderRecords: z.array(caseResolverFolderRecordSchema).optional(),
  folderTimestamps: z.record(z.string(), caseResolverFolderTimestampSchema).optional(),
  workspaceRevision: z.number().optional(),
  lastMutationId: z.string().nullable().optional(),
  lastMutationAt: z.string().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export interface CaseResolverWorkspaceDto extends NamedDto {
  id: string;
  ownerId: string;
  isPublic: boolean;
  version: number;
  activeFileId: string | null;
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
  folders: string[];
  folderRecords: CaseResolverFolderRecord[];
  folderTimestamps: Record<string, CaseResolverFolderTimestamp>;
  workspaceRevision: number;
  lastMutationId: string | null;
  lastMutationAt: string | null;
  relationGraph: CaseResolverRelationGraph;
  settings?: Record<string, unknown> | undefined;
}

export type CaseResolverWorkspace = CaseResolverWorkspaceDto;

/**
 * Case Resolver Context DTOs
 */
export const caseResolverEditorNodeContextSchema = z.object({
  workspaceId: z.string(),
  fileId: z.string(),
  nodeId: z.string().nullable(),
  mode: documentEditorModeSchema,
});

export type CaseResolverEditorNodeContextDto = z.infer<typeof caseResolverEditorNodeContextSchema>;
export type CaseResolverEditorNodeContext = CaseResolverEditorNodeContextDto;

export const caseResolverCanvasEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  data: caseResolverEdgeMetaSchema.optional(),
});

export type CaseResolverCanvasEdgeDto = z.infer<typeof caseResolverCanvasEdgeSchema>;

/**
 * Case Resolver Settings DTOs
 */
export const caseResolverDefaultDocumentFormatSchema = z.enum(['wysiwyg', 'markdown']);
export type CaseResolverDefaultDocumentFormatDto = z.infer<typeof caseResolverDefaultDocumentFormatSchema>;

export const caseResolverSettingsSchema = z.object({
  ocrModel: z.string(),
  ocrPrompt: z.string(),
  defaultDocumentFormat: caseResolverDefaultDocumentFormatSchema,
  confirmDeleteDocument: z.boolean(),
  defaultAddresserPartyKind: z.enum(['person', 'organization']),
  defaultAddresseePartyKind: z.enum(['person', 'organization']),
});

export interface CaseResolverSettingsDto {
  ocrModel: string;
  ocrPrompt: string;
  defaultDocumentFormat: CaseResolverDefaultDocumentFormatDto;
  confirmDeleteDocument: boolean;
  defaultAddresserPartyKind: 'person' | 'organization';
  defaultAddresseePartyKind: 'person' | 'organization';
}

/**
 * Case Resolver Capture DTOs
 */
export const caseResolverCaptureRoleSchema = z.enum(['addresser', 'addressee', 'subject', 'reference', 'other']);
export type CaseResolverCaptureRoleDto = z.infer<typeof caseResolverCaptureRoleSchema>;

export const caseResolverCaptureActionSchema = z.enum(['useMatched', 'createInFilemaker', 'keepText', 'ignore']);
export type CaseResolverCaptureActionDto = z.infer<typeof caseResolverCaptureActionSchema>;

export const caseResolverCaptureRoleMappingSchema = z.object({
  role: caseResolverCaptureRoleSchema,
  targetPath: z.string(),
  required: z.boolean(),
  enabled: z.boolean().optional(),
  targetRole: caseResolverCaptureRoleSchema.optional(),
  defaultAction: caseResolverCaptureActionSchema.optional(),
  autoMatchPartyReference: z.boolean().optional(),
  autoMatchAddress: z.boolean().optional(),
});

export interface CaseResolverCaptureRoleMappingDto {
  role: 'addresser' | 'addressee' | 'subject' | 'reference' | 'other';
  targetPath: string;
  required: boolean;
  enabled?: boolean | undefined;
  targetRole?: 'addresser' | 'addressee' | 'subject' | 'reference' | 'other' | undefined;
  defaultAction?: 'useMatched' | 'createInFilemaker' | 'keepText' | 'ignore' | undefined;
  autoMatchPartyReference?: boolean | undefined;
  autoMatchAddress?: boolean | undefined;
}

export type CaseResolverCaptureRoleMapping = CaseResolverCaptureRoleMappingDto;

export const caseResolverCaptureProposalStateSchema = z.enum(['pending', 'accepted', 'rejected', 'modified']);
export type CaseResolverCaptureProposalStateDto = z.infer<typeof caseResolverCaptureProposalStateSchema>;

export const caseResolverCaptureSettingsSchema = z.object({
  enabled: z.boolean(),
  autoOpenProposalModal: z.boolean(),
  roleMappings: z.object({
    addresser: caseResolverCaptureRoleMappingSchema.optional(),
    addressee: caseResolverCaptureRoleMappingSchema.optional(),
    subject: caseResolverCaptureRoleMappingSchema.optional(),
    reference: caseResolverCaptureRoleMappingSchema.optional(),
    other: caseResolverCaptureRoleMappingSchema.optional(),
  }),
});

export interface CaseResolverCaptureSettingsDto {
  enabled: boolean;
  autoOpenProposalModal: boolean;
  roleMappings: {
    addresser: CaseResolverCaptureRoleMapping;
    addressee: CaseResolverCaptureRoleMapping;
    subject: CaseResolverCaptureRoleMapping;
    reference: CaseResolverCaptureRoleMapping;
    other: CaseResolverCaptureRoleMapping;
  };
}

export type CaseResolverCaptureSettings = CaseResolverCaptureSettingsDto;

export interface CaseResolverCompiledSegmentDto {
  id: string;
  nodeId: string | null;
  role: string;
  content: string;
  title?: string | undefined;
  text?: string | undefined;
  includeInOutput?: boolean | undefined;
  sourceFileId?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export type CaseResolverCompiledSegment = CaseResolverCompiledSegmentDto;

export interface CaseResolverCompileResultDto {
  segments: CaseResolverCompiledSegment[];
  combinedContent: string;
  prompt: string;
  outputsByNode: Record<string, { textfield: string; content: string; plainText: string }>;
  warnings: string[];
}

export type CaseResolverCompileResult = CaseResolverCompileResultDto;

/**
 * CASE RESOLVER CONSTANTS & HELPERS
 */

export const CASE_RESOLVER_NODE_ROLE_OPTIONS: Array<{
  value: CaseResolverNodeRole;
  label: string;
}> = [
  { value: 'text_note', label: 'Text Fragment' },
  { value: 'explanatory', label: 'Explanatory Fragment' },
  { value: 'ai_prompt', label: 'AI Prompt (Runtime)' },
];

export const CASE_RESOLVER_QUOTE_MODE_OPTIONS: Array<{
  value: CaseResolverQuoteMode;
  label: string;
}> = [
  { value: 'none', label: 'No Quotes' },
  { value: 'double', label: 'Double Quotes' },
  { value: 'single', label: 'Single Quotes' },
];

export const CASE_RESOLVER_JOIN_MODE_OPTIONS: Array<{
  value: CaseResolverJoinMode;
  label: string;
}> = [
  { value: 'newline', label: 'New Line' },
  { value: 'tab', label: 'Tab' },
  { value: 'space', label: 'Space' },
  { value: 'none', label: 'No Separator' },
];

export const CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS: CaseResolverDocumentNodePort[] = [
  'wysiwygText',
  'content',
  'plainText',
];

export const CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS: CaseResolverDocumentNodePort[] = [
  'wysiwygText',
  'content',
  'plainText',
];

export const CASE_RESOLVER_PDF_EXTRACTION_PRESETS: CaseResolverPdfExtractionPreset[] = [
  {
    value: 'plain_text',
    label: 'Full Plain Text',
    description: 'Extract full PDF text exactly, no formatting commentary.',
    template: [
      'Extract the complete text content from the provided PDF source.',
      'Return clean plain text only (no markdown, no commentary).',
      '',
      '{{result}}',
    ].join('\n'),
  },
  {
    value: 'structured_sections',
    label: 'Structured Sections',
    description: 'Extract text grouped by headings and section hierarchy.',
    template: [
      'Extract text from the PDF and organize it into clear sections.',
      'Output format:',
      '- Section title',
      '- Section body text',
      '- Preserve list items under each section',
      '',
      'Do not invent content and do not summarize away key details.',
      '',
      '{{result}}',
    ].join('\n'),
  },
  {
    value: 'facts_entities',
    label: 'Facts + Entities',
    description: 'Extract key facts, entities, dates, numbers, and references.',
    template: [
      'Extract from this PDF source:',
      '1) Key facts',
      '2) Named entities (people, orgs, places)',
      '3) Dates, amounts, identifiers, references',
      '',
      'Return concise, structured plain text with clear headings.',
      '',
      '{{result}}',
    ].join('\n'),
  },
];

export const DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID: CaseResolverPdfExtractionPresetId =
  'plain_text';

export const CASE_RESOLVER_PDF_EXTRACTION_PRESET_OPTIONS: Array<{
  value: CaseResolverPdfExtractionPresetId;
  label: string;
}> = CASE_RESOLVER_PDF_EXTRACTION_PRESETS.map((preset: CaseResolverPdfExtractionPreset) => ({
  value: preset.value,
  label: preset.label,
}));

export const resolveCaseResolverPdfExtractionTemplate = (
  presetId: CaseResolverPdfExtractionPresetId
): string => {
  const preset = CASE_RESOLVER_PDF_EXTRACTION_PRESETS.find(
    (entry: CaseResolverPdfExtractionPreset): boolean => entry.value === presetId
  );
  return preset?.template ?? CASE_RESOLVER_PDF_EXTRACTION_PRESETS[0]?.template ?? '{{result}}';
};

export const DEFAULT_CASE_RESOLVER_NODE_META: CaseResolverNodeMeta = {
  role: 'text_note',
  includeInOutput: true,
  quoteMode: 'none',
  surroundPrefix: '',
  surroundSuffix: '',
  appendTrailingNewline: false,
  textColor: '',
  plainTextValidationEnabled: true,
  plainTextFormatterEnabled: true,
  plainTextValidationStackId: '',
};

export const DEFAULT_CASE_RESOLVER_EDGE_META: CaseResolverEdgeMeta = {
  joinMode: 'newline',
};

export const CASE_RESOLVER_RELATION_ROOT_FOLDER_ID = '__root__';

export const DEFAULT_CASE_RESOLVER_RELATION_NODE_META: CaseResolverRelationNodeMeta = {
  entityType: 'custom',
  entityId: '',
  label: '',
  fileKind: null,
  folderPath: null,
  sourceFileId: null,
  isStructural: false,
  createdAt: '',
  updatedAt: '',
};

export const DEFAULT_CASE_RESOLVER_RELATION_EDGE_META: CaseResolverRelationEdgeMeta = {
  relationType: 'related',
  label: '',
  isStructural: false,
  createdAt: '',
  updatedAt: '',
};

export const CASE_RESOLVER_RELATION_EDGE_KIND_OPTIONS: Array<{
  value: CaseResolverRelationEdgeKind;
  label: string;
}> = [
  { value: 'contains', label: 'Contains' },
  { value: 'located_in', label: 'Located In' },
  { value: 'parent_case', label: 'Parent Case' },
  { value: 'references', label: 'References' },
  { value: 'related', label: 'Related' },
  { value: 'custom', label: 'Custom' },
];
