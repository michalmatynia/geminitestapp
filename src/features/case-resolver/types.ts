import type {
  CaseResolverFileDto,
  CaseResolverGraphDto,
  CaseResolverIdentifierDto,
  CaseResolverCategoryDto,
  CaseResolverTagDto,
  CaseResolverRelationGraphDto,
  CaseResolverDocumentHistoryEntryDto,
  CaseResolverFileEditDraftDto,
  CaseResolverNodeRoleDto,
  CaseResolverQuoteModeDto,
  CaseResolverJoinModeDto,
  CaseResolverPdfExtractionPresetIdDto,
  CaseResolverDocumentNodePort,
  CaseResolverRelationEdgeKindDto,
} from '@/shared/contracts/case-resolver';
import type { AiNode as SharedAiNode, Edge as SharedEdge } from '@/shared/contracts/ai-paths';

export type CaseResolverFile = CaseResolverFileDto;
export type CaseResolverGraph = CaseResolverGraphDto;
export type CaseResolverIdentifier = CaseResolverIdentifierDto;
export type CaseResolverCategory = CaseResolverCategoryDto;
export type CaseResolverTag = CaseResolverTagDto;
export type CaseResolverRelationGraph = CaseResolverRelationGraphDto;
export type CaseResolverDocumentHistoryEntry = CaseResolverDocumentHistoryEntryDto;
export type CaseResolverFileEditDraft = CaseResolverFileEditDraftDto;

export type AiNode = SharedAiNode;
export type AiEdge = SharedEdge;
export type Edge = SharedEdge;

export type CaseResolverNodeRole = CaseResolverNodeRoleDto;
export type CaseResolverQuoteMode = CaseResolverQuoteModeDto;
export type CaseResolverJoinMode = CaseResolverJoinModeDto;
export type CaseResolverPdfExtractionPresetId = CaseResolverPdfExtractionPresetIdDto;
export type CaseResolverRelationEdgeKind = CaseResolverRelationEdgeKindDto;

export interface CaseResolverNodeMeta {
  role: CaseResolverNodeRole;
  quoteMode: CaseResolverQuoteMode;
  includeInOutput: boolean;
  surroundPrefix: string;
  surroundSuffix: string;
  appendTrailingNewline?: boolean;
  textColor?: string;
}

export interface CaseResolverEdgeMeta {
  joinMode: CaseResolverJoinMode;
}

export interface CaseResolverRelationNodeMeta {
  entityType: string;
  entityId: string;
  label: string;
  fileKind: string | null;
  folderPath: string | null;
  sourceFileId: string | null;
  isStructural: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CaseResolverRelationEdgeMeta {
  relationType: CaseResolverRelationEdgeKind;
  label: string;
  isStructural: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CaseResolverEditorNodeContext {
  nodeId: string;
  title: string;
  role: CaseResolverNodeRole;
}

export interface CaseResolverAssetFile {
  id: string;
  name: string;
  kind: string;
  folder: string;
}

export interface NodeDefinition {
  type: string;
  title: string;
  description: string;
}

export {
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_PDF_EXTRACTION_PRESETS,
  DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  CASE_RESOLVER_JOIN_MODE_OPTIONS,
  CASE_RESOLVER_NODE_ROLE_OPTIONS,
  CASE_RESOLVER_QUOTE_MODE_OPTIONS,
  resolveCaseResolverPdfExtractionTemplate,
  CASE_RESOLVER_RELATION_ROOT_FOLDER_ID,
  DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
  DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
} from '@/shared/contracts/case-resolver';
