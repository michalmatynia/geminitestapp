import { z } from 'zod';

/**
 * Case Resolver Node Roles
 */
export const caseResolverNodeRoleSchema = z.enum(['text_note', 'explanatory', 'ai_prompt']);
export type CaseResolverNodeRole = z.infer<typeof caseResolverNodeRoleSchema>;

/**
 * Case Resolver Formatting Modes
 */
export const caseResolverQuoteModeSchema = z.enum(['none', 'double', 'single']);
export type CaseResolverQuoteMode = z.infer<typeof caseResolverQuoteModeSchema>;

export const caseResolverJoinModeSchema = z.enum(['newline', 'tab', 'space', 'none']);
export type CaseResolverJoinMode = z.infer<typeof caseResolverJoinModeSchema>;

/**
 * Case Resolver Node Ports
 */
export const caseResolverDocumentNodePortSchema = z.enum([
  'wysiwygText',
  'plaintextContent',
  'plainText',
  'wysiwygContent',
]);
export type CaseResolverDocumentNodePort = z.infer<typeof caseResolverDocumentNodePortSchema>;

/**
 * Case Resolver Asset Kinds
 */
export const caseResolverAssetKindSchema = z.enum([
  'document',
  'folder',
  'workspace',
  'pdf',
  'image',
  'file',
  'node_file',
]);
export type CaseResolverAssetKind = z.infer<typeof caseResolverAssetKindSchema>;

/**
 * Case Resolver File Types
 */
export const caseResolverFileTypeSchema = z.enum([
  'pdf',
  'image',
  'text',
  'markdown',
  'html',
  'json',
  'scanfile',
  'document',
  'case',
]);
export type CaseResolverFileType = z.infer<typeof caseResolverFileTypeSchema>;

/**
 * Case Resolver Versions
 */
export const caseResolverDocumentVersionSchema = z.union([
  z.literal(1),
  z.enum(['original', 'exploded']),
]);
export type CaseResolverDocumentVersion = z.infer<typeof caseResolverDocumentVersionSchema>;

export type CaseResolverDocumentFormatVersion = 1;

/**
 * Case Resolver Editor Types
 */
export const caseResolverEditorTypeSchema = z.enum([
  'graph',
  'document',
  'capture',
  'settings',
  'wysiwyg',
  'markdown',
  'code',
  'rich-text',
  'plain-text',
]);
export type CaseResolverEditorType = z.infer<typeof caseResolverEditorTypeSchema>;

/**
 * Case Resolver Document Formats
 */
export const caseResolverDefaultDocumentFormatSchema = z.enum(['wysiwyg', 'markdown']);
export type CaseResolverDefaultDocumentFormat = z.infer<typeof caseResolverDefaultDocumentFormatSchema>;

/**
 * Case Resolver PDF Extraction Presets
 */
export const caseResolverPdfExtractionPresetIdSchema = z.enum([
  'plain_text',
  'structured_sections',
]);
export type CaseResolverPdfExtractionPresetId = z.infer<
  typeof caseResolverPdfExtractionPresetIdSchema
>;

export type CaseResolverWorkspaceNormalizationDiagnostics = {
  ownershipRepairedCount: number;
  ownershipUnresolvedCount: number;
  droppedDuplicateCount: number;
};

export type CaseViewMode = 'list' | 'hierarchy';
export type CaseSortKey =
  | 'updated'
  | 'created'
  | 'happeningDate'
  | 'name'
  | 'status'
  | 'signature'
  | 'locked'
  | 'sent';
export type CaseSortOrder = 'asc' | 'desc';
export type CaseSearchScope = 'all' | 'name' | 'folder' | 'content';
export type CaseFileTypeFilter = 'all' | 'case' | 'document' | 'scanfile' | 'note';
export type CaseStatusFilter = 'all' | 'pending' | 'completed';
export type CaseLockedFilter = 'all' | 'locked' | 'unlocked';
export type CaseSentFilter = 'all' | 'sent' | 'not_sent';
export type CaseHierarchyFilter = 'all' | 'root' | 'child';
export type CaseReferencesFilter = 'all' | 'with_references' | 'without_references';

export type CaseListViewDefaults = {
  viewMode: CaseViewMode;
  sortBy: CaseSortKey;
  sortOrder: CaseSortOrder;
  searchScope: CaseSearchScope;
  filtersCollapsedByDefault: boolean;
  showNestedContent: boolean;
};

export type CaseResolverRequestedContextStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'missing_not_found'
  | 'missing_unavailable';

export type CaseResolverEditorMode = 'wysiwyg' | 'markdown' | 'code';

