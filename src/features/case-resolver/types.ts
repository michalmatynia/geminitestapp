import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';

export type CaseResolverNodeRole = 'text_note' | 'explanatory' | 'ai_prompt';
export type CaseResolverQuoteMode = 'none' | 'double' | 'single';
export type CaseResolverJoinMode = 'newline' | 'tab' | 'space' | 'none';
export type CaseResolverAssetKind = 'node_file' | 'image' | 'pdf' | 'file';

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
};

export type CaseResolverFile = {
  id: string;
  name: string;
  folder: string;
  graph: CaseResolverGraph;
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
