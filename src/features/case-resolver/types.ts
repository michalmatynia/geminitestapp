import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';

export type CaseResolverNodeRole = 'text_note' | 'explanatory' | 'ai_prompt';
export type CaseResolverQuoteMode = 'none' | 'double' | 'single';
export type CaseResolverJoinMode = 'newline' | 'tab' | 'space' | 'none';
export type CaseResolverDocumentNodePort = 'textfield' | 'content' | 'plainText';
export type CaseResolverAssetKind = 'node_file' | 'image' | 'pdf' | 'file';
export type CaseResolverFileType = 'case' | 'document' | 'scanfile';
export type CaseResolverDocumentVersion = 'original' | 'exploded';
export type CaseResolverEditorType = 'markdown' | 'wysiwyg' | 'code';
export type CaseResolverDocumentFormatVersion = 1;
export type CaseResolverPdfExtractionPresetId =
  | 'plain_text'
  | 'structured_sections'
  | 'facts_entities';
export type CaseResolverPartyReference = {
  kind: 'person' | 'organization';
  id: string;
};

export type CaseResolverTag = {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type CaseResolverIdentifier = {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type CaseResolverCategory = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type CaseResolverScanSlot = {
  id: string;
  name: string;
  filepath: string | null;
  sourceFileId: string | null;
  mimeType: string | null;
  size: number | null;
  ocrText: string;
  ocrError: string | null;
};

export type CaseResolverDocumentHistoryEntry = {
  id: string;
  savedAt: string;
  documentContentVersion: number;
  activeDocumentVersion: CaseResolverDocumentVersion;
  editorType: CaseResolverEditorType;
  documentContent: string;
  documentContentMarkdown: string;
  documentContentHtml: string;
  documentContentPlainText: string;
};

export type CaseResolverNodeMeta = {
  role: CaseResolverNodeRole;
  includeInOutput: boolean;
  quoteMode: CaseResolverQuoteMode;
  surroundPrefix: string;
  surroundSuffix: string;
};

export type CaseResolverEdgeMeta = {
  joinMode: CaseResolverJoinMode;
};

export type CaseResolverGraph = {
  nodes: AiNode[];
  edges: Edge[];
  nodeMeta: Record<string, CaseResolverNodeMeta>;
  edgeMeta: Record<string, CaseResolverEdgeMeta>;
  pdfExtractionPresetId: CaseResolverPdfExtractionPresetId;
  documentFileLinksByNode: Record<string, string[]>;
  documentDropNodeId: string | null;
  documentSourceFileIdByNode?: Record<string, string>;
  nodeFileAssetIdByNode?: Record<string, string>;
};

export type CaseResolverNodeFileMeta = {
  fileId: string;
  fileType: 'document' | 'scanfile';
  fileName: string;
};

export type CaseResolverNodeFileSnapshot = {
  kind: 'case_resolver_node_file_snapshot_v1';
  source: 'manual';
  nodes: AiNode[];
  edges: Edge[];
  nodeFileMeta: Record<string, CaseResolverNodeFileMeta>;
};

export type CaseResolverRelationEntityType = 'case' | 'folder' | 'file' | 'custom';
export type CaseResolverRelationFileKind = 'case_file' | 'asset_file';
export type CaseResolverRelationEdgeKind =
  | 'contains'
  | 'located_in'
  | 'parent_case'
  | 'references'
  | 'related'
  | 'custom';

export type CaseResolverRelationNodeMeta = {
  entityType: CaseResolverRelationEntityType;
  entityId: string;
  label: string;
  fileKind: CaseResolverRelationFileKind | null;
  folderPath: string | null;
  sourceFileId: string | null;
  isStructural: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CaseResolverRelationEdgeMeta = {
  relationType: CaseResolverRelationEdgeKind;
  label: string;
  isStructural: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CaseResolverRelationGraph = {
  nodes: AiNode[];
  edges: Edge[];
  nodeMeta: Record<string, CaseResolverRelationNodeMeta>;
  edgeMeta: Record<string, CaseResolverRelationEdgeMeta>;
};

export type CaseResolverFile = {
  id: string;
  fileType: CaseResolverFileType;
  name: string;
  folder: string;
  parentCaseId: string | null;
  referenceCaseIds: string[];
  documentDate: string;
  originalDocumentContent: string;
  explodedDocumentContent: string;
  activeDocumentVersion: CaseResolverDocumentVersion;
  editorType: CaseResolverEditorType;
  documentContentFormatVersion: CaseResolverDocumentFormatVersion;
  documentContentVersion: number;
  documentContent: string;
  documentContentMarkdown: string;
  documentContentHtml: string;
  documentContentPlainText: string;
  documentHistory: CaseResolverDocumentHistoryEntry[];
  documentConversionWarnings: string[];
  lastContentConversionAt: string;
  scanSlots: CaseResolverScanSlot[];
  scanOcrModel: string;
  scanOcrPrompt: string;
  isLocked: boolean;
  graph: CaseResolverGraph;
  addresser: CaseResolverPartyReference | null;
  addressee: CaseResolverPartyReference | null;
  tagId: string | null;
  caseIdentifierId: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseResolverFileEditDraft = {
  id: string;
  fileType: CaseResolverFileType;
  name: string;
  folder: string;
  parentCaseId: string | null;
  referenceCaseIds: string[];
  createdAt: string;
  updatedAt: string;
  documentDate: string;
  originalDocumentContent: string;
  explodedDocumentContent: string;
  activeDocumentVersion: CaseResolverDocumentVersion;
  editorType: CaseResolverEditorType;
  documentContentFormatVersion: CaseResolverDocumentFormatVersion;
  documentContentVersion: number;
  baseDocumentContentVersion: number;
  documentContent: string;
  documentContentMarkdown: string;
  documentContentHtml: string;
  documentContentPlainText: string;
  documentHistory: CaseResolverDocumentHistoryEntry[];
  documentConversionWarnings: string[];
  lastContentConversionAt: string;
  scanSlots: CaseResolverScanSlot[];
  scanOcrModel: string;
  scanOcrPrompt: string;
  addresser: CaseResolverPartyReference | null;
  addressee: CaseResolverPartyReference | null;
  tagId: string | null;
  caseIdentifierId: string | null;
  categoryId: string | null;
};

export type CaseResolverAssetFile = {
  id: string;
  name: string;
  folder: string;
  kind: CaseResolverAssetKind;
  filepath: string | null;
  sourceFileId: string | null;
  mimeType: string | null;
  size: number | null;
  textContent: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type CaseResolverFolderTimestamp = {
  createdAt: string;
  updatedAt: string;
};

export type CaseResolverFolderRecord = {
  path: string;
  ownerCaseId: string | null;
};

export type CaseResolverWorkspace = {
  version: 2;
  workspaceRevision: number;
  lastMutationId: string | null;
  lastMutationAt: string | null;
  folders: string[];
  folderRecords?: CaseResolverFolderRecord[];
  folderTimestamps: Record<string, CaseResolverFolderTimestamp>;
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
  relationGraph: CaseResolverRelationGraph;
  activeFileId: string | null;
};

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
  'textfield',
  'content',
  'plainText',
];

export const CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS: CaseResolverDocumentNodePort[] = [
  'textfield',
  'content',
  'plainText',
];

export type CaseResolverPdfExtractionPreset = {
  value: CaseResolverPdfExtractionPresetId;
  label: string;
  description: string;
  template: string;
};

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