export type CaseResolverRequestedCaseStatus = 'loading' | 'ready' | 'missing';
export type CaseResolverRequestedCaseIssue = 'requested_file_missing' | 'workspace_unavailable';

export type CaseResolverOcrProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini';

export type WorkspaceView = 'document' | 'relations';
export type EditorDetailsTab = 'document' | 'relations' | 'metadata' | 'revisions';

export type PercentileSnapshot = {
  count: number;
  p50: number;
  p95: number;
  max: number;
};

export type WorkspaceHydrationSelectionSnapshot = {
  timestamp: string;
  source: string | null;
  reason: string | null;
  hasStore: boolean | null;
  hasHeavy: boolean | null;
  workspaceRevision: number | null;
};

export type RequestedContextSnapshot = {
  timestamp: string;
  action: string;
  requestKey: string | null;
  requestedCaseStatus: string | null;
  requestedCaseIssue: string | null;
  resolvedVia: string | null;
};

export type RuntimeCounterSnapshot = {
  selectorRecomputeCount: number;
  contextStateTransitionCount: number;
};

export type RuntimeDurationSnapshot = {
  treeScopeResolveMs: PercentileSnapshot;
  caseSearchFilterMs: PercentileSnapshot;
  editorDirtyEvalMs: PercentileSnapshot;
};

export type CaseResolverWorkspaceObservabilitySnapshot = {
  generatedAt: string;
  sampleSize: number;
  actionCounts: Record<string, number>;
  persistAttempts: number;
  persistSuccesses: number;
  persistConflicts: number;
  persistFailures: number;
  conflictRate: number;
  saveSuccessRate: number;
  persistDurationMs: PercentileSnapshot;
  payloadBytes: PercentileSnapshot;
  runtimeCounters: RuntimeCounterSnapshot;
  runtimeDurations: RuntimeDurationSnapshot;
  latestHydrationSelection: WorkspaceHydrationSelectionSnapshot | null;
  latestRequestedContext: RequestedContextSnapshot | null;
};

/**
 * Case Resolver Drag & Drop Types
 */

export type CaseResolverDropDocumentToCanvasDetail = {
  fileId: string;
  name: string;
  folder: string;
};

export type CaseResolverShowDocumentInCanvasDetail = {
  fileId: string;
  nodeId?: string | null;
  relatedNodeFileAssetIds?: string[];
};

export type CaseResolverTreeAssetDragPayload = {
  source: 'case_resolver_tree';
  entity: 'asset';
  assetId: string;
  assetKind: CaseResolverAssetKind;
  name: string;
  folder: string;
  filepath: string | null;
  mimeType: string | null;
  size: number | null;
  textContent: string;
  description: string;
};

export type CaseResolverTreeFileDragPayload = {
  source: 'case_resolver_tree';
  entity: 'file';
  fileId: string;
  name: string;
  folder: string;
};

export type CaseResolverTreeDragPayload =
  | CaseResolverTreeAssetDragPayload
  | CaseResolverTreeFileDragPayload;

export type CaseResolverDroppedAsset = {
  id: string;
  name: string;
  kind: CaseResolverAssetKind;
  filepath: string | null;
  mimeType: string | null;
  size: number | null;
  textContent: string;
  description: string;
};

export type CaseResolverDroppedDocument = {
  id: string;
  name: string;
  folder: string;
};

export type CaseResolverUploadedFile = {
  id: string | null;
  originalName: string;
  kind: CaseResolverAssetKind;
  filepath: string | null;
  mimetype: string | null;
  size: number | null;
  folder: string;
};

export type PaletteEntry = {
  id: string;
  label: string;
  description: string;
  definition: unknown; // NodeDefinition | null
  toneClassName: string;
  Icon: unknown; // React.ComponentType<{ className?: string }>
};

export type FolderCaseFileStats = {
  total: number;
  locked: number;
};

export type CaseMetadataDraft = {
  name: string;
  parentCaseId: string;
  caseStatus: 'pending' | 'completed';
  happeningDate: string;
  referenceCaseIds: string[];
  tagId: string;
  caseIdentifierId: string;
  categoryId: string;
};

export type DocumentRelationFileTypeFilter = 'all' | 'document' | 'scanfile';
export type DocumentRelationSortMode = 'name_asc' | 'date_desc' | 'date_asc' | 'folder_asc';

export type ResultHeight = 'compact' | 'normal' | 'expanded';

export type CaseRow = {
  file: {
    id: string;
    name: string;
    caseStatus?: string | null | undefined;
  };
  signatureLabel: string;
  docCount: number;
};
