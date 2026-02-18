import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';
import type {
  CaseResolverNodeRoleDto,
  CaseResolverQuoteModeDto,
  CaseResolverJoinModeDto,
  CaseResolverDocumentNodePortDto,
  CaseResolverAssetKindDto,
  CaseResolverFileTypeDto,
  CaseResolverDocumentVersionDto,
  CaseResolverEditorTypeDto,
  CaseResolverDocumentFormatVersionDto,
  CaseResolverPdfExtractionPresetIdDto,
  CaseResolverPartyReferenceDto,
  CaseResolverTagDto,
  CaseResolverIdentifierDto,
  CaseResolverCategoryDto,
  CaseResolverScanSlotDto,
  CaseResolverDocumentHistoryEntryDto,
  CaseResolverNodeMetaDto,
  CaseResolverEdgeMetaDto,
  CaseResolverGraphDto,
  CaseResolverNodeFileMetaDto,
  CaseResolverNodeFileSnapshotDto,
  CaseResolverRelationEntityTypeDto,
  CaseResolverRelationFileKindDto,
  CaseResolverRelationEdgeKindDto,
  CaseResolverRelationNodeMetaDto,
  CaseResolverRelationEdgeMetaDto,
  CaseResolverRelationGraphDto,
  CaseResolverFileDto,
  CaseResolverAssetFileDto,
  CaseResolverFolderTimestampDto,
  CaseResolverFolderRecordDto,
  CaseResolverWorkspaceDto,
} from '@/shared/contracts/case-resolver';

export type { AiNode, Edge };

export type CaseResolverNodeRole = CaseResolverNodeRoleDto;
export type CaseResolverQuoteMode = CaseResolverQuoteModeDto;
export type CaseResolverJoinMode = CaseResolverJoinModeDto;
export type CaseResolverDocumentNodePort = CaseResolverDocumentNodePortDto;
export type CaseResolverAssetKind = CaseResolverAssetKindDto;
export type CaseResolverFileType = CaseResolverFileTypeDto;
export type CaseResolverDocumentVersion = CaseResolverDocumentVersionDto;
export type CaseResolverEditorType = CaseResolverEditorTypeDto;
export type CaseResolverDocumentFormatVersion = 1;
export type CaseResolverPdfExtractionPresetId = CaseResolverPdfExtractionPresetIdDto;
export type CaseResolverPartyReference = CaseResolverPartyReferenceDto;

export type CaseResolverTag = CaseResolverTagDto;

export type CaseResolverIdentifier = CaseResolverIdentifierDto;

export type CaseResolverCategory = CaseResolverCategoryDto;

export type CaseResolverScanSlot = CaseResolverScanSlotDto;

export type CaseResolverDocumentHistoryEntry = CaseResolverDocumentHistoryEntryDto;

export type CaseResolverNodeMeta = CaseResolverNodeMetaDto;

export type CaseResolverEdgeMeta = CaseResolverEdgeMetaDto;

export type CaseResolverGraph = CaseResolverGraphDto;

export type CaseResolverNodeFileMeta = CaseResolverNodeFileMetaDto;

export type CaseResolverNodeFileSnapshot = CaseResolverNodeFileSnapshotDto;

export type CaseResolverRelationEntityType = CaseResolverRelationEntityTypeDto;
export type CaseResolverRelationFileKind = CaseResolverRelationFileKindDto;
export type CaseResolverRelationEdgeKind = CaseResolverRelationEdgeKindDto;

export type CaseResolverRelationNodeMeta = CaseResolverRelationNodeMetaDto;

export type CaseResolverRelationEdgeMeta = CaseResolverRelationEdgeMetaDto;

export type CaseResolverRelationGraph = CaseResolverRelationGraphDto;

export type CaseResolverFile = CaseResolverFileDto;

export type CaseResolverFileEditDraft = Partial<CaseResolverFileDto> & {
  id: string;
  baseDocumentContentVersion: number;
};

export type CaseResolverAssetFile = CaseResolverAssetFileDto;

export type CaseResolverFolderTimestamp = CaseResolverFolderTimestampDto;

export type CaseResolverFolderRecord = CaseResolverFolderRecordDto;

export type CaseResolverWorkspace = CaseResolverWorkspaceDto;

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
