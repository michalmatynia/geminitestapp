import { z } from 'zod';

import { aiNodeTypeSchema, aiNodeSchema, aiEdgeSchema } from './ai-paths';
import { dtoBaseSchema, namedDtoSchema } from './base';
import { documentEditorModeSchema, type DocumentEditorModeDto } from './document-editor';
import { filemakerPartyReferenceSchema, type FilemakerPartyReferenceDto } from './filemaker';

/**
 * Case Resolver DTOs
 */

export const caseResolverNodeRoleSchema = z.enum(['text_note', 'explanatory', 'ai_prompt']);
export type CaseResolverNodeRoleDto = z.infer<typeof caseResolverNodeRoleSchema>;

export const caseResolverQuoteModeSchema = z.enum(['none', 'double', 'single']);
export type CaseResolverQuoteModeDto = z.infer<typeof caseResolverQuoteModeSchema>;

export const caseResolverJoinModeSchema = z.enum(['newline', 'tab', 'space', 'none']);
export type CaseResolverJoinModeDto = z.infer<typeof caseResolverJoinModeSchema>;

export const caseResolverDocumentNodePortSchema = z.enum(['textfield', 'content', 'plainText']);
export type CaseResolverDocumentNodePortDto = z.infer<typeof caseResolverDocumentNodePortSchema>;

export const caseResolverAssetKindSchema = z.enum(['node_file', 'image', 'pdf', 'file']);
export type CaseResolverAssetKindDto = z.infer<typeof caseResolverAssetKindSchema>;

export const caseResolverFileTypeSchema = z.enum(['case', 'document', 'scanfile']);
export type CaseResolverFileTypeDto = z.infer<typeof caseResolverFileTypeSchema>;

export const caseResolverDocumentVersionSchema = z.enum(['original', 'exploded']);
export type CaseResolverDocumentVersionDto = z.infer<typeof caseResolverDocumentVersionSchema>;

export const caseResolverEditorTypeSchema = documentEditorModeSchema;
export type CaseResolverEditorTypeDto = DocumentEditorModeDto;

export const caseResolverPdfExtractionPresetIdSchema = z.enum([
  'plain_text',
  'structured_sections',
  'facts_entities',
]);
export type CaseResolverPdfExtractionPresetIdDto = z.infer<typeof caseResolverPdfExtractionPresetIdSchema>;

export const caseResolverPartyReferenceSchema = filemakerPartyReferenceSchema;
export type CaseResolverPartyReferenceDto = FilemakerPartyReferenceDto;

export const caseResolverTagSchema = namedDtoSchema.extend({
  parentId: z.string().nullable(),
  color: z.string(),
});
export type CaseResolverTagDto = z.infer<typeof caseResolverTagSchema>;

export const caseResolverIdentifierSchema = namedDtoSchema.extend({
  parentId: z.string().nullable(),
  color: z.string(),
});
export type CaseResolverIdentifierDto = z.infer<typeof caseResolverIdentifierSchema>;

export const caseResolverCategorySchema = namedDtoSchema.extend({
  parentId: z.string().nullable(),
  sortOrder: z.number(),
  description: z.string(),
  color: z.string(),
});
export type CaseResolverCategoryDto = z.infer<typeof caseResolverCategorySchema>;

export const caseResolverScanSlotSchema = z.object({
  id: z.string(),
  name: z.string(),
  filepath: z.string().nullable(),
  sourceFileId: z.string().nullable(),
  mimeType: z.string().nullable(),
  size: z.number().nullable(),
  ocrText: z.string(),
  ocrError: z.string().nullable(),
});
export type CaseResolverScanSlotDto = z.infer<typeof caseResolverScanSlotSchema>;

export const caseResolverDocumentHistoryEntrySchema = z.object({
  id: z.string(),
  savedAt: z.string(),
  documentContentVersion: z.number(),
  activeDocumentVersion: caseResolverDocumentVersionSchema,
  editorType: caseResolverEditorTypeSchema,
  documentContent: z.string(),
  documentContentMarkdown: z.string(),
  documentContentHtml: z.string(),
  documentContentPlainText: z.string(),
});
export type CaseResolverDocumentHistoryEntryDto = z.infer<typeof caseResolverDocumentHistoryEntrySchema>;

