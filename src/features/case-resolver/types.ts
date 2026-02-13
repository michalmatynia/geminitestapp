import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';

export type CaseResolverNodeRole = 'text_note' | 'explanatory' | 'ai_prompt';
export type CaseResolverQuoteMode = 'none' | 'double' | 'single';
export type CaseResolverJoinMode = 'newline' | 'tab' | 'space' | 'none';
export type CaseResolverAssetKind = 'node_file' | 'image' | 'pdf' | 'file';
export type CaseResolverPdfExtractionPresetId =
  | 'plain_text'
  | 'structured_sections'
  | 'facts_entities';
export type CaseResolverPartyReference = {
  kind: 'person' | 'organization';
  id: string;
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
};

export type CaseResolverFile = {
  id: string;
  name: string;
  folder: string;
  documentContent: string;
  isLocked: boolean;
  graph: CaseResolverGraph;
  addresser: CaseResolverPartyReference | null;
  addressee: CaseResolverPartyReference | null;
  createdAt: string;
  updatedAt: string;
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

export type CaseResolverWorkspace = {
  version: 2;
  folders: string[];
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
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
