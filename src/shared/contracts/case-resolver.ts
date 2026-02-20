import { z } from 'zod';

import { aiNodeTypeSchema, aiNodeSchema } from './ai-paths';
import { dtoBaseSchema, namedDtoSchema } from './base';
import { documentEditorModeSchema, type DocumentEditorModeDto } from './document-editor';

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
export const caseResolverAssetKindSchema = z.enum(['document', 'folder', 'workspace']);
export type CaseResolverAssetKindDto = z.infer<typeof caseResolverAssetKindSchema>;
export type CaseResolverAssetKind = CaseResolverAssetKindDto;

/**
 * Case Resolver File Types
 */
export const caseResolverFileTypeSchema = z.enum(['pdf', 'image', 'text', 'markdown', 'html', 'json']);
export type CaseResolverFileTypeDto = z.infer<typeof caseResolverFileTypeSchema>;
export type CaseResolverFileType = CaseResolverFileTypeDto;

/**
 * Case Resolver Versions
 */
export const caseResolverDocumentVersionSchema = z.literal(1);
export type CaseResolverDocumentVersionDto = z.infer<typeof caseResolverDocumentVersionSchema>;
export type CaseResolverDocumentVersion = CaseResolverDocumentVersionDto;

export type CaseResolverDocumentFormatVersion = 1;

/**
 * Case Resolver Editor Types
 */
export const caseResolverEditorTypeSchema = z.enum(['graph', 'document', 'capture', 'settings']);
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
  name: z.string(),
  kind: z.enum(['person', 'organization']),
  role: z.string().optional(),
});

export type CaseResolverPartyReferenceDto = z.infer<typeof caseResolverPartyReferenceSchema>;
export type CaseResolverPartyReference = CaseResolverPartyReferenceDto;

/**
 * Case Resolver Tags & Identifiers
 */
export const caseResolverTagSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string().optional(),
});

export type CaseResolverTagDto = z.infer<typeof caseResolverTagSchema>;
export type CaseResolverTag = CaseResolverTagDto;

export const caseResolverIdentifierSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.string(),
  label: z.string().optional(),
});

export type CaseResolverIdentifierDto = z.infer<typeof caseResolverIdentifierSchema>;
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

export type CaseResolverCategoryDto = z.infer<typeof caseResolverCategorySchema>;
export type CaseResolverCategory = CaseResolverCategoryDto;

/**
 * Case Resolver Scan Slots
 */
export const caseResolverScanSlotSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number(),
  error: z.string().optional(),
});

export type CaseResolverScanSlotDto = z.infer<typeof caseResolverScanSlotSchema>;
export type CaseResolverScanSlot = CaseResolverScanSlotDto;

/**
 * Case Resolver History
 */
export const caseResolverDocumentHistoryEntrySchema = z.object({
  id: z.string(),
  documentId: z.string(),
  userId: z.string(),
  action: z.string(),
  changes: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
});

export type CaseResolverDocumentHistoryEntryDto = z.infer<typeof caseResolverDocumentHistoryEntrySchema>;
export type CaseResolverDocumentHistoryEntry = CaseResolverDocumentHistoryEntryDto;

/**
 * Case Resolver Meta & Graphs
 */
export const caseResolverNodeMetaSchema = z.object({
  role: caseResolverNodeRoleSchema,
  includeInOutput: z.boolean(),
  quoteMode: caseResolverQuoteModeSchema,
  surroundPrefix: z.string(),
  surroundSuffix: z.string(),
  appendTrailingNewline: z.boolean(),
  textColor: z.string().optional(),
});

export type CaseResolverNodeMetaDto = z.infer<typeof caseResolverNodeMetaSchema>;
export type CaseResolverNodeMeta = CaseResolverNodeMetaDto;

export const caseResolverEdgeMetaSchema = z.object({
  joinMode: caseResolverJoinModeSchema,
});

export type CaseResolverEdgeMetaDto = z.infer<typeof caseResolverEdgeMetaSchema>;
export type CaseResolverEdgeMeta = CaseResolverEdgeMetaDto;

export const caseResolverGraphSchema = z.object({
  nodes: z.array(aiNodeSchema),
  edges: z.array(z.any()), // aiEdgeSchema
});

export type CaseResolverGraphDto = z.infer<typeof caseResolverGraphSchema>;
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