export const caseResolverNodeMetaSchema = z.object({
  role: caseResolverNodeRoleSchema,
  includeInOutput: z.boolean(),
  quoteMode: caseResolverQuoteModeSchema,
  surroundPrefix: z.string(),
  surroundSuffix: z.string(),
});
export type CaseResolverNodeMetaDto = z.infer<typeof caseResolverNodeMetaSchema>;

export const caseResolverEdgeMetaSchema = z.object({
  joinMode: caseResolverJoinModeSchema,
});
export type CaseResolverEdgeMetaDto = z.infer<typeof caseResolverEdgeMetaSchema>;

// Lightweight canvas node schema — matches the AiNode runtime type (no DB timestamps).
// The canvas creates nodes without createdAt/updatedAt/data, so we use this
// instead of aiNodeSchema (which extends dtoBaseSchema and requires those fields).
const caseResolverCanvasNodeSchema = z.object({
  id: z.string(),
  type: aiNodeTypeSchema,
  title: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
});

// Lightweight canvas edge schema — matches the Edge runtime type with from/to.
// The canvas uses from/to (not source/target), so we cannot use aiEdgeSchema here.
const caseResolverCanvasEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  fromPort: z.string().optional(),
  toPort: z.string().optional(),
});

export const caseResolverGraphSchema = z.object({
  nodes: z.array(caseResolverCanvasNodeSchema),
  edges: z.array(caseResolverCanvasEdgeSchema),
  nodeMeta: z.record(z.string(), caseResolverNodeMetaSchema),
  edgeMeta: z.record(z.string(), caseResolverEdgeMetaSchema),
  pdfExtractionPresetId: caseResolverPdfExtractionPresetIdSchema,
  documentFileLinksByNode: z.record(z.string(), z.array(z.string())),
  documentDropNodeId: z.string().nullable(),
  documentSourceFileIdByNode: z.record(z.string(), z.string()).optional(),
  nodeFileAssetIdByNode: z.record(z.string(), z.string()).optional(),
});
export type CaseResolverGraphDto = z.infer<typeof caseResolverGraphSchema>;

export const caseResolverNodeFileMetaSchema = z.object({
  fileId: z.string(),
  fileType: z.enum(['document', 'scanfile']),
  fileName: z.string(),
});
export type CaseResolverNodeFileMetaDto = z.infer<typeof caseResolverNodeFileMetaSchema>;

export const caseResolverNodeFileSnapshotSchema = z.object({
  kind: z.literal('case_resolver_node_file_snapshot_v1'),
  source: z.literal('manual'),
  nodes: z.array(caseResolverCanvasNodeSchema),
  edges: z.array(caseResolverCanvasEdgeSchema),
  nodeFileMeta: z.record(z.string(), caseResolverNodeFileMetaSchema),
});
export type CaseResolverNodeFileSnapshotDto = z.infer<typeof caseResolverNodeFileSnapshotSchema>;

export const caseResolverRelationEntityTypeSchema = z.enum(['case', 'folder', 'file', 'custom']);
export type CaseResolverRelationEntityTypeDto = z.infer<typeof caseResolverRelationEntityTypeSchema>;

export const caseResolverRelationFileKindSchema = z.enum(['case_file', 'asset_file']);
export type CaseResolverRelationFileKindDto = z.infer<typeof caseResolverRelationFileKindSchema>;

export const caseResolverRelationEdgeKindSchema = z.enum([
  'contains',
  'located_in',
  'parent_case',
  'references',
  'related',
  'custom',
]);
export type CaseResolverRelationEdgeKindDto = z.infer<typeof caseResolverRelationEdgeKindSchema>;

