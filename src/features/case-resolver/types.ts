import type { AiNodeDto as AiNode, AiEdgeDto as Edge, NodeDefinitionDto as NodeDefinition } from '@/shared/contracts/ai-paths';
import type {
  CaseResolverNodeRoleDto as CaseResolverNodeRole,
  CaseResolverQuoteModeDto as CaseResolverQuoteMode,
  CaseResolverJoinModeDto as CaseResolverJoinMode,
  CaseResolverDocumentNodePortDto as CaseResolverDocumentNodePort,
  CaseResolverAssetKindDto as CaseResolverAssetKind,
  CaseResolverFileTypeDto as CaseResolverFileType,
  CaseResolverDocumentVersionDto as CaseResolverDocumentVersion,
  CaseResolverEditorTypeDto as CaseResolverEditorType,
  CaseResolverPdfExtractionPresetIdDto as CaseResolverPdfExtractionPresetId,
  CaseResolverPartyReferenceDto as CaseResolverPartyReference,
  CaseResolverTagDto as CaseResolverTag,
  CaseResolverIdentifierDto as CaseResolverIdentifier,
  CaseResolverCategoryDto as CaseResolverCategory,
  CaseResolverScanSlotDto as CaseResolverScanSlot,
  CaseResolverDocumentHistoryEntryDto as CaseResolverDocumentHistoryEntry,
  CaseResolverNodeMetaDto as CaseResolverNodeMeta,
  CaseResolverEdgeMetaDto as CaseResolverEdgeMeta,
  CaseResolverGraphDto as CaseResolverGraph,
  CaseResolverNodeFileMetaDto as CaseResolverNodeFileMeta,
  CaseResolverNodeFileSnapshotDto as CaseResolverNodeFileSnapshot,
  CaseResolverRelationEntityTypeDto as CaseResolverRelationEntityType,
  CaseResolverRelationFileKindDto as CaseResolverRelationFileKind,
  CaseResolverRelationEdgeKindDto as CaseResolverRelationEdgeKind,
  CaseResolverRelationNodeMetaDto as CaseResolverRelationNodeMeta,
  CaseResolverRelationEdgeMetaDto as CaseResolverRelationEdgeMeta,
  CaseResolverRelationGraphDto as CaseResolverRelationGraph,
  CaseResolverFileDto as CaseResolverFile,
  CaseResolverFileEditDraftDto as CaseResolverFileEditDraft,
  CaseResolverAssetFileDto as CaseResolverAssetFile,
  CaseResolverFolderTimestampDto as CaseResolverFolderTimestamp,
  CaseResolverFolderRecordDto as CaseResolverFolderRecord,
  CaseResolverWorkspaceDto as CaseResolverWorkspace,
  CaseResolverEditorNodeContextDto as CaseResolverEditorNodeContext,
  CaseResolverPdfExtractionPresetDto as CaseResolverPdfExtractionPreset,
} from '@/shared/contracts/case-resolver';

export type { AiNode, Edge, NodeDefinition };

export type {
  CaseResolverNodeRole,
  CaseResolverQuoteMode,
  CaseResolverJoinMode,
  CaseResolverDocumentNodePort,
  CaseResolverAssetKind,
  CaseResolverFileType,
  CaseResolverDocumentVersion,
  CaseResolverEditorType,
  CaseResolverPdfExtractionPresetId,
  CaseResolverPartyReference,
  CaseResolverTag,
  CaseResolverIdentifier,
  CaseResolverCategory,
  CaseResolverScanSlot,
  CaseResolverDocumentHistoryEntry,
  CaseResolverNodeMeta,
  CaseResolverEdgeMeta,
  CaseResolverGraph,
  CaseResolverNodeFileMeta,
  CaseResolverNodeFileSnapshot,
  CaseResolverRelationEntityType,
  CaseResolverRelationFileKind,
  CaseResolverRelationEdgeKind,
  CaseResolverRelationNodeMeta,
  CaseResolverRelationEdgeMeta,
  CaseResolverRelationGraph,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverAssetFile,
  CaseResolverFolderTimestamp,
  CaseResolverFolderRecord,
  CaseResolverWorkspace,
  CaseResolverEditorNodeContext,
};

export type CaseResolverDocumentFormatVersion = 1;

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

export type { CaseResolverPdfExtractionPreset };

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