export type CaseResolverNodeFileMetaDto = z.infer<typeof caseResolverNodeFileMetaSchema>;
export type CaseResolverNodeFileMeta = CaseResolverNodeFileMetaDto;

export const caseResolverNodeFileSnapshotSchema = z.object({
  nodeId: z.string(),
  fileId: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
});

export type CaseResolverNodeFileSnapshotDto = z.infer<typeof caseResolverNodeFileSnapshotSchema>;
export type CaseResolverNodeFileSnapshot = CaseResolverNodeFileSnapshotDto;

/**
 * Case Resolver Relation Contracts
 */
export const caseResolverRelationEntityTypeSchema = z.enum(['custom', 'person', 'organization', 'place', 'event', 'date', 'amount', 'identifier']);
export type CaseResolverRelationEntityTypeDto = z.infer<typeof caseResolverRelationEntityTypeSchema>;
export type CaseResolverRelationEntityType = CaseResolverRelationEntityTypeDto;

export const caseResolverRelationFileKindSchema = z.enum(['image', 'pdf']).nullable();
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
  nodes: z.array(z.any()), // GraphNode
  edges: z.array(z.any()), // GraphEdge
});

export type CaseResolverRelationGraphDto = z.infer<typeof caseResolverRelationGraphSchema>;
export type CaseResolverRelationGraph = CaseResolverRelationGraphDto;

/**
 * Case Resolver Document & File DTOs
 */
export const caseResolverFileSchema = dtoBaseSchema.extend({
  workspaceId: z.string(),
  name: z.string(),
  type: caseResolverFileTypeSchema,
  content: z.string(),
  version: caseResolverDocumentVersionSchema,
  graph: caseResolverGraphSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CaseResolverFileDto = z.infer<typeof caseResolverFileSchema>;
export type CaseResolverFile = CaseResolverFileDto;

export const caseResolverFileEditDraftSchema = z.object({
  name: z.string(),
  content: z.string(),
  graph: caseResolverGraphSchema.optional(),
});

export type CaseResolverFileEditDraftDto = z.infer<typeof caseResolverFileEditDraftSchema>;
export type CaseResolverFileEditDraft = CaseResolverFileEditDraftDto;

export const caseResolverAssetFileSchema = dtoBaseSchema.extend({
  workspaceId: z.string(),
  folderId: z.string().nullable(),
  name: z.string(),
  type: caseResolverFileTypeSchema,
  size: z.number(),
  url: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CaseResolverAssetFileDto = z.infer<typeof caseResolverAssetFileSchema>;
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
  name: z.string(),
  path: z.string(),
});

export type CaseResolverFolderRecordDto = z.infer<typeof caseResolverFolderRecordSchema>;
export type CaseResolverFolderRecord = CaseResolverFolderRecordDto;

export const caseResolverWorkspaceSchema = namedDtoSchema.extend({
  ownerId: z.string(),
  isPublic: z.boolean(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type CaseResolverWorkspaceDto = z.infer<typeof caseResolverWorkspaceSchema>;
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
 * Case Resolver Capture DTOs
 */
export const caseResolverCaptureRoleSchema = z.enum(['addresser', 'addressee', 'subject', 'reference', 'other']);
export type CaseResolverCaptureRoleDto = z.infer<typeof caseResolverCaptureRoleSchema>;

export const caseResolverCaptureRoleMappingSchema = z.object({
  role: caseResolverCaptureRoleSchema,
  targetPath: z.string(),
  required: z.boolean(),
});

export type CaseResolverCaptureRoleMappingDto = z.infer<typeof caseResolverCaptureRoleMappingSchema>;

export const caseResolverCaptureProposalStateSchema = z.enum(['pending', 'accepted', 'rejected', 'modified']);
export type CaseResolverCaptureProposalStateDto = z.infer<typeof caseResolverCaptureProposalStateSchema>;

export const caseResolverCaptureSettingsSchema = z.object({
  enabled: z.boolean(),
  autoOpenProposalModal: z.boolean(),
  roleMappings: z.record(caseResolverCaptureRoleSchema, caseResolverCaptureRoleMappingSchema),
});

export type CaseResolverCaptureSettingsDto = z.infer<typeof caseResolverCaptureSettingsSchema>;

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

export const DEFAULT_CASE_RESOLVER_RELATION_EDGE_META: CaseResolverEdgeMeta = {
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