export const caseResolverRelationNodeMetaSchema = z.object({
  entityType: caseResolverRelationEntityTypeSchema,
  entityId: z.string(),
  label: z.string(),
  fileKind: caseResolverRelationFileKindSchema.nullable(),
  folderPath: z.string().nullable(),
  sourceFileId: z.string().nullable(),
  isStructural: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CaseResolverRelationNodeMetaDto = z.infer<typeof caseResolverRelationNodeMetaSchema>;

export const caseResolverRelationEdgeMetaSchema = z.object({
  relationType: caseResolverRelationEdgeKindSchema,
  label: z.string(),
  isStructural: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CaseResolverRelationEdgeMetaDto = z.infer<typeof caseResolverRelationEdgeMetaSchema>;

export const caseResolverRelationGraphSchema = z.object({
  nodes: z.array(aiNodeSchema),
  edges: z.array(aiEdgeSchema),
  nodeMeta: z.record(z.string(), caseResolverRelationNodeMetaSchema),
  edgeMeta: z.record(z.string(), caseResolverRelationEdgeMetaSchema),
});
export type CaseResolverRelationGraphDto = z.infer<typeof caseResolverRelationGraphSchema>;

export const caseResolverFileSchema = dtoBaseSchema.extend({
  fileType: caseResolverFileTypeSchema,
  name: z.string(),
  folder: z.string(),
  parentCaseId: z.string().nullable(),
  referenceCaseIds: z.array(z.string()),
  documentDate: z.string(),
  originalDocumentContent: z.string(),
  explodedDocumentContent: z.string(),
  activeDocumentVersion: caseResolverDocumentVersionSchema,
  editorType: caseResolverEditorTypeSchema,
  documentContentFormatVersion: z.literal(1),
  documentContentVersion: z.number(),
  documentContent: z.string(),
  documentContentMarkdown: z.string(),
  documentContentHtml: z.string(),
  documentContentPlainText: z.string(),
  documentHistory: z.array(caseResolverDocumentHistoryEntrySchema),
  documentConversionWarnings: z.array(z.string()),
  lastContentConversionAt: z.string(),
  scanSlots: z.array(caseResolverScanSlotSchema),
  scanOcrModel: z.string(),
  scanOcrPrompt: z.string(),
  isLocked: z.boolean(),
  graph: caseResolverGraphSchema,
  addresser: caseResolverPartyReferenceSchema.nullable(),
  addressee: caseResolverPartyReferenceSchema.nullable(),
  tagId: z.string().nullable(),
  caseIdentifierId: z.string().nullable(),
  categoryId: z.string().nullable(),
});
export type CaseResolverFileDto = z.infer<typeof caseResolverFileSchema>;

export const caseResolverAssetFileSchema = dtoBaseSchema.extend({
  name: z.string(),
  folder: z.string(),
  kind: caseResolverAssetKindSchema,
  filepath: z.string().nullable(),
  sourceFileId: z.string().nullable(),
  mimeType: z.string().nullable(),
  size: z.number().nullable(),
  textContent: z.string(),
  description: z.string(),
});
export type CaseResolverAssetFileDto = z.infer<typeof caseResolverAssetFileSchema>;

export const caseResolverFolderTimestampSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CaseResolverFolderTimestampDto = z.infer<typeof caseResolverFolderTimestampSchema>;

export const caseResolverFolderRecordSchema = z.object({
  path: z.string(),
  ownerCaseId: z.string().nullable(),
});
export type CaseResolverFolderRecordDto = z.infer<typeof caseResolverFolderRecordSchema>;

export const caseResolverWorkspaceSchema = z.object({
  version: z.literal(2),
  workspaceRevision: z.number(),
  lastMutationId: z.string().nullable(),
  lastMutationAt: z.string().nullable(),
  folders: z.array(z.string()),
  folderRecords: z.array(caseResolverFolderRecordSchema).optional(),
  folderTimestamps: z.record(z.string(), caseResolverFolderTimestampSchema),
  files: z.array(caseResolverFileSchema),
  assets: z.array(caseResolverAssetFileSchema),
  relationGraph: caseResolverRelationGraphSchema,
  activeFileId: z.string().nullable(),
});
export type CaseResolverWorkspaceDto = z.infer<typeof caseResolverWorkspaceSchema>;

export const caseResolverSettingsSchema = z.object({
  ocrModel: z.string(),
  ocrPrompt: z.string(),
  defaultDocumentFormat: z.enum(['markdown', 'wysiwyg']),
  confirmDeleteDocument: z.boolean(),
});
export type CaseResolverSettingsDto = z.infer<typeof caseResolverSettingsSchema>;
